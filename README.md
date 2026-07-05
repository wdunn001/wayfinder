# Wayfinder

Self-hosted, offline-capable **maps, directions, and geofencing** in a single
static page. Vanilla JS + [MapLibre GL](https://maplibre.org/), served by nginx,
with every geo backend proxied **same-origin** — so there's no CDN, no third-party
JavaScript, no CORS, and (once your backends are local) no dependency on the
public internet. Point it at your own geo stack and you have a private Google
Maps alternative you fully control.

## What it does

- **Directions** — address search (Nominatim → Photon fallback), click-to-add
  stops, OSRM routing (`route` + `trip` optimize), batch address import, and
  optional 3D buildings/terrain (toggle **3D**, zoom ≥ 13).
- **Geofence layers** — Terra Draw tools (polygon / rectangle / line / point +
  delete), an open-ended set of named layers (color, visibility, rename,
  delete). No backend — everything lives in `localStorage`.
- **Persistence** — layers auto-save locally; per-layer **GeoJSON export/import**
  makes them portable.
- **Optional extras** — live traffic + traffic-aware ETA, POI ("find places")
  search, US weather alerts, satellite imagery, and voice search / spoken
  guidance. Each is a feature flag you turn on only if you run its backend.

Build-time internet is used only to vendor the JS libraries; the vendored
artifacts are committed, so the **runtime is fully offline** and the Docker build
needs nothing but the base image.

## The geo stack it proxies

Wayfinder itself is just the nginx + static frontend. To get more than an empty
map you point it at backend services you host (or reach). All are proxied
same-origin, so the browser only ever talks to Wayfinder's own origin:

| Route              | Backend service                          | Powers                         |
| ------------------ | ---------------------------------------- | ------------------------------ |
| `/tiles/`          | A raster tile server / cache             | Street + satellite basemaps    |
| `/martin/`         | [Martin](https://martin.maplibre.org/) vector tiles | 3D buildings (height data)     |
| `/nominatim/`      | [Nominatim](https://nominatim.org/) geocoder | Address search (primary)       |
| `/geocode/`        | [Photon](https://photon.komoot.io/) geocoder | Address search (fallback)      |
| `/route/`          | [OSRM](https://project-osrm.org/) routing | Directions                     |
| `/overpass`        | [Overpass API](https://overpass-api.de/) | POI search (optional)          |
| `/tts` `/stt` `/llm` | TTS + Whisper STT + an Ollama-compatible LLM | Voice search (optional)   |

Two upstreams reach the public internet directly (behind nginx's lazy-DNS
resolver, so the server still boots offline): **TomTom** (traffic + POI
fallback, needs a free API key) and the **AWS/Mapzen terrarium DEM** (3D
terrain, no key). US **weather alerts** come from `api.weather.gov`.

None of these are bundled — bring your own. Good starting points are the
Docker images for Nominatim, Photon, OSRM, Martin, and Overpass; a small OSM
extract is enough to try it out.

## Quickstart

```bash
# 1. Configure — copy the example and fill in your backend host:port values
cp .env.example .env
$EDITOR .env

# 2. Build (offline; only pulls the nginx base image)
docker build -t wayfinder .

# 3. Run
docker run -d --name wayfinder -p 8442:80 --env-file .env wayfinder
```

Open <http://localhost:8442>. With no `.env` at all the container still boots and
serves the map shell + geofence layers; the backend-backed features just return
502 until you configure their upstreams.

> **HTTPS note:** browsers only grant geolocation (the "locate me" / follow
> button) on a secure origin — `https://` or `http://localhost`. Behind a
> reverse proxy, terminate TLS in front of Wayfinder.

## Configuration

All runtime configuration is via environment variables — see **[`.env.example`](.env.example)**
for the full, commented list. There are two groups:

- **`*_UPSTREAM`** — the `host:port` of each backend nginx proxies to (e.g.
  `OSRM_UPSTREAM`, `TILES_UPSTREAM`). Use an `IP:port` rather than a DNS name so
  nginx never blocks on DNS at startup. `TOMTOM_API_KEY`, `TOMTOM_REFERER`, and
  `NWS_USER_AGENT` configure the internet-facing upstreams. `nginx.conf` is an
  envsubst template; these values are substituted in at container start and are
  never baked into the image or exposed to the browser.

- **`WAYFINDER_*` feature flags** — turn optional features on/off. At startup the
  entrypoint regenerates `web/config.js` from them, and the frontend removes the
  UI for any disabled feature so it never calls a backend you don't run. Truthy
  values are `true` / `1` / `on` / `yes` (case-insensitive); anything else is
  false; unset uses the default below.

  | Env var               | Feature                         | Default | Needs                                   |
  | --------------------- | ------------------------------- | :-----: | --------------------------------------- |
  | `WAYFINDER_TRAFFIC`   | Live traffic overlay + ETA      | `false` | `TOMTOM_API_KEY`                        |
  | `WAYFINDER_POI`       | Find places                     | `false` | Overpass and/or TomTom                  |
  | `WAYFINDER_VOICE`     | Voice search + spoken guidance  | `false` | TTS / STT / LLM upstreams               |
  | `WAYFINDER_WEATHER`   | NWS weather alerts + conditions | `true`  | `NWS_USER_AGENT` (US only)              |
  | `WAYFINDER_3D`        | 3D buildings + terrain          | `true`  | Martin vector tiles + terrarium DEM     |
  | `WAYFINDER_SATELLITE` | Satellite imagery basemap       | `true`  | raster tiles                            |
  | `WAYFINDER_GEOFENCE`  | Terra Draw geofence layers      | `true`  | nothing (self-contained)                |

```bash
# Example: a deployer with a TomTom key but no voice stack
docker run -d -p 8442:80 --env-file .env \
  -e WAYFINDER_TRAFFIC=true -e WAYFINDER_POI=true -e WAYFINDER_VOICE=false \
  wayfinder
```

The committed `web/config.js` holds the same feature defaults, so a plain
`docker run` (or serving `web/` with `python3 -m http.server` for frontend dev)
behaves identically. `config.js` holds only booleans — no secrets.

## Layout

```
web/
  index.html    tabbed panel (Directions | Geofence layers) + draw toolbar
  app.js        route planner (classic script; exposes window.nomadMap)
  geofence.js   ES module: Terra Draw + layers + persistence + rendering
  config.js     feature flags (regenerated from env at container start)
  style.css
  vendor/       committed MapLibre + Terra Draw bundles (offline build)
nginx.conf      envsubst template: same-origin proxies to every backend above
Dockerfile      nginx + vendored frontend; renders nginx.conf + config.js at start
scripts/
  build-vendor.sh   regenerate web/vendor/* (run on a box with internet)
```

To regenerate the vendored JS after a version bump, run `scripts/build-vendor.sh`
on a machine with internet and commit the result.

## CI

`.github/workflows/build.yml` builds the Docker image and smoke-tests that it
boots and serves the SPA on every push / PR (build only — no deploy).

## License

_No license file is committed yet — add one (e.g. MIT) before publishing if you
want to grant reuse rights._
