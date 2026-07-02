# Nomad Maps & Directions — self-contained, offline-capable image.
# Vendors MapLibre GL at build time so nothing is fetched from a CDN at runtime.
FROM nginx:alpine

ARG MAPLIBRE_VER=4.7.1
# Terra Draw (same drawing engine mass-zero-fpv uses) + its MapLibre GL adapter.
# Pulled as self-contained ES-module bundles so nothing is fetched at runtime.
ARG TERRADRAW_VER=1.29.0
ARG TERRADRAW_ADAPTER_VER=1.3.0

# Vendor MapLibre GL JS + CSS and Terra Draw locally (build host needs internet;
# runtime does not — this stays a fully offline-capable image).
RUN apk add --no-cache curl \
 && mkdir -p /usr/share/nginx/html/vendor \
 && curl -fsSL "https://unpkg.com/maplibre-gl@${MAPLIBRE_VER}/dist/maplibre-gl.js"  -o /usr/share/nginx/html/vendor/maplibre-gl.js \
 && curl -fsSL "https://unpkg.com/maplibre-gl@${MAPLIBRE_VER}/dist/maplibre-gl.css" -o /usr/share/nginx/html/vendor/maplibre-gl.css \
 && curl -fsSL "https://esm.sh/terra-draw@${TERRADRAW_VER}?bundle&target=es2020" -o /usr/share/nginx/html/vendor/terra-draw.mjs \
 && curl -fsSL "https://esm.sh/terra-draw-maplibre-gl-adapter@${TERRADRAW_ADAPTER_VER}?bundle&target=es2020" -o /usr/share/nginx/html/vendor/terra-draw-adapter.mjs \
 && apk del curl

COPY web/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1
