import React from "react";

export default function ProgresoMensualTable({ rows }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="grid grid-cols-[1fr_120px_120px_140px] gap-3 border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span>Mes</span><span className="text-right">Entregas</span><span className="text-right">Encuestas</span><span className="text-right">Satisfacción</span>
      </div>
      {rows.map((row) => (
        <div key={row.clave} className="grid grid-cols-[1fr_120px_120px_140px] gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-0">
          <span className="font-medium text-slate-900">{row.mes}</span>
          <span className="text-right text-slate-700">{row.entregas}</span>
          <span className="text-right text-slate-700">{row.respuestas}</span>
          <span className="text-right font-semibold text-slate-900">{row.satisfaccion}%</span>
        </div>
      ))}
    </div>
  );
}