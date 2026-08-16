import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import VendedorInicio from "@/components/vendedor/VendedorInicio";
import StockSimple from "@/components/vendedor/StockSimple";

const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const today = () => new Date().toISOString().slice(0, 10);

function useCatalogos() {
  const [state, setState] = useState({ clientes: [], productos: [], metodos: [], ventas: [], loading: true });
  useEffect(() => { (async () => {
    const [c, p, m, v] = await Promise.all([
      base44.functions.invoke("odoo", { resource: "clientes", limit: 500 }),
      base44.functions.invoke("odoo", { resource: "control_stock", limit: 500 }),
      base44.functions.invoke("odoo", { resource: "metodos_pago" }).catch(() => ({ data: { data: [] } })),
      base44.functions.invoke("odoo", { resource: "ventas", limit: 200 }).catch(() => ({ data: { data: [] } })),
    ]);
    setState({ clientes: c.data?.data || [], productos: p.data?.data || [], metodos: m.data?.data || [], ventas: v.data?.data || [], loading: false });
  })(); }, []);
  return state;
}

function NuevaVenta() {
  const { clientes, productos, metodos, loading } = useCatalogos();
  const [clienteId, setClienteId] = useState("");
  const [nuevo, setNuevo] = useState({ nombre: "", telefono: "" });
  const [items, setItems] = useState([]);
  const [productoId, setProductoId] = useState("");
  const [sena, setSena] = useState({ monto: "", metodo: "", operacion: "" });
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const total = useMemo(() => items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.precio) || 0), 0), [items]);
  const mercadoPago = useMemo(() => metodos.find((m) => (m.nombre || "").trim().toLowerCase() === "mercado pago") || metodos.find((m) => /mercado\s*pago/i.test(m.nombre || "")), [metodos]);
  const addItem = () => { const p = productos.find((x) => String(x.product_id) === productoId); if (!p) return; setItems((arr) => [...arr, { product_id: p.product_id, nombre: p.nombre, qty: 1, precio: p.precio || 0 }]); setProductoId(""); };
  const submit = async () => {
    if (!clienteId && !nuevo.nombre.trim()) return setMsg("Seleccioná o creá un cliente.");
    if (!items.length) return setMsg("Agregá al menos un producto.");
    const metodo = mercadoPago;
    if (Number(sena.monto) > 0 && (!metodo || !sena.operacion.trim())) return setMsg("Para registrar seña completá monto y número de operación. El diario será Mercado Pago.");
    setSaving(true); setMsg("");
    try {
      const user = await base44.auth.me();
      let cliente = clientes.find((c) => String(c.id) === clienteId);
      if (!cliente) { const r = await base44.functions.invoke("odoo", { resource: "crear_cliente", ...nuevo }); cliente = r.data?.cliente; }
      const payload = { resource: "crear_venta", partner_id: cliente.id, lineas: items.map((i) => ({ product_id: i.product_id, qty: Number(i.qty), precio: Number(i.precio) })), confirmar: false, fecha: today(), nota: `Venta vendedor ${user.email}` };
      if (Number(sena.monto) > 0) payload.pago = { journal_id: metodo.id, amount: Number(sena.monto), metodo: metodo.nombre || "", operacion: sena.operacion };
      const res = await base44.functions.invoke("odoo", payload);
      const venta = await base44.entities.VendedorVenta.create({ odoo_order_id: res.data.order_id, order_ref: res.data.name, cliente_id: cliente.id, cliente_nombre: cliente.nombre, cliente_telefono: cliente.telefono || nuevo.telefono || "", cliente_email: cliente.email || nuevo.email || "", items: JSON.stringify(items), total: res.data.total || total, estado: Number(sena.monto) > 0 ? "Señada" : "Confirmada", sena_monto: Number(sena.monto) || 0, sena_metodo: metodo?.nombre || "", sena_operacion: sena.operacion || "", sena_payment_id: res.data.pago_id || null, fecha: today(), vendedor_email: user.email });
      let pagoMsg = "";
      if (Number(sena.monto) > 0 && sena.operacion && res.data.pago_id) {
        try {
          const conf = await base44.functions.invoke("confirmarMercadoPago", { numero_operacion: sena.operacion, odoo_payment_id: res.data.pago_id, venta_record_id: venta.id, monto: Number(sena.monto) });
          pagoMsg = conf.data?.approved ? " Pago aprobado y marcado como pagado." : " Pago pendiente de aprobación en Mercado Pago.";
        } catch (err) {
          pagoMsg = " No se pudo confirmar automáticamente el pago en Mercado Pago.";
        }
      }
      setMsg(Number(sena.monto) > 0 ? `Venta ${res.data.name} creada en borrador.${pagoMsg}` : `Venta ${res.data.name} creada en borrador.`); setItems([]); setSena({ monto: "", metodo: "", operacion: "" });
    } catch (e) {
      setMsg(e?.response?.data?.error || e.message || "No se pudo crear la venta.");
    } finally {
      setSaving(false);
    }
  };
  if (loading) return <Loader />;
  return <div className="space-y-4"><h1 className="text-2xl font-semibold text-slate-900">Nueva Venta</h1><div className="rounded-md border border-slate-200 bg-white p-4 space-y-3"><select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-2"><option value="">Seleccionar cliente o crear nuevo</option>{clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>{!clienteId && <div className="grid gap-2 sm:grid-cols-2"><input placeholder="Nombre cliente" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 focus:border-violet-500 focus:ring-2 focus:ring-violet-100" /><input placeholder="Teléfono" value={nuevo.telefono} onChange={(e) => setNuevo({ ...nuevo, telefono: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 focus:border-violet-500 focus:ring-2 focus:ring-violet-100" /></div>}</div><div className="rounded-md border border-slate-200 bg-white p-4 space-y-3"><div className="flex gap-2"><select value={productoId} onChange={(e) => setProductoId(e.target.value)} className="flex-1 rounded-md border border-slate-200 px-3 py-2"><option value="">Producto</option>{productos.filter((p) => (p.esperado || 0) > 0).map((p) => <option key={p.product_id} value={p.product_id}>{p.nombre} · {fmt.format(p.precio || 0)}</option>)}</select><button onClick={addItem} className="rounded-md bg-violet-700 px-4 text-white"><Plus className="h-4 w-4" /></button></div>{items.map((i, idx) => <div key={idx} className="grid grid-cols-[1fr_80px_34px] gap-2"><span className="truncate py-2 text-sm font-medium">{i.nombre}</span><input value={i.qty} onChange={(e) => setItems(items.map((x, n) => n === idx ? { ...x, qty: e.target.value } : x))} className="rounded-md border border-slate-300 px-2 text-right focus:border-violet-500 focus:ring-2 focus:ring-violet-100" /><button onClick={() => setItems(items.filter((_, n) => n !== idx))} className="text-slate-400"><Trash2 className="h-4 w-4" /></button></div>)}<p className="text-right text-2xl font-bold">{fmt.format(total)}</p></div><div className="rounded-md border border-slate-200 bg-white p-4"><p className="mb-2 text-sm font-semibold text-slate-700">Seña inicial</p><div className="grid gap-2 sm:grid-cols-3"><input inputMode="numeric" placeholder="Monto" value={sena.monto} onChange={(e) => setSena({ ...sena, monto: e.target.value })} className="rounded-md border border-slate-200 px-3 py-2" /><div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">Mercado Pago</div><input placeholder="N° operación" value={sena.operacion} onChange={(e) => setSena({ ...sena, operacion: e.target.value })} className="rounded-md border border-slate-200 px-3 py-2" /></div><p className="mt-2 text-xs text-slate-400">El número de operación queda bloqueado al guardar.</p></div>{msg && <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{msg}</p>}<button onClick={submit} disabled={saving} className="w-full rounded-md bg-violet-700 px-5 py-4 font-bold text-white disabled:opacity-50">{saving ? "Guardando..." : "Crear venta"}</button></div>;
}

function RegistrarSena() {
  const { ventas, metodos, loading } = useCatalogos();
  const [form, setForm] = useState({ order: "", monto: "", metodo: "", operacion: "" });
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async () => { const sale = ventas.find((v) => String(v.db_id) === form.order); const metodo = metodos.find((m) => String(m.id) === form.metodo); if (!sale || !form.monto || !metodo || !form.operacion) return setMsg("Completá venta, monto, método y número de operación."); setSaving(true); try { const user = await base44.auth.me(); const res = await base44.functions.invoke("odoo", { resource: "registrar_sena", order_id: sale.db_id, amount: Number(form.monto), journal_id: metodo.id, operacion: form.operacion }); const sena = await base44.entities.VendedorSena.create({ odoo_order_id: sale.db_id, order_ref: sale.id, cliente_nombre: sale.cliente, monto: Number(form.monto), metodo: metodo.nombre, numero_operacion: form.operacion, payment_id: res.data.payment_id || null, fecha: today(), vendedor_email: user.email }); let pagoMsg = ""; try { const conf = await base44.functions.invoke("confirmarMercadoPago", { numero_operacion: form.operacion, odoo_payment_id: res.data.payment_id, sena_record_id: sena.id, monto: Number(form.monto) }); pagoMsg = conf.data?.approved ? " Pago aprobado y marcado como pagado." : " Pago pendiente de aprobación en Mercado Pago."; } catch (err) { pagoMsg = " No se pudo confirmar automáticamente el pago en Mercado Pago."; } setMsg(`Seña registrada en ${sale.id}.${pagoMsg}`); setForm({ order: "", monto: "", metodo: "", operacion: "" }); } catch (e) { setMsg(e?.response?.data?.error || e.message || "No se pudo registrar la seña."); } finally { setSaving(false); } };
  if (loading) return <Loader />;
  return <div className="max-w-3xl space-y-4"><h1 className="text-2xl font-semibold text-slate-900">Registrar Seña</h1><div className="rounded-md border border-slate-200 bg-white p-4 space-y-3"><select value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} className="w-full rounded-md border border-slate-200 px-3 py-2"><option value="">Buscar venta existente</option>{ventas.map((v) => <option key={v.db_id} value={v.db_id}>{v.id} · {v.cliente} · {fmt.format(v.total || 0)}</option>)}</select><div className="grid gap-2 sm:grid-cols-3"><input inputMode="numeric" placeholder="Monto seña" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} className="rounded-md border border-slate-200 px-3 py-2" /><select value={form.metodo} onChange={(e) => setForm({ ...form, metodo: e.target.value })} className="rounded-md border border-slate-200 px-3 py-2"><option value="">Método</option>{metodos.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select><input placeholder="N° operación" value={form.operacion} onChange={(e) => setForm({ ...form, operacion: e.target.value })} className="rounded-md border border-slate-200 px-3 py-2" /></div><p className="text-xs text-slate-400">El número de operación no se puede modificar luego de guardar.</p></div>{msg && <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{msg}</p>}<button onClick={submit} disabled={saving} className="w-full rounded-md bg-violet-700 px-5 py-4 font-bold text-white disabled:opacity-50">{saving ? "Registrando..." : "Registrar seña"}</button></div>;
}

function Loader() { return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>; }

export default function VendedorPanel() {
  const { pathname } = useLocation();
  if (pathname.endsWith("/nueva-venta")) return <NuevaVenta />;
  if (pathname.endsWith("/stock")) return <StockSimple />;
  if (pathname.endsWith("/senas")) return <RegistrarSena />;
  return <VendedorInicio />;
}