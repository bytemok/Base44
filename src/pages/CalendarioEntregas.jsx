import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useOdoo } from "@/hooks/useOdoo";
import { Printer, FileText, Package, Eye, Tags, CalendarDays, MessageCircle, CheckCircle2, MapPin } from "lucide-react";
import DetallePedido from "@/components/erp/DetallePedido";
import { ZONE_ORDER, ZONE_STYLE, ZONE_BLOCK } from "@/lib/zonas";

const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const safeParse = (s) => {
  try { return JSON.parse(s || "[]"); } catch { return []; }
};

const RESENA = `Hola, ¿cómo estás? Te escribimos de Todo en Muebles. Queríamos saber si quedaste conforme con el producto recibido. Respondé con una opción:
1. Muy satisfecho
2. Satisfecho
3. Poco satisfecho
4. No satisfecho
Gracias por tu compra y por ayudarnos a mejorar.`;

const waNumber = (tel) => {
  let n = (tel || "").replace(/\D/g, "");
  if (!n) return "";
  if (n.startsWith("549")) return n;
  if (n.startsWith("54") && n.length >= 12) return n;
  if (n.startsWith("9")) return "54" + n;
  if (n.startsWith("0")) n = n.slice(1);
  if (n.length === 10 && n.startsWith("11")) return "549" + n;
  return "549" + n;
};
const waLink = (num, text) => (num ? `https://wa.me/${num}?text=${encodeURIComponent(text)}` : "");
const fmtFecha = (s) => {
  if (!s) return "";
  const f = new Date(s + "T00:00:00");
  return f.toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
};

export default function CalendarioEntregas() {
  const { data, meta, loading, error } = useOdoo("entregas_calendario");
  const odooUrl = meta?.odoo_url || "";
  const [selected, setSelected] = useState(new Set());
  const [detalleOrderId, setDetalleOrderId] = useState(null);
  const [zonaFiltro, setZonaFiltro] = useState("Todas");

  // Mantener estado: marcar Entregada a las que ya salieron en Odoo
  useEffect(() => {
    if (loading || error) return;
    const toUpdate = (data || []).filter((r) => r.enviada && r.estado === "Programada");
    if (toUpdate.length) {
      Promise.all(
        toUpdate.map((r) => base44.entities.EntregaProgramada.update(r.id, { estado: "Entregada" }))
      ).catch(() => {});
    }
  }, [data, loading, error]);

  const zonasDisponibles = useMemo(() => {
    const presentes = new Set((data || []).map((r) => r.zona || "Sin zona"));
    return [
      "Todas",
      ...ZONE_ORDER.filter((z) => presentes.has(z)),
      ...Array.from(presentes).filter((z) => !ZONE_ORDER.includes(z)),
    ];
  }, [data]);

  const visibles = useMemo(
    () => (zonaFiltro === "Todas" ? data || [] : (data || []).filter((r) => (r.zona || "Sin zona") === zonaFiltro)),
    [data, zonaFiltro]
  );

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
    const byDay = {};
    visibles.forEach((r) => {
      const z = r.zona || "Sin zona";
      const key = r.fecha_entrega || "Sin fecha";
      (byDay[key] = byDay[key] || {});
      (byDay[key][z] = byDay[key][z] || []).push(r);
    });
    return Object.keys(byDay)
      .sort((a, b) => (a === "Sin fecha" ? 1 : b === "Sin fecha" ? -1 : a.localeCompare(b)))
      .map((fecha) => {
        const zones = Object.keys(byDay[fecha])
          .sort((a, b) => {
            const ia = ZONE_ORDER.indexOf(a), ib = ZONE_ORDER.indexOf(b);
            return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
          })
          .map((z) => ({ zona: z, items: byDay[fecha][z] }));
        const total = zones.reduce((s, z) => s + z.items.length, 0);
        return { fecha, zones, total };
      });
  }, [visibles]);

  const enviadasCount = (data || []).filter((r) => r.enviada).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Calendario de Entregas</h1>
          <p className="mt-1 text-sm text-slate-500">
            Entregas coordinadas · {(data || []).length} totales · {enviadasCount} enviadas
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

      {/* Filtro por zona */}
      <div className="flex flex-wrap gap-2">
        {zonasDisponibles.map((z) => (
          <button
            key={z}
            onClick={() => setZonaFiltro(z)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              zonaFiltro === z ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {z}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Error: {error}</div>
      ) : grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 py-16 text-slate-400">
          <CalendarDays className="h-8 w-8" />
          <p className="text-sm">No hay entregas coordinadas</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((g) => (
            <div key={g.fecha}>
              <div className="mb-3 flex items-center justify-center gap-3">
                <span className="rounded-full bg-[#131722] px-3.5 py-1 text-xs font-medium text-white">
                  {g.fecha === "Sin fecha"
                    ? "Sin fecha"
                    : (() => {
                        const f = new Date(g.fecha + "T00:00:00");
                        const wd = f.toLocaleDateString("es-AR", { weekday: "long" });
                        const d = f.toLocaleDateString("es-AR", { day: "2-digit" });
                        const m = f.toLocaleDateString("es-AR", { month: "long" });
                        return `${wd}, ${d} de ${m}`;
                      })()}
                </span>
                <span className="text-xs text-slate-400">{g.total} entrega(s) · {g.zones.length} zona(s)</span>
              </div>
              <div className="space-y-4">
                {g.zones.map((zg) => {
                  const blk = ZONE_BLOCK[zg.zona] || ZONE_BLOCK["Sin zona"];
                  return (
                  <div key={zg.zona} className={`overflow-hidden rounded-2xl border border-slate-200 border-l-4 bg-white ${blk.accent}`}>
                    <div className={`flex items-center justify-between px-4 py-2.5 ${blk.band}`}>
                      <span className={`inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold ring-1 ${ZONE_STYLE[zg.zona] || ZONE_STYLE["Sin zona"]}`}>
                        <MapPin className="h-3 w-3" /> {zg.zona}
                      </span>
                      <span className="text-xs font-medium text-slate-500">{zg.items.length} entrega(s)</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {zg.items.map((r) => {
                        const invIds = safeParse(r.invoice_ids);
                        const pickIds = safeParse(r.picking_ids);
                        const wa = waNumber(r.telefono);
                        return (
                          <div
                            key={r.id}
                            className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between"
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={selected.has(r.id)}
                                onChange={() => toggle(r.id)}
                                className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600"
                              />
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono text-xs font-medium text-slate-500">{r.order_ref}</span>
                                  {r.enviada ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-200">
                                      <CheckCircle2 className="h-3 w-3" /> Enviada
                                    </span>
                                  ) : r.listo ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200">
                                      Listo para entregar
                                    </span>
                                  ) : null}
                                </div>
                                <p className="font-medium text-slate-900">{r.cliente}</p>
                                <p className="text-xs text-slate-500">
                                  {fmt.format(r.total)} · {invIds.length} factura(s) · {pickIds.length} transferencia(s)
                                </p>
                                {r.ciudad && <p className="text-xs text-slate-400">{r.ciudad}{r.transporte ? ` · ${r.transporte}` : ""}</p>}
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
                              {wa && r.enviada && (
                                <a
                                  href={waLink(wa, RESENA)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                                >
                                  <MessageCircle className="h-3.5 w-3.5" /> Pedir Reseña
                                </a>
                              )}
                              {wa && !r.enviada && (
                                <a
                                  href={waLink(wa, `Hola ${r.cliente}! Te confirmamos la entrega de tu pedido ${r.order_ref} para el ${fmtFecha(r.fecha_entrega)}. Cualquier consulta, estamos a tu disposición. Todo en Muebles.`)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-green-500 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-green-600"
                                >
                                  <MessageCircle className="h-3.5 w-3.5" /> Confirmar fecha
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
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