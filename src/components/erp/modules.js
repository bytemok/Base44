import {
  LayoutDashboard,
  ShoppingCart,
  FilePlus2,
  ClipboardList,
  Truck,
  Calendar,
  ScanLine,
  Users,
  Package,
  Wallet,
  Receipt,
  AlertTriangle,
  Building2,
  ShoppingBag,
  CloudDownload,
  Warehouse,
  Landmark,
  Banknote,
  TrendingUp,
  Printer,
  LayoutTemplate,
  Settings,
  Bot,
} from "lucide-react";

export const MODULES = [
  // OPERACIÓN
  { slug: "dashboard", label: "Dashboard", icon: LayoutDashboard, section: "Operación", path: "/" },
  { slug: "pos", label: "POS / Mostrador", icon: ShoppingCart, section: "Operación", path: "/modulo/pos" },
  { slug: "nueva-venta", label: "Nueva Venta", icon: FilePlus2, section: "Operación", path: "/modulo/nueva-venta" },
  { slug: "ventas-pedidos", label: "Ventas y Pedidos", icon: ClipboardList, section: "Operación", path: "/pedidos", badge: 271, dedicated: true },
  { slug: "entregas", label: "Entregas", icon: Truck, section: "Operación", path: "/modulo/entregas", badge: 46 },
  { slug: "calendario", label: "Calendario", icon: Calendar, section: "Operación", path: "/modulo/calendario" },
  { slug: "lector-codigo", label: "Lector Código", icon: ScanLine, section: "Operación", path: "/modulo/lector-codigo" },

  // COMERCIAL
  { slug: "clientes", label: "Clientes", icon: Users, section: "Comercial", path: "/modulo/clientes", badge: 770 },
  { slug: "productos", label: "Productos", icon: Package, section: "Comercial", path: "/modulo/productos", badge: 1846 },
  { slug: "cobranzas", label: "Cobranzas", icon: Wallet, section: "Comercial", path: "/modulo/cobranzas", badge: 269 },
  { slug: "facturacion", label: "Facturación", icon: Receipt, section: "Comercial", path: "/modulo/facturacion", badge: 550 },
  { slug: "reclamos", label: "Reclamos", icon: AlertTriangle, section: "Comercial", path: "/modulo/reclamos" },

  // ABASTECIMIENTO
  { slug: "proveedores", label: "Proveedores", icon: Building2, section: "Abastecimiento", path: "/modulo/proveedores" },
  { slug: "compras", label: "Compras", icon: ShoppingBag, section: "Abastecimiento", path: "/modulo/compras" },
  { slug: "compras-odoo", label: "Compras Odoo", icon: CloudDownload, section: "Abastecimiento", path: "/modulo/compras-odoo", badge: 1451 },
  { slug: "stock", label: "Stock", icon: Warehouse, section: "Abastecimiento", path: "/modulo/stock" },

  // FINANZAS
  { slug: "cajas-multi", label: "Cajas multi-local", icon: Landmark, section: "Finanzas", path: "/modulo/cajas-multi", badge: 10 },
  { slug: "caja-diaria", label: "Caja diaria", icon: Banknote, section: "Finanzas", path: "/modulo/caja-diaria" },
  { slug: "reportes", label: "Reportes", icon: TrendingUp, section: "Finanzas", path: "/modulo/reportes" },

  // SISTEMA
  { slug: "imprimibles", label: "Imprimibles", icon: Printer, section: "Sistema", path: "/modulo/imprimibles" },
  { slug: "plantillas", label: "Plantillas", icon: LayoutTemplate, section: "Sistema", path: "/modulo/plantillas" },
  { slug: "configuracion", label: "Configuración", icon: Settings, section: "Sistema", path: "/modulo/configuracion" },
  { slug: "asistente-ia", label: "Asistente IA", icon: Bot, section: "Sistema", path: "/modulo/asistente-ia" },
];

export const SECTIONS = ["Operación", "Comercial", "Abastecimiento", "Finanzas", "Sistema"];

export const getModuleByPath = (pathname) =>
  MODULES.find((m) => m.path === pathname) ||
  MODULES.find((m) => pathname.startsWith(m.path + "/"));

export const getModuleBySlug = (slug) => MODULES.find((m) => m.slug === slug);