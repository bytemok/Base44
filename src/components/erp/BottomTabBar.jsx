import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LayoutGrid, ClipboardList, ArrowLeftRight, Settings } from "lucide-react";

const TABS = [
  { to: "/", label: "Dashboard", icon: LayoutGrid },
  { to: "/pedidos", label: "Pedidos", icon: ClipboardList },
  { to: "/pick", label: "Pick", icon: ArrowLeftRight },
  { to: "/perfil", label: "Perfil", icon: Settings },
];

export default function BottomTabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (to) => location.pathname === to || (to !== "/" && location.pathname.startsWith(to));
  const handleClick = (e, to) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
    navigate(to);
  };
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
      {TABS.map((t) => {
        const Icon = t.icon;
        const active = isActive(t.to);
        return (
          <a key={t.to} href={t.to} onClick={(e) => handleClick(e, t.to)} className={`select-none flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${active ? "text-brand" : "text-slate-400"}`}>
            <Icon className="h-5 w-5" />
            {t.label}
          </a>
        );
      })}
    </nav>
  );
}