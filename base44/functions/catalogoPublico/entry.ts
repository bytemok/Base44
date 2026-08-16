import { createOdooClient, m2o } from "../../shared/odooCore.ts";

const normalizeText = (value) => String(value || "").trim();

async function loadAttributeMap(odoo, ptavIds) {
  const uniquePtavs = Array.from(new Set(ptavIds.filter(Boolean)));
  if (!uniquePtavs.length) return {};

  const ptavs = await odoo.searchReadAll(
    "product.template.attribute.value",
    [["id", "in", uniquePtavs]],
    ["id", "product_attribute_value_id"],
    "id asc",
    300,
    5000
  );
  const pavIds = ptavs.map((p) => Array.isArray(p.product_attribute_value_id) ? p.product_attribute_value_id[0] : null).filter(Boolean);
  const pavs = await odoo.searchReadAll(
    "product.attribute.value",
    [["id", "in", Array.from(new Set(pavIds))]],
    ["id", "name", "attribute_id"],
    "id asc",
    300,
    5000
  );
  const attrIds = pavs.map((p) => Array.isArray(p.attribute_id) ? p.attribute_id[0] : null).filter(Boolean);
  const attrs = await odoo.searchReadAll(
    "product.attribute",
    [["id", "in", Array.from(new Set(attrIds))]],
    ["id", "name"],
    "id asc",
    300,
    2000
  );

  const attrNameById = Object.fromEntries(attrs.map((a) => [a.id, a.name || ""]));
  const pavById = Object.fromEntries(pavs.map((p) => [p.id, {
    valor: p.name || "",
    atributo: attrNameById[Array.isArray(p.attribute_id) ? p.attribute_id[0] : null] || ""
  }]));

  return Object.fromEntries(ptavs.map((p) => {
    const pavId = Array.isArray(p.product_attribute_value_id) ? p.product_attribute_value_id[0] : null;
    return [p.id, pavById[pavId] || null];
  }));
}

export default async function(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Number(body.limit) || 300, 500);
    const odoo = await createOdooClient(500);

    let variantes;
    try {
      variantes = await odoo.searchReadAll(
        "product.product",
        [["active", "=", true], ["sale_ok", "=", true]],
        ["id", "name", "default_code", "barcode", "lst_price", "qty_available", "product_tmpl_id", "categ_id", "product_template_attribute_value_ids"],
        "name asc",
        300,
        5000
      );
    } catch (_) {
      variantes = await odoo.searchReadAll(
        "product.product",
        [["active", "=", true]],
        ["id", "name", "default_code", "barcode", "lst_price", "qty_available", "product_tmpl_id", "categ_id", "product_template_attribute_value_ids"],
        "name asc",
        300,
        5000
      );
    }

    const visibles = variantes.filter((v) => Number(v.qty_available || 0) > 0);
    const ptavIds = visibles.flatMap((v) => v.product_template_attribute_value_ids || []);
    const attrByPtav = await loadAttributeMap(odoo, ptavIds);

    const groups = new Map();
    visibles.forEach((v) => {
      const templateName = m2o(v.product_tmpl_id) || v.name || "Producto";
      const templateId = Array.isArray(v.product_tmpl_id) ? v.product_tmpl_id[0] : v.id;
      const key = String(templateId);
      const attrs = (v.product_template_attribute_value_ids || []).map((id) => attrByPtav[id]).filter(Boolean);
      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          nombre: normalizeText(templateName),
          categoria: m2o(v.categ_id),
          precio_min: Number(v.lst_price || 0),
          stock_total: 0,
          variantes: []
        });
      }
      const item = groups.get(key);
      item.stock_total += Number(v.qty_available || 0);
      item.precio_min = Math.min(item.precio_min || Number(v.lst_price || 0), Number(v.lst_price || 0));
      item.variantes.push({
        id: v.id,
        nombre: normalizeText(v.name || templateName),
        codigo: v.default_code || v.barcode || "",
        precio: Number(v.lst_price || 0),
        stock: Number(v.qty_available || 0),
        atributos: attrs
      });
    });

    const productos = Array.from(groups.values())
      .filter((p) => p.stock_total > 0)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
      .slice(0, limit);

    return Response.json({ productos, total: productos.length, updated_at: new Date().toISOString() });
  } catch (error) {
    return Response.json({ error: error.message || "Error al cargar catálogo público" }, { status: 500 });
  }
}