import React, { useState } from "react";
import { Outlet, useLocation, Link } from "react-router-dom";
import { Menu, ChevronRight } from "lucide-react";
import Sidebar from "./Sidebar";
import { getModuleByPath } from "./modules";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const current = getModuleByPath(location.pathname);
  const moduleName = current?.label || "Dashboard";

  return (
    <div className="min-h-screen bg-[#F4F4F4]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="md:pl-20">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md sm:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm text-slate-500">
            <Link to="/" className="hover:text-slate-700">
              IdearMarket
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
            <Link to="/" className="hover:text-slate-700">
              Inicio
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
            <span className="font-medium text-slate-800">{moduleName}</span>
          </nav>
        </header>

        {/* Content */}
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}