import React, { useMemo } from "react";
import { useOdoo } from "@/hooks/useOdoo";
import { Loader2, Receipt, Package, Truck, TrendingUp, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from "recharts";
import { downloadCSV } from "@/lib/csvExport";

const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const today = new Date().toISOString().slice(0, 10);

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

export default function ReporteMensualClave() {
  const ventas = useOdoo("ventas", undefined, { fresh: true });
  const entregas = useOdoo("entregas_calendario", undefined, { fresh: true });

  const stats = useMemo(() => {
    const sales = ventas.data || [];
    const deliveryRows = entregas.data || [];
    const byMonth = {};
    const byProduct = {};

    sales.forEach((v) => {
      const mes = (v.fecha || "Sin fecha").slice(0, 7) || "Sin fecha";
      byMonth[mes] = byMonth[mes] || { mes, ventas: 0, pedidos: 0, unidades: 0 };
      byMonth[mes].ventas += v.total || 0;
      byMonth[mes].pedidos += 1;
      (v.productos || []).forEach((p) => {
        const qty = Number(p.qty || 0);
        byMonth[mes].unidades += qty;
        const nombre = p.nombre || "Sin producto";
        byProduct[nombre] = byProduct[nombre] || { producto: nombre, unidades: 0, pedidos: 0 };
        byProduct[nombre].unidades += qty;
        byProduct[nombre].pedidos += 1;
      });
    });

    const byDeliveryMonth = {};
    deliveryRows.forEach((e) => {
      const mes = (e.fecha_entrega || "Sin fecha").slice(0, 7) || "Sin fecha";
      byDeliveryMonth[mes] = byDeliveryMonth[mes] || { mes, programadas: 0, enviadas: 0, retrasadas: 0, eficiencia: 0 };
      byDeliveryMonth[mes].programadas += 1;
      if (e.enviada) byDeliveryMonth[mes].enviadas += 1;
      if (!e.enviada && e.fecha_entrega && e.fecha_entrega < today) byDeliveryMonth[mes].retrasadas += 1;
    });

    const meses = Object.values(byMonth).sort((a, b) => a.mes.localeCompare(b.mes));
    const eficiencia = Object.values(byDeliveryMonth).map((m) => ({
      ...m,
      eficiencia: m.programadas ? Math.round((m.enviadas / m.programadas) * 100) : 0,
    })).sort((a, b) => a.mes.localeCompare(b.mes));
    const productosTodos = Object.values(byProduct).sort((a, b) => b.unidades - a.unidades);
    const productos = productosTodos.slice(0, 10);
    const totalVentas = sales.reduce((s, v) => s + (v.total || 0), 0);
    const totalPedidos = sales.length;
    const totalUnidades = productosTodos.reduce((s, p) => s + p.unidades, 0);
    const totalEntregas = deliveryRows.length;
    const entregadas = deliveryRows.filter((e) => e.enviada).length;

    return { meses, eficiencia, productos, totalVentas, totalPedidos, totalUnidades, totalEntregas, entregadas };
  }, [ventas.data, entregas.data]);

  const loading = ventas.loading || entregas.loading;
  const error = ventas.error || entregas.error;

  if (loading) return <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /> Cargando métricas mensuales...</div>;
  if (error) return <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">Error: {error}</div>;

  const exportCSV = () => {
    downloadCSV(
      "reporte_mensual_clave.csv",
      ["Mes", "Ventas", "Pedidos", "Unidades", "Entregas programadas", "Entregadas", "Retrasadas", "Eficiencia %"],
      stats.meses.map((m) => {
        const e = stats.eficiencia.find((x) => x.mes === m.mes) || {};
        return [m.mes, m.ventas, m.pedidos, m.unidades, e.programadas || 0, e.enviadas || 0, e.retrasadas || 0, e.eficiencia || 0];
      })
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
        <Kpi icon={Receipt} label="Volumen vendido" value={fmt.format(stats.totalVentas)} sub={`${stats.totalPedidos} pedido(s)`} color="text-emerald-600" />
        <Kpi icon={Package} label="Unidades vendidas" value={stats.totalUnidades} sub="top productos" color="text-blue-600" />
        <Kpi icon={Truck} label="Eficiencia entrega" value={`${stats.totalEntregas ? Math.round((stats.entregadas / stats.totalEntregas) * 100) : 0}%`} sub={`${stats.entregadas} de ${stats.totalEntregas}`} color="text-amber-600" />
        <Kpi icon={TrendingUp} label="Ticket promedio" value={fmt.format(stats.totalPedidos ? stats.totalVentas / stats.totalPedidos : 0)} color="text-slate-600" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Volumen de ventas por mes</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.meses} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={({ active, payload }) => active && payload?.length ? <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"><p className="font-semibold text-slate-800">{payload[0].payload.mes}</p><p className="text-slate-600">{fmt.format(payload[0].payload.ventas)} · {payload[0].payload.pedidos} pedidos</p></div> : null} />
              <Bar dataKey="ventas" fill="#f97316" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Eficiencia de entregas por mes</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={stats.eficiencia} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={({ active, payload }) => active && payload?.length ? <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"><p className="font-semibold text-slate-800">{payload[0].payload.mes}</p><p className="text-slate-600">{payload[0].payload.eficiencia}% · {payload[0].payload.enviadas}/{payload[0].payload.programadas}</p><p className="text-red-600">{payload[0].payload.retrasadas} retrasadas</p></div> : null} />
              <Line type="monotone" dataKey="eficiencia" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Productos más vendidos</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr><th className="px-3 py-2">Producto</th><th className="px-3 py-2 text-right">Unidades</th><th className="px-3 py-2 text-right">Pedidos</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.productos.map((p, i) => <tr key={i}><td className="px-3 py-2 text-slate-800">{p.producto}</td><td className="px-3 py-2 text-right font-medium text-slate-900">{p.unidades}</td><td className="px-3 py-2 text-right text-slate-600">{p.pedidos}</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}