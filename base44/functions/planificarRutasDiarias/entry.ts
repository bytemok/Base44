import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { requireAdmin } from "../../shared/authGuards.ts";

function todayBuenosAires() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function groupByZone(rows) {
  const groups = {};
  for (const row of rows) {
    const zone = row.zona || "Sin zona";
    if (!groups[zone]) groups[zone] = [];
    groups[zone].push(row);
  }
  return groups;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const auth = await requireAdmin(base44);
    if (auth.response) return auth.response;

    const body = await req.json().catch(() => ({}));
    const fecha = body.fecha || todayBuenosAires();
    const origin = body.origin || "";

    let entregas = [];
    try {
      const res = await base44.functions.invoke("odoo", { resource: "entregas_calendario", force_refresh: true });
      entregas = res.data?.data || [];
    } catch (_) {
      const locales = await base44.asServiceRole.entities.EntregaProgramada.list("fecha_entrega", 500);
      entregas = (locales || []).map((e) => ({ ...e, zona: "Sin zona", direccion: "", ciudad: "" }));
    }

    const pendientes = entregas.filter((e) => {
      const estado = String(e.estado || "").toLowerCase();
      return !["entregada", "completada", "completado"].includes(estado);
    });

    const groups = groupByZone(pendientes);
    if (body.dry_run) {
      return Response.json({ ok: true, dry_run: true, fecha, pendientes: pendientes.length, zonas: Object.keys(groups) });
    }
    const created = [];
    for (const [zona, rows] of Object.entries(groups)) {
      if (!rows.length) continue;
      const stops = rows.map((r) => ({
        id: r.id,
        order_ref: r.order_ref,
        cliente: r.cliente,
        direccion: [r.direccion, r.direccion2].filter(Boolean).join(" "),
        ciudad: r.ciudad || "",
        total: Number(r.total || 0),
      }));

      let ordered = stops;
      let rutaUrl = "";
      try {
        const route = await base44.functions.invoke("ruta_entregas", { stops, origin });
        ordered = route.data?.ordered || stops;
        rutaUrl = route.data?.maps_url || "";
      } catch (_) {}

      const payload = {
        fecha,
        zona,
        vehiculo: "",
        chofer: "",
        estado: "Borrador",
        entrega_ids: JSON.stringify(rows.map((r) => r.id).filter(Boolean)),
        cantidad_entregas: rows.length,
        total: rows.reduce((sum, r) => sum + Number(r.total || 0), 0),
        paradas: JSON.stringify(ordered.map((s, index) => ({ orden: index + 1, order_ref: s.order_ref, cliente: s.cliente, direccion: s.direccion, ciudad: s.ciudad, total: s.total }))),
        ruta_url: rutaUrl,
        notas: "Generada automáticamente a las 7:00 AM",
      };

      const existing = await base44.asServiceRole.entities.HojaRuta.filter({ fecha, zona }, "-created_date", 1);
      const routeRecord = existing?.[0]
        ? await base44.asServiceRole.entities.HojaRuta.update(existing[0].id, payload)
        : await base44.asServiceRole.entities.HojaRuta.create(payload);
      created.push({ zona, count: rows.length, hoja_ruta_id: routeRecord.id });
    }

    return Response.json({ ok: true, fecha, zonas: created.length, rutas: created });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
}