import React from "react";
import { Facebook, Home, Linkedin, Mail, MessageCircle, X } from "lucide-react";

export default function PublicStoreFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-8 sm:grid-cols-3 sm:px-6">
        <div>
          <h3 className="mb-3 font-semibold text-foreground">Enlaces útiles</h3>
          <a href="/shop" className="mb-4 inline-block rounded-md border border-foreground/50 px-4 py-2 text-sm text-foreground">Botón</a>
          <div className="space-y-0.5 text-sm text-muted-foreground">
            <a className="block hover:text-foreground" href="/">Inicio</a>
            <a className="block hover:text-foreground" href="#sobre-nosotros">Sobre nosotros</a>
            <a className="block hover:text-foreground" href="/shop">Productos</a>
            <a className="block hover:text-foreground" href="#legal">Legal</a>
            <a className="block hover:text-foreground" href="#contacto">Contáctenos</a>
          </div>
        </div>
        <div id="sobre-nosotros">
          <h3 className="mb-3 font-semibold text-foreground">Sobre nosotros</h3>
          {[
            "Somos fabricantes de muebles para el hogar.",
            "Diseñamos y producimos sillones, comedores y muebles a medida, cuidando cada detalle y utilizando materiales de primera calidad.",
            "Acompañamos a nuestros clientes en todo el proceso, desde la elección hasta la entrega.",
          ].map((text) => <p key={text} className="mb-4 border-l-4 border-muted pl-4 text-sm italic text-foreground/85">{text}</p>)}
        </div>
        <div id="contacto">
          <h3 className="mb-3 font-semibold text-foreground">Contáctenos</h3>
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><MessageCircle className="h-4 w-4 text-foreground" /> Contáctenos</p>
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="h-4 w-4 text-foreground" /> info@todoenmuebles.com.ar</p>
          <div className="mt-8 flex gap-3">
            {[Facebook, X, Linkedin, Home].map((Icon, i) => <span key={i} className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm"><Icon className="h-4 w-4" /></span>)}
          </div>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-sm text-muted-foreground">Copyright © Todo en Muebles</div>
    </footer>
  );
}