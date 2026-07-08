import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { DEFAULT_ZONA_CIUDADES, ZONE_STYLE } from "@/lib/zonas";
import { Map, Plus, Loader2, Trash2, Save, RotateCcw, Info } from "lucide-react";

export default function GestionZonas() {
  const [zonas, setZonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [nuevo, setNuevo] = useState({ nombre: "", ciudades: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const recs = await base44.entities.ZonaEntrega.list("nombre");
      setZonas(Array.isArray(recs) ? recs : []);
    } catch (e) {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const actualizar = (id, campo, valor) =>
    setZonas((zs) => zs.map((z) => (z.id === id ? { ...z, [campo]: valor } : z)));

  const guardar = async (z) => {
    setSaving(z.id);
    try {
      await base44.entities.ZonaEntrega.update(z.id, { nombre: z.nombre, ciudades: z.ciudades });
      load();
    } catch (e) {} finally { setSaving(null); }
  };

  const eliminar = async (z) => {
    if (!confirm(`¿Eliminar la zona "${z.nombre}"?`)) return;
    try { await base44.entities.ZonaEntrega.delete(z.id); load(); } catch (e) {}
  };

  const crear = async (e) => {
    e.preventDefault();
    if (!nuevo.nombre.trim() || !nuevo.ciudades.trim()) return;
    setSaving("nuevo");
    try {
      await base44.entities.ZonaEntrega.create({ nombre: nuevo.nombre.trim(), ciudades: nuevo.ciudades.trim() });
      setNuevo({ nombre: "", ciudades: "" });
      load();
    } catch (e) {} finally { setSaving(null); }
  };

  const cargarDefecto = async () => {
    if (!confirm("Esto reemplaza la configuración actual con las zonas por defecto. ¿Continuar?")) return;
    setSaving("defecto");
    try {
      await base44.entities.ZonaEntrega.deleteMany({});
      await base44.entities.ZonaEntrega.bulkCreate(
        Object.entries(DEFAULT_ZONA_CIUDADES).map(([nombre, ciudades]) => ({ nombre, ciudades }))
      );
      load();
    } catch (e) {} finally { setSaving(null); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Gestión de Zonas</h1>
          <p className="mt-1 text-sm text-slate-500">Configurá el mapeo de ciudades a zonas que usa el calendario de entregas</p>
        </div>
        <button onClick={cargarDefecto} disabled={saving === "defecto"} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
          {saving === "defecto" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Cargar zonas por defecto
        </button>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm text-blue-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>El calendario de entregas y los pedidos a coordinar usan esta configuración para agrupar por zona. Si no hay zonas configuradas, se usan los valores por defecto. Los envíos con transportista "Andreani/Expresos" se agrupan automáticamente en su propia zona.</span>
      </div>

      {/* Nueva zona */}
      <form onSubmit={crear} className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700"><Plus className="h-4 w-4" /> Nueva zona</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} placeholder="Nombre de zona (ej. Zona Norte)" className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
          <textarea value={nuevo.ciudades} onChange={(e) => setNuevo({ ...nuevo, ciudades: e.target.value })} placeholder="Ciudades separadas por coma (ej. Tigre, Pilar, Nordelta)" rows={1} className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
        </div>
        <button type="submit" disabled={saving === "nuevo"} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50">
          {saving === "nuevo" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Agregar zona
        </button>
      </form>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
        </div>
      ) : zonas.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 py-16 text-slate-400">
          <Map className="h-8 w-8" />
          <p className="text-sm">Sin zonas configuradas · usando valores por defecto</p>
        </div>
      ) : (
        <div className="space-y-3">
          {zonas.map((z) => {
            const cnt = (z.ciudades || "").split(/[\n,]/).map((s) => s.trim()).filter(Boolean).length;
            return (
              <div key={z.id} className="rounded-xl border border-slate-200 border-l-4 bg-white p-4" style={{ borderLeftColor: "#cbd5e1" }}>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Nombre</label>
                    <input value={z.nombre} onChange={(e) => actualizar(z.id, "nombre", e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium outline-none focus:border-slate-400" />
                    <p className="mt-1 text-xs text-slate-400">{cnt} ciudad(es)</p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-500">Ciudades (separadas por coma o nueva línea)</label>
                    <textarea value={z.ciudades} onChange={(e) => actualizar(z.id, "ciudades", e.target.value)} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => guardar(z)} disabled={saving === z.id} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50">
                    {saving === z.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Guardar
                  </button>
                  <button onClick={() => eliminar(z)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50">
                    <Trash2 className="h-3.5 w-3.5" /> Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}