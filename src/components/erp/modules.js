import { LayoutDashboard, ClipboardList, PlusCircle } from "lucide-react";

export const MODULES = [
  { slug: "dashboard", label: "Dashboard", icon: LayoutDashboard, section: "Operación", path: "/" },
  { slug: "ventas-pedidos", label: "Ventas y Pedidos", icon: ClipboardList, section: "Operación", path: "/pedidos", badge: 271, dedicated: true },
  { slug: "nueva-venta", label: "Nueva Venta", icon: PlusCircle, section: "Operación", path: "/pedidos?nuevo=1", dedicated: true },
];

export const SECTIONS = ["Operación"];

export const getModuleByPath = (pathname) =>
  MODULES.find((m) => m.path === pathname) ||
  MODULES.find((m) => m.path !== "/" && pathname.startsWith(m.path.split("?")[0]));

export const getModuleBySlug = (slug) => MODULES.find((m) => m.slug === slug);