import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

// Cuenta en vivo los pedidos con un estado dado (default: "Nuevo").
// Se actualiza en tiempo real via subscripción.
export function usePedidoCount(status = "Nuevo") {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const items = await base44.entities.Pedido.filter({ status });
      setCount(Array.isArray(items) ? items.length : 0);
    } catch {
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    refresh();
    const unsubscribe = base44.entities.Pedido.subscribe(() => refresh());
    return () => unsubscribe && unsubscribe();
  }, [refresh]);

  return { count, loading, refresh };
}