import React from "react";
import { useParams } from "react-router-dom";
import { getModuleBySlug } from "@/components/erp/modules";
import { Cloud } from "lucide-react";

export default function Modulo() {
  const { modulo } = useParams();
  const mod = getModuleBySlug(modulo);

  if (!mod) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-lg font-medium text-slate-700">Módulo no encontrado</p>
        <p className="mt-1 text-sm text-slate-500">
          Volver al <span className="text-emerald-600">Dashboard</span>.
        </p>
      </div>
    );
  }

  const Icon = mod.icon;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{mod.label}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {mod.section} · sincronizado con Odoo
        </p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
          <Icon className="h-7 w-7" />
        </div>
        <p className="mt-4 text-base font-medium text-slate-700">
          {mod.label}
        </p>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          Este módulo está conectado a Odoo. Los datos se sincronizan
          automáticamente y no se modifican desde aquí.
        </p>
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
          <Cloud className="h-3.5 w-3.5" />
          Sincronizado con Odoo
        </div>
      </div>
    </div>
  );
}