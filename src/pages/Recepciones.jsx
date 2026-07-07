import React, { useState, useMemo } from "react";
import { useOdoo } from "@/hooks/useOdoo";
import { base44 } from "@/api/base44Client";
import {
  Search, Inbox, FileText, Tags, Printer,
  CheckSquare, Square, Loader2,
} from "lucide-react";

const ESTADOS = {
  assigned: { label: "Listo", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  confirmed: { label: "Confirmado", cls: "bg-blue-50 text-blue-700 ring-blue-200" },
  waiting: { label: "En espera", cls: "bg-slate-100 text-slate-600 ring-slate-200" },
  draft: { label: "Borrador", cls: "bg-slate-100 text-slate-500 ring-slate-200" },
};

export default function Recepciones() {
  const { data, meta, loading, error, reload } = useOdoo("recepciones");
  const odooUrl = meta?.odoo_url || "";
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [recibiendo, setRecibiendo] = useState(false);

  const filtered = useMemo(() => {
    if (!q.trim()) return data;
    const t = q.toLowerCase();
    return data.filter((r) =>
      [r.referencia, r.origen, r.proveedor, ...(r.productos || []).map((p) => p.producto)]
        .join(" ").toLowerCase().includes(t)
    );
  }, [data, q]);

  const ids = useMemo(() => Array.from(selected), [selected]);
  const allSel = filtered.length > 0 && filtered.every((r) => selected.has(r.picking_id));

  const toggle = (id) =>
    setSelected((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const toggleAll = () =>
    setSelected((p) => (filtered.every((r) => p.has(r.picking_id)) ? new Set() : new Set([...p, ...filtered.map((r) => r.picking_id)])));

  const printBulk = (report) => `${odooUrl}/report/pdf/${report}/${ids.join(",")}`;
  const printOrden = (r) =>
    r.order_id ? `${odooUrl}/report/pdf/sale.report_saleorder/${r.order_id}`
      : r.po_id ? `${odooUrl}/report/pdf/purchase.report_purchaseorder/${r.po_id}` : "";

  const recibir = async () => {
    if (!ids.length) return;
    if (!confirm(`¿Dar ingreso a ${ids.length} recepción(es)? Se validan en Odoo.`)) return;
    setRecibiendo(true);
    try {
      const d = (await base44.functions.invoke("odoo", { resource: "recibir_pickings", ids })).data || {};
      const ok = d.ok || [], fallidos = d.fallidos || [];
      alert(fallidos.length
        ? `Ingresadas: ${ok.length} · Fallidas: ${fallidos.length}\n` + fallidos.map((f) => `${f.id}: ${f.error}`).join("\n")
        : `Ingreso confirmado: ${ok.length} recepción(es).`);
      setSelected(new Set());
      reload();
    } catch (e) {
      alert("Error: " + (e?.message || e));
    } finally {
      setRecibiendo(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Recepciones</h1>
          <p className="mt-1 text-sm text-slate-500">Ingresos pendientes · tildá, das ingreso e imprimís</p>
        </div>
        <div className="relative sm:w-72">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Origen, producto, proveedor..."
            className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-2 text-sm outline-none focus:border-slate-400"
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
        <button onClick={toggleAll} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700">
          {allSel ? <CheckSquare className="h-4 w-4 text-emerald-600" /> : <Square className="h-4 w-4 text-slate-400" />}
          {ids.length ? `${ids.length} sel.` : "Todas"}
        </button>
        <div className="flex-1" />
        <button
          onClick={recibir}
          disabled={!ids.length || recibiendo}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-40"
        >
          {recibiendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckSquare className="h-4 w-4" />}
          Dar ingreso
        </button>
        {odooUrl && ids.length > 0 && (
          <>
            <a href={printBulk("stock.report_picking")} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              <FileText className="h-4 w-4" /> Remito
            </a>
            <a href={printBulk("stock.report_delivery_label")} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              <Tags className="h-4 w-4" /> Etiquetas
            </a>
          </>
        )}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Error: {error}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 py-16 text-slate-400">
          <Inbox className="h-8 w-8" />
          <p className="text-sm">No hay recepciones pendientes</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((r) => {
            const e = ESTADOS[r.estado] || { label: r.estado, cls: "bg-slate-100 text-slate-600 ring-slate-200" };
            const sel = selected.has(r.picking_id);
            const ordenUrl = printOrden(r);
            return (
              <div key={r.picking_id} className={`rounded-xl border bg-white p-4 transition ${sel ? "border-emerald-300 bg-emerald-50/30" : "border-slate-200"}`}>
                <div className="flex items-start gap-3">
                  <button onClick={() => toggle(r.picking_id)} className="mt-0.5 shrink-0">
                    {sel ? <CheckSquare className="h-5 w-5 text-emerald-600" /> : <Square className="h-5 w-5 text-slate-300" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${e.cls}`}>{e.label}</span>
                      <span className="font-mono text-xs text-slate-400">{r.referencia}</span>
                      {r.origen && (
                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">{r.origen}</span>
                      )}
                    </div>
                    <p className="mt-1.5 font-semibold text-slate-900">{r.proveedor || "—"}</p>
                    <p className="text-xs text-slate-400">{r.fecha}{r.ubicacion ? ` · ${r.ubicacion}` : ""}</p>
                  </div>
                  {odooUrl && ordenUrl && (
                    <a href={ordenUrl} target="_blank" rel="noreferrer" title="Imprimir orden"
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50">
                      <Printer className="h-3.5 w-3.5" /> Orden
                    </a>
                  )}
                </div>
                {r.productos?.length > 0 && (
                  <div className="mt-3 ml-8 divide-y divide-slate-100 rounded-lg border border-slate-100">
                    {r.productos.map((p, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-1.5 text-sm">
                        <span className="truncate text-slate-700">{p.producto}</span>
                        <span className="ml-3 shrink-0 text-xs font-medium text-slate-500">{p.qty} {p.uom}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}