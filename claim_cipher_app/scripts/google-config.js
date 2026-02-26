/**
 * 🔒 Security Agent: Google Maps API Configuration
 * SECURE API KEY INTEGRATION
 */

// Security Agent: API Configuration (Production Ready)
window.GOOGLE_MAPS_CONFIG = {
  // Resolved at runtime: set localStorage key "GOOGLE_MAPS_API_KEY", or inject
  // window.ENV_GOOGLE_MAPS_KEY at deploy time (e.g. via a server-rendered snippet).
  apiKey: localStorage.getItem("GOOGLE_MAPS_API_KEY") || window.ENV_GOOGLE_MAPS_KEY || null,
  libraries: ["places", "geometry"],
  version: "weekly",
  services: {
    distanceMatrix: true,
    directions: true,
    geocoding: true,
    places: true,
    maps: true,
  },
  security: {
    cors: true,
    rateLimit: true,
    errorHandling: true,
  },
};

// Security Agent: API Ready Handler
window.onGoogleMapsAPIReady = function () {



  // Initialize applications
  if (typeof initRouteCipher === "function") {
    initRouteCipher();
  }

  if (typeof window.mileageCipher !== "undefined") {
    window.mileageCipher.enableGoogleMapsFeatures();
  }
};

// Security Agent: Error Handler
window.gm_authFailure = function () {
  console.error("🔒 Security Agent: Google Maps authentication failed");
  alert("Google Maps authentication failed. Please check API configuration.");
};
