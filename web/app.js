/* Wayfinder — offline maps & directions.
 * Backends are proxied same-origin by the app's nginx:
 *   /geocode -> Photon   /route -> OSRM (route + trip)   /tiles -> tilecache
 * Route-planning model ported from mass-zero-fpv fleet maps (drone bits removed). */

const GEOCODE = "/geocode";
const OSRM = "/route";
// VECTOR + raster-DEM tiles are fetched inside MapLibre's Web Worker, which has
// no document base — a RELATIVE url ("/martin/…") throws "Failed to construct
// Request: Failed to parse URL" in the worker, so the vector `buildings` layer,
// hillshade, and terrain never loaded (this is why 3D buildings never appeared).
// Raster image tiles load on the main thread, so those tolerated relative urls.
// Make worker-loaded sources ABSOLUTE via location.origin (portable across the
// LAN split-horizon, the public host, and the :8442 direct port).
const ORIGIN = location.origin;
const TILE = {
  street: "/tiles/osm/{z}/{x}/{y}.png",
  satellite: "/tiles/esri-imagery/{z}/{y}/{x}",
  vector: ORIGIN + "/martin/planet/{z}/{x}/{y}",   // Martin planet vector (incl. `buildings` layer)
  terrain: ORIGIN + "/terrarium/{z}/{x}/{y}.png",  // real AWS/Mapzen terrarium DEM (z0-15) via nginx
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
/* ---------- dual geocoder: Nominatim+TIGER primary, Photon fallback ----------
 * Nominatim (self-hosted US + TIGER) resolves real street addresses with house
 * numbers; Photon covers place names and acts as the fallback. If Nominatim is
 * down/not-yet-imported the chain degrades automatically and retries every 5
 * minutes — the cutover to TIGER happens by itself the moment it serves. */
let nominatimUp = true;
let nominatimRetryAt = 0;
function nomToStop(r) {
  const a = r.address || {};
  const main = [a.house_number, a.road].filter(Boolean).join(" ")
    || r.name || (r.display_name || "").split(",")[0] || "Location";
  const sub = [a.city || a.town || a.village || a.hamlet, a.state, a.postcode]
    .filter(Boolean).join(", ");
  return { lat: +r.lat, lng: +r.lon, label: main, sub };
}
async function geocodeForward(q, limit) {
  const now = Date.now();
  if (nominatimUp || now > nominatimRetryAt) {
    try {
      const r = await fetch(`/nominatim/search?q=${encodeURIComponent(q)}&format=jsonv2&addressdetails=1&limit=${limit}&countrycodes=us`,
        { signal: AbortSignal.timeout ? AbortSignal.timeout(6000) : undefined });
      if (r.ok) {
        const j = await r.json();
        nominatimUp = true;
        if (Array.isArray(j) && j.length) return j.map(nomToStop);
        // empty result: fall through — Photon may still match fuzzy place names
      } else { nominatimUp = false; nominatimRetryAt = now + 300000; }
    } catch { nominatimUp = false; nominatimRetryAt = now + 300000; }
  }
  const c = map.getCenter();
  const r2 = await fetch(`${GEOCODE}/api?q=${encodeURIComponent(q)}&limit=${limit}&lang=en&lat=${c.lat}&lon=${c.lng}`);
  const j2 = await r2.json();
  return (j2.features || []).map(featureToStop);
}
async function geocodeReverse(lat, lng) {
  const now = Date.now();
  if (nominatimUp || now > nominatimRetryAt) {
    try {
      const r = await fetch(`/nominatim/reverse?lat=${lat}&lon=${lng}&format=jsonv2&addressdetails=1`,
        { signal: AbortSignal.timeout ? AbortSignal.timeout(6000) : undefined });
      if (r.ok) {
        const j = await r.json();
        nominatimUp = true;
        if (j && j.lat) return nomToStop(j);
      } else { nominatimUp = false; nominatimRetryAt = now + 300000; }
    } catch { nominatimUp = false; nominatimRetryAt = now + 300000; }
  }
  try {
    const r2 = await fetch(`${GEOCODE}/reverse?lat=${lat}&lon=${lng}&lang=en`);
    const j2 = await r2.json();
    if (j2.features && j2.features[0]) return featureToStop(j2.features[0]);
  } catch { /* keep coordinates label */ }
  return null;
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
    // Self-hosted glyphs (vendored pbf ranges): any layer using text-field
    // (e.g. the measure control's labels) hard-requires a style `glyphs`
    // endpoint — without it addLayer throws and the whole draw control dies.
    glyphs: "/vendor/fonts/{fontstack}/{range}.pbf",
    sources: {
      street: { type: "raster", tiles: [TILE.street], tileSize: 256, maxzoom: 19,
        attribution: '&copy; OpenStreetMap contributors (self-hosted)' },
      satellite: { type: "raster", tiles: [TILE.satellite], tileSize: 256, maxzoom: 18,
        attribution: "Tiles &copy; Esri (self-hosted cache)" },
      // Self-hosted Martin planet vector tiles — its `buildings` source-layer carries
      // height/min_height, used by the 3D fill-extrusion layer below.
      "mz-vector": { type: "vector", tiles: [TILE.vector], minzoom: 0, maxzoom: 15,
        attribution: "&copy; OpenStreetMap, Protomaps (self-hosted)" },
      // Real terrarium-encoded DEM (AWS/Mapzen Terrain Tiles, z0-15). Two
      // identical sources on purpose: MapLibre explicitly warns against sharing
      // one raster-dem between setTerrain and a hillshade layer (duplicated
      // request/cancel churn + reduced rendering quality).
      "mz-terrain": { type: "raster-dem", tiles: [TILE.terrain], tileSize: 256, encoding: "terrarium",
        maxzoom: 14, attribution: "Elevation &copy; Mapzen / AWS Terrain Tiles" },
      "mz-terrain-hs": { type: "raster-dem", tiles: [TILE.terrain], tileSize: 256, encoding: "terrarium",
        maxzoom: 14 },
    },
    layers: [{ id: "base", type: "raster", source: "street" }],
  },
  center: [-98.5, 39.8],
  zoom: 4,
});
map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");
// HTML5 Geolocation (GPS) + DeviceOrientation (magnetometer) via the built-in
// control: click to locate, click again to follow; the heading cone appears on
// devices that expose orientation data. Requires the HTTPS origin
// (maps.quasarke.net) — browsers block geolocation on plain http.
const geoCtl = new maplibregl.GeolocateControl({
  positionOptions: { enableHighAccuracy: true, timeout: 10000 },
  trackUserLocation: true,
  showUserLocation: true,
  showAccuracyCircle: true,
  showUserHeading: true,
});
map.addControl(geoCtl, "bottom-right");
// Surface geolocation failures visibly — silent failure looks like "it never
// asked". PERMISSION_DENIED (1) also fires when the browser treats the origin
// as insecure (e.g. an untrusted internal CA cert on the LAN side).
geoCtl.on("error", (e) => {
  const code = e && e.code;
  showError(code === 1
    ? "Location blocked: allow it in site settings — and check the padlock; an untrusted cert disables geolocation."
    : `Location unavailable (${(e && e.message) || "GPS error"}).`);
});
// Every position fix: clear stale errors, remember the position for turn-by-turn
// + "from my location", advance the active maneuver, and seed the origin the
// first time if "from my location by default" is on.
geoCtl.on("geolocate", (e) => {
  clearError();
  if (e && e.coords) {
    navUserPos = [e.coords.longitude, e.coords.latitude];
    if (!originSeeded && fromMyLocation && stops.length === 0) {
      originSeeded = true;
      setOrigin(navUserPos[0], navUserPos[1], false).catch(() => {});
    }
    if (navMode) onNavFix(e);   // update speed/heading/along-route + off-route check
    advanceNav();
  }
});
// Auto-locate on first load so the permission prompt appears without hunting
// for the button; the control stays available for re-centering / follow mode.
map.once("idle", () => { try { geoCtl.trigger(); } catch { /* unsupported */ } });
map.addControl(new maplibregl.ScaleControl({ unit: "imperial" }), "bottom-left");

// Exposed for the geofence-layers ES module (geofence.js), which owns drawing + persistence.
window.nomadMap = map;

// Without an error listener MapLibre console.errors EVERY internal error event —
// including the benign AbortErrors from tiles cancelled mid pan/zoom, which
// floods the console with bare "Error" lines. Swallow aborts, surface the rest.
map.on("error", (e) => {
  const msg = (e && e.error && e.error.message) || "";
  if (!msg || /abort/i.test(msg) || /signal is aborted/i.test(msg)) return;
  console.warn("[map]", msg);
});

map.on("load", () => {
  // Alternative routes (grey, clickable) render beneath the selected route.
  map.addSource("route-alt", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  map.addLayer({ id: "route-alts", type: "line", source: "route-alt",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#8a98a6", "line-width": 4, "line-opacity": 0.7, "line-dasharray": [1.5, 1] } });
  map.addSource("route", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  // Dark casing under the route for contrast against basemap + traffic raster.
  map.addLayer({ id: "route-casing", type: "line", source: "route",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#0d1b2a", "line-width": 8, "line-opacity": 0.45 } });
  // The route is drawn as SEGMENTS colored by live congestion (from the same
  // TomTom flow samples that adjust the ETA): GREEN = confirmed free flow,
  // amber = slowdown, red = jam, blue = no data (unknown ≠ known good). This
  // way the route line SHOWS the traffic instead of covering the overlay.
  map.addLayer({ id: "route-line", type: "line", source: "route",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": ["match", ["get", "cong"],
        "free", "#43a047",
        "slow", "#f9a825",
        "jam", "#e53935",
        /* none / no data */ "#1e88e5"],
      "line-width": 5, "line-opacity": 0.9,
    } });
  // Click a grey alternative to make it the active route.
  map.on("click", "route-alts", (e) => {
    const idx = e.features && e.features[0] && e.features[0].properties.idx;
    if (idx !== undefined && currentRoutes[idx]) selectRoute(Number(idx));
  });
  map.on("mouseenter", "route-alts", () => { map.getCanvas().style.cursor = "pointer"; });
  map.on("mouseleave", "route-alts", () => { map.getCanvas().style.cursor = ""; });

  // Hillshade relief from the real terrarium DEM (z0-15) — hidden until 3D is on.
  // Uses its own DEM source (mz-terrain-hs) — never share with setTerrain.
  map.addLayer({ id: "hillshade", type: "hillshade", source: "mz-terrain-hs",
    layout: { visibility: "none" }, paint: { "hillshade-exaggeration": 0.45 } }, "route-line");

  // 3D building extrusions from Martin's planet `buildings` layer — hidden until 3D is on.
  // Inserted beneath route-line so routes stay visible over the buildings.
  map.addLayer({
    id: "buildings-3d",
    type: "fill-extrusion",
    source: "mz-vector",
    "source-layer": "buildings",
    // The planet tileset carries `buildings` from z11 (see /martin/planet
    // tilejson) — gate the extrusions to match so 3D shows at city zooms,
    // not only when zoomed all the way in.
    minzoom: 11,
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
        showError(r.status === 401 || r.status === 403
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

/* Adding stops by clicking is an ARMED action (too easy to fat-finger points
 * otherwise): press "+ Add stop on map", click locations, Esc/press again to done. */
let addStopArmed = false;
const btnAddStop = document.getElementById("btn-add-stop");
function setAddStop(on) {
  addStopArmed = on;
  if (btnAddStop) {
    btnAddStop.classList.toggle("active", on);
    btnAddStop.textContent = on ? "Click the map to add stops — press to finish" : "+ Add stop on map";
  }
  map.getCanvas().style.cursor = on ? "crosshair" : "";
}
btnAddStop && btnAddStop.addEventListener("click", () => setAddStop(!addStopArmed));
document.addEventListener("keydown", (e) => { if (e.key === "Escape") setAddStop(false); });

map.on("click", async (e) => {
  // When the geofence tools are active (drawing/deleting), map clicks belong to
  // the draw layer — don't also drop a route stop.
  if (window.nomadDrawActive) return;
  // Stops are only added while the Add-stop button is armed.
  if (!addStopArmed) return;
  const { lng, lat } = e.lngLat;
  const stop = { localId: newId(), lat, lng, label: `Pin ${stops.length + 1}` };
  stops.push(stop);
  render();
  // reverse-geocode for a friendlier label (best-effort; TIGER-primary chain)
  try {
    const s = await geocodeReverse(lat, lng);
    if (s) {
      const cur = stops.find((x) => x.localId === stop.localId);
      if (cur) { cur.label = s.label; render(); }
    }
  } catch { /* keep the pin label */ }
});

// Tap the map to dismiss an open drawer (mobile-friendly "click outside"). Skip
// while a tool owns clicks (add-stop / drawing) or when tapping a route feature.
map.on("click", (e) => {
  if (addStopArmed || window.nomadDrawActive) return;
  if (!window.wfDrawerCollapsed || window.wfDrawerCollapsed()) return;
  const layers = ["route-alts", "route-line"].filter((l) => map.getLayer(l));
  if (layers.length && map.queryRenderedFeatures(e.point, { layers }).length) return;
  window.wfSetDrawerCollapsed(true);
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
    lastResults = await geocodeForward(q, 8);
    renderResults();
  } catch { showError("Geocoders unreachable (Nominatim + Photon both failed)."); }
}
function renderResults() {
  const q = input.value.trim();
  resultsEl.innerHTML = "";
  // Top of the dropdown: turn the typed query into a NEARBY / ALONG-ROUTE place
  // search (visual pins to pick from), not just a specific-address geocode.
  if (q.length >= 3) {
    const near = document.createElement("li");
    near.className = "search-action";
    near.innerHTML = `🔎 Search “${escapeHtml(q)}” <b>near me</b>`;
    near.addEventListener("click", () => searchNearbyText(q, false));
    resultsEl.appendChild(near);
    if (routeLine) {   // a route is drawn (planned or navigating) → offer "on my way"
      const along = document.createElement("li");
      along.className = "search-action";
      along.innerHTML = `🧭 Search “${escapeHtml(q)}” <b>along route</b>`;
      along.addEventListener("click", () => searchNearbyText(q, true));
      resultsEl.appendChild(along);
    }
  }
  lastResults.forEach((s, i) => {
    const li = document.createElement("li");
    li.innerHTML = `${escapeHtml(s.label)}<span class="sub">${escapeHtml(s.sub || "")}</span>`;
    li.addEventListener("click", () => pickResult(i));
    resultsEl.appendChild(li);
  });
  if (!resultsEl.children.length) { hideResults(); return; }
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

/* ---------- routing (OSRM) + live-traffic evaluation ---------- */
const coordStr = () => stops.map((s) => `${s.lng},${s.lat}`).join(";");
let currentRoutes = [];      // [{ geometry, distance, duration, _adjusted?, _factor? }]
let selectedRouteIdx = 0;
let optimizedOrder = false;

document.getElementById("btn-route").onclick = async () => {
  clearError();
  setAddStop(false);   // computing a route ends "add stop by clicking" so stray taps don't drop pins
  try {
    // alternatives=true -> OSRM returns up to 2 extra candidate routes to rank.
    const r = await fetch(`${OSRM}/route/v1/driving/${coordStr()}?overview=full&geometries=geojson&alternatives=true&steps=true`);
    const j = await r.json();
    if (j.code !== "Ok" || !j.routes?.[0]) return showError(routeErr(j));
    currentRoutes = j.routes; selectedRouteIdx = 0; optimizedOrder = false;
    renderRoutes(true);
    showRouteSummary();
    collapseRouteBuilder();
    // Fire-and-forget enhancement: directions are already rendered above; any
    // traffic failure only means "no adjusted ETA", never "no route".
    evaluateRoutesTraffic().catch(() => {});
  } catch { showError("Routing engine (OSRM) unreachable."); }
};

document.getElementById("btn-optimize").onclick = async () => {
  clearError();
  setAddStop(false);
  try {
    const r = await fetch(`${OSRM}/trip/v1/driving/${coordStr()}?source=first&roundtrip=false&overview=full&geometries=geojson&steps=true`);
    const j = await r.json();
    if (j.code !== "Ok" || !j.trips?.[0]) return showError(routeErr(j));
    // waypoints[i].waypoint_index = position of original stop i in the optimized order
    const ordered = stops.map((s, i) => ({ s, pos: j.waypoints[i].waypoint_index }))
      .sort((a, b) => a.pos - b.pos).map((x) => x.s);
    stops = ordered;
    render();
    currentRoutes = [j.trips[0]]; selectedRouteIdx = 0; optimizedOrder = true;
    renderRoutes(true);
    showRouteSummary();
    collapseRouteBuilder();
    evaluateRoutesTraffic().catch(() => {});
  } catch { showError("Optimizer (OSRM trip) unreachable."); }
};

document.getElementById("btn-clear").onclick = () => { stops = []; currentRoutes = []; clearRoute(); clearError(); hideSummary(); openRouteBuilder(); render(); };

function routeErr(j) {
  if (j.code === "NoRoute") return "No drivable route between these stops (check OSRM region coverage).";
  return `Could not compute a route (${j.code || "error"}).`;
}
function selectRoute(idx) {
  selectedRouteIdx = idx;
  renderRoutes(false);
  showRouteSummary();
}
function renderRoutes(fit) {
  const sel = currentRoutes[selectedRouteIdx];
  if (!sel) return clearRoute();
  // Cache the selected route's line so "search along route" works for a planned
  // route too (nav mode manages routeLine itself via startNav/reroute).
  if (!navMode && sel.geometry) setRouteLine(sel.geometry.coordinates);
  map.getSource("route").setData({ type: "FeatureCollection", features: routeSegments(sel) });
  map.getSource("route-alt").setData({
    type: "FeatureCollection",
    features: currentRoutes.map((r, i) => ({ type: "Feature", geometry: r.geometry, properties: { idx: i } }))
      .filter((f) => f.properties.idx !== selectedRouteIdx),
  });
  if (fit) {
    const b = new maplibregl.LngLatBounds();
    currentRoutes.forEach((r) => r.geometry.coordinates.forEach((c) => b.extend(c)));
    if (!b.isEmpty()) map.fitBounds(b, { padding: { top: 60, bottom: 60, left: 390, right: 60 } });
  }
}
function clearRoute() {
  ["route", "route-alt"].forEach((s) => map.getSource && map.getSource(s) &&
    map.getSource(s).setData({ type: "FeatureCollection", features: [] }));
  if (!navMode) { routeLine = null; navS = 0; }   // no route drawn -> hide "along route" search
}
// The route builder (search/stops/actions) is a collapsible <details>; collapse
// it after a route is computed so the maneuver list gets the room, reopen it to edit.
function collapseRouteBuilder() { const d = document.getElementById("route-builder"); if (d) d.open = false; }
function openRouteBuilder() { const d = document.getElementById("route-builder"); if (d) d.open = true; }

/* ================= turn-by-turn steps + "from my location" ================= */
let currentSteps = [];     // [{ loc:[lng,lat], text, icon, dist }] for the selected route
let navIdx = 0;            // index of the UPCOMING maneuver during live navigation
let navUserPos = null;     // last GPS fix [lng,lat] from the GeolocateControl
let originSeeded = false;  // origin auto-seeded from GPS once this session

const stepsEl = document.getElementById("steps-list");

function haversine(a, b) {
  const R = 6371000, rad = (d) => d * Math.PI / 180;
  const dLat = rad(b[1] - a[1]), dLng = rad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const cardinal = (bearing) =>
  ["north","northeast","east","southeast","south","southwest","west","northwest"][Math.round(((bearing || 0) % 360) / 45) % 8];

// Compact arrow glyphs (render everywhere — no icon font needed offline).
function maneuverIcon(st) {
  const m = st.maneuver || {}, mod = m.modifier || "";
  if (m.type === "arrive") return "⚑";
  if (m.type === "depart") return "•";
  if (m.type === "roundabout" || m.type === "rotary") return "⟳";
  if (mod === "uturn") return "↩";
  if (mod === "sharp left") return "↰";
  if (mod === "sharp right") return "↱";
  if (mod === "slight left") return "↖";
  if (mod === "slight right") return "↗";
  if (mod === "left") return "←";
  if (mod === "right") return "→";
  return "↑";
}
// OSRM returns maneuver type/modifier + road name, NOT prose — build the text.
function stepInstruction(st) {
  const m = st.maneuver || {}, road = (st.name || "").trim();
  const mod = m.modifier || "", onto = road ? ` onto ${road}` : "", on = road ? ` on ${road}` : "";
  switch (m.type) {
    case "depart": return `Head ${cardinal(m.bearing_after)}${on}`;
    case "turn": case "end of road": return `Turn ${mod}${onto}`;
    case "new name": return `Continue${onto}`;
    case "continue": return `Continue ${mod}`.trim() + onto;
    case "merge": return `Merge ${mod}`.trim() + onto;
    case "on ramp": return `Take the ramp${mod ? " " + mod : ""}${onto}`;
    case "off ramp": return `Take the exit${mod ? " " + mod : ""}${onto}`;
    case "fork": return `Keep ${mod || "straight"}${onto}`;
    case "roundabout": case "rotary": return `Take the roundabout${m.exit ? `, exit ${m.exit}` : ""}${onto}`;
    case "roundabout turn": return `At the roundabout turn ${mod}${onto}`;
    case "arrive": return road ? `Arrive at ${road}` : "Arrive at destination";
    default: return `${m.type || "Continue"}${mod ? " " + mod : ""}${onto}`.trim();
  }
}
function buildSteps(route) {
  const out = [];
  for (const leg of (route.legs || []))
    for (const st of (leg.steps || []))
      if (st.maneuver && st.maneuver.location)
        out.push({ loc: st.maneuver.location, text: stepInstruction(st), icon: maneuverIcon(st),
                   kind: maneuverKind(st), road: (st.name || "").trim(), dist: st.distance || 0 });
  return out;
}
function renderSteps() {
  if (!stepsEl) return;
  currentSteps = buildSteps(currentRoutes[selectedRouteIdx] || {});
  navIdx = 0;
  if (!currentSteps.length) { stepsEl.classList.add("hidden"); stepsEl.innerHTML = ""; return; }
  stepsEl.innerHTML = currentSteps.map((s, i) =>
    `<li data-i="${i}"><span class="man-ico">${s.icon}</span>` +
    `<span class="man-txt">${escapeHtml(s.text)}` +
    `${s.dist > 0 ? `<span class="man-dist"> · ${fmtDist(s.dist)}</span>` : ""}</span></li>`).join("");
  [...stepsEl.children].forEach((li, i) =>
    li.addEventListener("click", () => { if (currentSteps[i]) map.flyTo({ center: currentSteps[i].loc, zoom: 16 }); }));
  stepsEl.classList.remove("hidden");
  if (navUserPos) advanceNav(); else highlightStep();
}
function highlightStep() {
  if (!stepsEl) return;
  [...stepsEl.children].forEach((li, i) => li.classList.toggle("current", i === navIdx));
}
// Advance the "upcoming maneuver" pointer as the user reaches each turn (~30 m),
// then refresh the highlight + the collapsed launcher's live turn text.
function advanceNav() {
  if (!currentSteps.length || !navUserPos) return;
  while (navIdx < currentSteps.length - 1 && haversine(navUserPos, currentSteps[navIdx].loc) < 30) navIdx++;
  highlightStep();
  if (navMode) schedulePrompts();
  updateHeader();
}

/* ---------- "from my location" origin ---------- */
const btnMyLoc = document.getElementById("btn-my-location");
const chkFromHere = document.getElementById("chk-from-here");
const FROM_KEY = "wf-from-my-location";
let fromMyLocation = true;
try { fromMyLocation = localStorage.getItem(FROM_KEY) !== "0"; } catch { /* private mode */ } // default ON
if (chkFromHere) {
  chkFromHere.checked = fromMyLocation;
  chkFromHere.addEventListener("change", () => {
    fromMyLocation = chkFromHere.checked;
    try { localStorage.setItem(FROM_KEY, fromMyLocation ? "1" : "0"); } catch { /* private mode */ }
    if (fromMyLocation && navUserPos && stops.length === 0) { originSeeded = true; setOrigin(navUserPos[0], navUserPos[1]).catch(() => {}); }
  });
}
function currentPosition() {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error("no geolocation"));
    navigator.geolocation.getCurrentPosition(
      (p) => res([p.coords.longitude, p.coords.latitude]), rej,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 });
  });
}
// Insert (or replace) the current position as stop #0, flagged `origin` so it
// never stacks duplicates when re-used.
async function setOrigin(lng, lat, fly = true) {
  let label = "My location";
  try { const r = await geocodeReverse(lat, lng); if (r && r.label) label = `My location · ${r.label.split(",")[0]}`; } catch { /* keep generic label */ }
  const origin = { localId: newId(), lat, lng, label, origin: true };
  if (stops[0] && stops[0].origin) stops[0] = origin; else stops.unshift(origin);
  clearRoute(); hideSummary(); render();
  if (fly) map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 13) });
}
if (btnMyLoc) btnMyLoc.addEventListener("click", async () => {
  btnMyLoc.classList.add("busy");
  try { const [lng, lat] = await currentPosition(); await setOrigin(lng, lat); }
  catch { showError("Couldn't get your location — allow location access (needs the HTTPS site)."); }
  finally { btnMyLoc.classList.remove("busy"); }
});

/* Traffic evaluation: sample points along each route, ask TomTom (via the
 * same-origin cached /traffic-flow proxy) for current vs free-flow speed, and
 * scale each route's ETA by the average congestion. Silent no-op offline. */
let trafficEvalUsable = true; // flips false on auth/network failure (no spam)
function sampleCoords(geometry, n = 8) {
  const cs = geometry.coordinates;
  if (cs.length <= 2) return [{ coord: cs[0], idx: 0 }];
  const out = [];
  for (let i = 1; i <= n; i++) {
    const idx = Math.floor((cs.length - 1) * i / (n + 1));
    out.push({ coord: cs[idx], idx });
  }
  return out;
}
async function flowFactor(route) {
  const pts = sampleCoords(route.geometry);
  const samples = [];
  for (const { coord: [lng, lat], idx } of pts) {
    try {
      // Hard 4s budget per sample — a dead/slow TomTom degrades in seconds,
      // never stalls background evaluation for minutes.
      const r = await fetch(`/traffic-flow/${lat.toFixed(3)},${lng.toFixed(3)}`,
        { signal: AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined });
      if (r.status === 401 || r.status === 403) { trafficEvalUsable = false; return null; }
      if (r.status >= 500) return null; // upstream down: skip this route quietly
      if (!r.ok) continue;
      const d = (await r.json()).flowSegmentData;
      if (d && d.currentSpeed > 0 && d.freeFlowSpeed > 0)
        samples.push({ idx, ratio: Math.min(1.15, d.currentSpeed / d.freeFlowSpeed) });
    } catch { trafficEvalUsable = false; return null; } // timeout/offline: stop for this session
  }
  if (!samples.length) return null;
  const avg = samples.reduce((a, s) => a + s.ratio, 0) / samples.length;
  return { factor: Math.max(0.25, avg), samples }; // clamp: sampling noise can't claim >4x slowdown
}
async function evaluateRoutesTraffic() {
  if (!trafficEvalUsable || !currentRoutes.length) return;
  const mine = currentRoutes; // guard against a newer request replacing state
  for (const r of mine) {
    const f = await flowFactor(r);
    if (mine !== currentRoutes) return; // stale
    if (f !== null) { r._factor = f.factor; r._adjusted = r.duration / f.factor; r._samples = f.samples; }
    renderRoutes(false); // repaint the selected route with congestion colors
    showRouteSummary();
  }
}
/* Split a route into congestion-classed segments around its flow samples so
 * the drawn line SHOWS traffic (blue free / amber slow / red jam). */
function routeSegments(route) {
  const geom = route.geometry;
  const s = route._samples;
  // No flow data -> "none" (blue). Green is reserved for CONFIRMED free flow.
  if (!s || !s.length) return [{ type: "Feature", geometry: geom, properties: { cong: "none" } }];
  const cs = geom.coordinates;
  const cls = (r) => (r < 0.6 ? "jam" : r < 0.85 ? "slow" : "free");
  const feats = [];
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    // segment ends midway to the next sample (or at the route end)
    const end = i === s.length - 1 ? cs.length - 1 : Math.floor((s[i].idx + s[i + 1].idx) / 2);
    if (end > start) {
      feats.push({ type: "Feature",
        geometry: { type: "LineString", coordinates: cs.slice(start, end + 1) },
        properties: { cong: cls(s[i].ratio) } });
    }
    start = end;
  }
  return feats;
}

/* ---------- summary (base + traffic-adjusted + alternative suggestion) ---------- */
function showRouteSummary() {
  const el = document.getElementById("summary");
  const sel = currentRoutes[selectedRouteIdx];
  if (!sel) return hideSummary();
  let html = `<div class="big">${fmtDist(sel.distance)} · ${fmtDur(sel._adjusted ?? sel.duration)}</div>`;
  if (sel._adjusted) {
    const delay = Math.round(sel._adjusted - sel.duration);
    html += delay > 90
      ? `<div class="traffic-delay bad">⚠ +${fmtDur(delay)} in current traffic (free-flow ${fmtDur(sel.duration)})</div>`
      : `<div class="traffic-delay ok">✓ traffic is light on this route</div>`;
  }
  html += `<div class="muted">${stops.length} stops${optimizedOrder ? " · optimized order" : ""} · driving${currentRoutes.length > 1 ? ` · ${currentRoutes.length} routes` : ""}</div>`;
  // Suggest the fastest-right-now alternative when it beats the selection by >1 min.
  const best = currentRoutes.reduce((b, r, i) =>
    (r._adjusted ?? r.duration) < ((currentRoutes[b]._adjusted ?? currentRoutes[b].duration)) ? i : b, selectedRouteIdx);
  if (best !== selectedRouteIdx) {
    const saves = (currentRoutes[selectedRouteIdx]._adjusted ?? currentRoutes[selectedRouteIdx].duration)
                - (currentRoutes[best]._adjusted ?? currentRoutes[best].duration);
    if (saves > 60) html += `<button class="alt-suggest" data-idx="${best}">🚦 Alternative saves ${fmtDur(Math.round(saves))} — switch</button>`;
  }
  el.innerHTML = html;
  const btn = el.querySelector(".alt-suggest");
  if (btn) btn.onclick = () => selectRoute(Number(btn.dataset.idx));
  el.classList.remove("hidden");
  renderSteps();
  updateDrawerLauncher();
}

/* ---------- batch import ---------- */
document.getElementById("btn-batch").onclick = async () => {
  const { addresses, truncated } = parseBatchAddresses(document.getElementById("batch-input").value);
  const status = document.getElementById("batch-status");
  if (!addresses.length) { status.textContent = "No addresses found."; return; }
  let added = 0, failed = 0;
  for (let i = 0; i < addresses.length; i++) {
    status.textContent = `Geocoding ${i + 1}/${addresses.length}…`;
    try {
      const res = await geocodeForward(addresses[i], 1);
      if (res[0]) { stops.push({ localId: newId(), lat: res[0].lat, lng: res[0].lng, label: res[0].label }); added++; }
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

/* ---------- errors / misc ---------- */
function hideSummary() {
  document.getElementById("summary").classList.add("hidden");
  if (stepsEl) { stepsEl.classList.add("hidden"); stepsEl.innerHTML = ""; }
  currentSteps = []; navIdx = 0;
  updateDrawerLauncher();
}
function showError(msg) { const e = document.getElementById("error"); e.textContent = msg; e.classList.remove("hidden"); }
function clearError() { document.getElementById("error").classList.add("hidden"); }
function escapeHtml(s) { return (s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

/* ---------- left drawer: collapse + summary launcher ----------
 * The panel is a slide-in left drawer. Collapsed, it slides off and a compact
 * launcher pill takes over showing summary data (route ETA/distance, or the
 * active tab). This is the surface turn-by-turn will populate next: while
 * navigating, the collapsed pill can show the next maneuver so the map stays
 * unobstructed. */
/* ===================================================================
 * ACTIVE NAVIGATION + VOICE
 * =================================================================== */

/* ---------- nav state ---------- */
let navMode = false, navRAF = 0, wakeLock = null, puckMarker = null;
let routeLine = null, routeCum = null, routeTotal = 0;
let navS = 0, navSpeed = 0, navHeading = 0, navLastFixS = 0, navLastFixT = 0;
let offRouteCount = 0, rerouting = false;
let promptFired = { idx: -1 };

/* ---------- imperial formatting (nav HUD + voice) ---------- */
const ftRound = (ft) => (ft < 200 ? Math.round(ft / 10) * 10 : Math.round(ft / 50) * 50);
function fmtDistImperialShort(m) {
  const ft = m * 3.28084;
  if (ft < 1000) return `${ftRound(ft)} ft`;
  const mi = m / 1609.344;
  return `${mi.toFixed(mi < 10 ? 1 : 0)} mi`;
}

/* ---------- route geometry (snap + interpolate) ---------- */
function bearingDeg(a, b) { // a,b = [lng,lat]
  const rad = Math.PI / 180, y = Math.sin((b[0] - a[0]) * rad) * Math.cos(b[1] * rad);
  const x = Math.cos(a[1] * rad) * Math.sin(b[1] * rad) - Math.sin(a[1] * rad) * Math.cos(b[1] * rad) * Math.cos((b[0] - a[0]) * rad);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}
function setRouteLine(coords) {
  routeLine = coords; routeCum = [0]; let acc = 0;
  for (let i = 1; i < coords.length; i++) { acc += haversine(coords[i - 1], coords[i]); routeCum.push(acc); }
  routeTotal = acc;
}
// Nearest point on segment a-b to p, in a local equirectangular frame around a.
function nearestOnSeg(p, a, b) {
  const cos = Math.cos(a[1] * Math.PI / 180);
  const bx = (b[0] - a[0]) * cos, by = b[1] - a[1];
  const px = (p[0] - a[0]) * cos, py = p[1] - a[1];
  const len2 = bx * bx + by * by || 1e-12;
  let t = (px * bx + py * by) / len2; t = Math.max(0, Math.min(1, t));
  return { pt: [a[0] + (bx * t) / cos, a[1] + by * t], t };
}
function projectToRoute(p) {
  if (!routeLine) return null;
  let best = null;
  for (let i = 1; i < routeLine.length; i++) {
    const a = routeLine[i - 1], b = routeLine[i], r = nearestOnSeg(p, a, b), d = haversine(p, r.pt);
    if (!best || d < best.cross)
      best = { pt: r.pt, s: routeCum[i - 1] + haversine(a, r.pt), bearing: bearingDeg(a, b), cross: d };
  }
  return best;
}
// Distance-parameterized interpolation along the route (ported from the fleet map).
function pointAtS(s) {
  if (!routeLine) return null;
  s = Math.max(0, Math.min(routeTotal, s));
  for (let i = 1; i < routeLine.length; i++) {
    if (routeCum[i] >= s) {
      const seg = routeCum[i] - routeCum[i - 1] || 1, f = (s - routeCum[i - 1]) / seg, a = routeLine[i - 1], b = routeLine[i];
      return { pt: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], bearing: bearingDeg(a, b) };
    }
  }
  const n = routeLine.length - 1;
  return { pt: routeLine[n], bearing: bearingDeg(routeLine[n - 1], routeLine[n]) };
}
function alongDistToManeuver() {
  const st = currentSteps[navIdx]; if (!st) return Infinity;
  if (routeLine) { const mp = projectToRoute(st.loc); if (mp) return Math.max(0, mp.s - navS); }
  return navUserPos ? haversine(navUserPos, st.loc) : Infinity;
}

/* ---------- voice: TTS with pre-synthesis, STT, LLM normalize ---------- */
let voiceMuted = false;
try { voiceMuted = localStorage.getItem("wf-voice-muted") === "1"; } catch { /* private mode */ }
let audioCtx = null, speakChain = Promise.resolve();
const ttsCache = new Map(); // text -> Promise<AudioBuffer>
function getAudioCtx() { if (!audioCtx) { const AC = window.AudioContext || window.webkitAudioContext; audioCtx = new AC(); } return audioCtx; }
async function synthBuffer(text) {
  const r = await fetch("/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
  if (!r.ok) throw new Error("tts " + r.status);
  const j = await r.json();
  const bin = atob(j.audio || ""); const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return await getAudioCtx().decodeAudioData(u8.buffer);
}
// Pre-fetch+decode ahead of the turn so playback at the threshold is instant.
function primeSpeech(text) {
  if (!text) return null;
  if (!ttsCache.has(text)) ttsCache.set(text, synthBuffer(text).catch((e) => { ttsCache.delete(text); throw e; }));
  return ttsCache.get(text);
}
function speak(text) {
  if (voiceMuted || !text) return;
  speakChain = speakChain.then(async () => {
    try {
      const ctx = getAudioCtx(); if (ctx.state === "suspended") await ctx.resume();
      const buffer = await primeSpeech(text);
      await new Promise((res) => { const s = ctx.createBufferSource(); s.buffer = buffer; s.connect(ctx.destination); s.onended = res; s.start(); });
    } catch { /* voice is best-effort */ }
  });
}
let mediaRec = null, recStream = null, recChunks = [];
async function toggleMic(btn) {
  if (mediaRec && mediaRec.state === "recording") { mediaRec.stop(); return; }
  try {
    recStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recChunks = []; mediaRec = new MediaRecorder(recStream);
    mediaRec.ondataavailable = (e) => { if (e.data && e.data.size) recChunks.push(e.data); };
    mediaRec.onstop = async () => {
      btn.classList.remove("recording");
      recStream && recStream.getTracks().forEach((t) => t.stop());
      await transcribeAndSearch(new Blob(recChunks, { type: mediaRec.mimeType || "audio/webm" }));
    };
    mediaRec.start(); btn.classList.add("recording");
    setTimeout(() => { if (mediaRec && mediaRec.state === "recording") mediaRec.stop(); }, 6000); // safety auto-stop
  } catch { showError("Microphone unavailable — allow mic access (needs the HTTPS site)."); }
}
async function transcribeAndSearch(blob) {
  try {
    const fd = new FormData(); fd.append("audio_file", blob, "speech.webm");
    const r = await fetch("/stt?task=transcribe&output=json&language=en", { method: "POST", body: fd });
    const j = await r.json();
    let q = (j.text || "").trim();
    if (!q) { showError("Didn't catch that — try again."); return; }
    q = await normalizeQuery(q);
    const input = document.getElementById("search-input"); if (input) input.value = q;
    doSearch(q);
  } catch { showError("Voice search failed."); }
}
// gpt-oss extracts a clean place query; 5 s timeout -> fall back to a filler strip.
async function normalizeQuery(text) {
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 5000);
    const r = await fetch("/llm", { method: "POST", headers: { "Content-Type": "application/json" }, signal: ctl.signal,
      body: JSON.stringify({ model: "gpt-oss:20b", stream: false,
        prompt: `Extract ONLY the destination place name or street address to search for on a map. Reply with just the place, no quotes, no extra words.\n\nRequest: ${text}` }) });
    clearTimeout(t);
    if (r.ok) { const j = await r.json(); const out = (j.response || "").trim().replace(/^["']+|["']+$/g, "").split("\n")[0]; if (out) return out; }
  } catch { /* timeout/offline -> fall back */ }
  return text.replace(/^(take me to|navigate to|directions to|drive to|go to|find|show me)\s+/i, "").trim();
}

/* ---------- voice prompt scheduler (imperial, pre-synthesized) ---------- */
function resetPrompts() { promptFired = { idx: -1 }; }
function schedulePrompts() {
  if (!navMode || !currentSteps.length) return;
  const st = currentSteps[navIdx]; if (!st) return;
  if (promptFired.idx !== navIdx) promptFired = { idx: navIdx };
  const d = alongDistToManeuver();
  const isLast = navIdx === currentSteps.length - 1;
  const instr = st.text;
  const arriveMsg = "You have arrived at your destination.";
  // Pre-synthesize this maneuver's phrases while ~1.3 mi out (covers slow synth).
  if (d < 2100 && !promptFired.primed) {
    promptFired.primed = true;
    primeSpeech(`In 1 mile, ${instr}`); primeSpeech(`In 500 feet, ${instr}`); primeSpeech(isLast ? arriveMsg : instr);
  }
  if (!promptFired.mile && st.dist > 1800 && d <= 1609 && d > 550) { promptFired.mile = true; speak(`In 1 mile, ${instr}`); }
  if (!promptFired.near && d <= 168 && d > 40) { promptFired.near = true; speak(`In 500 feet, ${instr}`); }
  if (!promptFired.now && d <= 40) { promptFired.now = true; speak(isLast ? arriveMsg : instr); }
}

/* ---------- camera follow (predictive rAF loop) ---------- */
function setPuck(pt, brg) {
  if (!puckMarker) {
    const el = document.createElement("div"); el.className = "nav-puck";
    el.innerHTML = '<div class="nav-puck-arrow"></div>';
    puckMarker = new maplibregl.Marker({ element: el, rotationAlignment: "map", pitchAlignment: "map" });
  }
  puckMarker.setLngLat(pt).setRotation(brg).addTo(map);
}
function navTick() {
  if (!navMode) { navRAF = 0; return; }
  // Dead-reckon along the route from the last fix at current speed, glide toward
  // it, and clamp so we never lead more than ~1.6 s past the last real fix.
  const now = performance.now();
  const predicted = navLastFixS + navSpeed * ((now - navLastFixT) / 1000);
  const maxLead = navLastFixS + navSpeed * 1.6 + 12;
  navS += (Math.min(predicted, maxLead) - navS) * 0.18;
  const at = pointAtS(navS);
  if (at) {
    const brg = navSpeed > 0.8 ? at.bearing : navHeading;   // freeze heading when stopped
    const look = pointAtS(navS + Math.min(45, 8 + navSpeed * 4)); // look slightly ahead
    map.jumpTo({ center: (look ? look.pt : at.pt), bearing: brg, pitch: is3D ? 60 : 0 });
    setPuck(at.pt, brg);
  }
  navRAF = requestAnimationFrame(navTick);
}
function onNavFix(e) {
  if (!navMode || !routeLine) return;
  const pr = projectToRoute(navUserPos); if (!pr) return;
  const nowT = performance.now();
  let sp = (typeof e.coords.speed === "number" && e.coords.speed >= 0) ? e.coords.speed : null;
  if (sp == null) { const dt = (nowT - navLastFixT) / 1000; if (dt > 0.3 && dt < 15) sp = Math.max(0, (pr.s - navLastFixS) / dt); }
  if (sp != null) navSpeed = navSpeed ? 0.55 * navSpeed + 0.45 * sp : sp;
  navHeading = (typeof e.coords.heading === "number" && !isNaN(e.coords.heading)) ? e.coords.heading : pr.bearing;
  navLastFixS = pr.s; navLastFixT = nowT;
  if (pr.cross > 45) { offRouteCount++; if (offRouteCount >= 3) reroute(); } else offRouteCount = 0;
}

/* ---------- start / exit / reroute / wake-lock ---------- */
async function startNav() {
  const route = currentRoutes[selectedRouteIdx]; if (!route) return;
  setRouteLine(route.geometry.coordinates);
  navMode = true; document.body.classList.add("nav-active");
  collapseRouteBuilder(); window.wfSetDrawerCollapsed && window.wfSetDrawerCollapsed(true);
  try { const c = getAudioCtx(); if (c.state === "suspended") await c.resume(); } catch { /* gesture needed */ }
  resetPrompts(); offRouteCount = 0; navSpeed = 0;
  const seed = navUserPos ? projectToRoute(navUserPos) : null;
  navS = seed ? seed.s : 0; navLastFixS = navS; navHeading = seed ? seed.bearing : 0; navLastFixT = performance.now();
  try { map.easeTo({ zoom: 17, pitch: is3D ? 60 : 0, duration: 500 }); } catch { /* map not ready */ }
  acquireWakeLock();
  try { geoCtl.trigger(); } catch { /* already tracking */ }
  if (!navRAF) navRAF = requestAnimationFrame(navTick);
  speak("Starting navigation.");
  updateHeader();
}
function exitNav() {
  navMode = false; document.body.classList.remove("nav-active");
  if (navRAF) { cancelAnimationFrame(navRAF); navRAF = 0; }
  if (puckMarker) { puckMarker.remove(); puckMarker = null; }
  releaseWakeLock();
  try { map.easeTo({ bearing: 0, pitch: is3D ? 55 : 0, duration: 500 }); } catch { /* map not ready */ }
  updateHeader();
}
async function reroute() {
  if (rerouting || !navUserPos || !stops.length) return;
  rerouting = true; offRouteCount = 0; speak("Rerouting.");
  try {
    const dest = stops[stops.length - 1];
    const r = await fetch(`${OSRM}/route/v1/driving/${navUserPos[0]},${navUserPos[1]};${dest.lng},${dest.lat}?overview=full&geometries=geojson&alternatives=false&steps=true`);
    const j = await r.json();
    if (j.code === "Ok" && j.routes && j.routes[0]) {
      currentRoutes = [j.routes[0]]; selectedRouteIdx = 0;
      setRouteLine(j.routes[0].geometry.coordinates);
      renderRoutes(false); renderSteps(); resetPrompts();
      const pr = projectToRoute(navUserPos); if (pr) { navS = pr.s; navLastFixS = pr.s; }
      evaluateRoutesTraffic().catch(() => {});
    }
  } catch { /* keep the old line; retry on the next off-route fix */ }
  finally { rerouting = false; }
}
async function acquireWakeLock() { try { if ("wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen"); } catch { /* denied */ } }
function releaseWakeLock() { try { wakeLock && wakeLock.release(); } catch { /* already gone */ } wakeLock = null; }
document.addEventListener("visibilitychange", () => { if (navMode && document.visibilityState === "visible" && !wakeLock) acquireWakeLock(); });

/* ---------- maneuver kind + inline-SVG icons ---------- */
function maneuverKind(st) {
  const m = st.maneuver || {}, mod = m.modifier || "";
  if (m.type === "arrive") return "arrive";
  if (m.type === "depart") return "depart";
  if (m.type === "roundabout" || m.type === "rotary" || m.type === "roundabout turn") return "roundabout";
  if (m.type === "merge") return "merge";
  if (m.type === "fork") return "fork";
  if (m.type === "on ramp" || m.type === "off ramp") return "ramp";
  if (mod === "uturn") return "uturn";
  if (mod === "slight left") return "slight-left";
  if (mod === "slight right") return "slight-right";
  if (mod === "sharp left") return "sharp-left";
  if (mod === "sharp right") return "sharp-right";
  if (mod === "left") return "left";
  if (mod === "right") return "right";
  return "straight";
}
function maneuverSvg(kind) {
  const P = {
    straight: '<path d="M12 21 V6 M7 11 L12 5 L17 11"/>',
    right: '<path d="M8 21 V13 Q8 9 12 9 H17 M14 6 L18 9 L14 12"/>',
    "slight-right": '<path d="M9 21 V14 Q9 9 14 7 L18 5 M15 4 L19 5 L18 9"/>',
    "sharp-right": '<path d="M8 21 V15 Q8 10 13 11 L17 12 M15 7 L18 12 L13 13"/>',
    uturn: '<path d="M8 21 V12 Q8 6 13 6 Q18 6 18 12 V14 M14 12 L18 15 L21 11"/>',
    roundabout: '<circle cx="11" cy="13" r="5"/><path d="M11 8 V3 M8 6 L11 3 L14 6"/>',
    merge: '<path d="M7 21 V13 Q7 9 12 8 M12 3 V13 M9 6 L12 3 L15 6"/>',
    fork: '<path d="M12 21 V13 M12 13 L7 7 M12 13 L17 7 M5 8 L7 6 L9 9"/>',
    depart: '<circle cx="12" cy="19" r="2.4"/><path d="M12 16 V5 M8 9 L12 4 L16 9"/>',
    arrive: '<path d="M12 21 C12 21 6 14 6 9 A6 6 0 1 1 18 9 C18 14 12 21 12 21 Z"/><circle cx="12" cy="9" r="1.9"/>',
  };
  const wrap = (inner, flip) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">` +
    `${flip ? `<g transform="translate(24,0) scale(-1,1)">${inner}</g>` : inner}</svg>`;
  if (kind === "left") return wrap(P.right, true);
  if (kind === "slight-left") return wrap(P["slight-right"], true);
  if (kind === "sharp-left") return wrap(P["sharp-right"], true);
  if (kind === "ramp") return wrap(P["slight-right"]);
  return wrap(P[kind] || P.straight);
}

/* ---------- header (app bar) — idle / route-planned / navigating ---------- */
const clockAfter = (ms) => new Date(Date.now() + ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
function computeRemaining() {
  const sel = currentRoutes[selectedRouteIdx];
  const meters = (routeLine && routeTotal) ? Math.max(0, routeTotal - navS) : (sel ? sel.distance : 0);
  const full = sel ? (sel._adjusted ?? sel.duration) : 0;
  const frac = sel && sel.distance ? meters / sel.distance : 1;
  const secs = full * frac;
  return { meters, mins: fmtDur(secs), eta: clockAfter(secs * 1000) };
}
function updateHeader() {
  const hud = document.getElementById("hud"); if (!hud) return;
  const bStart = document.getElementById("btn-start-nav");
  const bMute = document.getElementById("btn-mute");
  const bExit = document.getElementById("btn-exit-nav");
  const bMic = document.getElementById("btn-mic");
  const hasRoute = currentRoutes.length && currentSteps.length;
  bStart && bStart.classList.toggle("hidden", !(hasRoute && !navMode));
  bExit && bExit.classList.toggle("hidden", !navMode);
  bMute && bMute.classList.toggle("hidden", !navMode);
  bMic && bMic.classList.toggle("hidden", navMode);
  if (bMute) { bMute.textContent = voiceMuted ? "🔇" : "🔊"; bMute.classList.toggle("muted", voiceMuted); }

  if (navMode && currentSteps[navIdx]) {
    const s = currentSteps[navIdx], d = alongDistToManeuver(), rem = computeRemaining();
    hud.className = "hud nav";
    hud.innerHTML =
      `<span class="hud-man">${maneuverSvg(s.kind)}</span>` +
      `<span class="hud-main"><span class="hud-dist">${fmtDistImperialShort(d)}</span>` +
      `<span class="hud-street">${escapeHtml(s.road || s.text)}</span></span>` +
      `<span class="hud-eta"><span class="eta-clock">${rem.eta}</span><span class="eta-sub">${rem.mins} · ${fmtDistImperialShort(rem.meters)}</span></span>`;
    return;
  }
  if (hasRoute) {
    const sel = currentRoutes[selectedRouteIdx], secs = sel._adjusted ?? sel.duration;
    hud.className = "hud summary";
    hud.innerHTML =
      `<span class="hud-main"><span class="hud-dist">${fmtDistImperialShort(sel.distance)} · ${fmtDur(secs)}</span>` +
      `<span class="hud-street">Arrive ${clockAfter(secs * 1000)}</span></span>`;
    return;
  }
  hud.className = "hud";
  const active = document.querySelector(".tab.active");
  hud.innerHTML = `<span class="hud-title">${active && active.dataset.tab === "layers" ? "Geofence layers" : "Wayfinder"}</span>`;
}
// Back-compat alias: earlier call sites still call updateDrawerLauncher().
function updateDrawerLauncher() { updateHeader(); }

/* ---------- app-bar controls ---------- */
(function initAppbar() {
  const burger = document.getElementById("btn-burger");
  burger && burger.addEventListener("click", () => window.wfSetDrawerCollapsed && window.wfSetDrawerCollapsed(!window.wfDrawerCollapsed()));
  const bStart = document.getElementById("btn-start-nav"); bStart && bStart.addEventListener("click", () => startNav());
  const bExit = document.getElementById("btn-exit-nav"); bExit && bExit.addEventListener("click", () => exitNav());
  const bMic = document.getElementById("btn-mic"); bMic && bMic.addEventListener("click", () => toggleMic(bMic));
  const bMute = document.getElementById("btn-mute"); bMute && bMute.addEventListener("click", () => {
    voiceMuted = !voiceMuted; try { localStorage.setItem("wf-voice-muted", voiceMuted ? "1" : "0"); } catch { /* private mode */ }
    updateHeader(); if (!voiceMuted) speak("Voice on.");
  });
})();

(function initDrawer() {
  const panel = document.getElementById("panel");
  const collapseBtn = document.getElementById("btn-collapse");
  if (!panel) return;
  const KEY = "wf-drawer-collapsed";

  function setCollapsed(collapsed, persist = true) {
    panel.classList.toggle("collapsed", collapsed);
    collapseBtn && collapseBtn.setAttribute("aria-expanded", String(!collapsed));
    if (persist) { try { localStorage.setItem(KEY, collapsed ? "1" : "0"); } catch { /* private mode */ } }
  }
  window.wfSetDrawerCollapsed = setCollapsed;
  window.wfDrawerCollapsed = () => panel.classList.contains("collapsed");

  collapseBtn && collapseBtn.addEventListener("click", () => setCollapsed(true)); // app-bar burger reopens it

  // Honor the saved preference; with none, default collapsed on phones so the
  // drawer never eats the map on first load.
  let start = null;
  try { start = localStorage.getItem(KEY); } catch { /* private mode */ }
  if (start === null) start = window.matchMedia("(max-width: 640px)").matches ? "1" : "0";
  setCollapsed(start === "1", false);
})();

/* ================= find places (POI: Overpass primary, TomTom fallback) =================
 * Idle → search near you/map-center (sort by distance). Navigating → search a
 * corridor ALONG the route ahead (sort by soonest-on-route). Results are
 * numbered pins on the map + a picklist; tap to preview, Add to route. */
const CATEGORIES = [
  { key: "fuel",     label: "⛽ Fuel",     tt: "7311", osm: '["amenity"="fuel"]' },
  { key: "food",     label: "🍔 Food",     tt: "7315", osm: '["amenity"="restaurant"]' },
  { key: "coffee",   label: "☕ Coffee",   tt: "9376", osm: '["amenity"="cafe"]' },
  { key: "ev",       label: "🔌 EV",       tt: "7309", osm: '["amenity"="charging_station"]' },
  { key: "grocery",  label: "🛒 Grocery",  tt: "7332", osm: '["shop"="supermarket"]' },
  { key: "pharmacy", label: "💊 Pharmacy", tt: "7326", osm: '["amenity"="pharmacy"]' },
  { key: "atm",      label: "🏧 ATM",      tt: "7397", osm: '["amenity"="atm"]' },
  { key: "hotel",    label: "🏨 Hotel",    tt: "7314", osm: '["tourism"="hotel"]' },
  { key: "parking",  label: "🅿️ Parking",  tt: "7369", osm: '["amenity"="parking"]' },
  { key: "hospital", label: "🏥 Hospital", tt: "7321", osm: '["amenity"="hospital"]' },
];
const catOf = (k) => CATEGORIES.find((c) => c.key === k);
let placesResults = [], placesActiveCat = null, overpassOk = true;

function renderChips() {
  const box = document.getElementById("cat-chips"); if (!box) return;
  box.innerHTML = "";
  for (const c of CATEGORIES) {
    const b = document.createElement("button");
    b.className = "chip" + (placesActiveCat === c.key ? " active" : "");
    b.textContent = c.label;
    b.onclick = () => findPlaces(c.key);
    box.appendChild(b);
  }
}
// Sample points from the current position forward along the route (~every 8 km,
// up to ~48 km) so "along route" finds what's actually on the way ahead.
function sampleRouteAhead() {
  const pts = []; if (!routeLine) return pts;
  for (let d = 0; d <= 48000; d += 8000) { const p = pointAtS(navS + d); if (p) pts.push(p.pt); if (navS + d >= routeTotal) break; }
  return pts.length ? pts : [pointAtS(navS).pt];
}
function searchCenters() {
  if (navMode && routeLine) return { along: true, pts: sampleRouteAhead() };
  const c = navUserPos || [map.getCenter().lng, map.getCenter().lat];
  return { along: false, pts: [c] };
}
async function queryOverpass(cat, pts, radius) {
  const flat = pts.map((p) => `${p[1]},${p[0]}`).join(",");   // Overpass around: lat,lon,lat,lon,… = polyline buffer
  const f = catOf(cat).osm;
  const ql = `[out:json][timeout:25];(node${f}(around:${radius},${flat});way${f}(around:${radius},${flat}););out center 60;`;
  const r = await fetch("/overpass", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "data=" + encodeURIComponent(ql) });
  if (!r.ok) throw new Error("overpass " + r.status);
  const j = await r.json();
  return (j.elements || []).map((e) => {
    const lat = e.lat ?? (e.center && e.center.lat), lng = e.lon ?? (e.center && e.center.lon);
    if (lat == null) return null;
    const t = e.tags || {};
    return { id: "o" + e.type + e.id, name: t.name || t.brand || catOf(cat).label.split(" ")[1] || "Place",
      lat, lng, addr: [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" ") || t.brand || "" };
  }).filter(Boolean);
}
async function queryTomTomAt(cat, center, radius) {
  const r = await fetch(`/poi?lat=${center[1].toFixed(5)}&lon=${center[0].toFixed(5)}&radius=${radius}&categorySet=${catOf(cat).tt}&limit=20`);
  if (!r.ok) throw new Error("poi " + r.status);
  const j = await r.json();
  return (j.results || []).map((x) => ({ id: "t" + x.id, name: (x.poi && x.poi.name) || "Place",
    lat: x.position.lat, lng: x.position.lon, addr: (x.address && x.address.freeformAddress) || "" }));
}
async function queryTomTomMulti(cat, pts, radius) {
  const all = [];
  for (const p of pts.slice(0, 6)) { try { all.push(...await queryTomTomAt(cat, p, radius)); } catch { /* skip this sample */ } }
  return all;
}
function dedupePlaces(list) {
  const seen = new Set(), out = [];
  for (const r of list) { const k = r.id || `${r.lat.toFixed(5)},${r.lng.toFixed(5)}`; if (seen.has(k)) continue; seen.add(k); out.push(r); }
  return out;
}
// Map common typed words to a clean category (so "gas" → the fuel categorySet,
// not a noisy fuzzy match); brands/anything else fall through to fuzzy search.
function synonymCat(q) {
  const s = (q || "").toLowerCase().trim();
  const map = {
    fuel: ["gas", "gasoline", "petrol", "fuel", "diesel", "gas station"],
    food: ["food", "restaurant", "restaurants", "eat", "dinner", "lunch", "meal"],
    coffee: ["coffee", "cafe", "café", "espresso", "coffee shop"],
    ev: ["ev", "charger", "charging", "ev charging", "charge", "charging station"],
    grocery: ["grocery", "groceries", "supermarket", "market"],
    pharmacy: ["pharmacy", "drugstore", "chemist"],
    atm: ["atm", "cash", "cashpoint"],
    hotel: ["hotel", "motel", "lodging", "hotels"],
    parking: ["parking", "car park"],
    hospital: ["hospital", "er", "emergency room", "emergency"],
  };
  for (const k in map) if (map[k].includes(s)) return k;
  return null;
}
// Fetch raw results for a set of points: clean category (Overpass→TomTom
// categorySet) when we have one, else fuzzy free-text (TomTom poiSearch).
async function fetchPlaces({ cat, query, pts, radius }) {
  if (cat) {
    if (overpassOk) { try { const r = await queryOverpass(cat, pts, radius); if (r.length) return r; } catch { overpassOk = false; } }
    const out = []; for (const p of pts.slice(0, 6)) { try { out.push(...await queryTomTomAt(cat, p, radius)); } catch { /* skip */ } }
    return out;
  }
  const out = []; for (const p of pts.slice(0, 6)) { try { out.push(...await tomtomSearchAt(query, p, radius)); } catch { /* skip */ } }
  return out;
}
async function runPlaceSearch({ cat, query, along }) {
  placesActiveCat = cat; renderChips();
  const useAlong = along && !!routeLine;
  const pts = useAlong ? sampleRouteAhead() : [navUserPos || [map.getCenter().lng, map.getCenter().lat]];
  const radius = useAlong ? 3000 : 5000;
  const ctx = document.getElementById("places-ctx"); if (ctx) ctx.textContent = "searching…";
  const res = dedupePlaces(await fetchPlaces({ cat, query, pts, radius }));
  const origin = navUserPos || pts[0];
  for (const r of res) { r.dist = haversine(origin, [r.lng, r.lat]); if (useAlong) { const pr = projectToRoute([r.lng, r.lat]); r.s = pr ? pr.s : Infinity; } }
  placesResults = res; sortPlaces();
  if (ctx) ctx.textContent = res.length ? `${res.length} ${useAlong ? "along route" : "nearby"}` : "none found";
  const pnl = document.getElementById("places-panel"); if (pnl) pnl.open = true;
  window.wfSetDrawerCollapsed && window.wfSetDrawerCollapsed(false);
  if (res.length && !useAlong) {
    const b = new maplibregl.LngLatBounds(); res.forEach((r) => b.extend([r.lng, r.lat])); b.extend(origin);
    if (!b.isEmpty()) map.fitBounds(b, { padding: { top: 70, bottom: 70, left: 390, right: 70 }, maxZoom: 15 });
  }
}
// Category chip → along-route while navigating, else near you.
function findPlaces(cat) { return runPlaceSearch({ cat, along: navMode }); }
// Free-text place search from the search box ("gas", "coffee", "walmart") — near
// a point, or along the route ahead. Renders the same pins + picklist as chips.
async function tomtomSearchAt(query, center, radius) {
  const r = await fetch(`/poi-search/${encodeURIComponent(query)}.json?lat=${center[1].toFixed(5)}&lon=${center[0].toFixed(5)}&radius=${radius}&limit=20`);
  if (!r.ok) throw new Error("poi-search " + r.status);
  const j = await r.json();
  return (j.results || []).map((x) => ({ id: "t" + x.id, name: (x.poi && x.poi.name) || (x.address && x.address.freeformAddress) || "Place",
    lat: x.position.lat, lng: x.position.lon, addr: (x.address && x.address.freeformAddress) || "" }));
}
// Search box → "near me" / "along route": a synonym becomes a clean category
// search, anything else (brands, etc.) uses fuzzy free-text.
function searchNearbyText(query, along) {
  hideResults(); input.value = query;
  const cat = synonymCat(query);
  return runPlaceSearch({ cat, query: cat ? null : query, along });
}
function sortPlaces() {
  const mode = (document.getElementById("places-sort") || {}).value || "dist";
  const along = navMode && routeLine;
  placesResults.sort((a, b) => along ? ((a.s ?? Infinity) - (b.s ?? Infinity)) : (mode === "rel" ? 0 : a.dist - b.dist));
  renderPlaces();
}
function ensurePlacesLayer() {
  if (map.getSource("places")) return;
  map.addSource("places", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  map.addLayer({ id: "places-pins", type: "circle", source: "places",
    paint: { "circle-radius": 13, "circle-color": "#8e24aa", "circle-stroke-color": "#fff", "circle-stroke-width": 2 } });
  map.addLayer({ id: "places-num", type: "symbol", source: "places",
    layout: { "text-field": ["get", "n"], "text-size": 12, "text-font": ["Noto Sans Regular"], "text-allow-overlap": true },
    paint: { "text-color": "#fff" } });
  map.on("click", "places-pins", (e) => flyToPlace(Number(e.features[0].properties.i)));
  map.on("mouseenter", "places-pins", () => { map.getCanvas().style.cursor = "pointer"; });
  map.on("mouseleave", "places-pins", () => { map.getCanvas().style.cursor = ""; });
}
function renderPlaces() {
  ensurePlacesLayer();
  map.getSource("places").setData({ type: "FeatureCollection",
    features: placesResults.map((r, i) => ({ type: "Feature", geometry: { type: "Point", coordinates: [r.lng, r.lat] }, properties: { n: i + 1, i } })) });
  const list = document.getElementById("places-list"); if (!list) return;
  list.innerHTML = placesResults.map((r, i) =>
    `<li class="place-row" data-i="${i}"><span class="pidx">${i + 1}</span>` +
    `<span class="pmain"><span class="pname">${escapeHtml(r.name)}</span>` +
    `<span class="psub">${fmtDistImperialShort(r.dist)}${r.addr ? " · " + escapeHtml(r.addr) : ""}</span></span>` +
    `<button class="padd" data-i="${i}">Add</button></li>`).join("");
  list.querySelectorAll(".place-row").forEach((li) => li.addEventListener("click", (e) => { if (!e.target.classList.contains("padd")) flyToPlace(Number(li.dataset.i)); }));
  list.querySelectorAll(".padd").forEach((b) => b.addEventListener("click", () => addPlaceAsStop(Number(b.dataset.i))));
}
function flyToPlace(i) {
  const r = placesResults[i]; if (!r) return;
  map.flyTo({ center: [r.lng, r.lat], zoom: Math.max(map.getZoom(), 15) });
  new maplibregl.Popup({ offset: 16 }).setLngLat([r.lng, r.lat]).setHTML(`<b>${escapeHtml(r.name)}</b>${r.addr ? "<br>" + escapeHtml(r.addr) : ""}`).addTo(map);
}
function addPlaceAsStop(i) {
  const r = placesResults[i]; if (!r) return;
  stops.push({ localId: newId(), lat: r.lat, lng: r.lng, label: r.name });
  clearRoute(); clearError(); render();
}
document.getElementById("places-sort") && (document.getElementById("places-sort").onchange = sortPlaces);
renderChips();

render();
