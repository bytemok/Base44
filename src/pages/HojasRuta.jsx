import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Truck, CalendarDays, Eye, Loader2, Inbox, MapPin, User } from "lucide-react";
import CrearHojaRuta from "@/components/erp/CrearHojaRuta";
import DetalleHojaRuta from "@/components/erp/DetalleHojaRuta";
import { ZONE_STYLE } from "@/lib/zonas";

const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

const ESTADO_BADGE = {
  "Borrador": "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
  "En ruta": "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  "Completada": "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
};

export default function HojasRuta() {
  const [hojas, setHojas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState("Todas");
  const [crear, setCrear] = useState(false);
  const [detalle, setDetalle] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const recs = await base44.entities.HojaRuta.list("-fecha");
      setHojas(Array.isArray(recs) ? recs : []);
    } catch (e) { setError(e?.message || "Error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visibles = hojas.filter((h) => filtroEstado === "Todas" || h.estado === filtroEstado);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Hojas de Ruta</h1>
          <p className="mt-1 text-sm text-slate-500">Despachos consolidados por zona y vehículo · {visibles.length} hoja(s)</p>
        </div>
        <button onClick={() => setCrear(true)} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-800">
          <Plus className="h-4 w-4" /> Nueva hoja de ruta
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {["Todas", "Borrador", "En ruta", "Completada"].map((e) => (
          <button key={e} onClick={() => setFiltroEstado(e)} className={`rounded-full px-3 py-1.5 text-sm font-medium ${filtroEstado === e ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{e}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" /></div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Error: {error}</div>
      ) : visibles.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 py-16 text-slate-400">
          <Truck className="h-8 w-8" />
          <p className="text-sm">No hay hojas de ruta {filtroEstado !== "Todas" ? `en estado "${filtroEstado}"` : ""}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibles.map((h) => (
            <button key={h.id} onClick={() => setDetalle(h)} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-slate-300 hover:shadow-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500"><CalendarDays className="h-3.5 w-3.5" /> {h.fecha}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ESTADO_BADGE[h.estado] || ESTADO_BADGE["Borrador"]}`}>{h.estado}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {(h.zona || "Sin zona").split(", ").map((z, i) => (
                  <span key={i} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${ZONE_STYLE[z] || ZONE_STYLE["Sin zona"]}`}>{z}</span>
                ))}
              </div>
              <p className="font-semibold text-slate-900">{h.cliente?.[0] || h.zona || "Hoja de ruta"}</p>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Truck className="h-3.5 w-3.5" /> {h.vehiculo || "—"}</span>
                <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> {h.chofer || "—"}</span>
              </div>
              <div className="mt-1 flex items-center justify-between border-t border-slate-100 pt-2">
                <span className="text-xs text-slate-500">{h.cantidad_entregas} entrega(s)</span>
                <span className="text-sm font-semibold text-slate-900">{fmt.format(h.total || 0)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {crear && <CrearHojaRuta onClose={() => setCrear(false)} onCreated={load} />}
      {detalle && <DetalleHojaRuta hoja={detalle} onClose={() => setDetalle(null)} onUpdated={load} />}
    </div>
  );
}