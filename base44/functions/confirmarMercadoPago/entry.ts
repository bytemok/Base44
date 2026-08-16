import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { secrets } from "base44:runtime";
import { createOdooClient } from "../../shared/odooCore.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!["admin", "vendedor"].includes(user.role)) return Response.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const mpPaymentId = String(body.numero_operacion || body.mp_payment_id || "").trim();
    const odooPaymentId = Number(body.odoo_payment_id || 0);
    const expectedAmount = Number(body.monto || body.amount || 0);

    if (!mpPaymentId) return Response.json({ error: "Falta el número de operación de Mercado Pago" }, { status: 400 });

    const token = secrets.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!token) return Response.json({ error: "Falta configurar MERCADOPAGO_ACCESS_TOKEN" }, { status: 500 });

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(mpPaymentId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const mp = await mpRes.json().catch(() => ({}));
    if (!mpRes.ok) return Response.json({ error: mp.message || "No se pudo consultar Mercado Pago" }, { status: 400 });

    const paidAmount = Number(mp.transaction_amount || 0);
    if (expectedAmount > 0 && Math.abs(paidAmount - expectedAmount) > 1) {
      return Response.json({ approved: false, status: mp.status || "monto_no_coincide", error: "El monto de Mercado Pago no coincide con la venta" }, { status: 400 });
    }

    const approved = mp.status === "approved";
    let odooPosted = false;
    if (approved && odooPaymentId) {
      const { ODOO_DB, ODOO_KEY, uid, rpc, searchRead } = await createOdooClient(1);
      const [payment] = await searchRead("account.payment", [["id", "=", odooPaymentId]], ["id", "state", "amount", "ref"], null, 1);
      if (payment && payment.state !== "posted") {
        await rpc("/jsonrpc", { service: "object", method: "execute_kw", args: [ODOO_DB, uid, ODOO_KEY, "account.payment", "action_post", [[odooPaymentId]]] });
      }
      odooPosted = !!payment;
    }

    const common = {
      mp_payment_id: Number(mp.id) || null,
      mp_payment_status: mp.status || "",
      mp_payment_status_detail: mp.status_detail || "",
      mp_confirmed_at: new Date().toISOString(),
    };

    if (body.venta_record_id) {
      await base44.asServiceRole.entities.VendedorVenta.update(body.venta_record_id, { ...common, estado: approved ? "Pagada" : "Señada" });
    }
    if (body.sena_record_id) {
      await base44.asServiceRole.entities.VendedorSena.update(body.sena_record_id, { ...common, estado: approved ? "Confirmada" : "Pendiente" });
    }

    return Response.json({ approved, status: mp.status || "", status_detail: mp.status_detail || "", payment_id: mp.id, odoo_posted: odooPosted });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
}