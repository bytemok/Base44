import React, { useMemo } from "react";
import { useOdoo } from "@/hooks/useOdoo";
import { Loader2, Boxes, AlertTriangle, Layers, PackageX } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, PieChart, Pie } from "recharts";

const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

function Kpi({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <Icon className={`h-4 w-4 ${color}`} /> {label}
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

const CAT_COLOR = ["#2563eb", "#16a34a", "#ea580c", "#9333ea", "#dc2626", "#0891b2", "#ca8a04", "#64748b"];

export default function ReporteStock() {
  const { data, loading, error } = useOdoo("inventario");
  const alertasRes = useOdoo("alertas_stock");

  const stats = useMemo(() => {
    const tmpls = data || [];
    let totalUnidades = 0, valorStock = 0, publicados = 0, sinStock = 0;
    const byCat = {};
    const byValor = [];

    tmpls.forEach((t) => {
      const stockTmpl = (t.variantes || []).reduce((s, v) => s + (v.stock || 0), 0);
      totalUnidades += stockTmpl;
      const valorTmpl = (t.variantes || []).reduce((s, v) => s + (v.stock || 0) * (v.precio || t.precio_base || 0), 0);
      valorStock += valorTmpl;
      if (t.publicado) publicados += 1;
      if (stockTmpl <= 0) sinStock += 1;

      const cat = t.categoria || "Sin categoría";
      byCat[cat] = byCat[cat] || { categoria: cat, unidades: 0, valor: 0, productos: 0 };
      byCat[cat].unidades += stockTmpl;
      byCat[cat].valor += valorTmpl;
      byCat[cat].productos += 1;

      if (stockTmpl > 0) byValor.push({ nombre: t.nombre, unidades: stockTmpl, valor: valorTmpl });
    });

    const categorias = Object.values(byCat).sort((a, b) => b.unidades - a.unidades).slice(0, 8);
    const topValor = byValor.sort((a, b) => b.valor - a.valor).slice(0, 8);
    const alertas = alertasRes.data || [];

    return { totalUnidades, valorStock, publicados, sinStock, categorias, topValor, alertas, totalProductos: tmpls.length };
  }, [data, alertasRes.data]);

  if (loading) return <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /> Cargando inventario...</div>;
  if (error) return <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">Error: {error}</div>;
  if (!stats.totalProductos) return <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">No hay productos en el inventario</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={Boxes} label="Valor de stock" value={fmt.format(stats.valorStock)} sub={`${stats.totalUnidades} unidades`} color="text-slate-600" />
        <Kpi icon={Layers} label="Productos" value={stats.totalProductos} sub={`${stats.publicados} publicados`} color="text-emerald-600" />
        <Kpi icon={PackageX} label="Sin stock" value={stats.sinStock} sub="productos en cero" color="text-amber-600" />
        <Kpi icon={AlertTriangle} label="Faltantes" value={stats.alertas.length} sub="stock negativo" color="text-red-600" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Unidades por categoría</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.categorias} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
              <YAxis type="category" dataKey="categoria" tick={{ fontSize: 10, fill: "#64748b" }} width={120} />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"><p className="font-semibold text-slate-800">{d.categoria}</p><p className="text-slate-600">{d.unidades} unid. · {d.productos} prod.</p><p className="text-slate-500">{fmt.format(d.valor)}</p></div>;
              }} />
              <Bar dataKey="unidades" radius={[0, 6, 6, 0]}>{stats.categorias.map((c, i) => <Cell key={i} fill={CAT_COLOR[i % CAT_COLOR.length]} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Distribución de valor por categoría</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={stats.categorias} dataKey="valor" nameKey="categoria" cx="50%" cy="50%" outerRadius={90} label={({ categoria }) => categoria.length > 14 ? categoria.slice(0, 12) + "…" : categoria} labelLine={false}>
                {stats.categorias.map((c, i) => <Cell key={i} fill={CAT_COLOR[i % CAT_COLOR.length]} />)}
              </Pie>
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"><p className="font-semibold text-slate-800">{d.categoria}</p><p className="text-slate-600">{fmt.format(d.valor)}</p></div>;
              }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Top productos por valor de stock</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr><th className="px-3 py-2">Producto</th><th className="px-3 py-2 text-right">Unidades</th><th className="px-3 py-2 text-right">Valor</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.topValor.map((p, i) => (
                <tr key={i}><td className="px-3 py-2 text-slate-800">{p.nombre}</td><td className="px-3 py-2 text-right text-slate-600">{p.unidades}</td><td className="px-3 py-2 text-right font-medium text-slate-900">{fmt.format(p.valor)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}