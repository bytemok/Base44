import React from "react";

const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export default function ZonaPedidosCard({ zona, pedidos }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{zona}</h2>
          <p className="text-xs text-slate-500">{pedidos.length} pedidos pendientes</p>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700 ring-1 ring-amber-200">{pedidos.length}</span>
      </div>
      <div className="divide-y divide-slate-100">
        {pedidos.map((p) => (
          <div key={p.id} className="grid gap-2 px-4 py-3 md:grid-cols-[100px_1fr_120px_110px] md:items-center">
            <div>
              <p className="font-mono text-xs font-semibold text-slate-500">{p.id}</p>
              <p className="text-xs text-slate-400">{p.fecha_entrega || p.fecha || "Sin fecha"}</p>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{p.cliente}</p>
              <p className="truncate text-xs text-slate-500">{(p.productos || []).map((x) => `${x.nombre}${x.qty ? ` (${x.qty})` : ""}`).join(" + ") || "Sin productos"}</p>
            </div>
            <p className="text-sm text-slate-600">{p.ciudad || "Sin localidad"}</p>
            <p className="text-sm font-semibold text-slate-900 md:text-right">{money.format(p.total || 0)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}