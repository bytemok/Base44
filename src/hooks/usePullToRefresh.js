import { useEffect, useRef, useState } from "react";

export function usePullToRefresh(onRefresh, threshold = 70) {
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const lastY = useRef(0);
  const active = useRef(false);
  const cb = useRef(onRefresh);
  cb.current = onRefresh;

  useEffect(() => {
    const scroller = document.getElementById("app-scroll") || window;
    const getScrollTop = () =>
      scroller === window ? window.scrollY : scroller.scrollTop;
    const onStart = (e) => {
      if (getScrollTop() > 0) { active.current = false; return; }
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
      if (dy > threshold && getScrollTop() <= 0 && !refreshing) {
        setRefreshing(true);
        try { await cb.current?.(); } finally { setRefreshing(false); }
      }
    };
    const el = scroller === window ? window : scroller;
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: true });
    el.addEventListener("touchend", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
    };
  }, [refreshing, threshold]);

  return refreshing;
}