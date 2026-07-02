/* Geofence layers — open-ended draw + persist, ported from the mass-zero-fpv
 * fleet map (which uses Terra Draw). Standalone ES module: owns the drawing
 * tools, an unbounded set of named layers, localStorage persistence, and
 * GeoJSON import/export. Renders via one shared source + fill/line/circle
 * layers (same pattern as mzfs `mz-geofences-ml`).
 *
 * Storage: layers live in localStorage (per-browser, offline). Each layer's
 * features are portable GeoJSON, so Export/Import moves them between browsers
 * or into any other GeoJSON tool. (Server-side sync can be layered on later.) */
import {
  TerraDraw,
  TerraDrawPolygonMode,
  TerraDrawRectangleMode,
  TerraDrawLineStringMode,
  TerraDrawPointMode,
  TerraDrawRenderMode,
  TerraDrawMapLibreGLAdapter,
} from "./vendor/terra-draw.mjs";

const map = window.nomadMap;
const LS_KEY = "nomad-geofence-layers-v1";
const SRC = "nomad-gf";
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

/* ---------- terra draw ---------- */
let draw = null;
let currentMode = "pointer";
const DRAW_MODES = new Set(["polygon", "rectangle", "linestring", "point"]);

function sketchStyles(color) {
  return {
    fillColor: color, outlineColor: color, outlineWidth: 2, fillOpacity: 0.25,
    lineStringColor: color, lineStringWidth: 3,
    pointColor: color, pointOutlineColor: "#ffffff", pointOutlineWidth: 1.5, pointWidth: 6,
  };
}
function initDraw() {
  const c = activeLayer()?.color || PALETTE[0];
  draw = new TerraDraw({
    adapter: new TerraDrawMapLibreGLAdapter({ map }),
    modes: [
      new TerraDrawRenderMode({ modeName: "render", styles: {} }),
      new TerraDrawPolygonMode({ styles: sketchStyles(c) }),
      new TerraDrawRectangleMode({ styles: sketchStyles(c) }),
      new TerraDrawLineStringMode({ styles: sketchStyles(c) }),
      new TerraDrawPointMode({ styles: sketchStyles(c) }),
    ],
  });
  draw.start();
  draw.setMode("render");
  // On completion, move the drawn feature out of Terra Draw into the active layer.
  draw.on("finish", (id, ctx) => {
    if (ctx && ctx.action !== "draw") return;
    const feat = draw.getSnapshot().find((f) => String(f.id) === String(id));
    try { draw.removeFeatures([id]); } catch { /* already gone */ }
    if (!feat) return;
    const L = activeLayer();
    if (!L) return;
    L.features.push({ type: "Feature", geometry: feat.geometry, properties: { _uid: uid() } });
    save(); rebuild(); renderLayersUI();
  });
}

/* ---------- rendering (one source, fill/line/circle) ---------- */
function collectFC() {
  const features = [];
  for (const L of layers) {
    if (!L.visible) continue;
    for (const f of L.features) {
      features.push({
        type: "Feature", geometry: f.geometry,
        properties: { _uid: f.properties._uid, _layerId: L.id, color: L.color, name: L.name },
      });
    }
  }
  return { type: "FeatureCollection", features };
}
function ensureRenderLayers() {
  if (!map.getSource(SRC)) map.addSource(SRC, { type: "geojson", data: collectFC() });
  if (!map.getLayer("nomad-gf-fill"))
    map.addLayer({
      id: "nomad-gf-fill", type: "fill", source: SRC,
      filter: ["any", ["==", ["geometry-type"], "Polygon"], ["==", ["geometry-type"], "MultiPolygon"]],
      paint: { "fill-color": ["coalesce", ["get", "color"], "#1976d2"], "fill-opacity": 0.3 },
    });
  if (!map.getLayer("nomad-gf-line"))
    map.addLayer({
      id: "nomad-gf-line", type: "line", source: SRC,
      filter: ["any", ["==", ["geometry-type"], "Polygon"], ["==", ["geometry-type"], "MultiPolygon"], ["==", ["geometry-type"], "LineString"]],
      paint: { "line-color": ["coalesce", ["get", "color"], "#1976d2"], "line-width": 2.5, "line-opacity": 0.95 },
    });
  if (!map.getLayer("nomad-gf-point"))
    map.addLayer({
      id: "nomad-gf-point", type: "circle", source: SRC,
      filter: ["==", ["geometry-type"], "Point"],
      paint: {
        "circle-radius": 5, "circle-color": ["coalesce", ["get", "color"], "#1976d2"],
        "circle-stroke-color": "#ffffff", "circle-stroke-width": 1.5,
      },
    });
}
function rebuild() { const s = map.getSource(SRC); if (s) s.setData(collectFC()); }

// A saved-shape click shows its name/layer (only in pointer mode — not while
// drawing over an existing shape, and not mid-delete).
function initPopups() {
  const show = (e) => {
    if (currentMode !== "pointer") return;
    const p = e.features[0].properties;
    new maplibregl.Popup({ offset: 12 })
      .setLngLat(e.lngLat)
      .setHTML(`<strong>${(p.name || "").replace(/[<>&]/g, "")}</strong>`)
      .addTo(map);
  };
  ["nomad-gf-fill", "nomad-gf-line", "nomad-gf-point"].forEach((id) => map.on("click", id, show));
}

/* ---------- delete tool ---------- */
map.on("click", (e) => {
  if (currentMode !== "delete") return;
  const hits = map.queryRenderedFeatures(e.point, { layers: ["nomad-gf-fill", "nomad-gf-line", "nomad-gf-point"] });
  if (!hits.length) return;
  const { _uid, _layerId } = hits[0].properties;
  const L = layers.find((l) => l.id === _layerId);
  if (!L) return;
  L.features = L.features.filter((f) => f.properties._uid !== _uid);
  save(); rebuild(); renderLayersUI();
});

/* ---------- tools / toolbar ---------- */
function setMode(mode) {
  currentMode = mode;
  window.nomadDrawActive = mode !== "pointer"; // app.js suppresses route stops while drawing/deleting
  if (draw) draw.setMode(DRAW_MODES.has(mode) ? mode : "render");
  document.querySelectorAll(".dtool").forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
  const canvas = map.getCanvas();
  canvas.style.cursor = mode === "pointer" ? "" : (mode === "delete" ? "not-allowed" : "crosshair");
}
function initToolbar() {
  document.querySelectorAll(".dtool").forEach((b) =>
    b.addEventListener("click", () => setMode(b.dataset.mode)));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMode("pointer"); });
}

/* ---------- tabs (Directions vs Layers) ---------- */
function initTabs() {
  const toolbar = document.getElementById("draw-toolbar");
  document.querySelectorAll(".tab").forEach((t) =>
    t.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("active", x === t));
      const which = t.dataset.tab;
      document.getElementById("tab-directions").classList.toggle("hidden", which !== "directions");
      document.getElementById("tab-layers").classList.toggle("hidden", which !== "layers");
      toolbar.classList.toggle("hidden", which !== "layers");
      if (which !== "layers") setMode("pointer"); // leaving the tab disarms the tools
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
      <button class="use" title="Draw into this layer">${L.id === activeLayerId ? "active" : "use"}</button>
      <button class="del" title="Delete layer">✕</button>`;
    li.querySelector(".vis").onclick = () => { L.visible = !L.visible; save(); rebuild(); renderLayersUI(); };
    li.querySelector(".swatch").oninput = (e) => { L.color = e.target.value; save(); rebuild(); };
    li.querySelector(".name").onchange = (e) => { L.name = e.target.value.trim() || L.name; save(); rebuild(); };
    li.querySelector(".use").onclick = () => { activeLayerId = L.id; refreshSketchColor(); renderLayersUI(); };
    li.querySelector(".del").onclick = () => {
      if (layers.length === 1) { layers = defaults(); } else { layers = layers.filter((x) => x.id !== L.id); }
      if (!layers.some((x) => x.id === activeLayerId)) activeLayerId = layers[0].id;
      save(); rebuild(); renderLayersUI();
    };
    ul.appendChild(li);
  });
}
function refreshSketchColor() {
  const c = activeLayer()?.color || PALETTE[0];
  // updateModeOptions takes the mode NAME string (the mode class is only a TS
  // generic — confirmed in terra-draw.d.ts). Cosmetic if it ever fails.
  try {
    draw.updateModeOptions("polygon", { styles: sketchStyles(c) });
    draw.updateModeOptions("rectangle", { styles: sketchStyles(c) });
    draw.updateModeOptions("linestring", { styles: sketchStyles(c) });
    draw.updateModeOptions("point", { styles: sketchStyles(c) });
  } catch { /* sketch color is cosmetic anyway */ }
}

/* ---------- layer actions: new / import / export ---------- */
function initLayerActions() {
  document.getElementById("btn-new-layer").onclick = () => {
    const L = { id: uid(), name: `Layer ${layers.length + 1}`, color: PALETTE[layers.length % PALETTE.length], visible: true, features: [] };
    layers.push(L); activeLayerId = L.id; save(); rebuild(); renderLayersUI();
  };
  document.getElementById("btn-export-layer").onclick = () => {
    const L = activeLayer(); if (!L) return;
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
      const feats = raw.filter((f) => f && f.geometry).map((f) => ({ type: "Feature", geometry: f.geometry, properties: { _uid: uid() } }));
      if (!feats.length) return alert("No GeoJSON features found in that file.");
      const L = { id: uid(), name: file.name.replace(/\.(geo)?json$/i, ""), color: PALETTE[layers.length % PALETTE.length], visible: true, features: feats };
      layers.push(L); activeLayerId = L.id; save(); rebuild(); renderLayersUI();
      fitTo(feats);
    } catch { alert("Could not parse that file as GeoJSON."); }
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
  ensureRenderLayers();
  initDraw();
  initPopups();
  initToolbar();
  initTabs();
  initLayerActions();
  renderLayersUI();
  // Basemap switches in app.js keep custom layers, but re-assert defensively.
  map.on("styledata", () => { try { ensureRenderLayers(); rebuild(); } catch { /* style mid-swap */ } });
}
if (map.isStyleLoaded()) boot();
else map.once("load", boot);
