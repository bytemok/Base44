import React, { useState, useMemo } from "react";
import { useOdoo } from "@/hooks/useOdoo";
import { Search, Package, Eye, EyeOff, Pencil, RefreshCw } from "lucide-react";
import EditarProducto from "@/components/erp/EditarProducto";

const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

const FILTROS = [
  { id: "todos", label: "Todos" },
  { id: "publicados", label: "Publicados" },
  { id: "no_publicados", label: "Ocultos" },
  { id: "stock", label: "Con stock" },
];

export default function Productos() {
  const { data, loading, error, reload } = useOdoo("catalogo", 100);
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [editando, setEditando] = useState(null);

  const filtered = useMemo(() => {
    let arr = data;
    if (filtro === "publicados") arr = arr.filter((p) => p.publicado);
    else if (filtro === "no_publicados") arr = arr.filter((p) => !p.publicado);
    else if (filtro === "stock") arr = arr.filter((p) => (p.stock || 0) > 0);
    if (q.trim()) {
      const t = q.toLowerCase();
      arr = arr.filter((p) => [p.nombre, p.codigo, p.barcode].join(" ").toLowerCase().includes(t));
    }
    return arr;
  }, [data, q, filtro]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Catálogo web</h1>
          <p className="mt-1 text-sm text-slate-500">Productos publicables con precio, stock y visibilidad web</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={reload} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" />
          </button>
          <div className="relative sm:w-64">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Producto, código, barras..." className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-2 text-sm outline-none focus:border-slate-400" />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button key={f.id} onClick={() => setFiltro(f.id)} className={`rounded-full px-3 py-1.5 text-sm font-medium ${filtro === f.id ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Error: {error}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 py-16 text-slate-400">
          <Package className="h-8 w-8" />
          <p className="text-sm">Sin productos</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((p) => (
            <div key={p.product_id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="mb-2 flex aspect-square items-center justify-center rounded-xl bg-slate-50">
                {p.imagen ? <img src={`data:image/jpeg;base64,${p.imagen}`} alt={p.nombre} className="h-full w-full rounded-xl object-contain" /> : <Package className="h-8 w-8 text-slate-300" />}
              </div>
              <div className="flex flex-1 flex-col">
                <p className="line-clamp-2 text-sm font-medium text-slate-900">{p.nombre}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">{p.codigo && <span className="font-mono">{p.codigo}</span>}{p.barcode && <span> · {p.barcode}</span>}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {p.publicado ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700"><Eye className="h-3 w-3" /> Web</span> : <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500"><EyeOff className="h-3 w-3" /> Oculto</span>}
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${(p.stock || 0) > 0 ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-500"}`}>{(p.stock || 0) > 0 ? `${p.stock} en stock` : "Sin stock"}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900">{fmt.format(p.precio)}</span>
                  <button onClick={() => setEditando(p)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">
                    <Pencil className="h-3 w-3" /> Editar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editando && (
        <EditarProducto product={editando} onClose={() => setEditando(null)} onSaved={() => { setEditando(null); reload(); }} />
      )}
    </div>
  );
}