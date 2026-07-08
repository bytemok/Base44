import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { User, Bell, Palette, Loader2, Check, Sun, Moon } from "lucide-react";

const ROLES = { admin: "Administrador", user: "Empleado" };

export default function Perfil() {
  const [user, setUser] = useState(null);
  const [prefs, setPrefs] = useState({
    notif_alertas_stock: true,
    notif_recordatorios_entrega: true,
    notif_novedades: false,
    tema: "claro",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const u = await base44.auth.me();
        setUser(u);
        const stored = localStorage.getItem("tema");
        const tema = stored || "claro";
        setPrefs({
          notif_alertas_stock: u.notif_alertas_stock !== false,
          notif_recordatorios_entrega: u.notif_recordatorios_entrega !== false,
          notif_novedades: !!u.notif_novedades,
          tema,
        });
        applyTema(tema);
      } catch (e) {} finally { setLoading(false); }
    })();
  }, []);

  const applyTema = (tema) => {
    const root = document.documentElement;
    if (tema === "oscuro") root.classList.add("dark");
    else root.classList.remove("dark");
  };

  const setTema = (tema) => {
    setPrefs((p) => ({ ...p, tema }));
    applyTema(tema);
    localStorage.setItem("tema", tema);
  };

  const toggle = (key) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const guardar = async () => {
    setSaving(true);
    setGuardado(false);
    try {
      await base44.auth.updateMe({
        notif_alertas_stock: prefs.notif_alertas_stock,
        notif_recordatorios_entrega: prefs.notif_recordatorios_entrega,
        notif_novedades: prefs.notif_novedades,
      });
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2500);
    } catch (e) {} finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Perfil</h1>
        <p className="mt-1 text-sm text-slate-500">Configuración de usuario y preferencias de la aplicación</p>
      </div>

      {/* Datos del usuario */}
      <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <User className="h-7 w-7" />
        </div>
        <div>
          <p className="text-lg font-semibold text-slate-900">{user?.full_name || "Usuario"}</p>
          <p className="text-sm text-slate-500">{user?.email}</p>
          <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {ROLES[user?.role] || user?.role || "Usuario"}
          </span>
        </div>
      </div>

      {/* Notificaciones */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Bell className="h-4 w-4 text-slate-400" /> Notificaciones
        </h3>
        <div className="space-y-3">
          {[
            { key: "notif_alertas_stock", label: "Alertas de stock faltante", desc: "Avisar cuando se detecten productos con stock negativo" },
            { key: "notif_recordatorios_entrega", label: "Recordatorios de entrega", desc: "Recordar entregas próximas a coordinar o despachar" },
            { key: "notif_novedades", label: "Novedades del sistema", desc: "Actualizaciones y mejoras de la plataforma" },
          ].map((item) => (
            <label key={item.key} className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-slate-100 px-4 py-3 hover:bg-slate-50">
              <div>
                <p className="text-sm font-medium text-slate-800">{item.label}</p>
                <p className="text-xs text-slate-400">{item.desc}</p>
              </div>
              <button
                type="button"
                onClick={() => toggle(item.key)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${prefs[item.key] ? "bg-emerald-500" : "bg-slate-200"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${prefs[item.key] ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </label>
          ))}
        </div>
      </div>

      {/* Tema */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Palette className="h-4 w-4 text-slate-400" /> Tema de visualización
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => setTema("claro")}
            className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${prefs.tema === "claro" ? "border-emerald-400 bg-emerald-50" : "border-slate-200 hover:bg-slate-50"}`}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600"><Sun className="h-5 w-5" /></div>
            <div>
              <p className="text-sm font-medium text-slate-800">Claro</p>
              <p className="text-xs text-slate-400">Interfaz luminosa</p>
            </div>
          </button>
          <button
            onClick={() => setTema("oscuro")}
            className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${prefs.tema === "oscuro" ? "border-emerald-400 bg-emerald-50" : "border-slate-200 hover:bg-slate-50"}`}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-slate-200"><Moon className="h-5 w-5" /></div>
            <div>
              <p className="text-sm font-medium text-slate-800">Oscuro</p>
              <p className="text-xs text-slate-400">Interfaz oscura</p>
            </div>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={guardar}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : guardado ? <Check className="h-4 w-4" /> : <Check className="h-4 w-4" />}
          {guardado ? "Guardado" : "Guardar preferencias"}
        </button>
        <span className="text-xs text-slate-400">Las preferencias de notificación se guardan en tu perfil</span>
      </div>
    </div>
  );
}