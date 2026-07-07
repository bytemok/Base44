import { LayoutDashboard, ShoppingCart, Truck, Inbox, Package, Users, Receipt } from "lucide-react";

export const MODULES = [
  { slug: "dashboard", label: "Dashboard", icon: LayoutDashboard, section: "Operación", path: "/" },
  { slug: "ventas", label: "Ventas", icon: ShoppingCart, section: "Operación", path: "/ventas" },
  { slug: "entregas", label: "Entregas", icon: Truck, section: "Operación", path: "/entregas" },
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