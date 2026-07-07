import OdooTable from "@/components/erp/OdooTable";

const ESTADOS = {
  assigned: { label: "Listo", cls: "bg-amber-50 text-amber-700" },
  confirmed: { label: "Confirmado", cls: "bg-blue-50 text-blue-700" },
  waiting: { label: "En espera", cls: "bg-slate-100 text-slate-600" },
  draft: { label: "Borrador", cls: "bg-slate-100 text-slate-500" },
};

const columns = [
  { key: "referencia", label: "Referencia" },
  { key: "proveedor", label: "Proveedor" },
  { key: "origen", label: "Origen" },
  { key: "ubicacion", label: "Ubicación" },
  { key: "fecha", label: "Fecha planificada" },
  {
    key: "estado",
    label: "Estado",
    render: (r) => {
      const e = ESTADOS[r.estado] || { label: r.estado, cls: "bg-slate-100 text-slate-600" };
      return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${e.cls}`}>{e.label}</span>;
    },
  },
];

export default function Recepciones() {
  return (
    <OdooTable
      resource="recepciones"
      title="Recepciones"
      subtitle="Productos pendientes de recepción desde Odoo"
      columns={columns}
      searchKeys={["referencia", "proveedor", "origen"]}
    />
  );
}