const CACHEABLE_RESOURCES = new Set([
  "ventas",
  "clientes",
  "productos",
  "entregas",
  "recepciones",
  "enviados",
  "facturas",
  "catalogo",
  "control_stock",
  "alertas_stock",
  "proveedores",
  "sugerencias_compra",
]);

const DEFAULT_MAX_AGE_MS = 15 * 60 * 1000;

export function isCacheableResource(resource) {
  return CACHEABLE_RESOURCES.has(resource);
}

export function cacheKeyFor(resource, body = {}) {
  if (resource === "detalle" && body.order_id) return `${resource}:${body.order_id}`;
  if (body.limit) return `${resource}:limit:${body.limit}`;
  return resource || "";
}

function recordKey(row, index) {
  return String(
    row?.db_id ||
    row?.id ||
    row?.numero ||
    row?.referencia ||
    row?.picking_id ||
    row?.product_id ||
    row?.tmpl_id ||
    index
  );
}

function parseExtra(raw) {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

export async function readCachedResource(base44, resourceKey, maxAgeMs = DEFAULT_MAX_AGE_MS) {
  const states = await base44.asServiceRole.entities.OdooSyncState.filter({ resource: resourceKey }, "-updated_date", 1);
  const state = states?.[0];
  if (!state?.last_sync_at) return null;
  if (Date.now() - Date.parse(state.last_sync_at) > maxAgeMs) return null;

  const records = [];
  let skip = 0;
  while (true) {
    const batch = await base44.asServiceRole.entities.OdooMirrorRecord.filter({ resource: resourceKey }, "order_index", 500, skip);
    records.push(...(batch || []));
    if (!batch || batch.length < 500) break;
    skip += 500;
  }
  const seen = new Set();
  const data = (records || []).filter((r) => {
    if (seen.has(r.record_key)) return false;
    seen.add(r.record_key);
    return true;
  }).map((r) => {
    try {
      return JSON.parse(r.payload || "{}");
    } catch (_) {
      return null;
    }
  }).filter(Boolean);

  return {
    resource: resourceKey,
    count: data.length,
    data,
    cache: true,
    last_sync_at: state.last_sync_at,
    ...parseExtra(state.extra_json),
  };
}

export async function saveCachedResource(base44, resourceKey, rows, extra = {}) {
  const now = new Date().toISOString();
  await base44.asServiceRole.entities.OdooMirrorRecord.deleteMany({ resource: resourceKey });

  const seen = new Set();
  const payloads = (rows || []).filter((row, index) => {
    const key = recordKey(row, index);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map((row, index) => ({
    resource: resourceKey,
    record_key: recordKey(row, index),
    order_index: index,
    payload: JSON.stringify(row || {}),
    synced_at: now,
  }));
  for (let i = 0; i < payloads.length; i += 500) {
    await base44.asServiceRole.entities.OdooMirrorRecord.bulkCreate(payloads.slice(i, i + 500));
  }

  const state = {
    resource: resourceKey,
    last_sync_at: now,
    last_count: payloads.length,
    last_error: "",
    source: "odoo",
    extra_json: JSON.stringify(extra || {}),
  };
  const existing = await base44.asServiceRole.entities.OdooSyncState.filter({ resource: resourceKey }, "-updated_date", 1);
  if (existing?.[0]) return await base44.asServiceRole.entities.OdooSyncState.update(existing[0].id, state);
  return await base44.asServiceRole.entities.OdooSyncState.create(state);
}

export async function markCacheError(base44, resourceKey, error) {
  const state = {
    resource: resourceKey,
    last_error: error?.message || String(error),
    source: "odoo",
  };
  const existing = await base44.asServiceRole.entities.OdooSyncState.filter({ resource: resourceKey }, "-updated_date", 1);
  if (existing?.[0]) return await base44.asServiceRole.entities.OdooSyncState.update(existing[0].id, state);
  return await base44.asServiceRole.entities.OdooSyncState.create(state);
}