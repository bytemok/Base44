import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Truck, Receipt, Boxes } from "lucide-react";
import ReporteLogistica from "@/components/erp/reportes/ReporteLogistica";
import ReporteVentas from "@/components/erp/reportes/ReporteVentas";
import ReporteStock from "@/components/erp/reportes/ReporteStock";

export default function Reportes() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Reportes</h1>
        <p className="mt-1 text-sm text-slate-500">Indicadores y métricas para tomar decisiones · sincronizado con Odoo</p>
      </div>

      <Tabs defaultValue="logistica">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="logistica" className="gap-1.5"><Truck className="h-4 w-4" /> Logística</TabsTrigger>
          <TabsTrigger value="ventas" className="gap-1.5"><Receipt className="h-4 w-4" /> Ventas</TabsTrigger>
          <TabsTrigger value="stock" className="gap-1.5"><Boxes className="h-4 w-4" /> Stock</TabsTrigger>
        </TabsList>
        <TabsContent value="logistica"><ReporteLogistica /></TabsContent>
        <TabsContent value="ventas"><ReporteVentas /></TabsContent>
        <TabsContent value="stock"><ReporteStock /></TabsContent>
      </Tabs>
    </div>
  );
}