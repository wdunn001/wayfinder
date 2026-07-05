# Wayfinder — fully OFFLINE build. Every dependency is vendored in source
# (web/vendor/: maplibre-gl.js/.css, terra-draw.bundle.js, terradraw-control.css),
# so this build needs NO internet — only the base image. To pull the base from a
# private mirror registry instead of Docker Hub, override BASE_IMAGE, e.g.:
#   docker build --build-arg BASE_IMAGE=registry.example.com/mirror/nginx:1.27-alpine .
# To regenerate the vendored artifacts (version bumps), run scripts/build-vendor.sh
# on a box with internet and commit the result.
ARG BASE_IMAGE=nginx:1.27-alpine
FROM ${BASE_IMAGE}

COPY web/ /usr/share/nginx/html/
# nginx.conf is an envsubst template: the base image's entrypoint renders it to
# conf.d/default.conf at startup, substituting every ${VAR} that is defined in
# the environment (the *_UPSTREAM backend hosts, the TomTom key/referer, the NWS
# contact) — so no backend host or key is ever baked into the image or shipped
# to the browser. See .env.example for the full list.
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Defaults for every env var the template references, so the image BOOTS with no
# --env-file (envsubst always has a value to substitute → no literal ${...} left,
# and nginx config is syntactically valid). Upstreams default to loopback so
# nginx starts without DNS-blocking and the backend routes simply return 502
# until you point them at real services via --env-file (see .env.example). The
# static SPA + geofence layers work out of the box regardless.
ENV TOMTOM_API_KEY="" \
    TOMTOM_REFERER="" \
    NWS_USER_AGENT="wayfinder (set-your-contact@example.com)" \
    TILES_UPSTREAM="127.0.0.1:8080" \
    MARTIN_UPSTREAM="127.0.0.1:8080" \
    NOMINATIM_UPSTREAM="127.0.0.1:8080" \
    PHOTON_UPSTREAM="127.0.0.1:8080" \
    OSRM_UPSTREAM="127.0.0.1:8080" \
    OVERPASS_UPSTREAM="127.0.0.1:8080" \
    TTS_UPSTREAM="127.0.0.1:8080" \
    STT_UPSTREAM="127.0.0.1:8080" \
    LLM_UPSTREAM="127.0.0.1:8080"

# Feature gating: regenerate web/config.js from WAYFINDER_* env vars at start.
# Installed as an nginx entrypoint.d HOOK (not a replacement ENTRYPOINT) so the
# base image's own entrypoint still runs its envsubst template step above — the
# nginx.conf ${TOMTOM_API_KEY} render must keep working. The `40-` prefix orders
# it after nginx's built-in `20-envsubst-on-templates.sh`, before nginx starts.
COPY docker-entrypoint.sh /docker-entrypoint.d/40-wayfinder-config.sh
RUN chmod +x /docker-entrypoint.d/40-wayfinder-config.sh

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1
