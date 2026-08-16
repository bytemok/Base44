import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

const ALLOWED = ["/ventas", "/vendedor/nueva-venta", "/vendedor/stock", "/catalogo-precios"];

export default function VendedorRouteGuard() {
  const { user } = useAuth();
  const location = useLocation();
  const role = String(user?.role || "").toLowerCase();
  const allowed = ALLOWED.some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`));
  if (role === "vendedor" && !allowed) return <Navigate to="/ventas" replace />;
  return <Outlet />;
}