#!/usr/bin/env bash
# =============================================================================
# scripts/build-vendor.sh, regenerate the vendored frontend dependencies in
# web/vendor/ (run ON A BOX WITH INTERNET, then commit the result; the image
# build itself is fully offline).
#
#   web/vendor/maplibre-gl.js / .css       MapLibre GL (page global)
#   web/vendor/terra-draw.bundle.js        @watergis/maplibre-gl-terradraw +
#                                          terra-draw (+ adapter), esbuild-
#                                          bundled into one self-contained ESM
#                                          (maplibre aliased to the page global)
#   web/vendor/terradraw-control.css       the plugin control stylesheet
#
# Usage: bash scripts/build-vendor.sh [MAPLIBRE_VER] [PLUGIN_VER]
# =============================================================================
set -euo pipefail
MAPLIBRE_VER="${1:-4.7.1}"
PLUGIN_VER="${2:-latest}"
HERE="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$HERE/web/vendor"
mkdir -p "$OUT"

docker run --rm -v "$OUT":/out node:20-alpine sh -euc "
  mkdir /b && cd /b && npm init -y >/dev/null 2>&1
  npm install --no-audit --no-fund --silent @watergis/maplibre-gl-terradraw@${PLUGIN_VER} esbuild
  printf '%s\n' \
    'const m = globalThis.maplibregl;' \
    'export default m;' \
    'export const Map = m?.Map, Marker = m?.Marker, Popup = m?.Popup, LngLat = m?.LngLat, LngLatBounds = m?.LngLatBounds, Point = m?.Point;' > maplibre-shim.mjs
  printf '%s\n' \
    \"export { MaplibreTerradrawControl, MaplibreMeasureControl } from '@watergis/maplibre-gl-terradraw';\" > entry.mjs
  npx esbuild entry.mjs --bundle --format=esm --platform=browser --target=es2020 \
    --alias:maplibre-gl=./maplibre-shim.mjs \
    --loader:.svg=dataurl --loader:.png=dataurl --loader:.css=text \
    --outfile=/out/terra-draw.bundle.js
  cp \$(find node_modules/@watergis/maplibre-gl-terradraw/dist -name '*.css' | head -1) /out/terradraw-control.css
  wget -qO /out/maplibre-gl.js  https://unpkg.com/maplibre-gl@${MAPLIBRE_VER}/dist/maplibre-gl.js
  wget -qO /out/maplibre-gl.css https://unpkg.com/maplibre-gl@${MAPLIBRE_VER}/dist/maplibre-gl.css
  # Glyphs for text layers (measure labels). Style: glyphs=/vendor/fonts/{fontstack}/{range}.pbf
  # Source = Protomaps basemaps-assets (matches the Protomaps planet basemap).
  # NOTE: fonts.openmaptiles.org is DEAD. It returns a 2725-byte HTML page with
  # HTTP 200, so wget silently saved HTML as .pbf and MapLibre flooded
  # "Unimplemented type: 4". Always spot-check a glyph is a real pbf (not "<").
  mkdir -p '/out/fonts/Noto Sans Regular'
  i=0; while [ \$i -le 65535 ]; do
    r=\"\$i-\$((i+255))\"
    wget -qO \"/out/fonts/Noto Sans Regular/\$r.pbf\" \"https://protomaps.github.io/basemaps-assets/fonts/Noto%20Sans%20Regular/\$r.pbf\" || true
    i=\$((i+256))
  done
  ls -la /out
"
echo "vendored. Commit web/vendor/ to keep the offline build current"
