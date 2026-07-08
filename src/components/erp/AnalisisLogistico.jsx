import React, { useMemo } from "react";
import { useOdoo } from "@/hooks/useOdoo";
import { TrendingUp, Clock, MapPin, Loader2, PackageCheck } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import { ZONE_ORDER, ZONE_STYLE } from "@/lib/zonas";

const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

const ZONE_HEX = {
  "Zona Norte": "#2563eb",
  "Zona Sur": "#dc2626",
  "Zona Oeste": "#16a34a",
  "CABA": "#9333ea",
  "Andreani/Expresos": "#ea580c",
  "Sin zona": "#94a3b8",
};

export default function AnalisisLogistico() {
  const { data, loading, error } = useOdoo("entregas_calendario");

  const stats = useMemo(() => {
    const rows = data || [];
    const total = rows.length;
    const enviadas = rows.filter((r) => r.enviada).length;
    const aTiempo = total ? Math.round((enviadas / total) * 100) : 0;

    const byZone = {};
    rows.forEach((r) => {
      const z = r.zona || "Sin zona";
      if (!byZone[z]) byZone[z] = { zona: z, pedidos: 0, monto: 0, enviadas: 0 };
      byZone[z].pedidos += 1;
      byZone[z].monto += r.total || 0;
      if (r.enviada) byZone[z].enviadas += 1;
    });

    const zonas = Object.values(byZone).sort((a, b) => {
      const ia = ZONE_ORDER.indexOf(a.zona), ib = ZONE_ORDER.indexOf(b.zona);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

    return { total, enviadas, aTiempo, pendientes: total - enviadas, zonas };
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-12 text-sm text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando análisis logístico...
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
        No se pudo cargar el análisis: {error}
      </div>
    );
  }
  if (!stats.total) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-slate-700" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Análisis logístico</h2>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* KPI Cumplimiento */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <Clock className="h-4 w-4 text-emerald-600" /> Entregas a tiempo
          </div>
          <div className="my-4 flex items-end gap-2">
            <span className={`text-4xl font-bold ${stats.aTiempo >= 80 ? "text-emerald-600" : stats.aTiempo >= 50 ? "text-amber-600" : "text-red-600"}`}>
              {stats.aTiempo}%
            </span>
            <span className="mb-1 text-xs text-slate-400">cumplimiento</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="inline-flex items-center gap-1"><PackageCheck className="h-3.5 w-3.5 text-emerald-500" /> {stats.enviadas} enviadas</span>
            <span>{stats.pendientes} pendientes de {stats.total}</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${stats.aTiempo >= 80 ? "bg-emerald-500" : stats.aTiempo >= 50 ? "bg-amber-500" : "bg-red-500"}`}
              style={{ width: `${stats.aTiempo}%` }}
            />
          </div>
        </div>

        {/* Volumen por zona */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-500">
            <MapPin className="h-4 w-4 text-slate-600" /> Volumen de pedidos por zona
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.zonas} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="zona" tick={{ fontSize: 11, fill: "#64748b" }} interval={0} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: "#f8fafc" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
                      <p className="mb-1 font-semibold text-slate-800">{d.zona}</p>
                      <p className="text-slate-600">{d.pedidos} pedido(s) · {d.enviadas} enviadas</p>
                      <p className="text-slate-500">{fmt.format(d.monto)}</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="pedidos" radius={[6, 6, 0, 0]}>
                {stats.zonas.map((z, i) => (
                  <Cell key={i} fill={ZONE_HEX[z.zona] || "#94a3b8"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}