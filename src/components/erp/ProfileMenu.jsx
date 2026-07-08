import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, User, LogOut } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const name = user?.full_name || "Usuario";
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const logout = async () => { await base44.auth.logout(); window.location.href = "/login"; };

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-100">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">{initials}</span>
        <span className="hidden text-sm font-medium text-slate-700 sm:block">{name}</span>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-1 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            <Link to="/perfil" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
              <User className="h-4 w-4 text-slate-400" /> Mi Perfil
            </Link>
            <button onClick={logout} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-slate-600 hover:bg-slate-50">
              <LogOut className="h-4 w-4 text-slate-400" /> Cerrar sesión
            </button>
          </div>
        </>
      )}
    </div>
  );
}