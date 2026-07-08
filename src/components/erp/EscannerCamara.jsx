import React, { useState, useRef, useEffect } from "react";
import { Camera, X, CameraOff, ScanLine } from "lucide-react";

const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf", "qr_code"];

export default function EscannerCamara({ onDetect, title = "Escanear con cámara", label = "Cámara" }) {
  const [open, setOpen] = useState(false);
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [flash, setFlash] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const detectorRef = useRef(null);
  const lastCodeRef = useRef(null);
  const lastTimeRef = useRef(0);

  const stop = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  useEffect(() => () => stop(), []);

  const tick = async () => {
    const v = videoRef.current;
    const det = detectorRef.current;
    if (streamRef.current && v && det && v.readyState >= 2) {
      try {
        const codes = await det.detect(v);
        if (codes && codes.length) {
          const code = codes[0].rawValue;
          const now = Date.now();
          if (code && (code !== lastCodeRef.current || now - lastTimeRef.current > 900)) {
            lastCodeRef.current = code;
            lastTimeRef.current = now;
            if (navigator.vibrate) navigator.vibrate(70);
            setFlash(code);
            setTimeout(() => setFlash(null), 1200);
            onDetect(code);
          }
        }
      } catch (e) {}
    }
    timerRef.current = setTimeout(tick, 200);
  };

  const start = async () => {
    setError("");
    setSupported(true);
    if (typeof window === "undefined" || !("BarcodeDetector" in window)) {
      setSupported(false);
      setOpen(true);
      return;
    }
    try {
      detectorRef.current = new window.BarcodeDetector({ formats: FORMATS });
    } catch (e) {
      setSupported(false);
      setOpen(true);
      return;
    }
    setStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } });
      streamRef.current = stream;
      setOpen(true);
      setStarting(false);
      requestAnimationFrame(() => {
        const v = videoRef.current;
        if (!v) return;
        v.srcObject = stream;
        v.setAttribute("playsinline", "true");
        v.play().then(() => tick()).catch(() => {});
      });
    } catch (e) {
      setError("No se pudo acceder a la cámara: " + (e?.message || e));
      setStarting(false);
      setOpen(true);
    }
  };

  const close = () => {
    stop();
    setOpen(false);
    setSupported(true);
    setError("");
    setFlash(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={start}
        title="Escanear con cámara"
        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
      >
        <Camera className="h-4 w-4" />
        <span className="hidden sm:inline">{label}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <span className="flex items-center gap-2 text-sm font-medium">
              <ScanLine className="h-4 w-4" /> {title}
            </span>
            <button onClick={close} className="rounded-lg p-1.5 hover:bg-white/10">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="relative flex-1 overflow-hidden">
            <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-40 w-72 rounded-xl border-2 border-white/80 shadow-[0_0_0_100vw_rgba(0,0,0,0.35)]" />
            </div>

            {flash && (
              <div className="absolute left-1/2 top-6 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white shadow-lg">
                ✓ {flash}
              </div>
            )}

            {!supported && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center text-white">
                <CameraOff className="h-10 w-10" />
                <p className="max-w-xs text-sm">
                  Tu navegador no soporta el escaneo por cámara. Usá el campo de texto o un lector de código de barras USB.
                </p>
                <button onClick={close} className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black">
                  Cerrar
                </button>
              </div>
            )}

            {error && (
              <div className="absolute bottom-6 left-0 right-0 px-6 text-center text-sm text-red-200">
                {error}
                <button onClick={close} className="ml-3 underline">Cerrar</button>
              </div>
            )}

            {supported && !error && (
              <div className="absolute bottom-6 left-0 right-0 px-6 text-center text-xs text-white/70">
                Enfocá el código dentro del recuadro
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}