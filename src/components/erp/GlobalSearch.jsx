import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { MODULES } from "./modules";

export default function GlobalSearch() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const matches = q.trim() ? MODULES.filter((m) => m.label.toLowerCase().includes(q.toLowerCase())) : [];
  const go = (path) => { setQ(""); setOpen(false); navigate(path); };

  return (
    <div className="relative hidden md:block">
      <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === "Enter" && matches[0]) go(matches[0].path); if (e.key === "Escape") setOpen(false); }}
        placeholder="Buscar módulo..."
        className="w-56 rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-sm outline-none focus:border-slate-400"
      />
      {open && matches.length > 0 && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-1 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            {matches.map((m) => {
              const Icon = m.icon;
              return (
                <button key={m.slug} onClick={() => go(m.path)} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-slate-600 hover:bg-slate-50">
                  <Icon className="h-4 w-4 text-slate-400" /> {m.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}