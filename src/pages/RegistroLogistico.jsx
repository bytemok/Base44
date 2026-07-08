import React, { useState, useMemo, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  ArrowDownToLine, ArrowUpFromLine, ScanLine, Search, Plus, Minus,
  Loader2, CheckCircle2, ArrowLeft, User, X, Wallet, AlertTriangle, Boxes,
} from "lucide-react";
import EscannerCamara from "@/components/erp/EscannerCamara";

const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export default function RegistroLogistico() {
  const [mode, setMode] = useState(null); // 'in' | 'out'
  const [clientes, setClientes] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [partner, setPartner] = useState(null);
  const [clientQuery, setClientQuery] = useState("");
  const [productos, setProductos] = useState({});
  const [prodInput, setProdInput] = useState("");
  const [validando, setValidando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const clientRef = useRef(null);
  const prodRef = useRef(null);

  const porBarcode = useMemo(() => {
    const m = {};
    catalogo.forEach((p) => { if (p.barcode) m[p.barcode] = p; });
    return m;
  }, [catalogo]);

  const clientesFiltrados = useMemo(() => {
    if (!clientQuery.trim()) return clientes.slice(0, 8);
    const t = clientQuery.toLowerCase();
    return clientes.filter((c) => [c.nombre, c.ref, c.cuit].join(" ").toLowerCase().includes(t)).slice(0, 8);
  }, [clientes, clientQuery]);

  const total = useMemo(() => Object.values(productos).reduce((s, p) => s + (p.precio || 0) * p.qty, 0), [productos]);

  const alertas = useMemo(() => {
    if (mode !== "out") return [];
    return Object.values(productos).filter((p) => p.qty > p.disponible);
  }, [productos, mode]);

  const cargar = async () => {
    setCargando(true);
    try {
      const [c, k] = await Promise.all([
        base44.functions.invoke("odoo", { resource: "clientes", limit: 500 }),
        base44.functions.invoke("odoo", { resource: "control_stock", limit: 500 }),
      ]);
      setClientes(c.data?.data || []);
      setCatalogo(k.data?.data || []);
    } catch (e) {
      setError(e?.message || "Error");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { if (mode) cargar(); }, [mode]);
  useEffect(() => { if (mode && !partner) clientRef.current?.focus(); }, [mode, partner]);
  useEffect(() => { if (partner) prodRef.current?.focus(); }, [partner]);

  const seleccionarCliente = (c) => { setPartner(c); setClientQuery(""); setError(null); };

  const onClientScan = (e) => {
    e.preventDefault();
    const code = clientQuery.trim();
    if (!code) return;
    const match = clientes.find((c) => (c.ref && c.ref === code) || (c.cuit && c.cuit === code));
    if (match) seleccionarCliente(match);
    else setError(`Cliente no encontrado: ${code}`);
  };

  const onProdScan = (e) => {
    e.preventDefault();
    const code = prodInput.trim();
    if (!code) return;
    const prod = porBarcode[code];
    if (prod) {
      setProductos((p) => ({
        ...p,
        [code]: {
          product_id: prod.product_id,
          nombre: prod.nombre,
          qty: (p[code]?.qty || 0) + 1,
          precio: prod.precio || 0,
          disponible: prod.esperado || 0,
          atributos: prod.atributos || [],
        },
      }));
      setError(null);
    } else setError(`Producto no encontrado: ${code}`);
    setProdInput("");
  };

  const detectCliente = (code) => {
    const match = clientes.find((c) => (c.ref && c.ref === code) || (c.cuit && c.cuit === code));
    if (match) seleccionarCliente(match);
    else { setClientQuery(code); setError(`Cliente no encontrado: ${code}`); }
  };
  const detectProducto = (code) => {
    const prod = porBarcode[code];
    if (prod) {
      setProductos((p) => ({
        ...p,
        [code]: {
          product_id: prod.product_id,
          nombre: prod.nombre,
          qty: (p[code]?.qty || 0) + 1,
          precio: prod.precio || 0,
          disponible: prod.esperado || 0,
          atributos: prod.atributos || [],
        },
      }));
      setError(null);
    } else setError(`Producto no encontrado: ${code}`);
  };

  const inc = (code, d) => setProductos((p) => ({ ...p, [code]: { ...p[code], qty: Math.max(0, (p[code]?.qty || 0) + d) } }));
  const setCant = (code, v) => setProductos((p) => ({ ...p, [code]: { ...p[code], qty: Math.max(0, Number(v) || 0) } }));
  const quitar = (code) => setProductos((p) => { const n = { ...p }; delete n[code]; return n; });

  const validar = async () => {
    if (!partner) { setError("Seleccioná un cliente"); return; }
    if (mode === "out" && alertas.length) {
      if (!confirm(`Hay ${alertas.length} producto(s) con cantidad mayor al stock disponible. ¿Continuar igual?`)) return;
    }
    const lineas = Object.values(productos).map((p) => ({ product_id: p.product_id, qty: p.qty })).filter((l) => l.qty > 0);
    if (!lineas.length) { setError("Escaneá al menos un producto"); return; }
    setValidando(true); setError(null); setResultado(null);
    try {
      const res = await base44.functions.invoke("odoo", {
        resource: "pickings_crear",
        tipo: mode,
        partner_id: partner.id,
        lineas,
        origin: mode === "in" ? "Registro logístico - ingreso proveedor" : "Registro logístico - salida pedido",
      });
      const d = res.data || {};
      let pago = null;
      if (mode === "out" && total > 0) {
        const pres = await base44.functions.invoke("odoo", { resource: "registrar_pago_caja", partner_id: partner.id, amount: total, ref: d.name || "Registro logístico" });
        pago = pres.data || {};
      }
      setResultado({ picking: d, pago, lineas: lineas.length });
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Error al validar");
    } finally {
      setValidando(false);
    }
  };

  const reiniciar = () => { setPartner(null); setProductos({}); setResultado(null); setError(null); setClientQuery(""); };
  const cerrarModo = () => { setMode(null); reiniciar(); };

  if (!mode) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Registro Logístico</h1>
          <p className="mt-1 text-sm text-slate-500">Escaneá códigos para registrar ingresos de proveedores o salidas de pedidos, con validación de stock en Odoo en tiempo real</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <button onClick={() => setMode("in")} className="group flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm transition hover:border-blue-300 hover:shadow-md">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-100">
              <ArrowDownToLine className="h-8 w-8" />
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900">Ingreso de proveedor</p>
              <p className="mt-1 text-sm text-slate-500">Escaneá proveedor y productos · valida la entrada en Odoo</p>
            </div>
          </button>
          <button onClick={() => setMode("out")} className="group flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm transition hover:border-emerald-300 hover:shadow-md">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 transition group-hover:bg-emerald-100">
              <ArrowUpFromLine className="h-8 w-8" />
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900">Salida de pedido</p>
              <p className="mt-1 text-sm text-slate-500">Escaneá cliente y productos · valida stock disponible y registra el pago</p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  const esOut = mode === "out";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={cerrarModo} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>
        <div className={`flex items-center gap-2 ${esOut ? "text-emerald-700" : "text-blue-700"}`}>
          {esOut ? <ArrowUpFromLine className="h-5 w-5" /> : <ArrowDownToLine className="h-5 w-5" />}
          <h1 className="text-xl font-semibold">{esOut ? "Salida de pedido" : "Ingreso de proveedor"}</h1>
        </div>
      </div>

      {cargando ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
        </div>
      ) : (
        <>
          {partner ? (
            <div className={`flex items-center gap-3 rounded-xl border p-4 ${esOut ? "border-emerald-200 bg-emerald-50" : "border-blue-200 bg-blue-50"}`}>
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${esOut ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"}`}>
                <User className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">{partner.nombre}</p>
                <p className="text-xs text-slate-500">{partner.ref && <span className="font-mono">{partner.ref}</span>}{partner.cuit && <span> · CUIT {partner.cuit}</span>}</p>
              </div>
              <button onClick={() => { setPartner(null); }} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50">Cambiar</button>
            </div>
          ) : (
            <form onSubmit={onClientScan} className="rounded-xl border border-slate-200 bg-white p-4">
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                <ScanLine className="h-4 w-4 text-slate-400" /> Escanear código de cliente o buscar por nombre
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={clientRef}
                    value={clientQuery}
                    onChange={(e) => setClientQuery(e.target.value)}
                    placeholder="Código (ref/CUIT) o nombre..."
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
                    <button key={c.id} type="button" onClick={() => seleccionarCliente(c)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50">
                      <span className="truncate text-slate-800">{c.nombre}</span>
                      <span className="ml-2 shrink-0 font-mono text-xs text-slate-400">{c.ref || c.cuit || ""}</span>
                    </button>
                  ))}
                </div>
              )}
            </form>
          )}

          {partner && (
            <form onSubmit={onProdScan} className="rounded-xl border border-slate-200 bg-white p-4">
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                <ScanLine className="h-4 w-4 text-emerald-600" /> Escanear productos
              </label>
              <div className="flex gap-2">
                <input
                  ref={prodRef}
                  value={prodInput}
                  onChange={(e) => setProdInput(e.target.value)}
                  placeholder="Enfocá el lector o escribí el código..."
                  className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 font-mono text-base outline-none focus:border-emerald-400 focus:bg-white"
                />
                <EscannerCamara title="Escanear producto" label="Cámara" onDetect={detectProducto} />
              </div>
            </form>
          )}

          {esOut && alertas.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{alertas.length} producto(s) superan el stock disponible en Odoo. Revisá antes de validar.</span>
            </div>
          )}

          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          {Object.keys(productos).length > 0 && (
            <div className="space-y-2">
              {Object.entries(productos).map(([code, p]) => {
                const insuf = esOut && p.qty > p.disponible;
                return (
                  <div key={code} className={`flex items-center gap-3 rounded-xl border bg-white p-3 ${insuf ? "border-amber-300" : "border-slate-200"}`}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{p.nombre}</p>
                      <p className="text-xs text-slate-400">{code}</p>
                      {p.atributos?.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {p.atributos.map((a, i) => (
                            <span key={i} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{a.atributo}: {a.valor}</span>
                          ))}
                        </div>
                      )}
                      <p className="mt-1 text-xs text-slate-500">
                        Disponible Odoo: <span className={insuf ? "font-semibold text-amber-700" : "text-slate-600"}>{p.disponible}</span>
                        {esOut && <span className="ml-2 inline-flex items-center gap-1 text-slate-400"><Boxes className="h-3 w-3" />validación en tiempo real</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => inc(code, -1)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"><Minus className="h-3.5 w-3.5" /></button>
                      <input value={p.qty} onChange={(e) => setCant(code, e.target.value)} className="w-12 rounded-lg border border-slate-200 py-1 text-center text-sm font-semibold outline-none focus:border-emerald-400" />
                      <button onClick={() => inc(code, 1)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                    <button onClick={() => quitar(code)} className="text-slate-300 hover:text-red-500"><X className="h-4 w-4" /></button>
                  </div>
                );
              })}
            </div>
          )}

          {partner && Object.keys(productos).length > 0 && (
            <div className="sticky bottom-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
              <div className="flex-1">
                {esOut && (
                  <div className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-emerald-600" />
                    <div>
                      <p className="text-xs text-slate-400">Saldo a registrar en Caja Deposito</p>
                      <p className="text-lg font-semibold text-slate-900">{fmt.format(total)}</p>
                    </div>
                  </div>
                )}
                {!esOut && <p className="text-sm text-slate-500">{Object.keys(productos).length} producto(s) · {Object.values(productos).reduce((s, p) => s + p.qty, 0)} unidades</p>}
              </div>
              <button onClick={validar} disabled={validando} className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white ${esOut ? "bg-emerald-500 hover:bg-emerald-600" : "bg-blue-500 hover:bg-blue-600"} disabled:opacity-40`}>
                {validando ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                Validar {esOut ? "salida" : "ingreso"}
              </button>
            </div>
          )}

          {resultado && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-5 w-5" /> Validado en Odoo: {resultado.picking?.name} ({resultado.picking?.estado})
              </div>
              {resultado.pago && <p className="mt-1">Pago registrado en Caja Deposito · {fmt.format(total)}</p>}
              <button onClick={reiniciar} className="mt-3 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50">Nueva operación</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}