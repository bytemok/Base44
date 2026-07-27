import React, { useMemo, useState } from "react";
import { Filter } from "lucide-react";

const pedidoWords = ["pedido", "pedidos", "venta", "ventas", "coordinar", "entrega", "entregas", "detalle"];

const isPedidoLog = (row) => {
  const text = [row.resource, row.action, row.source, row.record_ref, row.pedido_ref]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return pedidoWords.some((word) => text.includes(word));
};

const formatDate = (row) => (row.created_at || row.created_date || "").slice(0, 16).replace("T", " ");

export default function AuditoriaPedidos({ rows = [], loading = false }) {
  const [userFilter, setUserFilter] = useState("todos");
  const [actionFilter, setActionFilter] = useState("todos");

  const pedidoRows = useMemo(() => rows.filter(isPedidoLog), [rows]);
  const users = useMemo(() => Array.from(new Set(pedidoRows.map((r) => r.user_email || r.user_name || "Sistema"))).sort(), [pedidoRows]);
  const actions = useMemo(() => Array.from(new Set(pedidoRows.map((r) => r.action || "sin acción"))).sort(), [pedidoRows]);

  const filtered = useMemo(() => pedidoRows.filter((r) => {
    const user = r.user_email || r.user_name || "Sistema";
    const action = r.action || "sin acción";
    return (userFilter === "todos" || user === userFilter) && (actionFilter === "todos" || action === actionFilter);
  }), [pedidoRows, userFilter, actionFilter]);

  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Cambios en pedidos</h2>
          <p className="text-sm text-slate-500">Filtra eventos de pedidos por usuario o tipo de acción.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
          <Filter className="h-3.5 w-3.5" /> {filtered.length} eventos
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
          <option value="todos">Todos los usuarios</option>
          {users.map((user) => <option key={user} value={user}>{user}</option>)}
        </select>
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
          <option value="todos">Todas las acciones</option>
          {actions.map((action) => <option key={action} value={action}>{action}</option>)}
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
        <div className="grid grid-cols-[140px_1fr_150px_1fr] gap-3 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase text-slate-500">
          <span>Fecha</span><span>Usuario</span><span>Acción</span><span>Pedido / origen</span>
        </div>
        {loading ? (
          <div className="p-4 text-sm text-slate-500">Cargando eventos...</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-sm text-slate-500">No hay cambios de pedidos para esos filtros.</div>
        ) : filtered.map((row) => (
          <div key={row.id} className="grid grid-cols-[140px_1fr_150px_1fr] gap-3 border-t border-slate-100 px-3 py-2 text-sm">
            <span className="text-slate-500">{formatDate(row)}</span>
            <span className="truncate text-slate-900">{row.user_email || row.user_name || "Sistema"}</span>
            <span className="truncate text-slate-700">{row.action || "sin acción"}</span>
            <span className="truncate text-slate-500">{row.record_ref || row.resource || "—"} · {row.source || "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}