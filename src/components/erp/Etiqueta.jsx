import React, { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

const spaced = (s) => (s || "").split("").join(" ");

export default function Etiqueta({ orden, producto, barcode, patas, cliente }) {
  const orderRef = useRef(null);
  const prodRef = useRef(null);

  useEffect(() => {
    try {
      if (orderRef.current) JsBarcode(orderRef.current, orden || " ", { format: "CODE128", displayValue: false, margin: 0, height: 38, width: 2 });
    } catch (e) {}
    try {
      if (prodRef.current && barcode) JsBarcode(prodRef.current, String(barcode), { format: "CODE128", displayValue: false, margin: 0, height: 38, width: 2 });
    } catch (e) {}
  }, [orden, barcode]);

  return (
    <div
      className="mx-auto bg-white text-black"
      style={{ width: "300px", border: "1px solid #000", fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
    >
      <div className="flex flex-col items-center justify-center py-1.5" style={{ borderBottom: "1px solid #000" }}>
        <div className="flex items-center gap-[1px] font-bold leading-none" style={{ fontSize: "19px" }}>
          TOD
          <span className="inline-flex items-center justify-center rounded-full" style={{ width: "15px", height: "15px", border: "1.5px solid #000", fontSize: "10px" }}>E</span>
          EN MUEBLES
        </div>
      </div>

      <div className="flex flex-col items-center px-3 py-2" style={{ borderBottom: "1px solid #000" }}>
        <p className="font-semibold uppercase tracking-wide" style={{ fontSize: "9px" }}>Escanear primero - Orden</p>
        <svg ref={orderRef} className="my-1" />
        <p className="font-bold" style={{ fontSize: "14px", letterSpacing: "2px" }}>{spaced(orden)}</p>
      </div>

      <div className="flex flex-col items-center px-3 py-2" style={{ borderBottom: "1px solid #000" }}>
        <p className="font-semibold uppercase tracking-wide" style={{ fontSize: "9px" }}>Escanear segundo - Producto</p>
        {barcode ? (
          <svg ref={prodRef} className="my-1" />
        ) : (
          <div className="my-1 flex items-center justify-center text-slate-400" style={{ height: "38px", fontSize: "10px" }}>Sin código de barras</div>
        )}
        <p className="font-bold" style={{ fontSize: "14px", letterSpacing: "2px" }}>{spaced(barcode || "")}</p>
      </div>

      <div className="px-3 py-2 space-y-0.5 leading-tight" style={{ fontSize: "11px" }}>
        <p><span className="font-bold">Producto:</span> {producto || ""}</p>
        {patas && <p>{patas}</p>}
        <p><span className="font-bold">Cliente:</span> <span style={{ color: "#228B22", fontWeight: 600 }}>{cliente || ""}</span></p>
        <p><span className="font-bold">Orden:</span> {orden || ""}</p>
      </div>
    </div>
  );
}