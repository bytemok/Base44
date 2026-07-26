import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { requireAdmin } from "../../shared/authGuards.ts";
import { setSyncLock } from "../../shared/syncLock.ts";

function buenosAiresHour(date) {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Argentina/Buenos_Aires", hour: "2-digit", hour12: false }).format(date));
}

function isFailed(log) {
  const status = String(log.status || "").toLowerCase();
  const action = String(log.action || "").toLowerCase();
  return ["error", "failed", "fallido", "denied", "blocked", "forbidden", "unauthorized"].some((x) => status.includes(x) || action.includes(x));
}

function isMassiveStateChange(log, now) {
  const action = String(log.action || "").toLowerCase();
  const outsideHours = buenosAiresHour(now) < 7 || buenosAiresHour(now) >= 21;
  return outsideHours && Number(log.count || 0) >= 25 && /(estado|status|update|bulk|masiv|sync)/i.test(action);
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const auth = await requireAdmin(base44);
    if (auth.response) return auth.response;

    const body = await req.json().catch(() => ({}));
    const now = new Date();
    const current = {
      id: body.audit_id || "",
      status: body.status || "",
      action: body.action || "",
      source: body.source || "",
      user_email: body.user_email || "",
      user_id: body.user_id || "",
      count: Number(body.count || 0),
      created_at: body.created_at || now.toISOString(),
    };

    const recent = await base44.asServiceRole.entities.SecurityAuditLog.list("-created_at", 100);
    const since = now.getTime() - 15 * 60 * 1000;
    const actor = current.user_email || current.user_id || current.source || "desconocido";
    const failedAttempts = (recent || []).filter((log) => {
      const when = Date.parse(log.created_at || log.created_date || "") || 0;
      const sameActor = actor === (log.user_email || log.user_id || log.source || "desconocido");
      return when >= since && sameActor && isFailed(log);
    });

    const alerts = [];
    if (failedAttempts.length >= 3 || isFailed(current) && failedAttempts.length >= 2) {
      alerts.push({
        type: "intentos_fallidos",
        title: "Múltiples intentos fallidos detectados",
        message: `Se detectaron ${Math.max(failedAttempts.length, 3)} intentos fallidos recientes asociados a ${actor}. La sincronización queda bloqueada temporalmente.`,
      });
    }

    if (isMassiveStateChange(current, now)) {
      alerts.push({
        type: "cambio_masivo_fuera_horario",
        title: "Cambio masivo fuera de horario",
        message: `Se detectó un cambio masivo fuera de horario (${current.count} registros). La sincronización queda bloqueada temporalmente.`,
      });
    }

    const created = [];
    for (const alert of alerts) {
      const reference = `security:${alert.type}:${actor}:${now.toISOString().slice(0, 13)}`;
      const existing = await base44.asServiceRole.entities.Notificacion.filter({ referencia: reference }, "-created_date", 1);
      if (!existing?.[0]) {
        await base44.asServiceRole.entities.Notificacion.create({
          tipo: "estado",
          titulo: alert.title,
          mensaje: alert.message,
          referencia: reference,
          cliente: "Administrador",
          pedido_ref: "Seguridad",
          leida: false,
        });
        created.push(reference);
      }
      await setSyncLock(base44, { reason: alert.message, source: "securityAuditMonitor", minutes: 120, reference });
    }

    return Response.json({ ok: true, alerts: alerts.length, notifications: created });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
}