import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Package, ChevronLeft, X } from "lucide-react";
import { MODULES, SECTIONS } from "./modules";
import { usePedidoCount } from "@/hooks/usePedidoCount";

export default function Sidebar({ open, onClose }) {
  const location = useLocation();
  const { count: nuevosCount } = usePedidoCount("Nuevo");
  const isActive = (path) => {
    const [base, query] = path.split("?");
    if (query) {
      // módulo con query (ej. Nueva Venta): activo solo si coincide el parámetro
      const params = new URLSearchParams(location.search);
      const q = new URLSearchParams(query);
      return location.pathname === base && [...q.keys()].every((k) => params.get(k) === q.get(k));
    }
    return location.pathname === base || (base !== "/" && location.pathname.startsWith(base));
  };

  return (
    <>
      {/* Overlay móvil */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-[#262321] text-slate-300 transition-transform duration-200 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2.5" onClick={onClose}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white">
              <Package className="h-4.5 w-4.5" />
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

        {/* Nav */}
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
                      {m.badgeType === "nuevos" && nuevosCount > 0 && (
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                            active
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-white/10 text-slate-400"
                          }`}
                        >
                          {nuevosCount}
                        </span>
                      )}
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