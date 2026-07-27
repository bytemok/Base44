import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { requireAdmin } from "../../shared/authGuards.ts";
import { createOdooClient } from "../../shared/odooCore.ts";
import { logSecurityEvent } from "../../shared/securityAudit.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const auth = await requireAdmin(base44);
    if (auth.response) return auth.response;
    const user = auth.user;

    const configs = await base44.asServiceRole.entities.StockCriticoConfig.filter({ activo: true });
    const activos = (configs || []).filter((c) => Number(c.product_id) && Number(c.nivel_minimo) >= 0);
    if (!activos.length) {
      return Response.json({ ok: true, revisados: 0, nuevas: 0, recuperados: 0, fallidos: [] });
    }

    let products = [];
    try {
      const { searchRead } = await createOdooClient(500);
      const ids = Array.from(new Set(activos.map((c) => Number(c.product_id)).filter(Boolean)));
      products = await searchRead(
        "product.product",
        [["id", "in", ids]],
        ["id", "name", "default_code", "qty_available"],
        "name",
        ids.length
      );
    } catch (error) {
      return Response.json({ ok: false, source: "odoo", error: error.message || String(error), revisados: 0, nuevas: 0, recuperados: 0, fallidos: [] });
    }

    const productMap = {};
    (products || []).forEach((p) => { productMap[p.id] = p; });

    const nuevas = [];
    const recuperados = [];
    const fallidos = [];
    const now = new Date().toISOString();

    for (const cfg of activos) {
      try {
        const product = productMap[Number(cfg.product_id)];
        if (!product) {
          fallidos.push({ product_id: cfg.product_id, producto: cfg.producto, error: "Producto no encontrado en Odoo" });
          continue;
        }

        const stock = Number(product.qty_available) || 0;
        const minimo = Number(cfg.nivel_minimo) || 0;
        const producto = product.name || cfg.producto || `Producto ${cfg.product_id}`;
        const codigo = product.default_code || cfg.codigo || "";

        if (stock <= minimo) {
          if (!cfg.alerta_activa) {
            const referencia = `stock:${cfg.product_id}:${now.slice(0, 16)}`;
            await base44.asServiceRole.entities.Notificacion.create({
              tipo: "stock",
              titulo: "Stock crítico",
              mensaje: `${producto}${codigo ? ` (${codigo})` : ""} bajó a ${stock} unidades. Mínimo configurado: ${minimo}.`,
              referencia,
              pedido_ref: codigo || String(cfg.product_id),
              leida: false,
            });
            await base44.asServiceRole.entities.StockCriticoConfig.update(cfg.id, {
              producto,
              codigo,
              alerta_activa: true,
              ultima_alerta_stock: stock,
              ultima_alerta_at: now,
            });
            nuevas.push({ product_id: cfg.product_id, producto, stock, minimo });
          }
        } else if (cfg.alerta_activa) {
          await base44.asServiceRole.entities.StockCriticoConfig.update(cfg.id, {
            producto,
            codigo,
            alerta_activa: false,
            ultima_alerta_stock: stock,
          });
          recuperados.push({ product_id: cfg.product_id, producto, stock, minimo });
        }
      } catch (error) {
        fallidos.push({ product_id: cfg.product_id, producto: cfg.producto, error: error.message || String(error) });
      }
    }

    await logSecurityEvent(base44, user, { area: "sistema", resource: "stock_critico", action: "monitor", source: "monitorearStockCritico", count: nuevas.length });
    return Response.json({ ok: fallidos.length === 0, revisados: activos.length, nuevas: nuevas.length, recuperados: recuperados.length, fallidos });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
}