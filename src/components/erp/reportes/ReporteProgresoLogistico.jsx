import React, { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ProgresoLogisticoChart from "@/components/erp/reportes/ProgresoLogisticoChart";
import ProgresoMensualTable from "@/components/erp/reportes/ProgresoMensualTable";
import ProgresoMetricCards from "@/components/erp/reportes/ProgresoMetricCards";
import { calcularIndicadores, crearResumenMensual } from "@/components/erp/reportes/progresoLogisticoUtils";

export default function ReporteProgresoLogistico() {
  const [entregas, setEntregas] = useState([]);
  const [respuestas, setRespuestas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([
      base44.entities.EntregaProgramada.list("-fecha_entrega", 1000),
      base44.entities.RespuestaEncuesta.list("-fecha", 1000),
    ]).then(([e, r]) => {
      if (!alive) return;
      setEntregas(Array.isArray(e) ? e : []);
      setRespuestas(Array.isArray(r) ? r : []);
    }).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const rows = useMemo(() => crearResumenMensual(entregas, respuestas).slice(-12), [entregas, respuestas]);
  const indicadores = useMemo(() => calcularIndicadores(rows), [rows]);

  if (loading) return <div className="flex items-center gap-2 p-6 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Cargando progreso logístico...</div>;
  if (!rows.length) return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Todavía no hay entregas o encuestas suficientes para armar el reporte mensual.</div>;

  return (
    <div className="space-y-4 pt-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Progreso logístico mensual</h2>
        <p className="mt-1 text-sm text-slate-500">Entregas totales y satisfacción de clientes agrupadas mes a mes.</p>
      </div>
      <ProgresoMetricCards indicadores={indicadores} />
      <ProgresoLogisticoChart rows={rows} />
      <ProgresoMensualTable rows={rows} />
    </div>
  );
}