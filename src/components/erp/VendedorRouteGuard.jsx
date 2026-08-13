import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

const ALLOWED = ["/vendedor", "/ventas", "/vendedor/nueva-venta", "/vendedor/stock", "/vendedor/senas"];

export default function VendedorRouteGuard() {
  const { user } = useAuth();
  const location = useLocation();
  const role = String(user?.role || "").toLowerCase();
  const allowed = ALLOWED.some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`));
  if (role === "vendedor" && !allowed) return <Navigate to="/vendedor" replace />;
  return <Outlet />;
}