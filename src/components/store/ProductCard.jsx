import React from "react";
import { Package, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

const attrText = (variant) => (variant.attributes || [])
  .map((attr) => attr.valor || attr.value)
  .filter(Boolean)
  .join(" · ");

export default function ProductCard({ product }) {
  const variants = (product.variants || []).slice(0, 3);

  return (
    <article className="group h-full overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-secondary/60">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        <Package className="relative h-12 w-12 text-muted-foreground/45" />
        {product.inStock && <Badge className="absolute left-3 top-3 rounded-full bg-emerald-600 text-white hover:bg-emerald-600">En stock</Badge>}
      </div>
      <div className="flex h-full flex-col p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-primary">{product.categoryName || "Catálogo"}</p>
          <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground"><Sparkles className="h-3 w-3" /> {product.rating || "4.8"}</span>
        </div>
        <h2 className="line-clamp-2 min-h-10 text-sm font-bold leading-tight text-foreground">{product.name}</h2>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Desde</p>
            <p className="text-lg font-black text-foreground">{fmt.format(product.price || 0)}</p>
          </div>
          <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-secondary-foreground">Stock {product.stockQuantity || 0}</span>
        </div>
        {variants.length > 0 && (
          <div className="mt-4 space-y-2">
            {variants.map((variant) => (
              <div key={variant.id} className="rounded-xl bg-background/70 px-3 py-2 text-xs text-muted-foreground">
                <p className="line-clamp-1 font-semibold text-foreground/80">{attrText(variant) || variant.name}</p>
                <p className="mt-0.5">{fmt.format(variant.price || product.price || 0)} · {variant.stock || 0} u.</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}