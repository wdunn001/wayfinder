#!/bin/sh
# Regenerate web/config.js from WAYFINDER_* env vars at container start so a
# deployer can turn same-origin backend features on/off without rebuilding.
#
# Installed as an nginx entrypoint.d hook (/docker-entrypoint.d/40-wayfinder-
# config.sh). The nginx base image's own entrypoint runs every *.sh in that
# dir BEFORE starting nginx and AFTER its envsubst template step — so this
# preserves the existing nginx.conf template rendering (TOMTOM_API_KEY). When
# invoked as a hook there are no args, so it just writes config.js and returns;
# if invoked directly with a command it execs it (works as a full entrypoint too).
set -eu

CONFIG_OUT="${WAYFINDER_CONFIG_OUT:-/usr/share/nginx/html/config.js}"

# $1 = env value ("" or unset -> use default), $2 = committed default (true/false).
# Truthy values true/1/on/yes (any case) -> true; any other non-empty value -> false.
flag() {
  _val="$1"; _def="$2"
  if [ -z "$_val" ]; then printf '%s' "$_def"; return 0; fi
  case "$(printf '%s' "$_val" | tr '[:upper:]' '[:lower:]')" in
    true|1|on|yes) printf 'true' ;;
    *)             printf 'false' ;;
  esac
}

TRAFFIC=$(flag "${WAYFINDER_TRAFFIC:-}"   false)  # needs a TomTom API key
POI=$(flag       "${WAYFINDER_POI:-}"     false)  # needs TomTom Search + Overpass
VOICE=$(flag     "${WAYFINDER_VOICE:-}"   false)  # needs a voice/AI stack (TTS/STT/LLM)
WEATHER=$(flag   "${WAYFINDER_WEATHER:-}" true)   # NWS (US only), degrades gracefully
THREED=$(flag    "${WAYFINDER_3D:-}"      true)   # vector buildings + terrarium DEM
SATELLITE=$(flag "${WAYFINDER_SATELLITE:-}" true) # raster imagery basemap
GEOFENCE=$(flag  "${WAYFINDER_GEOFENCE:-}" true)  # self-contained Terra Draw layers

cat > "$CONFIG_OUT" <<EOF
// Generated at container start from WAYFINDER_* env vars (docker-entrypoint.sh).
window.WAYFINDER_CONFIG = {
  features: {
    traffic:   $TRAFFIC,
    poi:       $POI,
    voice:     $VOICE,
    weather:   $WEATHER,
    threeD:    $THREED,
    satellite: $SATELLITE,
    geofence:  $GEOFENCE
  }
};
EOF

# Full-entrypoint mode: run whatever command was passed. As an nginx hook there
# are no args, so this is skipped and nginx's own entrypoint execs the CMD.
if [ "$#" -gt 0 ]; then exec "$@"; fi
