import React from "react";
import { X, User, Calendar, Package, Wallet, StickyNote } from "lucide-react";
import StatusBadge from "@/components/pedidos/StatusBadge";

const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0, maximumFractionDigits: 2 });

const fmtFecha = (d) => {
  if (!d) return "—";
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return d;
  }
};

function Fila({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-100 px-3 py-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="break-words font-medium text-slate-800">{value || "—"}</p>
      </div>
    </div>
  );
}

export default function DetallePedidoLocal({ pedido, onClose }) {
  if (!pedido) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Detalle del pedido {pedido.order_id || ""}</h2>
            <p className="text-xs text-slate-500">Vista completa del registro</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-medium text-slate-600">{pedido.order_id || "—"}</span>
            <StatusBadge status={pedido.status} />
          </div>

          <Fila icon={User} label="Cliente" value={pedido.customer_name} />
          <Fila icon={Calendar} label="Fecha del pedido" value={fmtFecha(pedido.order_date)} />
          <Fila icon={Wallet} label="Total" value={pedido.total != null && pedido.total !== "" ? fmt.format(Number(pedido.total)) : "—"} />

          <div className="rounded-lg border border-slate-100 px-3 py-2.5">
            <div className="mb-1.5 flex items-center gap-2 text-xs text-slate-400">
              <Package className="h-4 w-4" /> Artículos
            </div>
            <p className="whitespace-pre-line break-words text-sm text-slate-800">{pedido.items_description || "—"}</p>
          </div>

          {pedido.notas && (
            <div className="rounded-lg border border-slate-100 px-3 py-2.5">
              <div className="mb-1.5 flex items-center gap-2 text-xs text-slate-400">
                <StickyNote className="h-4 w-4" /> Notas
              </div>
              <p className="whitespace-pre-line break-words text-sm text-slate-800">{pedido.notas}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}