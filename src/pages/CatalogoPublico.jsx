import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Heart, Loader2, Package, Search, ShieldCheck, Truck, Undo2, UserRound } from "lucide-react";
import ProductCard from "@/components/catalogo-publico/ProductCard";

const categorias = ["Inicio", "Catálogo", "Sillones", "Sillas", "Comedores", "Ratonas", "Living", "Combos", "IdearMarket", "Productos en stock"];

export default function CatalogoPublico() {
  const [productos, setProductos] = useState([]);
  const [q, setQ] = useState("");
  const [activeCategoria, setActiveCategoria] = useState("Catálogo");
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
    const categoriaTerm = ["Inicio", "Catálogo", "Productos en stock"].includes(activeCategoria) ? "" : activeCategoria.toLowerCase().replace(/es$/, "").replace(/s$/, "");
    return productos.filter((p) => {
      const texto = [p.nombre, p.categoria, ...(p.variantes || []).flatMap((v) => [v.nombre, v.codigo, ...(v.atributos || []).map((a) => `${a.atributo} ${a.valor}`)])].join(" ").toLowerCase();
      return (!categoriaTerm || texto.includes(categoriaTerm)) && (!term || texto.includes(term));
    });
  }, [productos, q, activeCategoria]);

  const irACatalogo = (categoria) => {
    setActiveCategoria(categoria);
    if (categoria === "Inicio") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setTimeout(() => document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  return (
    <main className="min-h-screen bg-[#faf9f6] text-stone-950">
      <div className="bg-black py-2 text-center text-xs font-semibold text-white">Envíos a todo el país · Fabricación artesanal · Stock inmediato</div>
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-5 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-950 text-xs font-black text-white">TM</div>
            <div className="text-[11px] font-black uppercase leading-tight tracking-[0.25em]">Todo<br />en Muebles</div>
          </div>
          <nav className="hidden flex-1 items-center gap-2 overflow-x-auto text-sm text-stone-700 lg:flex">
            {categorias.map((c) => (
              <button key={c} onClick={() => irACatalogo(c)} className={`whitespace-nowrap rounded-full px-3 py-1.5 font-semibold transition ${activeCategoria === c ? "bg-stone-950 text-white" : "hover:bg-stone-100"}`}>
                {c}
              </button>
            ))}
          </nav>
          <div className="relative ml-auto w-56 sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar sillones, sillas..." className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-9 pr-9 text-sm outline-none focus:border-stone-400" />
            <Heart className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] bg-stone-900 text-white shadow-sm">
          <img src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1800&q=85" alt="Sillón Chester" className="h-[360px] w-full object-cover opacity-75" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-transparent" />
          <div className="absolute left-8 top-1/2 max-w-lg -translate-y-1/2 sm:left-12">
            <span className="rounded-full bg-white/20 px-4 py-2 text-xs font-bold backdrop-blur">Fabricación artesanal</span>
            <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">Línea Chester</h1>
            <p className="mt-3 text-base text-white/90 sm:text-lg">Elegancia y confort artesanal para tu living</p>
            <button onClick={() => irACatalogo("Catálogo")} className="mt-6 rounded-full bg-white px-6 py-3 text-sm font-bold text-stone-950">Descubrir catálogo</button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        {[{ icon: Truck, title: "Envío a todo el país" }, { icon: ShieldCheck, title: "Efectivo o transferencia" }, { icon: Undo2, title: "Devoluciones 30 días" }, { icon: UserRound, title: "Atención personalizada" }].map(({ icon: Icon, title }) => (
          <div key={title} className="rounded-2xl border border-stone-200 bg-white p-5 text-center shadow-sm"><Icon className="mx-auto h-6 w-6 text-stone-700" /><p className="mt-3 text-sm font-bold text-stone-900">{title}</p></div>
        ))}
      </section>

      <section id="catalogo" className="mx-auto max-w-7xl scroll-mt-24 px-4 pb-10 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div><h2 className="text-2xl font-black text-stone-950">{activeCategoria === "Inicio" ? "Catálogo" : activeCategoria}</h2><p className="mt-1 text-sm text-stone-500">Precios y disponibilidad actualizados desde Odoo.</p></div>
          <span className="text-sm font-semibold text-stone-500">{visibles.length} productos</span>
        </div>
        {loading ? <div className="flex h-64 items-center justify-center text-stone-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando catálogo...</div> : error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div> : visibles.length === 0 ? <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-stone-200 bg-white py-16 text-stone-400"><Package className="h-10 w-10" /><p className="text-sm">No encontramos productos para esa búsqueda.</p></div> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{visibles.map((producto) => <ProductCard key={producto.id} producto={producto} />)}</div>}
      </section>
    </main>
  );
}