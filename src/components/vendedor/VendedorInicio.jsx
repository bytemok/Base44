import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Boxes, PlusCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import VendedorCard from "./VendedorCard";

const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export default function VendedorInicio() {
  const [ventas, setVentas] = useState([]);
  const [senas, setSenas] = useState([]);
  useEffect(() => { Promise.all([base44.entities.VendedorVenta.list("-created_date", 100), base44.entities.VendedorSena.list("-created_date", 100)]).then(([v, s]) => { setVentas(v || []); setSenas(s || []); }); }, []);
  const today = new Date().toISOString().slice(0, 10);
  const metricas = useMemo(() => ({ ventasHoy: ventas.filter((v) => v.fecha === today).length, senasHoy: senas.filter((s) => s.fecha === today).reduce((sum, s) => sum + (Number(s.monto) || 0), 0) + ventas.filter((v) => v.fecha === today).reduce((sum, v) => sum + (Number(v.sena_monto) || 0), 0) }), [ventas, senas, today]);
  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-semibold text-slate-900">Panel vendedor</h1><p className="mt-1 text-sm text-slate-500">Solo ventas y stock disponible.</p></div>
      <div className="grid gap-3 sm:grid-cols-2"><VendedorCard title="Ventas cargadas hoy" value={metricas.ventasHoy} detail="Órdenes registradas por tu usuario" /><VendedorCard title="Señas registradas hoy" value={fmt.format(metricas.senasHoy)} detail="Reservas cargadas en ventas nuevas" /></div>
      <div className="grid gap-3 sm:grid-cols-2"><Link to="/vendedor/nueva-venta" className="flex items-center justify-center gap-2 rounded-md bg-violet-700 px-5 py-4 font-semibold text-white hover:bg-violet-800"><PlusCircle className="h-5 w-5" /> Nueva venta</Link><Link to="/vendedor/stock" className="flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-5 py-4 font-semibold text-slate-700 hover:bg-slate-50"><Boxes className="h-5 w-5" /> Stock disponible</Link></div>
    </div>
  );
}