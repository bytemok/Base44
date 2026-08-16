import React from "react";
import { MessageCircle } from "lucide-react";

export default function WhatsAppFloat() {
  return (
    <a href="https://wa.me/5491141460020?text=Hola!%20Me%20gustar%C3%ADa%20contactar%20a%20un%20vendedor." target="_blank" rel="noopener noreferrer" aria-label="Contactar un vendedor por WhatsApp" className="fixed bottom-5 right-5 z-50 flex items-center gap-3">
      <span className="hidden rounded-full bg-[#22c55e] px-5 py-3 text-sm font-bold text-white shadow-lg sm:inline">Contactar un vendedor</span>
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#22c55e] text-white shadow-xl ring-4 ring-white">
        <MessageCircle className="h-7 w-7" />
      </span>
    </a>
  );
}