import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Puzzle, Bell, Pencil } from "lucide-react";
import AppSwitcher from "./AppSwitcher";
import GlobalSearch from "./GlobalSearch";
import ProfileMenu from "./ProfileMenu";

export default function TopBar() {
  const [notifOpen, setNotifOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-slate-200 bg-white px-3 sm:gap-4 sm:px-5">
      <Link to="/" className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
          <Puzzle className="h-5 w-5" />
        </span>
        <span className="hidden text-sm font-bold text-slate-800 sm:block">ERP</span>
      </Link>
      <div className="h-6 w-px bg-slate-200" />
      <AppSwitcher />
      <div className="flex-1" />
      <GlobalSearch />
      <Link to="/perfil" className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
        <Pencil className="h-4 w-4" /> <span className="hidden lg:block">Soporte</span>
      </Link>
      <div className="relative">
        <button onClick={() => setNotifOpen((o) => !o)} className="relative rounded-md p-1.5 text-slate-500 hover:bg-slate-100">
          <Bell className="h-5 w-5" />
          <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">2</span>
        </button>
        {notifOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
            <div className="absolute right-0 z-40 mt-1 w-64 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-lg">
              Sin notificaciones nuevas
            </div>
          </>
        )}
      </div>
      <ProfileMenu />
    </header>
  );
}