import OdooTable from "@/components/erp/OdooTable";

const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

const columns = [
  { key: "id", label: "Pedido" },
  { key: "cliente", label: "Cliente" },
  {
    key: "productos",
    label: "Productos",
    render: (r) => (
      <div className="flex flex-col gap-0.5">
        {(r.productos || []).map((p, i) => (
          <span key={i} className={p.entregado ? "font-medium text-emerald-600" : "text-slate-900"}>
            {p.nombre}
          </span>
        ))}
      </div>
    ),
  },
  { key: "fecha", label: "Fecha" },
  { key: "total", label: "Total", className: "text-right", render: (r) => fmt.format(r.total) },
  { key: "transferencias", label: "Transferencias", className: "text-center" },
  {
    key: "sin_entregar",
    label: "Estado",
    render: () => (
      <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
        Sin entregar
      </span>
    ),
  },
];

export default function Ventas() {
  return (
    <OdooTable
      resource="ventas"
      title="Ventas"
      subtitle="Órdenes confirmadas pendientes de entrega · Odoo"
      columns={columns}
      searchKeys={["id", "cliente"]}
      detailIdKey="db_id"
    />
  );
}