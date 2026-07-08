import React, { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, RefreshCw, Inbox, Download } from "lucide-react";
import { useOdoo } from "@/hooks/useOdoo";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { estadoDe } from "@/components/erp/ventas/VentasTable";
import VentasTable from "@/components/erp/ventas/VentasTable";
import DetallePedido from "@/components/erp/DetallePedido";
import { downloadCSV } from "@/lib/csvExport";

const TABS = [
  { id: "lista", label: "Lista para Entregar", filter: (r) => r.sin_entregar && r.listo },
  { id: "pendiente", label: "Pendiente de Preparar", filter: (r) => r.sin_entregar && !r.listo },
  { id: "entregados", label: "Entregados", filter: (r) => r.entregado },
];

export default function Ventas() {
  const { data, loading, error, reload } = useOdoo("ventas", undefined, { fresh: true });
  const [tab, setTab] = useState("pendiente");
  const [q, setQ] = useState("");
  const [sp, setSp] = useSearchParams();
  const detalleId = sp.get("detail");
  usePullToRefresh(reload);

  const rows = useMemo(() => {
    const f = TABS.find((t) => t.id === tab)?.filter || (() => true);
    let out = data.filter(f);
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
    const rows = data.map((r) => [
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Ventas</h1>
          <p className="mt-1 text-sm text-slate-500">Órdenes confirmadas · Odoo</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar pedido o cliente..."
              className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 sm:w-64"
            />
          </div>
          <button onClick={handleExport} disabled={loading || !data.length} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-50" title="Exportar a Excel">
            <Download className="h-4 w-4" />
          </button>
          <button onClick={reload} disabled={loading} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-50" title="Actualizar">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition ${tab === t.id ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            {t.label}
          </button>
        ))}
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
          <VentasTable rows={rows} onOpen={openDetalle} />
          <p className="text-xs text-slate-400">{rows.length} registros · Sincronizado con Odoo</p>
        </>
      )}

      {detalleId && <DetallePedido orderId={detalleId} onClose={closeDetalle} />}
    </div>
  );
}