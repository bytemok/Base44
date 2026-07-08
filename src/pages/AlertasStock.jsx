import React, { useMemo } from "react";
import { useOdoo } from "@/hooks/useOdoo";
import { AlertTriangle, Package, Inbox } from "lucide-react";

const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export default function AlertasStock() {
  const { data, meta, loading, error, reload } = useOdoo("alertas_stock");

  const totalFaltante = useMemo(() => (data || []).reduce((s, p) => s + (p.faltante || 0), 0), [data]);
  const valorFaltante = useMemo(() => (data || []).reduce((s, p) => s + (p.faltante || 0) * (p.precio || 0), 0), [data]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Alertas de Stock</h1>
          <p className="mt-1 text-sm text-slate-500">Productos con stock negativo detectados tras despachos o conteos · {(data || []).length} faltantes</p>
        </div>
        <button onClick={reload} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
          <AlertTriangle className="h-4 w-4" /> Actualizar
        </button>
      </div>

      {(data || []).length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-xs text-rose-600">Productos faltantes</p>
            <p className="mt-1 text-2xl font-semibold text-rose-700">{data.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-400">Unidades faltantes</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{totalFaltante}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-400">Valor en juego</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{fmt.format(valorFaltante)}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Error: {error}</div>
      ) : (data || []).length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 py-16 text-emerald-600">
          <Package className="h-8 w-8" />
          <p className="text-sm font-medium">Sin faltantes detectados · el stock está al día</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Producto</th>
                <th className="px-4 py-2.5 text-right">Faltante</th>
                <th className="px-4 py-2.5 text-right">Stock actual</th>
                <th className="px-4 py-2.5 text-right">Precio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((p) => (
                <tr key={p.product_id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-slate-900">{p.nombre}</p>
                    {p.codigo && <p className="font-mono text-xs text-slate-400">{p.codigo}</p>}
                    {p.atributos?.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {p.atributos.map((a, i) => (
                          <span key={i} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{a.atributo}: {a.valor}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
                      <AlertTriangle className="h-3 w-3" /> {p.faltante}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-rose-600">{p.stock}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{fmt.format(p.precio)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}