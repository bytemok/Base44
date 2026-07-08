import React, { useState, useEffect, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useOdoo } from "@/hooks/useOdoo";
import { Calendar, Check, Loader2, ClipboardList, MapPin, Eye } from "lucide-react";
import { ZONE_ORDER, ZONE_STYLE, ZONE_BLOCK } from "@/lib/zonas";
import DetallePedido from "@/components/erp/DetallePedido";

const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

const defaultDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

export default function PedidosCoordinar() {
  const { data, loading, error } = useOdoo("ventas");
  const [coordinadas, setCoordinadas] = useState([]);
  const [fechas, setFechas] = useState({});
  const [saving, setSaving] = useState(null);
  const [detalleId, setDetalleId] = useState(null);

  const loadCoord = useCallback(async () => {
    try {
      const recs = await base44.entities.EntregaProgramada.list();
      setCoordinadas(Array.isArray(recs) ? recs : []);
    } catch (e) {}
  }, []);

  useEffect(() => {
    loadCoord();
  }, [loadCoord]);

  const yaCoordinados = useMemo(() => new Set(coordinadas.map((c) => c.order_ref)), [coordinadas]);
  const pendientes = useMemo(
    () => data.filter((r) => !yaCoordinados.has(r.id) && r.listo),
    [data, yaCoordinados]
  );

  const grouped = useMemo(() => {
    const byZone = {};
    pendientes.forEach((r) => {
      const z = r.zona || "Sin zona";
      (byZone[z] = byZone[z] || []).push(r);
    });
    return Object.keys(byZone)
      .sort((a, b) => {
        const ia = ZONE_ORDER.indexOf(a), ib = ZONE_ORDER.indexOf(b);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      })
      .map((z) => ({ zona: z, items: byZone[z] }));
  }, [pendientes]);

  const coordinar = async (r) => {
    const fecha = fechas[r.id] || defaultDate();
    setSaving(r.id);
    try {
      await base44.entities.EntregaProgramada.create({
        order_ref: r.id,
        cliente: r.cliente,
        total: r.total,
        fecha_entrega: fecha,
        odoo_order_id: r.db_id,
        invoice_ids: JSON.stringify(r.invoice_ids || []),
        picking_ids: JSON.stringify(r.picking_ids || []),
        estado: "Programada",
      });
      try {
        await base44.functions.invoke("odoo", {
          resource: "coordinar_pedido",
          order_id: r.db_id,
          fecha,
        });
      } catch (e) {
        alert("No se pudo actualizar la fecha de entrega en Odoo: " + (e?.message || e));
      }
      await loadCoord();
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Pedidos a coordinar</h1>
        <p className="mt-1 text-sm text-slate-500">
          Pedidos con entradas validadas y stock disponible, listos para entregar · {grouped.length} zona(s)
        </p>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Error: {error}</div>
      ) : pendientes.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 py-16 text-slate-400">
          <ClipboardList className="h-8 w-8" />
          <p className="text-sm">No hay pedidos listos para coordinar</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((zg) => {
            const blk = ZONE_BLOCK[zg.zona] || ZONE_BLOCK["Sin zona"];
            return (
              <div key={zg.zona} className={`overflow-hidden rounded-2xl border border-slate-200 border-l-4 bg-white ${blk.accent}`}>
                <div className={`flex items-center justify-between px-4 py-2.5 ${blk.band}`}>
                  <span className={`inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold ring-1 ${ZONE_STYLE[zg.zona] || ZONE_STYLE["Sin zona"]}`}>
                    <MapPin className="h-3 w-3" /> {zg.zona}
                  </span>
                  <span className="text-xs font-medium text-slate-500">{zg.items.length} pedido(s)</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {zg.items.map((r) => (
                    <div
                      key={r.id}
                      className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-medium text-slate-500">{r.id}</span>
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">Listo para entregar</span>
                          {r.ciudad && <span className="text-xs text-slate-400">{r.ciudad}</span>}
                        </div>
                        <p className="mt-1 truncate font-medium text-slate-900">{r.cliente}</p>
                        <p className="text-xs text-slate-500">
                          Orden: {r.fecha} · {r.transferencias} transferencia(s) · {fmt.format(r.total)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setDetalleId(r.db_id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                        >
                          <Eye className="h-4 w-4" /> Detalle
                        </button>
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <input
                          type="date"
                          value={fechas[r.id] || defaultDate()}
                          onChange={(e) => setFechas((f) => ({ ...f, [r.id]: e.target.value }))}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                        />
                        <button
                          onClick={() => coordinar(r)}
                          disabled={saving === r.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
                        >
                          {saving === r.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          Coordinar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {detalleId && <DetallePedido orderId={detalleId} onClose={() => setDetalleId(null)} />}
    </div>
  );
}