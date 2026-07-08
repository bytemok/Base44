import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import Etiqueta from "@/components/erp/Etiqueta";

export default function Etiquetas() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const orderId = params.get("order_id");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!orderId) { setError("Falta el identificador de la orden"); setLoading(false); return; }
    (async () => {
      try {
        const res = await base44.functions.invoke("odoo", { resource: "detalle", order_id: Number(orderId) });
        setData(res.data?.data || null);
      } catch (e) { setError(e?.message || "Error al cargar la orden"); }
      finally { setLoading(false); }
    })();
  }, [orderId]);

  const orden = data?.order?.name || "";
  const cliente = data?.order?.cliente || "";
  const lines = (data?.lines || []).filter((l) => !/^patas/i.test((l.descripcion || l.producto || "").trim()));

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100">
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>
        <h1 className="text-sm font-semibold text-slate-800">
          Etiquetas · {orden || "..."}
        </h1>
        <button
          onClick={() => window.print()}
          disabled={loading || !!error || !lines.length}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40"
        >
          <Printer className="h-4 w-4" /> Imprimir
        </button>
      </div>

      <div className="flex flex-col items-center gap-6 py-8">
        {loading ? (
          <div className="flex items-center gap-2 py-16 text-sm text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /> Cargando etiquetas...</div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : lines.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-400">No hay líneas de producto para etiquetar</div>
        ) : (
          <div className="flex flex-col items-center gap-6">
            {lines.map((l, i) => (
              <div key={i} className="etiqueta-page shadow-md">
                <Etiqueta
                  orden={orden}
                  producto={l.descripcion || l.producto}
                  barcode={l.barcode}
                  patas={l.observacion}
                  cliente={cliente}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .etiqueta-page { page-break-after: always; break-after: page; box-shadow: none !important; margin: 0 !important; }
        }
      `}</style>
    </div>
  );
}