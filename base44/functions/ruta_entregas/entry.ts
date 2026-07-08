import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const stops = Array.isArray(body.stops) ? body.stops : [];
    const origin = (body.origin || "").trim();
    if (!stops.length) return Response.json({ error: "Faltan entregas" }, { status: 400 });

    const addr = (s) => [s.direccion, s.ciudad, "Argentina"].filter(Boolean).join(", ");
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    const geo = async (q) => {
      if (!q) return null;
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=ar&q=${encodeURIComponent(q)}`;
      try {
        const res = await fetch(url, { headers: { "User-Agent": "TodoEnMuebles-ERP/1.0", "Accept-Language": "es" } });
        if (!res.ok) return null;
        const j = await res.json();
        return j && j[0] ? { lat: parseFloat(j[0].lat), lon: parseFloat(j[0].lon) } : null;
      } catch { return null; }
    };

    const coords = [];
    for (const s of stops) { coords.push(await geo(addr(s))); await sleep(300); }
    let originCoord = null;
    if (origin) { originCoord = await geo(origin); await sleep(300); }

    const dist = (a, b) => {
      if (!a || !b) return Infinity;
      const R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLon = (b.lon - a.lon) * Math.PI / 180;
      const la1 = a.lat * Math.PI / 180, la2 = b.lat * Math.PI / 180;
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(h));
    };

    const n = stops.length;
    const visited = new Array(n).fill(false);
    const orderedIdx = [];
    if (originCoord) {
      let best = -1, bestD = Infinity;
      for (let i = 0; i < n; i++) { if (coords[i]) { const d = dist(originCoord, coords[i]); if (d < bestD) { bestD = d; best = i; } } }
      if (best === -1) best = 0;
      visited[best] = true; orderedIdx.push(best);
    } else {
      visited[0] = true; orderedIdx.push(0);
    }
    let cur = orderedIdx[0];
    while (orderedIdx.length < n) {
      let best = -1, bestD = Infinity;
      for (let i = 0; i < n; i++) {
        if (visited[i]) continue;
        const d = (coords[i] && coords[cur]) ? dist(coords[i], coords[cur]) : Infinity;
        if (d < bestD) { bestD = d; best = i; }
      }
      if (best === -1) {
        for (let i = 0; i < n; i++) if (!visited[i]) { orderedIdx.push(i); visited[i] = true; }
        break;
      }
      visited[best] = true; orderedIdx.push(best); cur = best;
    }

    const ordered = orderedIdx.map((i) => ({ ...stops[i], lat: coords[i] ? coords[i].lat : null, lon: coords[i] ? coords[i].lon : null }));

    const enc = encodeURIComponent;
    const full = ordered.map((s) => addr(s));
    const sep = enc("|");
    let mapsUrl = "https://www.google.com/maps/dir/?api=1&travelmode=driving";
    if (ordered.length === 1) {
      if (origin) { mapsUrl += `&origin=${enc(origin)}&destination=${enc(full[0])}`; }
      else { mapsUrl += `&destination=${enc(full[0])}`; }
    } else {
      let originA, destA, waypoints;
      if (origin) {
        originA = origin; destA = full[full.length - 1]; waypoints = full.slice(0, -1);
      } else {
        originA = full[0]; destA = full[full.length - 1]; waypoints = full.slice(1, -1);
      }
      mapsUrl += `&origin=${enc(originA)}&destination=${enc(destA)}`;
      if (waypoints.length) mapsUrl += `&waypoints=${waypoints.map(enc).join(sep)}`;
    }

    return Response.json({
      ordered,
      maps_url: mapsUrl,
      geocoded: coords.filter(Boolean).length,
      total: n,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});