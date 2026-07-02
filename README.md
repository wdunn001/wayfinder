# Wayfinder

Self-hosted, offline-capable **maps, directions, and geofence** tool. A single
static page (vanilla JS + MapLibre GL) served by nginx, with every geo backend
proxied same-origin — no CDN, no public APIs, no CORS.

Live on the lab: `http://192.168.1.88:8442` (Nomad dashboard tile
`nomad_custom_maps_directions`).

## Features

- **Directions** — search (Photon geocoder), click-to-add stops, OSRM routing
  (`route` + `trip` optimize), batch address import, 3D buildings/terrain
  (Martin planet vector `buildings` layer — toggle **3D**, zoom ≥ 13).
- **Geofence layers** — Terra Draw tools (polygon / rectangle / line / point +
  delete), an open-ended set of named layers (color, visibility, rename,
  delete), shapes saved to the active layer.
- **Persistence** — layers auto-save to `localStorage`; per-layer **GeoJSON
  export/import** makes them portable.

Layout and drawing engine (Terra Draw) mirror the mass-zero-fpv fleet map,
minus the drone content.

## Architecture

```
web/
  index.html    tabbed panel (Directions | Geofence layers) + draw toolbar
  app.js        route planner (classic script; exposes window.nomadMap)
  geofence.js   ES module: Terra Draw + layers + persistence + rendering
  style.css
nginx.conf      same-origin proxies: /geocode -> Photon (.88:2322),
                /route -> OSRM (.88:5001), /tiles + /martin -> .198 vhosts
Dockerfile      stage 1: esbuild-bundle terra-draw(+maplibre adapter) into one
                self-contained ESM file; stage 2: nginx + vendored MapLibre
```

Build-time internet only (vendoring); runtime is fully offline.

## Build & run

```bash
docker build -t wayfinder .
docker run -d --name nomad_custom_maps_directions --restart unless-stopped -p 8442:80 wayfinder
```

## CI/CD

`.forgejo/workflows/deploy.yml` — push to `main` on Forgejo (`:8530`) builds the
image, pushes it to the registry, and redeploys the `:8442` container. The
runner lives on `.88`, so build + deploy are local (no SSH).
