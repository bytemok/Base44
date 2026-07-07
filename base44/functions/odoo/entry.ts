import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const resource = body.resource;
    const limit = Math.min(Number(body.limit) || 100, 200);

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

    const searchRead = async (model, domain, fields, order, lim) => {
      const kwargs = { fields, limit: lim || limit };
      if (order) kwargs.order = order;
      return rpc("/jsonrpc", {
        service: "object",
        method: "execute_kw",
        args: [ODOO_DB, uid, ODOO_KEY, model, "search_read", [domain], kwargs],
      });
    };

    const m2o = (v) => (Array.isArray(v) ? v[1] : v || "");

    let rows = [];
    if (resource === "pedidos") {
      const r = await searchRead(
        "sale.order",
        [],
        ["name", "partner_id", "date_order", "amount_total", "state", "invoice_status", "picking_ids"],
        "date_order desc"
      );
      rows = r.map((o) => ({
        id: o.name || "",
        cliente: m2o(o.partner_id),
        fecha: o.date_order ? o.date_order.slice(0, 10) : "",
        total: o.amount_total || 0,
        estado: o.state || "",
        facturado: o.invoice_status || "",
        entregas: Array.isArray(o.picking_ids) ? o.picking_ids.length : 0,
      }));
    } else if (resource === "clientes") {
      const r = await searchRead(
        "res.partner",
        [["customer_rank", ">", 0]],
        ["name", "email", "phone", "vat", "city", "country_id", "parent_id"],
        "name"
      );
      rows = r.map((p) => ({
        nombre: p.name || "",
        email: p.email || "",
        telefono: p.phone || "",
        cuit: p.vat || "",
        ciudad: p.city || "",
        pais: m2o(p.country_id),
        empresa: m2o(p.parent_id),
      }));
    } else if (resource === "productos") {
      const r = await searchRead(
        "product.product",
        [],
        ["name", "default_code", "barcode", "list_price", "qty_available", "type", "categ_id"],
        "name"
      );
      rows = r.map((p) => ({
        nombre: p.name || "",
        codigo: p.default_code || "",
        barcode: p.barcode || "",
        precio: p.list_price || 0,
        stock: p.qty_available || 0,
        tipo: p.type || "",
        categoria: m2o(p.categ_id),
      }));
    } else if (resource === "entregas") {
      const r = await searchRead(
        "stock.picking",
        [["picking_type_code", "=", "outgoing"], ["state", "!=", "done"]],
        ["name", "partner_id", "scheduled_date", "state", "origin", "location_dest_id"],
        "scheduled_date desc"
      );
      rows = r.map((p) => ({
        referencia: p.name || "",
        cliente: m2o(p.partner_id),
        fecha: p.scheduled_date ? p.scheduled_date.slice(0, 16).replace("T", " ") : "",
        estado: p.state || "",
        origen: p.origin || "",
        destino: m2o(p.location_dest_id),
      }));
    } else if (resource === "recepciones") {
      const r = await searchRead(
        "stock.picking",
        [["picking_type_code", "=", "incoming"], ["state", "!=", "done"]],
        ["name", "partner_id", "scheduled_date", "state", "origin", "location_id"],
        "scheduled_date desc"
      );
      rows = r.map((p) => ({
        referencia: p.name || "",
        proveedor: m2o(p.partner_id),
        fecha: p.scheduled_date ? p.scheduled_date.slice(0, 16).replace("T", " ") : "",
        estado: p.state || "",
        origen: p.origin || "",
        ubicacion: m2o(p.location_id),
      }));
    } else if (resource === "facturas") {
      const r = await searchRead(
        "account.move",
        [["move_type", "in", ["out_invoice", "out_refund"]]],
        ["name", "partner_id", "invoice_date", "amount_total", "amount_residual", "state", "payment_state"],
        "invoice_date desc"
      );
      rows = r.map((f) => ({
        numero: f.name || "",
        cliente: m2o(f.partner_id),
        fecha: f.invoice_date || "",
        total: f.amount_total || 0,
        saldo: f.amount_residual || 0,
        estado: f.state || "",
        pago: f.payment_state || "",
      }));
    } else {
      return Response.json({ error: "Recurso no soportado: " + resource }, { status: 400 });
    }

    return Response.json({ resource, count: rows.length, data: rows });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});