import React, { useState, useMemo } from "react";
import { useOdoo } from "@/hooks/useOdoo";
import { Search, Send, FileText, Tags, Printer, Inbox, MessageCircle, Eye } from "lucide-react";
import DetallePedido from "@/components/erp/DetallePedido";

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

export default function PedidosEnviados() {
  const { data, meta, loading, error } = useOdoo("enviados");
  const odooUrl = meta?.odoo_url || "";
  const [q, setQ] = useState("");
  const [detalleId, setDetalleId] = useState(null);

  const filtered = useMemo(() => {
    if (!q.trim()) return data;
    const t = q.toLowerCase();
    return data.filter((r) =>
      [r.referencia, r.origen, r.cliente, r.destino, ...(r.productos || []).map((p) => p.producto)]
        .join(" ").toLowerCase().includes(t)
    );
  }, [data, q]);

  const printRemito = (r) => (odooUrl ? `${odooUrl}/report/pdf/stock.report_picking/${r.picking_id}` : "");
  const printEtiquetas = (r) => (odooUrl ? `${odooUrl}/report/pdf/stock.report_delivery_label/${r.picking_id}` : "");
  const printOrden = (r) => (odooUrl && r.order_id ? `${odooUrl}/report/pdf/sale.report_saleorder/${r.order_id}` : "");

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Pedidos enviados</h1>
          <p className="mt-1 text-sm text-slate-500">Transferencias de salida confirmadas · {filtered.length}</p>
        </div>
        <div className="relative sm:w-72">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cliente, origen, producto..."
            className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-2 text-sm outline-none focus:border-slate-400"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Error: {error}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 py-16 text-slate-400">
          <Send className="h-8 w-8" />
          <p className="text-sm">No hay pedidos enviados confirmados</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((r) => (
            <div
              key={r.picking_id}
              onClick={r.order_id ? () => setDetalleId(r.order_id) : undefined}
              className={`rounded-xl border border-slate-200 bg-white p-4 ${r.order_id ? "cursor-pointer hover:border-slate-300" : ""}`}
            >
              <div className="flex items-start gap-3" onClick={(e) => e.stopPropagation()}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">Confirmado</span>
                    <span className="font-mono text-xs text-slate-400">{r.referencia}</span>
                    {r.origen && (
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">{r.origen}</span>
                    )}
                  </div>
                  <p className="mt-1.5 font-semibold text-slate-900">{r.cliente || "—"}</p>
                  <p className="text-xs text-slate-400">{r.fecha}{r.destino ? ` · ${r.destino}` : ""}</p>
                  {r.contacto && (r.contacto.telefono || r.contacto.email || r.contacto.calle || r.contacto.ciudad) && (
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                      {r.contacto.telefono && <span>📞 {r.contacto.telefono}</span>}
                      {r.contacto.email && <span>✉️ {r.contacto.email}</span>}
                      {r.contacto.calle && <span>📍 {r.contacto.calle}{r.contacto.ciudad ? `, ${r.contacto.ciudad}` : ""}</span>}
                      {r.contacto.cuit && <span>CUIT: {r.contacto.cuit}</span>}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {r.order_id && (
                    <button onClick={() => setDetalleId(r.order_id)} title="Ver detalle del pedido"
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2 py-1 text-xs font-medium text-white hover:bg-slate-800">
                      <Eye className="h-3.5 w-3.5" /> Detalle
                    </button>
                  )}
                  {printOrden(r) && (
                    <a href={printOrden(r)} target="_blank" rel="noreferrer" title="Imprimir orden"
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50">
                      <Printer className="h-3.5 w-3.5" /> Orden
                    </a>
                  )}
                  {printRemito(r) && (
                    <a href={printRemito(r)} target="_blank" rel="noreferrer" title="Imprimir remito"
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50">
                      <FileText className="h-3.5 w-3.5" /> Remito
                    </a>
                  )}
                  {printEtiquetas(r) && (
                    <a href={printEtiquetas(r)} target="_blank" rel="noreferrer" title="Imprimir etiquetas"
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50">
                      <Tags className="h-3.5 w-3.5" /> Etiquetas
                    </a>
                  )}
                  {waNumber(r.telefono) ? (
                    <a href={waLink(waNumber(r.telefono), RESENA)} target="_blank" rel="noreferrer" title="Enviar reseña por WhatsApp"
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700">
                      <MessageCircle className="h-3.5 w-3.5" /> Reseña
                    </a>
                  ) : (
                    <span title="El cliente no tiene teléfono" className="inline-flex items-center gap-1 rounded-lg border border-slate-100 px-2 py-1 text-xs text-slate-300">
                      <MessageCircle className="h-3.5 w-3.5" /> Reseña
                    </span>
                  )}
                </div>
              </div>
              {r.productos?.filter((p) => !/^patas/i.test((p.producto || "").trim()))?.length > 0 && (
                <div className="mt-3 ml-1 divide-y divide-slate-100 rounded-lg border border-slate-100" onClick={(e) => e.stopPropagation()}>
                  {r.productos.filter((p) => !/^patas/i.test((p.producto || "").trim())).map((p, i) => (
                    <div key={i} className="px-3 py-1.5">
                      <div className="flex items-center justify-between">
                        <span className="truncate text-sm text-slate-700">{p.producto}</span>
                        <span className="ml-3 shrink-0 text-xs font-medium text-slate-500">{p.qty} {p.uom}</span>
                      </div>
                      {p.atributos?.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {p.atributos.map((a, j) => (
                            <span key={j} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                              {a.atributo}: {a.valor}
                            </span>
                          ))}
                        </div>
                      )}
                      {p.observacion && (
                        <div className="mt-1">
                          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200">Patas: {p.observacion}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {detalleId && <DetallePedido orderId={detalleId} onClose={() => setDetalleId(null)} />}
    </div>
  );
}