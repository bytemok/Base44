import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, MapPinned, PackageCheck, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useOdoo } from "@/hooks/useOdoo";
import ZonaPedidosCard from "@/components/erp/reportes/ZonaPedidosCard";

const uniqueRows = (rows) => {
  const seen = new Set();
  return (rows || []).filter((r) => {
    const key = r.db_id || r.id;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

function Kpi({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{hint}</p>
        </div>
        <span className="rounded-xl bg-amber-50 p-2.5 text-amber-700 ring-1 ring-amber-200"><Icon className="h-5 w-5" /></span>
      </div>
    </div>
  );
}

export default function ReporteZonas() {
  const { data, loading, error, reload } = useOdoo("ventas", undefined, { fresh: true });
  const [coordinadas, setCoordinadas] = useState([]);

  useEffect(() => {
    base44.entities.EntregaProgramada.list().then((r) => setCoordinadas(Array.isArray(r) ? r : []));
  }, []);

  const report = useMemo(() => {
    const rows = uniqueRows(data);
    const coordRefs = new Set(coordinadas.map((c) => c.order_ref));
    const pendientes = rows
      .filter((r) => r.sin_entregar && r.listo && !coordRefs.has(r.id))
      .sort((a, b) => (a.fecha_entrega || a.fecha || "9999-12-31").localeCompare(b.fecha_entrega || b.fecha || "9999-12-31"));
    const zonas = pendientes.reduce((acc, r) => {
      const zona = r.zona || r.ciudad || "Sin zona";
      if (!acc[zona]) acc[zona] = [];
      acc[zona].push(r);
      return acc;
    }, {});
    const hoy = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Buenos_Aires" });
    const salenHoy = coordinadas.filter((r) => r.fecha_entrega === hoy && r.estado !== "Entregada");
    return { pendientes, zonas, salenHoy, hoy };
  }, [data, coordinadas]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Reporte por zonas</h1>
          <p className="mt-1 text-sm text-slate-500">Pedidos listos pendientes de coordinación, agrupados sin duplicados.</p>
        </div>
        <button onClick={reload} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Actualizar
        </button>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Error al consultar Odoo: {error}</div>}

      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi icon={PackageCheck} label="Listos pendientes" value={report.pendientes.length} hint="Sin coordinados ni duplicados" />
        <Kpi icon={MapPinned} label="Zonas activas" value={Object.keys(report.zonas).length} hint="Con pedidos por salir" />
        <Kpi icon={CalendarDays} label="Salen hoy" value={report.salenHoy.length} hint={report.hoy} />
      </div>

      {loading && !report.pendientes.length ? (
        <div className="flex h-56 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-400">Cargando reporte...</div>
      ) : !report.pendientes.length ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-sm text-slate-400">No hay pedidos listos pendientes de coordinación.</div>
      ) : (
        <div className="space-y-4">
          {Object.entries(report.zonas).sort((a, b) => a[0].localeCompare(b[0])).map(([zona, pedidos]) => (
            <ZonaPedidosCard key={zona} zona={zona} pedidos={pedidos} />
          ))}
        </div>
      )}
    </div>
  );
}