import React, { useEffect, useRef, useState } from "react";

// Defers rendering of children until they scroll near the viewport.
// Used on the dashboard to avoid firing every Odoo fetch at once on mount.
export default function LazyMount({ children, fallback = null, rootMargin = "300px" }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    if (typeof IntersectionObserver === "undefined") { setShown(true); return; }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) { setShown(true); io.disconnect(); }
      },
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown, rootMargin]);

  return <div ref={ref}>{shown ? children : fallback}</div>;
}