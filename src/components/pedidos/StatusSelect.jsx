import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { STATUS_CONFIG, STATUS_ORDER } from "./StatusBadge";

export default function StatusSelect({ status, onChange, compact = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const config = STATUS_CONFIG[status] || STATUS_CONFIG["Nuevo"];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.bg} ${config.text} ring-1 ring-inset ${config.ring} hover:opacity-80 transition-opacity`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`}></span>
        {status}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {STATUS_ORDER.map((s) => {
            const c = STATUS_CONFIG[s];
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  onChange(s);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-slate-50"
              >
                <span className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`}></span>
                  {s}
                </span>
                {s === status && <Check className="h-3.5 w-3.5 text-slate-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}