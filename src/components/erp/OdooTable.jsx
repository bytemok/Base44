import React, { useState, useMemo } from "react";
import { Search, RefreshCw, Inbox, Eye } from "lucide-react";
import { useOdoo } from "@/hooks/useOdoo";
import DetallePedido from "@/components/erp/DetallePedido";

export default function OdooTable({ resource, title, subtitle, columns, searchKeys = [], limit, detailIdKey }) {
  const { data, loading, error, reload } = useOdoo(resource, limit);
  const [q, setQ] = useState("");
  const [detalleId, setDetalleId] = useState(null);

  const filtered = useMemo(() => {
    if (!q.trim()) return data;
    const t = q.toLowerCase();
    return data.filter((row) => searchKeys.some((k) => String(row[k] ?? "").toLowerCase().includes(t)));
  }, [data, q, searchKeys]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar..."
              className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 sm:w-64"
            />
          </div>
          <button
            onClick={reload}
            disabled={loading}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
            title="Actualizar"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Error al consultar Odoo: {error}
        </div>
      ) : loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 py-16 text-slate-400">
          <Inbox className="h-8 w-8" />
          <p className="text-sm">Sin datos para mostrar</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-slate-200 md:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  {columns.map((c) => (
                    <th key={c.key} className="px-4 py-3 font-medium">{c.label}</th>
                  ))}
                  {detailIdKey && <th className="px-4 py-3 text-right font-medium">Detalle</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row, i) => (
                  <tr
                    key={i}
                    onClick={detailIdKey ? () => setDetalleId(row[detailIdKey]) : undefined}
                    className={`hover:bg-slate-50 ${detailIdKey ? "cursor-pointer" : ""}`}
                  >
                    {columns.map((c) => (
                      <td key={c.key} className={`px-4 py-3 text-slate-700 ${c.className || ""}`}>
                        {c.render ? c.render(row) : row[c.key]}
                      </td>
                    ))}
                    {detailIdKey && (
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setDetalleId(row[detailIdKey])}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          <Eye className="h-3.5 w-3.5" /> Ver
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2 md:hidden">
            {filtered.map((row, i) => (
              <div
                key={i}
                onClick={detailIdKey ? () => setDetalleId(row[detailIdKey]) : undefined}
                className={`rounded-xl border border-slate-200 bg-white p-3 ${detailIdKey ? "cursor-pointer hover:border-slate-300 active:bg-slate-50" : ""}`}
              >
                {columns.map((c) => (
                  <div key={c.key} className="flex justify-between gap-3 py-0.5">
                    <span className="text-xs text-slate-400">{c.label}</span>
                    <span className={`text-right text-sm text-slate-700 ${c.className || ""}`}>
                      {c.render ? c.render(row) : row[c.key]}
                    </span>
                  </div>
                ))}
                {detailIdKey && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setDetalleId(row[detailIdKey]); }}
                    className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <Eye className="h-3.5 w-3.5" /> Ver detalle
                  </button>
                )}
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-400">
            {filtered.length} de {data.length} registros · Sincronizado con Odoo
          </p>
        </>
      )}

      {detalleId && <DetallePedido orderId={detalleId} onClose={() => setDetalleId(null)} />}
    </div>
  );
}