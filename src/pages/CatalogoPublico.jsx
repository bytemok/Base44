import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Package, Search } from "lucide-react";
import ProductCard from "@/components/catalogo-publico/ProductCard";

export default function CatalogoPublico() {
  const [productos, setProductos] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await base44.functions.invoke("catalogoPublico", { limit: 300 });
        setProductos(res.data?.productos || []);
      } catch (e) {
        setError(e?.response?.data?.error || e?.message || "No se pudo cargar el catálogo");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const visibles = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return productos;
    return productos.filter((p) => [
      p.nombre,
      p.categoria,
      ...(p.variantes || []).flatMap((v) => [v.nombre, v.codigo, ...(v.atributos || []).map((a) => `${a.atributo} ${a.valor}`)])
    ].join(" ").toLowerCase().includes(term));
  }, [productos, q]);

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-700">Catálogo público</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">Productos disponibles</h1>
            <p className="mt-3 text-base text-slate-600">Consultá modelos con stock actualizado, variantes y precios de referencia.</p>
          </div>
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto, medida, tela o código..." className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-sm outline-none focus:border-amber-500 focus:bg-white" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex h-64 items-center justify-center text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando catálogo...</div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
        ) : visibles.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-slate-400">
            <Package className="h-10 w-10" />
            <p className="text-sm">No encontramos productos para esa búsqueda.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibles.map((producto) => <ProductCard key={producto.id} producto={producto} />)}
          </div>
        )}
      </section>
    </main>
  );
}