import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { DollarSign, HandCoins, ShoppingCart } from "lucide-react";

const fmtMoney = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const fmtDate = (date) => {
  const [y, m, d] = String(date || "").split("-");
  return y && m && d ? `${d}/${m}/${y}` : date || "Sin fecha";
};

function Metric({ icon: Icon, label, value }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2 text-sm text-slate-500"><Icon className="h-4 w-4 text-brand" />{label}</div><p className="mt-2 text-2xl font-bold text-slate-900">{value}</p></div>;
}

export default function ReporteVentasSenas() {
  const [ventas, setVentas] = useState([]);
  const [senas, setSenas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [v, s] = await Promise.all([
        base44.entities.VendedorVenta.list("-fecha", 500),
        base44.entities.VendedorSena.list("-fecha", 500),
      ]);
      setVentas(v || []);
      setSenas(s || []);
      setLoading(false);
    };
    load();
  }, []);

  const rows = useMemo(() => {
    const byDay = {};
    ventas.forEach((v) => {
      const day = v.fecha || "Sin fecha";
      byDay[day] ||= { fecha: day, ventas: 0, cantidad: 0, senas: 0 };
      byDay[day].ventas += Number(v.total) || 0;
      byDay[day].cantidad += 1;
      byDay[day].senas += Number(v.sena_monto) || 0;
    });
    senas.forEach((s) => {
      const day = s.fecha || "Sin fecha";
      byDay[day] ||= { fecha: day, ventas: 0, cantidad: 0, senas: 0 };
      byDay[day].senas += Number(s.monto) || 0;
    });
    return Object.values(byDay).sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))).slice(0, 14);
  }, [ventas, senas]);

  const totalVentas = rows.reduce((sum, r) => sum + r.ventas, 0);
  const totalSenas = rows.reduce((sum, r) => sum + r.senas, 0);
  const totalPedidos = rows.reduce((sum, r) => sum + r.cantidad, 0);

  if (loading) return <div className="flex h-48 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" /></div>;

  return <div className="space-y-4"><div className="grid gap-3 md:grid-cols-3"><Metric icon={DollarSign} label="Ventas últimos días" value={fmtMoney.format(totalVentas)} /><Metric icon={HandCoins} label="Señas registradas" value={fmtMoney.format(totalSenas)} /><Metric icon={ShoppingCart} label="Ventas cargadas" value={totalPedidos} /></div><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="grid grid-cols-[1fr_90px_120px_120px] gap-3 border-b border-slate-100 px-4 py-3 text-xs font-semibold uppercase text-slate-400"><span>Día</span><span>Ventas</span><span>Total vendido</span><span>Señas</span></div>{rows.length ? rows.map((r) => <div key={r.fecha} className="grid grid-cols-[1fr_90px_120px_120px] gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-0"><span className="font-medium text-slate-900">{fmtDate(r.fecha)}</span><span className="text-slate-600">{r.cantidad}</span><span className="font-semibold text-slate-900">{fmtMoney.format(r.ventas)}</span><span className="font-semibold text-emerald-700">{fmtMoney.format(r.senas)}</span></div>) : <p className="p-6 text-center text-sm text-slate-400">Todavía no hay ventas ni señas registradas.</p>}</div></div>;
}