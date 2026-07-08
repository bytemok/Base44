import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Navigation, Truck, User, MapPin, Loader2, Play, CheckCircle2, Printer } from "lucide-react";

const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const safeParse = (s) => { try { return JSON.parse(s || "[]"); } catch { return []; } };

const ESTADO_BADGE = {
  "Borrador": "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
  "En ruta": "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  "Completada": "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
};

export default function DetalleHojaRuta({ hoja, onClose, onUpdated }) {
  const [updating, setUpdating] = useState(false);
  const paradas = safeParse(hoja.paradas);

  const cambiarEstado = async (estado) => {
    setUpdating(true);
    try {
      await base44.entities.HojaRuta.update(hoja.id, { estado });
      onUpdated?.();
      onClose?.();
    } catch (e) { alert("Error: " + (e?.message || e)); }
    finally { setUpdating(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Hoja de ruta</h2>
            <p className="text-xs text-slate-500">{hoja.fecha} · {hoja.zona || "Sin zona"}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADO_BADGE[hoja.estado] || ESTADO_BADGE["Borrador"]}`}>{hoja.estado}</span>
            <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-slate-600"><Truck className="h-4 w-4 text-slate-400" /> {hoja.vehiculo || "—"}</div>
          <div className="flex items-center gap-2 text-slate-600"><User className="h-4 w-4 text-slate-400" /> {hoja.chofer || "—"}</div>
        </div>

        <div className="mb-4 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
          <span className="text-slate-600">{hoja.cantidad_entregas} entrega(s)</span>
          <span className="font-semibold text-slate-900">{fmt.format(hoja.total || 0)}</span>
        </div>

        {hoja.notas && <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{hoja.notas}</div>}

        <h3 className="mb-2 text-sm font-semibold text-slate-700">Paradas ({paradas.length})</h3>
        <div className="mb-4 space-y-2">
          {paradas.map((p, i) => (
            <div key={i} className="flex gap-3 rounded-lg border border-slate-100 p-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{p.cliente}</p>
                <p className="text-xs text-slate-400">{p.order_ref} · {p.ciudad || "—"}</p>
                {p.direccion && <p className="text-xs text-slate-500"><MapPin className="inline h-3 w-3" /> {p.direccion}</p>}
              </div>
              <span className="shrink-0 text-xs font-medium text-slate-500">{fmt.format(p.total || 0)}</span>
            </div>
          ))}
        </div>

        {hoja.ruta_url && (
          <a href={hoja.ruta_url} target="_blank" rel="noreferrer" className="mb-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-emerald-700">
            <Navigation className="h-4 w-4" /> Abrir ruta en Google Maps
          </a>
        )}

        <div className="flex gap-2">
          {hoja.estado === "Borrador" && (
            <button onClick={() => cambiarEstado("En ruta")} disabled={updating} className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40">
              {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Play className="h-4 w-4" /> Iniciar ruta</>}
            </button>
          )}
          {hoja.estado === "En ruta" && (
            <button onClick={() => cambiarEstado("Completada")} disabled={updating} className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40">
              {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-4 w-4" /> Marcar completada</>}
            </button>
          )}
          <button onClick={onClose} className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cerrar</button>
        </div>
      </div>
    </div>
  );
}