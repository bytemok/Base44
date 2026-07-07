import { LayoutDashboard, ShoppingCart, ClipboardList, CalendarDays, Inbox, Package, Users, Receipt } from "lucide-react";

export const MODULES = [
  { slug: "dashboard", label: "Dashboard", icon: LayoutDashboard, section: "Operación", path: "/" },
  { slug: "ventas", label: "Ventas", icon: ShoppingCart, section: "Operación", path: "/ventas" },
  { slug: "coordinar", label: "Pedidos a coordinar", icon: ClipboardList, section: "Operación", path: "/coordinar" },
  { slug: "calendario", label: "Calendario de Entregas", icon: CalendarDays, section: "Operación", path: "/calendario" },
  { slug: "recepciones", label: "Recepciones", icon: Inbox, section: "Operación", path: "/recepciones" },
  { slug: "productos", label: "Productos", icon: Package, section: "Catálogo", path: "/productos" },
  { slug: "clientes", label: "Clientes", icon: Users, section: "Catálogo", path: "/clientes" },
  { slug: "facturas", label: "Facturas", icon: Receipt, section: "Finanzas", path: "/facturas" },
];

export const SECTIONS = ["Operación", "Catálogo", "Finanzas"];

export const getModuleByPath = (pathname) =>
  MODULES.find((m) => m.path === pathname) ||
  MODULES.find((m) => m.path !== "/" && pathname.startsWith(m.path));

export const getModuleBySlug = (slug) => MODULES.find((m) => m.slug === slug);