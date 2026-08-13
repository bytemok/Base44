import React from "react";

const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

const ESTADO = {
  pendiente: { label: "Pendiente", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  listo: { label: "Listo para entregar", cls: "bg-violet-50 text-violet-700 ring-violet-200" },
  entregado: { label: "Entregado", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
};

export function estadoDe(r) {
  if (r.entregado) return "entregado";
  if (r.listo) return "listo";
  return "pendiente";
}

function EstadoPill({ estado }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${ESTADO[estado].cls}`}>{ESTADO[estado].label}</span>;
}

function LineasResumen({ productos }) {
  const items = productos || [];
  if (!items.length) return <span className="text-slate-400">—</span>;
  return (
    <div className="max-w-[420px] truncate text-xs text-slate-500">
      {items.map((p) => `${p.nombre}${p.qty ? ` (${p.qty})` : ""}${p.entregado ? " ✓" : ""}`).join(" · ")}
    </div>
  );
}

export default function VentasTable({ rows, onOpen, compactDelivered = false }) {
  if (compactDelivered) {
    return (
      <div className="max-h-[72vh] overflow-auto rounded-b-md border-x border-b border-slate-200 bg-white shadow-sm">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-10 border-b border-slate-200 px-3 py-2 text-left"><span className="block h-4 w-4 rounded border border-slate-300 bg-white" /></th>
              {["Número", "Fecha creación", "Fecha entrega", "Estado"].map((h) => (
                <th key={h} className="border-b border-slate-200 px-3 py-2 text-left font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r, i) => (
              <tr key={r.db_id || r.id || i} onClick={() => onOpen?.(r.db_id)} className="cursor-pointer bg-white hover:bg-violet-50/40">
                <td className="px-3 py-2"><span className="block h-4 w-4 rounded border border-slate-300" /></td>
                <td className="px-3 py-2 whitespace-nowrap font-semibold text-violet-700">{r.id}</td>
                <td className="px-3 py-2 whitespace-nowrap text-slate-600">{r.fecha || "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap text-slate-600">{r.fecha_entrega || "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap"><EstadoPill estado="entregado" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="max-h-[72vh] overflow-auto rounded-b-md border-x border-b border-slate-200 bg-white shadow-sm">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
          <tr>
            <th className="w-10 border-b border-slate-200 px-3 py-2 text-left"><span className="block h-4 w-4 rounded border border-slate-300 bg-white" /></th>
            {["Número", "Fecha de pedido", "Cliente", "Localidad", "Fecha entrega", "Estado entrega", "Total", "Adeudado", "Líneas"].map((h) => (
              <th key={h} className={`border-b border-slate-200 px-3 py-2 font-semibold whitespace-nowrap ${["Total", "Adeudado"].includes(h) ? "text-right" : "text-left"}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r, i) => {
            const e = estadoDe(r);
            return (
              <tr key={r.db_id || r.id || i} onClick={() => onOpen?.(r.db_id)} className="cursor-pointer bg-white hover:bg-violet-50/40">
                <td className="px-3 py-2"><span className="block h-4 w-4 rounded border border-slate-300" /></td>
                <td className="px-3 py-2 whitespace-nowrap font-semibold text-violet-700">{r.id}</td>
                <td className="px-3 py-2 whitespace-nowrap text-slate-600">{r.fecha || "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap font-medium text-slate-800 uppercase">{r.cliente || "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap text-slate-500">{r.ciudad || "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap text-slate-600">{r.fecha_entrega || "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap"><EstadoPill estado={e} /></td>
                <td className="px-3 py-2 whitespace-nowrap text-right font-semibold text-slate-900">{fmt.format(r.total || 0)}</td>
                <td className={`px-3 py-2 whitespace-nowrap text-right font-semibold ${r.adeudado > 0 ? "text-red-600" : "text-emerald-600"}`}>{fmt.format(r.adeudado || 0)}</td>
                <td className="px-3 py-2"><LineasResumen productos={r.productos} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}