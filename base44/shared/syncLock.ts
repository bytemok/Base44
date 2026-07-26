export async function getSyncLock(base44) {
  const rows = await base44.asServiceRole.entities.OdooSyncState.filter({ resource: "sync_lock" }, "-updated_date", 1);
  const lock = rows?.[0];
  if (!lock?.extra_json) return { locked: false };
  let data = {};
  try {
    data = JSON.parse(lock.extra_json || "{}");
  } catch (_) {
    data = {};
  }
  const blockedUntil = data.blocked_until || "";
  const locked = blockedUntil && Date.parse(blockedUntil) > Date.now();
  return {
    locked: !!locked,
    blocked_until: blockedUntil,
    reason: data.reason || lock.last_error || "Bloqueo temporal de sincronización",
    reference: data.reference || "",
    record: lock,
  };
}

export async function setSyncLock(base44, { reason, source = "security", minutes = 120, reference = "" }) {
  const now = new Date();
  const blockedUntil = new Date(now.getTime() + minutes * 60 * 1000).toISOString();
  const state = {
    resource: "sync_lock",
    last_sync_at: now.toISOString(),
    last_count: 1,
    last_error: reason || "Bloqueo temporal de sincronización",
    source,
    extra_json: JSON.stringify({ blocked_until: blockedUntil, reason, reference }),
  };
  const existing = await base44.asServiceRole.entities.OdooSyncState.filter({ resource: "sync_lock" }, "-updated_date", 1);
  if (existing?.[0]) return await base44.asServiceRole.entities.OdooSyncState.update(existing[0].id, state);
  return await base44.asServiceRole.entities.OdooSyncState.create(state);
}