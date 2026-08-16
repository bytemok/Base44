import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { categories, products, searchProducts, getProductsByCategory, slugify } from "@/lib/store-data";
import ProductCard from "@/components/store/ProductCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";
import { motion } from "framer-motion";

const mapCatalogProduct = (producto) => ({
  id: producto.id,
  name: producto.nombre,
  category: slugify(producto.categoria || producto.nombre),
  categoryName: producto.categoria || "Productos",
  price: Number(producto.precio_min || 0),
  inStock: Number(producto.stock_total || 0) > 0,
  stockQuantity: Number(producto.stock_total || 0),
  rating: "4.8",
  variants: (producto.variantes || []).map((variant) => ({
    id: variant.id,
    name: variant.nombre,
    code: variant.codigo,
    price: Number(variant.precio || producto.precio_min || 0),
    stock: Number(variant.stock || 0),
    attributes: variant.atributos || [],
  })),
});

export default function CatalogoPublico() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialCategory = urlParams.get("category") || "all";
  const initialSearch = urlParams.get("search") || "";
  const stockOnly = urlParams.get("stock") === "available";

  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [catalog, setCatalog] = useState(products);
  const [sortBy, setSortBy] = useState("featured");
  const [priceRange, setPriceRange] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    base44.functions.invoke("catalogoPublico", { limit: 500 })
      .then((res) => setCatalog((res.data?.productos || []).map(mapCatalogProduct)))
      .catch((e) => setError(e?.response?.data?.error || e?.message || "No se pudo cargar el catálogo"))
      .finally(() => setLoading(false));
  }, []);

  const categoryOptions = useMemo(() => {
    const fromCatalog = catalog.map((product) => ({ slug: product.category, name: product.categoryName })).filter((cat) => cat.slug && cat.name);
    const merged = [...categories, ...fromCatalog];
    return Array.from(new Map(merged.map((cat) => [cat.slug, cat])).values());
  }, [catalog]);

  const filtered = useMemo(() => {
    let result = getProductsByCategory(catalog, selectedCategory);
    if (stockOnly) result = result.filter((product) => product.inStock && product.stockQuantity > 0);
    result = searchProducts(result, searchQuery);

    if (priceRange !== "all") {
      const [min, max] = priceRange.split("-").map(Number);
      result = result.filter((product) => product.price >= min && (max ? product.price <= max : true));
    }

    switch (sortBy) {
      case "price-low": result.sort((a, b) => a.price - b.price); break;
      case "price-high": result.sort((a, b) => b.price - a.price); break;
      case "rating": result.sort((a, b) => Number(b.rating) - Number(a.rating)); break;
      case "newest": result.sort((a, b) => Number(b.id) - Number(a.id)); break;
      default: break;
    }

    return result.sort((a, b) => Number(b.inStock) - Number(a.inStock));
  }, [selectedCategory, searchQuery, sortBy, priceRange, catalog, stockOnly]);

  const clearFilters = () => {
    setSelectedCategory("all");
    setSearchQuery("");
    setSortBy("featured");
    setPriceRange("all");
  };

  const hasFilters = selectedCategory !== "all" || searchQuery || sortBy !== "featured" || priceRange !== "all";
  const title = searchQuery ? `Resultados para "${searchQuery}"` : selectedCategory !== "all" ? categoryOptions.find((cat) => cat.slug === selectedCategory)?.name || "Productos en stock" : "Productos en stock";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{filtered.length} producto{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}</p>
        </div>

        <div className="mb-8 flex flex-wrap items-center gap-3 rounded-2xl border border-border/50 bg-card p-4">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar productos..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Categoría" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categoryOptions.map((cat) => <SelectItem key={cat.slug} value={cat.slug}>{cat.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={priceRange} onValueChange={setPriceRange}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder="Precio" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los precios</SelectItem>
              <SelectItem value="0-100000">Hasta $100.000</SelectItem>
              <SelectItem value="100000-500000">$100.000 - $500.000</SelectItem>
              <SelectItem value="500000-900000">$500.000 - $900.000</SelectItem>
              <SelectItem value="900000-9999999">Más de $900.000</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder="Ordenar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="featured">Destacados</SelectItem>
              <SelectItem value="price-low">Precio: menor a mayor</SelectItem>
              <SelectItem value="price-high">Precio: mayor a menor</SelectItem>
              <SelectItem value="rating">Mejor valorados</SelectItem>
              <SelectItem value="newest">Novedades</SelectItem>
            </SelectContent>
          </Select>

          {hasFilters && <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1"><X className="h-3 w-3" /> Limpiar</Button>}
        </div>

        {hasFilters && (
          <div className="mb-6 flex flex-wrap gap-2">
            {selectedCategory !== "all" && <Badge variant="secondary" className="cursor-pointer gap-1 rounded-full" onClick={() => setSelectedCategory("all")}>{categoryOptions.find((cat) => cat.slug === selectedCategory)?.name}<X className="h-3 w-3" /></Badge>}
            {searchQuery && <Badge variant="secondary" className="cursor-pointer gap-1 rounded-full" onClick={() => setSearchQuery("")}>"{searchQuery}" <X className="h-3 w-3" /></Badge>}
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center text-muted-foreground">Cargando catálogo...</div>
        ) : error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">{error}</div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
            {filtered.map((product, index) => (
              <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-secondary"><Search className="h-8 w-8 text-muted-foreground" /></div>
            <h3 className="mb-2 text-lg font-semibold">No se encontraron productos</h3>
            <p className="mb-4 text-muted-foreground">Probá ajustando los filtros o la búsqueda.</p>
            <Button onClick={clearFilters}>Limpiar todos los filtros</Button>
          </div>
        )}
      </div>
    </div>
  );
}