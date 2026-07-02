# Wayfinder — self-contained, offline-capable maps & directions image.
#
# Stage 1 bundles Terra Draw (the same drawing engine mass-zero-fpv uses) + its
# MapLibre GL adapter into ONE self-contained ES-module file with esbuild, so
# nothing is fetched from a CDN at runtime (fully offline). Stage 2 is nginx.
FROM node:20-alpine AS bundler
ARG TERRADRAW_VER=1.29.0
ARG TERRADRAW_ADAPTER_VER=1.3.0
ARG MAPLIBRE_VER=4.7.1
WORKDIR /b
RUN npm init -y >/dev/null 2>&1 \
 && npm install --no-audit --no-fund --silent \
      terra-draw@${TERRADRAW_VER} \
      terra-draw-maplibre-gl-adapter@${TERRADRAW_ADAPTER_VER} \
      maplibre-gl@${MAPLIBRE_VER} \
      esbuild
# One entry re-exporting exactly what web/geofence.js imports; esbuild inlines
# all deps (incl. maplibre-gl, used only via the map instance) into terra-draw.mjs.
RUN printf "%s\n" \
  "export { TerraDraw, TerraDrawPolygonMode, TerraDrawRectangleMode, TerraDrawLineStringMode, TerraDrawPointMode, TerraDrawRenderMode } from 'terra-draw';" \
  "export { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter';" > entry.mjs \
 && npx esbuild entry.mjs --bundle --format=esm --platform=browser --target=es2020 --outfile=terra-draw.bundle.js \
 && wc -c terra-draw.bundle.js

FROM nginx:alpine
ARG MAPLIBRE_VER=4.7.1
# Vendor MapLibre GL JS + CSS (the browser global used by web/app.js).
RUN apk add --no-cache curl \
 && mkdir -p /usr/share/nginx/html/vendor \
 && curl -fsSL "https://unpkg.com/maplibre-gl@${MAPLIBRE_VER}/dist/maplibre-gl.js"  -o /usr/share/nginx/html/vendor/maplibre-gl.js \
 && curl -fsSL "https://unpkg.com/maplibre-gl@${MAPLIBRE_VER}/dist/maplibre-gl.css" -o /usr/share/nginx/html/vendor/maplibre-gl.css \
 && apk del curl
# The self-contained Terra Draw bundle from stage 1. NOTE: .js extension on
# purpose — nginx's stock mime.types has no .mjs entry, so a .mjs file is
# served as application/octet-stream and the browser's strict module MIME
# check rejects the whole import graph ("Failed to fetch dynamically imported
# module"). ES modules import fine from any extension as long as the MIME is JS.
COPY --from=bundler /b/terra-draw.bundle.js /usr/share/nginx/html/vendor/terra-draw.bundle.js

COPY web/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1
