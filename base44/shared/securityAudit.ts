const FINANCIAL_RESOURCES = new Set(["facturas", "ventas", "detalle"]);
const CUSTOMER_RESOURCES = new Set(["clientes", "ventas", "detalle", "entregas_calendario"]);

export function isSensitiveResource(resource) {
  return FINANCIAL_RESOURCES.has(resource) || CUSTOMER_RESOURCES.has(resource);
}

export function areaForResource(resource) {
  if (FINANCIAL_RESOURCES.has(resource)) return "finanzas";
  if (CUSTOMER_RESOURCES.has(resource)) return "clientes";
  return "sistema";
}

export async function logSecurityEvent(base44, user, event) {
  try {
    await base44.asServiceRole.entities.SecurityAuditLog.create({
      area: event.area || areaForResource(event.resource || "sistema"),
      resource: event.resource || "sistema",
      action: event.action || "read",
      source: event.source || "app",
      user_id: user?.id || "system",
      user_email: user?.email || "system",
      user_name: user?.full_name || "Sistema",
      user_role: user?.role || "system",
      record_ref: event.record_ref || "",
      count: Number(event.count) || 0,
      status: event.status || "ok",
      created_at: new Date().toISOString(),
    });
  } catch (_) {}
}

export async function logSensitiveAccess(base44, user, resource, count, source, recordRef = "") {
  if (!isSensitiveResource(resource)) return;
  await logSecurityEvent(base44, user, {
    resource,
    action: "read",
    source,
    record_ref: recordRef,
    count,
    status: "ok",
  });
}