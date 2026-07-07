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
    const reportUrl = (report, ids) => `${ODOO_URL}/report/pdf/${report}/${ids.join(",")}`;

    let rows = [];
    let extra = {};
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
    } else if (resource === "ventas") {
      const orders = await searchRead(
        "sale.order",
        [["state", "=", "sale"]],
        ["id", "name", "partner_id", "date_order", "amount_total", "picking_ids", "invoice_ids"],
        "date_order desc",
        200
      );
      const allPickingIds = [];
      orders.forEach((o) => (o.picking_ids || []).forEach((pid) => allPickingIds.push(pid)));
      const pickingState = {};
      if (allPickingIds.length) {
        const picks = await searchRead("stock.picking", [["id", "in", allPickingIds]], ["id", "state"], null, 200);
        picks.forEach((p) => (pickingState[p.id] = p.state));
      }
      rows = orders
        .map((o) => {
          const pids = o.picking_ids || [];
          const states = pids.map((id) => pickingState[id] || "draft");
          const delivered = pids.length > 0 && states.every((s) => s === "done");
          return {
            db_id: o.id,
            id: o.name,
            cliente: m2o(o.partner_id),
            fecha: o.date_order ? o.date_order.slice(0, 10) : "",
            total: o.amount_total || 0,
            picking_ids: pids,
            invoice_ids: o.invoice_ids || [],
            transferencias: pids.length,
            entregado: delivered,
            sin_entregar: !delivered,
            listo: states.some((s) => s === "assigned"),
          };
        })
        .filter((r) => r.sin_entregar);
      extra.odoo_url = ODOO_URL;
    } else if (resource === "detalle") {
      const orderId = Number(body.order_id);
      if (!orderId) return Response.json({ error: "Falta order_id" }, { status: 400 });
      const [o] = await searchRead(
        "sale.order",
        [["id", "=", orderId]],
        ["id", "name", "partner_id", "partner_shipping_id", "date_order", "amount_total", "amount_untaxed", "amount_tax", "state", "invoice_status", "payment_term_id", "client_order_ref", "user_id", "carrier_id", "note", "picking_ids", "invoice_ids"],
        null,
        1
      );
      if (!o) return Response.json({ error: "Pedido no encontrado" }, { status: 404 });
      let lines = [];
      try {
        lines = await searchRead(
          "sale.order.line",
          [["order_id", "=", orderId]],
          ["product_id", "name", "product_uom_qty", "qty_delivered", "qty_invoiced", "price_unit", "price_subtotal", "discount"],
          "sequence",
          200
        );
      } catch (e) {}
      const pids = o.picking_ids || [];
      const iids = o.invoice_ids || [];
      let pickings = [];
      if (pids.length) {
        pickings = await searchRead("stock.picking", [["id", "in", pids]], ["name", "scheduled_date", "state", "location_dest_id", "origin"], null, 50);
      }
      let invoices = [];
      if (iids.length) {
        invoices = await searchRead("account.move", [["id", "in", iids]], ["name", "invoice_date", "amount_total", "amount_residual", "state", "payment_state"], null, 50);
      }
      return Response.json({
        resource: "detalle",
        data: {
          order: {
            name: o.name,
            cliente: m2o(o.partner_id),
            entrega_a: m2o(o.partner_shipping_id),
            fecha: o.date_order ? o.date_order.slice(0, 10) : "",
            total: o.amount_total || 0,
            base: o.amount_untaxed || 0,
            impuestos: o.amount_tax || 0,
            estado: o.state || "",
            facturacion: o.invoice_status || "",
            plazo_pago: m2o(o.payment_term_id),
            ref_cliente: o.client_order_ref || "",
            vendedor: m2o(o.user_id),
            transporte: m2o(o.carrier_id),
            notas: o.note || "",
          },
          lines: lines.map((l) => ({
            producto: m2o(l.product_id),
            descripcion: l.name,
            cantidad: l.product_uom_qty || 0,
            entregado: l.qty_delivered || 0,
            facturado: l.qty_invoiced || 0,
            precio: l.price_unit || 0,
            subtotal: l.price_subtotal || 0,
            descuento: l.discount || 0,
          })),
          pickings: pickings.map((p) => ({
            nombre: p.name,
            fecha: p.scheduled_date ? p.scheduled_date.slice(0, 16).replace("T", " ") : "",
            estado: p.state,
            destino: m2o(p.location_dest_id),
            origen: p.origin || "",
          })),
          invoices: invoices.map((i) => ({
            numero: i.name,
            fecha: i.invoice_date || "",
            total: i.amount_total || 0,
            saldo: i.amount_residual || 0,
            estado: i.state,
            pago: i.payment_state,
          })),
          print: {
            factura: iids.length ? reportUrl("account.report_invoice_with_payments", iids) : null,
            remito: pids.length ? reportUrl("stock.report_picking", pids) : null,
            etiquetas: pids.length ? reportUrl("stock.report_delivery_label", pids) : null,
            orden_venta: reportUrl("sale.report_saleorder", [orderId]),
          },
        },
      });
    } else if (resource === "catalogo") {
      const variants = await searchRead(
        "product.product",
        [["active", "=", true], ["type", "in", ["product", "consu"]]],
        ["id", "name", "default_code", "barcode", "image_128", "lst_price", "qty_available", "type", "product_tmpl_id"],
        "name",
        100
      );
      const tmplIds = [];
      const seenT = new Set();
      variants.forEach((v) => {
        const tid = Array.isArray(v.product_tmpl_id) ? v.product_tmpl_id[0] : null;
        if (tid && !seenT.has(tid)) { seenT.add(tid); tmplIds.push(tid); }
      });
      const tmplMap = {};
      if (tmplIds.length) {
        try {
          const tmpls = await searchRead("product.template", [["id", "in", tmplIds]], ["id", "is_published", "list_price"], null, 100);
          tmpls.forEach((t) => (tmplMap[t.id] = t));
        } catch (e) {}
      }
      rows = variants.map((v) => {
        const tid = Array.isArray(v.product_tmpl_id) ? v.product_tmpl_id[0] : null;
        const t = tid ? tmplMap[tid] || {} : {};
        return {
          product_id: v.id,
          tmpl_id: tid,
          nombre: v.name || "",
          codigo: v.default_code || "",
          barcode: v.barcode || "",
          precio: v.lst_price || t.list_price || 0,
          stock: v.qty_available || 0,
          tipo: v.type || "",
          publicado: !!t.is_published,
          imagen: v.image_128 || null,
        };
      });
      extra.odoo_url = ODOO_URL;
    } else if (resource === "guardar_producto") {
      const productId = Number(body.product_id);
      const tmplId = Number(body.tmpl_id);
      if (!productId || !tmplId) return Response.json({ error: "Faltan ids" }, { status: 400 });
      const prodFields = {};
      if (body.default_code !== undefined) prodFields.default_code = body.default_code || false;
      if (body.barcode !== undefined) prodFields.barcode = body.barcode || false;
      if (Object.keys(prodFields).length) {
        await rpc("/jsonrpc", { service: "object", method: "execute_kw", args: [ODOO_DB, uid, ODOO_KEY, "product.product", "write", [[productId], prodFields]] });
      }
      const tmplFields = {};
      if (body.nombre !== undefined) tmplFields.name = body.nombre;
      if (body.precio !== undefined) tmplFields.list_price = Number(body.precio) || 0;
      if (body.publicado !== undefined) tmplFields.is_published = !!body.publicado;
      if (Object.keys(tmplFields).length) {
        await rpc("/jsonrpc", { service: "object", method: "execute_kw", args: [ODOO_DB, uid, ODOO_KEY, "product.template", "write", [[tmplId], tmplFields]] });
      }
      return Response.json({ resource: "guardar_producto", ok: true });
    } else {
      return Response.json({ error: "Recurso no soportado: " + resource }, { status: 400 });
    }

    return Response.json({ resource, count: rows.length, data: rows, ...extra });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});