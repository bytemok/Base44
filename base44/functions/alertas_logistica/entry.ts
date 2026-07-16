import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const ODOO_URL = (Deno.env.get("ODOO_URL") || "").replace(/\/$/, "");
    const ODOO_DB = Deno.env.get("ODOO_DB");
    const ODOO_USER = Deno.env.get("ODOO_USERNAME");
    const ODOO_KEY = Deno.env.get("ODOO_API_KEY");
    if (!ODOO_URL || !ODOO_DB || !ODOO_USER || !ODOO_KEY) {
      return Response.json({ error: "Faltan credenciales de Odoo" }, { status: 500 });
    }

    let idc = 1;
    const rpc = async (endpoint, params) => {
      const res = await fetch(ODOO_URL + endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "call", params, id: idc++ }),
      });
      const json = await res.json();
      if (json.error) throw new Error(JSON.stringify(json.error));
      return json.result;
    };

    const uid = await rpc("/jsonrpc", {
      service: "common",
      method: "authenticate",
      args: [ODOO_DB, ODOO_USER, ODOO_KEY, {}],
    });
    if (!uid) return Response.json({ error: "No se pudo autenticar en Odoo" }, { status: 401 });

    const m2o = (v) => (Array.isArray(v) ? v[1] : v || "");
    const estadoLabel = {
      draft: "Borrador",
      waiting: "En espera",
      confirmed: "Pendiente",
      assigned: "Listo para despacho",
      done: "Entregado",
      cancel: "Cancelado",
    };
    const fields = ["id", "name", "origin", "partner_id", "scheduled_date", "state", "write_date"];
    const now = new Date();
    const nowOdoo = now.toISOString().slice(0, 19).replace("T", " ");
    const since = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");

    const pickings = await rpc("/jsonrpc", {
      service: "object",
      method: "execute_kw",
      args: [ODOO_DB, uid, ODOO_KEY, "stock.picking", "search_read",
        [[["picking_type_code", "=", "outgoing"], ["state", "in", ["waiting", "confirmed", "assigned", "done", "cancel"]], ["write_date", ">=", since]]],
        { fields, order: "write_date desc", limit: 200 },
      ],
    });

    const atrasados = await rpc("/jsonrpc", {
      service: "object",
      method: "execute_kw",
      args: [ODOO_DB, uid, ODOO_KEY, "stock.picking", "search_read",
        [[["picking_type_code", "=", "outgoing"], ["state", "not in", ["done", "cancel"]], ["scheduled_date", "<", nowOdoo]]],
        { fields, order: "scheduled_date asc", limit: 200 },
      ],
    });

    const eventosEstado = (pickings || []).map((p) => {
      const tipo = p.state === "done" ? "entrega" : p.state === "assigned" ? "despacho" : "estado";
      return {
        picking_id: p.id,
        tipo,
        referencia: tipo === "entrega" || tipo === "despacho" ? `${p.id}:${tipo}` : `${p.id}:estado:${p.state}`,
        name: p.name,
        origin: p.origin || "",
        cliente: m2o(p.partner_id),
        estado: estadoLabel[p.state] || p.state || "Actualizado",
        fecha: p.scheduled_date ? p.scheduled_date.slice(0, 16).replace("T", " ") : "",
      };
    });

    const eventosRetraso = (atrasados || []).map((p) => ({
      picking_id: p.id,
      tipo: "retraso",
      referencia: `${p.id}:retraso:${p.scheduled_date ? p.scheduled_date.slice(0, 10) : "sin-fecha"}`,
      name: p.name,
      origin: p.origin || "",
      cliente: m2o(p.partner_id),
      estado: estadoLabel[p.state] || p.state || "Pendiente",
      fecha: p.scheduled_date ? p.scheduled_date.slice(0, 16).replace("T", " ") : "sin fecha",
    }));

    const candidatos = [...eventosEstado, ...eventosRetraso];
    const refs = candidatos.map((c) => c.referencia);
    const existentes = new Set();
    if (refs.length) {
      const prev = await base44.asServiceRole.entities.Notificacion.filter({ referencia: { $in: refs } });
      (prev || []).forEach((n) => existentes.add(n.referencia));
    }

    const nuevas = candidatos.filter((c) => !existentes.has(c.referencia));
    for (const c of nuevas) {
      const titulo = c.tipo === "entrega"
        ? "Pedido entregado"
        : c.tipo === "despacho"
          ? "Pedido listo para despacho"
          : c.tipo === "retraso"
            ? "Entrega retrasada"
            : "Pedido cambió de estado";
      const mensaje = c.tipo === "entrega"
        ? `El pedido ${c.origin || c.name} de ${c.cliente || "—"} fue entregado.`
        : c.tipo === "despacho"
          ? `El pedido ${c.origin || c.name} de ${c.cliente || "—"} está listo para despacho.`
          : c.tipo === "retraso"
            ? `El pedido ${c.origin || c.name} de ${c.cliente || "—"} está retrasado. Fecha prevista: ${c.fecha}.`
            : `El pedido ${c.origin || c.name} de ${c.cliente || "—"} cambió a estado: ${c.estado}.`;
      await base44.asServiceRole.entities.Notificacion.create({
        tipo: c.tipo,
        titulo,
        mensaje,
        referencia: c.referencia,
        cliente: c.cliente,
        pedido_ref: c.origin || c.name,
        leida: false,
      });
    }

    if (nuevas.length > 0) {
      try {
        const users = await base44.asServiceRole.entities.User.list();
        const admins = (users || []).filter((u) => u.role === "admin" && u.notif_recordatorios_entrega !== false && u.email);
        const tag = (tipo) => tipo === "entrega" ? "ENTREGA" : tipo === "despacho" ? "DESPACHO" : tipo === "retraso" ? "RETRASO" : "ESTADO";
        const lineas = nuevas.map((c) => `• [${tag(c.tipo)}] ${c.origin || c.name} — ${c.cliente || "—"}${c.tipo === "retraso" ? ` — previsto ${c.fecha}` : c.estado ? ` — ${c.estado}` : ""}`).join("\n");
        const subject = `Alertas logísticas: ${nuevas.length} nuevo(s) evento(s)`;
        const body = `Se detectaron ${nuevas.length} nueva(s) alerta(s) logística(s):\n\n${lineas}\n\n— OrderFlow ERP`;
        for (const a of admins) {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({ to: a.email, subject, body });
          } catch (e) {}
        }
      } catch (e) {}
    }

    return Response.json({ resource: "alertas_logistica", revisados: (pickings || []).length, atrasados: (atrasados || []).length, nuevas: nuevas.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});