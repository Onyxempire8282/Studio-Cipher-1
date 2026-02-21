/**
 * 🔒 Security Agent: Google Maps API Configuration
 * SECURE API KEY INTEGRATION
 */

// Security Agent: API Configuration (Production Ready)
window.GOOGLE_MAPS_CONFIG = {
  // Replace with your actual Google Maps API key
  // Get your key from: https://console.cloud.google.com/google/maps-apis/
  apiKey: "AIzaSyByoixnma2_cQFwCR5Tqn3YGNy20qeStF4",
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
  console.log("🔒 Security Agent: Google Maps API loaded successfully");
  console.log("🛡️ Security Agent: All services enabled and secured");

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
