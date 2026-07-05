// Deployment feature configuration. In the container this file is REGENERATED
// from environment variables at start (see docker-entrypoint.sh). This committed
// copy is the default for `docker run` without env / local dev.
window.WAYFINDER_CONFIG = {
  features: {
    traffic:   false,  // needs a TomTom API key
    poi:       false,  // needs TomTom Search + Overpass
    voice:     false,  // needs a voice/AI stack (TTS/STT/LLM)
    weather:   true,   // NWS (US only), degrades gracefully
    threeD:    true,   // vector buildings + terrarium DEM
    satellite: true,   // raster imagery basemap
    geofence:  true    // self-contained Terra Draw layers
  }
};
