import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { STATUS_ORDER } from "./StatusBadge";

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100";

export default function PedidoForm({ open, onClose, onSave, pedido }) {
  const isEdit = !!pedido;
  const [form, setForm] = useState({
    customer_name: "",
    order_date: new Date().toISOString().slice(0, 10),
    items_description: "",
    total: "",
    status: "Nuevo",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (pedido) {
      setForm({
        customer_name: pedido.customer_name || "",
        order_date: pedido.order_date || new Date().toISOString().slice(0, 10),
        items_description: pedido.items_description || "",
        total: pedido.total ?? "",
        status: pedido.status || "Nuevo",
      });
    } else {
      setForm({
        customer_name: "",
        order_date: new Date().toISOString().slice(0, 10),
        items_description: "",
        total: "",
        status: "Nuevo",
      });
    }
  }, [pedido, open]);

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        customer_name: form.customer_name.trim(),
        order_date: form.order_date,
        items_description: form.items_description.trim(),
        total: form.total === "" ? 0 : Number(form.total),
        status: form.status,
      };
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {isEdit ? "Editar pedido" : "Agregar pedido"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Nombre del cliente
            </label>
            <input
              name="customer_name"
              value={form.customer_name}
              onChange={handleChange}
              required
              placeholder="Ej. María González"
              className={inputClass}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Fecha
              </label>
              <input
                type="date"
                name="order_date"
                value={form.order_date}
                onChange={handleChange}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Total
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="total"
                value={form.total}
                onChange={handleChange}
                placeholder="0.00"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Artículos
            </label>
            <textarea
              name="items_description"
              value={form.items_description}
              onChange={handleChange}
              rows={2}
              placeholder="Ej. 2x Camiseta, 1x Pantalón"
              className={`${inputClass} resize-none`}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Estado
            </label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className={inputClass}
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear pedido"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}