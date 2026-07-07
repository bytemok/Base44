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
        className={`fixed inset-y-0 left-0 z-40 flex w-20 flex-col items-center bg-[#1f1d1b] py-4 transition-transform duration-200 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Link
          to="/"
          onClick={onClose}
          className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white"
        >
          <Package className="h-5 w-5" />
        </Link>
        <button
          onClick={onClose}
          className="absolute right-2 top-2 rounded-lg p-1 text-slate-400 hover:text-white md:hidden"
        >
          <X className="h-4 w-4" />
        </button>

        <nav className="flex-1 w-full overflow-y-auto">
          {SECTIONS.map((section, si) => (
            <div key={section} className={si === 0 ? "" : "mt-3 border-t border-white/5 pt-3"}>
              {MODULES.filter((m) => m.section === section).map((m) => {
                const Icon = m.icon;
                const active = isActive(m.path);
                return (
                  <Link
                    key={m.slug}
                    to={m.path}
                    onClick={onClose}
                    title={m.label}
                    className={`mx-1.5 mb-1 flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-center transition ${
                      active
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-[10px] leading-tight">{m.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <p className="mt-2 text-center text-[9px] leading-tight text-slate-600">Odoo</p>
      </aside>
    </>
  );
}