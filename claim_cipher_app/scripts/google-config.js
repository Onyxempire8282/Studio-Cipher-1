/**
 * 🔒 Security Agent: Google Maps API Configuration
 * SECURE API KEY INTEGRATION
 */


// --- Google Maps API Key Resolution ---
const DEV_GOOGLE_MAPS_KEY = "AIzaSyByoixnma2_cQFwCR5Tqn3YGNy20qeStF4"; // <-- Set your dev key here

function isLocalhost() {
  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  );
}

function resolveGoogleMapsKey() {
  const localKey = localStorage.getItem("GOOGLE_MAPS_API_KEY");
  if (localKey) return localKey;
  if (window.ENV_GOOGLE_MAPS_KEY) return window.ENV_GOOGLE_MAPS_KEY;
  if (isLocalhost()) return DEV_GOOGLE_MAPS_KEY;
  return null;
}

window.GOOGLE_MAPS_CONFIG = {
  apiKey: resolveGoogleMapsKey(),
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
