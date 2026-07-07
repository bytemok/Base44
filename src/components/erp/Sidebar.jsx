import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Package, X } from "lucide-react";
import { MODULES, SECTIONS } from "./modules";

export default function Sidebar({ open, onClose }) {
  const location = useLocation();
  const isActive = (path) =>
    location.pathname === path || (path !== "/" && location.pathname.startsWith(path));

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-[#262321] text-slate-300 transition-transform duration-200 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2.5" onClick={onClose}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white">
              <Package className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-white">IdearMarket</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">ERP</p>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-6">
          {SECTIONS.map((section) => (
            <div key={section} className="mb-5">
              <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {section}
              </p>
              <div className="space-y-0.5">
                {MODULES.filter((m) => m.section === section).map((m) => {
                  const Icon = m.icon;
                  const active = isActive(m.path);
                  return (
                    <Link
                      key={m.slug}
                      to={m.path}
                      onClick={onClose}
                      className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition ${
                        active
                          ? "bg-emerald-500/15 font-medium text-emerald-400"
                          : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 truncate">{m.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/5 px-5 py-3">
          <p className="text-[10px] text-slate-500">Sincronizado con Odoo</p>
        </div>
      </aside>
    </>
  );
}