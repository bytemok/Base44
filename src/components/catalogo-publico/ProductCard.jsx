import React from "react";
import { Package } from "lucide-react";

const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export default function ProductCard({ producto }) {
  const variantes = (producto.variantes || []).slice(0, 2);

  return (
    <article className="group overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex aspect-[4/3] items-center justify-center bg-stone-50">
        <Package className="h-9 w-9 text-stone-300" />
      </div>
      <div className="p-4">
        {producto.categoria && <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-orange-700">{producto.categoria}</p>}
        <h2 className="line-clamp-2 min-h-10 text-sm font-bold leading-tight text-stone-950">{producto.nombre}</h2>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-base font-black text-stone-950">Desde {fmt.format(producto.precio_min || 0)}</span>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">Stock {producto.stock_total}</span>
        </div>
        {variantes.length > 0 && (
          <div className="mt-3 space-y-2">
            {variantes.map((v) => (
              <div key={v.id} className="rounded-xl bg-stone-50 px-3 py-2 text-xs text-stone-600">
                <p className="line-clamp-1 font-medium text-stone-700">{(v.atributos || []).map((a) => a.valor).filter(Boolean).join(" · ") || v.nombre}</p>
                <p className="mt-0.5">{fmt.format(v.precio)} · {v.stock} u.</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}