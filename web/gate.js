/* Deployment feature gate — runs AFTER config.js, BEFORE app.js (both classic
 * scripts, so this executes with the header/panel DOM already parsed above it).
 * A feature is ON unless config.js explicitly set it to `false` (default-on for
 * anything unspecified). For each DISABLED feature we simply REMOVE its DOM up
 * front: app.js wires every control with a null-guard (bBtn && bBtn.addEvent-
 * Listener(...)), so a missing element makes that wiring cleanly no-op. Core
 * (address search, routing, street basemap) has no toggle and is never gated. */
window.wfFeature = (name) => !(window.WAYFINDER_CONFIG?.features?.[name] === false);

(function gateDom() {
  const drop = (sel) => { const el = document.querySelector(sel); if (el) el.remove(); };

  if (!wfFeature("traffic")) drop("#btn-traffic");
  if (!wfFeature("weather")) { drop("#btn-weather"); drop("#appbar-weather"); }
  if (!wfFeature("voice")) drop("#btn-mic");
  if (!wfFeature("threeD")) drop("#btn-3d");
  if (!wfFeature("satellite")) drop('button[data-base="satellite"]');
  if (!wfFeature("poi")) drop("#places-panel");
  if (!wfFeature("geofence")) {
    // Remove the Geofence tab + its pane; leave the Directions tab active so the
    // planner is still the default view (app.js/geofence.js tab wiring no-ops).
    drop('.tab[data-tab="layers"]');
    drop("#tab-layers");
  }
})();
