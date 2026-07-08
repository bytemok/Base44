import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { User, Bell, Palette, Loader2, Check, Sun, Moon, Monitor, Trash2, AlertTriangle, X } from "lucide-react";

const ROLES = { admin: "Administrador", user: "Empleado" };

export default function Perfil() {
  const [user, setUser] = useState(null);
  const [prefs, setPrefs] = useState({
    notif_alertas_stock: true,
    notif_recordatorios_entrega: true,
    notif_novedades: false,
    tema: "automatico",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [eliminarOpen, setEliminarOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const u = await base44.auth.me();
        setUser(u);
        const stored = localStorage.getItem("tema");
        const tema = stored || "automatico";
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
    const dark = tema === "oscuro" || (tema === "automatico" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (dark) root.classList.add("dark");
    else root.classList.remove("dark");
  };

  useEffect(() => {
    if (prefs.tema !== "automatico") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTema("automatico");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.tema]);

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

  const eliminarCuenta = async () => {
    setEliminando(true);
    try {
      await base44.auth.updateMe({
        notif_alertas_stock: false,
        notif_recordatorios_entrega: false,
        notif_novedades: false,
      });
      await base44.auth.logout();
      window.location.href = "/login";
    } catch (e) {
      setEliminando(false);
    }
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
        <div className="grid gap-3 sm:grid-cols-3">
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
          <button
            onClick={() => setTema("automatico")}
            className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${prefs.tema === "automatico" ? "border-emerald-400 bg-emerald-50" : "border-slate-200 hover:bg-slate-50"}`}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Monitor className="h-5 w-5" /></div>
            <div>
              <p className="text-sm font-medium text-slate-800">Automático</p>
              <p className="text-xs text-slate-400">Según el sistema</p>
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

      {/* Zona de peligro */}
      <div className="rounded-xl border border-red-200 bg-red-50 p-5">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-700">
          <AlertTriangle className="h-4 w-4" /> Zona de peligro
        </h3>
        <p className="mb-3 text-xs text-red-600/80">
          La eliminación de cuenta es permanente y remueve el acceso a todos tus datos. Esta acción no se puede deshacer.
        </p>
        <button
          onClick={() => setEliminarOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
        >
          <Trash2 className="h-4 w-4" /> Eliminar Cuenta
        </button>
      </div>

      {eliminarOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={() => setEliminarOpen(false)}>
          <div className="w-full max-w-md animate-in slide-in-from-bottom rounded-t-2xl bg-white p-5 shadow-xl duration-200 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <AlertTriangle className="h-5 w-5 text-red-500" /> Eliminar cuenta
              </h3>
              <button onClick={() => setEliminarOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-sm text-slate-600">
              Vas a perder acceso a todos tus pedidos, entregas y configuraciones. Para confirmar, escribí <strong>ELIMINAR</strong> en mayúsculas.
            </p>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="ELIMINAR"
              className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm uppercase outline-none focus:border-red-400"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setEliminarOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button
                onClick={eliminarCuenta}
                disabled={confirmText !== "ELIMINAR" || eliminando}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
              >
                {eliminando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Eliminar definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}