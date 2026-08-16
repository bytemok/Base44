export function groupCatalogoPorProductoPadre(rows = []) {
  const byTemplate = new Map();

  rows.forEach((row) => {
    const tmplId = row.tmpl_id || row.product_id;
    if (!tmplId) return;

    if (!byTemplate.has(tmplId)) {
      byTemplate.set(tmplId, {
        tmpl_id: tmplId,
        nombre: row.producto_padre || row.nombre || "",
        codigo: row.codigo_padre || "",
        precio_base: row.precio || 0,
        publicado: !!row.publicado,
        tipo: row.tipo || "",
        categoria: row.categoria || "",
        imagen: row.imagen || null,
        variantes: [],
      });
    }

    byTemplate.get(tmplId).variantes.push({
      product_id: row.product_id,
      nombre: row.nombre || "",
      codigo: row.codigo || "",
      barcode: row.barcode || "",
      precio: row.precio || 0,
      stock: row.stock || 0,
      atributos: row.atributos || [],
    });
  });

  return Array.from(byTemplate.values());
}