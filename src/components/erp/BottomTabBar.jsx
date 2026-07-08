import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutGrid, ClipboardList, CalendarDays, Barcode, Settings } from "lucide-react";

const TABS = [
  { to: "/", label: "Inicio", icon: LayoutGrid },
  { to: "/pedidos", label: "Pedidos", icon: ClipboardList },
  { to: "/calendario", label: "Entregas", icon: CalendarDays },
  { to: "/registro-logistico", label: "Logística", icon: Barcode },
  { to: "/perfil", label: "Perfil", icon: Settings },
];

export default function BottomTabBar() {
  const location = useLocation();
  const isActive = (to) => location.pathname === to || (to !== "/" && location.pathname.startsWith(to));
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
      {TABS.map((t) => {
        const Icon = t.icon;
        const active = isActive(t.to);
        return (
          <Link key={t.to} to={t.to} className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${active ? "text-brand" : "text-slate-400"}`}>
            <Icon className="h-5 w-5" />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}