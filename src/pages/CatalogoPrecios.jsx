import React, { useEffect, useMemo, useState } from "react";
import { Search, BookOpen, AlertTriangle, CheckCircle2, Link2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useOdoo } from "@/hooks/useOdoo";
import { compararConOdoo, parsePrecios } from "@/lib/catalogoPrecios";

const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export default function CatalogoPrecios() {
  const [catalogo, setCatalogo] = useState([]);
  const [loadingCatalogo, setLoadingCatalogo] = useState(true);
  const [q, setQ] = useState("");
  const { data: inventario, loading: loadingOdoo, error } = useOdoo("inventario");

  useEffect(() => {
    (async () => {
      setLoadingCatalogo(true);
      const rows = await base44.entities.CatalogoPrecio.list("nombre", 500);
      setCatalogo(rows || []);
      setLoadingCatalogo(false);
    })();
  }, []);

  const productosOdoo = useMemo(() => (inventario || []).flatMap((p) => (p.variantes || []).map((v) => ({ ...v, nombre: v.nombre || p.nombre, producto_padre: p.nombre }))), [inventario]);
  const comparacion = useMemo(() => compararConOdoo(catalogo, productosOdoo), [catalogo, productosOdoo]);
  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return comparacion;
    return comparacion.filter((r) => [r.catalogo.nombre, r.catalogo.categoria, r.catalogo.medidas, r.catalogo.caracteristicas, r.precios.map((p) => p.tela).join(" ")].join(" ").toLowerCase().includes(t));
  }, [comparacion, q]);

  const diferentes = comparacion.filter((r) => r.estado === "Diferente").length;
  const sinMatch = comparacion.filter((r) => r.estado === "Sin match").length;

  if (loadingCatalogo || loadingOdoo) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Catálogo de precios</h1>
          <p className="mt-1 text-sm text-slate-500">Base del PDF para consulta, vendedores, chatbot y comparación contra Odoo.</p>
        </div>
        <div className="relative sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar modelo, tela o medida..." className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-slate-400" />
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">Error al comparar con Odoo: {error}</div>}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">Productos PDF</p><p className="mt-1 text-2xl font-bold text-slate-900">{catalogo.length}</p></div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm text-amber-700">Diferencias de precio</p><p className="mt-1 text-2xl font-bold text-amber-800">{diferentes}</p></div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4"><p className="text-sm text-blue-700">Sin match en Odoo</p><p className="mt-1 text-2xl font-bold text-blue-800">{sinMatch}</p></div>
      </div>

      <div className="space-y-3">
        {filtrados.map((r) => {
          const precios = parsePrecios(r.catalogo);
          return (
            <div key={r.catalogo.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <BookOpen className="h-4 w-4 text-slate-400" />
                    <h2 className="font-semibold text-slate-900">{r.catalogo.nombre}</h2>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${r.estado === "OK" ? "bg-emerald-50 text-emerald-700" : r.estado === "Diferente" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>{r.estado}</span>
                  </div>
                  {r.catalogo.medidas && <p className="mt-1 text-sm text-slate-600">Medidas: {r.catalogo.medidas}</p>}
                  {r.catalogo.caracteristicas && <p className="mt-1 text-xs text-slate-500">{r.catalogo.caracteristicas}</p>}
                </div>
                <div className="shrink-0 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <p className="font-semibold text-slate-900">PDF: {fmt.format(r.pdfMin)} - {fmt.format(r.pdfMax)}</p>
                  <p className="text-xs text-slate-500">Odoo: {r.odooMin ? `${fmt.format(r.odooMin)} - ${fmt.format(r.odooMax)}` : "sin coincidencia"}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {precios.map((p, i) => <span key={i} className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">{p.tela}: {fmt.format(p.precio)}</span>)}
              </div>
              {r.matches.length > 0 && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400"><Link2 className="h-3.5 w-3.5" /> {r.matches.length} variante(s) vinculadas en Odoo</div>
              )}
              {r.estado === "Diferente" && <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-700"><AlertTriangle className="h-3.5 w-3.5" /> Revisar precio entre PDF y Odoo</div>}
              {r.estado === "OK" && <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Precio coincidente</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}