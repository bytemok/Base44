import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutGrid, ClipboardList, ArrowLeftRight, Settings } from "lucide-react";

const TABS = [
  { to: "/", label: "Dashboard", icon: LayoutGrid },
  { to: "/pedidos", label: "Pedidos", icon: ClipboardList },
  { to: "/pick", label: "Pick", icon: ArrowLeftRight },
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
          <Link key={t.to} to={t.to} className={`select-none flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${active ? "text-brand" : "text-slate-400"}`}>
            <Icon className="h-5 w-5" />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}