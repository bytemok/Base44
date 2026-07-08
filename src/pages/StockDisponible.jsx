import React, { useState, useMemo } from "react";
import { useOdoo } from "@/hooks/useOdoo";
import { Search, Package, PackageCheck, ChevronDown } from "lucide-react";

const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export default function StockDisponible() {
  const { data, loading, error } = useOdoo("inventario", 200);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(new Set());

  const filas = useMemo(() => {
    let arr = data
      .map((t) => ({ ...t, stockTotal: (t.variantes || []).reduce((s, v) => s + (v.stock || 0), 0) }))
      .filter((t) => t.publicado && t.stockTotal > 0)
      .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es"));
    if (q.trim()) {
      const t = q.toLowerCase();
      arr = arr.filter((p) => [p.nombre, p.codigo, p.categoria].join(" ").toLowerCase().includes(t));
    }
    return arr;
  }, [data, q]);

  const totalUnidades = useMemo(() => filas.reduce((s, t) => s + t.stockTotal, 0), [filas]);

  const toggle = (id) =>
    setOpen((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Stock disponible</h1>
          <p className="mt-1 text-sm text-slate-500">
            Productos publicados y disponibles para vender · {filas.length} producto(s) · {totalUnidades} unidades
          </p>
        </div>
        <div className="relative sm:w-72">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-2 text-sm outline-none focus:border-slate-400"
          />
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
          <PackageCheck className="h-8 w-8" />
          <p className="text-sm">No hay productos disponibles para vender</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filas.map((p) => {
            const isOpen = open.has(p.tmpl_id);
            const variantesStock = (p.variantes || []).filter((v) => v.stock > 0);
            const single = variantesStock.length <= 1;
            return (
              <div key={p.tmpl_id} className="rounded-xl border border-slate-200 bg-white">
                <button
                  onClick={() => !single && toggle(p.tmpl_id)}
                  className="flex w-full items-center gap-3 p-4 text-left"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                    {p.imagen ? (
                      <img src={`data:image/jpeg;base64,${p.imagen}`} alt={p.nombre} className="h-11 w-11 rounded-lg object-contain" />
                    ) : (
                      <Package className="h-5 w-5 text-emerald-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{p.nombre}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {p.codigo && <span className="font-mono">{p.codigo} · </span>}
                      {p.categoria || "Sin categoría"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-emerald-600">{p.stockTotal} en stock</span>
                    <p className="text-[11px] text-slate-400">{fmt.format(p.precio_base)} base</p>
                  </div>
                  {!single && (
                    <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${isOpen ? "rotate-180" : ""}`} />
                  )}
                </button>

                {(single || isOpen) && variantesStock.length > 0 && (
                  <div className="divide-y divide-slate-100 border-t border-slate-100">
                    {variantesStock.map((v) => (
                      <div key={v.product_id} className="flex flex-col gap-2 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-medium text-slate-800">{v.nombre}</span>
                            {v.atributos.map((a, i) => (
                              <span key={i} className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                                {a.atributo}: {a.valor}
                              </span>
                            ))}
                          </div>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {v.codigo && <span className="font-mono">{v.codigo}</span>}
                            {v.barcode && <span> · {v.barcode}</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <span className="text-xs font-medium text-emerald-600">{v.stock} en stock</span>
                          <span className="text-sm font-semibold text-slate-900">{fmt.format(v.precio)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}