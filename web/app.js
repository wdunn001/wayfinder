/* Wayfinder — offline maps & directions.
 * Backends are proxied same-origin by the app's nginx:
 *   /geocode -> Photon   /route -> OSRM (route + trip)   /tiles -> tilecache
 * Route-planning model ported from mass-zero-fpv fleet maps (drone bits removed). */

const GEOCODE = "/geocode";
const OSRM = "/route";
const TILE = {
  street: "/tiles/osm/{z}/{x}/{y}.png",
  satellite: "/tiles/esri-imagery/{z}/{y}/{x}",
  vector: "/martin/planet/{z}/{x}/{y}",   // Martin planet vector (incl. `buildings` layer)
  terrain: "/martin/terrarium/{z}/{x}/{y}", // Martin terrarium-encoded DEM (3D terrain + hillshade)
};
const STOP_COLORS = ["#1565c0","#c62828","#2e7d32","#ef6c00","#6a1b9a","#00838f","#ad1457","#558b2f"];
const colorFor = (i) => STOP_COLORS[((i % STOP_COLORS.length) + STOP_COLORS.length) % STOP_COLORS.length];

/* ---------- ported pure helpers (routeBuilderModel.ts) ---------- */
function moveStop(stops, index, dir) {
  const t = dir === "up" ? index - 1 : index + 1;
  if (index < 0 || index >= stops.length || t < 0 || t >= stops.length) return stops;
  const next = stops.slice();
  [next[index], next[t]] = [next[t], next[index]];
  return next;
}
function parseBatchAddresses(input, max = 200) {
  const text = (input ?? "").trim();
  if (!text) return { addresses: [], truncated: false };
  let candidates = [];
  if (text.startsWith("[") || text.startsWith("{")) {
    try {
      const parsed = JSON.parse(text);
      for (const item of (Array.isArray(parsed) ? parsed : [parsed])) {
        if (typeof item === "string") candidates.push(item);
        else if (item && typeof item === "object") {
          const v = item.address ?? item.Address ?? item.name ?? item.label ?? item.query ?? item.q;
          if (typeof v === "string") candidates.push(v);
        }
      }
    } catch { candidates = []; }
  }
  if (!candidates.length) candidates = text.split(/\r?\n/);
  const seen = new Set(), out = [];
  for (const c of candidates) {
    const a = (c ?? "").trim();
    if (!a || a.startsWith("#")) continue;
    const k = a.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    if (out.length >= max) return { addresses: out, truncated: true };
    out.push(a);
  }
  return { addresses: out, truncated: false };
}
function fmtDist(m) {
  if (!Number.isFinite(m) || m < 0) return "—";
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(m / 1000 < 10 ? 1 : 0)} km`;
}
function fmtDur(s) {
  if (!Number.isFinite(s) || s < 0) return "—";
  s = Math.round(s);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60), r = s % 60;
  if (m < 60) return r ? `${m}m ${r}s` : `${m}m`;
  const h = Math.floor(m / 60), mm = m % 60;
  return mm ? `${h}h ${mm}m` : `${h}h`;
}
/* Photon GeoJSON feature -> { lat, lng, label } */
function featureToStop(f) {
  const [lng, lat] = f.geometry.coordinates;
  const p = f.properties || {};
  const main = p.name || [p.housenumber, p.street].filter(Boolean).join(" ") || p.city || p.country || "Pinned location";
  const sub = [p.street && p.name ? p.street : null, p.city, p.state, p.country].filter(Boolean).join(", ");
  return { lat, lng, label: main, sub };
}

/* ---------- state ---------- */
let stops = [];           // { localId, lat, lng, label }
let markers = [];
let seq = 0;
const newId = () => `s${++seq}`;

/* ---------- map ---------- */
const map = new maplibregl.Map({
  container: "map",
  style: {
    version: 8,
    sources: {
      street: { type: "raster", tiles: [TILE.street], tileSize: 256, maxzoom: 19,
        attribution: '&copy; OpenStreetMap contributors (self-hosted)' },
      satellite: { type: "raster", tiles: [TILE.satellite], tileSize: 256, maxzoom: 18,
        attribution: "Tiles &copy; Esri (self-hosted cache)" },
      // Self-hosted Martin planet vector tiles — its `buildings` source-layer carries
      // height/min_height, used by the 3D fill-extrusion layer below.
      "mz-vector": { type: "vector", tiles: [TILE.vector], minzoom: 0, maxzoom: 15,
        attribution: "&copy; OpenStreetMap, Protomaps (self-hosted)" },
      // Terrarium-encoded DEM for 3D terrain + hillshade (served by Martin once baked).
      "mz-terrain": { type: "raster-dem", tiles: [TILE.terrain], tileSize: 256, encoding: "terrarium",
        maxzoom: 9, attribution: "Elevation &copy; Mapzen / AWS Terrain Tiles" },
    },
    layers: [{ id: "base", type: "raster", source: "street" }],
  },
  center: [-98.5, 39.8],
  zoom: 4,
});
map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");
map.addControl(new maplibregl.ScaleControl({ unit: "imperial" }), "bottom-left");

// Exposed for the geofence-layers ES module (geofence.js), which owns drawing + persistence.
window.nomadMap = map;

map.on("load", () => {
  map.addSource("route", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  map.addLayer({ id: "route-line", type: "line", source: "route",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#1e88e5", "line-width": 5, "line-opacity": 0.85 } });

  // Hillshade relief from the terrarium DEM — hidden until 3D is on (no-op until the DEM is baked).
  map.addLayer({ id: "hillshade", type: "hillshade", source: "mz-terrain",
    layout: { visibility: "none" }, paint: { "hillshade-exaggeration": 0.45 } }, "route-line");

  // 3D building extrusions from Martin's planet `buildings` layer — hidden until 3D is on.
  // Inserted beneath route-line so routes stay visible over the buildings.
  map.addLayer({
    id: "buildings-3d",
    type: "fill-extrusion",
    source: "mz-vector",
    "source-layer": "buildings",
    minzoom: 13,
    layout: { visibility: "none" },
    // Extrude every building footprint; untagged ones (most residential) get a
    // sensible default height so they still pop up in 3D instead of being filtered out.
    paint: {
      "fill-extrusion-color": "#9fb0bd",
      "fill-extrusion-opacity": 0.85,
      "fill-extrusion-height": ["coalesce", ["get", "height"], 8],
      "fill-extrusion-base": ["coalesce", ["get", "min_height"], 0],
    },
  }, "route-line");
});

/* ---------- 3D mode (tilt + building extrusions) ---------- */
let is3D = false;
const btn3d = document.getElementById("btn-3d");
function set3D(on) {
  is3D = on;
  btn3d && btn3d.classList.toggle("active", on);
  if (map.getLayer("buildings-3d"))
    map.setLayoutProperty("buildings-3d", "visibility", on ? "visible" : "none");
  if (map.getLayer("hillshade"))
    map.setLayoutProperty("hillshade", "visibility", on ? "visible" : "none");
  // Drape the map over the DEM (flat/no-op until the terrarium tiles exist).
  try { map.setTerrain(on ? { source: "mz-terrain", exaggeration: 1.3 } : null); }
  catch (e) { /* DEM source not ready */ }
  map.easeTo({ pitch: on ? 55 : 0, bearing: on ? map.getBearing() : 0, duration: 500 });
}
btn3d && btn3d.addEventListener("click", () => set3D(!is3D));

/* ---------- live traffic overlay (TomTom flow tiles via same-origin /traffic proxy) ---------- */
let isTraffic = false, trafficProbed = false;
const btnTraffic = document.getElementById("btn-traffic");
function ensureTrafficLayer() {
  if (map.getSource("traffic")) return;
  map.addSource("traffic", {
    type: "raster", tiles: ["/traffic/{z}/{x}/{y}.png"], tileSize: 256, maxzoom: 22,
    attribution: "Traffic &copy; TomTom",
  });
  // Under the route line (and 3D buildings) so planning stays readable.
  const below = map.getLayer("buildings-3d") ? "buildings-3d"
    : (map.getLayer("route-line") ? "route-line" : undefined);
  map.addLayer({ id: "traffic", type: "raster", source: "traffic",
    paint: { "raster-opacity": 0.85 } }, below);
}
async function setTraffic(on) {
  // First enable: probe one tile so a missing server key (or an offline box)
  // surfaces as a message instead of a silently empty overlay.
  if (on && !trafficProbed) {
    try {
      const c = map.getCenter(), z = Math.max(4, Math.min(12, Math.round(map.getZoom())));
      const n = 2 ** z;
      const x = Math.floor(((c.lng + 180) / 360) * n);
      const y = Math.floor(((1 - Math.log(Math.tan((c.lat * Math.PI) / 180) + 1 / Math.cos((c.lat * Math.PI) / 180)) / Math.PI) / 2) * n);
      const r = await fetch(`/traffic/${z}/${x}/${y}.png`, { cache: "no-store" });
      if (!r.ok) {
        showError(r.status === 403
          ? "Traffic needs a TomTom API key on the server (set TOMTOM_API_KEY on the container)."
          : `Traffic tiles unavailable (HTTP ${r.status}) — is the box online?`);
        return;
      }
      trafficProbed = true;
      clearError();
    } catch {
      showError("Traffic tiles unreachable — the traffic overlay needs internet access.");
      return;
    }
  }
  isTraffic = on;
  btnTraffic && btnTraffic.classList.toggle("active", on);
  ensureTrafficLayer();
  map.setLayoutProperty("traffic", "visibility", on ? "visible" : "none");
}
btnTraffic && btnTraffic.addEventListener("click", () => setTraffic(!isTraffic));

map.on("click", async (e) => {
  // When the geofence tools are active (drawing/deleting), map clicks belong to
  // the draw layer — don't also drop a route stop.
  if (window.nomadDrawActive) return;
  const { lng, lat } = e.lngLat;
  const stop = { localId: newId(), lat, lng, label: `Pin ${stops.length + 1}` };
  stops.push(stop);
  render();
  // reverse-geocode for a friendlier label (best-effort)
  try {
    const r = await fetch(`${GEOCODE}/reverse?lat=${lat}&lon=${lng}&lang=en`);
    const j = await r.json();
    if (j.features && j.features[0]) {
      const s = featureToStop(j.features[0]);
      const cur = stops.find((x) => x.localId === stop.localId);
      if (cur) { cur.label = s.label; render(); }
    }
  } catch { /* keep the pin label */ }
});

/* ---------- basemap switch ---------- */
document.querySelectorAll(".base-btn").forEach((b) => {
  b.addEventListener("click", () => {
    document.querySelectorAll(".base-btn").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    map.getLayer("base") && map.removeLayer("base");
    // Keep the basemap at the bottom (beneath buildings + route).
    const below = map.getLayer("buildings-3d") ? "buildings-3d"
      : (map.getLayer("route-line") ? "route-line" : undefined);
    map.addLayer({ id: "base", type: "raster", source: b.dataset.base }, below);
  });
});

/* ---------- geocode search ---------- */
const input = document.getElementById("search-input");
const resultsEl = document.getElementById("search-results");
let searchTimer = null, lastResults = [];

input.addEventListener("input", () => {
  clearTimeout(searchTimer);
  const q = input.value.trim();
  if (q.length < 3) { hideResults(); return; }
  searchTimer = setTimeout(() => doSearch(q), 250);
});
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && lastResults[0]) { e.preventDefault(); pickResult(0); }
  if (e.key === "Escape") hideResults();
});
document.addEventListener("click", (e) => {
  if (!e.target.closest(".search")) hideResults();
});

async function doSearch(q) {
  try {
    const c = map.getCenter();
    const url = `${GEOCODE}/api?q=${encodeURIComponent(q)}&limit=8&lang=en&lat=${c.lat}&lon=${c.lng}`;
    const r = await fetch(url);
    const j = await r.json();
    lastResults = (j.features || []).map(featureToStop);
    renderResults();
  } catch { showError("Geocoder (Photon) unreachable."); }
}
function renderResults() {
  if (!lastResults.length) { hideResults(); return; }
  resultsEl.innerHTML = "";
  lastResults.forEach((s, i) => {
    const li = document.createElement("li");
    li.innerHTML = `${escapeHtml(s.label)}<span class="sub">${escapeHtml(s.sub || "")}</span>`;
    li.addEventListener("click", () => pickResult(i));
    resultsEl.appendChild(li);
  });
  positionResults();
  resultsEl.classList.remove("hidden");
}
// Anchor the fixed-position dropdown under the search input.
function positionResults() {
  const r = input.getBoundingClientRect();
  resultsEl.style.left = `${r.left}px`;
  resultsEl.style.top = `${r.bottom + 4}px`;
  resultsEl.style.width = `${r.width}px`;
}
window.addEventListener("resize", () => { if (!resultsEl.classList.contains("hidden")) positionResults(); });
function hideResults() { resultsEl.classList.add("hidden"); }
function pickResult(i) {
  const s = lastResults[i];
  if (!s) return;
  stops.push({ localId: newId(), lat: s.lat, lng: s.lng, label: s.label });
  input.value = "";
  hideResults();
  map.flyTo({ center: [s.lng, s.lat], zoom: Math.max(map.getZoom(), 12) });
  render();
}

/* ---------- stop list rendering ---------- */
const stopsEl = document.getElementById("stops");
function render() {
  stopsEl.innerHTML = "";
  stops.forEach((s, i) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="idx" style="background:${colorFor(i)}">${i + 1}</span>
      <span class="lbl" title="${escapeHtml(s.label)}">${escapeHtml(s.label)}</span>
      <span class="ctl">
        <button data-act="up" title="Move up">▲</button>
        <button data-act="down" title="Move down">▼</button>
        <button data-act="del" title="Remove">✕</button>
      </span>`;
    li.querySelector('[data-act="up"]').onclick = () => { stops = moveStop(stops, i, "up"); clearRoute(); render(); };
    li.querySelector('[data-act="down"]').onclick = () => { stops = moveStop(stops, i, "down"); clearRoute(); render(); };
    li.querySelector('[data-act="del"]').onclick = () => { stops.splice(i, 1); clearRoute(); render(); };
    stopsEl.appendChild(li);
  });
  syncMarkers();
  const has2 = stops.length >= 2;
  document.getElementById("btn-route").disabled = !has2;
  document.getElementById("btn-optimize").disabled = stops.length < 3;
  document.getElementById("btn-clear").disabled = stops.length === 0;
}
function syncMarkers() {
  markers.forEach((m) => m.remove());
  markers = stops.map((s, i) => {
    const el = document.createElement("div");
    el.style.cssText = `width:26px;height:26px;border-radius:50%;background:${colorFor(i)};color:#fff;
      display:grid;place-items:center;font:700 13px system-ui;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.5)`;
    el.textContent = i + 1;
    return new maplibregl.Marker({ element: el })
      .setLngLat([s.lng, s.lat])
      .setPopup(new maplibregl.Popup({ offset: 18 }).setText(s.label))
      .addTo(map);
  });
}

/* ---------- routing (OSRM) ---------- */
const coordStr = () => stops.map((s) => `${s.lng},${s.lat}`).join(";");

document.getElementById("btn-route").onclick = async () => {
  clearError();
  try {
    const r = await fetch(`${OSRM}/route/v1/driving/${coordStr()}?overview=full&geometries=geojson`);
    const j = await r.json();
    if (j.code !== "Ok" || !j.routes?.[0]) return showError(routeErr(j));
    drawRoute(j.routes[0].geometry);
    showSummary(j.routes[0].distance, j.routes[0].duration, stops.length);
  } catch { showError("Routing engine (OSRM) unreachable."); }
};

document.getElementById("btn-optimize").onclick = async () => {
  clearError();
  try {
    const r = await fetch(`${OSRM}/trip/v1/driving/${coordStr()}?source=first&roundtrip=false&overview=full&geometries=geojson`);
    const j = await r.json();
    if (j.code !== "Ok" || !j.trips?.[0]) return showError(routeErr(j));
    // waypoints[i].waypoint_index = position of original stop i in the optimized order
    const ordered = stops.map((s, i) => ({ s, pos: j.waypoints[i].waypoint_index }))
      .sort((a, b) => a.pos - b.pos).map((x) => x.s);
    stops = ordered;
    render();
    drawRoute(j.trips[0].geometry);
    showSummary(j.trips[0].distance, j.trips[0].duration, stops.length, true);
  } catch { showError("Optimizer (OSRM trip) unreachable."); }
};

document.getElementById("btn-clear").onclick = () => { stops = []; clearRoute(); clearError(); hideSummary(); render(); };

function routeErr(j) {
  if (j.code === "NoRoute") return "No drivable route between these stops (check OSRM region coverage).";
  return `Could not compute a route (${j.code || "error"}).`;
}
function drawRoute(geometry) {
  map.getSource("route").setData({ type: "Feature", geometry, properties: {} });
  const b = new maplibregl.LngLatBounds();
  geometry.coordinates.forEach((c) => b.extend(c));
  if (!b.isEmpty()) map.fitBounds(b, { padding: { top: 60, bottom: 60, left: 390, right: 60 } });
}
function clearRoute() { map.getSource && map.getSource("route") && map.getSource("route").setData({ type: "FeatureCollection", features: [] }); }

/* ---------- batch import ---------- */
document.getElementById("btn-batch").onclick = async () => {
  const { addresses, truncated } = parseBatchAddresses(document.getElementById("batch-input").value);
  const status = document.getElementById("batch-status");
  if (!addresses.length) { status.textContent = "No addresses found."; return; }
  let added = 0, failed = 0;
  for (let i = 0; i < addresses.length; i++) {
    status.textContent = `Geocoding ${i + 1}/${addresses.length}…`;
    try {
      const r = await fetch(`${GEOCODE}/api?q=${encodeURIComponent(addresses[i])}&limit=1&lang=en`);
      const j = await r.json();
      if (j.features?.[0]) { const s = featureToStop(j.features[0]); stops.push({ localId: newId(), lat: s.lat, lng: s.lng, label: s.label }); added++; }
      else failed++;
    } catch { failed++; }
  }
  status.textContent = `Added ${added}${failed ? `, ${failed} not found` : ""}${truncated ? " (capped at 200)" : ""}.`;
  render();
  if (added) {
    const b = new maplibregl.LngLatBounds();
    stops.forEach((s) => b.extend([s.lng, s.lat]));
    if (!b.isEmpty()) map.fitBounds(b, { padding: 80, maxZoom: 14 });
  }
};

/* ---------- summary / errors ---------- */
function showSummary(dist, dur, n, optimized) {
  const el = document.getElementById("summary");
  el.innerHTML = `<div class="big">${fmtDist(dist)} · ${fmtDur(dur)}</div>
    <div class="muted">${n} stops${optimized ? " · optimized order" : ""} · driving</div>`;
  el.classList.remove("hidden");
}
function hideSummary() { document.getElementById("summary").classList.add("hidden"); }
function showError(msg) { const e = document.getElementById("error"); e.textContent = msg; e.classList.remove("hidden"); }
function clearError() { document.getElementById("error").classList.add("hidden"); }
function escapeHtml(s) { return (s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

render();
