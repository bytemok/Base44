import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";

const ESTADOS = [
  { key: "Nuevo", label: "Nuevo", color: "#f59e0b" },
  { key: "En proceso", label: "Procesando", color: "#3b82f6" },
  { key: "Enviado", label: "Enviado", color: "#a855f7" },
  { key: "Entregado", label: "Entregado", color: "#10b981" },
];

export default function DistribucionEstados() {
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;
    base44.entities.Pedido.list()
      .then((rows) => { if (alive) setData(rows || []); })
      .catch(() => { if (alive) setData([]); });
    return () => { alive = false; };
  }, []);

  if (!data) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-8 text-sm text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando estados...
      </div>
    );
  }

  const counts = ESTADOS.map((e) => ({ ...e, value: data.filter((r) => r.status === e.key).length }));
  const total = counts.reduce((s, c) => s + c.value, 0);
  const vis = counts.filter((c) => c.value > 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pedidos por estado</h2>
      {total === 0 ? (
        <p className="mt-6 text-sm text-slate-400">Sin pedidos registrados</p>
      ) : (
        <div className="mt-2 flex flex-col items-center gap-6 sm:flex-row">
          <div className="relative h-48 w-48 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={vis} dataKey="value" nameKey="label" innerRadius={50} outerRadius={75} paddingAngle={2} stroke="none">
                  {vis.map((c, i) => <Cell key={i} fill={c.color} />)}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => active && payload?.length ? (
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
                      <span className="font-medium text-slate-800">{payload[0].name}</span>: <span className="font-semibold text-slate-900">{payload[0].value}</span>
                    </div>
                  ) : null}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-slate-900">{total}</span>
              <span className="text-[10px] uppercase tracking-wide text-slate-400">pedidos</span>
            </div>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-1">
            {counts.map((c) => (
              <div key={c.key} className="flex items-center gap-2 text-sm">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="text-slate-600">{c.label}</span>
                <span className="ml-auto font-semibold text-slate-900">{c.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}