import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, Loader2, FileText, Package, Printer, Tags } from "lucide-react";

const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const ESTADO = { sale: "Confirmado", done: "Hecho", draft: "Borrador", sent: "Enviado", cancel: "Cancelado" };
const PICK = { done: "Hecho", assigned: "Listo", confirmed: "Confirmado", waiting: "En espera", draft: "Borrador" };
const PAGO = { paid: "Pagada", not_paid: "Impaga", partial: "Parcial", reversed: "Revertida" };

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-medium text-slate-800">{value || "—"}</p>
    </div>
  );
}

export default function DetallePedido({ orderId, onClose }) {
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    base44.functions
      .invoke("odoo", { resource: "detalle", order_id: orderId })
      .then((res) => {
        if (alive) setD(res.data?.data);
      })
      .catch((e) => {
        if (alive) setError(e?.response?.data?.error || e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [orderId]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Detalle del pedido {d?.order?.name || ""}
            </h2>
            <p className="text-xs text-slate-500">Vista completa desde Odoo</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
          </div>
        ) : error ? (
          <div className="p-5 text-sm text-red-600">Error: {error}</div>
        ) : d ? (
          <div className="space-y-5 p-5">
            <div className="flex flex-wrap gap-2">
              {d.print.factura && (
                <a
                  href={d.print.factura}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                >
                  <FileText className="h-3.5 w-3.5" /> Factura
                </a>
              )}
              {d.print.remito && (
                <a
                  href={d.print.remito}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  <Package className="h-3.5 w-3.5" /> Remito / Operaciones
                </a>
              )}
              {d.print.etiquetas && (
                <a
                  href={d.print.etiquetas}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  <Tags className="h-3.5 w-3.5" /> Etiquetas
                </a>
              )}
              {d.print.orden_venta && (
                <a
                  href={d.print.orden_venta}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  <Printer className="h-3.5 w-3.5" /> Orden de venta
                </a>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 p-4 text-sm">
              <Info label="Cliente" value={d.order.cliente} />
              <Info label="Entregar a" value={d.order.entrega_a} />
              <Info label="Fecha" value={d.order.fecha} />
              <Info label="Estado" value={ESTADO[d.order.estado] || d.order.estado} />
              <Info label="Facturación" value={d.order.facturacion} />
              <Info label="Plazo de pago" value={d.order.plazo_pago} />
              <Info label="Vendedor" value={d.order.vendedor} />
              <Info label="Transporte" value={d.order.transporte} />
              <Info label="Ref. cliente" value={d.order.ref_cliente} />
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Líneas del pedido
              </h3>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Producto</th>
                      <th className="px-3 py-2 text-right">Cant.</th>
                      <th className="px-3 py-2 text-right">Entreg.</th>
                      <th className="px-3 py-2 text-right">Precio</th>
                      <th className="px-3 py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {d.lines.map((l, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2">
                          <p className="font-medium text-slate-800">{l.producto || "—"}</p>
                          <p className="text-xs text-slate-400">{l.descripcion}</p>
                          {l.atributos?.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {l.atributos.map((a, j) => (
                                <span key={j} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                                  {a.atributo}: {a.valor}
                                </span>
                              ))}
                            </div>
                          )}
                          {l.observacion && (
                            <div className="mt-1">
                              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200">Patas: {l.observacion}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">{l.cantidad}</td>
                        <td className="px-3 py-2 text-right">{l.entregado}</td>
                        <td className="px-3 py-2 text-right">{fmt.format(l.precio)}</td>
                        <td className="px-3 py-2 text-right font-medium">{fmt.format(l.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 flex flex-wrap justify-end gap-6 text-sm">
                <span className="text-slate-500">
                  Base: <b className="text-slate-800">{fmt.format(d.order.base)}</b>
                </span>
                <span className="text-slate-500">
                  Impuestos: <b className="text-slate-800">{fmt.format(d.order.impuestos)}</b>
                </span>
                <span className="text-slate-800">
                  Total: <b>{fmt.format(d.order.total)}</b>
                </span>
              </div>
            </div>

            {d.pickings.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Transferencias / Entregas
                </h3>
                <div className="space-y-2">
                  {d.pickings.map((p, i) => (
                    <div
                      key={i}
                      className="flex justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-medium text-slate-800">{p.nombre}</p>
                        <p className="text-xs text-slate-400">
                          Origen: {p.origen || "—"} → {p.destino || "—"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">{p.fecha}</p>
                        <span className="text-xs font-medium text-slate-700">
                          {PICK[p.estado] || p.estado}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {d.invoices.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Facturas
                </h3>
                <div className="space-y-2">
                  {d.invoices.map((inv, i) => (
                    <div
                      key={i}
                      className="flex justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-medium text-slate-800">{inv.numero}</p>
                        <p className="text-xs text-slate-400">{inv.fecha}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{fmt.format(inv.total)}</p>
                        <span className="text-xs text-slate-500">
                          Saldo {fmt.format(inv.saldo)} · {PAGO[inv.pago] || inv.pago}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {d.order.notas && (
              <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                <p className="mb-1 text-xs font-semibold uppercase text-slate-400">Notas</p>
                {d.order.notas}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}