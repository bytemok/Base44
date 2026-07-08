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
    const DEFAULT_ZONAS = {
      norte: ["vicente lópez","vicente lopez","san isidro","tigre","san martín","san martin","tres de febrero","3 de febrero","pilar","escobar","malvinas argentinas","josé c. paz","jose c. paz","san miguel","zárate","zarate","campana","maschwitz","nordelta","puerto madryn","benavídez","benavidez","del viso","la lucila","olivos","martínez","martinez","acassuso","beccar","carupá","carupa"],
      sur: ["avellaneda","lanús","lanus","quilmes","berazategui","florencio varela","almirante brown","lomas de zamora","esteban echeverría","ezeiza","presidente perón","presidente peron","la plata","berisso","ensenada","cañuelas","brandsen","gutiérrez","gutierrez","don orazio","city bell","gonnet","tolosa","villa elisa","villa ballester"],
      oeste: ["morón","moron","ituzaingó","ituzaingo","hurlingham","la matanza","merlo","moreno","general las heras","marcos paz","luján","lujan","navarro","rodríguez","rodriguez","haedo","ramos mejía","ramos mejia","san justo","ciudadela","caseros","el palomar","villa luzuriaga","isidro casanova","gregorio de laferrere","rafael castillo","libertad","pasco","tristán suárez","tristan suarez"],
      caba: ["capital federal","caba","c.a.b.a.","c.a.b.a","ciudad autónoma","ciudad autonoma","buenos aires","capital","palermo","belgrano","caballito","flores","devoto","nuñez","nunez","recoleta","almagro","villa crespo","balvanera","boedo","san telmo","la boca","mataderos","liniers","versalles","villa urquiza","villa devoto","monte castro","villa real","agronomía","parque chas","colegiales","núñez"]
    };
    let zonaConfig = Object.entries(DEFAULT_ZONAS).map(([k, ciudades]) => ({
      nombre: k === "norte" ? "Zona Norte" : k === "sur" ? "Zona Sur" : k === "oeste" ? "Zona Oeste" : "CABA",
      ciudades,
    }));
    try {
      const cfg = await base44.asServiceRole.entities.ZonaEntrega.list();
      if (Array.isArray(cfg) && cfg.length) {
        zonaConfig = cfg.map((z) => ({
          nombre: z.nombre,
          ciudades: (z.ciudades || "").split(/[\n,]/).map((s) => s.trim().toLowerCase()).filter(Boolean),
        }));
      }
    } catch (e) {}
    const zonaPorCiudad = (city) => {
      const c = (city || "").toLowerCase().trim();
      if (!c) return "CABA";
      for (const z of zonaConfig) {
        if (z.ciudades.some((x) => c === x || c.includes(x) || x.includes(c))) return z.nombre;
      }
      return "CABA";
    };
    const zonaDe = (city, carrier) => {
      if (/andreani|expreso|expresa|expresos|correo|oca|andreani/i.test(carrier || "")) return "Andreani/Expresos";
      return zonaPorCiudad(city);
    };
    // Resuelve una lista de ids de product.template.attribute.value a {atributo, valor}
    const resolvePtavs = async (ptavIds) => {
      const res = {};
      if (!ptavIds.length) return res;
      const ptavs = await searchRead("product.template.attribute.value", [["id", "in", ptavIds]], ["id", "product_attribute_value_id"], null, 300);
      const pavIds = [];
      const ptavPav = {};
      ptavs.forEach((p) => { const pavId = Array.isArray(p.product_attribute_value_id) ? p.product_attribute_value_id[0] : null; ptavPav[p.id] = pavId; if (pavId) pavIds.push(pavId); });
      const pavMap = {}, attrMap = {};
      if (pavIds.length) {
        const pavs = await searchRead("product.attribute.value", [["id", "in", pavIds]], ["id", "name", "attribute_id"], null, 300);
        const attrIds = [];
        pavs.forEach((p) => { const aId = Array.isArray(p.attribute_id) ? p.attribute_id[0] : null; pavMap[p.id] = { nombre: p.name || "", attrId: aId }; if (aId) attrIds.push(aId); });
        if (attrIds.length) { const attrs = await searchRead("product.attribute", [["id", "in", attrIds]], ["id", "name"], null, 300); attrs.forEach((a) => (attrMap[a.id] = a.name || "")); }
      }
      ptavIds.forEach((id) => { const pv = pavMap[ptavPav[id] || 0] || {}; res[id] = { atributo: attrMap[pv.attrId] || "", valor: pv.nombre || "" }; });
      return res;
    };

    // Atributos de variante (product.product -> product_template_attribute_value_ids)
    const loadVariantAttrs = async (productIds) => {
      const map = {};
      if (!productIds.length) return map;
      const prods = await searchRead("product.product", [["id", "in", productIds]], ["id", "product_template_attribute_value_ids"], null, 300);
      const allPtavIds = [];
      prods.forEach((p) => (p.product_template_attribute_value_ids || []).forEach((id) => allPtavIds.push(id)));
      const ptavRes = await resolvePtavs(allPtavIds);
      prods.forEach((p) => {
        map[p.id] = (p.product_template_attribute_value_ids || []).map((id) => ptavRes[id] || { atributo: "", valor: "" }).filter((x) => x.atributo || x.valor);
      });
      return map;
    };

    // Atributos no-variante (p.ej. Patas) tomados de la línea de venta/compra que originó el movimiento
    const loadNoVariantAttrs = async (saleLineIds, purchaseLineIds) => {
      const res = {};
      const collect = async (model, ids, key) => {
        if (!ids.length) return;
        const lines = await searchRead(model, [["id", "in", ids]], ["id", "product_no_variant_attribute_value_ids"], null, 200);
        const allPtav = [];
        lines.forEach((l) => (l.product_no_variant_attribute_value_ids || []).forEach((id) => allPtav.push(id)));
        const ptavRes = await resolvePtavs(allPtav);
        lines.forEach((l) => {
          res[key + ":" + l.id] = (l.product_no_variant_attribute_value_ids || []).map((id) => ptavRes[id] || { atributo: "", valor: "" }).filter((x) => x.atributo || x.valor);
        });
      };
      await collect("sale.order.line", saleLineIds, "sale");
      await collect("purchase.order.line", purchaseLineIds, "purchase");
      return res;
    };

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
        ["id", "name", "email", "phone", "vat", "city", "country_id", "parent_id", "ref"],
        "name",
        500
      );
      rows = r.map((p) => ({
        id: p.id,
        nombre: p.name || "",
        email: p.email || "",
        telefono: p.phone || "",
        cuit: p.vat || "",
        ciudad: p.city || "",
        pais: m2o(p.country_id),
        empresa: m2o(p.parent_id),
        ref: p.ref || "",
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
        [["picking_type_code", "=", "incoming"], ["state", "in", ["confirmed", "assigned"]]],
        ["id", "name", "origin", "partner_id", "scheduled_date", "state", "location_id"],
        "scheduled_date desc",
        100
      );
      const pids = r.map((p) => p.id);
      let moveMap = {};
      const pickingSaleLines = {};
      if (pids.length) {
        const moves = await searchRead(
          "stock.move",
          [["picking_id", "in", pids], ["state", "!=", "done"]],
          ["id", "product_id", "product_qty", "product_uom", "picking_id", "sale_line_id", "purchase_line_id"],
          null,
          500
        );
        const prodIds = [], saleLineIds = [], purchaseLineIds = [];
        moves.forEach((m) => {
          const id = Array.isArray(m.product_id) ? m.product_id[0] : null;
          if (id) prodIds.push(id);
          const sl = Array.isArray(m.sale_line_id) ? m.sale_line_id[0] : null;
          if (sl) saleLineIds.push(sl);
          const pl = Array.isArray(m.purchase_line_id) ? m.purchase_line_id[0] : null;
          if (pl) purchaseLineIds.push(pl);
        });
        const attrMap = await loadVariantAttrs(prodIds);
        const noVarMap = await loadNoVariantAttrs(saleLineIds, purchaseLineIds);
        moves.forEach((m) => {
          const pid = Array.isArray(m.picking_id) ? m.picking_id[0] : null;
          const prodId = Array.isArray(m.product_id) ? m.product_id[0] : null;
          if (!pid) return;
          const sl = Array.isArray(m.sale_line_id) ? m.sale_line_id[0] : null;
          const pl = Array.isArray(m.purchase_line_id) ? m.purchase_line_id[0] : null;
          if (sl) (pickingSaleLines[pid] = pickingSaleLines[pid] || []).push(sl);
          const noVar = (sl && noVarMap["sale:" + sl]) || (pl && noVarMap["purchase:" + pl]) || [];
          (moveMap[pid] = moveMap[pid] || []).push({
            producto: m2o(m.product_id),
            qty: m.product_qty || 0,
            uom: m2o(m.product_uom),
            atributos: [...(attrMap[prodId] || []), ...noVar],
          });
        });
      }
      // Patas que vienen como movimientos propios del picking
      Object.keys(moveMap).forEach((pid) => {
        const items = moveMap[pid];
        const patas = items.filter((m) => /^patas/i.test((m.producto || "").trim()));
        if (!patas.length) return;
        const obs = patas.map((m) => `${m.producto} x${m.qty}`).join(" · ");
        items.forEach((m) => { if (!/^patas/i.test((m.producto || "").trim())) m.observacion = obs; });
      });
      const origenes = r.map((p) => p.origin).filter(Boolean);
      const orderByName = {};
      const poByName = {};
      if (origenes.length) {
        try {
          const sos = await searchRead("sale.order", [["name", "in", origenes]], ["id", "name"], null, 100);
          sos.forEach((s) => (orderByName[s.name] = s.id));
        } catch (e) {}
        try {
          const pos = await searchRead("purchase.order", [["name", "in", origenes]], ["id", "name"], null, 100);
          pos.forEach((s) => (poByName[s.name] = s.id));
        } catch (e) {}
      }
      // Patas desde la orden de venta origen (la compra nace de un pedido; el patas no viene en esta recepción)
      const poIds = Array.from(new Set(Object.values(poByName).filter(Boolean)));
      if (poIds.length) {
        try {
          const pols = await searchRead("purchase.order.line", [["order_id", "in", poIds]], ["id", "order_id", "sale_order_id"], null, 300);
          const poToSale = {};
          const saleIds = new Set();
          pols.forEach((l) => {
            const poid = Array.isArray(l.order_id) ? l.order_id[0] : null;
            const soid = Array.isArray(l.sale_order_id) ? l.sale_order_id[0] : null;
            if (poid && soid) { poToSale[poid] = soid; saleIds.add(soid); }
          });
          if (saleIds.size) {
            const sols = await searchRead("sale.order.line", [["order_id", "in", Array.from(saleIds)]], ["id", "order_id", "name", "product_uom_qty"], null, 500);
            const salePatas = {};
            sols.forEach((l) => {
              if (!/^patas/i.test((l.name || "").trim())) return;
              const soid = Array.isArray(l.order_id) ? l.order_id[0] : null;
              if (!soid) return;
              (salePatas[soid] = salePatas[soid] || []).push(`${l.name} x${l.product_uom_qty || 0}`);
            });
            r.forEach((p) => {
              const items = moveMap[p.id] || [];
              if (!items.length || items.some((m) => /^patas/i.test((m.producto || "").trim()))) return;
              const soid = poToSale[poByName[p.origin] || 0];
              const patasArr = salePatas[soid];
              if (!patasArr || !patasArr.length) return;
              const obs = patasArr.join(" · ");
              items.forEach((m) => { if (!/^patas/i.test((m.producto || "").trim())) m.observacion = obs; });
            });
          }
        } catch (e) {}
      }
      rows = r.map((p) => ({
        picking_id: p.id,
        referencia: p.name || "",
        origen: p.origin || "",
        order_id: orderByName[p.origin] || null,
        po_id: poByName[p.origin] || null,
        proveedor: m2o(p.partner_id),
        fecha: p.scheduled_date ? p.scheduled_date.slice(0, 16).replace("T", " ") : "",
        estado: p.state || "",
        ubicacion: m2o(p.location_id),
        productos: moveMap[p.id] || [],
      }));
      extra.odoo_url = ODOO_URL;
    } else if (resource === "enviados") {
      const r = await searchRead(
        "stock.picking",
        [["picking_type_code", "=", "outgoing"], ["state", "=", "confirmed"]],
        ["id", "name", "origin", "partner_id", "scheduled_date", "state", "location_dest_id"],
        "scheduled_date desc",
        100
      );
      const pids = r.map((p) => p.id);
      let moveMap = {};
      if (pids.length) {
        const moves = await searchRead(
          "stock.move",
          [["picking_id", "in", pids], ["state", "!=", "done"]],
          ["id", "product_id", "product_qty", "product_uom", "picking_id", "sale_line_id", "purchase_line_id"],
          null,
          500
        );
        const prodIds = [], saleLineIds = [], purchaseLineIds = [];
        moves.forEach((m) => {
          const id = Array.isArray(m.product_id) ? m.product_id[0] : null;
          if (id) prodIds.push(id);
          const sl = Array.isArray(m.sale_line_id) ? m.sale_line_id[0] : null;
          if (sl) saleLineIds.push(sl);
          const pl = Array.isArray(m.purchase_line_id) ? m.purchase_line_id[0] : null;
          if (pl) purchaseLineIds.push(pl);
        });
        const attrMap = await loadVariantAttrs(prodIds);
        const noVarMap = await loadNoVariantAttrs(saleLineIds, purchaseLineIds);
        moves.forEach((m) => {
          const pid = Array.isArray(m.picking_id) ? m.picking_id[0] : null;
          const prodId = Array.isArray(m.product_id) ? m.product_id[0] : null;
          if (!pid) return;
          const sl = Array.isArray(m.sale_line_id) ? m.sale_line_id[0] : null;
          const pl = Array.isArray(m.purchase_line_id) ? m.purchase_line_id[0] : null;
          const noVar = (sl && noVarMap["sale:" + sl]) || (pl && noVarMap["purchase:" + pl]) || [];
          (moveMap[pid] = moveMap[pid] || []).push({
            producto: m2o(m.product_id),
            qty: m.product_qty || 0,
            uom: m2o(m.product_uom),
            atributos: [...(attrMap[prodId] || []), ...noVar],
          });
        });
      }
      Object.keys(moveMap).forEach((pid) => {
        const items = moveMap[pid];
        const patas = items.filter((m) => /^patas/i.test((m.producto || "").trim()));
        if (!patas.length) return;
        const obs = patas.map((m) => `${m.producto} x${m.qty}`).join(" · ");
        items.forEach((m) => { if (!/^patas/i.test((m.producto || "").trim())) m.observacion = obs; });
      });
      const origenes = r.map((p) => p.origin).filter(Boolean);
      const orderByName = {};
      if (origenes.length) {
        try {
          const sos = await searchRead("sale.order", [["name", "in", origenes]], ["id", "name"], null, 100);
          sos.forEach((s) => (orderByName[s.name] = s.id));
        } catch (e) {}
      }
      const partnerIds = [];
      r.forEach((p) => { const pid = Array.isArray(p.partner_id) ? p.partner_id[0] : null; if (pid) partnerIds.push(pid); });
      const partnerPhone = {};
      if (partnerIds.length) {
        try {
          const partners = await searchRead("res.partner", [["id", "in", Array.from(new Set(partnerIds))]], ["id", "phone", "mobile"], null, 200);
          partners.forEach((p) => { partnerPhone[p.id] = p.phone || p.mobile || ""; });
        } catch (e) {}
      }
      rows = r.map((p) => {
        const pid = Array.isArray(p.partner_id) ? p.partner_id[0] : null;
        return {
          picking_id: p.id,
          referencia: p.name || "",
          origen: p.origin || "",
          order_id: orderByName[p.origin] || null,
          cliente: m2o(p.partner_id),
          telefono: partnerPhone[pid] || "",
          fecha: p.scheduled_date ? p.scheduled_date.slice(0, 16).replace("T", " ") : "",
          estado: p.state || "",
          destino: m2o(p.location_dest_id),
          productos: moveMap[p.id] || [],
        };
      });
      extra.odoo_url = ODOO_URL;
    } else if (resource === "recibir_pickings") {
      const ids = Array.isArray(body.ids) ? body.ids.map(Number).filter(Boolean) : [];
      if (!ids.length) return Response.json({ error: "Faltan ids" }, { status: 400 });
      const ok = [];
      const fallidos = [];
      for (const pid of ids) {
        try {
          const moves = await searchRead("stock.move", [["picking_id", "=", pid], ["state", "!=", "done"]], ["id", "product_id", "product_uom", "product_qty", "location_id", "location_dest_id"], null, 200);
          for (const m of moves) {
            const demand = m.product_qty || 0;
            const lines = await searchRead("stock.move.line", [["move_id", "=", m.id]], ["id"], null, 50);
            if (lines.length) {
              for (const ln of lines) {
                await rpc("/jsonrpc", { service: "object", method: "execute_kw", args: [ODOO_DB, uid, ODOO_KEY, "stock.move.line", "write", [[ln.id], { quantity: demand }]] });
              }
            } else {
              await rpc("/jsonrpc", { service: "object", method: "execute_kw", args: [ODOO_DB, uid, ODOO_KEY, "stock.move.line", "create", [{ move_id: m.id, picking_id: pid, product_id: Array.isArray(m.product_id) ? m.product_id[0] : m.product_id, product_uom_id: Array.isArray(m.product_uom) ? m.product_uom[0] : m.product_uom, quantity: demand, location_id: Array.isArray(m.location_id) ? m.location_id[0] : m.location_id, location_dest_id: Array.isArray(m.location_dest_id) ? m.location_dest_id[0] : m.location_dest_id }]] });
            }
          }
          const res = await rpc("/jsonrpc", { service: "object", method: "execute_kw", args: [ODOO_DB, uid, ODOO_KEY, "stock.picking", "button_validate", [[pid]]] });
          if (res && typeof res === "object" && res.res_model === "stock.immediate.transfer") {
            const wizId = await rpc("/jsonrpc", { service: "object", method: "execute_kw", args: [ODOO_DB, uid, ODOO_KEY, "stock.immediate.transfer", "create", [{ pick_ids: [[6, 0, [pid]]] }]] });
            await rpc("/jsonrpc", { service: "object", method: "execute_kw", args: [ODOO_DB, uid, ODOO_KEY, "stock.immediate.transfer", "process", [wizId]] });
          } else if (res && typeof res === "object" && res.res_model === "stock.backorder.confirmation") {
            const wizId = await rpc("/jsonrpc", { service: "object", method: "execute_kw", args: [ODOO_DB, uid, ODOO_KEY, "stock.backorder.confirmation", "create", [{ pick_ids: [[6, 0, [pid]]] }]] });
            await rpc("/jsonrpc", { service: "object", method: "execute_kw", args: [ODOO_DB, uid, ODOO_KEY, "stock.backorder.confirmation", "process", [wizId]] });
          }
          ok.push(pid);
        } catch (e) {
          fallidos.push({ id: pid, error: e.message || String(e) });
        }
      }
      return Response.json({ resource: "recibir_pickings", ok, fallidos });
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
        ["id", "name", "partner_id", "date_order", "amount_total", "picking_ids", "invoice_ids", "carrier_id"],
        "date_order desc",
        200
      );
      const allPickingIds = [];
      const partnerIds = [];
      orders.forEach((o) => {
        (o.picking_ids || []).forEach((pid) => allPickingIds.push(pid));
        const pid = Array.isArray(o.partner_id) ? o.partner_id[0] : null;
        if (pid) partnerIds.push(pid);
      });
      const pickingState = {};
      if (allPickingIds.length) {
        const picks = await searchRead("stock.picking", [["id", "in", allPickingIds]], ["id", "state"], null, 200);
        picks.forEach((p) => (pickingState[p.id] = p.state));
      }
      const partnerCity = {};
      if (partnerIds.length) {
        const partners = await searchRead("res.partner", [["id", "in", Array.from(new Set(partnerIds))]], ["id", "city"], null, 300);
        partners.forEach((p) => { partnerCity[p.id] = p.city || ""; });
      }
      rows = orders
        .map((o) => {
          const pids = o.picking_ids || [];
          const states = pids.map((id) => pickingState[id] || "draft");
          const delivered = pids.length > 0 && states.every((s) => s === "done");
          const pid = Array.isArray(o.partner_id) ? o.partner_id[0] : null;
          const carrier = m2o(o.carrier_id);
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
            ciudad: partnerCity[pid] || "",
            transporte: carrier,
            zona: zonaDe(partnerCity[pid] || "", carrier),
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
      const lineProdIds = [];
      lines.forEach((l) => { const id = Array.isArray(l.product_id) ? l.product_id[0] : null; if (id) lineProdIds.push(id); });
      const lineAttrMap = await loadVariantAttrs(lineProdIds);
      const _patasObs = lines.filter((l) => /^patas/i.test((l.name || m2o(l.product_id) || "").trim())).map((l) => `${l.name || m2o(l.product_id)} x${l.product_uom_qty || 0}`).join(" · ");
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
            atributos: lineAttrMap[Array.isArray(l.product_id) ? l.product_id[0] : null] || [],
            observacion: /^patas/i.test((l.name || "").trim()) ? "" : _patasObs,
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
    } else if (resource === "inventario") {
      const tmpls = await searchRead(
        "product.template",
        [["active", "=", true], ["type", "in", ["product", "consu"]]],
        ["id", "name", "default_code", "list_price", "is_published", "type", "categ_id", "image_128"],
        "name",
        200
      );
      const tmplIds = tmpls.map((t) => t.id);
      let variants = [];
      const ptavMap = {};
      const pavMap = {};
      const attrMap = {};
      if (tmplIds.length) {
        variants = await searchRead(
          "product.product",
          [["product_tmpl_id", "in", tmplIds], ["active", "=", true]],
          ["id", "name", "default_code", "barcode", "lst_price", "qty_available", "product_tmpl_id", "product_template_attribute_value_ids"],
          "name",
          200
        );
        const ptavIds = [];
        variants.forEach((v) => (v.product_template_attribute_value_ids || []).forEach((id) => ptavIds.push(id)));
        if (ptavIds.length) {
          const ptavs = await searchRead(
            "product.template.attribute.value",
            [["id", "in", ptavIds]],
            ["id", "product_attribute_value_id", "price_extra"],
            null,
            200
          );
          const pavIds = [];
          ptavs.forEach((p) => {
            const pavId = Array.isArray(p.product_attribute_value_id) ? p.product_attribute_value_id[0] : null;
            ptavMap[p.id] = { pavId, price_extra: p.price_extra || 0 };
            if (pavId) pavIds.push(pavId);
          });
          if (pavIds.length) {
            const pavs = await searchRead(
              "product.attribute.value",
              [["id", "in", pavIds]],
              ["id", "name", "attribute_id"],
              null,
              200
            );
            const attrIds = [];
            pavs.forEach((p) => {
              const attrId = Array.isArray(p.attribute_id) ? p.attribute_id[0] : null;
              pavMap[p.id] = { nombre: p.name || "", attrId };
              if (attrId) attrIds.push(attrId);
            });
            if (attrIds.length) {
              const attrs = await searchRead("product.attribute", [["id", "in", attrIds]], ["id", "name"], null, 200);
              attrs.forEach((a) => (attrMap[a.id] = a.name || ""));
            }
          }
        }
      }
      const byTmpl = {};
      variants.forEach((v) => {
        const tid = Array.isArray(v.product_tmpl_id) ? v.product_tmpl_id[0] : null;
        if (!tid) return;
        const atributos = (v.product_template_attribute_value_ids || []).map((ptavId) => {
          const pt = ptavMap[ptavId] || {};
          const pv = pavMap[pt.pavId] || {};
          return {
            atributo: attrMap[pv.attrId] || "",
            valor: pv.nombre || "",
            precio_extra: pt.price_extra || 0,
          };
        });
        (byTmpl[tid] = byTmpl[tid] || []).push({
          product_id: v.id,
          nombre: v.name || "",
          codigo: v.default_code || "",
          barcode: v.barcode || "",
          precio: v.lst_price || 0,
          stock: v.qty_available || 0,
          atributos,
        });
      });
      rows = tmpls.map((t) => ({
        tmpl_id: t.id,
        nombre: t.name || "",
        codigo: t.default_code || "",
        precio_base: t.list_price || 0,
        publicado: !!t.is_published,
        tipo: t.type || "",
        categoria: m2o(t.categ_id),
        imagen: t.image_128 || null,
        variantes: byTmpl[t.id] || [],
      }));
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
    } else if (resource === "coordinar_pedido") {
      const orderId = Number(body.order_id);
      const fecha = body.fecha;
      if (!orderId || !fecha) return Response.json({ error: "Faltan datos" }, { status: 400 });
      await rpc("/jsonrpc", { service: "object", method: "execute_kw", args: [ODOO_DB, uid, ODOO_KEY, "sale.order", "write", [[orderId], { commitment_date: fecha + " 00:00:00" }]] });
      return Response.json({ resource: "coordinar_pedido", ok: true });
    } else if (resource === "control_stock") {
      const r = await searchRead(
        "product.product",
        [["active", "=", true], ["type", "in", ["product", "consu"]]],
        ["id", "name", "default_code", "barcode", "qty_available", "lst_price"],
        "name",
        500
      );
      const attrMap = await loadVariantAttrs(r.map((p) => p.id));
      rows = r.map((p) => ({
        product_id: p.id,
        nombre: p.name || "",
        codigo: p.default_code || "",
        barcode: p.barcode || "",
        esperado: p.qty_available || 0,
        precio: p.lst_price || 0,
        atributos: attrMap[p.id] || [],
      }));
    } else if (resource === "control_stock_aplicar") {
      const conteo = Array.isArray(body.conteo) ? body.conteo : [];
      const resultados = [];
      const internalLocs = await searchRead("stock.location", [["usage", "=", "internal"]], ["id", "name"], null, 50);
      const mainLocId = (internalLocs.find((l) => l.name === "Stock") || internalLocs[0] || {}).id || null;
      for (const item of conteo) {
        const pid = Number(item.product_id);
        const contado = Number(item.contado);
        if (!pid) { resultados.push({ product_id: item.product_id, ok: false, error: "Sin product_id" }); continue; }
        if (isNaN(contado)) { resultados.push({ product_id: pid, ok: false, error: "Conteo inválido" }); continue; }
        const quants = await searchRead("stock.quant", [["product_id", "=", pid], ["location_id.usage", "=", "internal"]], ["id", "quantity", "location_id"], null, 100);
        const esperado = quants.reduce((s, q) => s + (q.quantity || 0), 0);
        const qids = quants.map((q) => q.id);
        try {
          if (qids.length === 0) {
            if (!mainLocId) { resultados.push({ product_id: pid, esperado, contado, ok: false, error: "Sin ubicación interna" }); continue; }
            const newId = await rpc("/jsonrpc", { service: "object", method: "execute_kw", args: [ODOO_DB, uid, ODOO_KEY, "stock.quant", "create", [{ product_id: pid, location_id: mainLocId, inventory_quantity: contado }]] });
            await rpc("/jsonrpc", { service: "object", method: "execute_kw", args: [ODOO_DB, uid, ODOO_KEY, "stock.quant", "action_apply", [[newId]]] });
            resultados.push({ product_id: pid, esperado, contado, diff: contado - esperado, ok: true, nuevo: true });
          } else {
            for (let i = 0; i < qids.length; i++) {
              await rpc("/jsonrpc", { service: "object", method: "execute_kw", args: [ODOO_DB, uid, ODOO_KEY, "stock.quant", "write", [[qids[i]], { inventory_quantity: i === 0 ? contado : 0 }]] });
            }
            await rpc("/jsonrpc", { service: "object", method: "execute_kw", args: [ODOO_DB, uid, ODOO_KEY, "stock.quant", "action_apply", [qids]] });
            resultados.push({ product_id: pid, esperado, contado, diff: contado - esperado, ok: true });
          }
        } catch (e) {
          resultados.push({ product_id: pid, esperado, contado, ok: false, error: e.message || String(e) });
        }
      }
      return Response.json({ resource: "control_stock_aplicar", resultados });
    } else if (resource === "pickings_crear") {
      const tipo = body.tipo; // 'in' | 'out'
      const partnerId = Number(body.partner_id);
      const lineas = Array.isArray(body.lineas) ? body.lineas : [];
      if (!partnerId || !tipo || !lineas.length) return Response.json({ error: "Faltan datos" }, { status: 400 });
      const code = tipo === "in" ? "incoming" : "outgoing";
      const ptypes = await searchRead("stock.picking.type", [["code", "=", code]], ["id", "default_location_src_id", "default_location_dest_id"], null, 1);
      const ptype = ptypes[0];
      if (!ptype) return Response.json({ error: "No hay tipo de picking " + code }, { status: 400 });
      const srcId = Array.isArray(ptype.default_location_src_id) ? ptype.default_location_src_id[0] : null;
      const dstId = Array.isArray(ptype.default_location_dest_id) ? ptype.default_location_dest_id[0] : null;
      if (!srcId || !dstId) return Response.json({ error: "Faltan ubicaciones del tipo de picking" }, { status: 400 });
      const pickingId = await rpc("/jsonrpc", { service: "object", method: "execute_kw", args: [ODOO_DB, uid, ODOO_KEY, "stock.picking", "create", [{ partner_id: partnerId, picking_type_id: ptype.id, location_id: srcId, location_dest_id: dstId, origin: body.origin || ("Pick " + (tipo === "in" ? "In" : "Out")), scheduled_date: new Date().toISOString() }]] });
      for (const ln of lineas) {
        const prodId = Number(ln.product_id);
        const qty = Number(ln.qty);
        if (!prodId || !qty) continue;
        const [prod] = await searchRead("product.product", [["id", "=", prodId]], ["name", "uom_id"], null, 1);
        const uomId = Array.isArray(prod?.uom_id) ? prod.uom_id[0] : null;
        const moveId = await rpc("/jsonrpc", { service: "object", method: "execute_kw", args: [ODOO_DB, uid, ODOO_KEY, "stock.move", "create", [{ picking_id: pickingId, product_id: prodId, name: prod?.name || "", product_uom: uomId, product_uom_qty: qty, location_id: srcId, location_dest_id: dstId }]] });
        await rpc("/jsonrpc", { service: "object", method: "execute_kw", args: [ODOO_DB, uid, ODOO_KEY, "stock.move.line", "create", [{ move_id: moveId, picking_id: pickingId, product_id: prodId, product_uom_id: uomId, quantity: qty, location_id: srcId, location_dest_id: dstId }]] });
      }
      const res = await rpc("/jsonrpc", { service: "object", method: "execute_kw", args: [ODOO_DB, uid, ODOO_KEY, "stock.picking", "button_validate", [[pickingId]]] });
      if (res && typeof res === "object" && res.res_model === "stock.immediate.transfer") {
        const wizId = await rpc("/jsonrpc", { service: "object", method: "execute_kw", args: [ODOO_DB, uid, ODOO_KEY, "stock.immediate.transfer", "create", [{ pick_ids: [[6, 0, [pickingId]]] }]] });
        await rpc("/jsonrpc", { service: "object", method: "execute_kw", args: [ODOO_DB, uid, ODOO_KEY, "stock.immediate.transfer", "process", [wizId]] });
      } else if (res && typeof res === "object" && res.res_model === "stock.backorder.confirmation") {
        const wizId = await rpc("/jsonrpc", { service: "object", method: "execute_kw", args: [ODOO_DB, uid, ODOO_KEY, "stock.backorder.confirmation", "create", [{ pick_ids: [[6, 0, [pickingId]]] }]] });
        await rpc("/jsonrpc", { service: "object", method: "execute_kw", args: [ODOO_DB, uid, ODOO_KEY, "stock.backorder.confirmation", "process", [wizId]] });
      }
      const [pick] = await searchRead("stock.picking", [["id", "=", pickingId]], ["name", "state"], null, 1);
      return Response.json({ resource: "pickings_crear", picking_id: pickingId, name: pick?.name, estado: pick?.state, odoo_url: ODOO_URL });
    } else if (resource === "registrar_pago_caja") {
      const partnerId = Number(body.partner_id);
      const amount = Number(body.amount);
      if (!partnerId || !amount) return Response.json({ error: "Faltan datos" }, { status: 400 });
      const journals = await searchRead("account.journal", [["name", "ilike", "Caja Deposito"]], ["id", "inbound_payment_method_line_ids"], null, 5);
      const journal = journals[0];
      if (!journal) return Response.json({ error: "No se encontró el diario 'Caja Deposito'" }, { status: 400 });
      const pmlId = Array.isArray(journal.inbound_payment_method_line_ids) && journal.inbound_payment_method_line_ids.length ? journal.inbound_payment_method_line_ids[0] : null;
      const vals = { payment_type: "inbound", partner_type: "customer", partner_id: partnerId, journal_id: journal.id, amount, date: new Date().toISOString().slice(0, 10), ref: body.ref || "Pick Out" };
      if (pmlId) vals.payment_method_line_id = pmlId;
      const payId = await rpc("/jsonrpc", { service: "object", method: "execute_kw", args: [ODOO_DB, uid, ODOO_KEY, "account.payment", "create", [vals]] });
      await rpc("/jsonrpc", { service: "object", method: "execute_kw", args: [ODOO_DB, uid, ODOO_KEY, "account.payment", "action_post", [[payId]]] });
      return Response.json({ resource: "registrar_pago_caja", payment_id: payId, journal_id: journal.id });
    } else if (resource === "entregas_calendario") {
      const recs = await base44.asServiceRole.entities.EntregaProgramada.list("-fecha_entrega");
      const orderIds = (recs || []).map((r) => Number(r.odoo_order_id)).filter(Boolean);
      const orders = orderIds.length ? await searchRead("sale.order", [["id", "in", orderIds]], ["id", "name", "partner_id", "carrier_id", "picking_ids"], null, 200) : [];
      const orderMap = {};
      const partnerIds = [];
      const allPickIds = [];
      orders.forEach((o) => {
        const pid = Array.isArray(o.partner_id) ? o.partner_id[0] : null;
        orderMap[o.id] = { name: o.name, partner_id: pid, carrier: m2o(o.carrier_id), picking_ids: o.picking_ids || [] };
        if (pid) partnerIds.push(pid);
        (o.picking_ids || []).forEach((x) => allPickIds.push(x));
      });
      const partnerMap = {};
      if (partnerIds.length) {
        const partners = await searchRead("res.partner", [["id", "in", Array.from(new Set(partnerIds))]], ["id", "city", "phone"], null, 300);
        partners.forEach((p) => { partnerMap[p.id] = { city: p.city || "", phone: p.phone || "" }; });
      }
      const pickState = {};
      if (allPickIds.length) {
        const picks = await searchRead("stock.picking", [["id", "in", Array.from(new Set(allPickIds))]], ["id", "state"], null, 300);
        picks.forEach((p) => { pickState[p.id] = p.state; });
      }
      rows = (recs || []).map((r) => {
        const o = orderMap[Number(r.odoo_order_id)] || {};
        const partner = partnerMap[o.partner_id] || {};
        const pids = o.picking_ids || [];
        const states = pids.map((id) => pickState[id] || "draft");
        const enviada = pids.length > 0 && states.every((s) => s === "done");
        const listo = pids.length > 0 && states.some((s) => s === "assigned");
        return {
          id: r.id,
          order_ref: r.order_ref,
          cliente: r.cliente,
          total: r.total,
          fecha_entrega: r.fecha_entrega,
          odoo_order_id: r.odoo_order_id,
          invoice_ids: r.invoice_ids,
          picking_ids: r.picking_ids,
          notas: r.notas,
          estado: r.estado,
          ciudad: partner.city || "",
          telefono: partner.phone || "",
          transporte: o.carrier || "",
          zona: zonaDe(partner.city, o.carrier),
          enviada,
          listo,
        };
      });
    } else if (resource === "alertas_stock") {
      const r = await searchRead(
        "product.product",
        [["active", "=", true], ["type", "in", ["product", "consu"]]],
        ["id", "name", "default_code", "barcode", "qty_available", "lst_price", "type"],
        "name",
        500
      );
      const faltantes = r.filter((p) => (p.qty_available || 0) < 0).sort((a, b) => (a.qty_available - b.qty_available));
      const attrMap = await loadVariantAttrs(faltantes.map((p) => p.id));
      rows = faltantes.map((p) => ({
        product_id: p.id,
        nombre: p.name || "",
        codigo: p.default_code || "",
        barcode: p.barcode || "",
        faltante: Math.abs(p.qty_available || 0),
        stock: p.qty_available || 0,
        precio: p.lst_price || 0,
        atributos: attrMap[p.id] || [],
      }));
      extra.odoo_url = ODOO_URL;
    } else {
      return Response.json({ error: "Recurso no soportado: " + resource }, { status: 400 });
    }

    return Response.json({ resource, count: rows.length, data: rows, ...extra });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});