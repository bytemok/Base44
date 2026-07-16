import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Truck, ClipboardList, Inbox, AlertTriangle, Wallet, PackageCheck } from "lucide-react";
import { useOdoo } from "@/hooks/useOdoo";

const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

function Kpi({ icon: Icon, label, value, hint, to, tone = "amber" }) {
  const tones = {
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    dark: "bg-slate-900 text-white ring-slate-900",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
    red: "bg-red-50 text-red-700 ring-red-200",
  };
  const body = (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{hint}</p>
        </div>
        <div className={`rounded-xl p-2.5 ring-1 ${tones[tone]}`}><Icon className="h-5 w-5" /></div>
      </div>
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

function MiniList({ title, rows, empty, render, to }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h3>
        {to && <Link to={to} className="text-xs font-semibold text-blue-600">Ver todo</Link>}
      </div>
      <div className="space-y-2">
        {rows.length ? rows.slice(0, 5).map(render) : <p className="py-4 text-sm text-slate-400">{empty}</p>}
      </div>
    </div>
  );
}

export default function DashboardOps() {
  const ventas = useOdoo("ventas", undefined, { fresh: true });
  const recepciones = useOdoo("recepciones");
  const entregas = useOdoo("entregas_calendario");
  const alertas = useOdoo("alertas_stock");

  const stats = useMemo(() => {
    const ready = ventas.data.filter((r) => r.sin_entregar && r.listo);
    const coordinar = ventas.data.filter((r) => r.sin_entregar && !r.listo);
    const deuda = ventas.data.reduce((s, r) => s + (Number(r.adeudado) || 0), 0);
    const hoy = new Date().toISOString().slice(0, 10);
    const saleHoy = entregas.data.filter((r) => r.fecha_entrega === hoy && r.estado !== "Entregada");
    return { ready, coordinar, deuda, saleHoy };
  }, [ventas.data, entregas.data]);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Centro operativo</h2>
        <p className="text-sm text-slate-500">Resumen de salidas, coordinación, recepciones y alertas críticas.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi icon={Truck} label="Sale hoy" value={stats.saleHoy.length} hint="Entregas programadas" to="/calendario" tone="dark" />
        <Kpi icon={PackageCheck} label="Listo para salir" value={stats.ready.length} hint="Preparado en depósito" to="/ventas" tone="green" />
        <Kpi icon={ClipboardList} label="Para coordinar" value={stats.coordinar.length} hint="Pendiente de preparar" to="/coordinar" tone="amber" />
        <Kpi icon={Inbox} label="Falta que llegue" value={recepciones.data.length} hint="Recepciones abiertas" to="/recepciones" tone="blue" />
        <Kpi icon={AlertTriangle} label="Stock crítico" value={alertas.data.length} hint="Productos faltantes" to="/alertas-stock" tone="red" />
        <Kpi icon={Wallet} label="Adeudado" value={money.format(stats.deuda)} hint="Saldo en ventas" to="/facturas" tone="amber" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <MiniList title="Próximas salidas" to="/ventas" empty="Sin pedidos listos." rows={stats.ready} render={(r) => <div key={r.id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm"><b className="text-slate-900">{r.id}</b><span className="ml-2 text-slate-600">{r.cliente}</span><p className="text-xs text-slate-400">{r.ciudad || "Sin localidad"} · {money.format(r.total || 0)}</p></div>} />
        <MiniList title="Pendiente de coordinar" to="/coordinar" empty="No hay pedidos pendientes." rows={stats.coordinar} render={(r) => <div key={r.id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm"><b className="text-slate-900">{r.id}</b><span className="ml-2 text-slate-600">{r.cliente}</span><p className="text-xs text-slate-400">{(r.productos || []).length} productos · {r.zona || "Sin zona"}</p></div>} />
        <MiniList title="Recepciones pendientes" to="/recepciones" empty="Sin recepciones abiertas." rows={recepciones.data} render={(r) => <div key={r.picking_id || r.referencia} className="rounded-xl bg-slate-50 px-3 py-2 text-sm"><b className="text-slate-900">{r.referencia}</b><span className="ml-2 text-slate-600">{r.proveedor || r.origen}</span><p className="text-xs text-slate-400">{r.fecha || "Sin fecha"} · {(r.productos || []).length} ítems</p></div>} />
      </div>
    </section>
  );
}