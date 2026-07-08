import React, { useState, useMemo } from "react";
import { useOdoo } from "@/hooks/useOdoo";
import { base44 } from "@/api/base44Client";
import { Search, Loader2, PackagePlus, Truck, CheckCircle2, XCircle, ShoppingCart, ExternalLink, Layers } from "lucide-react";

const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 });

export default function Compras() {
  const { data, loading, error, reload } = useOdoo("sugerencias_compra");
  const { data: proveedores } = useOdoo("proveedores", 300);

  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [qtys, setQtys] = useState({});
  const [supSel, setSupSel] = useState({});
  const [generating, setGenerating] = useState(false);
  const [resultados, setResultados] = useState(null);

  const proveedorNombre = (id) => (proveedores || []).find((p) => p.id === id)?.nombre || "";

  const filtered = useMemo(() => {
    if (!q.trim()) return data;
    const t = q.toLowerCase();
    return data.filter((r) => [r.nombre, r.codigo, r.barcode, r.proveedor].join(" ").toLowerCase().includes(t));
  }, [data, q]);

  const totalSeleccionado = useMemo(
    () => (data || []).filter((r) => selected.has(r.product_id)).reduce((s, r) => s + (qtys[r.product_id] ?? r.sugerido) * (r.costo || 0), 0),
    [data, selected, qtys]
  );

  const toggle = (id) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const selectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((r) => r.product_id)));
  };

  const generar = async () => {
    const rows = (data || []).filter((r) => selected.has(r.product_id));
    const bySupplier = {};
    rows.forEach((r) => {
      const sid = supSel[r.product_id] || r.proveedor_id;
      if (!sid) return;
      (bySupplier[sid] = bySupplier[sid] || []).push({
        product_id: r.product_id,
        qty: Number(qtys[r.product_id] ?? r.sugerido) || 0,
        price: r.costo || 0,
      });
    });
    const sinProveedor = rows.filter((r) => !(supSel[r.product_id] || r.proveedor_id));
    if (!rows.length) return;
    const res = [];
    setGenerating(true);
    for (const [sidStr, lineas] of Object.entries(bySupplier)) {
      const sid = Number(sidStr);
      try {
        const r = await base44.functions.invoke("odoo", { resource: "generar_orden_compra", partner_id: sid, lineas });
        res.push({ proveedor: proveedorNombre(sid), ok: true, name: r.data?.name, order_id: r.data?.order_id, url: r.data?.odoo_url, lineas: lineas.length });
      } catch (e) {
        res.push({ proveedor: proveedorNombre(sid), ok: false, error: e?.message || "Error" });
      }
    }
    sinProveedor.forEach((r) => res.push({ proveedor: "—", ok: false, error: `Sin proveedor: ${r.nombre}` }));
    setResultados(res);
    setGenerating(false);
    setSelected(new Set());
    setQtys({});
    setSupSel({});
    reload();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Compras</h1>
          <p className="mt-1 text-sm text-slate-500">
            Sugerencias de reposición según stock y reglas de reaprovisionamiento · {filtered.length} producto(s)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative sm:w-64">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Producto, código, proveedor..."
              className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-2 text-sm outline-none focus:border-slate-400"
            />
          </div>
          <button
            onClick={generar}
            disabled={!selected.size || generating}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}
            Generar OC ({selected.size})
          </button>
        </div>
      </div>

      {totalSeleccionado > 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
          Total seleccionado: {fmt.format(totalSeleccionado)}
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Error: {error}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 py-16 text-slate-400">
          <ShoppingCart className="h-8 w-8" />
          <p className="text-sm">No hay productos que requieran reposición</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-3"><input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={selectAll} className="h-4 w-4 rounded border-slate-300 text-slate-900" /></th>
                  <th className="px-3 py-3">Producto</th>
                  <th className="px-3 py-3 text-right">Stock</th>
                  <th className="px-3 py-3 text-center">Sugerido</th>
                  <th className="px-3 py-3 text-right">Costo</th>
                  <th className="px-3 py-3">Proveedor</th>
                  <th className="px-3 py-3">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => (
                  <tr key={r.product_id} className={selected.has(r.product_id) ? "bg-slate-50" : "hover:bg-slate-50"}>
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={selected.has(r.product_id)}
                        onChange={() => toggle(r.product_id)}
                        className="h-4 w-4 rounded border-slate-300 text-slate-900"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-slate-900">{r.nombre}</p>
                      <p className="font-mono text-xs text-slate-400">{r.codigo || r.barcode || "—"}</p>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={`font-semibold ${r.stock <= 0 ? "text-red-600" : "text-slate-700"}`}>{r.stock}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        type="number"
                        min="1"
                        value={qtys[r.product_id] ?? r.sugerido}
                        onChange={(e) => setQtys((m) => ({ ...m, [r.product_id]: e.target.value }))}
                        className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-center text-sm outline-none focus:border-slate-400"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-600">{r.costo ? fmt.format(r.costo) : "—"}</td>
                    <td className="px-3 py-2.5">
                      <select
                        value={supSel[r.product_id] ?? r.proveedor_id ?? ""}
                        onChange={(e) => setSupSel((m) => ({ ...m, [r.product_id]: Number(e.target.value) || null }))}
                        className="w-40 rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-slate-400"
                      >
                        <option value="">{r.proveedor || "Sin proveedor"}</option>
                        {(proveedores || []).map((p) => (
                          <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-500">{r.motivo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {resultados && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setResultados(null)}>
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Órdenes de compra generadas</h2>
              <button onClick={() => setResultados(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">×</button>
            </div>
            <div className="space-y-2">
              {resultados.map((r, i) => (
                <div key={i} className={`rounded-xl border p-3 ${r.ok ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {r.ok ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
                      <div>
                        <p className="font-medium text-slate-900">{r.ok ? r.name : r.proveedor}</p>
                        <p className="text-xs text-slate-500">
                          {r.ok ? `${r.proveedor} · ${r.lineas} línea(s)` : r.error}
                        </p>
                      </div>
                    </div>
                    {r.ok && r.url && (
                      <a href={`${r.url}/web#action=purchase.purchase_form_action&view_type=form&id=${r.order_id}`} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800">
                        Ver en Odoo <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setResultados(null)} className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}