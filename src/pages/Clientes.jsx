import OdooTable from "@/components/erp/OdooTable";

const columns = [
  { key: "nombre", label: "Nombre" },
  { key: "email", label: "Email" },
  { key: "telefono", label: "Teléfono" },
  { key: "cuit", label: "CUIT/DNI" },
  { key: "ciudad", label: "Ciudad" },
  { key: "pais", label: "País" },
];

export default function Clientes() {
  return (
    <OdooTable
      resource="clientes"
      title="Clientes"
      subtitle="Contactos desde Odoo"
      columns={columns}
      searchKeys={["nombre", "email", "telefono", "cuit"]}
    />
  );
}