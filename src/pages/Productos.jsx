import React, { useState, useMemo } from "react";
import { useOdoo } from "@/hooks/useOdoo";
import { Search, Pencil, Package, Eye, EyeOff } from "lucide-react";
import EditarProducto from "@/components/erp/EditarProducto";

const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export default function Productos() {
  const { data, loading, error, reload } = useOdoo("catalogo", 100);
  const [q, setQ] = useState("");
  const [soloStock, setSoloStock] = useState(true);
  const [editing, setEditing] = useState(null);

  const filtered = useMemo(() => {
    let list = data;
    if (soloStock) list = list.filter((p) => p.stock > 0);
    if (q.trim()) {
      const t = q.toLowerCase();
      list = list.filter(
        (p) =>
          p.nombre.toLowerCase().includes(t) ||
          p.codigo.toLowerCase().includes(t) ||
          p.barcode.toLowerCase().includes(t)
      );
    }
    return list;
  }, [data, soloStock, q]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Catálogo web</h1>
          <p className="mt-1 text-sm text-slate-500">
            Productos publicables · editar precio, código y visibilidad en web
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar producto..."
              className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-2 text-sm outline-none focus:border-slate-400 sm:w-64"
            />
          </div>
          <button
            onClick={() => setSoloStock((s) => !s)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
              soloStock
                ? "bg-emerald-500 text-white hover:bg-emerald-600"
                : "border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Solo en stock
          </button>
        </div>
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
          <p className="text-sm">Sin productos para mostrar</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((p) => (
            <div
              key={p.product_id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
            >
              <div className="relative aspect-square bg-slate-50">
                {p.imagen ? (
                  <img
                    src={`data:image/jpeg;base64,${p.imagen}`}
                    alt={p.nombre}
                    className="h-full w-full object-contain p-2"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-300">
                    <Package className="h-10 w-10" />
                  </div>
                )}
                <div className="absolute left-2 top-2">
                  {p.publicado ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-medium text-white">
                      <Eye className="h-3 w-3" /> Web
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/90 px-2 py-0.5 text-[10px] font-medium text-white">
                      <EyeOff className="h-3 w-3" /> Oculto
                    </span>
                  )}
                </div>
                <div className="absolute right-2 top-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      p.stock > 0 ? "bg-blue-500/90 text-white" : "bg-red-500/90 text-white"
                    }`}
                  >
                    {p.stock > 0 ? `${p.stock} en stock` : "Sin stock"}
                  </span>
                </div>
              </div>
              <div className="flex flex-1 flex-col p-3">
                <p className="line-clamp-2 text-sm font-medium text-slate-800">{p.nombre}</p>
                {p.codigo && <p className="mt-0.5 font-mono text-xs text-slate-400">{p.codigo}</p>}
                <p className="mt-1 text-base font-semibold text-slate-900">{fmt.format(p.precio)}</p>
                <button
                  onClick={() => setEditing(p)}
                  className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <EditarProducto
          product={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </div>
  );
}