import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

export function useOdoo(resource, limit) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("odoo", { resource, limit });
      setData(res.data?.data || []);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Error");
    } finally {
      setLoading(false);
    }
  }, [resource, limit]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}