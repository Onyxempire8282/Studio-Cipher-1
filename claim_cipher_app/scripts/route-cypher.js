// 🗺️ Route Cypher JavaScript - Optimize those routes like a pro!

let selectedJobs = [];
let optimizedRoute = null;

function initializeRouteCypher() {

    
    setupJobSelection();
    setupRouteOptimization();
    
    showCipherNotification('Route Cypher ready to optimize!', 'success');
}

function setupJobSelection() {
    const checkboxes = document.querySelectorAll('#job-selection input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateSelectedJobs);
    });
}

function updateSelectedJobs() {
    const checkboxes = document.querySelectorAll('#job-selection input[type="checkbox"]:checked');
    selectedJobs = Array.from(checkboxes).map(cb => ({
        id: cb.dataset.jobId,
        address: cb.dataset.address,
        claimNumber: cb.closest('.job-cipher-item').querySelector('h4').textContent
    }));
    
    const optimizeBtn = document.getElementById('optimize-route-btn');
    if (optimizeBtn) {
        optimizeBtn.disabled = selectedJobs.length < 2;
        optimizeBtn.textContent = selectedJobs.length < 2 
            ? 'Select at least 2 jobs' 
            : `⚡ Optimize ${selectedJobs.length} stops`;
    }
    

}

function setupRouteOptimization() {
    const optimizeBtn = document.getElementById('optimize-route-btn');
    if (optimizeBtn) {
        optimizeBtn.addEventListener('click', optimizeRoute);
    }
}

function optimizeRoute() {
    if (selectedJobs.length < 2) {
        showCipherNotification('Select at least 2 jobs to optimize route', 'warning');
        return;
    }
    
    showCipherNotification('Optimizing route...', 'info');
    
    // Simulate route optimization (in real app, would call Google Maps API)
    setTimeout(() => {
        const optimized = simulateRouteOptimization(selectedJobs);
        displayOptimizedRoute(optimized);
        showCipherNotification('Route optimized successfully!', 'success');
    }, 1500);
}

function simulateRouteOptimization(jobs) {
    // Simple simulation - in real app would use Google Maps API
    const shuffled = [...jobs].sort(() => Math.random() - 0.5);
    const totalDistance = Math.floor(Math.random() * 50) + 20;
    const totalTime = (totalDistance / 25) + (jobs.length * 0.5); // Rough estimate
    
    return {
        jobs: shuffled,
        totalDistance,
        totalTime: Math.round(totalTime * 10) / 10,
        totalStops: jobs.length,
        estimatedSavings: Math.floor(Math.random() * 30) + 10
    };
}

function displayOptimizedRoute(route) {
    optimizedRoute = route;
    
    // Update stats
    document.getElementById('total-distance').textContent = `${route.totalDistance} miles`;
    document.getElementById('total-time').textContent = `${route.totalTime} hours`;
    document.getElementById('total-stops').textContent = `${route.totalStops} stops`;
    
    // Show route list
    const routeList = document.getElementById('optimized-route-list');
    const placeholder = document.getElementById('route-cipher-placeholder');
    const results = document.getElementById('route-cipher-results');
    
    if (routeList && placeholder && results) {
        routeList.innerHTML = route.jobs.map((job, index) => `
            <div class="route-cipher-stop">
                <div class="route-stop-number">${index + 1}</div>
                <div class="route-stop-info">
                    <h4>${job.claimNumber}</h4>
                    <p>${job.address}</p>
                </div>
                <div class="route-stop-actions">
                    <button class="cipher-btn cipher-btn--outline cipher-btn--xs">📍 Navigate</button>
                </div>
            </div>
        `).join('');
        
        placeholder.style.display = 'none';
        results.style.display = 'block';
    }
    
    // Animate the stats
    setTimeout(() => {
        animateCipherNumber(document.querySelector('#total-distance').parentNode.querySelector('.stat-cipher-value'), route.totalDistance);
        animateCipherNumber(document.querySelector('#total-time').parentNode.querySelector('.stat-cipher-value'), route.totalTime);
        animateCipherNumber(document.querySelector('#total-stops').parentNode.querySelector('.stat-cipher-value'), route.totalStops);
    }, 100);
}

function exportRoute() {
    if (!optimizedRoute) {
        showCipherNotification('No route to export', 'warning');
        return;
    }
    
    const routeData = {
        date: new Date().toISOString(),
        totalDistance: optimizedRoute.totalDistance,
        totalTime: optimizedRoute.totalTime,
        stops: optimizedRoute.jobs
    };
    
    const blob = new Blob([JSON.stringify(routeData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cipher-route-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    showCipherNotification('Route exported successfully!', 'success');
}

// Export functions
window.initializeRouteCypher = initializeRouteCypher;
window.exportRoute = exportRoute;

