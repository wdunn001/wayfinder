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
      // Terrarium-encoded DEM (z0-9 overview bake). Two identical sources on
      // purpose: MapLibre explicitly warns against sharing one raster-dem
      // between setTerrain and a hillshade layer (duplicated request/cancel
      // churn + reduced rendering quality).
      "mz-terrain": { type: "raster-dem", tiles: [TILE.terrain], tileSize: 256, encoding: "terrarium",
        maxzoom: 9, attribution: "Elevation &copy; Mapzen / AWS Terrain Tiles" },
      "mz-terrain-hs": { type: "raster-dem", tiles: [TILE.terrain], tileSize: 256, encoding: "terrarium",
        maxzoom: 9 },
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

  // Hillshade relief from the terrarium DEM — hidden until 3D is on (no-op until the DEM is baked).
  // NOTE: the baked terrarium DEM is a z0-9 world overview (higher zooms 404),
  // so relief is coarse — exaggerate harder so it actually reads on screen.
  // Uses its own DEM source (mz-terrain-hs) — never share with setTerrain.
  map.addLayer({ id: "hillshade", type: "hillshade", source: "mz-terrain-hs",
    layout: { visibility: "none" }, paint: { "hillshade-exaggeration": 0.75 } }, "route-line");

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

/* ---------- routing (OSRM) + live-traffic evaluation ---------- */
const coordStr = () => stops.map((s) => `${s.lng},${s.lat}`).join(";");
let currentRoutes = [];      // [{ geometry, distance, duration, _adjusted?, _factor? }]
let selectedRouteIdx = 0;
let optimizedOrder = false;

document.getElementById("btn-route").onclick = async () => {
  clearError();
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
        out.push({ loc: st.maneuver.location, text: stepInstruction(st), icon: maneuverIcon(st), dist: st.distance || 0 });
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
  updateDrawerLauncher();
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
function updateDrawerLauncher() {
  const launcher = document.getElementById("drawer-launcher");
  if (!launcher) return;
  const txt = launcher.querySelector(".dl-text");
  const icon = launcher.querySelector(".dl-icon");
  // 1) Live navigation: show the upcoming maneuver + distance to it, so the
  //    collapsed pill is a turn-by-turn HUD with the map fully visible.
  if (currentSteps.length && navUserPos && navIdx < currentSteps.length) {
    const s = currentSteps[navIdx];
    txt.textContent = `${fmtDist(haversine(navUserPos, s.loc))} · ${s.text}`;
    if (icon) icon.textContent = s.icon;
    launcher.classList.add("route");
    return;
  }
  if (icon) icon.textContent = "☰";
  // 2) A computed route with no live position: show its distance · ETA.
  const sum = document.getElementById("summary");
  const big = sum && !sum.classList.contains("hidden") ? sum.querySelector(".big") : null;
  if (big && big.textContent.trim()) {
    txt.textContent = big.textContent.trim();
    launcher.classList.add("route");
  } else {
    const active = document.querySelector(".tab.active");
    txt.textContent = active && active.dataset.tab === "layers" ? "Geofence layers" : "Directions & layers";
    launcher.classList.remove("route");
  }
}

(function initDrawer() {
  const panel = document.getElementById("panel");
  const launcher = document.getElementById("drawer-launcher");
  const collapseBtn = document.getElementById("btn-collapse");
  if (!panel || !launcher || !collapseBtn) return;
  const KEY = "wf-drawer-collapsed";

  function setCollapsed(collapsed, persist = true) {
    panel.classList.toggle("collapsed", collapsed);
    launcher.classList.toggle("hidden", !collapsed);
    collapseBtn.setAttribute("aria-expanded", String(!collapsed));
    if (collapsed) updateDrawerLauncher();
    if (persist) { try { localStorage.setItem(KEY, collapsed ? "1" : "0"); } catch { /* private mode */ } }
  }
  window.wfSetDrawerCollapsed = setCollapsed;
  window.wfDrawerCollapsed = () => panel.classList.contains("collapsed");

  collapseBtn.addEventListener("click", () => setCollapsed(true));
  launcher.addEventListener("click", () => setCollapsed(false));

  // Honor the saved preference; with none, default collapsed on phones so the
  // drawer never eats the map on first load (the reason for this change).
  let start = null;
  try { start = localStorage.getItem(KEY); } catch { /* private mode */ }
  if (start === null) start = window.matchMedia("(max-width: 640px)").matches ? "1" : "0";
  setCollapsed(start === "1", false);
})();

render();
