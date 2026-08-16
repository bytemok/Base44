import React from "react";
import { Search } from "lucide-react";

export default function PublicStoreHeader() {
  const focusSearch = () => document.getElementById("catalogo-search")?.focus();

  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-28 max-w-7xl items-center justify-between px-4 sm:h-36 sm:px-6">
        <a href="/" className="block leading-none tracking-tight text-foreground" aria-label="Todo en Muebles">
          <span className="block text-2xl font-black sm:text-3xl">TODO<span className="inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-foreground text-[10px] align-middle sm:h-6 sm:w-6">EN</span></span>
          <span className="block text-xl font-black sm:text-2xl">MUEBLES</span>
        </a>
        <nav className="hidden flex-1 items-center pl-12 text-sm font-medium text-muted-foreground sm:flex">
          <a href="/shop">Productos en stock</a>
        </nav>
        <button onClick={focusSearch} className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-foreground transition hover:bg-muted" aria-label="Buscar productos">
          <Search className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}