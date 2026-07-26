import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { requireAdmin } from "../../shared/authGuards.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const auth = await requireAdmin(base44);
    if (auth.response) return auth.response;

    const body = await req.json().catch(() => ({}));
    if (body.dry_run) return Response.json({ ok: true, dry_run: true });

    const res = await base44.functions.invoke("odoo", { resource: "entregas_calendario", force_refresh: true });
    const rows = res.data?.data || [];
    const completed = rows.filter((r) => {
      const estado = String(r.estado || "").toLowerCase();
      return r.enviada === true || ["done", "entregada", "completada", "completado"].includes(estado);
    });

    const updated = [];
    for (const row of completed) {
      if (!row.id) continue;
      const current = await base44.asServiceRole.entities.EntregaProgramada.get(row.id).catch(() => null);
      if (!current) continue;
      if (["Entregada", "Completado", "Completada"].includes(current.estado)) continue;
      const saved = await base44.asServiceRole.entities.EntregaProgramada.update(row.id, { estado: "Entregada" });
      updated.push({ id: saved.id, order_ref: saved.order_ref });
    }

    return Response.json({ ok: true, scanned: rows.length, completed: completed.length, updated });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
}