import React, { useMemo } from "react";
import { useOdoo } from "@/hooks/useOdoo";
import { Loader2, Clock, MapPin, PackageCheck, TrendingUp, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, LineChart, Line } from "recharts";
import { ZONE_ORDER } from "@/lib/zonas";
import { downloadCSV } from "@/lib/csvExport";

const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

const ZONE_HEX = {
  "Zona Norte": "#2563eb", "Zona Sur": "#dc2626", "Zona Oeste": "#16a34a",
  "CABA": "#9333ea", "Andreani/Expresos": "#ea580c", "Sin zona": "#94a3b8",
};

function Kpi({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <Icon className={`h-4 w-4 ${color}`} /> {label}
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

export default function ReporteLogistica() {
  const { data, loading, error } = useOdoo("entregas_calendario");

  const stats = useMemo(() => {
    const rows = data || [];
    const total = rows.length;
    const enviadas = rows.filter((r) => r.enviada).length;
    const aTiempo = total ? Math.round((enviadas / total) * 100) : 0;

    const byZone = {};
    const byDay = {};
    rows.forEach((r) => {
      const z = r.zona || "Sin zona";
      byZone[z] = byZone[z] || { zona: z, pedidos: 0, monto: 0, enviadas: 0 };
      byZone[z].pedidos += 1;
      byZone[z].monto += r.total || 0;
      if (r.enviada) byZone[z].enviadas += 1;

      const day = r.fecha_entrega || "Sin fecha";
      byDay[day] = byDay[day] || { fecha: day, total: 0, monto: 0 };
      byDay[day].total += 1;
      byDay[day].monto += r.total || 0;
    });

    const zonas = Object.values(byZone).sort((a, b) => {
      const ia = ZONE_ORDER.indexOf(a.zona), ib = ZONE_ORDER.indexOf(b.zona);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
    const dias = Object.values(byDay).sort((a, b) => (a.fecha === "Sin fecha" ? 1 : b.fecha === "Sin fecha" ? -1 : a.fecha.localeCompare(b.fecha)));

    return { total, enviadas, aTiempo, pendientes: total - enviadas, zonas, dias };
  }, [data]);

  if (loading) return <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /> Cargando...</div>;
  if (error) return <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">Error: {error}</div>;
  if (!stats.total) return <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">No hay entregas registradas</div>;

  const exportCSV = () => {
    downloadCSV(
      "reporte_logistica.csv",
      ["Zona", "Pedidos", "Enviadas", "Pendientes", "Monto"],
      stats.zonas.map((z) => [z.zona, z.pedidos, z.enviadas, z.pedidos - z.enviadas, z.monto])
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <button onClick={exportCSV} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
          <Download className="h-4 w-4" /> Descargar CSV
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={Clock} label="Cumplimiento" value={`${stats.aTiempo}%`} sub={`${stats.enviadas} de ${stats.total}`} color="text-emerald-600" />
        <Kpi icon={PackageCheck} label="Enviadas" value={stats.enviadas} color="text-emerald-600" />
        <Kpi icon={TrendingUp} label="Pendientes" value={stats.pendientes} color="text-amber-600" />
        <Kpi icon={MapPin} label="Zonas activas" value={stats.zonas.length} color="text-slate-600" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Volumen por zona</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats.zonas} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="zona" tick={{ fontSize: 11, fill: "#64748b" }} interval={0} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
              <Tooltip cursor={{ fill: "#f8fafc" }} content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"><p className="mb-1 font-semibold text-slate-800">{d.zona}</p><p className="text-slate-600">{d.pedidos} pedido(s) · {d.enviadas} enviadas</p><p className="text-slate-500">{fmt.format(d.monto)}</p></div>;
              }} />
              <Bar dataKey="pedidos" radius={[6, 6, 0, 0]}>{stats.zonas.map((z, i) => <Cell key={i} fill={ZONE_HEX[z.zona] || "#94a3b8"} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Entregas por día</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={stats.dias} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"><p className="font-semibold text-slate-800">{d.fecha}</p><p className="text-slate-600">{d.total} entrega(s)</p><p className="text-slate-500">{fmt.format(d.monto)}</p></div>;
              }} />
              <Line type="monotone" dataKey="total" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}