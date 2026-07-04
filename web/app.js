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
    updateLocalWeather();       // current-conditions chip in the app bar (throttled ~15 min)
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

/* ---------- deep-links (maps.quasarke.net/?…) ---------- */
// Lets an external tool (e.g. the geo MCP server) hand the user a link that opens
// the map pre-loaded with a marker or a full route. Parsed inside map.on("load")
// so the route sources/layers + the #btn-route handler already exist, and BEFORE
// the idle→auto-geolocate fires (its `stops.length===0` guard then won't seed over
// a supplied origin). Two forms, both coordinate-based (the tool geocodes first):
//   marker: ?lat=38.8977&lon=-77.0365&label=White%20House&z=15
//   route:  ?from=38.9072,-77.0369&to=39.2904,-76.6122&via=39.0,-76.9|39.1,-76.8
function applyDeepLink() {
  const p = new URLSearchParams(location.search);
  const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };
  const parseLL = (s) => {
    if (!s) return null;
    const parts = String(s).split(",");
    if (parts.length !== 2) return null;
    const la = num(parts[0]), lo = num(parts[1]);
    if (la === null || lo === null || Math.abs(la) > 90 || Math.abs(lo) > 180) return null;
    return { lat: la, lng: lo };
  };
  const from = parseLL(p.get("from")), to = parseLL(p.get("to"));
  if (from && to) {                                   // route form
    const via = (p.get("via") || "").split("|").map(parseLL).filter(Boolean);
    stops = [{ localId: newId(), lat: from.lat, lng: from.lng, label: p.get("fromLabel") || "Start", origin: true }];
    via.forEach((w, i) => stops.push({ localId: newId(), lat: w.lat, lng: w.lng, label: `Stop ${i + 1}` }));
    stops.push({ localId: newId(), lat: to.lat, lng: to.lng, label: p.get("toLabel") || "Destination" });
    render();
    const btn = document.getElementById("btn-route");
    if (btn && !btn.disabled) btn.click();            // render() enables it at ≥2 stops
    return true;
  }
  const lat = num(p.get("lat")), lon = num(p.get("lon"));  // marker form
  if (lat !== null && lon !== null && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
    stops = [{ localId: newId(), lat, lng: lon, label: p.get("label") || `${lat.toFixed(5)}, ${lon.toFixed(5)}` }];
    render();
    const z = num(p.get("z"));
    map.flyTo({ center: [lon, lat], zoom: z !== null ? z : 15 });
    return true;
  }
  return false;
}

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

  // Open a place/route if the URL carries deep-link params (never blocks boot).
  try { applyDeepLink(); } catch (e) { console.warn("[deeplink]", e); }
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
  checkRouteWeather();   // warn if the new route crosses an active NWS alert (when alerts are loaded)
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
function showError(msg) { const e = document.getElementById("error"); e.classList.remove("info"); e.textContent = msg; e.classList.remove("hidden"); }
// Self-dismissing blue notification (weather/traffic alerts) — survives the
// per-GPS-fix clearError (it's .info) and won't stomp an active confirm/countdown.
function notify(msg) {
  const e = document.getElementById("error");
  if (e.querySelector(".cfm")) return;
  e.textContent = msg; e.classList.remove("hidden"); e.classList.add("info");
  clearTimeout(notify._t); notify._t = setTimeout(() => { if (!e.querySelector(".cfm")) { e.classList.add("hidden"); e.classList.remove("info"); e.textContent = ""; } }, 8000);
}
// Don't clear an active prompt (confirm .cfm / faster-route countdown / a live
// .info notification) — only transient errors.
function clearError() { const e = document.getElementById("error"); if (e.querySelector(".cfm") || e.classList.contains("info")) return; e.classList.add("hidden"); }
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
let following = true, followLocked = false;   // camera follow: user can pan out (unless locked), then Re-center
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
function speak(text) { if (text) speakSeq([text]); }
// Play a SEQUENCE of cached phrase fragments back-to-back, gaplessly scheduled on
// the audio timeline. Fixed fragments ("turn left", "In 500 feet,", "onto") are
// pre-synthesized once (primeFragments); only the variable street name is ever
// newly synthesized — so we don't re-generate whole sentences with AI each time.
function speakSeq(parts) {
  if (voiceMuted || !parts || !parts.length) return;
  speakChain = speakChain.then(async () => {
    try {
      const ctx = getAudioCtx(); if (ctx.state === "suspended") await ctx.resume();
      const bufs = [];
      for (const p of parts) { if (!p) continue; try { bufs.push(await primeSpeech(p)); } catch { /* skip a bad fragment */ } }
      if (!bufs.length) return;
      await new Promise((res) => {
        let t = ctx.currentTime + 0.03, last = null;
        for (const b of bufs) { const s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(t); t += b.duration; last = s; }
        if (last) last.onended = res; else res();
      });
    } catch { /* voice is best-effort */ }
  });
}
// Fixed phrase fragments — pre-synthesized on nav start so every prompt is a
// cache hit at play time (street names are cached on approach separately).
const FRAG_DIST = ["In 1 mile,", "In half a mile,", "In 500 feet,", "In 300 feet,"];
const FRAG_CORE = { left: "turn left", right: "turn right", "slight-left": "keep left", "slight-right": "keep right",
  "sharp-left": "turn sharp left", "sharp-right": "turn sharp right", uturn: "make a U-turn", straight: "continue straight",
  roundabout: "take the roundabout", merge: "merge", ramp: "take the ramp", fork: "keep straight", depart: "start out",
  arrive: "arrive at your destination" };
const FRAG_MISC = ["onto", ", then", "Rerouting.", "Starting navigation.", "You have arrived at your destination.", "Voice on.", "continue"];
function primeFragments() { [...FRAG_DIST, ...Object.values(FRAG_CORE), ...FRAG_MISC].forEach((t) => primeSpeech(t)); }
// The fragment array for a maneuver: core turn + "onto" + street (street synth'd on demand).
function maneuverParts(idx) {
  const st = currentSteps[idx]; if (!st) return [];
  const core = FRAG_CORE[st.kind] || "continue";
  const parts = [core];
  if (st.kind !== "arrive" && st.road) { parts.push("onto"); parts.push(st.road); }
  return parts;
}
// Full announcement parts for a step (with optional distance prefix), chaining an
// immediately-following turn as ", then …" when the leg between them is short.
function announceParts(prefix, idx) {
  const st = currentSteps[idx]; if (!st) return [];
  const parts = prefix ? [prefix] : [];
  parts.push(...maneuverParts(idx));
  const next = currentSteps[idx + 1];
  if (next && st.dist > 0 && st.dist < 160) { parts.push(", then"); parts.push(...maneuverParts(idx + 1)); }
  return parts;
}
// Short WebAudio "ding"s (no audio files → offline-safe). Rising = start, falling = stop.
function ding(fromHz, toHz, durMs) {
  try {
    const ctx = getAudioCtx(); if (ctx.state === "suspended") ctx.resume();
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime, d = durMs / 1000;
    o.type = "sine"; o.frequency.setValueAtTime(fromHz, t); o.frequency.exponentialRampToValueAtTime(toHz, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + d);
  } catch { /* audio blocked */ }
}
const startDing = () => ding(660, 990, 130);   // rising
const stopDing = () => ding(760, 460, 160);    // falling

let mediaRec = null, recStream = null, recChunks = [];
async function toggleMic(btn) {
  if (mediaRec && mediaRec.state === "recording") { mediaRec.stop(); return; }
  try {
    recStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recChunks = []; mediaRec = new MediaRecorder(recStream);
    mediaRec.ondataavailable = (e) => { if (e.data && e.data.size) recChunks.push(e.data); };
    mediaRec.onstop = async () => {
      stopDing();
      btn.classList.remove("recording"); btn.classList.add("busy"); // spinner while STT+parse+search runs
      recStream && recStream.getTracks().forEach((t) => t.stop());
      try { await transcribeAndSearch(new Blob(recChunks, { type: mediaRec.mimeType || "audio/webm" })); }
      finally { btn.classList.remove("busy"); }
    };
    startDing();
    mediaRec.start(); btn.classList.add("recording");
    setTimeout(() => { if (mediaRec && mediaRec.state === "recording") mediaRec.stop(); }, 6000); // safety auto-stop
  } catch { showError("Microphone unavailable — allow mic access (needs the HTTPS site)."); }
}
async function transcribeAndSearch(blob) {
  try {
    const fd = new FormData(); fd.append("audio_file", blob, "speech.webm");
    const r = await fetch("/stt?task=transcribe&output=json&language=en", { method: "POST", body: fd });
    const j = await r.json();
    const text = (j.text || "").trim();
    if (!text) { showError("Didn't catch that — try again."); return; }
    const input = document.getElementById("search-input"); if (input) input.value = text;
    await handleVoiceCommand(text, await parseVoiceCommand(text));
  } catch { showError("Voice search failed."); }
}
// Local intent parser (instant, no network): action (navigate vs search),
// category (via synonymCat), nearest, along-route. Handles the common commands
// even when the LLM is slow/offline.
function parseVoiceLocal(text) {
  const s = " " + text.toLowerCase().replace(/[?.!,]+/g, " ") + " ";
  const navigate = /\b(directions?|navigate|take me|drive|go to|route to|get me|bring me|head to|nav to)\b/.test(s);
  const nearest = /\b(nearest|closest|near me|nearby|around here)\b/.test(s);
  const along = /\b(on my way|along( the| my)? (current )?route|on the way|to (the )?(current )?route)\b/.test(s);
  // "add … to the route / along the route" = drop a WAYPOINT and keep driving,
  // vs "take me to X" = a new destination (replaces the route, confirmed later).
  const wantsAdd = /\b(add|stop (at|by)|swing by|pick up|grab)\b/.test(s) || along;
  let q = s
    .replace(/\b(hey |ok |okay )?(can you |could you |would you |please )?/g, "")
    .replace(/\b(add|stop (at|by)|swing by|pick up|grab)\b/g, "")
    .replace(/\b(get |give me |find me |show me )?(me )?(directions?|navigation)( to| for)?\b/g, "")
    .replace(/\b(navigate to|navigate|take me to|take me|drive me to|drive to|route to|head to|bring me to|bring me|nav to|go to)\b/g, "")
    .replace(/\b(find|search for|where('?s| is| are)|locate)\b/g, "")
    // strip route/location phrases BEFORE removing articles (they contain "the"/"my")
    .replace(/\b(to|on|along)\s+(the\s+|my\s+)?(current\s+)?route\b/g, "")
    .replace(/\b(near me|around here|on my way|on the way|nearby)\b/g, "")
    .replace(/\b(nearest|closest)\b/g, "")
    .replace(/\b(the|a|an|and|then)\b/g, "")
    .replace(/\s+/g, " ").trim();
  const category = synonymCat(q) || synonymCat(q.replace(/\bstation\b/, "").trim()) || synonymCat(q.replace(/s$/, "")) || null;
  const action = wantsAdd ? "add" : (navigate ? "navigate" : "search");
  return { action, category, query: category ? null : q, nearest, along_route: along };
}
// gpt-oss refines the parse (better on odd phrasings); 4.5 s timeout → local.
async function parseVoiceCommand(text) {
  const local = parseVoiceLocal(text);
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 4500);
    const prompt = `Parse this map/navigation request. Reply with JSON only.\n` +
      `Fields: "action" one of: "add" (add a stop ALONG/ON the current route while continuing e.g. add gas, find X along the route), ` +
      `"navigate" (a new destination — take me to, drive to, get directions to X), else "search" (just find/show), ` +
      `"category" (one of fuel,food,coffee,ev,grocery,pharmacy,atm,hotel,parking,hospital for a generic place type, else null), ` +
      `"query" (specific place/cuisine/name or address if not a category, else null), ` +
      `"nearest" (true if nearest/closest/near me), "along_route" (true if on my way/along the route).\n` +
      `Request: "${text}"`;
    const r = await fetch("/llm", { method: "POST", headers: { "Content-Type": "application/json" }, signal: ctl.signal,
      body: JSON.stringify({ model: "gpt-oss:20b", stream: false, format: "json", prompt }) });
    clearTimeout(t);
    if (r.ok) {
      const p = JSON.parse((await r.json()).response || "{}");
      const cat = (p.category && catOf(p.category)) ? p.category : local.category;
      const act = ["add", "navigate", "search"].includes(p.action) ? p.action : local.action;
      return { action: act, category: cat,
        query: cat ? null : (p.query || local.query), nearest: !!p.nearest || local.nearest, along_route: !!p.along_route || local.along_route };
    }
  } catch { /* timeout/offline → local parse */ }
  return local;
}
// Act on a parsed voice command.
// Find places along the route ahead (category or free text), sorted by how soon
// you'd reach them; used by "add … along the route" voice commands.
async function findAlongRoute(cat, query) {
  const useAlong = navMode && !!routeLine;
  const pts = useAlong ? sampleRouteAhead() : [navUserPos || [map.getCenter().lng, map.getCenter().lat]];
  const raw = dedupePlaces(await fetchPlaces({ cat, query: cat ? null : query, pts, radius: 3000 }));
  for (const r of raw) {
    if (routeLine) { const pr = projectToRoute([r.lng, r.lat]); r.s = pr ? pr.s : Infinity; r.dist = pr ? pr.cross : Infinity; }
    else { r.dist = navUserPos ? haversine(navUserPos, [r.lng, r.lat]) : 0; r.s = r.dist; }
  }
  raw.sort((a, b) => (a.s ?? Infinity) - (b.s ?? Infinity));
  return raw;
}
// Optimize the middle stops (keep current position first, destination last) via
// OSRM trip, then re-seat live navigation on the result. Falls back to a plain
// through-route when there's nothing to reorder.
async function optimizeAndReroute(msg) {
  if (!navUserPos || stops.length < 2) return;
  const mids = stops.slice(1);                         // waypoints + destination (origin[0] excluded)
  if (mids.length < 2) return liveReroute(mids.map((s) => [s.lng, s.lat]), msg);
  if (msg) speak(msg);
  rerouting = true;
  try {
    const coords = [navUserPos, ...mids.map((s) => [s.lng, s.lat])].map((c) => `${c[0]},${c[1]}`).join(";");
    const r = await fetch(`${OSRM}/trip/v1/driving/${coords}?source=first&destination=last&roundtrip=false&overview=full&geometries=geojson&steps=true`);
    const j = await r.json();
    if (j.code === "Ok" && j.trips && j.trips[0]) {
      const order = j.waypoints.map((w, i) => ({ i, pos: w.waypoint_index })).sort((a, b) => a.pos - b.pos).map((x) => x.i);
      stops = [stops[0], ...order.filter((i) => i > 0).map((i) => mids[i - 1])];   // reorder mids; navUserPos (i=0) dropped
      currentRoutes = [j.trips[0]]; selectedRouteIdx = 0; optimizedOrder = true;
      setRouteLine(j.trips[0].geometry.coordinates);
      renderRoutes(false); renderSteps(); resetPrompts(); render();
      const pr = projectToRoute(navUserPos); if (pr) { navS = pr.s; navLastFixS = pr.s; }
      evaluateRoutesTraffic().catch(() => {});
    } else { await liveReroute(mids.map((s) => [s.lng, s.lat])); }
  } catch { await liveReroute(mids.map((s) => [s.lng, s.lat])); }
  finally { rerouting = false; }
}
// "add gas along the route" → insert the soonest match as a waypoint, optimize,
// keep driving. Keeps the destination; no route-replacement confirm needed.
async function addAlongRoute(cmd, text) {
  const label = cmd.category ? catOf(cmd.category).label.split(" ")[1].toLowerCase() : (cmd.query || text);
  const results = await findAlongRoute(cmd.category, cmd.query || text);
  if (!results.length) { speak(`I couldn't find any ${label} along your route.`); return; }
  placesResults = results; renderPlaces();
  const p = results[0];
  if (navMode && routeLine && stops.length >= 1) {
    const dest = stops[stops.length - 1];
    stops.splice(Math.max(1, stops.length - 1), 0, { localId: newId(), lat: p.lat, lng: p.lng, label: p.name || p.label });
    render();
    await optimizeAndReroute(`Adding ${p.name || label} to your route.`);
  } else {   // not navigating: just add it as a stop in the plan
    stops.push({ localId: newId(), lat: p.lat, lng: p.lng, label: p.name || label });
    clearRoute(); render(); speak(`Added ${p.name || label}.`);
  }
}
async function handleVoiceCommand(text, cmd) {
  if (cmd.action === "add") { await addAlongRoute(cmd, text); return; }
  const navigate = cmd.action === "navigate";
  if (cmd.category) {
    const along = cmd.along_route || (navMode && !!routeLine);
    await runPlaceSearch({ cat: cmd.category, along });
    const kind = catOf(cmd.category).label.split(" ")[1].toLowerCase();
    if (!placesResults.length) { speak(`I couldn't find any ${kind} ${along ? "along your route" : "nearby"}.`); return; }
    // While navigating, a category ask just SHOWS options on the route — the
    // user taps "Add" to drop it in as a waypoint (no silent route change).
    if (navMode) { speak(`Found ${placesResults.length} ${kind} along your route. Tap Add to stop at one.`); return; }
    if (navigate) { speak(`Getting directions to ${placesResults[0].name}.`); routeToPoint(placesResults[0]); }
    else speak(`Found ${placesResults.length} ${kind} nearby.`);
    return;
  }
  const q = cmd.query || text;
  const res = await geocodeForward(q, 1).catch(() => []);
  if (!res[0]) { doSearch(q); speak(`Searching for ${q}.`); return; }
  if (navigate) { speak(`Getting directions to ${res[0].label}.`); requestRouteTo(res[0]); }  // confirms if navigating
  else { lastResults = res; renderResults(); }
}
// Route from my location (seeded if needed) to a {lat,lng,name|label} point.
function routeToPoint(p) {
  const label = p.name || p.label || "Destination";
  if (!stops.length && navUserPos) stops.push({ localId: newId(), lat: navUserPos[1], lng: navUserPos[0], label: "My location", origin: true });
  stops.push({ localId: newId(), lat: p.lat, lng: p.lng, label });
  clearError(); render();
  if (stops.length >= 2) document.getElementById("btn-route").click();
  else showError("Allow location or add a starting point, then press Directions.");
}

/* ---------- voice prompt scheduler (imperial, pre-synthesized) ---------- */
let announcedNow = -1;   // highest step index whose at-turn instruction was spoken (incl. via a "then" chain)
function resetPrompts() { promptFired = { idx: -1 }; announcedNow = -1; }
function schedulePrompts() {
  if (!navMode || !currentSteps.length) return;
  const st = currentSteps[navIdx]; if (!st) return;
  if (navIdx <= announcedNow) return;          // this turn was already spoken as a chained "then …"
  if (promptFired.idx !== navIdx) promptFired = { idx: navIdx };
  const d = alongDistToManeuver();
  const isLast = navIdx === currentSteps.length - 1;
  // A very short leg after this maneuver means the NEXT turn comes immediately.
  const chained = !isLast && st.dist > 0 && st.dist < 160 && !!currentSteps[navIdx + 1];
  // Pre-cache only the street name(s) on approach — the fixed fragments are
  // already primed (primeFragments on nav start), so nothing else needs synth.
  if (d < 2100 && !promptFired.primed) {
    promptFired.primed = true;
    if (st.road) primeSpeech(st.road);
    if (chained && currentSteps[navIdx + 1].road) primeSpeech(currentSteps[navIdx + 1].road);
  }
  if (!promptFired.mile && st.dist > 1800 && d <= 1609 && d > 550) { promptFired.mile = true; speakSeq(announceParts("In 1 mile,", navIdx)); }
  if (!promptFired.near && d <= 168 && d > 40) { promptFired.near = true; speakSeq(announceParts("In 500 feet,", navIdx)); }
  if (!promptFired.now && d <= 40) {
    promptFired.now = true;
    if (isLast) speakSeq(["You have arrived at your destination."]);
    else { speakSeq(announceParts("", navIdx)); announcedNow = chained ? navIdx + 1 : navIdx; }
  }
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
  const now = performance.now();
  const moving = navSpeed > 0.7;   // below this = stationary (GPS jitter), don't dead-reckon
  if (moving) {
    // Dead-reckon along the route from the last fix at current speed, glide
    // toward it, clamped so we never lead more than ~1.6 s past the last fix.
    const predicted = navLastFixS + navSpeed * ((now - navLastFixT) / 1000);
    const maxLead = navLastFixS + navSpeed * 1.6 + 8;
    navS += (Math.min(predicted, maxLead) - navS) * 0.18;
  } else {
    // Stationary: settle onto the last fix — no forward creep while still.
    navS += (navLastFixS - navS) * 0.25;
    if (Math.abs(navS - navLastFixS) < 0.5) navS = navLastFixS;
  }
  const at = pointAtS(navS);
  if (at) {
    const brg = moving ? at.bearing : navHeading;              // freeze heading when stopped
    setPuck(at.pt, brg);                                        // puck always tracks, even when not following
    if (following) {
      const lead = moving ? Math.min(45, navSpeed * 4) : 0;    // camera only leads while moving
      const look = lead ? pointAtS(navS + lead) : at;
      map.jumpTo({ center: (look ? look.pt : at.pt), bearing: brg, pitch: is3D ? 60 : 0 });
    }
  }
  navRAF = requestAnimationFrame(navTick);
}
// User panned/zoomed/rotated by hand → stop following (unless locked); show Re-center.
function breakFollow() {
  if (!navMode || followLocked || !following) return;
  following = false;
  const b = document.getElementById("btn-recenter"); if (b) b.classList.remove("hidden");
}
function recenter() {
  following = true;
  const b = document.getElementById("btn-recenter"); if (b) b.classList.add("hidden");
  try { map.jumpTo({ zoom: 18.5, pitch: is3D ? 60 : 0 }); } catch { /* map busy */ }
}
function toggleFollowLock(btn) {
  followLocked = !followLocked;
  btn.textContent = followLocked ? "🔒" : "🔓";
  btn.title = followLocked ? "Follow locked — tap to unlock" : "Lock follow (ignore accidental pans)";
  btn.classList.toggle("locked", followLocked);
  if (followLocked) recenter();   // locking re-engages follow immediately
}
function onNavFix(e) {
  if (!navMode || !routeLine) return;
  const pr = projectToRoute(navUserPos); if (!pr) return;
  const nowT = performance.now();
  let sp = (typeof e.coords.speed === "number" && e.coords.speed >= 0) ? e.coords.speed : null;
  if (sp == null) { const dt = (nowT - navLastFixT) / 1000; if (dt > 0.3 && dt < 15) sp = Math.max(0, (pr.s - navLastFixS) / dt); }
  if (sp != null) navSpeed = (sp < 0.7) ? 0 : (navSpeed ? 0.55 * navSpeed + 0.45 * sp : sp); // deadband GPS jitter
  navHeading = (typeof e.coords.heading === "number" && !isNaN(e.coords.heading)) ? e.coords.heading : pr.bearing;
  navLastFixS = pr.s; navLastFixT = nowT;
  if (pr.cross > 45) { offRouteCount++; if (offRouteCount >= 3) reroute(); } else offRouteCount = 0;
  checkPositionWeather();   // warn on entering an active weather-alert area
}

/* ---------- start / exit / reroute / wake-lock ---------- */
async function startNav() {
  const route = currentRoutes[selectedRouteIdx]; if (!route) return;
  setRouteLine(route.geometry.coordinates);
  navMode = true; document.body.classList.add("nav-active");
  collapseRouteBuilder(); window.wfSetDrawerCollapsed && window.wfSetDrawerCollapsed(true);
  try { const c = getAudioCtx(); if (c.state === "suspended") await c.resume(); } catch { /* gesture needed */ }
  resetPrompts(); primeFragments(); offRouteCount = 0; navSpeed = 0;   // pre-synth the fixed phrase clips
  warnedAlerts.clear(); ensureAlertFeed();   // auto weather warnings while driving (layer hidden unless Weather is on)
  heavyWarned = false;
  if (!navTrafficTimer) navTrafficTimer = setInterval(navTrafficCheck, 75000);   // re-check traffic + faster routes
  setTimeout(navTrafficCheck, 25000);
  following = true;
  const rb = document.getElementById("btn-recenter"); if (rb) rb.classList.add("hidden");
  // One-time: a real user gesture (has originalEvent) breaks follow; our own
  // per-frame jumpTo has no originalEvent so it won't trigger it.
  if (!startNav._gestures) {
    startNav._gestures = true;
    ["dragstart", "rotatestart", "zoomstart", "pitchstart"].forEach((ev) => map.on(ev, (e) => { if (e.originalEvent) breakFollow(); }));
  }
  const seed = navUserPos ? projectToRoute(navUserPos) : null;
  navS = seed ? seed.s : 0; navLastFixS = navS; navHeading = seed ? seed.bearing : 0; navLastFixT = performance.now();
  // jumpTo (instant), NOT easeTo: the follow loop's per-frame jumpTo omits zoom,
  // so an animated easeTo gets interrupted and the zoom never lands — leaving the
  // far-out route-overview zoom. Snap to a close nav zoom; the loop preserves it.
  try { map.jumpTo({ zoom: 18.5, pitch: is3D ? 60 : 0 }); } catch { /* map not ready */ }
  acquireWakeLock();
  try { geoCtl.trigger(); } catch { /* already tracking */ }
  if (!navRAF) navRAF = requestAnimationFrame(navTick);
  speak("Starting navigation.");
  updateHeader();
}
function exitNav() {
  navMode = false; following = true; document.body.classList.remove("nav-active");
  if (navRAF) { cancelAnimationFrame(navRAF); navRAF = 0; }
  if (puckMarker) { puckMarker.remove(); puckMarker = null; }
  const rb = document.getElementById("btn-recenter"); if (rb) rb.classList.add("hidden");
  releaseWakeLock(); maybeStopAlertFeed();
  if (navTrafficTimer) { clearInterval(navTrafficTimer); navTrafficTimer = null; } clearFaster();
  try { map.easeTo({ bearing: 0, pitch: is3D ? 55 : 0, duration: 500 }); } catch { /* map not ready */ }
  updateHeader();
}
// Recompute the live nav route from the current position through the given
// waypoints ([lng,lat]…), and re-seat nav on the new line. Used for off-route
// reroute and for adding a stop on the way without leaving navigation.
async function liveReroute(waypoints, msg) {
  if (rerouting || !navUserPos || !waypoints.length) return false;
  rerouting = true; offRouteCount = 0; if (msg) speak(msg);
  try {
    const coords = [navUserPos, ...waypoints].map((c) => `${c[0]},${c[1]}`).join(";");
    const r = await fetch(`${OSRM}/route/v1/driving/${coords}?overview=full&geometries=geojson&alternatives=false&steps=true`);
    const j = await r.json();
    if (j.code === "Ok" && j.routes && j.routes[0]) {
      currentRoutes = [j.routes[0]]; selectedRouteIdx = 0;
      setRouteLine(j.routes[0].geometry.coordinates);
      renderRoutes(false); renderSteps(); resetPrompts();
      const pr = projectToRoute(navUserPos); if (pr) { navS = pr.s; navLastFixS = pr.s; }
      evaluateRoutesTraffic().catch(() => {});
      return true;
    }
  } catch { /* keep the old line */ }
  finally { rerouting = false; }
  return false;
}
async function reroute() {
  const dest = stops[stops.length - 1]; if (!dest) return;
  await liveReroute([[dest.lng, dest.lat]], "Rerouting.");
}
// Add a place as a WAYPOINT on the current drive (before the final destination)
// and reroute live — so "find gas along the route" → Add doesn't abandon the trip.
async function addWaypointLive(p) {
  const dest = stops[stops.length - 1]; if (!dest) return;
  stops.splice(Math.max(1, stops.length - 1), 0, { localId: newId(), lat: p.lat, lng: p.lng, label: p.name || p.label });
  render();
  if (!await liveReroute([[p.lng, p.lat], [dest.lng, dest.lat]], `Adding ${p.name || "stop"} on the way.`)) speak("Couldn't add that stop.");
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
  const bLock = document.getElementById("btn-lock");
  bStart && bStart.classList.toggle("hidden", !(hasRoute && !navMode));
  bExit && bExit.classList.toggle("hidden", !navMode);
  bMute && bMute.classList.toggle("hidden", !navMode);
  bLock && bLock.classList.toggle("hidden", !navMode);
  bMic && bMic.classList.remove("hidden");   // mic stays available during navigation (search along route)
  if (bMute) { bMute.textContent = voiceMuted ? "🔇" : "🔊"; bMute.classList.toggle("muted", voiceMuted); }
  if (!navMode) { const bRe = document.getElementById("btn-recenter"); if (bRe) bRe.classList.add("hidden"); }

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
  const bLock = document.getElementById("btn-lock"); bLock && bLock.addEventListener("click", () => toggleFollowLock(bLock));
  const bRe = document.getElementById("btn-recenter"); bRe && bRe.addEventListener("click", () => recenter());
})();

(function initDrawer() {
  const panel = document.getElementById("panel");
  const collapseBtn = document.getElementById("btn-collapse");
  if (!panel) return;
  const KEY = "wf-drawer-collapsed";

  function setCollapsed(collapsed, persist = true) {
    panel.classList.toggle("collapsed", collapsed);
    document.body.classList.toggle("drawer-open", !collapsed);   // desktop CSS pushes #map right
    collapseBtn && collapseBtn.setAttribute("aria-expanded", String(!collapsed));
    // The map container width changes when it's pushed — let MapLibre re-fit after the slide.
    setTimeout(() => { try { window.nomadMap && window.nomadMap.resize(); } catch { /* not ready */ } }, 280);
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

/* ================= live traffic during nav: "heavy traffic ahead" + faster route =================
 * Every ~75 s while navigating, re-request alternatives from the current
 * position, score them with TomTom flow, warn on a jam ahead, and offer a
 * faster route with a 10 s countdown that auto-switches. */
let navTrafficTimer = null, fasterPromptActive = false, fasterTimer = null, heavyWarned = false;
async function navTrafficCheck() {
  if (!navMode || !navUserPos || !stops.length || rerouting || fasterPromptActive || !trafficEvalUsable) return;
  const dest = stops[stops.length - 1];
  try {
    const r = await fetch(`${OSRM}/route/v1/driving/${navUserPos[0]},${navUserPos[1]};${dest.lng},${dest.lat}?overview=full&geometries=geojson&alternatives=true&steps=true`);
    const j = await r.json();
    if (j.code !== "Ok" || !j.routes || !j.routes.length) return;
    const cands = j.routes;
    await Promise.all(cands.map(async (rt) => { try { const f = await flowFactor(rt); if (f) { rt._factor = f.factor; rt._adjusted = rt.duration / f.factor; rt._samples = f.samples; } } catch { /* skip */ } }));
    const cur = cands[0];                                   // OSRM primary ≈ the road you're on
    // Heavy traffic ahead on the near portion of the current route?
    const n = cur.geometry.coordinates.length;
    const nearJam = (cur._samples || []).some((s) => s.ratio < 0.6 && s.idx < n * 0.45);
    if (nearJam && !heavyWarned) { heavyWarned = true; speak("Heavy traffic ahead."); notify("🚦 Heavy traffic ahead."); setTimeout(() => { heavyWarned = false; }, 5 * 60 * 1000); }
    // A meaningfully faster alternative?
    const fastest = cands.reduce((b, rt) => ((rt._adjusted ?? rt.duration) < (b._adjusted ?? b.duration) ? rt : b), cur);
    const save = (cur._adjusted ?? cur.duration) - (fastest._adjusted ?? fastest.duration);
    if (fastest !== cur && save > 120) proposeFasterRoute(fastest, Math.round(save));   // saves > 2 min
  } catch { /* OSRM/traffic hiccup — try again next tick */ }
}
function proposeFasterRoute(rt, saveSecs) {
  fasterPromptActive = true;
  const mins = fmtDur(saveSecs);
  speak(`There's a faster route, saving ${mins}.`);
  let secs = 10;
  const e = document.getElementById("error"); e.classList.add("info");
  e.innerHTML = `🚦 Faster route — saves ${mins}. Switching in <span id="fr-count">${secs}</span>s ` +
    `<span class="cfm"><button id="fr-yes" class="cfm-y">Switch now</button><button id="fr-no" class="cfm-n">Keep</button></span>`;
  e.classList.remove("hidden");
  const doSwitch = () => { clearFaster(); switchToRoute(rt); };
  document.getElementById("fr-yes").onclick = doSwitch;
  document.getElementById("fr-no").onclick = () => clearFaster();
  fasterTimer = setInterval(() => { secs--; const c = document.getElementById("fr-count"); if (secs <= 0) doSwitch(); else if (c) c.textContent = secs; }, 1000);
}
function clearFaster() {
  fasterPromptActive = false;
  if (fasterTimer) { clearInterval(fasterTimer); fasterTimer = null; }
  const e = document.getElementById("error"); e.classList.add("hidden"); e.classList.remove("info"); e.innerHTML = "";
}
function switchToRoute(rt) {
  currentRoutes = [rt]; selectedRouteIdx = 0; setRouteLine(rt.geometry.coordinates);
  renderRoutes(false); renderSteps(); resetPrompts();
  const pr = projectToRoute(navUserPos); if (pr) { navS = pr.s; navLastFixS = pr.s; }
  speak("Taking the faster route.");
}

/* ================= NWS weather alerts (layer + route/position warnings) =================
 * Layer styling matches the mzfs fleet map (severity-keyed fill/line). mzfs has
 * no route-vs-alert check, so the "bad weather on your route / entering an area"
 * warnings are added here with a dependency-free point-in-polygon. */
let weatherOn = false, nwsAlerts = [], weatherTimer = null;
const warnedAlerts = new Set();
const btnWeather = document.getElementById("btn-weather");

function ensureWeatherLayers() {
  if (map.getSource("nws-alerts")) return;
  map.addSource("nws-alerts", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  const sev = (a, b, c, d, def) => ["match", ["downcase", ["coalesce", ["get", "severity"], ""]], "extreme", a, "severe", b, "moderate", c, "minor", d, def];
  const under = map.getLayer("route-casing") ? "route-casing" : (map.getLayer("route-line") ? "route-line" : undefined);
  map.addLayer({ id: "nws-fill", type: "fill", source: "nws-alerts",
    filter: ["any", ["==", ["geometry-type"], "Polygon"], ["==", ["geometry-type"], "MultiPolygon"]],
    layout: { visibility: "none" },
    paint: { "fill-color": sev("#7b1fa2", "#e53935", "#fb8c00", "#ffee58", "#78909c"),
      "fill-opacity": sev(0.28, 0.26, 0.22, 0.2, 0.16) } }, under);
  map.addLayer({ id: "nws-line", type: "line", source: "nws-alerts",
    layout: { visibility: "none" },
    paint: { "line-color": sev("#4a148c", "#b71c1c", "#e65100", "#f9a825", "#455a64"), "line-width": 1.5, "line-opacity": 0.9 } }, under);
  map.on("click", "nws-fill", (e) => {
    const p = e.features[0].properties || {};
    new maplibregl.Popup({ offset: 8, maxWidth: "300px" }).setLngLat(e.lngLat)
      .setHTML(`<b>${escapeHtml(p.event || "Weather alert")}</b>` +
        (p.headline ? `<div class="pp-addr">${escapeHtml(p.headline)}</div>` : "") +
        (p.instruction ? `<div class="muted" style="margin-top:6px">${escapeHtml(p.instruction)}</div>` : "")).addTo(map);
  });
  map.on("mouseenter", "nws-fill", () => { map.getCanvas().style.cursor = "pointer"; });
  map.on("mouseleave", "nws-fill", () => { map.getCanvas().style.cursor = ""; });
}
async function fetchAlerts() {
  try {
    // Significant, driving-relevant severities only (skip Minor advisories) to keep the payload lean.
    const r = await fetch("/nws/alerts/active?status=actual&severity=Extreme,Severe,Moderate");
    if (!r.ok) throw new Error("nws " + r.status);
    const j = await r.json();
    nwsAlerts = (j.features || []).filter((f) => f.geometry && (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon"));
    if (map.getSource("nws-alerts")) map.getSource("nws-alerts").setData({ type: "FeatureCollection", features: nwsAlerts });
    checkRouteWeather();
    if (navMode) checkPositionWeather();
  } catch { /* NWS unreachable / offline — silent */ }
}
function ensureAlertFeed() {
  ensureWeatherLayers();
  if (!weatherTimer) { fetchAlerts(); weatherTimer = setInterval(fetchAlerts, 4 * 60 * 1000); }  // NWS updates a few min
}
function maybeStopAlertFeed() { if (!weatherOn && !navMode && weatherTimer) { clearInterval(weatherTimer); weatherTimer = null; } }
async function setWeather(on) {
  weatherOn = on; btnWeather && btnWeather.classList.toggle("active", on);
  ensureWeatherLayers();
  ["nws-fill", "nws-line"].forEach((l) => map.getLayer(l) && map.setLayoutProperty(l, "visibility", on ? "visible" : "none"));
  if (on) { warnedAlerts.clear(); ensureAlertFeed(); } else maybeStopAlertFeed();
}
btnWeather && btnWeather.addEventListener("click", () => setWeather(!weatherOn));

// Dependency-free point-in-polygon (ray casting), Polygon + MultiPolygon with holes.
function pointInRing(pt, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if (((yi > pt[1]) !== (yj > pt[1])) && (pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
function pointInGeom(pt, geom) {
  const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.type === "MultiPolygon" ? geom.coordinates : [];
  for (const poly of polys) {
    if (!poly.length || !pointInRing(pt, poly[0])) continue;
    let inHole = false;
    for (let h = 1; h < poly.length; h++) if (pointInRing(pt, poly[h])) { inHole = true; break; }
    if (!inHole) return true;
  }
  return false;
}
const alertsAt = (pt) => nwsAlerts.filter((a) => pointInGeom(pt, a.geometry));

/* ---------- current weather near you (NWS point → hourly), shown in the app bar ---------- */
let localWxAt = 0, lastWxLoc = null;
function wxEmoji(short) {
  const s = (short || "").toLowerCase();
  if (/thunder|storm/.test(s)) return "⛈️";
  if (/snow|flurr|sleet|ice|blizzard|winter/.test(s)) return "🌨️";
  if (/rain|shower|drizzle/.test(s)) return "🌧️";
  if (/fog|haze|mist/.test(s)) return "🌫️";
  if (/cloud|overcast/.test(s)) return /partly|mostly sunny/.test(s) ? "⛅" : "☁️";
  if (/clear|sunny|fair/.test(s)) return "☀️";
  return "🌡️";
}
async function updateLocalWeather(force) {
  // Prefer the GPS fix; on desktop (often no GPS) fall back to the map center so
  // the chip still shows weather for wherever you're looking.
  const loc = navUserPos || [map.getCenter().lng, map.getCenter().lat];
  const now = performance.now();
  const moved = !lastWxLoc || haversine(lastWxLoc, loc) > 25000;   // refetch if you've moved/panned >~25 km
  if (!force && !moved && now - localWxAt < 15 * 60 * 1000) return;
  localWxAt = now; lastWxLoc = loc;
  try {
    const pj = await (await fetch(`/nws/points/${loc[1].toFixed(4)},${loc[0].toFixed(4)}`)).json();
    const hourly = pj.properties && pj.properties.forecastHourly;
    if (!hourly) return;
    const fj = await (await fetch(hourly.replace(/^https?:\/\/api\.weather\.gov/, "/nws"))).json();
    const p0 = fj.properties && fj.properties.periods && fj.properties.periods[0];
    if (!p0) return;
    const el = document.getElementById("appbar-weather"); if (!el) return;
    el.innerHTML = `<span class="wx-emoji">${wxEmoji(p0.shortForecast)}</span><span class="wx-temp">${p0.temperature}°</span>`;
    el.title = p0.shortForecast || "Current weather";
    el.classList.remove("hidden");
  } catch { /* NWS point forecast unavailable */ }
}
// Show it on load (map center until auto-locate flies to you) and refresh when
// you pan to a new area — so the chip appears on desktop without a GPS fix too.
if (map.loaded && map.loaded()) updateLocalWeather(true); else map.once("load", () => updateLocalWeather(true));
setTimeout(() => updateLocalWeather(true), 3500);
{ let wxT = null; map.on("moveend", () => { clearTimeout(wxT); wxT = setTimeout(() => updateLocalWeather(), 1500); }); }
function warnAlert(a, prefix) {
  const id = a.id || (a.properties && a.properties.id) || ((a.properties && a.properties.event) + "|" + (a.properties && a.properties.areaDesc));
  if (warnedAlerts.has(id)) return;
  warnedAlerts.add(id);
  const ev = (a.properties && a.properties.event) || "Weather alert";
  notify(`⚠ ${prefix} ${ev}`);
  speak(`${prefix} ${ev}.`);
}
// Bad weather ALONG the route (sample the line ahead, up to ~120 mi).
function checkRouteWeather() {
  if (!nwsAlerts.length || !routeLine) return;
  const startS = navMode ? navS : 0;
  for (let d = 0; d <= Math.min(routeTotal - startS, 200000); d += 3000) {
    const p = pointAtS(startS + d); if (!p) break;
    for (const a of alertsAt(p.pt)) warnAlert(a, "On your route:");
  }
}
// Entering a bad-weather area while navigating.
function checkPositionWeather() {
  if (!nwsAlerts.length || !navUserPos) return;
  for (const a of alertsAt(navUserPos)) warnAlert(a, "Entering");
}

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
// The center for a "near me" search: the live GPS fix, else actively request
// one, else the map center ONLY if zoomed in (otherwise it's the default
// center-of-US and "nearest" would return somewhere across the country).
async function pointSearchOrigin() {
  if (navUserPos) return navUserPos;
  try { const p = await currentPosition(); navUserPos = p; return p; } catch { /* denied/timeout */ }
  if (map.getZoom() >= 10) return [map.getCenter().lng, map.getCenter().lat];
  return null;
}
async function runPlaceSearch({ cat, query, along }) {
  placesActiveCat = cat; renderChips();
  const useAlong = along && !!routeLine;
  const ctx = document.getElementById("places-ctx"); if (ctx) ctx.textContent = "searching…";
  let center = null;
  if (!useAlong) {
    center = await pointSearchOrigin();
    if (!center) { if (ctx) ctx.textContent = "need your location"; showError("Enable location (or zoom to an area) to search nearby."); return; }
  }
  const pts = useAlong ? sampleRouteAhead() : [center];
  const radius = useAlong ? 3000 : 5000;
  const res = dedupePlaces(await fetchPlaces({ cat, query, pts, radius }));
  const origin = useAlong ? (navUserPos || pts[0]) : center;
  for (const r of res) { r.dist = haversine(origin, [r.lng, r.lat]); if (useAlong) { const pr = projectToRoute([r.lng, r.lat]); r.s = pr ? pr.s : Infinity; } }
  placesResults = res; sortPlaces();
  if (ctx) ctx.textContent = res.length ? `${res.length} ${useAlong ? "along route" : "nearby"}` : "none found";
  const pnl = document.getElementById("places-panel"); if (pnl) pnl.open = true;
  window.wfSetDrawerCollapsed && window.wfSetDrawerCollapsed(false);
  if (res.length && !useAlong) framePlaces(res, origin);
}
// Bring the result pins into view. fitBounds throws when the padding exceeds a
// narrow (mobile) canvas — which leaves the pins off-screen — so pad
// proportionally and fall back to easing to the first result.
function framePlaces(res, origin) {
  try {
    const b = new maplibregl.LngLatBounds();
    res.forEach((r) => b.extend([r.lng, r.lat])); if (origin) b.extend(origin);
    if (b.isEmpty()) return;
    const w = (map.getContainer() && map.getContainer().clientWidth) || 360;
    const leftPad = Math.min(360, Math.round(w * 0.3));
    map.fitBounds(b, { padding: { top: 80, bottom: 80, left: leftPad, right: 40 }, maxZoom: 15, duration: 600 });
  } catch {
    try { map.easeTo({ center: [res[0].lng, res[0].lat], zoom: 13, duration: 600 }); } catch { /* map busy */ }
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
// Place pins are HTML markers, NOT a glyph symbol layer: the vendored font
// folder has spaces ("Noto Sans Regular") which break nginx try_files, so glyph
// pbfs 404 → SPA index.html → MapLibre floods "Unimplemented type: 4". Markers
// need no glyphs, always render regardless of style-load timing, and click natively.
let placesMarkers = [];
function renderPlaces() {
  placesMarkers.forEach((m) => m.remove());
  placesMarkers = placesResults.map((r, i) => {
    const el = document.createElement("div");
    el.className = "place-pin";
    el.textContent = String(i + 1);
    el.addEventListener("click", (e) => { e.stopPropagation(); flyToPlace(i); });
    return new maplibregl.Marker({ element: el }).setLngLat([r.lng, r.lat]).addTo(map);
  });
  const list = document.getElementById("places-list"); if (!list) return;
  list.innerHTML = placesResults.map((r, i) =>
    `<li class="place-row" data-i="${i}"><span class="pidx">${i + 1}</span>` +
    `<span class="pmain"><span class="pname">${escapeHtml(r.name)}</span>` +
    `<span class="psub">${fmtDistImperialShort(r.dist)}${r.addr ? " · " + escapeHtml(r.addr) : ""}</span></span>` +
    `<button class="padd" data-i="${i}">Add</button></li>`).join("");
  list.querySelectorAll(".place-row").forEach((li) => li.addEventListener("click", (e) => { if (!e.target.classList.contains("padd")) flyToPlace(Number(li.dataset.i)); }));
  list.querySelectorAll(".padd").forEach((b) => b.addEventListener("click", () => addPlaceAsStop(Number(b.dataset.i))));
}
// Single shared popup: opening a new one dismisses the previous.
let placePopup = null;
function flyToPlace(i) {
  const r = placesResults[i]; if (!r) return;
  map.flyTo({ center: [r.lng, r.lat], zoom: Math.max(map.getZoom(), 15) });
  if (placePopup) { placePopup.remove(); placePopup = null; }
  const html =
    `<div class="place-pop"><b>${escapeHtml(r.name)}</b>` +
    (r.addr ? `<div class="pp-addr">${escapeHtml(r.addr)}</div>` : "") +
    `<div class="pp-actions"><button type="button" class="pp-dir">Directions</button>` +
    `<button type="button" class="pp-add">Add stop</button></div></div>`;
  placePopup = new maplibregl.Popup({ offset: 18, closeButton: true, closeOnClick: true })
    .setLngLat([r.lng, r.lat]).setHTML(html).addTo(map);
  placePopup.on("close", () => { placePopup = null; });
  const el = placePopup.getElement();
  if (el) {
    const dir = el.querySelector(".pp-dir"); if (dir) dir.onclick = () => directionsToPlace(i);
    const add = el.querySelector(".pp-add"); if (add) add.onclick = () => { addPlaceAsStop(i); if (placePopup) placePopup.remove(); };
  }
}
// Route to this place: append it as the destination, seeding "my location" as
// the origin when there are no stops yet, then run the normal Directions flow.
function directionsToPlace(i) {
  const r = placesResults[i]; if (!r) return;
  if (placePopup) { placePopup.remove(); placePopup = null; }
  requestRouteTo(r);
}
// Route to a point, but if we're mid-navigation, CONFIRM first (a new route
// abandons the current drive) — voice/taps can't silently stop navigation.
function requestRouteTo(p) {
  if (navMode) {
    const label = p.name || p.label || "there";
    speak(`Change your route to ${label}?`);
    confirmBanner(`Change your route to ${escapeHtml(label)}?`, () => { exitNav(); routeToPoint(p); });
  } else routeToPoint(p);
}
function confirmBanner(msg, onYes) {
  const e = document.getElementById("error");
  e.innerHTML = `${msg} <span class="cfm"><button id="cfm-yes" class="cfm-y">Yes</button><button id="cfm-no" class="cfm-n">No</button></span>`;
  e.classList.remove("hidden");
  const yes = document.getElementById("cfm-yes"), no = document.getElementById("cfm-no");
  if (yes) yes.onclick = () => { e.classList.add("hidden"); e.innerHTML = ""; onYes(); };
  if (no) no.onclick = () => { e.classList.add("hidden"); e.innerHTML = ""; };
}
function addPlaceAsStop(i) {
  const r = placesResults[i]; if (!r) return;
  if (placePopup) { placePopup.remove(); placePopup = null; }
  if (navMode && routeLine && navUserPos && stops.length >= 1) { addWaypointLive(r); return; }  // waypoint on the way
  stops.push({ localId: newId(), lat: r.lat, lng: r.lng, label: r.name });
  clearRoute(); clearError(); render();
}
document.getElementById("places-sort") && (document.getElementById("places-sort").onchange = sortPlaces);
renderChips();

/* ================= URL deep links =================
 * ?origin=…&destination=…  (also daddr/saddr, to/from, q). Each value may be
 * "lat,lng", "current location"/"here"/"my location" (GPS), or an address/place.
 * Optional &nav=1 auto-starts navigation once the route is computed. */
async function resolvePlaceParam(v) {
  const s = (v || "").trim();
  const m = s.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);   // lat,lng
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]), label: `${(+m[1]).toFixed(4)}, ${(+m[2]).toFixed(4)}` };
  if (/^(your\s+)?(current\s+location|my\s+location|current|here|gps|now)$/i.test(s)) {
    let loc = navUserPos;
    if (!loc) { try { loc = await currentPosition(); navUserPos = navUserPos || loc; } catch { /* denied */ } }
    return loc ? { lat: loc[1], lng: loc[0], label: "My location", isCurrent: true } : null;
  }
  const res = await geocodeForward(s, 1).catch(() => []);
  return res[0] ? { lat: res[0].lat, lng: res[0].lng, label: res[0].label } : null;
}
async function handleDeepLink() {
  const p = new URLSearchParams(location.search);
  const destRaw = p.get("destination") || p.get("daddr") || p.get("to") || p.get("q");
  if (!destRaw) return;   // no deep link → normal app load
  const dp = await resolvePlaceParam(destRaw);
  if (!dp) { showError(`Couldn't find "${destRaw}".`); return; }
  const list = [];
  const origRaw = p.get("origin") || p.get("saddr") || p.get("from");
  const op = origRaw ? await resolvePlaceParam(origRaw) : null;
  if (op) list.push({ localId: newId(), lat: op.lat, lng: op.lng, label: op.label, origin: !!op.isCurrent });
  else if (navUserPos) list.push({ localId: newId(), lat: navUserPos[1], lng: navUserPos[0], label: "My location", origin: true });
  list.push({ localId: newId(), lat: dp.lat, lng: dp.lng, label: dp.label });
  stops = list; clearError(); render();
  if (stops.length >= 2) {
    document.getElementById("btn-route").click();
    if (p.get("nav") === "1" || p.get("navigate") === "1") setTimeout(() => { if (currentRoutes.length) startNav(); }, 2800);
  } else {
    map.flyTo({ center: [dp.lng, dp.lat], zoom: 14 });
    showError("Allow location (or add a start point) to get directions there.");
  }
}
// Run after the map + a beat for auto-locate to populate GPS (avoids a 2nd prompt).
if (map.loaded && map.loaded()) setTimeout(handleDeepLink, 1500);
else map.once("load", () => setTimeout(handleDeepLink, 1500));

render();
