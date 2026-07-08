import { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";

// Module-level cache + in-flight dedup, shared across every useOdoo caller.
// Stale-while-revalidate: serves cached data instantly, but revalidates in the
// background when the cache is older than TTL — so stale data (e.g. from before
// a backend change) self-heals instead of staying frozen.
const cache = new Map();      // key -> { data, meta, ts }
const inflight = new Map();   // key -> Promise
const TTL = 30000;             // 30s

const keyOf = (resource, limit) => `${resource}:${limit || ""}`;

function networkFetch(resource, limit) {
  const key = keyOf(resource, limit);
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

export function useOdoo(resource, limit, opts = {}) {
  const key = keyOf(resource, limit);
  const fresh = !!opts.fresh; // bypass cache for callers whose fields changed (e.g. Ventas)
  const [data, setData] = useState(() => cache.get(key)?.data || []);
  const [meta, setMeta] = useState(() => cache.get(key)?.meta || null);
  const [loading, setLoading] = useState(() => !cache.has(key));
  const [error, setError] = useState(null);
  const alive = useRef(true);

  const load = useCallback(async (force = false) => {
    if (force || fresh) cache.delete(key);
    const entry = cache.get(key);
    const hasCache = !!entry;
    const isFresh = hasCache && Date.now() - entry.ts < TTL;
    // Show cached data instantly; only spin if we have nothing to show.
    if (hasCache) setLoading(false);
    else setLoading(true);
    setError(null);
    if (isFresh && !force && !fresh) return; // fresh enough — skip the network (dedup + cache win)
    try {
      const { data: d, meta: m } = await networkFetch(resource, limit);
      if (!alive.current) return;
      setData(d);
      setMeta(m);
    } catch (e) {
      if (!alive.current) return;
      setError(e?.response?.data?.error || e.message || "Error");
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [resource, limit, key, fresh]);

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