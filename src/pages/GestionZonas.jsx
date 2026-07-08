import React, { useState, useEffect, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useOdoo } from "@/hooks/useOdoo";
import { DEFAULT_ZONA_CIUDADES, ZONE_STYLE } from "@/lib/zonas";
import { Map, Plus, Loader2, Trash2, Save, RotateCcw, Info, Search, Building2, Check } from "lucide-react";

const parseCiudades = (s) => (s || "").split(/[\n,]/).map((x) => x.trim()).filter(Boolean);

export default function GestionZonas() {
  const [zonas, setZonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [savingAll, setSavingAll] = useState(false);
  const [nuevo, setNuevo] = useState({ nombre: "", ciudades: "" });
  const [view, setView] = useState("asignar");
  const [q, setQ] = useState("");
  const [filtroZona, setFiltroZona] = useState("todas");
  const [customCity, setCustomCity] = useState("");
  const [dirty, setDirty] = useState(false);

  const { data: clientes, loading: loadingClientes } = useOdoo("clientes", 500);

  // cityList + assignment state
  const [cityList, setCityList] = useState([]); // [{ key, display, zoneId }]
  const [assign, setAssign] = useState({}); // key -> zoneId | null

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const recs = await base44.entities.ZonaEntrega.list("nombre");
      setZonas(Array.isArray(recs) ? recs : []);
    } catch (e) {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Construir lista de ciudades y asignaciones a partir de zonas + clientes
  useEffect(() => {
    if (loading || loadingClientes) return;
    const map = {};
    const order = [];
    const add = (display, zoneId) => {
      const k = (display || "").toLowerCase();
      if (!k) return;
      if (!map[k]) { map[k] = { display, zoneId: zoneId || null }; order.push(k); }
      else if (zoneId) { map[k].zoneId = zoneId; }
    };
    zonas.forEach((z) => parseCiudades(z.ciudades).forEach((c) => add(c, z.id)));
    (clientes || []).forEach((c) => add((c.ciudad || "").trim(), null));
    const arr = order.map((k) => ({ key: k, display: map[k].display, zoneId: map[k].zoneId }));
    arr.sort((a, b) => (a.zoneId ? 0 : 1) - (b.zoneId ? 0 : 1) || a.display.localeCompare(b.display, "es"));
    setCityList(arr);
    setAssign(Object.fromEntries(arr.map((x) => [x.key, x.zoneId])));
    setDirty(false);
  }, [zonas, clientes, loading, loadingClientes]);

  const zonaNombreById = useMemo(() => Object.fromEntries(zonas.map((z) => [z.id, z.nombre])), [zonas]);
  const counts = useMemo(() => {
    const c = { "": 0 };
    zonas.forEach((z) => (c[z.id] = 0));
    cityList.forEach((x) => { const k = assign[x.key] || ""; c[k] = (c[k] || 0) + 1; });
    return c;
  }, [cityList, assign, zonas]);

  const setCiudadZona = (key, zoneId) => {
    setAssign((a) => ({ ...a, [key]: zoneId || null }));
    setDirty(true);
  };

  const addCustomCity = () => {
    const raw = customCity.trim();
    if (!raw) return;
    const k = raw.toLowerCase();
    if (!cityList.some((c) => c.key === k)) {
      setCityList((l) => [...l, { key: k, display: raw, zoneId: null }]);
    }
    setAssign((a) => ({ ...a, [k]: a[k] || null }));
    setCustomCity("");
    setDirty(true);
  };

  const guardarCambios = async () => {
    setSavingAll(true);
    try {
      const byZone = {};
      cityList.forEach((c) => {
        const zid = assign[c.key];
        if (zid) (byZone[zid] = byZone[zid] || []).push(c.display);
      });
      const updates = zonas
        .map((z) => {
          const nuevoCiudades = (byZone[z.id] || []).join(", ");
          return { z, nuevoCiudades, changed: nuevoCiudades !== (z.ciudades || "") };
        })
        .filter((u) => u.changed);
      await Promise.all(updates.map((u) => base44.entities.ZonaEntrega.update(u.z.id, { nombre: u.z.nombre, ciudades: u.nuevoCiudades })));
      await load();
    } catch (e) {} finally { setSavingAll(false); }
  };

  // --- Edición manual de zonas ---
  const actualizar = (id, campo, valor) => {
    setZonas((zs) => zs.map((z) => (z.id === id ? { ...z, [campo]: valor } : z)));
    setDirty(true);
  };
  const guardarZona = async (z) => {
    setSaving(z.id);
    try { await base44.entities.ZonaEntrega.update(z.id, { nombre: z.nombre, ciudades: z.ciudades }); await load(); } catch (e) {} finally { setSaving(null); }
  };
  const eliminar = async (z) => {
    if (!confirm(`¿Eliminar la zona "${z.nombre}"?`)) return;
    try { await base44.entities.ZonaEntrega.delete(z.id); await load(); } catch (e) {}
  };
  const crear = async (e) => {
    e.preventDefault();
    if (!nuevo.nombre.trim() || !nuevo.ciudades.trim()) return;
    setSaving("nuevo");
    try {
      await base44.entities.ZonaEntrega.create({ nombre: nuevo.nombre.trim(), ciudades: nuevo.ciudades.trim() });
      setNuevo({ nombre: "", ciudades: "" });
      await load();
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
      await load();
    } catch (e) {} finally { setSaving(null); }
  };

  const filteredCities = useMemo(() => {
    let list = cityList;
    if (filtroZona !== "todas") list = list.filter((c) => (assign[c.key] || null) === (filtroZona === "sin" ? null : Number(filtroZona)));
    if (q.trim()) {
      const t = q.toLowerCase();
      list = list.filter((c) => c.display.toLowerCase().includes(t));
    }
    return list;
  }, [cityList, assign, filtroZona, q]);

  const TabBtn = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => setView(id)}
      className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium ${view === id ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Gestión de Zonas</h1>
          <p className="mt-1 text-sm text-slate-500">Asigná cada ciudad a su zona para organizar el calendario de entregas y los pedidos a coordinar</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={cargarDefecto} disabled={saving === "defecto"} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            {saving === "defecto" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Cargar por defecto
          </button>
          {view === "asignar" && (
            <button onClick={guardarCambios} disabled={!dirty || savingAll} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
              {savingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar cambios
            </button>
          )}
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm text-blue-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>El calendario de entregas y los pedidos a coordinar usan esta configuración para agrupar por zona. Si no hay zonas configuradas, se usan los valores por defecto. Los envíos con transportista "Andreani/Expresos" se agrupan automáticamente en su propia zona.</span>
      </div>

      <div className="flex gap-2">
        <TabBtn id="asignar" label="Asignar ciudades" icon={Map} />
        <TabBtn id="zonas" label="Editar zonas" icon={Building2} />
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
        </div>
      ) : view === "asignar" ? (
        <div className="space-y-4">
          {/* Resumen por zona */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFiltroZona("todas")}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${filtroZona === "todas" ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
            >
              Todas ({cityList.length})
            </button>
            {zonas.map((z) => (
              <button
                key={z.id}
                onClick={() => setFiltroZona(String(z.id))}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ring-1 ${filtroZona === String(z.id) ? "bg-slate-900 text-white ring-slate-900" : ZONE_STYLE[z.nombre] || ZONE_STYLE["Sin zona"]}`}
              >
                {z.nombre} ({counts[z.id] || 0})
              </button>
            ))}
            <button
              onClick={() => setFiltroZona("sin")}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 ${filtroZona === "sin" ? "bg-slate-900 text-white ring-slate-900" : ZONE_STYLE["Sin zona"]}`}
            >
              Sin asignar ({counts[""] || 0})
            </button>
          </div>

          {/* Buscador + agregar ciudad */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar ciudad..."
                className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-2 text-sm outline-none focus:border-slate-400"
              />
            </div>
            <div className="flex gap-2">
              <input
                value={customCity}
                onChange={(e) => setCustomCity(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomCity())}
                placeholder="Agregar ciudad personalizada..."
                className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 sm:w-56"
              />
              <button onClick={addCustomCity} disabled={!customCity.trim()} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                <Plus className="h-4 w-4" /> Agregar
              </button>
            </div>
          </div>

          {/* Lista de ciudades asignables */}
          {zonas.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 py-16 text-slate-400">
              <Map className="h-8 w-8" />
              <p className="text-sm">Primero creá las zonas (o cargá las por defecto) para asignar ciudades</p>
            </div>
          ) : filteredCities.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 py-12 text-slate-400">
              <Check className="h-8 w-8" />
              <p className="text-sm">No hay ciudades para mostrar con este filtro</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-100 sm:grid-cols-2">
              {filteredCities.map((c) => {
                const zid = assign[c.key] || null;
                const zName = zid ? zonaNombreById[zid] : "Sin asignar";
                return (
                  <div key={c.key} className="flex items-center justify-between gap-3 bg-white px-4 py-2.5">
                    <span className="truncate text-sm text-slate-700">{c.display}</span>
                    <select
                      value={zid || ""}
                      onChange={(e) => setCiudadZona(c.key, Number(e.target.value) || null)}
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium outline-none ring-1 ${zid ? ZONE_STYLE[zName] || ZONE_STYLE["Sin zona"] : ZONE_STYLE["Sin zona"]} bg-white`}
                    >
                      <option value="">Sin asignar</option>
                      {zonas.map((z) => (
                        <option key={z.id} value={z.id}>{z.nombre}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          )}
          {dirty && (
            <p className="text-xs text-amber-600">Tenés cambios sin guardar · presioná "Guardar cambios" para aplicarlos al calendario</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
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

          {zonas.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 py-16 text-slate-400">
              <Map className="h-8 w-8" />
              <p className="text-sm">Sin zonas configuradas · usando valores por defecto</p>
            </div>
          ) : (
            <div className="space-y-3">
              {zonas.map((z) => {
                const cnt = parseCiudades(z.ciudades).length;
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
                      <button onClick={() => guardarZona(z)} disabled={saving === z.id} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50">
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
      )}
    </div>
  );
}