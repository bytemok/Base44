import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { requireAdmin } from "../../shared/authGuards.ts";
import { createOdooClient } from "../../shared/odooCore.ts";

const APP_STATUS_GROUPS = {
  "nuevo": "draft",
  "en proceso": "sale",
  "enviado": "sale",
  "entregado": "done",
};

const ODOO_STATUS_LABELS = {
  draft: "Nuevo",
  sent: "Nuevo",
  sale: "En proceso",
  done: "Entregado",
  cancel: "Cancelado",
};

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function appStatusGroup(status) {
  return APP_STATUS_GROUPS[normalizeText(status)] || normalizeText(status);
}

function odooStatusGroup(state) {
  const s = normalizeText(state);
  if (s === "sent") return "draft";
  return s;
}

function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const auth = await requireAdmin(base44);
    if (auth.response) return auth.response;
    const user = auth.user;

    const pedidos = await base44.asServiceRole.entities.Pedido.list("-updated_date", 500);
    const pedidosConRef = (pedidos || []).filter((p) => String(p.order_id || "").trim());
    if (!pedidosConRef.length) {
      return Response.json({ ok: true, revisados: 0, discrepancias: 0, alertas_creadas: 0, mensaje: "No hay pedidos con referencia para comparar." });
    }

    const refs = Array.from(new Set(pedidosConRef.map((p) => String(p.order_id || "").trim()).filter(Boolean)));
    const { searchRead } = await createOdooClient(500);
    const odooOrders = [];
    for (const refChunk of chunk(refs, 80)) {
      const rows = await searchRead(
        "sale.order",
        [["name", "in", refChunk]],
        ["name", "state"],
        null,
        refChunk.length
      );
      odooOrders.push(...(rows || []));
    }

    const odooByName = {};
    odooOrders.forEach((o) => { if (o.name) odooByName[o.name] = o; });

    const discrepancias = [];
    const now = new Date().toISOString();
    for (const pedido of pedidosConRef) {
      const ref = String(pedido.order_id || "").trim();
      const odoo = odooByName[ref];
      if (!odoo) {
        discrepancias.push({ pedido, ref, estado_app: pedido.status || "Sin estado", estado_odoo: "No encontrado", group_app: appStatusGroup(pedido.status), group_odoo: "missing" });
        continue;
      }
      const groupApp = appStatusGroup(pedido.status);
      const groupOdoo = odooStatusGroup(odoo.state);
      if (groupApp !== groupOdoo) {
        discrepancias.push({ pedido, ref, estado_app: pedido.status || "Sin estado", estado_odoo: ODOO_STATUS_LABELS[odoo.state] || odoo.state || "Sin estado", group_app: groupApp, group_odoo: groupOdoo });
      }
    }

    const creadas = [];
    for (const d of discrepancias) {
      const referencia = `pedido_estado:${d.ref}:${d.group_app}:${d.group_odoo}`;
      const existentes = await base44.asServiceRole.entities.Notificacion.filter({ referencia }, "-created_date", 1);
      if (existentes?.length) continue;

      const mensaje = `El pedido ${d.ref} tiene estado "${d.estado_app}" en la app y "${d.estado_odoo}" en Odoo.`;
      await base44.asServiceRole.entities.Notificacion.create({
        tipo: "estado",
        titulo: "Discrepancia de estado de pedido",
        mensaje,
        referencia,
        cliente: d.pedido.customer_name || "",
        pedido_ref: d.ref,
        leida: false,
      });
      await base44.asServiceRole.entities.SecurityAuditLog.create({
        area: "integridad",
        resource: "pedido",
        action: "discrepancia_estado_odoo",
        source: "compararEstadosPedidosOdoo",
        user_id: user.id || "system",
        user_email: user.email || "workflow",
        user_name: user.full_name || "Workflow",
        user_role: user.role || "admin",
        record_ref: d.ref,
        count: 1,
        status: `app=${d.estado_app}; odoo=${d.estado_odoo}`,
        created_at: now,
      });
      creadas.push({ pedido: d.ref, estado_app: d.estado_app, estado_odoo: d.estado_odoo });
    }

    return Response.json({ ok: true, revisados: pedidosConRef.length, discrepancias: discrepancias.length, alertas_creadas: creadas.length, alertas: creadas });
  } catch (error) {
    return Response.json({ ok: false, error: error.message || String(error) }, { status: 500 });
  }
}