import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Trash2, Package, Search, ChevronDown, Eye } from "lucide-react";
import StatusBadge, { STATUS_ORDER } from "@/components/pedidos/StatusBadge";
import StatusSelect from "@/components/pedidos/StatusSelect";
import PedidoForm from "@/components/pedidos/PedidoForm";
import DetallePedidoLocal from "@/components/pedidos/DetallePedidoLocal";

export default function Pedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState("Todos");
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState("desc");
  const [updatingId, setUpdatingId] = useState(null);
  const [detalle, setDetalle] = useState(null);

  const loadPedidos = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Pedido.list();
      setPedidos(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPedidos();
  }, []);

  // "Nueva Venta" abre el formulario automáticamente
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("nuevo") === "1" && !formOpen) {
      setEditing(null);
      setFormOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const filtered = useMemo(() => {
    let list = [...pedidos];
    if (filter !== "Todos") {
      list = list.filter((p) => p.status === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          (p.customer_name || "").toLowerCase().includes(q) ||
          (p.order_id || "").toLowerCase().includes(q) ||
          (p.items_description || "").toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      const da = a.order_date ? new Date(a.order_date).getTime() : 0;
      const db = b.order_date ? new Date(b.order_date).getTime() : 0;
      return sortDir === "desc" ? db - da : da - db;
    });
    return list;
  }, [pedidos, filter, search, sortDir]);

  const handleSave = async (payload) => {
    if (editing) {
      await base44.entities.Pedido.update(editing.id, payload);
    } else {
      // Generar order_id secuencial
      const count = pedidos.length;
      const seqNum = count + 1;
      const orderId = `PED-${String(seqNum).padStart(3, "0")}`;
      await base44.entities.Pedido.create({ ...payload, order_id: orderId, seq: seqNum });
    }
    setFormOpen(false);
    setEditing(null);
    await loadPedidos();
  };

  const handleStatusChange = async (pedido, newStatus) => {
    setUpdatingId(pedido.id);
    try {
      await base44.entities.Pedido.update(pedido.id, { status: newStatus });
      setPedidos((prev) =>
        prev.map((p) => (p.id === pedido.id ? { ...p, status: newStatus } : p))
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (pedido) => {
    if (!confirm(`¿Eliminar el pedido ${pedido.order_id}?`)) return;
    await base44.entities.Pedido.delete(pedido.id);
    setPedidos((prev) => prev.filter((p) => p.id !== pedido.id));
  };

  const openEdit = (pedido) => {
    setEditing(pedido);
    setFormOpen(true);
  };

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const formatDate = (d) => {
    if (!d) return "—";
    try {
      return new Date(d + "T00:00:00").toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return d;
    }
  };

  const formatTotal = (t) => {
    if (t === null || t === undefined || t === "") return "—";
    return Number(t).toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  const counts = useMemo(() => {
    const c = { Todos: pedidos.length };
    STATUS_ORDER.forEach((s) => {
      c[s] = pedidos.filter((p) => p.status === s).length;
    });
    return c;
  }, [pedidos]);

  return (
    <div className="space-y-6">
      {/* Encabezado de página */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Ventas y Pedidos
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Seguimiento y cumplimiento de órdenes · sincronizado con Odoo
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-600 active:scale-[0.98] sm:px-4"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Agregar pedido</span>
          <span className="sm:hidden">Agregar</span>
        </button>
      </div>

      <div>
        {/* Filtros */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {["Todos", ...STATUS_ORDER].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  filter === s
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {s}
                <span
                  className={`rounded-full px-1.5 text-[10px] ${
                    filter === s
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {counts[s] || 0}
                </span>
              </button>
            ))}
          </div>

          <div className="relative sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar pedidos..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            />
          </div>
        </div>

        {/* Tabla en desktop */}
        <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white md:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Cliente</th>
                <th
                  className="cursor-pointer select-none px-4 py-3"
                  onClick={() =>
                    setSortDir((d) => (d === "desc" ? "asc" : "desc"))
                  }
                >
                  <span className="inline-flex items-center gap-1">
                    Fecha
                    <ChevronDown
                      className={`h-3 w-3 transition-transform ${
                        sortDir === "asc" ? "rotate-180" : ""
                      }`}
                    />
                  </span>
                </th>
                <th className="px-4 py-3">Artículos</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-sm text-slate-400">
                    Cargando pedidos...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <Package className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                    <p className="text-sm text-slate-400">
                      {pedidos.length === 0
                        ? "No hay pedidos todavía. Creá el primero."
                        : "No se encontraron pedidos con los filtros actuales."}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="group text-sm transition hover:bg-slate-50/60"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700">
                      {p.order_id || "—"}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {p.customer_name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(p.order_date)}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-slate-600">
                      {p.items_description || "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {formatTotal(p.total)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusSelect
                        status={p.status}
                        onChange={(s) => handleStatusChange(p, s)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setDetalle(p)}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          title="Ver detalle"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEdit(p)}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Lista en mobile */}
        <div className="space-y-3 md:hidden">
          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-400">
              Cargando pedidos...
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-12 text-center">
              <Package className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm text-slate-400">
                {pedidos.length === 0
                  ? "No hay pedidos todavía."
                  : "Sin resultados."}
              </p>
            </div>
          ) : (
            filtered.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-medium text-slate-500">
                        {p.order_id}
                      </span>
                      <StatusBadge status={p.status} />
                    </div>
                    <h3 className="mt-1.5 truncate font-medium text-slate-900">
                      {p.customer_name}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatDate(p.order_date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">
                      {formatTotal(p.total)}
                    </p>
                  </div>
                </div>
                {p.items_description && (
                  <p className="mt-2 truncate text-sm text-slate-600">
                    {p.items_description}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                  <StatusSelect
                    status={p.status}
                    onChange={(s) => handleStatusChange(p, s)}
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={() => setDetalle(p)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      title="Ver detalle"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => openEdit(p)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(p)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <PedidoForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSave={handleSave}
        pedido={editing}
      />

      <DetallePedidoLocal pedido={detalle} onClose={() => setDetalle(null)} />
    </div>
  );
}