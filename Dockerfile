# Wayfinder — self-contained, offline-capable maps & directions image.
#
# Stage 1 bundles @watergis/maplibre-gl-terradraw (the full Terra Draw toolbar
# used at terradraw.water-gis.com: every draw mode + select/edit + delete +
# download + distance/area measurement) into ONE self-contained ES-module file
# with esbuild, so nothing is fetched from a CDN at runtime (fully offline).
# maplibre-gl is aliased to a shim that re-uses the page's window.maplibregl
# global (already vendored below) instead of inlining a second MapLibre.
FROM node:20-alpine AS bundler
ARG PLUGIN_VER=latest
WORKDIR /b
RUN npm init -y >/dev/null 2>&1 \
 && npm install --no-audit --no-fund --silent \
      @watergis/maplibre-gl-terradraw@${PLUGIN_VER} \
      esbuild
# Shim: satisfy any `import ... from "maplibre-gl"` inside the plugin with the
# page global rather than bundling MapLibre twice.
RUN printf "%s\n" \
  "const m = globalThis.maplibregl;" \
  "export default m;" \
  "export const Map = m?.Map, Marker = m?.Marker, Popup = m?.Popup, LngLat = m?.LngLat, LngLatBounds = m?.LngLatBounds, Point = m?.Point;" > maplibre-shim.mjs \
 && printf "%s\n" \
  "export { MaplibreTerradrawControl, MaplibreMeasureControl } from '@watergis/maplibre-gl-terradraw';" > entry.mjs \
 && npx esbuild entry.mjs --bundle --format=esm --platform=browser --target=es2020 \
      --alias:maplibre-gl=./maplibre-shim.mjs \
      --loader:.svg=dataurl --loader:.png=dataurl --loader:.css=text \
      --outfile=terra-draw.bundle.js \
 && wc -c terra-draw.bundle.js \
 && CSS=$(find node_modules/@watergis/maplibre-gl-terradraw/dist -name "*.css" | head -1) \
 && cp "$CSS" terradraw-control.css \
 && wc -c terradraw-control.css

FROM nginx:alpine
ARG MAPLIBRE_VER=4.7.1
# Vendor MapLibre GL JS + CSS (the browser global used by web/app.js).
RUN apk add --no-cache curl \
 && mkdir -p /usr/share/nginx/html/vendor \
 && curl -fsSL "https://unpkg.com/maplibre-gl@${MAPLIBRE_VER}/dist/maplibre-gl.js"  -o /usr/share/nginx/html/vendor/maplibre-gl.js \
 && curl -fsSL "https://unpkg.com/maplibre-gl@${MAPLIBRE_VER}/dist/maplibre-gl.css" -o /usr/share/nginx/html/vendor/maplibre-gl.css \
 && apk del curl
# The self-contained plugin bundle + its stylesheet from stage 1. NOTE: .js
# extension on purpose — nginx's stock mime.types has no .mjs entry, so a .mjs
# file is served application/octet-stream and the browser's strict module MIME
# check rejects the whole import graph.
COPY --from=bundler /b/terra-draw.bundle.js /usr/share/nginx/html/vendor/terra-draw.bundle.js
COPY --from=bundler /b/terradraw-control.css /usr/share/nginx/html/vendor/terradraw-control.css

COPY web/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1
