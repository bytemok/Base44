import React, { useState, useMemo } from "react";
import { useOdoo } from "@/hooks/useOdoo";
import { Search, Layers, CheckCircle2 } from "lucide-react";

const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export default function Variantes() {
  const { data, loading, error } = useOdoo("inventario", 200);
  const [q, setQ] = useState("");
  const [soloStock, setSoloStock] = useState(false);

  const variantes = useMemo(
    () => data.flatMap((t) => (t.variantes || []).map((v) => ({ ...v, tmpl_nombre: t.nombre, categoria: t.categoria }))),
    [data]
  );

  const filas = useMemo(() => {
    let arr = variantes;
    if (soloStock) arr = arr.filter((v) => (v.stock || 0) > 0);
    if (q.trim()) {
      const t = q.toLowerCase();
      arr = arr.filter((v) => [v.nombre, v.codigo, v.barcode, v.tmpl_nombre, ...(v.atributos || []).map((a) => `${a.atributo} ${a.valor}`)].join(" ").toLowerCase().includes(t));
    }
    return arr;
  }, [variantes, q, soloStock]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Variantes</h1>
          <p className="mt-1 text-sm text-slate-500">Cada variante de producto con atributos, código y stock</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setSoloStock((v) => !v)} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium ${soloStock ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            <CheckCircle2 className="h-4 w-4" /> Ver stock disponible
          </button>
          <div className="relative sm:w-64">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Variante, atributo, código..." className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-2 text-sm outline-none focus:border-slate-400" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Error: {error}</div>
      ) : filas.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 py-16 text-slate-400">
          <Layers className="h-8 w-8" />
          <p className="text-sm">Sin variantes</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filas.map((v) => (
            <div key={v.product_id} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3.5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{v.nombre}</p>
                <p className="text-[11px] text-slate-400">{v.tmpl_nombre}{v.categoria ? ` · ${v.categoria}` : ""}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {v.atributos && v.atributos.length > 0 ? v.atributos.map((a, i) => (
                    <span key={i} className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">{a.atributo}: {a.valor}</span>
                  )) : <span className="text-[11px] text-slate-300">Sin atributos</span>}
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <p className="text-[11px] text-slate-400">{v.codigo && <span className="font-mono">{v.codigo}</span>}{v.barcode && <span> · {v.barcode}</span>}</p>
                  <span className={`text-xs font-semibold ${v.stock > 0 ? "text-blue-600" : "text-red-500"}`}>{v.stock > 0 ? `${v.stock} en stock` : "Sin stock"}</span>
                </div>
                <span className="text-sm font-semibold text-slate-900">{fmt.format(v.precio)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}