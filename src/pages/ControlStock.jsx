import React, { useState, useMemo, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import {
  ScanLine, Plus, Minus, RefreshCw, Loader2, CheckCircle2,
  AlertTriangle, PackageSearch, ClipboardCheck, Trash2,
} from "lucide-react";

export default function ControlStock() {
  const [catalogo, setCatalogo] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [escaneos, setEscaneos] = useState({}); // { [barcode]: contado }
  const [desconocidos, setDesconocidos] = useState([]);
  const [input, setInput] = useState("");
  const [soloDiff, setSoloDiff] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const inputRef = useRef(null);

  const odooUrl = meta?.odoo_url || "";

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("odoo", { resource: "control_stock", limit: 500 });
      setCatalogo(res.data?.data || []);
      setMeta(res.data || null);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const porBarcode = useMemo(() => {
    const m = {};
    catalogo.forEach((p) => { if (p.barcode) m[p.barcode] = p; });
    return m;
  }, [catalogo]);

  const filas = useMemo(() => {
    const map = {}; // product_id -> { product_id, nombre, barcode, esperado, contado }
    catalogo.forEach((p) => {
      if (p.esperado > 0 || escaneos[p.barcode]) {
        map[p.product_id] = {
          product_id: p.product_id,
          nombre: p.nombre,
          barcode: p.barcode || "",
          esperado: p.esperado || 0,
          contado: escaneos[p.barcode] || 0,
        };
      }
    });
    Object.entries(escaneos).forEach(([, cant]) => {}); // ya incluidos vía esperado>0
    let arr = Object.values(map);
    if (soloDiff) arr = arr.filter((f) => f.contado !== f.esperado);
    arr.sort((a, b) => Math.abs(b.contado - b.esperado) - Math.abs(a.contado - a.esperado));
    return arr;
  }, [catalogo, escaneos, soloDiff]);

  const totales = useMemo(() => {
    let sobrante = 0, faltante = 0, exactos = 0, escaneados = 0;
    catalogo.forEach((p) => {
      const c = escaneos[p.barcode] || 0;
      const e = p.esperado || 0;
      if (c > 0) escaneados++;
      if (e > 0 || c > 0) {
        const d = c - e;
        if (d > 0) sobrante++;
        else if (d < 0) faltante++;
        else if (c > 0) exactos++;
      }
    });
    return { sobrante, faltante, exactos, escaneados };
  }, [catalogo, escaneos]);

  const handleScan = (e) => {
    e.preventDefault();
    const code = input.trim();
    if (!code) return;
    const prod = porBarcode[code];
    if (prod) {
      setEscaneos((p) => ({ ...p, [code]: (p[code] || 0) + 1 }));
      setResultado(null);
    } else {
      setDesconocidos((d) => (d.includes(code) ? d : [...d, code]));
    }
    setInput("");
  };

  const setCount = (barcode, val) => {
    const n = Math.max(0, Number(val) || 0);
    setEscaneos((p) => ({ ...p, [barcode]: n }));
    setResultado(null);
  };
  const inc = (barcode, delta) => setEscaneos((p) => ({ ...p, [barcode]: Math.max(0, (p[barcode] || 0) + delta) }));

  const aplicar = async () => {
    const cambios = filas.filter((f) => f.contado !== f.esperado).map((f) => ({ product_id: f.product_id, contado: f.contado }));
    if (!cambios.length) { alert("No hay diferencias para aplicar."); return; }
    if (!confirm(`Se actualizará el stock de ${cambios.length} producto(s) en Odoo. ¿Confirmar?`)) return;
    setAplicando(true);
    setResultado(null);
    try {
      const res = await base44.functions.invoke("odoo", { resource: "control_stock_aplicar", conteo: cambios });
      const data = res.data || {};
      const resultados = data.resultados || [];
      const ok = resultados.filter((r) => r.ok);
      const fallidos = resultados.filter((r) => !r.ok);
      setResultado({ ok: ok.length, fallidos, total: cambios.length });
      await load();
    } catch (e) {
      alert("Error: " + (e?.message || e));
    } finally {
      setAplicando(false);
    }
  };

  const limpiar = () => {
    if (!confirm("¿Borrar todo el conteo?")) return;
    setEscaneos({});
    setDesconocidos([]);
    setResultado(null);
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-5" onClick={() => inputRef.current?.focus()}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Control de Stock</h1>
          <p className="mt-1 text-sm text-slate-500">Escaneá las etiquetas y aplicá el recuento a Odoo</p>
        </div>
        <button onClick={limpiar} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
          <Trash2 className="h-4 w-4" /> Limpiar
        </button>
      </div>

      {/* Escáner */}
      <form onSubmit={handleScan} className="rounded-2xl border border-slate-200 bg-white p-4">
        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
          <ScanLine className="h-4 w-4 text-emerald-600" /> Escanear código de barras
        </label>
        <div className="relative">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enfocá el lector o escribí el código..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-lg outline-none focus:border-emerald-400 focus:bg-white"
          />
        </div>
        {desconocidos.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="text-xs font-medium text-amber-600">No encontrados:</span>
            {desconocidos.map((c) => (
              <span key={c} className="rounded bg-amber-50 px-1.5 py-0.5 font-mono text-[11px] text-amber-700">{c}</span>
            ))}
          </div>
        )}
      </form>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-400">Escaneados</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{totales.escaneados}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs text-emerald-600">Sobrantes</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-700">+{totales.sobrante}</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-xs text-red-500">Faltantes</p>
          <p className="mt-1 text-2xl font-semibold text-red-600">−{totales.faltante}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-400">Exactos</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{totales.exactos}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
        <button onClick={() => setSoloDiff((v) => !v)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${soloDiff ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
          <AlertTriangle className="h-4 w-4" /> {soloDiff ? "Solo diferencias" : "Ver todo"}
        </button>
        <div className="flex-1" />
        <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
          <RefreshCw className="h-4 w-4" /> Refrescar stock
        </button>
        <button
          onClick={aplicar}
          disabled={aplicando}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-40"
        >
          {aplicando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
          Aplicar a Odoo
        </button>
      </div>

      {resultado && (
        <div className={`rounded-xl border p-4 text-sm ${resultado.fallidos.length ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          <p className="font-medium">
            {resultado.fallidos.length
              ? `Aplicadas: ${resultado.ok} · Fallidas: ${resultado.fallidos.length}`
              : `Stock actualizado: ${resultado.ok} producto(s).`}
          </p>
          {resultado.fallidos.length > 0 && (
            <ul className="mt-2 space-y-1">
              {resultado.fallidos.map((f, i) => (
                <li key={i} className="font-mono text-xs">ID {f.product_id}: {f.error}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Error: {error}</div>
      ) : filas.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 py-16 text-slate-400">
          <PackageSearch className="h-8 w-8" />
          <p className="text-sm">Escané productos para ver el recuento</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filas.map((f) => {
            const diff = f.contado - f.esperado;
            const badge = diff > 0
              ? { txt: `Sobrante +${diff}`, cls: "bg-emerald-50 text-emerald-700" }
              : diff < 0
              ? { txt: `Faltante ${diff}`, cls: "bg-red-50 text-red-600" }
              : { txt: "Exacto", cls: "bg-slate-100 text-slate-500" };
            return (
              <div key={f.product_id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{f.nombre}</p>
                  <p className="text-xs text-slate-400">
                    Esperado: <span className="font-medium text-slate-600">{f.esperado}</span>
                    {f.barcode && <span> · {f.barcode}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => inc(f.barcode, -1)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <input
                    value={f.contado}
                    onChange={(e) => setCount(f.barcode, e.target.value)}
                    className="w-12 rounded-lg border border-slate-200 py-1 text-center text-sm font-semibold outline-none focus:border-emerald-400"
                  />
                  <button onClick={() => inc(f.barcode, 1)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <span className={`w-24 shrink-0 rounded-full px-2 py-1 text-center text-xs font-medium ${badge.cls}`}>{badge.txt}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}