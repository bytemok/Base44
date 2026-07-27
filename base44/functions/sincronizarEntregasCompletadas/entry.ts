import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { requireAdmin } from "../../shared/authGuards.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const auth = await requireAdmin(base44);
    if (auth.response) return auth.response;

    const body = await req.json().catch(() => ({}));
    if (body.dry_run) return Response.json({ ok: true, dry_run: true });

    let res;
    try {
      res = await base44.functions.invoke("odoo", { resource: "entregas_calendario", force_refresh: true });
    } catch (error) {
      const detail = error.response?.data?.error || error.message || String(error);
      return Response.json({ ok: false, source: "odoo", error: detail, scanned: 0, completed: 0, updated: [] });
    }
    const rows = res.data?.data || [];
    const completed = rows.filter((r) => {
      const estado = String(r.estado || "").toLowerCase();
      return r.enviada === true || ["done", "entregada", "completada", "completado"].includes(estado);
    });

    const updated = [];
    const failed = [];
    for (const row of completed) {
      if (!row.id) {
        failed.push({ id: null, order_ref: row.order_ref || row.referencia || "", error: "Entrega sin id local" });
        continue;
      }
      try {
        const current = await base44.asServiceRole.entities.EntregaProgramada.get(row.id).catch(() => null);
        if (!current) {
          failed.push({ id: row.id, order_ref: row.order_ref || row.referencia || "", error: "Entrega local no encontrada" });
          continue;
        }
        if (["Entregada", "Completado", "Completada"].includes(current.estado)) continue;
        const saved = await base44.asServiceRole.entities.EntregaProgramada.update(row.id, { estado: "Entregada" });
        updated.push({ id: saved.id, order_ref: saved.order_ref });
      } catch (error) {
        failed.push({ id: row.id, order_ref: row.order_ref || row.referencia || "", error: error.message || String(error) });
      }
    }

    return Response.json({ ok: failed.length === 0, scanned: rows.length, completed: completed.length, updated, failed });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
}