import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { requireAdmin } from "../../shared/authGuards.ts";

function todayBuenosAires() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const auth = await requireAdmin(base44);
    if (auth.response) return auth.response;

    const body = await req.json().catch(() => ({}));
    const deliveryId = body.delivery_id || body.id;
    if (!deliveryId) return Response.json({ error: "Falta entrega" }, { status: 400 });

    const entrega = await base44.asServiceRole.entities.EntregaProgramada.get(deliveryId);
    if (!entrega) return Response.json({ error: "Entrega no encontrada" }, { status: 404 });

    const orderRef = entrega.order_ref || String(deliveryId);
    if (body.dry_run) return Response.json({ ok: true, dry_run: true, order_ref: orderRef, cliente: entrega.cliente || "" });
    const reference = `encuesta:${orderRef}`;
    const existingNotification = await base44.asServiceRole.entities.Notificacion.filter({ referencia: reference }, "-created_date", 1);
    if (!existingNotification?.[0]) {
      await base44.asServiceRole.entities.Notificacion.create({
        tipo: "entrega",
        titulo: "Encuesta de satisfacción pendiente",
        mensaje: `La entrega ${orderRef} fue completada. Contactar a ${entrega.cliente || "el cliente"} para medir la satisfacción del servicio.`,
        referencia: reference,
        cliente: entrega.cliente || "",
        pedido_ref: orderRef,
        leida: false,
      });
    }

    const existingSurvey = await base44.asServiceRole.entities.RespuestaEncuesta.filter({ order_ref: orderRef }, "-created_date", 1);
    let survey = existingSurvey?.[0] || null;
    if (!survey) {
      survey = await base44.asServiceRole.entities.RespuestaEncuesta.create({
        order_ref: orderRef,
        cliente: entrega.cliente || "",
        telefono: "",
        nivel: 0,
        fecha: todayBuenosAires(),
        comentario: "Pendiente de respuesta del cliente",
      });
    }

    return Response.json({ ok: true, order_ref: orderRef, survey_id: survey.id });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
}