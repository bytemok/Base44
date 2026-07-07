import React, { useState, useMemo } from "react";
import { useOdoo } from "@/hooks/useOdoo";
import { base44 } from "@/api/base44Client";
import { Search, Inbox, Printer, Tags, FileText, CheckSquare, Square, Loader2 } from "lucide-react";

const ESTADOS = {
  assigned: { label: "Listo", cls: "bg-amber-50 text-amber-700" },
  confirmed: { label: "Confirmado", cls: "bg-blue-50 text-blue-700" },
  waiting: { label: "En espera", cls: "bg-slate-100 text-slate-600" },
  draft: { label: "Borrador", cls: "bg-slate-100 text-slate-500" },
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
    return data.filter(
      (r) =>
        (r.referencia || "").toLowerCase().includes(t) ||
        (r.origen || "").toLowerCase().includes(t) ||
        (r.proveedor || "").toLowerCase().includes(t) ||
        (r.productos || []).some((p) => (p.producto || "").toLowerCase().includes(t))
    );
  }, [data, q]);

  const toggle = (id) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const selectedIds = useMemo(() => Array.from(selected), [selected]);
  const allSel = filtered.length > 0 && filtered.every((r) => selected.has(r.picking_id));
  const toggleAll = () =>
    setSelected((prev) => {
      if (filtered.every((r) => prev.has(r.picking_id))) return new Set();
      const n = new Set(prev);
      filtered.forEach((r) => n.add(r.picking_id));
      return n;
    });

  const printUrl = (report) => `${odooUrl}/report/pdf/${report}/${selectedIds.join(",")}`;

  const recibir = async () => {
    if (!selectedIds.length) return;
    if (!confirm(`¿Dar ingreso a ${selectedIds.length} recepción(es)? Se validan en Odoo.`)) return;
    setRecibiendo(true);
    try {
      const res = await base44.functions.invoke("odoo", { resource: "recibir_pickings", ids: selectedIds });
      const d = res.data || {};
      const ok = d.ok || [];
      const fallidos = d.fallidos || [];
      if (fallidos.length) {
        alert(
          `Ingresadas: ${ok.length}. Fallidas: ${fallidos.length}\n` +
            fallidos.map((f) => f.id + ": " + f.error).join("\n")
        );
      } else {
        alert(`Ingreso confirmado: ${ok.length} recepción(es).`);
      }
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
          <p className="mt-1 text-sm text-slate-500">
            Ingresos pendientes desde proveedores · filtrar por origen (S0…)
          </p>
        </div>
        <div className="relative sm:w-72">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por origen, producto, proveedor..."
            className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-2 text-sm outline-none focus:border-slate-400"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
        <button onClick={toggleAll} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700">
          {allSel ? <CheckSquare className="h-4 w-4 text-emerald-600" /> : <Square className="h-4 w-4 text-slate-400" />}
          {selectedIds.length ? `${selectedIds.length} seleccionada(s)` : "Seleccionar todas"}
        </button>
        <div className="flex-1" />
        <button
          onClick={recibir}
          disabled={!selectedIds.length || recibiendo}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-40"
        >
          {recibiendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckSquare className="h-4 w-4" />}
          Dar ingreso
        </button>
        {odooUrl && selectedIds.length > 0 && (
          <>
            <a
              href={printUrl("stock.report_picking")}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <FileText className="h-4 w-4" /> Remito
            </a>
            <a
              href={printUrl("stock.report_delivery_label")}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
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
        <div className="space-y-3">
          {filtered.map((r) => {
            const e = ESTADOS[r.estado] || { label: r.estado, cls: "bg-slate-100 text-slate-600" };
            const sel = selected.has(r.picking_id);
            return (
              <div key={r.picking_id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <button onClick={() => toggle(r.picking_id)} className="mt-0.5">
                    {sel ? <CheckSquare className="h-5 w-5 text-emerald-600" /> : <Square className="h-5 w-5 text-slate-300" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-medium text-slate-500">{r.referencia}</span>
                      {r.origen && (
                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                          Origen: {r.origen}
                        </span>
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${e.cls}`}>{e.label}</span>
                    </div>
                    <p className="mt-1 font-medium text-slate-900">{r.proveedor || "—"}</p>
                    <p className="text-xs text-slate-500">
                      {r.fecha || "—"}
                      {r.ubicacion ? ` · ${r.ubicacion}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {odooUrl && r.order_id && (
                      <a
                        href={`${odooUrl}/report/pdf/sale.report_saleorder/${r.order_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        <Printer className="h-3.5 w-3.5" /> Orden venta
                      </a>
                    )}
                    {odooUrl && !r.order_id && r.po_id && (
                      <a
                        href={`${odooUrl}/report/pdf/purchase.report_purchaseorder/${r.po_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        <Printer className="h-3.5 w-3.5" /> Orden compra
                      </a>
                    )}
                  </div>
                </div>
                {r.productos?.length > 0 && (
                  <div className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-100">
                    {r.productos.map((p, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-1.5 text-sm">
                        <span className="truncate text-slate-700">{p.producto}</span>
                        <span className="ml-3 shrink-0 text-xs text-slate-500">
                          {p.qty} {p.uom}
                        </span>
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