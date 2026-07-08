import React from "react";
import { Phone, MapPin } from "lucide-react";
import { estadoDe } from "@/components/erp/ventas/VentasTable";

const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

const ESTADO = {
  pendiente: { label: "Pendiente", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  listo: { label: "Listo", cls: "bg-blue-50 text-blue-700 ring-blue-200" },
  entregado: { label: "Entregado", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
};

export default function VentasCard({ r, onOpen }) {
  const e = estadoDe(r);
  return (
    <div onClick={() => onOpen?.(r.db_id)} className="cursor-pointer rounded-xl border border-slate-200 bg-white p-3 active:bg-slate-50">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">{r.id}</span>
            <span className="text-xs text-slate-400">{r.fecha}</span>
          </div>
          <p className="truncate text-sm font-medium text-slate-800 uppercase">{r.cliente}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${ESTADO[e].cls}`}>{ESTADO[e].label}</span>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        {r.telefono && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{r.telefono}</span>}
        {r.ciudad && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{r.ciudad}</span>}
      </div>

      <div className="mt-2 rounded-lg bg-slate-50 p-2 text-xs leading-relaxed text-slate-700">
        {(r.productos || []).length ? (r.productos || []).map((p, j) => (
          <div key={j} className={p.entregado ? "text-emerald-600" : "text-slate-800"}>
            • {p.nombre}{p.qty ? ` (${p.qty})` : ""}{p.entregado ? " ✓" : ""}
          </div>
        )) : <span className="text-slate-400">Sin productos</span>}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-slate-400">{(r.productos || []).length} producto(s)</span>
        <span className="text-sm font-bold text-slate-900">{fmt.format(r.total)}</span>
      </div>
    </div>
  );
}