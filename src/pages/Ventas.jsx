import React, { useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search, RefreshCw, Inbox, Download, ScanLine } from "lucide-react";
import { useOdoo } from "@/hooks/useOdoo";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { estadoDe } from "@/components/erp/ventas/VentasTable";
import VentasTable from "@/components/erp/ventas/VentasTable";
import DetallePedido from "@/components/erp/DetallePedido";
import { downloadCSV } from "@/lib/csvExport";
import { useAuth } from "@/lib/AuthContext";

const TABS = [
  { id: "lista", label: "Lista para Entregar", filter: (r) => r.sin_entregar && r.listo },
  { id: "pendiente", label: "Pendiente de Preparar", filter: (r) => r.sin_entregar && !r.listo },
  { id: "entregados", label: "Entregados", filter: (r) => r.entregado },
];

const uniqueRows = (rows) => {
  const seen = new Set();
  return (rows || []).filter((r) => {
    const key = r.db_id || r.id;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export default function Ventas() {
  const { data, loading, error, reload } = useOdoo("ventas", undefined, { fresh: true });
  const { user } = useAuth();
  const isVendedor = String(user?.role || "").toLowerCase() === "vendedor";
  const [tab, setTab] = useState("pendiente");
  const [q, setQ] = useState("");
  const [sp, setSp] = useSearchParams();
  const detalleId = sp.get("detail");
  usePullToRefresh(reload);

  const rows = useMemo(() => {
    const f = TABS.find((t) => t.id === tab)?.filter || (() => true);
    let out = uniqueRows(data).filter(f);
    if (q.trim()) {
      const t = q.toLowerCase();
      out = out.filter((r) => (r.id || "").toLowerCase().includes(t) || (r.cliente || "").toLowerCase().includes(t));
    }
    return out;
  }, [data, tab, q]);

  const openDetalle = (id) => { const n = new URLSearchParams(sp); n.set("detail", id); setSp(n); };
  const closeDetalle = () => { const n = new URLSearchParams(sp); n.delete("detail"); setSp(n, { replace: true }); };

  const ESTADO_LABEL = { entregado: "Entregado", listo: "Listo", pendiente: "Pendiente" };
  const handleExport = () => {
    const headers = ["Fecha", "Orden", "Cliente", "Teléfono", "Localidad", "Productos", "Total", "Adeudado", "Estado"];
    const rows = uniqueRows(data).map((r) => [
      r.fecha || "",
      r.id || "",
      (r.cliente || "").toUpperCase(),
      r.telefono || "",
      r.ciudad || "",
      (r.productos || []).map((p) => `${p.nombre}${p.qty ? ` (${p.qty})` : ""}${p.entregado ? " ✓" : ""}`).join(" + "),
      r.total || 0,
      r.adeudado || 0,
      ESTADO_LABEL[estadoDe(r)] || "",
    ]);
    const d = new Date();
    const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    downloadCSV(`ventas-${stamp}.csv`, headers, rows);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-t-md border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-slate-900">Órdenes de venta</h1>
            <span className="rounded bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700 ring-1 ring-violet-200">Odoo</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to={isVendedor ? "/vendedor/nueva-venta" : "/punto-venta"} className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-violet-700 px-3 py-2 text-sm font-medium text-white hover:bg-violet-800" title="Crear una venta escaneando códigos de barras">
              <ScanLine className="h-4 w-4" />
              <span className="hidden sm:inline">Nuevo</span>
            </Link>
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar..."
                className="w-full rounded-md border border-slate-300 bg-white pl-8 pr-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 sm:w-72"
              />
            </div>
            <button onClick={handleExport} disabled={loading || !data.length} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50" title="Descargar listado de pedidos">
              <Download className="h-4 w-4" />
              <span>Descargar pedidos</span>
            </button>
            <button onClick={reload} disabled={loading} className="rounded-md border border-slate-300 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50" title="Actualizar">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto px-3 pt-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`whitespace-nowrap rounded-t-md border-x border-t px-3 py-2 text-sm font-medium transition ${tab === t.id ? "border-slate-200 bg-white text-violet-700" : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Error al consultar Odoo: {error}</div>
      ) : loading && !rows.length ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
        </div>
      ) : !rows.length ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 py-16 text-slate-400">
          <Inbox className="h-8 w-8" />
          <p className="text-sm">Sin datos para mostrar</p>
        </div>
      ) : (
        <>
          <VentasTable rows={rows} onOpen={isVendedor ? undefined : openDetalle} compactDelivered={tab === "entregados"} showDebt={!isVendedor} />
          <p className="text-xs text-slate-400">{rows.length} registros · Sincronizado con Odoo</p>
        </>
      )}

      {detalleId && !isVendedor && <DetallePedido orderId={detalleId} onClose={closeDetalle} />}
    </div>
  );
}