import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, ClipboardList, ArrowRight, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useOdoo } from "@/hooks/useOdoo";

const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export default function DashboardCoordinationPanel() {
  const { data, loading, error } = useOdoo("ventas", undefined, { fresh: true });
  const [coordinadas, setCoordinadas] = useState([]);

  useEffect(() => {
    base44.entities.EntregaProgramada.list().then((r) => setCoordinadas(Array.isArray(r) ? r : []));
  }, []);

  const pendientes = useMemo(() => {
    const ya = new Set(coordinadas.map((c) => c.order_ref));
    return data
      .filter((r) => r.listo && r.sin_entregar && !ya.has(r.id))
      .sort((a, b) => (a.fecha_entrega || a.fecha || "9999-12-31").localeCompare(b.fecha_entrega || b.fecha || "9999-12-31"))
      .slice(0, 8);
  }, [data, coordinadas]);

  return (
    <section className="overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-amber-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 ring-1 ring-amber-200">
            <CalendarClock className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Esperando coordinación</h2>
            <p className="text-sm text-slate-500">Pedidos listos para asignar fecha de entrega, ordenados por fecha.</p>
          </div>
        </div>
        <Link to="/coordinar" className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">
          Coordinar todos <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /> Cargando pedidos...</div>
      ) : error ? (
        <div className="px-5 py-6 text-sm text-red-600">Error al consultar Odoo: {error}</div>
      ) : pendientes.length === 0 ? (
        <div className="flex items-center gap-3 px-5 py-8 text-sm text-slate-500"><ClipboardList className="h-5 w-5 text-slate-400" /> No hay pedidos esperando coordinación.</div>
      ) : (
        <div className="divide-y divide-amber-100">
          {pendientes.map((r) => (
            <Link key={r.id} to="/coordinar" className="grid gap-3 px-5 py-3 transition hover:bg-amber-50/70 md:grid-cols-[130px_1fr_120px_120px] md:items-center">
              <div>
                <p className="font-mono text-xs font-semibold text-slate-500">{r.id}</p>
                <p className="mt-0.5 text-xs text-amber-700">{r.fecha_entrega || r.fecha || "Sin fecha"}</p>
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{r.cliente}</p>
                <p className="truncate text-xs text-slate-500">{(r.productos || []).map((p) => `${p.nombre}${p.qty ? ` (${p.qty})` : ""}`).join(" + ") || "Sin productos"}</p>
              </div>
              <p className="text-sm text-slate-600">{r.zona || r.ciudad || "Sin zona"}</p>
              <p className="text-sm font-semibold text-slate-900 md:text-right">{money.format(r.total || 0)}</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}