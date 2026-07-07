import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { MODULES, SECTIONS } from "@/components/erp/modules";

function ModuleCard({ module }) {
  const Icon = module.icon;
  return (
    <Link
      to={module.path}
      className="group flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm transition hover:border-emerald-200 hover:shadow-md"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-600 transition group-hover:bg-emerald-50 group-hover:text-emerald-600">
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium text-slate-800">{module.label}</p>
    </Link>
  );
}

export default function Dashboard() {
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Buenos días";
    if (h < 20) return "Buenas tardes";
    return "Buenas noches";
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{greeting} 👋</h1>
        <p className="mt-1 text-sm text-slate-500">Elegí un módulo para empezar.</p>
      </div>

      {SECTIONS.map((section) => (
        <section key={section}>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            {section}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {MODULES.filter((m) => m.section === section).map((m) => (
              <ModuleCard key={m.slug} module={m} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}