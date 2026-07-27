import React from "react";
import { PackageCheck, Star, TrendingUp } from "lucide-react";

function Card({ title, value, detail, icon: Icon, tone }) {
  const tones = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
  };
  return (
    <div className={`rounded-2xl border p-4 ${tones[tone] || "border-slate-200 bg-white text-slate-900"}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium opacity-75">{title}</p>
        <Icon className="h-4 w-4 opacity-75" />
      </div>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-xs opacity-70">{detail}</p>
    </div>
  );
}

export default function ProgresoMetricCards({ indicadores }) {
  const { actual, anterior, variacionEntregas } = indicadores;
  const tendencia = variacionEntregas > 0 ? `+${variacionEntregas}` : String(variacionEntregas);
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card title="Entregas del mes" value={actual.entregas} detail={actual.mes || "Mes actual"} icon={PackageCheck} tone="green" />
      <Card title="Satisfacción mensual" value={`${actual.satisfaccion || 0}%`} detail={`${actual.respuestas || 0} respuestas registradas`} icon={Star} tone="amber" />
      <Card title="Variación vs mes anterior" value={anterior ? tendencia : "—"} detail={anterior ? `comparado con ${anterior.mes}` : "sin mes anterior"} icon={TrendingUp} tone="blue" />
    </div>
  );
}