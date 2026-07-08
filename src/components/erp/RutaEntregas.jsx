import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, Loader2, Navigation, MapPin } from "lucide-react";

export default function RutaEntregas({ entregas, onClose }) {
  const [origen, setOrigen] = useState("");
  const [cargando, setCargando] = useState(false);
  const [ruta, setRuta] = useState(null);
  const [error, setError] = useState("");

  const calcular = async (ev) => {
    setCargando(true); setError(""); setRuta(null);
    try {
      const stops = entregas.map((r) => ({ id: r.id, cliente: r.cliente, direccion: r.direccion || "", ciudad: r.ciudad || "" }));
      const res = await base44.functions.invoke("ruta_entregas", { stops, origin: origen.trim() });
      const d = res.data;
      if (d?.error) setError(d.error);
      else setRuta(d);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Error al calcular la ruta");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { if (entregas.length) calcular(); }, []);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base font-semibold text-slate-900">Ruta por cercanía</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b px-4 py-3">
          <label className="text-xs font-medium text-slate-500">Punto de partida (opcional)</label>
          <div className="mt-1 flex gap-2">
            <input
              value={origen}
              onChange={(e) => setOrigen(e.target.value)}
              placeholder="Dirección del depósito..."
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
            />
            <button
              onClick={calcular}
              disabled={cargando}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />} Calcular
            </button>
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            {entregas.length} entrega(s){ruta ? ` · ${ruta.geocoded}/${ruta.total} geolocalizadas` : ""}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}
          {cargando && !ruta && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" /> Calculando ruta óptima...
            </div>
          )}
          {ruta?.ordered?.length > 0 && (
            <>
              <ol className="space-y-2">
                {ruta.ordered.map((s, i) => (
                  <li key={i} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{s.cliente}</p>
                      <p className="flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{s.direccion ? `${s.direccion}, ` : ""}{s.ciudad}{!s.lat ? " · sin geolocalizar" : ""}</span>
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
              {ruta.maps_url && (
                <a
                  href={ruta.maps_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  <Navigation className="h-4 w-4" /> Abrir en Google Maps
                </a>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}