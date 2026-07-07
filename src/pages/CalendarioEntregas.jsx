import React, { useState, useEffect, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useOdoo } from "@/hooks/useOdoo";
import { Printer, FileText, Package, Eye, Tags, CalendarDays } from "lucide-react";
import DetallePedido from "@/components/erp/DetallePedido";

const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const safeParse = (s) => {
  try {
    return JSON.parse(s || "[]");
  } catch {
    return [];
  }
};

export default function CalendarioEntregas() {
  const { data: sinEntregar, meta, loading: sinLoading, error: sinError } = useOdoo("ventas");
  const odooUrl = meta?.odoo_url || "";

  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [detalleOrderId, setDetalleOrderId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await base44.entities.EntregaProgramada.list("-fecha_entrega");
      setRecs(Array.isArray(list) ? list : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-limpieza: si una orden dejó de estar "sin entregar" (se entregó en Odoo), marcar Entregada
  const sinEntregarRefs = useMemo(() => new Set(sinEntregar.map((s) => s.id)), [sinEntregar]);
  useEffect(() => {
    if (sinLoading || sinError) return;
    if (!recs.length) return;
    const toUpdate = recs.filter(
      (r) => r.estado === "Programada" && !sinEntregarRefs.has(r.order_ref)
    );
    if (toUpdate.length) {
      Promise.all(
        toUpdate.map((r) =>
          base44.entities.EntregaProgramada.update(r.id, { estado: "Entregada" })
        )
      ).then(() => load());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sinEntregarRefs, sinLoading, sinError]);

  const programadas = useMemo(() => recs.filter((r) => r.estado === "Programada"), [recs]);

  // Solo entregas listas para entregar (stock disponible / entradas validadas en Odoo)
  const listoMap = useMemo(() => {
    const m = {};
    sinEntregar.forEach((s) => { m[s.id] = !!s.listo; });
    return m;
  }, [sinEntregar]);

  const visibles = useMemo(() => {
    if (sinLoading || sinError) return programadas;
    return programadas.filter((r) => listoMap[r.order_ref]);
  }, [programadas, listoMap, sinLoading, sinError]);

  const toggle = (id) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const allInvoiceIds = useMemo(() => {
    const ids = [];
    visibles.forEach((r) => {
      if (selected.has(r.id)) safeParse(r.invoice_ids).forEach((i) => ids.push(i));
    });
    return ids;
  }, [visibles, selected]);

  const printMasivo = () => {
    if (!allInvoiceIds.length || !odooUrl) return;
    window.open(
      `${odooUrl}/report/pdf/account.report_invoice_with_payments/${allInvoiceIds.join(",")}`,
      "_blank"
    );
  };

  const grouped = useMemo(() => {
    const m = {};
    visibles.forEach((r) => {
      (m[r.fecha_entrega] = m[r.fecha_entrega] || []).push(r);
    });
    return Object.keys(m)
      .sort()
      .map((k) => ({ fecha: k, items: m[k] }));
  }, [visibles]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Calendario de Entregas</h1>
          <p className="mt-1 text-sm text-slate-500">
            Entregas listas para entregar · {visibles.length} pendientes
          </p>
        </div>
        <button
          onClick={printMasivo}
          disabled={!allInvoiceIds.length}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40"
        >
          <Printer className="h-4 w-4" /> Imprimir facturas ({allInvoiceIds.length})
        </button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
        </div>
      ) : visibles.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 py-16 text-slate-400">
          <CalendarDays className="h-8 w-8" />
          <p className="text-sm">No hay entregas listas para entregar</p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map((g) => (
            <div key={g.fecha}>
              <div className="mb-3 flex justify-center">
                <span className="rounded-full bg-[#131722] px-3.5 py-1 text-xs font-medium text-white">
                  {(() => {
                    const f = new Date(g.fecha + "T00:00:00");
                    const wd = f.toLocaleDateString("es-AR", { weekday: "long" });
                    const d = f.toLocaleDateString("es-AR", { day: "2-digit" });
                    const m = f.toLocaleDateString("es-AR", { month: "long" });
                    return `${wd}, ${d} de ${m}`;
                  })()}
                </span>
              </div>
              <div className="space-y-2">
                {g.items.map((r) => {
                  const invIds = safeParse(r.invoice_ids);
                  const pickIds = safeParse(r.picking_ids);
                  return (
                    <div
                      key={r.id}
                      className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selected.has(r.id)}
                          onChange={() => toggle(r.id)}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600"
                        />
                        <div>
                          <span className="font-mono text-xs font-medium text-slate-500">
                            {r.order_ref}
                          </span>
                          <p className="font-medium text-slate-900">{r.cliente}</p>
                          <p className="text-xs text-slate-500">
                            {fmt.format(r.total)} · {invIds.length} factura(s) · {pickIds.length}{" "}
                            transferencia(s)
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setDetalleOrderId(r.odoo_order_id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          <Eye className="h-3.5 w-3.5" /> Detalle
                        </button>
                        {odooUrl && invIds.length > 0 && (
                          <a
                            href={`${odooUrl}/report/pdf/account.report_invoice_with_payments/${invIds.join(",")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          >
                            <FileText className="h-3.5 w-3.5" /> Factura
                          </a>
                        )}
                        {odooUrl && pickIds.length > 0 && (
                          <>
                            <a
                              href={`${odooUrl}/report/pdf/stock.report_picking/${pickIds.join(",")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            >
                              <Package className="h-3.5 w-3.5" /> Remito
                            </a>
                            <a
                              href={`${odooUrl}/report/pdf/stock.report_delivery_label/${pickIds.join(",")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            >
                              <Tags className="h-3.5 w-3.5" /> Etiquetas
                            </a>
                          </>
                        )}
                        {odooUrl && (
                          <a
                            href={`${odooUrl}/report/pdf/sale.report_saleorder/${r.odoo_order_id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          >
                            <Printer className="h-3.5 w-3.5" /> Orden
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {detalleOrderId && (
        <DetallePedido orderId={detalleOrderId} onClose={() => setDetalleOrderId(null)} />
      )}
    </div>
  );
}