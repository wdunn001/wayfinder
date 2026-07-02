#!/usr/bin/env bash
# =============================================================================
# scripts/build-vendor.sh — regenerate the vendored frontend dependencies in
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
  ls -la /out
"
echo "vendored — commit web/vendor/ to keep the offline build current"
