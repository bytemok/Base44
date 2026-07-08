import React, { useMemo } from "react";
import { useOdoo } from "@/hooks/useOdoo";
import { Loader2, Receipt, Wallet, TrendingUp, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, PieChart, Pie } from "recharts";

const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

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

const ESTADO_COLOR = { paid: "#16a34a", not_paid: "#dc2626", partial: "#ea580c", reversed: "#94a3b8" };
const ESTADO_LABEL = { paid: "Pagada", not_paid: "Impaga", partial: "Parcial", reversed: "Revertida" };

export default function ReporteVentas() {
  const { data, loading, error } = useOdoo("facturas");

  const stats = useMemo(() => {
    const rows = data || [];
    const total = rows.reduce((s, f) => s + (f.total || 0), 0);
    const saldo = rows.reduce((s, f) => s + (f.saldo || 0), 0);
    const facturadas = rows.length;
    const impagas = rows.filter((f) => f.pago === "not_paid").length;

    const byEstado = {};
    rows.forEach((f) => {
      const e = ESTADO_LABEL[f.pago] || f.pago || "Otro";
      byEstado[e] = byEstado[e] || { estado: e, cantidad: 0, monto: 0 };
      byEstado[e].cantidad += 1;
      byEstado[e].monto += f.total || 0;
    });
    const estados = Object.values(byEstado);

    const byMonth = {};
    rows.forEach((f) => {
      const m = (f.fecha || "").slice(0, 7) || "Sin fecha";
      byMonth[m] = byMonth[m] || { mes: m, monto: 0, cantidad: 0 };
      byMonth[m].monto += f.total || 0;
      byMonth[m].cantidad += 1;
    });
    const meses = Object.values(byMonth).sort((a, b) => a.mes.localeCompare(b.mes));

    const byCliente = {};
    rows.forEach((f) => {
      const c = f.cliente || "Sin cliente";
      byCliente[c] = byCliente[c] || { cliente: c, monto: 0, cantidad: 0 };
      byCliente[c].monto += f.total || 0;
      byCliente[c].cantidad += 1;
    });
    const top = Object.values(byCliente).sort((a, b) => b.monto - a.monto).slice(0, 8);

    return { total, saldo, facturadas, impagas, estados, meses, top };
  }, [data]);

  if (loading) return <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /> Cargando...</div>;
  if (error) return <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">Error: {error}</div>;
  if (!stats.facturadas) return <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">No hay facturas registradas</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={Receipt} label="Facturación total" value={fmt.format(stats.total)} sub={`${stats.facturadas} factura(s)`} color="text-slate-600" />
        <Kpi icon={Wallet} label="Saldo impago" value={fmt.format(stats.saldo)} color="text-red-600" />
        <Kpi icon={AlertCircle} label="Facturas impagas" value={stats.impagas} color="text-red-600" />
        <Kpi icon={TrendingUp} label="Ticket promedio" value={fmt.format(stats.total / stats.facturadas)} color="text-emerald-600" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Facturación por mes</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats.meses} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"><p className="font-semibold text-slate-800">{d.mes}</p><p className="text-slate-600">{fmt.format(d.monto)} · {d.cantidad} fac.</p></div>;
              }} />
              <Bar dataKey="monto" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Por estado de pago</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={stats.estados} dataKey="cantidad" nameKey="estado" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}>
                {stats.estados.map((e, i) => {
                  const key = Object.keys(ESTADO_LABEL).find((k) => ESTADO_LABEL[k] === e.estado);
                  return <Cell key={i} fill={ESTADO_COLOR[key] || "#94a3b8"} />;
                })}
              </Pie>
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"><p className="font-semibold text-slate-800">{d.estado}</p><p className="text-slate-600">{d.cantidad} · {fmt.format(d.monto)}</p></div>;
              }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
            {stats.estados.map((e, i) => {
              const key = Object.keys(ESTADO_LABEL).find((k) => ESTADO_LABEL[k] === e.estado);
              return <span key={i} className="flex items-center gap-1 text-slate-600"><span className="h-2.5 w-2.5 rounded-full" style={{ background: ESTADO_COLOR[key] || "#94a3b8" }} /> {e.estado}</span>;
            })}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Top clientes por facturación</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr><th className="px-3 py-2">Cliente</th><th className="px-3 py-2 text-right">Facturas</th><th className="px-3 py-2 text-right">Monto</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.top.map((c, i) => (
                <tr key={i}><td className="px-3 py-2 text-slate-800">{c.cliente}</td><td className="px-3 py-2 text-right text-slate-600">{c.cantidad}</td><td className="px-3 py-2 text-right font-medium text-slate-900">{fmt.format(c.monto)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}