import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, LayoutGrid } from "lucide-react";
import { MODULES, SECTIONS } from "./modules";

export default function AppSwitcher() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const current =
    MODULES.find((m) => m.path === location.pathname) ||
    MODULES.find((m) => m.path !== "/" && location.pathname.startsWith(m.path));
  const label = location.pathname === "/" ? "Aplicaciones" : current?.label || "Aplicaciones";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        <LayoutGrid className="h-4 w-4 text-brand" />
        {label}
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-40 mt-1 max-h-[70vh] w-64 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            <Link to="/" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
              <LayoutGrid className="h-4 w-4 text-brand" /> Inicio
            </Link>
            <div className="my-1 border-t border-slate-100" />
            {SECTIONS.map((section) => (
              <div key={section}>
                <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{section}</p>
                {MODULES.filter((m) => m.section === section).map((m) => {
                  const Icon = m.icon;
                  return (
                    <Link key={m.slug} to={m.path} onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
                      <Icon className="h-4 w-4 text-slate-400" /> {m.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}