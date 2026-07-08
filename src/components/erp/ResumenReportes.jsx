import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useOdoo } from "@/hooks/useOdoo";
import { Truck, Receipt, Boxes, Loader2, ArrowRight, Clock, AlertTriangle, Wallet } from "lucide-react";

const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

function MiniKpi({ icon: Icon, label, value, color }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-1.5 text-xs text-slate-500"><Icon className={`h-3.5 w-3.5 ${color}`} /> {label}</div>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}

export default function ResumenReportes() {
  const entregas = useOdoo("entregas_calendario");
  const facturas = useOdoo("facturas");
  const inventario = useOdoo("inventario");
  const alertas = useOdoo("alertas_stock");

  const log = useMemo(() => {
    const rows = entregas.data || [];
    const total = rows.length;
    const enviadas = rows.filter((r) => r.enviada).length;
    return { total, aTiempo: total ? Math.round((enviadas / total) * 100) : 0 };
  }, [entregas.data]);

  const fin = useMemo(() => {
    const rows = facturas.data || [];
    return {
      facturado: rows.reduce((s, f) => s + (f.total || 0), 0),
      saldo: rows.reduce((s, f) => s + (f.saldo || 0), 0),
      cantidad: rows.length,
    };
  }, [facturas.data]);

  const stk = useMemo(() => {
    const tmpls = inventario.data || [];
    let valor = 0, unidades = 0;
    tmpls.forEach((t) => (t.variantes || []).forEach((v) => { valor += (v.stock || 0) * (v.precio || t.precio_base || 0); unidades += v.stock || 0; }));
    return { valor, unidades, productos: tmpls.length, faltantes: (alertas.data || []).length };
  }, [inventario.data, alertas.data]);

  const cargando = entregas.loading || facturas.loading || inventario.loading;
  if (cargando && !log.total && !fin.cantidad && !stk.productos) {
    return <div className="flex items-center gap-2 py-8 text-sm text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /> Cargando indicadores...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Reportes</h2>
        <Link to="/reportes" className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700">
          Ver reportes completos <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link to="/reportes" className="block">
          <MiniKpi icon={Clock} label="Entregas a tiempo" value={`${log.aTiempo}%`} color="text-emerald-600" />
        </Link>
        <Link to="/reportes" className="block">
          <MiniKpi icon={Receipt} label="Facturado" value={fmt.format(fin.facturado)} color="text-slate-600" />
        </Link>
        <Link to="/reportes" className="block">
          <MiniKpi icon={Wallet} label="Saldo impago" value={fmt.format(fin.saldo)} color="text-red-600" />
        </Link>
        <Link to="/reportes" className="block">
          <MiniKpi icon={Boxes} label="Valor de stock" value={fmt.format(stk.valor)} color="text-slate-600" />
        </Link>
      </div>

      {stk.faltantes > 0 && (
        <Link to="/alertas-stock" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 hover:bg-red-100">
          <AlertTriangle className="h-4 w-4" /> {stk.faltantes} producto(s) con stock negativo · revisar alertas
        </Link>
      )}
    </div>
  );
}