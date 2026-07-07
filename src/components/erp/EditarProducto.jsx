import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Loader2 } from "lucide-react";

const inputClass =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100";

export default function EditarProducto({ product, onClose, onSaved }) {
  const [form, setForm] = useState({
    nombre: product.nombre || "",
    codigo: product.codigo || "",
    barcode: product.barcode || "",
    precio: product.precio || 0,
    publicado: !!product.publicado,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const save = async () => {
    setSaving(true);
    setErr(null);
    try {
      await base44.functions.invoke("odoo", {
        resource: "guardar_producto",
        product_id: product.product_id,
        tmpl_id: product.tmpl_id,
        nombre: form.nombre,
        default_code: form.codigo,
        barcode: form.barcode,
        precio: form.precio,
        publicado: form.publicado,
      });
      onSaved();
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || "Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Editar producto</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {err && (
          <div className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{err}</div>
        )}

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
            <input
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Código</label>
              <input
                value={form.codigo}
                onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Código de barras</label>
              <input
                value={form.barcode}
                onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Precio</label>
            <input
              type="number"
              step="0.01"
              value={form.precio}
              onChange={(e) => setForm((f) => ({ ...f, precio: e.target.value }))}
              className={inputClass}
            />
          </div>
          <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
            <span className="text-sm font-medium text-slate-700">Publicado en catálogo web</span>
            <input
              type="checkbox"
              checked={form.publicado}
              onChange={(e) => setForm((f) => ({ ...f, publicado: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Guardar
          </button>
        </div>
      </div>
    </div>
  );
}