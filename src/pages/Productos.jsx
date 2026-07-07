import OdooTable from "@/components/erp/OdooTable";

const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

const columns = [
  { key: "nombre", label: "Producto" },
  { key: "codigo", label: "Código" },
  { key: "barcode", label: "Código de barras" },
  { key: "categoria", label: "Categoría" },
  {
    key: "precio",
    label: "Precio",
    className: "text-right",
    render: (r) => fmt.format(r.precio),
  },
  {
    key: "stock",
    label: "Stock",
    className: "text-right",
    render: (r) => (
      <span className={`font-medium ${r.stock > 0 ? "text-emerald-600" : "text-red-600"}`}>
        {r.stock}
      </span>
    ),
  },
];

export default function Productos() {
  return (
    <OdooTable
      resource="productos"
      title="Productos"
      subtitle="Catálogo y stock disponible desde Odoo"
      columns={columns}
      searchKeys={["nombre", "codigo", "barcode"]}
    />
  );
}