import React from "react";

const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

const ESTADO = {
  pendiente: { label: "Pendiente", cls: "bg-amber-100 text-amber-700" },
  listo: { label: "Listo", cls: "bg-blue-100 text-blue-700" },
  entregado: { label: "Entregado", cls: "bg-emerald-100 text-emerald-700" },
};

export function estadoDe(r) {
  if (r.entregado) return "entregado";
  if (r.listo) return "listo";
  return "pendiente";
}

export default function VentasTable({ rows, onOpen }) {
  return (
    <div className="overflow-auto max-h-[72vh] rounded-lg border border-slate-200 bg-white">
      <table className="w-full border-collapse text-xs">
        <thead className="sticky top-0 z-10">
          <tr className="bg-slate-50">
            {["Fecha", "Orden", "Cliente", "Teléfono", "Localidad", "Productos", "Total", "Adeudado", "Estado"].map((h) => (
              <th key={h} className="border border-slate-200 px-2 py-1.5 text-left font-semibold text-slate-700 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const e = estadoDe(r);
            return (
              <tr key={i} onClick={() => onOpen?.(r.db_id)} className="cursor-pointer hover:bg-slate-50">
                <td className="border border-slate-200 px-2 py-1.5 whitespace-nowrap text-slate-600">{r.fecha}</td>
                <td className="border border-slate-200 px-2 py-1.5 whitespace-nowrap font-semibold text-slate-900">{r.id}</td>
                <td className="border border-slate-200 px-2 py-1.5 whitespace-nowrap text-slate-800 uppercase">{r.cliente}</td>
                <td className="border border-slate-200 px-2 py-1.5 whitespace-nowrap text-slate-500">{r.telefono || "—"}</td>
                <td className="border border-slate-200 px-2 py-1.5 whitespace-nowrap text-slate-500">{r.ciudad || "—"}</td>
                <td className="border border-slate-200 px-2 py-1.5 text-slate-800 min-w-[360px] max-w-[620px]">
                  <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                    {(r.productos || []).map((p, j) => (
                      <React.Fragment key={j}>
                        {j > 0 && <span className="text-slate-300">+</span>}
                        <span className={p.entregado ? "font-medium text-emerald-600" : "text-slate-700"}>
                          {p.nombre}{p.qty ? ` (${p.qty})` : ""}{p.entregado ? " ✓" : ""}
                        </span>
                      </React.Fragment>
                    ))}
                    {!(r.productos || []).length && <span className="text-slate-400">—</span>}
                  </div>
                </td>
                <td className="border border-slate-200 px-2 py-1.5 whitespace-nowrap text-right font-bold text-slate-900">{fmt.format(r.total)}</td>
                <td className={`border border-slate-200 px-2 py-1.5 whitespace-nowrap text-right font-semibold ${r.adeudado > 0 ? "text-red-600" : "text-emerald-600"}`}>{fmt.format(r.adeudado || 0)}</td>
                <td className="border border-slate-200 px-2 py-1.5 whitespace-nowrap">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${ESTADO[e].cls}`}>{ESTADO[e].label}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}