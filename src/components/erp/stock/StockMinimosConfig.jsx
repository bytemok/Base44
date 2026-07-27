import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { BellRing, Save, Settings } from "lucide-react";

export default function StockMinimosConfig({ productos = [], loadingProductos = false }) {
  const [configs, setConfigs] = useState([]);
  const [productId, setProductId] = useState("");
  const [minimo, setMinimo] = useState("");
  const [saving, setSaving] = useState(false);

  const productMap = useMemo(() => {
    const map = {};
    productos.forEach((p) => { if (p.product_id) map[p.product_id] = p; });
    return map;
  }, [productos]);

  const loadConfigs = async () => {
    const rows = await base44.entities.StockCriticoConfig.list("producto");
    setConfigs(rows || []);
  };

  useEffect(() => { loadConfigs(); }, []);

  const saveConfig = async (e) => {
    e.preventDefault();
    const id = Number(productId);
    const nivel = Number(minimo);
    if (!id || Number.isNaN(nivel)) return;
    setSaving(true);
    const p = productMap[id] || {};
    const payload = {
      product_id: id,
      producto: p.nombre || `Producto ${id}`,
      codigo: p.codigo || "",
      nivel_minimo: nivel,
      activo: true,
    };
    const existing = configs.find((c) => Number(c.product_id) === id);
    if (existing) await base44.entities.StockCriticoConfig.update(existing.id, payload);
    else await base44.entities.StockCriticoConfig.create(payload);
    setProductId("");
    setMinimo("");
    await loadConfigs();
    setSaving(false);
  };

  const toggleConfig = async (row) => {
    await base44.entities.StockCriticoConfig.update(row.id, { activo: !row.activo, alerta_activa: false });
    await loadConfigs();
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-lg bg-amber-50 p-2 text-amber-700"><BellRing className="h-5 w-5" /></div>
        <div>
          <h2 className="font-semibold text-slate-900">Mínimos críticos por producto</h2>
          <p className="text-sm text-slate-500">Configura manualmente el nivel mínimo; el flujo revisa Odoo cada hora.</p>
        </div>
      </div>

      <form onSubmit={saveConfig} className="grid gap-3 sm:grid-cols-[1fr_160px_auto]">
        <div>
          <input list="productos-stock" value={productId} onChange={(e) => setProductId(e.target.value)} placeholder={loadingProductos ? "Cargando productos..." : "ID del producto Odoo"} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <datalist id="productos-stock">
            {productos.map((p) => <option key={p.product_id} value={p.product_id}>{p.nombre} {p.codigo ? `· ${p.codigo}` : ""}</option>)}
          </datalist>
        </div>
        <input type="number" value={minimo} onChange={(e) => setMinimo(e.target.value)} placeholder="Mínimo" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          <Save className="h-4 w-4" /> Guardar
        </button>
      </form>

      <div className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-100">
        {configs.length === 0 ? (
          <div className="flex items-center gap-2 p-3 text-sm text-slate-500"><Settings className="h-4 w-4" /> Sin mínimos configurados.</div>
        ) : configs.map((row) => (
          <div key={row.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-slate-900">{row.producto}</p>
              <p className="text-xs text-slate-500">ID {row.product_id}{row.codigo ? ` · ${row.codigo}` : ""} · mínimo {row.nivel_minimo}</p>
            </div>
            <button onClick={() => toggleConfig(row)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
              {row.activo ? "Desactivar" : "Activar"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}