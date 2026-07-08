import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { MODULES } from "@/components/erp/modules";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import AnalisisLogistico from "@/components/erp/AnalisisLogistico";
import ResumenReportes from "@/components/erp/ResumenReportes";

function AppTile({ module }) {
  const Icon = module.icon;
  return (
    <Link to={module.path} className="group flex w-24 flex-col items-center gap-2.5">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-slate-100 transition group-hover:-translate-y-0.5 group-hover:shadow-lg">
        <Icon className="h-9 w-9 text-brand" />
      </div>
      <span className="text-center text-xs font-medium leading-tight text-slate-700">{module.label}</span>
    </Link>
  );
}

export default function Dashboard() {
  const [refreshKey, setRefreshKey] = useState(0);
  const refreshing = usePullToRefresh(async () => setRefreshKey((k) => k + 1));
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Buenos días";
    if (h < 20) return "Buenas tardes";
    return "Buenas noches";
  }, []);

  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-teal-50 px-6 py-8">
        <h1 className="text-2xl font-semibold text-slate-900">{greeting} 👋</h1>
        <p className="mt-1 text-sm text-slate-500">Elegí una aplicación para empezar.</p>
        <div className="mt-6 flex flex-wrap gap-6">
          {MODULES.map((m) => <AppTile key={m.slug} module={m} />)}
        </div>
      </div>

      {refreshing && (
        <div className="flex justify-center py-2">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      )}

      <AnalisisLogistico key={refreshKey} />
      <ResumenReportes key={refreshKey} />
    </div>
  );
}