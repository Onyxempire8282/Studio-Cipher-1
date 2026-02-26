/**
 * 🔒 Security Agent: Google Maps API Configuration Template
 * INSTRUCTIONS:
 * 1. Copy this file and rename it to: google-config.js
 * 2. Replace 'YOUR_ACTUAL_GOOGLE_MAPS_API_KEY_HERE' with your real API key
 * 3. The google-config.js file is in .gitignore and won't be committed to GitHub
 *
 * Get your API key from: https://console.cloud.google.com/google/maps-apis/
 */

// Security Agent: API Configuration (Production Ready)
window.GOOGLE_MAPS_CONFIG = {
  // Replace with your actual Google Maps API key
  apiKey: "YOUR_ACTUAL_GOOGLE_MAPS_API_KEY_HERE",
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
