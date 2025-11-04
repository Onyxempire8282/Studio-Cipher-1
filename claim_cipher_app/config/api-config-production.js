/**
 * 🔐 Production API Configuration for Multi-User Deployment
 * This handles API keys securely for public deployment
 */

// Multi-user API configuration
window.MILEAGE_CYPHER_CONFIG = {
  // Multi-user API key strategy
  GOOGLE_MAPS_API_KEY: (() => {
    // 0. Local development key from google-config.js (highest priority)
    if (
      window.GOOGLE_MAPS_CONFIG?.apiKey &&
      window.GOOGLE_MAPS_CONFIG.apiKey !==
        "YOUR_ACTUAL_GOOGLE_MAPS_API_KEY_HERE"
    ) {
      return window.GOOGLE_MAPS_CONFIG.apiKey;
    }

    // 1. GitHub Pages with domain restrictions (recommended for public deployment)
    if (window.location.hostname.includes("github.io")) {
      // This key should be domain-restricted to your GitHub Pages URL
      return window.GITHUB_PAGES_API_KEY || null;
    }

    // 2. User-provided API key (let users bring their own)
    const userKey = localStorage.getItem("user_google_maps_api_key");
    if (userKey && userKey !== "YOUR_API_KEY_HERE") {
      return userKey;
    }

    // 3. Demo mode key (highly restricted, for demo purposes only)
    const demoKey = sessionStorage.getItem("demo_api_key");
    if (demoKey) {
      return demoKey;
    }

    // 4. No key available - prompt user
    return null;
  })(),

  // API Configuration
  GOOGLE_MAPS_LIBRARIES: ["places", "geometry"],

  // Security settings for production
  API_DOMAIN_RESTRICTIONS: [
    "onyxempire8282.github.io",
    "studio-cipher-1.github.io",
    "claimcipher.com", // If you get a custom domain
    "localhost",
    "127.0.0.1",
  ],

  // Feature flags
  FEATURES: {
    AUTO_DISTANCE_CALCULATION: true,
    ROUTE_IMPORT: true,
    TOAST_NOTIFICATIONS: true,
    CALCULATION_HISTORY: true,
    USER_API_KEY_INPUT: true, // Allow users to input their own keys
    DEMO_MODE: true, // Enable demo mode with limited features
  },
};

// API Key Management for Multi-User
window.ClaimCipherAPI = {
  // Check if API key is available
  hasValidApiKey() {
    return !!window.MILEAGE_CYPHER_CONFIG.GOOGLE_MAPS_API_KEY;
  },

  // Prompt user to enter their own API key (DISABLED FOR DEVELOPMENT)
  promptUserForApiKey() {
    // API key prompt disabled - use google-config.js instead
    console.log("🔒 API key prompt disabled - configure in google-config.js");
    return false;
  },

  // Initialize Google Maps with current key
  initializeGoogleMaps() {
    const config = window.MILEAGE_CYPHER_CONFIG;

    if (!config.GOOGLE_MAPS_API_KEY) {
      console.warn("No Google Maps API key configured");
      return false;
    }

    // Build Google Maps API URL
    const libraries = config.GOOGLE_MAPS_LIBRARIES.join(",");
    let apiUrl = `https://maps.googleapis.com/maps/api/js?key=${config.GOOGLE_MAPS_API_KEY}&libraries=${libraries}`;

    // Add callback if needed
    if (window.location.pathname.includes("route-cypher.html")) {
      apiUrl += "&callback=initRouteOptimizer";
    }

    // Remove existing Google Maps script if any
    const existingScript = document.getElementById("google-maps-api");
    if (existingScript) {
      existingScript.remove();
    }

    // Create and load new script
    const script = document.createElement("script");
    script.src = apiUrl;
    script.async = true;
    script.defer = true;
    script.id = "google-maps-api";

    script.onload = function () {
      console.log("🗺️ Google Maps API loaded successfully");
      // Update calculator settings if available
      if (window.mileageCalculator) {
        window.mileageCalculator.settings.googleMapsApiKey =
          config.GOOGLE_MAPS_API_KEY;
      }
    };

    script.onerror = function () {
      console.error("🗺️ Failed to load Google Maps API - invalid key?");
      localStorage.removeItem("user_google_maps_api_key");
      alert(
        "Google Maps API key appears to be invalid. Please check your key."
      );
    };

    document.head.appendChild(script);
    return true;
  },
};

// Auto-initialize when page loads (DISABLED FOR DEVELOPMENT)
document.addEventListener("DOMContentLoaded", function () {
  // API key prompt disabled during development
  // Configure Google Maps API key in scripts/google-config.js instead
  console.log("🔐 Production API Configuration loaded - prompt disabled");

  // Maps initialization is handled by google-config.js
  return;

  // Check if maps are disabled
  if (localStorage.getItem("disable_maps") === "true") {
    console.log("🗺️ Maps disabled by user preference");
    return;
  }

  // Try to initialize maps
  if (!window.ClaimCipherAPI.hasValidApiKey()) {
    // Delay prompt to let page load
    setTimeout(() => {
      window.ClaimCipherAPI.promptUserForApiKey();
    }, 2000);
  } else {
    window.ClaimCipherAPI.initializeGoogleMaps();
  }
});

console.log("🔐 Production API Configuration loaded");
