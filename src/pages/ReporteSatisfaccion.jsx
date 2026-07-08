import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Star, Loader2, Plus, TrendingUp, Smile, Frown, Meh } from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const NIVELES = [
  { value: 1, label: "Muy satisfecho", color: "#16a34a" },
  { value: 2, label: "Satisfecho", color: "#65a30d" },
  { value: 3, label: "Poco satisfecho", color: "#d97706" },
  { value: 4, label: "No satisfecho", color: "#e11d48" },
];
const nivelMeta = (n) => NIVELES.find((x) => x.value === Number(n)) || NIVELES[3];

const hoy = () => new Date().toISOString().slice(0, 10);
const fmtFecha = (s) => s ? new Date(s + "T00:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "short" }) : "";

export default function ReporteSatisfaccion() {
  const [respuestas, setRespuestas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ order_ref: "", cliente: "", telefono: "", nivel: "1", fecha: hoy(), comentario: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const recs = await base44.entities.RespuestaEncuesta.list("-fecha", 500);
      setRespuestas(Array.isArray(recs) ? recs : []);
    } catch (e) {} finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const total = respuestas.length;
    const counts = [0, 0, 0, 0];
    respuestas.forEach((r) => { const n = Number(r.nivel); if (n >= 1 && n <= 4) counts[n - 1]++; });
    const satisfechos = counts[0] + counts[1];
    const pct = total ? Math.round((satisfechos / total) * 100) : 0;
    const promedio = total ? (respuestas.reduce((s, r) => s + Number(r.nivel), 0) / total) : 0;
    return { total, counts, satisfechos, pct, promedio };
  }, [respuestas]);

  const pieData = useMemo(() => NIVELES.map((n, i) => ({ name: n.label, value: stats.counts[i], color: n.color })), [stats]);

  const trend = useMemo(() => {
    const byMonth = {};
    respuestas.forEach((r) => {
      const key = (r.fecha || "").slice(0, 7) || "Sin fecha";
      (byMonth[key] = byMonth[key] || { total: 0, ok: 0 });
      byMonth[key].total++;
      if (Number(r.nivel) <= 2) byMonth[key].ok++;
    });
    return Object.keys(byMonth).sort().map((k) => ({
      mes: k,
      respuestas: byMonth[k].total,
      satisfechos: byMonth[k].ok,
      pct: byMonth[k].total ? Math.round((byMonth[k].ok / byMonth[k].total) * 100) : 0,
    }));
  }, [respuestas]);

  const recientes = useMemo(() => respuestas.slice(0, 12), [respuestas]);

  const guardar = async (e) => {
    e.preventDefault();
    if (!form.nivel || !form.fecha) return;
    setSaving(true);
    try {
      await base44.entities.RespuestaEncuesta.create({
        order_ref: form.order_ref,
        cliente: form.cliente,
        telefono: form.telefono,
        nivel: Number(form.nivel),
        fecha: form.fecha,
        comentario: form.comentario,
      });
      setForm({ order_ref: "", cliente: "", telefono: "", nivel: "1", fecha: hoy(), comentario: "" });
      setShowForm(false);
      load();
    } catch (e) {} finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Reporte de Satisfacción</h1>
          <p className="mt-1 text-sm text-slate-500">Respuestas de los clientes tras las encuestas de WhatsApp · {stats.total} respuestas</p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-800">
          <Plus className="h-4 w-4" /> Registrar respuesta
        </button>
      </div>

      {showForm && (
        <form onSubmit={guardar} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Orden</label>
            <input value={form.order_ref} onChange={(e) => setForm({ ...form, order_ref: e.target.value })} placeholder="S07400" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Cliente</label>
            <input value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Teléfono</label>
            <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Nivel de satisfacción</label>
            <select value={form.nivel} onChange={(e) => setForm({ ...form, nivel: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400">
              {NIVELES.map((n) => <option key={n.value} value={n.value}>{n.value}. {n.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Fecha</label>
            <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-500">Comentario</label>
            <textarea value={form.comentario} onChange={(e) => setForm({ ...form, comentario: e.target.value })} rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Guardar respuesta
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
        </div>
      ) : stats.total === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 py-16 text-slate-400">
          <Star className="h-8 w-8" />
          <p className="text-sm">Aún no hay respuestas registradas</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-400">Total respuestas</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.total}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs text-emerald-600">Satisfacción</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-700">{stats.pct}%</p>
              <p className="text-xs text-emerald-600">{stats.satisfechos} satisfechos</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-400">Promedio (1-4)</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.promedio.toFixed(2)}</p>
              <p className="text-xs text-slate-400">menor = mejor</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-400">No satisfechos</p>
              <p className="mt-1 text-2xl font-semibold text-rose-700">{stats.counts[3]}</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-700">Distribución por nivel</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
                      {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {NIVELES.map((n, i) => (
                  <div key={n.value} className="flex items-center gap-2 text-xs">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: n.color }} />
                    <span className="text-slate-600">{n.label}</span>
                    <span className="ml-auto font-semibold text-slate-800">{stats.counts[i]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700"><TrendingUp className="h-4 w-4" /> Evolución mensual</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <Tooltip />
                    <Bar dataKey="respuestas" name="Respuestas" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="satisfechos" name="Satisfechos" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-700">Respuestas recientes</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {recientes.map((r) => {
                const m = nivelMeta(r.nivel);
                const Icon = Number(r.nivel) <= 1 ? Smile : Number(r.nivel) <= 2 ? Meh : Frown;
                return (
                  <div key={r.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: m.color + "20", color: m.color }}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-slate-900">{r.cliente || "Cliente"}</span>
                        {r.order_ref && <span className="font-mono text-xs text-slate-400">{r.order_ref}</span>}
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: m.color + "20", color: m.color }}>{m.label}</span>
                      </div>
                      {r.comentario && <p className="mt-0.5 text-sm text-slate-600">{r.comentario}</p>}
                    </div>
                    <span className="shrink-0 text-xs text-slate-400">{fmtFecha(r.fecha)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}