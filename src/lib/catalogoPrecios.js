const norm = (value = "") => String(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const onlyNumbers = (value = "") => String(value).replace(/[^0-9]/g, "");

export const parsePrecios = (row) => {
  try {
    const parsed = JSON.parse(row?.precios_json || "[]");
    return Array.isArray(parsed) ? parsed.filter((p) => p && p.tela && Number(p.precio) > 0) : [];
  } catch (_) {
    return [];
  }
};

export const precioCatalogoParaProducto = (producto, catalogo = []) => {
  const nombreProducto = norm(producto?.nombre || "");
  if (!nombreProducto) return null;
  const candidatos = catalogo.filter((c) => {
    const n = norm(c.nombre || "");
    return n && (nombreProducto.includes(n) || n.includes(nombreProducto));
  });
  if (!candidatos.length) return null;
  const item = candidatos.sort((a, b) => norm(b.nombre).length - norm(a.nombre).length)[0];
  const precios = parsePrecios(item);
  if (!precios.length) return { item, precio: 0, tela: "" };
  const tapizado = norm((producto?.atributos || []).find((a) => norm(a.atributo).includes("tapizado"))?.valor || "");
  const elegido = precios.find((p) => tapizado && norm(p.tela).includes(tapizado)) || precios.find((p) => tapizado && tapizado.includes(norm(p.tela))) || precios[0];
  return { item, precio: Number(elegido.precio) || 0, tela: elegido.tela || "" };
};

export const aplicarPreciosCatalogo = (productos = [], catalogo = []) => productos.map((p) => {
  const match = precioCatalogoParaProducto(p, catalogo);
  if (!match?.precio) return p;
  return {
    ...p,
    precio_odoo: p.precio || 0,
    precio_pdf: match.precio,
    precio_fuente: "PDF",
    precio_tela_pdf: match.tela,
    precio_catalogo_nombre: match.item?.nombre || "",
    precio: match.precio,
  };
});

export const compararConOdoo = (catalogo = [], productosOdoo = []) => catalogo.map((c) => {
  const cn = norm(c.nombre || "");
  const matches = productosOdoo.filter((p) => {
    const pn = norm(p.nombre || "");
    return cn && pn && (pn.includes(cn) || cn.includes(pn));
  });
  const precios = parsePrecios(c);
  const pdfMin = precios.length ? Math.min(...precios.map((p) => Number(p.precio) || 0).filter(Boolean)) : Number(c.precio_min) || 0;
  const pdfMax = precios.length ? Math.max(...precios.map((p) => Number(p.precio) || 0).filter(Boolean)) : Number(c.precio_max) || 0;
  const odooPrices = matches.map((m) => Number(m.precio) || 0).filter(Boolean);
  const odooMin = odooPrices.length ? Math.min(...odooPrices) : 0;
  const odooMax = odooPrices.length ? Math.max(...odooPrices) : 0;
  const diferencia = odooPrices.length ? Math.max(Math.abs(pdfMin - odooMin), Math.abs(pdfMax - odooMax)) : 0;
  return { catalogo: c, precios, matches, pdfMin, pdfMax, odooMin, odooMax, diferencia, estado: matches.length ? (diferencia > 1 ? "Diferente" : "OK") : "Sin match" };
}).sort((a, b) => (b.estado === "Diferente") - (a.estado === "Diferente") || b.diferencia - a.diferencia);

export const moneyToNumber = (value = "") => Number(onlyNumbers(value)) || 0;