import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { requireAdmin } from "../../shared/authGuards.ts";
import { logSecurityEvent } from "../../shared/securityAudit.ts";
import { getSyncLock } from "../../shared/syncLock.ts";

const DEFAULT_RESOURCES = [
  "ventas",
  "clientes",
  "facturas",
  "catalogo",
  "inventario",
  "control_stock",
  "recepciones",
  "enviados",
  "alertas_stock",
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const auth = await requireAdmin(base44);
    if (auth.response) return auth.response;
    const user = auth.user;
    const lock = await getSyncLock(base44);
    if (lock.locked) return Response.json({ ok: false, blocked: true, blocked_until: lock.blocked_until, reason: lock.reason });
    const body = await req.json().catch(() => ({}));
    const resources = Array.isArray(body.resources) && body.resources.length ? body.resources : DEFAULT_RESOURCES;

    const results = [];
    await logSecurityEvent(base44, user, { area: "sistema", resource: "odoo_mirror", action: "sync_start", source: "syncOdooMirror", count: resources.length });

    for (const resource of resources) {
      try {
        const res = await base44.functions.invoke("odoo", { resource, force_refresh: true });
        results.push({ resource, ok: true, count: res.data?.count || 0 });
      } catch (error) {
        results.push({ resource, ok: false, error: error?.response?.data?.error || error.message || String(error) });
      }
    }

    const okCount = results.filter((r) => r.ok).length;
    await logSecurityEvent(base44, user, { area: "sistema", resource: "odoo_mirror", action: "sync_complete", source: "syncOdooMirror", count: okCount });
    return Response.json({ ok: true, resources: results });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});