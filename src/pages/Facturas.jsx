import OdooTable from "@/components/erp/OdooTable";

const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

const PAGO = {
  paid: { label: "Pagada", cls: "bg-emerald-50 text-emerald-700" },
  not_paid: { label: "Impaga", cls: "bg-red-50 text-red-700" },
  partial: { label: "Parcial", cls: "bg-amber-50 text-amber-700" },
  reversed: { label: "Revertida", cls: "bg-slate-100 text-slate-600" },
};

const columns = [
  { key: "numero", label: "Factura" },
  { key: "cliente", label: "Cliente" },
  { key: "fecha", label: "Fecha" },
  { key: "total", label: "Total", className: "text-right", render: (r) => fmt.format(r.total) },
  {
    key: "saldo",
    label: "Saldo",
    className: "text-right",
    render: (r) => (
      <span className={r.saldo > 0 ? "text-red-600" : "text-emerald-600"}>{fmt.format(r.saldo)}</span>
    ),
  },
  {
    key: "pago",
    label: "Pago",
    render: (r) => {
      const e = PAGO[r.pago] || { label: r.pago, cls: "bg-slate-100 text-slate-600" };
      return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${e.cls}`}>{e.label}</span>;
    },
  },
];

export default function Facturas() {
  return (
    <OdooTable
      resource="facturas"
      title="Facturación"
      subtitle="Facturas de cliente desde Odoo"
      columns={columns}
      searchKeys={["numero", "cliente"]}
    />
  );
}