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
    // Ventana de 2h para detectar transiciones recientes sin inundar con histórico
    const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");

    const pickings = await rpc("/jsonrpc", {
      service: "object",
      method: "execute_kw",
      args: [ODOO_DB, uid, ODOO_KEY, "stock.picking", "search_read",
        [[["picking_type_code", "=", "outgoing"], ["state", "in", ["assigned", "done"]], ["write_date", ">=", since]]],
        { fields: ["id", "name", "origin", "partner_id", "scheduled_date", "state", "write_date"], order: "write_date desc", limit: 200 },
      ],
    });

    const candidatos = (pickings || []).map((p) => {
      const tipo = p.state === "done" ? "entrega" : "despacho";
      return {
        picking_id: p.id,
        tipo,
        referencia: `${p.id}:${tipo}`,
        name: p.name,
        origin: p.origin || "",
        cliente: m2o(p.partner_id),
        fecha: p.scheduled_date ? p.scheduled_date.slice(0, 16).replace("T", " ") : "",
      };
    });

    const refs = candidatos.map((c) => c.referencia);
    const existentes = new Set();
    if (refs.length) {
      const prev = await base44.asServiceRole.entities.Notificacion.filter({ referencia: { $in: refs } });
      (prev || []).forEach((n) => existentes.add(n.referencia));
    }

    const nuevas = candidatos.filter((c) => !existentes.has(c.referencia));
    for (const c of nuevas) {
      const titulo = c.tipo === "entrega" ? "Pedido entregado" : "Pedido listo para despacho";
      const mensaje = c.tipo === "entrega"
        ? `El pedido ${c.origin || c.name} de ${c.cliente || "—"} fue entregado.`
        : `El pedido ${c.origin || c.name} de ${c.cliente || "—"} está listo para despacho.`;
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

    // Aviso por email a administradores con recordatorios de entrega activos
    if (nuevas.length > 0) {
      try {
        const users = await base44.asServiceRole.entities.User.list();
        const admins = (users || []).filter((u) => u.role === "admin" && u.notif_recordatorios_entrega !== false && u.email);
        const lineas = nuevas.map((c) =>
          c.tipo === "entrega"
            ? `• [ENTREGA] ${c.origin || c.name} — ${c.cliente || "—"}`
            : `• [DESPACHO] ${c.origin || c.name} — ${c.cliente || "—"}`
        ).join("\n");
        const subject = `Movimientos logísticos: ${nuevas.length} nuevo(s) evento(s)`;
        const body = `Se detectaron ${nuevas.length} nuevo(s) movimiento(s) logístico(s):\n\n${lineas}\n\n— OrderFlow ERP`;
        for (const a of admins) {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({ to: a.email, subject, body });
          } catch (e) {}
        }
      } catch (e) {}
    }

    return Response.json({ resource: "alertas_logistica", procesadas: (pickings || []).length, nuevas: nuevas.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});