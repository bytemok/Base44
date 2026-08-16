import React from "react";
import { Package } from "lucide-react";

const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export default function ProductCard({ producto }) {
  const variantes = (producto.variantes || []).slice(0, 4);

  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex aspect-[4/3] items-center justify-center rounded-xl bg-slate-50">
        <Package className="h-10 w-10 text-slate-300" />
      </div>
      <div className="flex flex-1 flex-col">
        {producto.categoria && <p className="mb-1 text-xs font-medium uppercase tracking-wide text-amber-700">{producto.categoria}</p>}
        <h2 className="line-clamp-2 text-base font-semibold text-slate-900">{producto.nombre}</h2>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-lg font-bold text-slate-900">Desde {fmt.format(producto.precio_min || 0)}</span>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Stock {producto.stock_total}</span>
        </div>
        {variantes.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
            {variantes.map((v) => (
              <div key={v.id} className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-xs font-medium text-slate-700">{(v.atributos || []).map((a) => a.valor).filter(Boolean).join(" · ") || v.nombre}</p>
                <p className="mt-0.5 text-xs text-slate-500">{fmt.format(v.precio)} · {v.stock} u.</p>
              </div>
            ))}
            {(producto.variantes || []).length > 4 && <p className="text-xs text-slate-400">+ {(producto.variantes || []).length - 4} variantes más</p>}
          </div>
        )}
      </div>
    </article>
  );
}