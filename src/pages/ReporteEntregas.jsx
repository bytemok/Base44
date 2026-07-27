import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart3, Clock3, PackageCheck, Star } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";

const SAT = [
  { value: 1, label: "Muy satisfecho", color: "#16a34a" },
  { value: 2, label: "Satisfecho", color: "#65a30d" },
  { value: 3, label: "Poco satisfecho", color: "#d97706" },
  { value: 4, label: "No satisfecho", color: "#e11d48" },
];

const todayBA = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const delivered = (e) => ["entregada", "completada", "completado"].includes(String(e.estado || "").toLowerCase());
const dayLabel = (d) => new Date(`${d}T00:00:00`).toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
const diffDays = (from, to) => Math.max(0, Math.round((Date.parse(`${to}T00:00:00`) - Date.parse(from)) / 86400000));

function MetricCard({ title, value, detail, icon: Icon, tone }) {
  const styles = tone === "green" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : tone === "amber" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-white text-slate-900";
  return (
    <div className={`rounded-xl border p-4 ${styles}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium opacity-75">{title}</p>
        <Icon className="h-4 w-4 opacity-75" />
      </div>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-xs opacity-70">{detail}</p>
    </div>
  );
}

export default function ReporteEntregas() {
  const [entregas, setEntregas] = useState([]);
  const [respuestas, setRespuestas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [e, r] = await Promise.all([
        base44.entities.EntregaProgramada.list("-fecha_entrega", 500),
        base44.entities.RespuestaEncuesta.list("-fecha", 500),
      ]);
      setEntregas(Array.isArray(e) ? e : []);
      setRespuestas(Array.isArray(r) ? r : []);
      setLoading(false);
    };
    load();
  }, []);

  const stats = useMemo(() => {
    const hoy = todayBA();
    const entregadas = entregas.filter(delivered);
    const entregadasHoy = entregadas.filter((e) => e.fecha_entrega === hoy).length;
    const tiempos = entregadas.filter((e) => e.created_date && e.fecha_entrega).map((e) => diffDays(e.created_date, e.fecha_entrega));
    const promedioDias = tiempos.length ? tiempos.reduce((a, b) => a + b, 0) / tiempos.length : 0;
    const respondidas = respuestas.filter((r) => Number(r.nivel) >= 1 && Number(r.nivel) <= 4);
    const satisfechas = respondidas.filter((r) => Number(r.nivel) <= 2).length;
    const satisfaccion = respondidas.length ? Math.round((satisfechas / respondidas.length) * 100) : 0;
    return { hoy, entregadasHoy, promedioDias, respondidas: respondidas.length, satisfaccion };
  }, [entregas, respuestas]);

  const entregasPorDia = useMemo(() => {
    const keys = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(`${stats.hoy}T00:00:00`);
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().slice(0, 10);
    });
    return keys.map((fecha) => ({ fecha: dayLabel(fecha), entregas: entregas.filter((e) => delivered(e) && e.fecha_entrega === fecha).length }));
  }, [entregas, stats.hoy]);

  const satisfaccionData = useMemo(() => SAT.map((s) => ({ ...s, cantidad: respuestas.filter((r) => Number(r.nivel) === s.value).length })), [respuestas]);

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" /></div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Reporte de Entregas</h1>
        <p className="mt-1 text-sm text-slate-500">Resumen simple de entregas, tiempos y satisfacción del cliente.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Pedidos entregados hoy" value={stats.entregadasHoy} detail={dayLabel(stats.hoy)} icon={PackageCheck} tone="green" />
        <MetricCard title="Tiempo promedio" value={`${stats.promedioDias.toFixed(1)} días`} detail="desde coordinación hasta entrega" icon={Clock3} tone="amber" />
        <MetricCard title="Satisfacción clientes" value={`${stats.satisfaccion}%`} detail={`${stats.respondidas} respuestas registradas`} icon={Star} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700"><BarChart3 className="h-4 w-4" /> Entregas últimos 7 días</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={entregasPorDia}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="fecha" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="entregas" name="Entregas" fill="#f97316" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Nivel de satisfacción</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={satisfaccionData} dataKey="cantidad" nameKey="label" cx="50%" cy="50%" innerRadius={54} outerRadius={94} paddingAngle={2}>
                  {satisfaccionData.map((s) => <Cell key={s.value} fill={s.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {satisfaccionData.map((s) => <div key={s.value} className="flex items-center gap-2 text-xs"><span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} /><span className="text-slate-600">{s.label}</span><span className="ml-auto font-semibold text-slate-800">{s.cantidad}</span></div>)}
          </div>
        </div>
      </div>
    </div>
  );
}