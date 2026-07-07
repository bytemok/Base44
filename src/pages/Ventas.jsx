import React from "react";
import OdooTable from "@/components/erp/OdooTable";

const ESTADOS = {
  draft: { label: "Borrador", cls: "bg-slate-100 text-slate-600" },
  sent: { label: "Enviado", cls: "bg-blue-50 text-blue-700" },
  sale: { label: "Confirmado", cls: "bg-emerald-50 text-emerald-700" },
  done: { label: "Hecho", cls: "bg-green-100 text-green-700" },
  cancel: { label: "Cancelado", cls: "bg-red-50 text-red-700" },
};
const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

const Badge = ({ estado }) => {
  const e = ESTADOS[estado] || { label: estado, cls: "bg-slate-100 text-slate-600" };
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${e.cls}`}>{e.label}</span>;
};

const columns = [
  { key: "id", label: "Pedido" },
  { key: "cliente", label: "Cliente" },
  { key: "fecha", label: "Fecha" },
  { key: "total", label: "Total", className: "text-right", render: (r) => fmt.format(r.total) },
  { key: "entregas", label: "Entregas", className: "text-center" },
  { key: "estado", label: "Estado", render: (r) => <Badge estado={r.estado} /> },
];

export default function Ventas() {
  return (
    <OdooTable
      resource="pedidos"
      title="Ventas"
      subtitle="Órdenes de venta desde Odoo"
      columns={columns}
      searchKeys={["id", "cliente"]}
    />
  );
}