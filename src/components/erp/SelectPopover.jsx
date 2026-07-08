import React, { useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ChevronDown, Check } from "lucide-react";

export default function SelectPopover({ value, onChange, options, placeholder = "Seleccionar...", triggerClassName = "", align = "start", popoverClassName = "" }) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => String(o.value) === String(value ?? ""));
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 ${triggerClassName}`}
        >
          <span className="truncate text-left">{current?.label ?? placeholder}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent align={align} className={`max-h-60 w-[var(--radix-popover-trigger-width)] overflow-y-auto p-1 ${popoverClassName}`}>
        {options.map((o) => {
          const sel = String(o.value) === String(value ?? "");
          return (
            <button
              key={String(o.value)}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              <span className="truncate">{o.label}</span>
              {sel && <Check className="h-4 w-4 shrink-0 text-emerald-600" />}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}