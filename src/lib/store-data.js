export const categories = [
  { slug: "sillones", name: "Sillones" },
  { slug: "sillas", name: "Sillas" },
  { slug: "comedores", name: "Comedores" },
  { slug: "ratonas", name: "Ratonas" },
  { slug: "living", name: "Living" },
  { slug: "combos", name: "Combos" },
];

export const products = [];

export const slugify = (value = "") => String(value)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/(^-|-$)/g, "") || "otros";

export const searchProducts = (items, query) => {
  const term = String(query || "").trim().toLowerCase();
  if (!term) return items;
  return items.filter((product) => [
    product.name,
    product.categoryName,
    ...(product.variants || []).flatMap((variant) => [
      variant.name,
      variant.code,
      ...(variant.attributes || []).map((attr) => `${attr.atributo || attr.attribute || ""} ${attr.valor || attr.value || ""}`),
    ]),
  ].join(" ").toLowerCase().includes(term));
};

export const getProductsByCategory = (items, category) => {
  if (!category || category === "all") return [...items];
  return items.filter((product) => product.category === category);
};