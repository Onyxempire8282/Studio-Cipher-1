/**
 * 🔐 Secure API Configuration for GitHub Pages
 * This file uses environment variables and is safe for public repositories
 */

// Configuration object with secure defaults
window.MILEAGE_CYPHER_CONFIG = {
    // Google Maps API Key - Uses environment variable or falls back to development
    GOOGLE_MAPS_API_KEY: (() => {
        // Try to get from various environment sources
        if (typeof process !== 'undefined' && process.env && process.env.GOOGLE_MAPS_API_KEY) {
            return process.env.GOOGLE_MAPS_API_KEY;
        }
        
        // GitHub Pages environment variable (set via GitHub Secrets)
        if (typeof window !== 'undefined' && window.GITHUB_ENV_GOOGLE_MAPS_API_KEY) {
            return window.GITHUB_ENV_GOOGLE_MAPS_API_KEY;
        }
        
        // Local development fallback - must be set manually
        const localKey = localStorage.getItem('google_maps_api_key');
        if (localKey && localKey !== 'YOUR_API_KEY_HERE') {
            return localKey;
        }
        
        // No key available
        return null;
    })(),
    
    // API Configuration
    GOOGLE_MAPS_LIBRARIES: ['places', 'geometry'],
    
    // Security settings
    API_DOMAIN_RESTRICTIONS: [
        'onyxempire8282.github.io',
        'localhost',
        '127.0.0.1'
    ],
    
    // Feature flags
    FEATURES: {
        AUTO_DISTANCE_CALCULATION: true,
        ROUTE_IMPORT: true,
        TOAST_NOTIFICATIONS: true,
        CALCULATION_HISTORY: true
    }
};

// Auto-load Google Maps API if key is configured
(function initializeGoogleMapsAPI() {
    const config = window.MILEAGE_CYPHER_CONFIG;
    
    if (config.GOOGLE_MAPS_API_KEY) {
        // Build Google Maps API URL with callback for route optimizer
        const libraries = config.GOOGLE_MAPS_LIBRARIES.join(',');
        let apiUrl = `https://maps.googleapis.com/maps/api/js?key=${config.GOOGLE_MAPS_API_KEY}&libraries=${libraries}`;
        
        // Add callback if we're on the route cipher page
        if (window.location.pathname.includes('route-cypher.html') || window.location.pathname.includes('route-cipher.html')) {
            apiUrl += '&callback=initRouteOptimizer';
        }
        
        // Create and load script
        const script = document.createElement('script');
        script.src = apiUrl;
        script.async = true;
        script.defer = true;
        script.id = 'google-maps-api';
        
        script.onload = function() {
            console.log('Google Maps API loaded successfully');
            console.log('Google object available:', typeof google !== 'undefined');
            
            // Update mileage calculator settings if it exists
            if (window.mileageCalculator) {
                window.mileageCalculator.settings.googleMapsApiKey = config.GOOGLE_MAPS_API_KEY;
                console.log('API key updated in calculator settings');
            }
            
            // Initialize route optimizer if we're on route cipher page and callback wasn't used
            if ((window.location.pathname.includes('route-cypher.html') || window.location.pathname.includes('route-cipher.html')) 
                && typeof initRouteOptimizer === 'function' 
                && !apiUrl.includes('callback=')) {
                console.log('Manually initializing Route Optimizer');
                initRouteOptimizer();
            }
        };
        
        script.onerror = function() {
            console.error('Failed to load Google Maps API - check your API key');
        };
        
        document.head.appendChild(script);
        
        console.log('Google Maps API loading...');
    } else {
        console.warn('Google Maps API key not configured - distance auto-calculation disabled');
        console.log('For local development, set your API key with:');
        console.log('localStorage.setItem("google_maps_api_key", "YOUR_ACTUAL_KEY");');
    }
})();

console.log('Secure API Configuration loaded');