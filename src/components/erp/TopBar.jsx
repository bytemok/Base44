import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Puzzle, Bell, Pencil, Truck, PackageCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import AppSwitcher from "./AppSwitcher";
import GlobalSearch from "./GlobalSearch";
import ProfileMenu from "./ProfileMenu";

export default function TopBar() {
  const [notifOpen, setNotifOpen] = useState(false);
  const [noLeidas, setNoLeidas] = useState([]);
  const [vista, setVista] = useState([]);

  const cargar = async () => {
    try {
      const data = await base44.entities.Notificacion.filter({ leida: false }, "-created_date", 10);
      setNoLeidas(Array.isArray(data) ? data : []);
    } catch (e) {}
  };

  useEffect(() => {
    cargar();
    const unsub = base44.entities.Notificacion.subscribe(() => cargar());
    return () => unsub && unsub();
  }, []);

  const toggleNotif = async () => {
    if (!notifOpen) {
      setVista(noLeidas.length ? noLeidas : []);
      setNotifOpen(true);
      if (noLeidas.length) {
        setNoLeidas([]);
        try {
          await base44.entities.Notificacion.updateMany({ leida: false }, { $set: { leida: true } });
        } catch (e) {}
      }
    } else {
      setNotifOpen(false);
    }
  };

  return (
    <header className="safe-top sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-slate-200 bg-white px-3 sm:gap-4 sm:px-5">
      <Link to="/" className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
          <Puzzle className="h-5 w-5" />
        </span>
        <span className="hidden text-sm font-bold text-slate-800 sm:block"></span>
      </Link>
      <div className="h-6 w-px bg-slate-200" />
      <AppSwitcher />
      <div className="flex-1" />
      <GlobalSearch />
      <Link to="/perfil" className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
        <Pencil className="h-4 w-4" /> <span className="hidden lg:block">Soporte</span>
      </Link>
      <div className="relative">
        <button onClick={toggleNotif} className="relative rounded-md p-1.5 text-slate-500 hover:bg-slate-100">
          <Bell className="h-5 w-5" />
          {noLeidas.length > 0 &&
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
              {noLeidas.length > 9 ? "9+" : noLeidas.length}
            </span>
          }
        </button>
        {notifOpen &&
        <>
            <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
            <div className="absolute right-0 z-40 mt-1 max-h-96 w-80 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
              {vista.length === 0 ?
            <p className="p-4 text-sm text-slate-500">Sin notificaciones nuevas</p> :

            <ul className="divide-y divide-slate-100">
                  {vista.map((n) =>
              <li key={n.id} className="flex gap-3 px-3 py-2.5">
                      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${n.tipo === "entrega" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                        {n.tipo === "entrega" ? <PackageCheck className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800">{n.titulo}</p>
                        <p className="truncate text-xs text-slate-500">{n.mensaje}</p>
                        {n.pedido_ref && <p className="mt-0.5 font-mono text-[10px] text-slate-400">{n.pedido_ref}</p>}
                      </div>
                    </li>
              )}
                </ul>
            }
            </div>
          </>
        }
      </div>
      <ProfileMenu />
    </header>);

}