# Wayfinder — fully OFFLINE build. Every dependency is vendored in source
# (web/vendor/: maplibre-gl.js/.css, terra-draw.bundle.js, terradraw-control.css),
# so this build needs NO internet — only the base image, which can come from
# the local mirror registry (homelab convention):
#   docker build --build-arg BASE_IMAGE=192.168.1.88:8530/mirror/nginx:alpine .
# To regenerate the vendored artifacts (version bumps), run scripts/build-vendor.sh
# on a box with internet and commit the result.
ARG BASE_IMAGE=nginx:alpine
FROM ${BASE_IMAGE}

COPY web/ /usr/share/nginx/html/
# nginx.conf is an envsubst template: the entrypoint renders it to
# conf.d/default.conf at startup, substituting ${TOMTOM_API_KEY} (and only
# defined env vars) — that's how the traffic proxy gets its key without the
# key ever being baked into the image or shipped to the browser.
COPY nginx.conf /etc/nginx/templates/default.conf.template
ENV TOMTOM_API_KEY=""

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1
