import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PlusCircle, WalletCards } from "lucide-react";
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
      <div><h1 className="text-2xl font-semibold text-slate-900">Inicio vendedor</h1><p className="mt-1 text-sm text-slate-500">Panel simple para cargar ventas, señas y consultar stock.</p></div>
      <div className="grid gap-3 sm:grid-cols-2"><VendedorCard title="Ventas cargadas hoy" value={metricas.ventasHoy} detail="Órdenes registradas por tu usuario" /><VendedorCard title="Señas registradas hoy" value={fmt.format(metricas.senasHoy)} detail="Incluye señas de ventas nuevas y existentes" /></div>
      <div className="grid gap-3 sm:grid-cols-2"><Link to="/vendedor/nueva-venta" className="flex items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-4 font-semibold text-white"><PlusCircle className="h-5 w-5" /> Nueva Venta</Link><Link to="/vendedor/senas" className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 font-semibold text-slate-700"><WalletCards className="h-5 w-5" /> Registrar Seña</Link></div>
    </div>
  );
}