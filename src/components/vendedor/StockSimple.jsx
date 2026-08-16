import React, { useEffect, useMemo, useState } from "react";
import { Search, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";

const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export default function StockSimple() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const load = async () => {
    setLoading(true);
    const res = await base44.functions.invoke("odoo", { resource: "control_stock", limit: 500 });
    setRows(res.data?.data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  const filtered = useMemo(() => rows.filter((p) => (p.esperado || 0) > 0 && ((p.nombre || "").toLowerCase().includes(q.toLowerCase()) || (p.codigo || "").toLowerCase().includes(q.toLowerCase()))), [rows, q]);
  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Stock disponible</h1>
        <p className="mt-1 text-sm text-slate-500">Solo productos con unidades disponibles para vender.</p>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto..." className="w-full rounded-md border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" /></div>
        <button onClick={load} className="rounded-md border border-slate-200 bg-white px-3 text-slate-500"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button>
      </div>
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <div className="grid grid-cols-[1fr_90px_100px] gap-3 border-b border-slate-100 px-4 py-3 text-xs font-semibold uppercase text-slate-400 md:grid-cols-[1fr_100px_160px_120px]"><span>Producto</span><span>Cantidad</span><span className="hidden md:block">Ubicación</span><span>Precio venta</span></div>
        {loading ? <p className="p-6 text-center text-sm text-slate-400">Cargando stock...</p> : filtered.map((p) => <div key={p.product_id} className="grid grid-cols-[1fr_90px_100px] gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-0 md:grid-cols-[1fr_100px_160px_120px]"><span className="font-medium text-slate-800">{p.nombre}</span><span>{p.esperado ?? 0}</span><span className="hidden text-slate-500 md:block">Stock</span><span className="font-semibold text-slate-900">{fmt.format(p.precio || 0)}</span></div>)}
      </div>
    </div>
  );
}