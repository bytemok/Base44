import React, { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

const label = {
  finanzas: "Finanzas",
  clientes: "Clientes",
  sistema: "Sistema",
};

export default function AuditoriaSeguridad() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    base44.entities.SecurityAuditLog.list("-created_date", 200).then((data) => {
      if (alive) setRows(data || []);
    }).finally(() => {
      if (alive) setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  const stats = useMemo(() => ({
    total: rows.length,
    finanzas: rows.filter((r) => r.area === "finanzas").length,
    clientes: rows.filter((r) => r.area === "clientes").length,
  }), [rows]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Auditoría de seguridad</h1>
          <p className="text-sm text-slate-500">Registro de accesos a clientes, finanzas y sincronizaciones sensibles.</p>
        </div>
        <div className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 sm:flex">
          <ShieldCheck className="h-6 w-6" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"><p className="text-xs text-slate-500">Eventos</p><p className="text-2xl font-semibold text-slate-900">{stats.total}</p></div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"><p className="text-xs text-slate-500">Finanzas</p><p className="text-2xl font-semibold text-slate-900">{stats.finanzas}</p></div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"><p className="text-xs text-slate-500">Clientes</p><p className="text-2xl font-semibold text-slate-900">{stats.clientes}</p></div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
        <div className="grid grid-cols-[150px_1fr_1fr_1fr_90px] gap-3 border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <span>Fecha</span><span>Usuario</span><span>Área</span><span>Origen</span><span className="text-right">Registros</span>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Cargando auditoría...</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">Todavía no hay eventos registrados.</div>
        ) : rows.map((r) => (
          <div key={r.id} className="grid grid-cols-[150px_1fr_1fr_1fr_90px] gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-0">
            <span className="text-slate-500">{(r.created_at || r.created_date || "").slice(0, 16).replace("T", " ")}</span>
            <span className="truncate text-slate-900">{r.user_email || r.user_name || "Sistema"}</span>
            <span className="text-slate-700">{label[r.area] || r.area}</span>
            <span className="truncate text-slate-500">{r.resource} · {r.source}</span>
            <span className="text-right font-medium text-slate-900">{r.count || 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}