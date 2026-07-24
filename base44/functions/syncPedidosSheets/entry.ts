import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { createOdooClient, createZonaResolver } from "../../shared/odooCore.ts";

const CONFIG_KEY = "pedidos_pendientes_google_sheets";
const SHEET_TITLE = "Pedidos";
const HEADERS = [
  "Fecha entrega",
  "Pedido",
  "Cliente",
  "Teléfono",
  "Localidad",
  "Zona",
  "Productos",
  "Total",
  "Adeudado",
  "Transferencias",
  "Actualizado",
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");
    const now = new Date().toISOString();

    const config = await getOrCreateSheet(base44, accessToken, now);
    const pedidos = await loadPendingOrders(base44);
    const values = [HEADERS, ...pedidos.map((r) => [
      r.fecha_entrega || r.fecha || "",
      r.id || "",
      r.cliente || "",
      r.telefono || "",
      r.ciudad || "",
      r.zona || "",
      (r.productos || []).map((p) => `${p.nombre}${p.qty ? ` (${p.qty})` : ""}`).join(" + "),
      r.total || 0,
      r.adeudado || 0,
      r.transferencias || 0,
      now,
    ])];

    await sheetsFetch(accessToken, `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheet_id}/values/${encodeURIComponent(SHEET_TITLE)}!A:K:clear`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    await sheetsFetch(accessToken, `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheet_id}/values/${encodeURIComponent(SHEET_TITLE)}!A1:K${values.length}?valueInputOption=USER_ENTERED`, {
      method: "PUT",
      body: JSON.stringify({ values }),
    });

    await base44.asServiceRole.entities.SyncConfig.update(config.id, {
      last_count: pedidos.length,
      last_error: "",
      last_sync_at: now,
    });

    return Response.json({ ok: true, count: pedidos.length, spreadsheet_url: config.spreadsheet_url });
  } catch (error) {
    try {
      const base44 = createClientFromRequest(req);
      const rows = await base44.asServiceRole.entities.SyncConfig.filter({ key: CONFIG_KEY });
      if (rows[0]) await base44.asServiceRole.entities.SyncConfig.update(rows[0].id, { last_error: error.message || String(error), last_sync_at: new Date().toISOString() });
    } catch (_) {}
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});

async function getOrCreateSheet(base44, accessToken, now) {
  const existing = await base44.asServiceRole.entities.SyncConfig.filter({ key: CONFIG_KEY });
  if (existing[0]?.spreadsheet_id) return existing[0];

  const created = await sheetsFetch(accessToken, "https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    body: JSON.stringify({
      properties: { title: "Pedidos pendientes de coordinación - Equipo" },
      sheets: [{ properties: { title: SHEET_TITLE } }],
    }),
  });

  const record = {
    key: CONFIG_KEY,
    spreadsheet_id: created.spreadsheetId,
    spreadsheet_url: created.spreadsheetUrl,
    last_count: 0,
    last_error: "",
    last_sync_at: now,
  };
  if (existing[0]) return await base44.asServiceRole.entities.SyncConfig.update(existing[0].id, record);
  return await base44.asServiceRole.entities.SyncConfig.create(record);
}

async function sheetsFetch(accessToken, url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.error?.message || `Google Sheets ${res.status}`);
  return data;
}

async function loadPendingOrders(base44) {
  const { searchRead, m2o } = await createOdooClient(200);
  const { zonaDe } = await createZonaResolver(base44);

  const orders = await searchRead(
    "sale.order",
    [["state", "=", "sale"]],
    ["id", "name", "partner_id", "date_order", "commitment_date", "amount_total", "picking_ids", "invoice_ids", "carrier_id"],
    "commitment_date asc, date_order asc",
    300
  );

  const coordinadas = await base44.asServiceRole.entities.EntregaProgramada.list();
  const yaCoordinados = new Set((coordinadas || []).map((r) => r.order_ref));
  const allPickingIds = [];
  const allInvoiceIds = [];
  const partnerIds = [];
  const orderIds = [];
  orders.forEach((o) => {
    orderIds.push(o.id);
    (o.picking_ids || []).forEach((id) => allPickingIds.push(id));
    (o.invoice_ids || []).forEach((id) => allInvoiceIds.push(id));
    const pid = Array.isArray(o.partner_id) ? o.partner_id[0] : null;
    if (pid) partnerIds.push(pid);
  });

  const [picks, partners, lines, invoices] = await Promise.all([
    allPickingIds.length ? searchRead("stock.picking", [["id", "in", [...new Set(allPickingIds)]]], ["id", "state"], null, 500) : [],
    partnerIds.length ? searchRead("res.partner", [["id", "in", [...new Set(partnerIds)]]], ["id", "city", "phone"], null, 500) : [],
    orderIds.length ? searchRead("sale.order.line", [["order_id", "in", orderIds]], ["order_id", "name", "product_uom_qty", "qty_delivered"], "sequence", 1000) : [],
    allInvoiceIds.length ? searchRead("account.move", [["id", "in", [...new Set(allInvoiceIds)]]], ["id", "amount_residual", "state"], null, 500) : [],
  ]);

  const pickState = {};
  picks.forEach((p) => pickState[p.id] = p.state);
  const partnerMap = {};
  partners.forEach((p) => partnerMap[p.id] = { city: p.city || "", phone: p.phone || "" });
  const invoiceResidual = {};
  invoices.forEach((i) => { if (i.state === "posted") invoiceResidual[i.id] = (invoiceResidual[i.id] || 0) + (i.amount_residual || 0); });
  const linesByOrder = {};
  lines.forEach((l) => {
    const oid = Array.isArray(l.order_id) ? l.order_id[0] : null;
    if (!oid) return;
    const qty = l.product_uom_qty || 0;
    (linesByOrder[oid] = linesByOrder[oid] || []).push({ nombre: l.name || "", qty, entregado: qty > 0 && (l.qty_delivered || 0) >= qty });
  });

  return orders
    .map((o) => {
      const pids = o.picking_ids || [];
      const states = pids.map((id) => pickState[id] || "draft");
      const delivered = pids.length > 0 && states.every((s) => s === "done");
      const ready = pids.length > 0 && states.some((s) => s === "assigned");
      const partnerId = Array.isArray(o.partner_id) ? o.partner_id[0] : null;
      const partner = partnerMap[partnerId] || {};
      const carrier = m2o(o.carrier_id);
      return {
        id: o.name,
        fecha: o.date_order ? o.date_order.slice(0, 10) : "",
        fecha_entrega: o.commitment_date ? o.commitment_date.slice(0, 10) : "",
        cliente: m2o(o.partner_id),
        telefono: partner.phone || "",
        ciudad: partner.city || "",
        zona: zonaDe(partner.city, carrier),
        total: o.amount_total || 0,
        adeudado: (o.invoice_ids || []).reduce((s, id) => s + (invoiceResidual[id] || 0), 0),
        transferencias: pids.length,
        productos: linesByOrder[o.id] || [],
        listo: ready,
        sin_entregar: !delivered,
      };
    })
    .filter((r) => r.listo && r.sin_entregar && !yaCoordinados.has(r.id))
    .sort((a, b) => (a.fecha_entrega || a.fecha || "9999-12-31").localeCompare(b.fecha_entrega || b.fecha || "9999-12-31"));
}