import React, { useState, useMemo, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { invalidateOdoo } from "@/hooks/useOdoo";
import {
  ScanLine, Search, Plus, Minus, Loader2, CheckCircle2, User, X,
  ShoppingCart, Trash2, Package, Banknote, Landmark, CreditCard, ArrowLeft,
  UserPlus, Copy, Check,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import EscannerCamara from "@/components/erp/EscannerCamara";

const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

const iconoMetodo = (m) => {
  const n = (m.nombre || "").toLowerCase();
  if (m.tipo === "cash" || n.includes("efectivo") || n.includes("caja")) return Banknote;
  if (n.includes("tarjeta") || n.includes("card")) return CreditCard;
  return Landmark;
};

export default function PuntoVenta() {
  const [clientes, setClientes] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [metodos, setMetodos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [partner, setPartner] = useState(null);
  const [eligiendoCliente, setEligiendoCliente] = useState(false);
  const [clientQuery, setClientQuery] = useState("");
  const [nuevoClienteOpen, setNuevoClienteOpen] = useState(false);
  const [nc, setNc] = useState({ nombre: "", telefono: "", cuit: "", email: "" });
  const [creandoCliente, setCreandoCliente] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [carrito, setCarrito] = useState({}); // product_id -> {product_id, nombre, codigo, barcode, qty, precio, atributos}
  const [prodInput, setProdInput] = useState("");
  const [buscandoCodigo, setBuscandoCodigo] = useState(false);
  const [pantalla, setPantalla] = useState("venta"); // venta | cobro
  const [metodoSel, setMetodoSel] = useState(null);
  const [recibido, setRecibido] = useState("");
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

  const productosVisibles = useMemo(() => {
    const t = prodInput.trim().toLowerCase();
    const base = t.length >= 2
      ? catalogo.filter((p) => [p.nombre, p.codigo, p.barcode].join(" ").toLowerCase().includes(t))
      : catalogo;
    return base.slice(0, 60);
  }, [catalogo, prodInput]);

  const items = Object.values(carrito);
  const total = useMemo(() => items.reduce((s, p) => s + (Number(p.precio) || 0) * p.qty, 0), [items]);
  const unidades = useMemo(() => items.reduce((s, p) => s + p.qty, 0), [items]);
  const montoRecibido = Number(recibido) || 0;
  const esEfectivo = metodoSel && (metodoSel.tipo === "cash" || /efectivo|caja/i.test(metodoSel.nombre || ""));
  const esBanco = metodoSel && !esEfectivo && metodoSel.tipo === "bank";
  const vuelto = esEfectivo && montoRecibido > total ? montoRecibido - total : 0;
  const qrTransferencia = esBanco && metodoSel?.cbu
    ? `TRANSFERENCIA\nTitular: ${metodoSel.titular || metodoSel.nombre}\nCBU/Alias: ${metodoSel.cbu}\nMonto: ${fmt.format(total)}`
    : "";

  useEffect(() => {
    (async () => {
      setCargando(true);
      try {
        const [c, k, m] = await Promise.all([
          base44.functions.invoke("odoo", { resource: "clientes", limit: 500 }),
          base44.functions.invoke("odoo", { resource: "control_stock", limit: 500 }),
          base44.functions.invoke("odoo", { resource: "metodos_pago" }).catch(() => ({ data: { data: [] } })),
        ]);
        const cl = c.data?.data || [];
        setClientes(cl);
        setCatalogo(k.data?.data || []);
        setMetodos(m.data?.data || []);
        // Cliente por defecto: Consumidor Final (se puede cambiar)
        const cf = cl.find((x) => /consumidor\s*final/i.test(x.nombre || ""));
        if (cf) setPartner(cf);
      } catch (e) {
        setError(e?.response?.data?.error || e?.message || "Error al cargar datos");
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  useEffect(() => { if (!cargando && !resultado && pantalla === "venta") prodRef.current?.focus(); }, [cargando, resultado, pantalla]);

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

  const inc = (id, d) => setCarrito((c) => {
    const item = c[id];
    if (!item) return c;
    const qty = item.qty + d;
    if (qty <= 0) { const n = { ...c }; delete n[id]; return n; }
    return { ...c, [id]: { ...item, qty } };
  });
  const setPrecio = (id, v) => setCarrito((c) => ({ ...c, [id]: { ...c[id], precio: v } }));
  const quitar = (id) => setCarrito((c) => { const n = { ...c }; delete n[id]; return n; });
  const vaciar = () => setCarrito({});

  const detectCliente = (code) => {
    const match = clientes.find((c) => (c.ref && c.ref === code) || (c.cuit && c.cuit === code));
    if (match) { setPartner(match); setClientQuery(""); setEligiendoCliente(false); setError(null); }
    else { setClientQuery(code); setError(`Cliente no encontrado: ${code}`); }
  };

  const crearCliente = async () => {
    if (!nc.nombre.trim()) { setError("El nombre del cliente es obligatorio"); return; }
    setCreandoCliente(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("odoo", { resource: "crear_cliente", ...nc });
      const cli = res.data?.cliente;
      if (cli) {
        setClientes((cs) => [cli, ...cs]);
        setPartner(cli);
        setEligiendoCliente(false);
        setNuevoClienteOpen(false);
        setNc({ nombre: "", telefono: "", cuit: "", email: "" });
        setClientQuery("");
      }
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Error al crear el cliente");
    } finally {
      setCreandoCliente(false);
    }
  };

  const copiarCbu = async (texto) => {
    try { await navigator.clipboard.writeText(texto); setCopiado(true); setTimeout(() => setCopiado(false), 1500); } catch (_) {}
  };

  const irACobro = () => {
    if (!partner) { setEligiendoCliente(true); setError("Seleccioná el cliente de la venta"); return; }
    if (!items.length) { setError("Agregá al menos un producto"); return; }
    setError(null);
    setRecibido("");
    if (!metodoSel && metodos.length) setMetodoSel(metodos.find((m) => m.tipo === "cash") || metodos[0]);
    setPantalla("cobro");
  };

  const crearVenta = async (conPago) => {
    if (!partner) { setError("Seleccioná un cliente para la venta"); return; }
    const lineas = items.filter((p) => p.qty > 0).map((p) => ({ product_id: p.product_id, qty: p.qty, precio: Number(p.precio) || 0 }));
    if (!lineas.length) { setError("Agregá al menos un producto"); return; }
    setCreando(true);
    setError(null);
    try {
      const payload = {
        resource: "crear_venta",
        partner_id: partner.id,
        lineas,
        confirmar: true,
        nota: "Venta creada desde Punto de Venta",
      };
      if (conPago && metodoSel) payload.pago = { journal_id: metodoSel.id, amount: total, metodo: metodoSel.nombre };
      const res = await base44.functions.invoke("odoo", payload);
      setResultado({ ...(res.data || {}), vuelto: conPago ? vuelto : 0 });
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
    setClientQuery("");
    setResultado(null);
    setError(null);
    setPantalla("venta");
    setRecibido("");
  };

  if (cargando) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
      </div>
    );
  }

  /* ---------- Pantalla de éxito ---------- */
  if (resultado) {
    return (
      <div className="mx-auto max-w-lg space-y-4 pt-8">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <p className="text-lg font-semibold text-slate-900">Venta creada en Odoo</p>
          <p className="text-2xl font-bold text-emerald-700">{resultado.name}</p>
          <p className="text-sm text-slate-600">Total {fmt.format(resultado.total || 0)}</p>
          {resultado.pago_id ? (
            <p className="rounded-lg bg-emerald-100 px-3 py-1.5 text-sm font-medium text-emerald-800">
              Cobrado con {resultado.pago_metodo || "método seleccionado"}
              {resultado.vuelto > 0 && <> · Vuelto: <span className="font-bold">{fmt.format(resultado.vuelto)}</span></>}
            </p>
          ) : (
            <p className="text-xs text-slate-500">Sin pago registrado (se cobra después)</p>
          )}
          {resultado.confirm_error && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              La orden se creó pero no se pudo confirmar automáticamente: {resultado.confirm_error}
            </p>
          )}
          {resultado.pago_error && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              La venta se creó pero el pago no se pudo registrar: {resultado.pago_error}
            </p>
          )}
          <button onClick={nuevaVenta} className="mt-2 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-base font-semibold text-white hover:bg-emerald-700">
            <ScanLine className="h-5 w-5" /> Nueva venta
          </button>
        </div>
      </div>
    );
  }

  /* ---------- Pantalla de cobro ---------- */
  if (pantalla === "cobro") {
    const sugerencias = [total, 1000, 2000, 5000, 10000, 20000].filter((v, i, a) => v > 0 && a.indexOf(v) === i);
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <button onClick={() => setPantalla("venta")} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-4 w-4" /> Volver a la venta
        </button>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-sm text-slate-500">{unidades} unidades · {partner?.nombre}</p>
          <p className="mt-1 text-4xl font-bold text-slate-900">{fmt.format(total)}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm font-medium text-slate-700">¿Cómo paga?</p>
          {metodos.length === 0 ? (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              No se encontraron métodos de pago en Odoo. Podés crear la venta y cobrarla después.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {metodos.map((m) => {
                const Icon = iconoMetodo(m);
                const activo = metodoSel?.id === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMetodoSel(m)}
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-sm font-medium transition ${activo ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="text-center leading-tight">{m.nombre}</span>
                  </button>
                );
              })}
            </div>
          )}

          {esBanco && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              {metodoSel.cbu ? (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-sm font-medium text-slate-700">El cliente escanea el QR o transfiere a:</p>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <QRCodeSVG value={qrTransferencia} size={180} marginSize={1} />
                  </div>
                  <div className="w-full rounded-xl bg-slate-50 p-3 text-center">
                    {metodoSel.titular && <p className="text-xs text-slate-500">Titular: <span className="font-medium text-slate-700">{metodoSel.titular}</span></p>}
                    <p className="mt-1 font-mono text-sm font-bold text-slate-900 break-all">{metodoSel.cbu}</p>
                    <p className="mt-1 text-lg font-bold text-emerald-700">{fmt.format(total)}</p>
                    <button onClick={() => copiarCbu(metodoSel.cbu)} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100">
                      {copiado ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiado ? "¡Copiado!" : "Copiar CBU/Alias"}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">Cuando veas la transferencia acreditada, tocá Cobrar.</p>
                </div>
              ) : (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Este método no tiene CBU/alias cargado en Odoo (Contabilidad → Diarios → cuenta bancaria). Podés cobrar igual, pero sin mostrar los datos ni el QR.
                </p>
              )}
            </div>
          )}

          {esEfectivo && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <label className="mb-2 block text-sm font-medium text-slate-700">¿Con cuánto paga? (opcional, para calcular el vuelto)</label>
              <input
                inputMode="numeric"
                value={recibido}
                onChange={(e) => setRecibido(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="Monto recibido"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-2xl font-bold outline-none focus:border-emerald-400 focus:bg-white"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {sugerencias.map((v) => (
                  <button key={v} onClick={() => setRecibido(String(Math.ceil(v)))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                    {v === total ? "Justo" : fmt.format(v)}
                  </button>
                ))}
              </div>
              {montoRecibido > 0 && (
                <div className={`mt-3 rounded-xl p-3 text-center ${montoRecibido < total ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-800"}`}>
                  {montoRecibido < total
                    ? <p className="text-sm font-medium">Faltan {fmt.format(total - montoRecibido)}</p>
                    : <p className="text-sm">Vuelto: <span className="text-xl font-bold">{fmt.format(vuelto)}</span></p>}
                </div>
              )}
            </div>
          )}
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <div className="space-y-2">
          {metodos.length > 0 && (
            <button
              onClick={() => crearVenta(true)}
              disabled={creando || !metodoSel}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-4 text-lg font-bold text-white shadow-lg hover:bg-emerald-700 disabled:opacity-40"
            >
              {creando ? <Loader2 className="h-6 w-6 animate-spin" /> : <Banknote className="h-6 w-6" />}
              Cobrar {fmt.format(total)}
            </button>
          )}
          <button
            onClick={() => crearVenta(false)}
            disabled={creando}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            Crear venta sin cobrar ahora
          </button>
        </div>
      </div>
    );
  }

  /* ---------- Pantalla principal: armar la venta ---------- */
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Punto de Venta</h1>
          <p className="mt-1 text-sm text-slate-500">Escaneá o tocá los productos, después cobrá</p>
        </div>
      </div>

      <div className="gap-4 lg:grid lg:grid-cols-[1fr_380px] lg:items-start">
        {/* Columna izquierda: escaneo + grilla de productos */}
        <div className="space-y-3">
          <form onSubmit={onProdSubmit} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <ScanLine className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-600" />
                <input
                  ref={prodRef}
                  value={prodInput}
                  onChange={(e) => setProdInput(e.target.value)}
                  placeholder="Escaneá un código o buscá por nombre..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-base outline-none focus:border-emerald-400 focus:bg-white"
                />
              </div>
              {buscandoCodigo && <span className="flex items-center px-1 text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /></span>}
              <EscannerCamara title="Escanear producto" label="Cámara" onDetect={procesarCodigo} />
            </div>
          </form>

          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          {productosVisibles.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 py-12 text-slate-400">
              <Package className="h-8 w-8" />
              <p className="text-sm">Sin productos para mostrar</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
              {productosVisibles.map((p) => (
                <button
                  key={p.product_id}
                  type="button"
                  onClick={() => agregarProducto(p)}
                  className="flex min-h-[92px] flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-emerald-300 hover:shadow-sm active:scale-[0.98]"
                >
                  <p className="line-clamp-2 text-sm font-medium leading-snug text-slate-800">{p.nombre}</p>
                  <div className="mt-2 flex items-end justify-between gap-1">
                    <span className="text-sm font-bold text-emerald-700">{fmt.format(p.precio || 0)}</span>
                    {p.stock !== undefined && <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${Number(p.stock) > 0 ? "bg-slate-100 text-slate-500" : "bg-red-50 text-red-500"}`}>{Number(p.stock) || 0} u.</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Columna derecha: ticket */}
        <div className="mt-4 space-y-3 lg:sticky lg:top-4 lg:mt-0">
          {/* Cliente */}
          {partner && !eligiendoCliente ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><User className="h-4 w-4" /></div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{partner.nombre}</p>
                {(partner.ref || partner.cuit) && <p className="truncate text-[11px] text-slate-400">{partner.ref || ""}{partner.cuit ? ` · CUIT ${partner.cuit}` : ""}</p>}
              </div>
              <button onClick={() => setEligiendoCliente(true)} className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50">Cambiar</button>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={clientQuery}
                    onChange={(e) => setClientQuery(e.target.value)}
                    placeholder="Buscar cliente..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-sm outline-none focus:border-slate-400 focus:bg-white"
                  />
                </div>
                <EscannerCamara title="Escanear cliente" label="" onDetect={detectCliente} />
                {partner && <button onClick={() => { setEligiendoCliente(false); setClientQuery(""); setNuevoClienteOpen(false); }} className="rounded-lg border border-slate-200 px-2 text-xs text-slate-500 hover:bg-slate-50">✕</button>}
              </div>
              <button
                type="button"
                onClick={() => setNuevoClienteOpen((v) => !v)}
                className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-emerald-300 bg-emerald-50/50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                <UserPlus className="h-3.5 w-3.5" /> {nuevoClienteOpen ? "Cancelar" : "Crear cliente nuevo"}
              </button>
              {nuevoClienteOpen && (
                <div className="mt-2 space-y-2 rounded-lg border border-emerald-100 bg-emerald-50/30 p-3">
                  <input value={nc.nombre} onChange={(e) => setNc((v) => ({ ...v, nombre: e.target.value }))} placeholder="Nombre y apellido *" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400" />
                  <div className="grid grid-cols-2 gap-2">
                    <input value={nc.telefono} onChange={(e) => setNc((v) => ({ ...v, telefono: e.target.value }))} placeholder="Teléfono" inputMode="tel" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400" />
                    <input value={nc.cuit} onChange={(e) => setNc((v) => ({ ...v, cuit: e.target.value }))} placeholder="CUIT / DNI" inputMode="numeric" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400" />
                  </div>
                  <input value={nc.email} onChange={(e) => setNc((v) => ({ ...v, email: e.target.value }))} placeholder="Email (opcional)" inputMode="email" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400" />
                  <button type="button" onClick={crearCliente} disabled={creandoCliente || !nc.nombre.trim()} className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40">
                    {creandoCliente ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                    Guardar cliente en Odoo
                  </button>
                </div>
              )}
              <div className="mt-2 max-h-48 divide-y divide-slate-100 overflow-auto rounded-lg border border-slate-100">
                {clientesFiltrados.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-slate-400">Sin coincidencias</p>
                ) : clientesFiltrados.map((c) => (
                  <button key={c.id} type="button" onClick={() => { setPartner(c); setClientQuery(""); setEligiendoCliente(false); setError(null); }} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50">
                    <span className="truncate text-slate-800">{c.nombre}</span>
                    <span className="ml-2 shrink-0 font-mono text-xs text-slate-400">{c.ref || c.cuit || ""}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Líneas del ticket */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-sm font-medium text-slate-700"><ShoppingCart className="h-4 w-4 text-slate-400" /> Ticket · {unidades} u.</p>
              {items.length > 0 && (
                <button onClick={vaciar} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /> Vaciar</button>
              )}
            </div>
            {items.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-slate-400">Escaneá o tocá un producto para empezar</p>
            ) : (
              <div className="max-h-[45vh] divide-y divide-slate-100 overflow-auto">
                {items.map((p) => (
                  <div key={p.product_id} className="px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{p.nombre}</p>
                      <button onClick={() => quitar(p.product_id)} className="shrink-0 text-slate-300 hover:text-red-500"><X className="h-4 w-4" /></button>
                    </div>
                    {p.atributos?.length > 0 && (
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {p.atributos.map((a, i) => (
                          <span key={i} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{a.atributo}: {a.valor}</span>
                        ))}
                      </div>
                    )}
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button onClick={() => inc(p.product_id, -1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"><Minus className="h-4 w-4" /></button>
                        <span className="w-8 text-center text-sm font-bold text-slate-800">{p.qty}</span>
                        <button onClick={() => inc(p.product_id, 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"><Plus className="h-4 w-4" /></button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input value={p.precio} onChange={(e) => setPrecio(p.product_id, e.target.value)} className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-right text-xs outline-none focus:border-emerald-400" />
                        <span className="w-20 text-right text-sm font-semibold text-slate-900">{fmt.format((Number(p.precio) || 0) * p.qty)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total + Cobrar */}
          <div className="safe-bottom sticky bottom-24 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur md:bottom-4 lg:static lg:shadow-none">
            <div className="mb-3 flex items-end justify-between">
              <p className="text-sm text-slate-500">Total</p>
              <p className="text-3xl font-bold text-slate-900">{fmt.format(total)}</p>
            </div>
            <button
              onClick={irACobro}
              disabled={creando || items.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-4 text-lg font-bold text-white hover:bg-emerald-700 disabled:opacity-40"
            >
              <Banknote className="h-6 w-6" /> Cobrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
