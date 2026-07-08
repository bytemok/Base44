import { useEffect, useRef, useState } from "react";

export function usePullToRefresh(onRefresh, threshold = 70) {
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const lastY = useRef(0);
  const active = useRef(false);
  const cb = useRef(onRefresh);
  cb.current = onRefresh;

  useEffect(() => {
    const onStart = (e) => {
      if (window.scrollY > 0) { active.current = false; return; }
      startY.current = e.touches[0].clientY;
      lastY.current = startY.current;
      active.current = true;
    };
    const onMove = (e) => {
      if (!active.current) return;
      lastY.current = e.touches[0].clientY;
    };
    const onEnd = async () => {
      if (!active.current) return;
      const dy = lastY.current - startY.current;
      active.current = false;
      if (dy > threshold && window.scrollY <= 0 && !refreshing) {
        setRefreshing(true);
        try { await cb.current?.(); } finally { setRefreshing(false); }
      }
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [refreshing, threshold]);

  return refreshing;
}