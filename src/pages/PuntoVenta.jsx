import React, { useState, useMemo, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { invalidateOdoo } from "@/hooks/useOdoo";
import {
  ScanLine, Search, Plus, Minus, Loader2, CheckCircle2, User, X,
  ShoppingCart, Trash2, Package,
} from "lucide-react";
import EscannerCamara from "@/components/erp/EscannerCamara";

const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export default function PuntoVenta() {
  const [clientes, setClientes] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [partner, setPartner] = useState(null);
  const [clientQuery, setClientQuery] = useState("");
  const [carrito, setCarrito] = useState({}); // product_id -> {product_id, nombre, codigo, barcode, qty, precio, atributos}
  const [prodInput, setProdInput] = useState("");
  const [buscandoCodigo, setBuscandoCodigo] = useState(false);
  const [confirmar, setConfirmar] = useState(true);
  const [creando, setCreando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const prodRef = useRef(null);

  const porCodigo = useMemo(() => {
    const m = {};
    catalogo.forEach((p) => {
      if (p.barcode) m[p.barcode] = p;
      if (p.codigo && !m[p.codigo]) m[p.codigo] = p;
    });
    return m;
  }, [catalogo]);

  const clientesFiltrados = useMemo(() => {
    if (!clientQuery.trim()) return clientes.slice(0, 8);
    const t = clientQuery.toLowerCase();
    return clientes.filter((c) => [c.nombre, c.ref, c.cuit].join(" ").toLowerCase().includes(t)).slice(0, 8);
  }, [clientes, clientQuery]);

  const sugerencias = useMemo(() => {
    const t = prodInput.trim().toLowerCase();
    if (t.length < 2) return [];
    return catalogo.filter((p) => [p.nombre, p.codigo, p.barcode].join(" ").toLowerCase().includes(t)).slice(0, 6);
  }, [catalogo, prodInput]);

  const items = Object.values(carrito);
  const total = useMemo(() => items.reduce((s, p) => s + (Number(p.precio) || 0) * p.qty, 0), [items]);
  const unidades = useMemo(() => items.reduce((s, p) => s + p.qty, 0), [items]);

  useEffect(() => {
    (async () => {
      setCargando(true);
      try {
        const [c, k] = await Promise.all([
          base44.functions.invoke("odoo", { resource: "clientes", limit: 500 }),
          base44.functions.invoke("odoo", { resource: "control_stock", limit: 500 }),
        ]);
        setClientes(c.data?.data || []);
        setCatalogo(k.data?.data || []);
      } catch (e) {
        setError(e?.response?.data?.error || e?.message || "Error al cargar datos");
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  useEffect(() => { if (!cargando && !resultado) prodRef.current?.focus(); }, [cargando, resultado]);

  const agregarProducto = (p) => {
    setCarrito((c) => {
      const prev = c[p.product_id];
      return {
        ...c,
        [p.product_id]: prev
          ? { ...prev, qty: prev.qty + 1 }
          : { product_id: p.product_id, nombre: p.nombre, codigo: p.codigo || "", barcode: p.barcode || "", qty: 1, precio: p.precio || 0, atributos: p.atributos || [] },
      };
    });
    setError(null);
    setProdInput("");
    prodRef.current?.focus();
  };

  const procesarCodigo = async (code) => {
    const codigo = (code || "").trim();
    if (!codigo) return;
    const local = porCodigo[codigo];
    if (local) { agregarProducto(local); return; }
    // No está en el catálogo cargado: buscar exacto en Odoo por barcode o referencia
    setBuscandoCodigo(true);
    try {
      const res = await base44.functions.invoke("odoo", { resource: "buscar_producto", codigo });
      const found = (res.data?.data || [])[0];
      if (found) agregarProducto(found);
      else { setError(`Producto no encontrado: ${codigo}`); setProdInput(""); }
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Error al buscar el producto");
    } finally {
      setBuscandoCodigo(false);
      prodRef.current?.focus();
    }
  };

  const onProdSubmit = (e) => { e.preventDefault(); procesarCodigo(prodInput); };

  const inc = (id, d) => setCarrito((c) => ({ ...c, [id]: { ...c[id], qty: Math.max(1, (c[id]?.qty || 0) + d) } }));
  const setCant = (id, v) => setCarrito((c) => ({ ...c, [id]: { ...c[id], qty: Math.max(1, Number(v) || 1) } }));
  const setPrecio = (id, v) => setCarrito((c) => ({ ...c, [id]: { ...c[id], precio: v } }));
  const quitar = (id) => setCarrito((c) => { const n = { ...c }; delete n[id]; return n; });
  const vaciar = () => setCarrito({});

  const detectCliente = (code) => {
    const match = clientes.find((c) => (c.ref && c.ref === code) || (c.cuit && c.cuit === code));
    if (match) { setPartner(match); setClientQuery(""); setError(null); }
    else { setClientQuery(code); setError(`Cliente no encontrado: ${code}`); }
  };

  const crearVenta = async () => {
    if (!partner) { setError("Seleccioná un cliente para la venta"); return; }
    const lineas = items.filter((p) => p.qty > 0).map((p) => ({ product_id: p.product_id, qty: p.qty, precio: Number(p.precio) || 0 }));
    if (!lineas.length) { setError("Escaneá al menos un producto"); return; }
    setCreando(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("odoo", {
        resource: "crear_venta",
        partner_id: partner.id,
        lineas,
        confirmar,
        nota: "Venta creada desde Punto de Venta",
      });
      setResultado(res.data || {});
      invalidateOdoo("ventas");
      invalidateOdoo("pedidos");
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Error al crear la venta");
    } finally {
      setCreando(false);
    }
  };

  const nuevaVenta = () => {
    setCarrito({});
    setPartner(null);
    setClientQuery("");
    setResultado(null);
    setError(null);
  };

  if (cargando) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
      </div>
    );
  }

  if (resultado) {
    return (
      <div className="mx-auto max-w-lg space-y-4 pt-8">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <p className="text-lg font-semibold text-slate-900">Venta creada en Odoo</p>
          <p className="text-2xl font-bold text-emerald-700">{resultado.name}</p>
          <p className="text-sm text-slate-600">
            Total {fmt.format(resultado.total || 0)} · Estado: {resultado.estado === "sale" ? "Confirmada" : resultado.estado === "draft" ? "Presupuesto" : resultado.estado}
          </p>
          {resultado.confirm_error && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              La orden se creó pero no se pudo confirmar automáticamente: {resultado.confirm_error}
            </p>
          )}
          <button onClick={nuevaVenta} className="mt-2 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700">
            <ScanLine className="h-4 w-4" /> Nueva venta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Punto de Venta</h1>
        <p className="mt-1 text-sm text-slate-500">Escaneá códigos de barras para armar la venta y crearla en Odoo</p>
      </div>

      {/* Cliente */}
      {partner ? (
        <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
            <User className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900">{partner.nombre}</p>
            <p className="text-xs text-slate-500">{partner.ref && <span className="font-mono">{partner.ref}</span>}{partner.cuit && <span> · CUIT {partner.cuit}</span>}</p>
          </div>
          <button onClick={() => setPartner(null)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50">Cambiar</button>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
            <User className="h-4 w-4 text-slate-400" /> Cliente de la venta
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={clientQuery}
                onChange={(e) => setClientQuery(e.target.value)}
                placeholder="Buscar por nombre, código o CUIT..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:bg-white"
              />
            </div>
            <EscannerCamara title="Escanear cliente" label="Cámara" onDetect={detectCliente} />
          </div>
          {clientQuery.trim() && (
            <div className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-100">
              {clientesFiltrados.length === 0 ? (
                <p className="px-3 py-2 text-xs text-slate-400">Sin coincidencias</p>
              ) : clientesFiltrados.map((c) => (
                <button key={c.id} type="button" onClick={() => { setPartner(c); setClientQuery(""); setError(null); }} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50">
                  <span className="truncate text-slate-800">{c.nombre}</span>
                  <span className="ml-2 shrink-0 font-mono text-xs text-slate-400">{c.ref || c.cuit || ""}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Escaneo de productos */}
      <form onSubmit={onProdSubmit} className="rounded-xl border border-slate-200 bg-white p-4">
        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
          <ScanLine className="h-4 w-4 text-emerald-600" /> Escanear código de barras del producto
        </label>
        <div className="flex gap-2">
          <input
            ref={prodRef}
            value={prodInput}
            onChange={(e) => setProdInput(e.target.value)}
            placeholder="Enfocá el lector, escaneá o escribí código / nombre..."
            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 font-mono text-base outline-none focus:border-emerald-400 focus:bg-white"
          />
          {buscandoCodigo && <span className="flex items-center px-1 text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /></span>}
          <EscannerCamara title="Escanear producto" label="Cámara" onDetect={procesarCodigo} />
        </div>
        {sugerencias.length > 0 && (
          <div className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-100">
            {sugerencias.map((p) => (
              <button key={p.product_id} type="button" onClick={() => agregarProducto(p)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50">
                <span className="min-w-0 flex-1 truncate text-slate-800">{p.nombre}</span>
                <span className="ml-2 shrink-0 font-mono text-xs text-slate-400">{p.barcode || p.codigo || ""}</span>
                <span className="ml-3 shrink-0 text-xs font-semibold text-slate-600">{fmt.format(p.precio || 0)}</span>
              </button>
            ))}
          </div>
        )}
      </form>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {/* Carrito */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 py-12 text-slate-400">
          <Package className="h-8 w-8" />
          <p className="text-sm">Todavía no hay productos · escaneá el primero</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">{items.length} producto(s) · {unidades} unidades</p>
            <button onClick={vaciar} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-500">
              <Trash2 className="h-3.5 w-3.5" /> Vaciar
            </button>
          </div>
          {items.map((p) => (
            <div key={p.product_id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{p.nombre}</p>
                <p className="text-xs text-slate-400 font-mono">{p.barcode || p.codigo}</p>
                {p.atributos?.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {p.atributos.map((a, i) => (
                      <span key={i} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{a.atributo}: {a.valor}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => inc(p.product_id, -1)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"><Minus className="h-3.5 w-3.5" /></button>
                <input value={p.qty} onChange={(e) => setCant(p.product_id, e.target.value)} className="w-12 rounded-lg border border-slate-200 py-1 text-center text-sm font-semibold outline-none focus:border-emerald-400" />
                <button onClick={() => inc(p.product_id, 1)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"><Plus className="h-3.5 w-3.5" /></button>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-400">$</span>
                <input value={p.precio} onChange={(e) => setPrecio(p.product_id, e.target.value)} className="w-24 rounded-lg border border-slate-200 py-1 px-2 text-right text-sm outline-none focus:border-emerald-400" />
              </div>
              <p className="w-24 text-right text-sm font-semibold text-slate-900">{fmt.format((Number(p.precio) || 0) * p.qty)}</p>
              <button onClick={() => quitar(p.product_id)} className="text-slate-300 hover:text-red-500"><X className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}

      {/* Footer de acción */}
      {items.length > 0 && (
        <div className="safe-bottom sticky bottom-24 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur md:bottom-4">
          <div className="flex-1">
            <p className="text-xs text-slate-400">Total de la venta</p>
            <p className="text-xl font-bold text-slate-900">{fmt.format(total)}</p>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={confirmar} onChange={(e) => setConfirmar(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
            Confirmar en Odoo
          </label>
          <button onClick={crearVenta} disabled={creando} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40">
            {creando ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShoppingCart className="h-5 w-5" />}
            Crear venta
          </button>
        </div>
      )}
    </div>
  );
}
