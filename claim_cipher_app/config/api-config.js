/**
 * 🔐 API Configuration Template - Copy to api-config.js and add your keys
 * 
 * SECURITY INSTRUCTIONS:
 * 1. Copy this file to 'api-config.js' 
 * 2. Replace 'YOUR_API_KEY_HERE' with your actual Google Maps API key
 * 3. NEVER commit api-config.js - it's in .gitignore
 * 4. For GitHub Pages, use environment variables or GitHub Secrets
 */

// Configuration object
window.MILEAGE_CYPHER_CONFIG = {
    // Google Maps API Key - Replace with your actual key
    GOOGLE_MAPS_API_KEY: 'AIzaSyByoixnma2_cQFwCR5Tqn3YGNy20qeStF4',
    
    // API Configuration
    GOOGLE_MAPS_LIBRARIES: ['places', 'geometry'],
    
    // Security settings
    API_DOMAIN_RESTRICTIONS: [
        // Add your domains here for production
        'your-domain.github.io',
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
    
    if (config.GOOGLE_MAPS_API_KEY && config.GOOGLE_MAPS_API_KEY !== 'YOUR_API_KEY_HERE') {
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
            console.log('🗺️ Google Maps API loaded successfully');
            console.log('🗺️ Google object available:', typeof google !== 'undefined');
            
            // Update mileage calculator settings if it exists
            if (window.mileageCalculator) {
                window.mileageCalculator.settings.googleMapsApiKey = config.GOOGLE_MAPS_API_KEY;
                console.log('🗺️ API key updated in calculator settings');
            }
            
            // Initialize route optimizer if we're on route cipher page and callback wasn't used
            if ((window.location.pathname.includes('route-cypher.html') || window.location.pathname.includes('route-cipher.html')) 
                && typeof initRouteOptimizer === 'function' 
                && !apiUrl.includes('callback=')) {
                console.log('🗺️ Manually initializing Route Optimizer');
                initRouteOptimizer();
            }
        };
        
        script.onerror = function() {
            console.error('🗺️ Failed to load Google Maps API');
        };
        
        document.head.appendChild(script);
        
        console.log('🗺️ Google Maps API loading...');
    } else {
        console.warn('🗺️ Google Maps API key not configured - distance auto-calculation disabled');
    }
})();

console.log('🔐 API Configuration loaded');