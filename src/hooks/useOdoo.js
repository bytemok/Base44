import { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";

// Module-level cache + in-flight dedup: shared across every useOdoo caller,
// so parallel calls for the same resource only hit Odoo once, and navigating
// between dashboard/modules reuses cached data within the TTL window.
const cache = new Map();      // key -> { data, meta, ts }
const inflight = new Map();   // key -> Promise
const TTL = 60000;             // 60s

const keyOf = (resource, limit) => `${resource}:${limit || ""}`;

function fetchResource(resource, limit) {
  const key = keyOf(resource, limit);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < TTL) {
    return Promise.resolve({ data: hit.data, meta: hit.meta });
  }
  if (inflight.has(key)) return inflight.get(key);
  const p = base44.functions
    .invoke("odoo", { resource, limit })
    .then((res) => {
      const data = res.data?.data || [];
      const meta = res.data || null;
      cache.set(key, { data, meta, ts: Date.now() });
      inflight.delete(key);
      return { data, meta };
    })
    .catch((e) => {
      inflight.delete(key);
      throw e;
    });
  inflight.set(key, p);
  return p;
}

export function useOdoo(resource, limit) {
  const key = keyOf(resource, limit);
  const [data, setData] = useState(() => cache.get(key)?.data || []);
  const [meta, setMeta] = useState(() => cache.get(key)?.meta || null);
  const [loading, setLoading] = useState(() => !cache.has(key));
  const [error, setError] = useState(null);
  const alive = useRef(true);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      if (force) cache.delete(key);
      const { data: d, meta: m } = await fetchResource(resource, limit);
      if (!alive.current) return;
      setData(d);
      setMeta(m);
    } catch (e) {
      if (!alive.current) return;
      setError(e?.response?.data?.error || e.message || "Error");
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [resource, limit, key]);

  useEffect(() => {
    alive.current = true;
    load();
    return () => { alive.current = false; };
  }, [load]);

  return { data, meta, loading, error, reload: () => load(true) };
}

// Drop cached entries for a resource (or everything). Call after writes that
// change server state, so the next read fetches fresh data.
export function invalidateOdoo(resource) {
  if (!resource) { cache.clear(); return; }
  for (const k of [...cache.keys()]) {
    if (k.startsWith(`${resource}:`)) cache.delete(k);
  }
}