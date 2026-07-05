/* Geofence layers — full Terra Draw toolset via @watergis/maplibre-gl-terradraw
 * (the terradraw.water-gis.com control): point/marker, line, polygon, rectangle,
 * circle, freehand, angled-rectangle, sector, sensor, select/edit, delete,
 * download, plus distance/area measurement labels.
 *
 * Architecture: Terra Draw's store OWNS the live features (that's what makes
 * select/edit/measure work). This module mirrors the store into an open-ended
 * set of named layers: every finished feature is stamped with the active
 * layer's id, and any change persists the snapshot to localStorage grouped by
 * that stamp. Hidden layers are pulled out of the store but kept in the model.
 * Per-layer GeoJSON export/import keeps everything portable. */
import { MaplibreMeasureControl } from "./vendor/terra-draw.bundle.js"; // .js not .mjs — nginx serves .mjs as octet-stream

const map = window.nomadMap;
const LS_KEY = "nomad-geofence-layers-v1"; // schema unchanged from v1 (features gain properties.mode)
const PALETTE = ["#FF6B35", "#1e88e5", "#2e7d32", "#8e24aa", "#00838f", "#c62828", "#f9a825", "#5e35b1"];
const uid = () => Math.random().toString(36).slice(2, 10);

/* ---------- model ---------- */
function defaults() { return [{ id: uid(), name: "Layer 1", color: PALETTE[0], visible: true, features: [] }]; }
function load() {
  try { const v = JSON.parse(localStorage.getItem(LS_KEY)); return Array.isArray(v) && v.length ? v : defaults(); }
  catch { return defaults(); }
}
function save() { try { localStorage.setItem(LS_KEY, JSON.stringify(layers)); } catch { /* quota */ } }

let layers = load();
let activeLayerId = layers[0].id;
const activeLayer = () => layers.find((l) => l.id === activeLayerId) || null;

/* Terra Draw's addFeatures needs properties.mode; v1-era saved features lack it. */
function inferMode(geom) {
  if (!geom) return "point";
  if (geom.type === "Point") return "point";
  if (geom.type === "LineString") return "linestring";
  return "polygon"; // Polygon / MultiPolygon (rect/circle/etc. all persist as polygons)
}
const isUuid = (s) => typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const newUuid = () => (crypto.randomUUID ? crypto.randomUUID()
  : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0; return (c === "x" ? r : (r & 3) | 8).toString(16);
    }));
function toTdFeature(f, layerId) {
  // Terra Draw v1 validates feature ids as UUID4 — shapes saved by the old
  // hand-rolled toolbar carry short random ids, which made restore throw.
  // Re-id those (persist() writes the new uuid back via String(f.id)).
  const id = isUuid(f.properties?._uid) ? f.properties._uid : newUuid();
  return {
    id,
    type: "Feature",
    geometry: f.geometry,
    properties: { ...(f.properties || {}), _uid: id, mode: f.properties?.mode || inferMode(f.geometry), layerId },
  };
}

/* ---------- the control (all modes + measurement) ---------- */
const control = new MaplibreMeasureControl({ open: true }); // no `modes` -> every mode the plugin ships
// NOTE: addControl happens in boot() — the measure control adds map sources in
// onAdd, which throws "Style is not done loading" if run before the style loads.
let td = null;              // TerraDraw instance
let suppressPersist = false; // guard while we add/remove features programmatically

function snapshotClean() {
  return td.getSnapshot().filter((f) =>
    !f.properties?.midPoint && !f.properties?.selectionPoint && !f.properties?.guidance);
}

/* Persist: group the live store by layerId stamp; hidden layers keep model data. */
let persistTimer = null;
function persistSoon() { clearTimeout(persistTimer); persistTimer = setTimeout(persist, 250); }
function persist() {
  if (suppressPersist || !td) return;
  const grouped = new Map();
  for (const f of snapshotClean()) {
    const lid = f.properties?.layerId && layers.some((l) => l.id === f.properties.layerId)
      ? f.properties.layerId : activeLayerId;
    if (!grouped.has(lid)) grouped.set(lid, []);
    grouped.get(lid).push({ type: "Feature", geometry: f.geometry,
      properties: { ...f.properties, _uid: String(f.id) } });
  }
  for (const L of layers) {
    if (!L.visible) continue;               // hidden layers aren't in the store; keep model copy
    L.features = grouped.get(L.id) || [];
  }
  save(); renderLayersUI();
}

/* Stamp finished sketches with the active layer (remove+re-add keeps the id). */
function stampFinished(id) {
  try {
    const f = td.getSnapshotFeature(id);
    if (!f || f.properties?.layerId) return;
    suppressPersist = true;
    td.removeFeatures([id]);
    td.addFeatures([{ ...f, properties: { ...f.properties, layerId: activeLayerId } }]);
  } catch { /* feature vanished (e.g. deleted) */ }
  finally { suppressPersist = false; }
  persistSoon();
}

function initDrawEvents() {
  td = control.getTerraDrawInstance();
  td.on("finish", (id, ctx) => {
    if (!ctx || ctx.action === "draw") stampFinished(id);
    else persistSoon();                    // drag / edit finished
  });
  td.on("change", () => persistSoon());    // vertex edits, deletes, rotations…
  control.on("feature-deleted", () => persistSoon());
  // Route planner: don't drop a stop while any draw/select tool is armed.
  control.on("mode-changed", (e) => {
    const m = (e && (e.mode || e.detail?.mode)) || (td && td.getMode()) || "render";
    window.nomadDrawActive = m !== "render";
  });
  // Restore saved features into the store (visible layers only). Per-feature
  // fallback: one bad saved shape must never take out the whole restore.
  suppressPersist = true;
  try {
    for (const L of layers) {
      if (!L.visible || !L.features.length) continue;
      const feats = L.features.map((f) => toTdFeature(f, L.id));
      try { td.addFeatures(feats); }
      catch {
        for (const f of feats) {
          try { td.addFeatures([f]); }
          catch (e) { console.warn("geofence: skipped unrestorable shape", f.id, e && e.message); }
        }
      }
    }
  } catch (e) { console.error("geofence restore failed", e); }
  finally { suppressPersist = false; }
}

/* ---------- layer visibility: move features in/out of the store ---------- */
function setLayerVisible(L, on) {
  L.visible = on;
  suppressPersist = true;
  try {
    if (on) td.addFeatures(L.features.map((f) => toTdFeature(f, L.id)));
    else {
      const ids = snapshotClean().filter((f) => f.properties?.layerId === L.id).map((f) => f.id);
      // capture latest geometry before pulling them out
      const latest = snapshotClean().filter((f) => f.properties?.layerId === L.id)
        .map((f) => ({ type: "Feature", geometry: f.geometry, properties: { ...f.properties, _uid: String(f.id) } }));
      if (latest.length) L.features = latest;
      if (ids.length) td.removeFeatures(ids);
    }
  } catch (e) { console.error("visibility toggle failed", e); }
  finally { suppressPersist = false; }
  save(); renderLayersUI();
}

/* ---------- tabs (Directions vs Layers) ---------- */
function initTabs() {
  document.querySelectorAll(".tab").forEach((t) =>
    t.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("active", x === t));
      const which = t.dataset.tab;
      document.getElementById("tab-directions").classList.toggle("hidden", which !== "directions");
      document.getElementById("tab-layers").classList.toggle("hidden", which !== "layers");
      // The Terra Draw control (top-right) belongs to the Layers tab only —
      // CSS hides it via this body class, and leaving the tab disarms any
      // active draw mode so hidden tools can't keep capturing map clicks.
      document.body.classList.toggle("layers-tab", which === "layers");
      if (which !== "layers") {
        try { td && td.setMode("render"); } catch { /* not started yet */ }
        window.nomadDrawActive = false;
      }
    }));
}

/* ---------- layers panel UI ---------- */
function renderLayersUI() {
  const ul = document.getElementById("layers");
  if (!ul) return;
  ul.innerHTML = "";
  layers.forEach((L) => {
    const li = document.createElement("li");
    li.className = "layer-row" + (L.id === activeLayerId ? " active" : "");
    li.innerHTML = `
      <button class="vis ${L.visible ? "on" : ""}" title="Show / hide">${L.visible ? "◉" : "○"}</button>
      <input class="swatch" type="color" value="${L.color}" title="Layer color" />
      <input class="name" value="${(L.name || "").replace(/"/g, "&quot;")}" title="Rename layer" />
      <span class="count">${L.features.length}</span>
      <button class="use" title="New shapes save to this layer">${L.id === activeLayerId ? "active" : "use"}</button>
      <button class="del" title="Delete layer">✕</button>`;
    li.querySelector(".vis").onclick = () => setLayerVisible(L, !L.visible);
    li.querySelector(".swatch").oninput = (e) => { L.color = e.target.value; save(); };
    li.querySelector(".name").onchange = (e) => { L.name = e.target.value.trim() || L.name; save(); };
    li.querySelector(".use").onclick = () => { activeLayerId = L.id; renderLayersUI(); };
    li.querySelector(".del").onclick = () => {
      suppressPersist = true;
      try {
        const ids = snapshotClean().filter((f) => f.properties?.layerId === L.id).map((f) => f.id);
        if (ids.length) td.removeFeatures(ids);
      } catch { /* store already clean */ }
      finally { suppressPersist = false; }
      if (layers.length === 1) { layers = defaults(); } else { layers = layers.filter((x) => x.id !== L.id); }
      if (!layers.some((x) => x.id === activeLayerId)) activeLayerId = layers[0].id;
      save(); renderLayersUI();
    };
    ul.appendChild(li);
  });
}

/* ---------- layer actions: new / import / export ---------- */
function initLayerActions() {
  document.getElementById("btn-new-layer").onclick = () => {
    const L = { id: uid(), name: `Layer ${layers.length + 1}`, color: PALETTE[layers.length % PALETTE.length], visible: true, features: [] };
    layers.push(L); activeLayerId = L.id; save(); renderLayersUI();
  };
  document.getElementById("btn-export-layer").onclick = () => {
    const L = activeLayer(); if (!L) return;
    persist(); // capture the freshest geometry from the store first
    const fc = { type: "FeatureCollection", features: L.features.map((f) => ({ type: "Feature", geometry: f.geometry, properties: { name: L.name, color: L.color } })) };
    const blob = new Blob([JSON.stringify(fc, null, 2)], { type: "application/geo+json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(L.name || "layer").replace(/[^\w.-]+/g, "_")}.geojson`;
    a.click(); URL.revokeObjectURL(a.href);
  };
  const fileInput = document.getElementById("import-file");
  document.getElementById("btn-import-layer").onclick = () => fileInput.click();
  fileInput.onchange = async () => {
    const file = fileInput.files[0]; fileInput.value = "";
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const raw = data.type === "FeatureCollection" ? data.features
        : data.type === "Feature" ? [data]
        : Array.isArray(data) ? data : [];
      const feats = raw.filter((f) => f && f.geometry).map((f) => ({ type: "Feature", geometry: f.geometry, properties: { _uid: uid(), mode: inferMode(f.geometry) } }));
      if (!feats.length) { console.warn("no GeoJSON features in import"); return; }
      const L = { id: uid(), name: file.name.replace(/\.(geo)?json$/i, ""), color: PALETTE[layers.length % PALETTE.length], visible: true, features: feats };
      layers.push(L); activeLayerId = L.id;
      suppressPersist = true;
      try { td.addFeatures(feats.map((f) => toTdFeature(f, L.id))); }
      catch (e) { console.error("import addFeatures failed", e); }
      finally { suppressPersist = false; }
      save(); renderLayersUI(); fitTo(feats);
    } catch { console.error("could not parse import as GeoJSON"); }
  };
}
function fitTo(feats) {
  const b = new maplibregl.LngLatBounds();
  const flat = (arr) => { if (Array.isArray(arr[0])) arr.forEach(flat); else b.extend(arr); };
  feats.forEach((f) => {
    if (!f.geometry) return;
    if (f.geometry.type === "Point") b.extend(f.geometry.coordinates);
    else flat(f.geometry.coordinates);
  });
  if (!b.isEmpty()) map.fitBounds(b, { padding: 80, maxZoom: 15 });
}

/* ---------- boot ---------- */
function boot() {
  // The draw control can fail (e.g. style/glyph issues) — never let that take
  // down the tabs + layers panel with it.
  try {
    map.addControl(control, "top-right"); // top-left is occupied by the Wayfinder panel
    initDrawEvents();
  } catch (e) { console.error("draw control failed to mount:", e && e.message); }
  initTabs();
  initLayerActions();
  renderLayersUI();
}
// Boot gating is subtle here:
//  * isStyleLoaded() lies (true before real load with an inline style object)
//    — the control's onAdd then throws "Style is not done loading".
//  * "load" is one-shot and can fire BEFORE this deferred module registers its
//    listener (missed event -> boot never runs).
//  * loaded() is momentary (false during tile churn) so it can't be trusted alone.
// => try loaded(), and register BOTH "load" and "idle" ("idle" always fires
//    eventually, even if "load" was missed); the guard dedupes.
let booted = false;
function start() { if (booted) return; booted = true; boot(); }
// Deployment gate: if geofence is disabled, never mount Terra Draw or the
// toolbar. (This is a module — top-level `return` is illegal — so we gate the
// boot invocation. gate.js is a classic script loaded first, so wfFeature
// exists here.) The Layers tab + pane are already removed by gate.js.
if (window.wfFeature && !wfFeature("geofence")) { /* geofence off — no toolbar */ }
else if (map.loaded()) start();
else { map.once("load", start); map.once("idle", start); }
