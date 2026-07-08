import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Navigation, X, Truck, User, MapPin, Calendar, AlertTriangle } from "lucide-react";
import { ZONE_STYLE } from "@/lib/zonas";

const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export default function CrearHojaRuta({ entregas: propEntregas, onClose, onCreated }) {
  const hasPre = Array.isArray(propEntregas) && propEntregas.length > 0;
  const [allEntregas, setAllEntregas] = useState(hasPre ? propEntregas : []);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [incl, setIncl] = useState(new Set(hasPre ? propEntregas.map((e) => e.id) : []));
  const [vehiculo, setVehiculo] = useState("");
  const [chofer, setChofer] = useState("");
  const [origen, setOrigen] = useState("");
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const fecha = hasPre ? propEntregas[0]?.fecha_entrega : null;

  const cargar = async (f) => {
    setLoading(true); setLoadError(null);
    try {
      const res = await base44.functions.invoke("odoo", { resource: "entregas_calendario" });
      const rows = (res.data?.data || []).filter((r) => r.fecha_entrega === f && !r.enviada);
      setAllEntregas(rows);
      setIncl(new Set(rows.map((r) => r.id)));
    } catch (e) { setLoadError(e?.message || "Error"); }
    finally { setLoading(false); }
  };

  const selected = useMemo(() => allEntregas.filter((e) => incl.has(e.id)), [allEntregas, incl]);
  const total = selected.reduce((s, e) => s + (e.total || 0), 0);
  const zonas = [...new Set(selected.map((e) => e.zona).filter(Boolean))];

  const toggle = (id) => setIncl((p) => {
    const n = new Set(p);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  const guardar = async (optimizar) => {
    if (!selected.length) { setError("Seleccioná al menos una entrega"); return; }
    setSaving(true); setError(null);
    let paradas = selected.map((e) => ({
      order_ref: e.order_ref, cliente: e.cliente,
      direccion: [e.direccion, e.direccion2].filter(Boolean).join(" "),
      ciudad: e.ciudad, zona: e.zona, total: e.total, entrega_id: e.id,
    }));
    let ruta_url = "";
    if (optimizar) {
      try {
        const res = await base44.functions.invoke("ruta_entregas", {
          origin: origen,
          stops: selected.map((e) => ({ cliente: e.cliente, direccion: [e.direccion, e.direccion2].filter(Boolean).join(" "), ciudad: e.ciudad })),
        });
        if (res.data?.ordered) {
          const ordered = res.data.ordered;
          const byOriginal = selected.map((e, i) => i);
          paradas = ordered.map((o, oi) => {
            const originalIdx = ordered.findIndex((x) => x.cliente === o.cliente && x.direccion === o.direccion);
            return paradas[byOriginal[originalIdx]] || { order_ref: "", cliente: o.cliente, direccion: o.direccion, ciudad: o.ciudad };
          });
        }
        ruta_url = res.data?.maps_url || "";
      } catch (e) { setError("No se pudo optimizar la ruta: " + (e?.message || e)); setSaving(false); return; }
    }
    try {
      const hoja = await base44.entities.HojaRuta.create({
        fecha: selected[0]?.fecha_entrega || new Date().toISOString().slice(0, 10),
        zona: zonas.join(", ") || "Sin zona",
        vehiculo, chofer,
        estado: "Borrador",
        entrega_ids: JSON.stringify(selected.map((e) => e.id)),
        cantidad_entregas: selected.length,
        total,
        paradas: JSON.stringify(paradas),
        ruta_url,
        notas,
      });
      onCreated?.(hoja);
      onClose?.();
    } catch (e) { setError(e?.message || "Error al guardar"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Nueva hoja de ruta</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>

        {!hasPre && (
          <div className="mb-4 flex items-end gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-500">Fecha de entrega</label>
              <input type="date" value={fecha || ""} onChange={(e) => cargar(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
            </div>
            <button onClick={() => cargar(fecha)} disabled={!fecha || loading} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cargar"}
            </button>
          </div>
        )}

        {loadError && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</div>}

        {allEntregas.length > 0 ? (
          <>
            <div className="mb-3 max-h-56 space-y-1.5 overflow-y-auto rounded-lg border border-slate-200 p-2">
              {allEntregas.map((e) => (
                <label key={e.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                  <input type="checkbox" checked={incl.has(e.id)} onChange={() => toggle(e.id)} className="h-4 w-4 rounded border-slate-300 text-slate-900" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-800">{e.cliente}</p>
                    <p className="text-xs text-slate-400">{e.order_ref} · {e.ciudad || "—"} · {fmt.format(e.total || 0)}</p>
                  </div>
                  {e.zona && <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${ZONE_STYLE[e.zona] || ZONE_STYLE["Sin zona"]}`}>{e.zona}</span>}
                </label>
              ))}
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500"><Truck className="inline h-3.5 w-3.5" /> Vehículo</label>
                <input value={vehiculo} onChange={(e) => setVehiculo(e.target.value)} placeholder="Patente / descripción" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500"><User className="inline h-3.5 w-3.5" /> Chofer</label>
                <input value={chofer} onChange={(e) => setChofer(e.target.value)} placeholder="Conductor" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-500"><MapPin className="inline h-3.5 w-3.5" /> Origen de la ruta (opcional)</label>
                <input value={origen} onChange={(e) => setOrigen(e.target.value)} placeholder="Dirección del depósito" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-500">Notas</label>
                <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
              </div>
            </div>

            <div className="mb-4 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <span className="text-slate-600">{selected.length} entrega(s) · {zonas.length} zona(s)</span>
              <span className="font-semibold text-slate-900">{fmt.format(total)}</span>
            </div>

            {error && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

            <div className="flex gap-2">
              <button onClick={() => guardar(false)} disabled={saving || !selected.length} className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar sin optimizar"}
              </button>
              <button onClick={() => guardar(true)} disabled={saving || !selected.length} className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Navigation className="h-4 w-4" /> Optimizar y guardar</>}
              </button>
            </div>
          </>
        ) : hasPre ? null : (
          <div className="flex flex-col items-center gap-2 py-8 text-sm text-slate-400">
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <><Calendar className="h-8 w-8" /><p>Elegí una fecha y cargá las entregas pendientes</p></>}
          </div>
        )}
      </div>
    </div>
  );
}