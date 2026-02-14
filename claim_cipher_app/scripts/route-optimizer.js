/**
 * Route Optimizer - Claim Cipher
 * Full-featured route optimization with day splitting
 */

class RouteOptimizer {
  // Geographic clustering configuration
  static CLUSTERING_CONFIG = {
    CLUSTER_RADIUS_MILES: 27.5,        // Stops within this distance are clustered
    SOFT_CAP_OVERAGE_PERCENT: 0.20,    // Allow 20% overage for cluster integrity
    SOFT_CAP_OVERAGE_ABSOLUTE: 30,     // Or 30 miles absolute (whichever is smaller)
    SAME_CITY_DISTANCE_ESTIMATE: 12,   // Fallback for same-city stops
    NEARBY_REGION_DISTANCE_ESTIMATE: 35 // Fallback for nearby regions
  };

  constructor() {
    this.map = null;
    this.directionsService = null;
    this.directionsRenderer = null;
    this.geocoder = null;
    this.currentRoute = null;
    this.routeStops = [];

    // Clustering state
    this._distanceCache = new Map();           // Deterministic distance caching
    this.clusterOverrideDecisions = new Map(); // User override choices (in-memory)
    this.editingDayIndex = null;               // Track which day is being edited
    this.editingRouteId = null;                // Track route being edited from My Routes
    this.editingRouteDate = null;              // Original date of route being edited

    this.firmColors = {
      'State Farm': '#cc0000',
      'Allstate': '#003da5',
      'Progressive': '#0070ba',
      'Geico': '#006699',
      'Liberty Mutual': '#fdb913',
      'Farmers': '#00a3e0',
      'USAA': '#003087',
      'default': '#666666'
    };

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadSettings();
    this.initializeGooglePlacesAutocomplete();
    this.initializeDropZone();
    this.loadSavedClaims();

    // Track active day for modal editing
    this.activeModalDay = 0;

    // Check for edit payload first (from My Routes), then demo, then saved routes
    if (this.checkForEditRoute()) {
      // Edit payload detected — form pre-populated, skip other checks
    } else if (this.isDemoMode()) {
      setTimeout(() => this.initializeDemoMode(), 300);
    } else {
      // Check for saved routes on page load (after short delay for DOM)
      setTimeout(() => this.checkForSavedRoutes(), 500);
    }
  }

  // =================================
  // DEMO MODE FUNCTIONALITY
  // =================================

  /**
   * Initialize demo mode with seeded data and locked inputs
   */
  initializeDemoMode() {
    console.log('🎭 Demo mode detected - initializing demo route data');

    // Demo addresses - 3 Texas, 3 Florida
    const demoAddresses = [
      '100 Congress Ave, Austin, TX 78701',
      '400 Main St, Houston, TX 77002',
      '210 W Rusk St, Fort Worth, TX 76104',
      '200 S Orange Ave, Orlando, FL 32801',
      '701 Brickell Ave, Miami, FL 33131',
      '100 N Ashley Dr, Tampa, FL 33602'
    ];

    // Set demo starting location
    const startInput = document.getElementById('startLocation');
    if (startInput) {
      startInput.value = '100 Congress Ave, Austin, TX 78701';
      startInput.disabled = true;
    }

    // Clear existing destinations and add demo addresses
    const destList = document.getElementById('destinationsList');
    if (destList) {
      destList.innerHTML = '';

      // Add remaining addresses as destinations (skip first as it's starting point)
      demoAddresses.slice(1).forEach((address, index) => {
        const destDiv = document.createElement('div');
        destDiv.className = 'destination-input';
        destDiv.innerHTML = `
          <input type="text" placeholder="Enter destination address" class="destination-address-input" value="${address}" disabled>
          <div class="destination-controls">
            <select class="priority-select" title="Set priority level" disabled>
              <option value="normal" ${index < 2 ? 'selected' : ''}>🔵 Normal</option>
              <option value="high" ${index === 2 ? 'selected' : ''}>🟡 High</option>
              <option value="urgent" ${index > 2 ? 'selected' : ''}>🔴 Urgent</option>
            </select>
            <button class="remove-btn" onclick="return false;" title="Disabled in demo" disabled>×</button>
          </div>
        `;
        destList.appendChild(destDiv);
      });
    }

    // Disable Add Destination button
    const addBtn = document.getElementById('addDestination');
    if (addBtn) {
      addBtn.disabled = true;
      addBtn.title = 'Disabled in demo mode';
    }

    // Disable settings inputs but keep them visible
    this.lockDemoInputs();

    // Add demo mode banner
    this.showDemoModeBanner();

    // Store demo data to instance state for persistence compatibility
    this.startLocation = '100 Congress Ave, Austin, TX 78701';
    this.destinations = demoAddresses.slice(1).map((addr, i) => ({
      address: addr,
      priority: i < 2 ? 'normal' : (i === 2 ? 'high' : 'urgent')
    }));
    this.settings = this.gatherRouteData().settings;

    console.log('🎭 Demo mode initialized with 6 addresses');
  }

  /**
   * Lock inputs in demo mode
   */
  lockDemoInputs() {
    // Lock all destination inputs
    document.querySelectorAll('.destination-address-input').forEach(input => {
      input.disabled = true;
    });

    document.querySelectorAll('.priority-select').forEach(select => {
      select.disabled = true;
    });

    document.querySelectorAll('.remove-btn').forEach(btn => {
      btn.disabled = true;
    });
  }

  /**
   * Show demo mode banner
   */
  showDemoModeBanner() {
    const formSection = document.querySelector('.optimizer-form');
    if (formSection && !document.getElementById('demoModeBanner')) {
      const banner = document.createElement('div');
      banner.id = 'demoModeBanner';
      banner.style.cssText = `
        background: linear-gradient(135deg, rgba(255, 193, 7, 0.15), rgba(255, 152, 0, 0.1));
        border: 1px solid rgba(255, 193, 7, 0.4);
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 0.9rem;
      `;
      banner.innerHTML = `
        <span style="font-size: 1.2rem;">🎭</span>
        <div>
          <strong style="color: #ffc107;">Demo Mode:</strong>
          <span style="color: var(--cipher-text-secondary);">Example route shown. Upgrade to use your own routes.</span>
        </div>
      `;
      formSection.insertBefore(banner, formSection.firstChild);
    }
  }

  // =================================
  // EDIT ROUTE FROM MY ROUTES
  // =================================

  /**
   * Check for an edit route payload (from My Routes page)
   * Priority: 1) draft state with editingRouteId (refresh resume), 2) fresh cipher_edit_route payload
   * @returns {boolean} true if edit payload was detected and loaded
   */
  checkForEditRoute() {
    // Block in demo mode
    if (this.isDemoMode()) {
      localStorage.removeItem('cipher_edit_route');
      return false;
    }

    // 1. Check if draft state has an active edit (refresh during edit)
    try {
      const draftRaw = localStorage.getItem('cipher_optimizer_draft_state');
      if (draftRaw) {
        const draft = JSON.parse(draftRaw);
        if (draft.editingRouteId) {
          console.log('📝 Edit state found in draft — resuming via restoreLastRoute');
          // Let restoreLastRoute handle the full restore including edit flags
          setTimeout(() => this.restoreLastRoute(), 300);
          return true;
        }
      }
    } catch (e) {
      console.warn('📝 Error reading draft for edit state:', e);
    }

    // 2. Check for fresh payload from My Routes
    const raw = localStorage.getItem('cipher_edit_route');
    if (!raw) return false;

    try {
      const payload = JSON.parse(raw);

      // Validate required fields
      if (!payload.routeId || !payload.start_address) {
        console.warn('📝 Invalid edit payload — missing required fields');
        localStorage.removeItem('cipher_edit_route');
        return false;
      }

      // Staleness check (5 minutes)
      if (payload.storedAt && (Date.now() - payload.storedAt > 5 * 60 * 1000)) {
        console.warn('📝 Edit payload is stale (>5min) — discarding');
        localStorage.removeItem('cipher_edit_route');
        return false;
      }

      // Consume the payload
      localStorage.removeItem('cipher_edit_route');

      // Set editing flags
      this.editingRouteId = payload.routeId;
      this.editingRouteDate = payload.date || null;

      // Load the route into the form
      this.loadEditRoute(payload);

      return true;
    } catch (e) {
      console.error('📝 Error parsing edit payload:', e);
      localStorage.removeItem('cipher_edit_route');
      return false;
    }
  }

  /**
   * Load an edit route payload into the optimizer form
   * @param {Object} payload - { routeId, date, start_address, end_address, total_miles, status }
   */
  loadEditRoute(payload) {
    // Set start location
    const startInput = document.getElementById('startLocation');
    if (startInput) {
      startInput.value = payload.start_address;
      this.startLocation = payload.start_address;
    }

    // Clear existing destinations
    const destList = document.getElementById('destinationsList');
    if (destList) destList.innerHTML = '';

    // Pre-populate end_address as first destination (if different from start)
    if (payload.end_address && payload.end_address !== payload.start_address) {
      this.addDestination();
      const inputs = destList.querySelectorAll('.destination-address-input');
      const lastInput = inputs[inputs.length - 1];
      if (lastInput) lastInput.value = payload.end_address;
    }

    // Show edit mode banner
    this.showEditModeBanner(payload);

    // Persist edit state to draft so refresh resumes correctly
    this.autoSaveRouteState();

    console.log(`📝 Edit route loaded: ${payload.routeId} (${payload.status})`);
  }

  /**
   * Show edit mode banner above the form
   * @param {Object} payload - edit route payload
   */
  showEditModeBanner(payload) {
    // Remove existing banner if any
    const existing = document.getElementById('editModeBanner');
    if (existing) existing.remove();

    const dateDisplay = payload.date ? this.formatEditDate(payload.date) : 'No date';
    const milesDisplay = payload.total_miles ? `${Math.round(payload.total_miles * 10) / 10} mi` : '';
    const statusDisplay = payload.status ? payload.status.charAt(0).toUpperCase() + payload.status.slice(1) : '';

    const formSection = document.querySelector('.optimizer-form');
    if (!formSection) return;

    const banner = document.createElement('div');
    banner.id = 'editModeBanner';
    banner.style.cssText = `
      background: linear-gradient(135deg, rgba(52, 152, 219, 0.15), rgba(41, 128, 185, 0.1));
      border: 1px solid rgba(52, 152, 219, 0.4);
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      font-size: 0.9rem;
    `;
    banner.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 1.2rem;">✏️</span>
        <div>
          <strong style="color: #3498db;">Editing Route:</strong>
          <span style="color: var(--cipher-text-secondary);">${dateDisplay}${milesDisplay ? ' · ' + milesDisplay : ''}${statusDisplay ? ' · ' + statusDisplay : ''}</span>
        </div>
      </div>
      <button onclick="window.routeOptimizer.cancelEditRoute()" style="
        background: rgba(231, 76, 60, 0.15);
        color: #e74c3c;
        border: 1px solid rgba(231, 76, 60, 0.3);
        border-radius: 6px;
        padding: 6px 14px;
        cursor: pointer;
        font-size: 0.8rem;
        white-space: nowrap;
      ">Cancel Edit</button>
    `;
    formSection.insertBefore(banner, formSection.firstChild);
  }

  /**
   * Cancel the current edit — clear flags, remove banner, reset form
   */
  cancelEditRoute() {
    this.editingRouteId = null;
    this.editingRouteDate = null;

    // Remove banner
    const banner = document.getElementById('editModeBanner');
    if (banner) banner.remove();

    // Clear form
    const startInput = document.getElementById('startLocation');
    if (startInput) startInput.value = '';
    const destList = document.getElementById('destinationsList');
    if (destList) destList.innerHTML = '';

    // Clear draft state
    localStorage.removeItem('cipher_optimizer_draft_state');
    localStorage.removeItem('cipher_edit_route');

    // Reset route state
    this.currentRoute = null;
    this.currentOriginalRoute = null;
    this.renderEmptyRouteState();

    this.showToast('Edit cancelled.');
    console.log('📝 Edit cancelled — form and state cleared');
  }

  /**
   * Clear edit state after a successful save-update
   */
  clearEditState() {
    this.editingRouteId = null;
    this.editingRouteDate = null;

    // Remove banner
    const banner = document.getElementById('editModeBanner');
    if (banner) banner.remove();

    // Remove stale edit payload
    localStorage.removeItem('cipher_edit_route');

    // Re-save draft without edit flags
    this.autoSaveRouteState();

    console.log('📝 Edit state cleared after successful update');
  }

  /**
   * Format a YYYY-MM-DD date string for display
   * @param {string} dateStr - e.g. "2026-02-10"
   * @returns {string} - e.g. "Feb 10, 2026"
   */
  formatEditDate(dateStr) {
    if (!dateStr) return 'No date';
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  }

  setupEventListeners() {
    console.log("🔒 Setting up event listeners...");

    const addBtn = document.getElementById("addDestination");
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        console.log("🔒 Add Destination clicked!");
        this.addDestination();
      });
      console.log("🔒 Add Destination listener attached");
    } else {
      console.error("🔒 addDestination button not found!");
    }

    const optimizeBtn = document.getElementById("optimizeRoute");
    if (optimizeBtn) {
      optimizeBtn.addEventListener("click", () => this.optimizeRoute());
      console.log("🔒 Optimize Route listener attached");
    } else {
      console.error("🔒 optimizeRoute button not found!");
    }

    const copyBtn = document.getElementById("copyRoute");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => this.copyRoute());
    }

    const exportBtn = document.getElementById("exportMiles");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => this.exportToMileage());
    }

    // Save to My Routes button
    const saveToMyRoutesBtn = document.getElementById("saveToMyRoutes");
    if (saveToMyRoutesBtn) {
      saveToMyRoutesBtn.addEventListener("click", () => {
        if (typeof openSaveRouteModal === "function") {
          openSaveRouteModal();
        } else {
          console.error("openSaveRouteModal function not found");
        }
      });
    }

    // Settings change handlers
    const maxLegMiles = document.getElementById("maxLegMiles");
    if (maxLegMiles) {
      maxLegMiles.addEventListener("change", () => this.saveSettings());
    }

    const splitEnabled = document.getElementById("splitEnabled");
    if (splitEnabled) {
      splitEnabled.addEventListener("change", () => this.saveSettings());
    }

    const optimizeEnabled = document.getElementById("optimizeEnabled");
    if (optimizeEnabled) {
      optimizeEnabled.addEventListener("change", () => this.saveSettings());
    }

    document
      .getElementById("optimizationMode")
      ?.addEventListener("change", () => this.saveSettings());
    document
      .getElementById("maxDailyHours")
      ?.addEventListener("change", () => this.saveSettings());
    document
      .getElementById("maxStopsPerDay")
      ?.addEventListener("change", () => this.saveSettings());
    document
      .getElementById("timePerAppointment")
      ?.addEventListener("change", () => this.saveSettings());

    // Advanced settings toggle
    const toggleAdvancedBtn = document.getElementById("toggleAdvanced");
    if (toggleAdvancedBtn) {
      toggleAdvancedBtn.addEventListener("click", () =>
        this.toggleAdvancedSettings()
      );
    }

    console.log("🔒 Event listeners setup complete");
  }

  toggleAdvancedSettings() {
    const advancedSettings = document.getElementById("advancedSettings");
    const toggleBtn = document.getElementById("toggleAdvanced");

    if (
      advancedSettings.style.display === "none" ||
      !advancedSettings.style.display
    ) {
      advancedSettings.style.display = "block";
      toggleBtn.innerHTML = '<span class="btn-icon">🔼</span>Hide Settings';
    } else {
      advancedSettings.style.display = "none";
      toggleBtn.innerHTML = '<span class="btn-icon">⚙️</span>More Settings';
    }

    console.log("🔒 Advanced settings toggled");
  }

  addDestination() {
    console.log("🎵 Lyricist Emergency: Add Stop button clicked");

    // Block in demo mode
    if (this.isDemoMode()) {
      console.log('🎭 Demo mode - cannot add destinations');
      return;
    }

    const container = document.getElementById("destinationsList");
    if (!container) {
      console.error("🎵 Lyricist: destinationsList container not found");
      return;
    }

    // Create only ONE destination input with priority controls
    const destDiv = document.createElement("div");
    destDiv.className = "destination-input";
    destDiv.innerHTML = `
            <input type="text" placeholder="Enter destination address" class="destination-address-input">
            <button class="remove-btn" onclick="removeDestination(this)" title="Remove this destination">×</button>
        `;

    // Add to container
    container.appendChild(destDiv);

    // Focus on the new input
    const newInput = destDiv.querySelector(".destination-address-input");
    if (newInput) {
      newInput.focus();

      // Attach Google Places Autocomplete to the new input
      if (window.google && google.maps && google.maps.places) {
        new google.maps.places.Autocomplete(newInput);
      }
    }

    console.log(
      "🎵 Lyricist Emergency: ONE destination input added successfully"
    );
  }

  async optimizeRoute() {
    console.log("🎵 Lyricist Emergency: Optimize Route button clicked");

    try {
      this.showLoading(true);
      this.hideError();

      const routeData = this.gatherRouteData();
      console.log("🎵 Lyricist: Route data gathered:", routeData);

      // Clear distance cache for fresh optimization
      this.clearDistanceCache();

      if (!this.validateRouteData(routeData)) {
        console.warn("🎵 Lyricist: Route data validation failed");
        return;
      }

      console.log("🎵 Lyricist: Starting route calculation...");

      // Show progress to user
      const optimizeBtn = document.getElementById("optimizeRoute");
      if (optimizeBtn) {
        const originalText = optimizeBtn.textContent;
        optimizeBtn.textContent = "🎵 Optimizing...";
        optimizeBtn.disabled = true;

        setTimeout(() => {
          optimizeBtn.textContent = originalText;
          optimizeBtn.disabled = false;
        }, 5000);
      }

      const optimizedRoute = await this.calculateOptimizedRoute(routeData);
      console.log("🎵 Lyricist: Route optimized:", optimizedRoute);

      let splitRoute = await this.applySplitting(
        optimizedRoute,
        routeData.settings
      );
      console.log("🎵 Lyricist: Route split applied:", splitRoute);

      // Check if we're editing a specific day - merge back into full route
      if (typeof this.editingDayIndex === 'number' && this.currentRoute?.days) {
        console.log(`🎵 Merging edited Day ${this.editingDayIndex + 1} back into full route`);
        splitRoute = this.mergeEditedDay(splitRoute, this.editingDayIndex);
        this.editingDayIndex = null; // Clear editing state
      }

      this.displayResults(splitRoute, optimizedRoute);
      this.renderMapRoute(optimizedRoute, splitRoute);

      this.currentRoute = splitRoute;
      this.currentOriginalRoute = optimizedRoute;

      // Store route data to instance state for persistence
      this.startLocation = routeData.startLocation;
      this.destinations = routeData.destinations;
      this.settings = routeData.settings;

      // Auto-save route state after successful optimization
      this.autoSaveRouteState();

      console.log(
        "🎵 Lyricist Emergency: Route optimization COMPLETED successfully!"
      );
    } catch (error) {
      console.error("🎵 Lyricist Emergency: Route optimization error:", error);
      this.showError("Route optimization failed: " + error.message);
    } finally {
      this.showLoading(false);
    }
  }

  gatherRouteData() {
    const startLocation = document.getElementById("startLocation").value.trim();
    const destinationInputs = document.querySelectorAll(
      "#destinationsList .destination-input"
    );
    const destinations = Array.from(destinationInputs)
      .map((destDiv) => {
        const input = destDiv.querySelector(".destination-address-input");
        const prioritySelect = destDiv.querySelector(".priority-select");
        const address = input?.value.trim();
        const priority = prioritySelect?.value || "normal";

        return address && address.length > 0 ? { address, priority } : null;
      })
      .filter((dest) => dest !== null);

    const settings = {
      optimizeEnabled: document.getElementById("optimizeEnabled").checked,
      splitEnabled: document.getElementById("splitEnabled").checked,
      maxLegMiles: parseInt(document.getElementById("maxLegMiles").value) || 50,
      optimizationMode:
        document.getElementById("optimizationMode")?.value || "distance",
      maxDailyHours:
        parseInt(document.getElementById("maxDailyHours")?.value) || 8,
      maxStopsPerDay:
        parseInt(document.getElementById("maxStopsPerDay")?.value) || 6,
      timePerAppointment:
        parseInt(document.getElementById("timePerAppointment")?.value) || 30,
      territoryType: document.getElementById("territoryType")?.value || "mixed",
      geographicClustering:
        document.getElementById("geographicClustering")?.checked ?? true,
    };

    return { startLocation, destinations, settings };
  }

  validateRouteData(data) {
    if (!data.startLocation) {
      this.showError("Please enter a starting location");
      return false;
    }

    if (data.destinations.length === 0) {
      this.showError("Please add at least one destination");
      return false;
    }

    if (data.destinations.length > 15) {
      this.showError("Maximum 15 destinations allowed");
      return false;
    }

    return true;
  }

  async calculateOptimizedRoute(routeData) {
    const { startLocation, destinations, settings } = routeData;

    // Check if Google Maps is available
    if (typeof google === "undefined" || !google.maps) {
      console.warn(
        "🔒 Google Maps not available, using fallback route calculation"
      );
      return await this.calculateFallbackRoute(
        startLocation,
        destinations,
        settings
      );
    }

    if (!settings.optimizeEnabled) {
      // Simple route without optimization
      return await this.calculateSimpleRoute(startLocation, destinations);
    }

    // Use Google Maps Directions API for optimization
    return new Promise((resolve, reject) => {
      // Use geographical optimization for smarter routing
      const sortedDestinations = this.geographicallyOptimizeRoute(
        startLocation,
        destinations,
        settings
      );
      const waypoints = sortedDestinations.map((dest) => ({
        location: dest.address,
        stopover: true,
      }));

      // Choose optimization mode based on settings
      const optimizeByDistance = settings.optimizationMode === "distance";

      const request = {
        origin: startLocation,
        destination: sortedDestinations[sortedDestinations.length - 1].address, // Last destination as endpoint
        waypoints: waypoints.slice(0, -1), // All but last as waypoints
        optimizeWaypoints: true,
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.IMPERIAL,
        avoidHighways: false,
        avoidTolls: false,
        // NOTE: No drivingOptions/departureTime - uses static durations only
        // ETA calculated locally from static duration values returned by API
      };

      if (!this.directionsService || typeof this.directionsService.route !== "function") {
        const message = "Directions service is not initialized.";
        console.error("Directions service unavailable:", this.directionsService);
        this.showError(message);
        reject(new Error(message));
        return;
      }

      this.directionsService.route(request, (result, status) => {
        const hasValidRoutes =
          !!result &&
          Array.isArray(result.routes) &&
          result.routes.length > 0 &&
          !!result.routes[0] &&
          Array.isArray(result.routes[0].legs) &&
          result.routes[0].legs.length > 0;

        // Defensive guard: check for API failures or empty routes
        if (status !== google.maps.DirectionsStatus.OK || !hasValidRoutes) {
          const message =
            status !== google.maps.DirectionsStatus.OK
              ? `Directions request failed: ${status}`
              : "Directions returned no valid routes.";
          console.error("Directions API failed:", status, result);
          this.showError(message);
          reject(new Error(message));
          return;
        }

        try {
          const optimizedRoute = this.processDirectionsResult(result);
          resolve(optimizedRoute);
        } catch (error) {
          const message = "Directions returned an invalid route payload.";
          console.error("Directions processing failed:", error, result);
          this.showError(message);
          reject(new Error(message));
        }
      });
    });
  }

  async calculateFallbackRoute(startLocation, destinations, settings) {
    console.log("🔒 Using fallback route calculation without Google Maps");

    // Show user notification about fallback mode
    this.showFallbackNotification();

    // Use geographical optimization for smarter routing
    const sortedDestinations = this.geographicallyOptimizeRoute(
      startLocation,
      destinations,
      settings
    );
    const addressList = sortedDestinations.map((dest) => dest.address);

    // Create a simulated route with estimated distances and times
    const route = {
      stops: [startLocation, ...addressList],
      legs: [],
      totalDistance: 0,
      totalDuration: 0,
      destinationData: sortedDestinations,
      fallbackMode: true,
    };

    // Simulate route calculation with estimated values
    for (let i = 0; i < route.stops.length - 1; i++) {
      const leg = this.simulateLeg(route.stops[i], route.stops[i + 1]);
      route.legs.push(leg);
      route.totalDistance += leg.distance;
      route.totalDuration += leg.duration;
    }

    return route;
  }

  showFallbackNotification() {
    const statusElement = document.getElementById("exportStatus");
    if (statusElement) {
      statusElement.innerHTML = `
                <div style="color: var(--cipher-electric-blue); font-weight: bold;">
                    ⚠️ Using estimated distances - Google Maps not available. 
                    Route optimization and appointment scheduling still functional.
                </div>
            `;
    }
  }

  simulateLeg(origin, destination) {
    // Simulate distance and time based on address length (rough approximation)
    const baseDistance = Math.random() * 20 + 5; // 5-25 miles
    const baseTime = baseDistance * 2 + Math.random() * 10; // Rough time estimation

    return {
      origin,
      destination,
      distance: Math.round(baseDistance * 10) / 10,
      duration: Math.round(baseTime),
      distanceText: `${Math.round(baseDistance * 10) / 10} mi`,
      durationText: `${Math.round(baseTime)} min`,
      simulated: true,
    };
  }

  prioritizeDestinations(destinations) {
    // Sort destinations by priority: urgent -> high -> normal
    const priorityOrder = { urgent: 3, high: 2, normal: 1 };

    return destinations.sort((a, b) => {
      const aPriority = priorityOrder[a.priority] || 1;
      const bPriority = priorityOrder[b.priority] || 1;
      return bPriority - aPriority; // Higher priority first
    });
  }

  geographicallyOptimizeRoute(startLocation, destinations, settings) {
    console.log(
      "🗺️ Starting geographical optimization for",
      settings.territoryType,
      "territory"
    );

    if (!settings.geographicClustering) {
      // Just use priority sorting
      return this.prioritizeDestinations(destinations);
    }

    // Step 1: Sort urgent priorities first (always respected)
    const urgent = destinations.filter((d) => d.priority === "urgent");
    const nonUrgent = destinations.filter((d) => d.priority !== "urgent");

    // Step 2: Apply geographical clustering to non-urgent destinations
    const clustered = this.nearestNeighborOptimization(
      startLocation,
      nonUrgent,
      settings
    );

    // Step 3: Combine urgent (first) + geographically optimized
    return [...urgent, ...clustered];
  }

  nearestNeighborOptimization(startLocation, destinations, settings) {
    if (destinations.length <= 1) return destinations;

    const optimized = [];
    const remaining = [...destinations];
    let currentLocation = startLocation;

    // Always go to the first destination (user choice respected)
    if (remaining.length > 0) {
      const firstDest = remaining.shift();
      optimized.push(firstDest);
      currentLocation = firstDest.address;
    }

    // For destinations 2+, use geographical optimization
    while (remaining.length > 0) {
      const nearest = this.findNearestDestination(
        currentLocation,
        remaining,
        settings
      );
      optimized.push(nearest);
      currentLocation = nearest.address;

      // Remove from remaining
      const index = remaining.findIndex((d) => d.address === nearest.address);
      remaining.splice(index, 1);
    }

    console.log(
      "🗺️ Geographical optimization complete:",
      optimized.map((d) => d.address)
    );
    return optimized;
  }

  findNearestDestination(currentLocation, destinations, settings) {
    // Calculate distances to all remaining destinations
    const distances = destinations.map((dest) => {
      const distance = this.estimateDistance(currentLocation, dest.address);
      const time = this.estimateTime(currentLocation, dest.address);

      // Apply territory-specific optimization with enhanced scoring
      let score;
      switch (settings.territoryType) {
        case "rural":
          // Rural: Distance is primary concern (like user's Raleigh/Wilmington example)
          // Strongly penalize long distances that would require separate days
          score = distance + (distance > 100 ? distance * 2 : 0);
          break;
        case "urban":
          // Urban: Time is primary concern (quick routes, stop density)
          // Factor in appointment efficiency and return journey
          score = time + (time > 45 ? time * 1.5 : 0);
          break;
        case "mixed":
        default:
          // Mixed: Balance both distance and time with smart weighting
          // Penalize extreme distances or times proportionally
          const distanceWeight = distance > 60 ? 0.7 : 0.5;
          const timeWeight = time > 60 ? 0.7 : 0.3;
          score = distance * distanceWeight + time * timeWeight;
          break;
      }

      return {
        destination: dest,
        distance,
        time,
        score,
        acceptable: distance <= settings.maxLegMiles,
      };
    });

    // Filter out unacceptable distances (like user's 129-mile Raleigh-Wilmington rule)
    const acceptable = distances.filter((d) => d.acceptable);

    if (acceptable.length === 0) {
      // No acceptable destinations, return the closest anyway but flag for day split
      console.warn(
        "🗺️ No destinations within acceptable range, choosing closest for separate day"
      );
      const closest = distances.reduce((min, curr) =>
        curr.score < min.score ? curr : min
      );
      // Mark this destination for day splitting
      closest.destination._flaggedForDaySplit = true;
      return closest.destination;
    }

    // Return the destination with the best score (lowest distance/time)
    const best = acceptable.reduce((min, curr) =>
      curr.score < min.score ? curr : min
    );

    // Enhanced logging with territory-specific context
    const efficiency =
      settings.territoryType === "rural"
        ? `${best.distance.toFixed(1)}mi (distance priority)`
        : settings.territoryType === "urban"
        ? `${best.time.toFixed(0)}min (time priority)`
        : `${best.distance.toFixed(1)}mi, ${best.time.toFixed(
            0
          )}min (balanced)`;

    console.log(
      `🗺️ Next destination: ${best.destination.address} (${efficiency})`
    );

    return best.destination;
  }

  estimateDistance(origin, destination) {
    // Check cache first for deterministic results
    const cacheKey = `${origin}|||${destination}`;
    if (this._distanceCache.has(cacheKey)) {
      return this._distanceCache.get(cacheKey);
    }

    const config = RouteOptimizer.CLUSTERING_CONFIG;

    // Extract location indicators
    const originState = this.extractState(origin);
    const destState = this.extractState(destination);
    const originCity = this.extractCity(origin);
    const destCity = this.extractCity(destination);

    let distance;

    // Different states = much longer distance (deterministic)
    if (originState && destState && originState !== destState) {
      distance = 180; // Fixed cross-state estimate
    }
    // Same city = shorter distance (deterministic)
    else if (originCity && destCity && originCity.toLowerCase() === destCity.toLowerCase()) {
      distance = config.SAME_CITY_DISTANCE_ESTIMATE; // 12 miles
    }
    else {
      // Check for shared geographic indicators (counties, regions)
      const originWords = origin.toLowerCase().split(/[\s,]+/);
      const destWords = destination.toLowerCase().split(/[\s,]+/);
      const sharedWords = originWords.filter(
        (word) =>
          destWords.includes(word) &&
          word.length > 3 &&
          !["street", "road", "ave", "avenue", "drive", "lane", "way"].includes(word)
      );
      const similarity = sharedWords.length / Math.max(originWords.length, destWords.length);

      // Deterministic distance based on similarity
      if (similarity > 0.3) {
        // High similarity = likely same region
        distance = 20;
      } else if (similarity > 0.1) {
        // Some similarity = nearby regions
        distance = config.NEARBY_REGION_DISTANCE_ESTIMATE; // 35 miles
      } else {
        // Low similarity = more distant locations in same state
        distance = 65;
      }
    }

    distance = Math.max(distance, 2); // Minimum 2 miles

    // Cache and return
    this._distanceCache.set(cacheKey, distance);
    return distance;
  }

  /**
   * Build geographic clusters using Union-Find algorithm
   * Groups stops that are within CLUSTER_RADIUS_MILES of each other
   * @param {string[]} stops - Array of address strings (excluding start point)
   * @param {Object} distanceMatrix - Precomputed pairwise distances (optional)
   * @returns {Object} { clusters: Cluster[], stopToCluster: Map }
   */
  buildGeographicClusters(stops, distanceMatrix = null) {
    const config = RouteOptimizer.CLUSTERING_CONFIG;
    const n = stops.length;

    if (n === 0) {
      return { clusters: [], stopToCluster: new Map() };
    }

    // Union-Find data structure
    const parent = Array.from({ length: n }, (_, i) => i);
    const rank = Array(n).fill(0);

    const find = (x) => {
      if (parent[x] !== x) {
        parent[x] = find(parent[x]); // Path compression
      }
      return parent[x];
    };

    const union = (x, y) => {
      const px = find(x);
      const py = find(y);
      if (px === py) return;
      // Union by rank
      if (rank[px] < rank[py]) {
        parent[px] = py;
      } else if (rank[px] > rank[py]) {
        parent[py] = px;
      } else {
        parent[py] = px;
        rank[px]++;
      }
    };

    // Build pairwise distances and union stops within cluster radius
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let distance;
        if (distanceMatrix && distanceMatrix[i] && distanceMatrix[i][j] !== undefined) {
          distance = distanceMatrix[i][j];
        } else {
          distance = this.estimateDistance(stops[i], stops[j]);
        }

        if (distance <= config.CLUSTER_RADIUS_MILES) {
          union(i, j);
        }
      }
    }

    // Group stops by their root (cluster)
    const clusterGroups = new Map();
    for (let i = 0; i < n; i++) {
      const root = find(i);
      if (!clusterGroups.has(root)) {
        clusterGroups.set(root, []);
      }
      clusterGroups.get(root).push(i);
    }

    // Build cluster objects
    const clusters = [];
    const stopToCluster = new Map();
    let clusterId = 0;

    for (const [root, indices] of clusterGroups) {
      const clusterStops = indices.map(i => stops[i]);

      // Calculate internal mileage (sum of distances within cluster)
      let internalMileage = 0;
      if (indices.length > 1) {
        for (let i = 0; i < indices.length - 1; i++) {
          const dist = distanceMatrix?.[indices[i]]?.[indices[i + 1]]
            ?? this.estimateDistance(stops[indices[i]], stops[indices[i + 1]]);
          internalMileage += dist;
        }
      }

      const cluster = {
        id: clusterId,
        stops: clusterStops,
        indices: indices,
        internalMileage: Math.round(internalMileage * 10) / 10,
        size: clusterStops.length
      };

      clusters.push(cluster);

      // Map each stop to its cluster
      for (const stop of clusterStops) {
        stopToCluster.set(stop, clusterId);
      }

      clusterId++;
    }

    console.log(`🗺️ Built ${clusters.length} geographic clusters from ${n} stops`);
    clusters.forEach((c, i) => {
      console.log(`  Cluster ${i + 1}: ${c.size} stops, ~${c.internalMileage} mi internal`);
    });

    return { clusters, stopToCluster };
  }

  /**
   * Check if a cluster qualifies for soft cap override
   * @param {number} currentDayMiles - Miles already in the current day
   * @param {number} additionalMiles - Miles to add (cluster internal + travel to)
   * @param {Object} settings - Route settings
   * @returns {Object} { eligible, overagePercent, overageAbsolute, projectedTotal, dailyCap }
   */
  checkSoftCapEligibility(currentDayMiles, additionalMiles, settings) {
    const config = RouteOptimizer.CLUSTERING_CONFIG;

    // Calculate effective daily cap based on settings
    // Using maxLegMiles * maxStopsPerDay as a reasonable daily cap
    const dailyCapMiles = settings.maxLegMiles * settings.maxStopsPerDay;

    const projectedTotal = currentDayMiles + additionalMiles;
    const overageAbsolute = projectedTotal - dailyCapMiles;
    const overagePercent = dailyCapMiles > 0 ? overageAbsolute / dailyCapMiles : 0;

    // Eligible for soft cap if:
    // 1. Actually exceeds the cap
    // 2. Overage is within percentage limit OR within absolute limit
    const eligible =
      overageAbsolute > 0 &&
      (overagePercent <= config.SOFT_CAP_OVERAGE_PERCENT ||
       overageAbsolute <= config.SOFT_CAP_OVERAGE_ABSOLUTE);

    return {
      eligible,
      overagePercent: Math.round(overagePercent * 100),
      overageAbsolute: Math.round(overageAbsolute * 10) / 10,
      projectedTotal: Math.round(projectedTotal * 10) / 10,
      dailyCap: dailyCapMiles
    };
  }

  /**
   * Get a unique key for a cluster to track override decisions
   * @param {Object} cluster - Cluster object
   * @returns {string} Unique key
   */
  getClusterKey(cluster) {
    return cluster.stops.slice().sort().join('|');
  }

  /**
   * Show the cluster override modal and wait for user decision
   * @param {Object} cluster - The cluster being considered
   * @param {Object} currentDayStats - { totalMiles, dailyCap }
   * @param {Object} overageInfo - From checkSoftCapEligibility
   * @returns {Promise<string>} - 'keepTogether' or 'split'
   */
  showClusterOverrideModal(cluster, currentDayStats, overageInfo) {
    return new Promise((resolve) => {
      const modal = document.getElementById('clusterOverrideModal');
      if (!modal) {
        console.warn('Cluster override modal not found, defaulting to split');
        resolve('split');
        return;
      }

      // Populate modal content
      const titleEl = document.getElementById('clusterStopsTitle');
      if (titleEl) {
        titleEl.textContent = `${cluster.stops.length} stops in same region`;
      }

      const stopsListEl = document.getElementById('clusterStopsList');
      if (stopsListEl) {
        stopsListEl.innerHTML = cluster.stops
          .map(stop => `<li>📍 ${this.formatAddressShort(stop)}</li>`)
          .join('');
      }

      const currentMilesEl = document.getElementById('currentDayMiles');
      if (currentMilesEl) {
        currentMilesEl.textContent = `${Math.round(currentDayStats.totalMiles)} mi`;
      }

      const clusterMilesEl = document.getElementById('clusterMiles');
      if (clusterMilesEl) {
        clusterMilesEl.textContent = `+${Math.round(cluster.internalMileage + (cluster.travelToMiles || 0))} mi`;
      }

      const totalEl = document.getElementById('totalIfKept');
      if (totalEl) {
        totalEl.textContent = `${Math.round(overageInfo.projectedTotal)} mi`;
      }

      const capEl = document.getElementById('dailyCapDisplay');
      if (capEl) {
        capEl.textContent = `${Math.round(overageInfo.dailyCap)} mi`;
      }

      const overageEl = document.getElementById('overageDisplay');
      if (overageEl) {
        overageEl.textContent = `+${Math.round(overageInfo.overageAbsolute)} mi (${overageInfo.overagePercent}%)`;
      }

      // Store resolve function for button handlers
      this._overrideResolve = resolve;
      this._pendingCluster = cluster;

      // Show modal
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';

      console.log(`🗺️ Showing override modal for cluster with ${cluster.stops.length} stops`);
    });
  }

  /**
   * Handle user's override decision from modal
   * @param {string} decision - 'keepTogether' or 'split'
   */
  handleClusterOverride(decision) {
    const modal = document.getElementById('clusterOverrideModal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }

    // Store decision for this cluster (in-memory only per user request)
    if (this._pendingCluster) {
      const clusterKey = this.getClusterKey(this._pendingCluster);
      this.clusterOverrideDecisions.set(clusterKey, decision);
      console.log(`🗺️ Override decision stored: ${decision} for cluster key: ${clusterKey.substring(0, 50)}...`);
    }

    // Resolve the pending promise
    if (this._overrideResolve) {
      this._overrideResolve(decision);
      this._overrideResolve = null;
      this._pendingCluster = null;
    }
  }

  /**
   * Format an address to a shorter display version
   * @param {string} address - Full address
   * @returns {string} Shortened address
   */
  formatAddressShort(address) {
    if (!address) return '';
    // Remove country suffix
    let short = address.replace(/,?\s*(USA|United States)$/i, '');
    // If still long, try to extract city and state
    const parts = short.split(',').map(p => p.trim());
    if (parts.length >= 3) {
      // Return last 2-3 meaningful parts (city, state, zip)
      return parts.slice(-3).join(', ');
    }
    return short;
  }

  /**
   * Clear the distance cache (call when starting new optimization)
   */
  clearDistanceCache() {
    this._distanceCache.clear();
    console.log('🗺️ Distance cache cleared');
  }

  getDefaultDate(dayIndex) {
    // Calculate default date based on day index
    // Day 0 = today, Day 1 = tomorrow, etc.
    const today = new Date();
    const defaultDate = new Date(today);
    defaultDate.setDate(today.getDate() + dayIndex);

    // Format as YYYY-MM-DD for date input
    return defaultDate.toISOString().split("T")[0];
  }

  exportToPreferredCalendar(overrideSystem = null) {
    // Get user's preferred calendar system from settings
    const preferredSystem =
      overrideSystem ||
      (window.settingsManager
        ? window.settingsManager.getCalendarSystem()
        : "mobile");

    console.log(
      `📅 Exporting to preferred calendar system: ${preferredSystem}`
    );

    switch (preferredSystem) {
      case "google":
        this.exportToGoogleCalendar();
        break;
      case "apple":
        this.exportToAppleCalendar();
        break;
      case "outlook":
        this.exportToOutlookCalendar();
        break;
      case "mobile":
      default:
        this.exportToMobileCipher();
        break;
    }
  }

  exportToOutlookCalendar() {
    const appointments = this.gatherApprovedAppointments();
    if (appointments.length === 0) return;

    // Create Outlook Calendar URLs for each appointment
    appointments.forEach((appt) => {
      const startDate = new Date(`${appt.date}T${appt.time}`);
      const endDate = new Date(startDate.getTime() + appt.duration * 60000);

      const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(
        appt.title
      )}&startdt=${this.formatDateForOutlook(
        startDate
      )}&enddt=${this.formatDateForOutlook(endDate)}&body=${encodeURIComponent(
        appt.details
      )}&location=${encodeURIComponent(appt.address)}`;

      window.open(outlookUrl, "_blank");
    });

    console.log("Exported to Outlook Calendar:", appointments);
    this.showNotification(
      `${appointments.length} appointments exported to Outlook Calendar`
    );
  }

  formatDateForOutlook(date) {
    return date.toISOString();
  }

  extractState(address) {
    // Extract state abbreviation from address
    const statePattern =
      /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/i;
    const match = address.match(statePattern);
    return match ? match[0].toUpperCase() : null;
  }

  extractCity(address) {
    // Extract likely city name from address (simplified)
    const parts = address.split(",");
    if (parts.length >= 2) {
      // Assume city is the second-to-last part before state
      const cityPart = parts[parts.length - 2].trim();
      return cityPart.toLowerCase();
    }
    return null;
  }

  estimateTime(origin, destination) {
    const distance = this.estimateDistance(origin, destination);

    // Territory-specific time calculations
    const territoryType =
      document.getElementById("territoryType")?.value || "mixed";

    let timeMultiplier;
    switch (territoryType) {
      case "rural":
        // Rural: Faster speeds, highway driving, ~1.2 min/mile
        timeMultiplier = 1.2;
        break;
      case "urban":
        // Urban: Lights, intersections, slower speeds, ~2.8 min/mile
        timeMultiplier = 2.8;
        break;
      case "mixed":
      default:
        // Mixed territory: Average of both, ~2.0 min/mile
        timeMultiplier = 2.0;
        break;
    }

    // Add time buffer for longer distances (highway transitions)
    if (distance > 50) {
      timeMultiplier *= 1.1; // 10% longer for highway stretches
    }

    return distance * timeMultiplier;
  }

  async calculateSimpleRoute(startLocation, destinations) {
    // Check if Google Maps is available
    if (typeof google === "undefined" || !google.maps) {
      console.warn(
        "🔒 Google Maps not available for simple route, using fallback"
      );
      return await this.calculateFallbackRoute(startLocation, destinations, {
        optimizeEnabled: false,
      });
    }

    // Sort by priority first
    const sortedDestinations = this.prioritizeDestinations(destinations);
    const addressList = sortedDestinations.map((dest) => dest.address);

    // Simple sequential route calculation
    const route = {
      stops: [startLocation, ...addressList],
      legs: [],
      totalDistance: 0,
      totalDuration: 0,
      destinationData: sortedDestinations,
    };

    for (let i = 0; i < route.stops.length - 1; i++) {
      const leg = await this.calculateLeg(route.stops[i], route.stops[i + 1]);
      route.legs.push(leg);
      route.totalDistance += leg.distance;
      route.totalDuration += leg.duration;
    }

    return route;
  }

  calculateLeg(origin, destination) {
    // Check if Google Maps is available
    if (typeof google === "undefined" || !google.maps) {
      console.warn(
        "🔒 Google Maps not available for leg calculation, using simulation"
      );
      return Promise.resolve(this.simulateLeg(origin, destination));
    }

    return new Promise((resolve, reject) => {
      const service = new google.maps.DistanceMatrixService();
      service.getDistanceMatrix(
        {
          origins: [origin],
          destinations: [destination],
          travelMode: google.maps.TravelMode.DRIVING,
          unitSystem: google.maps.UnitSystem.IMPERIAL,
        },
        (response, status) => {
          if (status === "OK") {
            const element = response.rows[0].elements[0];
            if (element.status === "OK") {
              const miles = element.distance.value * 0.000621371; // Convert meters to miles

              // Write to DistanceCache (symmetric) for return-leg optimization
              if (window.DistanceCache) {
                window.DistanceCache.set(origin, destination, miles, 'google_api');
              }

              resolve({
                origin,
                destination,
                distance: miles,
                duration: element.duration.value / 60, // Convert seconds to minutes
                distanceText: element.distance.text,
                durationText: element.duration.text,
                isEstimated: false,
              });
            } else {
              reject(
                new Error(
                  `Route calculation failed for ${origin} to ${destination}`
                )
              );
            }
          } else {
            reject(new Error(`Distance Matrix request failed: ${status}`));
          }
        }
      );
    });
  }

  processDirectionsResult(result) {
    const route = result.routes[0];
    const legs = route.legs;

    const processedRoute = {
      stops: [legs[0].start_address],
      legs: [],
      totalDistance: 0,
      totalDuration: 0,
      googleRoute: result,
    };

    legs.forEach((leg) => {
      processedRoute.stops.push(leg.end_address);
      processedRoute.legs.push({
        origin: leg.start_address,
        destination: leg.end_address,
        distance: leg.distance.value * 0.000621371, // Convert to miles
        duration: leg.duration.value / 60, // Convert to minutes
        distanceText: leg.distance.text,
        durationText: leg.duration.text,
      });

      processedRoute.totalDistance += leg.distance.value * 0.000621371;
      processedRoute.totalDuration += leg.duration.value / 60;
    });

    return processedRoute;
  }

  async applySplitting(route, settings) {
    if (!settings.splitEnabled) {
      return {
        days: [
          {
            label: "Single Day",
            stops: route.stops,
            legs: route.legs,
            totalMiles: Math.round(route.totalDistance * 10) / 10,
            totalMinutes: Math.round(route.totalDuration),
            appointmentTime: route.stops.length * settings.timePerAppointment,
            totalDayTime:
              Math.round(route.totalDuration) +
              route.stops.length * settings.timePerAppointment,
          },
        ],
        overall: {
          miles: Math.round(route.totalDistance * 10) / 10,
          minutes: Math.round(route.totalDuration),
        },
      };
    }

    return await this.intelligentDaySplitting(route, settings);
  }

  async intelligentDaySplitting(route, settings) {
    const days = [];
    const maxDailyMinutes = settings.maxDailyHours * 60;
    const startingPoint = route.stops[0]; // Save the starting point

    // Build geographic clusters for all destination stops (excluding start)
    const destinationStops = route.stops.slice(1);
    const { clusters, stopToCluster } = this.buildGeographicClusters(destinationStops);

    console.log(`🗺️ Day splitting with ${clusters.length} clusters from ${destinationStops.length} stops`);

    let currentDay = {
      label: `Day ${days.length + 1}`,
      stops: [startingPoint], // Always start from starting point
      legs: [],
      totalMiles: 0,
      totalMinutes: 0,
      appointmentTime: 0,
      totalDayTime: 0,
    };

    for (let i = 0; i < route.legs.length; i++) {
      const leg = route.legs[i];
      const appointmentTimeForStop = settings.timePerAppointment;

      // Calculate what the day would look like if we add this leg
      const projectedTravelTime = currentDay.totalMinutes + leg.duration;
      const projectedAppointmentTime =
        currentDay.appointmentTime + appointmentTimeForStop;
      const projectedTotalTime = projectedTravelTime + projectedAppointmentTime;
      const projectedStops = currentDay.stops.length + 1;
      const projectedMiles = currentDay.totalMiles + leg.distance;

      // Check multiple splitting criteria
      const exceedsTime = projectedTotalTime > maxDailyMinutes;
      const exceedsStops = projectedStops > settings.maxStopsPerDay;
      const exceedsDistance = leg.distance > settings.maxLegMiles;
      const dayHasContent = currentDay.legs.length > 0;

      // Determine if we should split
      let shouldSplit = dayHasContent && (exceedsTime || exceedsStops || exceedsDistance);

      // If would split, check if this is a cluster situation where we should ask user
      if (shouldSplit && !exceedsTime && !exceedsStops) {
        // Only exceedsDistance triggered - check cluster membership
        const lastStopOnDay = currentDay.stops[currentDay.stops.length - 1];
        const nextStop = leg.destination;

        // Check if both stops are in the same cluster
        const lastClusterId = stopToCluster.get(lastStopOnDay);
        const nextClusterId = stopToCluster.get(nextStop);

        if (lastClusterId !== undefined && lastClusterId === nextClusterId) {
          // Same cluster - check soft cap eligibility
          const cluster = clusters.find(c => c.id === lastClusterId);
          const additionalMiles = leg.distance;
          const softCapInfo = this.checkSoftCapEligibility(
            currentDay.totalMiles,
            additionalMiles,
            settings
          );

          if (softCapInfo.eligible) {
            // Check if we already have a decision for this cluster
            const clusterKey = this.getClusterKey(cluster);
            let decision = this.clusterOverrideDecisions.get(clusterKey);

            if (!decision) {
              // No decision yet - show modal
              cluster.travelToMiles = leg.distance;
              decision = await this.showClusterOverrideModal(
                cluster,
                { totalMiles: currentDay.totalMiles, dailyCap: softCapInfo.dailyCap },
                softCapInfo
              );
            }

            if (decision === 'keepTogether') {
              // User wants to keep them together - don't split
              shouldSplit = false;
              console.log(`🗺️ Keeping cluster together (user override): ${cluster.stops.length} stops`);
            }
          }
        }
      }

      // Apply split decision
      if (shouldSplit) {
        // Add return leg to starting point for current day
        const returnLeg = this.calculateReturnLeg(
          currentDay.stops[currentDay.stops.length - 1],
          startingPoint
        );
        currentDay.legs.push(returnLeg);
        currentDay.stops.push(startingPoint);
        currentDay.totalMiles += returnLeg.distance;
        currentDay.totalMinutes += returnLeg.duration;

        // Finalize current day
        currentDay.totalDayTime =
          currentDay.totalMinutes + currentDay.appointmentTime;
        days.push(currentDay);

        // Start new day from starting point
        currentDay = {
          label: `Day ${days.length + 1}`,
          stops: [startingPoint], // New day starts from starting point
          legs: [],
          totalMiles: 0,
          totalMinutes: 0,
          appointmentTime: 0,
          totalDayTime: 0,
        };

        // Add leg from starting point to the destination that caused the split
        const startToDestLeg = this.calculateLegFromStart(
          startingPoint,
          leg.destination
        );
        currentDay.legs.push(startToDestLeg);
        currentDay.stops.push(leg.destination);
        currentDay.totalMiles += startToDestLeg.distance;
        currentDay.totalMinutes += startToDestLeg.duration;
        currentDay.appointmentTime += appointmentTimeForStop;
      } else {
        // Add leg to current day
        currentDay.legs.push(leg);
        currentDay.stops.push(leg.destination);
        currentDay.totalMiles += leg.distance;
        currentDay.totalMinutes += leg.duration;
        currentDay.appointmentTime += appointmentTimeForStop;
      }
    }

    // Finalize the last day with return to starting point
    if (currentDay.legs.length > 0) {
      // Add return leg to starting point
      const returnLeg = this.calculateReturnLeg(
        currentDay.stops[currentDay.stops.length - 1],
        startingPoint
      );
      currentDay.legs.push(returnLeg);
      currentDay.stops.push(startingPoint);
      currentDay.totalMiles += returnLeg.distance;
      currentDay.totalMinutes += returnLeg.duration;

      currentDay.totalDayTime =
        currentDay.totalMinutes + currentDay.appointmentTime;
      days.push(currentDay);
    }

    // Round numbers and add efficiency metrics
    days.forEach((day, index) => {
      day.totalMiles = Math.round(day.totalMiles * 10) / 10;
      day.totalMinutes = Math.round(day.totalMinutes);
      day.totalDayTime = Math.round(day.totalDayTime);
      day.efficiency = Math.round(
        (day.appointmentTime / day.totalDayTime) * 100
      );
      day.stopsCount = day.stops.length - 1; // Subtract 1 to not count return to start as appointment
    });

    // Calculate updated overall stats
    const totalMiles = days.reduce((sum, day) => sum + day.totalMiles, 0);
    const totalMinutes = days.reduce((sum, day) => sum + day.totalMinutes, 0);
    const totalAppointmentStops = days.reduce(
      (sum, day) => sum + day.stopsCount,
      0
    );

    const overall = {
      miles: Math.round(totalMiles * 10) / 10,
      minutes: Math.round(totalMinutes),
      totalDays: days.length,
      avgStopsPerDay:
        Math.round((totalAppointmentStops / days.length) * 10) / 10,
      avgEfficiency: Math.round(
        days.reduce((sum, day) => sum + day.efficiency, 0) / days.length
      ),
    };

    return { days, overall };
  }

  calculateReturnLeg(lastStop, startingPoint) {
    // Calculate return leg from last stop back to starting point
    if (lastStop === startingPoint) {
      // Already at starting point, no return needed
      return {
        origin: lastStop,
        destination: startingPoint,
        distance: 0,
        duration: 0,
        distanceText: "0 mi",
        durationText: "0 min",
        isReturn: true,
        isEstimated: false,
      };
    }

    // Check DistanceCache first for authoritative symmetric distance
    let distance;
    let isEstimated = true;

    if (window.DistanceCache) {
      const cached = window.DistanceCache.get(lastStop, startingPoint);
      if (cached) {
        distance = cached.miles;
        isEstimated = false;
        console.log(`📏 Return leg using cached distance: ${distance} mi`);
      }
    }

    // Fall back to heuristic estimation (visual only, not for billing)
    if (distance === undefined) {
      distance = this.estimateDistance(lastStop, startingPoint);
      console.log(`📏 Return leg using estimated distance: ${distance} mi`);
    }

    const duration = this.estimateTime(lastStop, startingPoint);

    return {
      origin: lastStop,
      destination: startingPoint,
      distance: distance,
      duration: duration,
      distanceText: isEstimated ? `~${distance.toFixed(1)} mi` : `${distance.toFixed(1)} mi`,
      durationText: `${Math.round(duration)} min`,
      isReturn: true,
      isEstimated: isEstimated,
    };
  }

  calculateLegFromStart(startingPoint, destination) {
    // Calculate leg from starting point to a destination
    // Check DistanceCache first for authoritative distance
    let distance;
    let isEstimated = true;

    if (window.DistanceCache) {
      const cached = window.DistanceCache.get(startingPoint, destination);
      if (cached) {
        distance = cached.miles;
        isEstimated = false;
        console.log(`📏 Start leg using cached distance: ${distance} mi`);
      }
    }

    // Fall back to heuristic estimation (visual only)
    if (distance === undefined) {
      distance = this.estimateDistance(startingPoint, destination);
      console.log(`📏 Start leg using estimated distance: ${distance} mi`);
    }

    const duration = this.estimateTime(startingPoint, destination);

    return {
      origin: startingPoint,
      destination: destination,
      distance: distance,
      duration: duration,
      distanceText: isEstimated ? `~${distance.toFixed(1)} mi` : `${distance.toFixed(1)} mi`,
      durationText: `${Math.round(duration)} min`,
      fromStart: true,
      isEstimated: isEstimated,
    };
  }

  displayResults(splitRoute, originalRoute = null) {
    // Store route data for modal
    this.currentRoute = splitRoute;
    this.currentOriginalRoute = originalRoute;

    // Show modal with route visualization
    this.showRouteModal(splitRoute, originalRoute);
  }

  showRouteModal(splitRoute, originalRoute = null) {
    const modal = document.getElementById("routeMapModal");
    const dayTabsContainer = document.getElementById("dayTabs");
    const modalTimeline = document.getElementById("modalTimeline");
    const modalStats = document.getElementById("modalStats");

    // Generate day tabs
    let tabsHTML = "";
    splitRoute.days.forEach((day, index) => {
      const isActive = index === 0 ? "active" : "";
      tabsHTML += `
        <div class="day-tab ${isActive}" data-day="${index}" onclick="switchModalDay(${index})">
          <span>${day.label}</span>
          <span class="day-tab-badge">${
            day.stopsCount || day.stops.length - 1
          } stops</span>
        </div>
      `;
    });
    dayTabsContainer.innerHTML = tabsHTML;

    // Show stats
    modalStats.innerHTML = `
      <div style="display: flex; gap: var(--cipher-space-lg); font-size: 0.9rem;">
        <div><strong>Total:</strong> ${splitRoute.overall.miles} mi</div>
        <div><strong>Time:</strong> ${Math.floor(
          splitRoute.overall.minutes / 60
        )}h ${splitRoute.overall.minutes % 60}m</div>
        <div><strong>Days:</strong> ${splitRoute.days.length}</div>
      </div>
    `;

    // Show first day's timeline
    this.showDayTimeline(0, splitRoute, originalRoute);

    // Show modal
    modal.classList.add("active");
    document.body.style.overflow = "hidden";

    // Initialize modal map after the modal is visible
    setTimeout(() => {
      this.initializeModalMap(splitRoute, 0);

      // Ensure map renders after modal display
      if (this.modalMap && typeof google !== "undefined" && google.maps?.event) {
        const center = this.modalMap.getCenter();
        google.maps.event.trigger(this.modalMap, "resize");
        if (center) {
          this.modalMap.setCenter(center);
        }
      }
    }, 50);
  }

  showDayTimeline(dayIndex, splitRoute, originalRoute) {
    const modalTimeline = document.getElementById("modalTimeline");
    const day = splitRoute.days[dayIndex];
    const dayNumber = dayIndex + 1;
    let cumulativeTime = 0;

    let html = `
      <div class="day-section">
        <div class="day-header">
          <h4>📅 ${day.label}</h4>
          ${
            day.efficiency
              ? `<span class="efficiency-badge">${day.efficiency}% efficient</span>`
              : ""
          }
        </div>
        <div class="day-stats">
          <span class="stat"><strong>${day.totalMiles} mi</strong></span>
          <span class="stat"><strong>${Math.floor(day.totalMinutes / 60)}h ${
      day.totalMinutes % 60
    }m driving</strong></span>
          <span class="stat"><strong>${
            day.stopsCount || day.stops.length
          } stops</strong></span>
          ${
            day.totalDayTime
              ? `<span class="stat total-time"><strong>${Math.floor(
                  day.totalDayTime / 60
                )}h ${day.totalDayTime % 60}m total</strong></span>`
              : ""
          }
        </div>
        <div class="route-timeline">
    `;

    day.stops.forEach((stop, stopIndex) => {
      const priority = this.getStopPriority(
        stop,
        originalRoute || this.currentRoute
      );
      const priorityIcon =
        priority === "urgent" ? "🔴" : priority === "high" ? "🟡" : "🔵";
      const stopId = `stop_${dayIndex}_${stopIndex}`;
      const isStartingPoint = stopIndex === 0;
      const isReturnToStart =
        stopIndex === day.stops.length - 1 && day.legs[stopIndex - 1]?.isReturn;
      const isFinalReturn = isReturnToStart;

      // Generate stop label
      let stopLabel;
      if (isStartingPoint) {
        stopLabel = "🚀";
      } else if (isFinalReturn) {
        stopLabel = "🏠";
      } else {
        const letter = String.fromCharCode(96 + stopIndex);
        stopLabel = `${dayNumber}${letter}`;
      }

      // Calculate arrival time
      let arrivalTime = "";
      if (stopIndex > 0 && day.legs[stopIndex - 1]) {
        cumulativeTime += day.legs[stopIndex - 1].duration;
        const hours = Math.floor(cumulativeTime / 60);
        const mins = Math.round(cumulativeTime % 60);
        arrivalTime = `+${hours}h ${mins}m`;
      }

      html += `
        <div class="timeline-stop ${isStartingPoint ? "start-stop" : ""} ${
        isFinalReturn ? "return-stop" : ""
      }" data-stop-id="${stopId}">
          <div class="stop-marker">
            <div class="stop-number-badge ${priority}">${stopLabel}</div>
            ${
              !isStartingPoint && !isFinalReturn
                ? `<div class="priority-badge ${priority}">${priorityIcon}</div>`
                : ""
            }
          </div>
          
          <div class="stop-content">
            <div class="stop-header-row">
              <div class="stop-address-main">${this.shortenAddress(stop)}</div>
              ${
                arrivalTime
                  ? `<div class="arrival-time">${arrivalTime} from start</div>`
                  : ""
              }
            </div>
            <div class="stop-note">${
              isStartingPoint
                ? "Starting location"
                : isFinalReturn
                ? "Return to base"
                : "Inspection stop"
            }</div>
          </div>
        </div>
      `;

      // Add travel connector
      if (stopIndex < day.stops.length - 1 && day.legs[stopIndex]) {
        const leg = day.legs[stopIndex];
        const isReturnLeg = leg.isReturn;
        html += `
          <div class="travel-connector ${isReturnLeg ? "return-travel" : ""}">
            <div class="connector-line"></div>
            <div class="travel-info">
              <div class="travel-badge">
                <span class="travel-icon">🚗</span>
                <span class="travel-distance">${leg.distance.toFixed(
                  1
                )} mi</span>
                <span class="travel-separator">•</span>
                <span class="travel-time">${Math.round(leg.duration)} min</span>
              </div>
            </div>
            <div class="connector-arrow">▼</div>
          </div>
        `;
      }
    });

    html += `
        </div>
      </div>
    `;

    modalTimeline.innerHTML = html;
  }

  initializeModalMap(splitRoute, dayIndex) {
    const modalMapContainer = document.getElementById("modalMap");

    if (!modalMapContainer) {
      console.error("Modal map container not found.");
      return;
    }

    // Check if Google Maps is available
    if (typeof google === "undefined" || !google.maps) {
      this.showFallbackModalMap(splitRoute, dayIndex);
      return;
    }

    // Create map if it doesn't exist
    if (!this.modalMap) {
      this.modalMap = new google.maps.Map(modalMapContainer, {
        zoom: 10,
        center: { lat: 40.7128, lng: -74.006 },
        mapTypeId: google.maps.MapTypeId.ROADMAP,
      });

      this.modalDirectionsService = new google.maps.DirectionsService();
      this.modalDirectionsRenderer = new google.maps.DirectionsRenderer({
        map: this.modalMap,
        suppressMarkers: false,
      });
    }

    // Render route for selected day
    this.renderModalDayRoute(splitRoute, dayIndex);
  }

  renderModalDayRoute(splitRoute, dayIndex) {
    const day = splitRoute.days[dayIndex];

    if (!this.modalDirectionsService || typeof google === "undefined") {
      this.showFallbackModalMap(splitRoute, dayIndex);
      return;
    }

    if (day.stops.length < 2) return;

    const waypoints = day.stops.slice(1, -1).map((stop) => ({
      location: stop,
      stopover: true,
    }));

    const request = {
      origin: day.stops[0],
      destination: day.stops[day.stops.length - 1],
      waypoints: waypoints,
      travelMode: google.maps.TravelMode.DRIVING,
      unitSystem: google.maps.UnitSystem.IMPERIAL,
    };

    this.modalDirectionsService.route(request, (result, status) => {
      if (status === "OK") {
        this.modalDirectionsRenderer.setDirections(result);
      } else {
        console.warn(`Modal route calculation failed: ${status}`);
        this.showFallbackModalMap(splitRoute, dayIndex);
      }
    });
  }

  showFallbackModalMap(splitRoute, dayIndex) {
    const modalMapContainer = document.getElementById("modalMap");
    const day = splitRoute.days[dayIndex];

    modalMapContainer.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        height: 100%;
        background: linear-gradient(135deg, rgba(26, 26, 26, 0.95), rgba(30, 30, 30, 0.95));
        color: var(--cipher-text-primary);
        padding: var(--cipher-space-xl);
        text-align: center;
      ">
        <div style="font-size: 3rem; margin-bottom: var(--cipher-space-md);">🗺️</div>
        <h3 style="color: var(--cipher-gold); margin-bottom: var(--cipher-space-md);">${
          day.label
        } Route</h3>
        <div style="font-size: 0.9rem; color: var(--cipher-text-secondary); max-width: 400px;">
          <p>${day.stops.length} stops • ${day.totalMiles} miles • ${Math.floor(
      day.totalMinutes / 60
    )}h ${day.totalMinutes % 60}m</p>
          <p style="margin-top: var(--cipher-space-md); font-size: 0.85rem; color: var(--cipher-text-muted);">
            ⚠️ Google Maps visualization not available<br>
            Route optimization and scheduling still functional
          </p>
        </div>
      </div>
    `;
  }

  setupAppointmentControls() {
    // Setup event listeners for appointment controls (both old and new button styles)
    document
      .querySelectorAll(".approve-btn, .approve-btn-compact")
      .forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const stopId = e.target.closest(".approve-btn, .approve-btn-compact")
            .dataset.stop;
          this.approveAppointment(stopId);
        });
      });

    document
      .querySelectorAll(".appt-date-input, .appt-time-input, .duration-select")
      .forEach((input) => {
        input.addEventListener("change", () => {
          this.updateCalendarExportStatus();
        });
      });

    // Setup calendar export buttons with preference-based routing
    document
      .getElementById("exportGoogleCal")
      ?.addEventListener("click", () =>
        this.exportToPreferredCalendar("google")
      );
    document
      .getElementById("exportAppleCal")
      ?.addEventListener("click", () =>
        this.exportToPreferredCalendar("apple")
      );
    document
      .getElementById("exportMobileCipher")
      ?.addEventListener("click", () =>
        this.exportToPreferredCalendar("mobile")
      );

    // Also setup direct export methods
    document
      .getElementById("exportGoogleCal")
      ?.addEventListener("dblclick", () => this.exportToGoogleCalendar());
    document
      .getElementById("exportAppleCal")
      ?.addEventListener("dblclick", () => this.exportToAppleCalendar());
    document
      .getElementById("exportMobileCipher")
      ?.addEventListener("dblclick", () => this.exportToMobileCipher());
  }

  approveAppointment(stopId) {
    const dateInput = document.querySelector(
      `.appt-date-input[data-stop="${stopId}"]`
    );
    const timeInput = document.querySelector(
      `.appt-time-input[data-stop="${stopId}"]`
    );
    const durationSelect = document.querySelector(
      `.duration-select[data-stop="${stopId}"]`
    );
    const approveBtn = document.querySelector(
      `.approve-btn[data-stop="${stopId}"]`
    );

    if (!dateInput.value) {
      alert("Please select an appointment date first");
      dateInput.focus();
      return;
    }

    if (!timeInput.value) {
      alert("Please set an appointment time first");
      timeInput.focus();
      return;
    }

    // Mark as approved
    approveBtn.classList.add("approved");
    approveBtn.innerHTML = '<span class="btn-icon">✅</span>';
    approveBtn.title = "Appointment approved";

    // Disable editing
    dateInput.disabled = true;
    timeInput.disabled = true;
    durationSelect.disabled = true;

    console.log(
      `Appointment approved for stop ${stopId}: ${dateInput.value} at ${timeInput.value} for ${durationSelect.value} minutes`
    );

    this.updateCalendarExportStatus();
  }

  updateCalendarExportStatus() {
    const allDateInputs = document.querySelectorAll(".appt-date-input");
    const allTimeInputs = document.querySelectorAll(".appt-time-input");
    const approvedButtons = document.querySelectorAll(
      ".approve-btn.approved, .approve-btn-compact.approved"
    );
    const googleCalBtn = document.getElementById("exportGoogleCal");
    const appleCalBtn = document.getElementById("exportAppleCal");
    const statusElement = document.getElementById("exportStatus");

    const hasAppointments = allTimeInputs.length > 0;
    const allApproved =
      approvedButtons.length === allTimeInputs.length &&
      allTimeInputs.length > 0;

    if (allApproved) {
      googleCalBtn.disabled = false;
      appleCalBtn.disabled = false;
      statusElement.textContent = `Ready to export ${allTimeInputs.length} appointments to calendar`;
      statusElement.style.color = "var(--cipher-success)";
    } else if (hasAppointments) {
      const remaining = allTimeInputs.length - approvedButtons.length;
      statusElement.textContent = `${remaining} appointment${
        remaining !== 1 ? "s" : ""
      } need date & time approval`;
      statusElement.style.color = "var(--cipher-text-muted)";
    }
  }

  exportToGoogleCalendar() {
    const appointments = this.gatherApprovedAppointments();
    if (appointments.length === 0) return;

    // Create Google Calendar URLs for each appointment
    appointments.forEach((appt) => {
      const startDate = new Date(`${appt.date}T${appt.time}`);
      const endDate = new Date(startDate.getTime() + appt.duration * 60000);

      const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
        appt.title
      )}&dates=${this.formatDateForGoogle(
        startDate
      )}/${this.formatDateForGoogle(endDate)}&details=${encodeURIComponent(
        appt.details
      )}&location=${encodeURIComponent(appt.address)}`;

      window.open(googleUrl, "_blank");
    });

    console.log("Exported to Google Calendar:", appointments);
    this.showNotification(
      `${appointments.length} appointments exported to Google Calendar`
    );
  }

  exportToAppleCalendar() {
    const appointments = this.gatherApprovedAppointments();
    if (appointments.length === 0) return;

    // Create ICS file content
    let icsContent =
      "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Claim Cipher//Route Optimizer//EN\n";

    appointments.forEach((appt) => {
      const startDate = new Date(`${appt.date}T${appt.time}`);
      const endDate = new Date(startDate.getTime() + appt.duration * 60000);

      icsContent += "BEGIN:VEVENT\n";
      icsContent += `UID:${Date.now()}-${Math.random()}@claimcipher.com\n`;
      icsContent += `DTSTART:${this.formatDateForICS(startDate)}\n`;
      icsContent += `DTEND:${this.formatDateForICS(endDate)}\n`;
      icsContent += `SUMMARY:${appt.title}\n`;
      icsContent += `DESCRIPTION:${appt.details}\n`;
      icsContent += `LOCATION:${appt.address}\n`;
      icsContent += "END:VEVENT\n";
    });

    icsContent += "END:VCALENDAR";

    // Download ICS file
    const blob = new Blob([icsContent], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `claim-cipher-appointments-${
      new Date().toISOString().split("T")[0]
    }.ics`;
    a.click();

    console.log("Exported to Apple Calendar:", appointments);
    this.showNotification(
      `${appointments.length} appointments exported to Apple Calendar`
    );
  }

  exportToMobileCipher() {
    const appointments = this.gatherApprovedAppointments();
    const routeData = {
      route: this.currentRoute,
      appointments: appointments,
      exportDate: new Date().toISOString(),
      totalStops: appointments.length,
    };

    // Store for mobile app pickup
    localStorage.setItem("cc_mobile_export", JSON.stringify(routeData));

    // Copy to clipboard for manual transfer
    const mobileData = appointments
      .map((appt) => `${appt.time} - ${appt.address} (${appt.duration}min)`)
      .join("\n");

    navigator.clipboard.writeText(mobileData).then(() => {
      alert(
        `Route exported for Mobile Cipher!\n\n${appointments.length} appointments copied to clipboard and saved locally.`
      );
    });

    console.log("Exported to Mobile Cipher:", routeData);
  }

  gatherApprovedAppointments() {
    const appointments = [];
    const approvedButtons = document.querySelectorAll(".approve-btn.approved");

    approvedButtons.forEach((btn) => {
      const stopId = btn.dataset.stop;
      const dateInput = document.querySelector(
        `.appt-date-input[data-stop="${stopId}"]`
      );
      const timeInput = document.querySelector(
        `.appt-time-input[data-stop="${stopId}"]`
      );
      const durationSelect = document.querySelector(
        `.duration-select[data-stop="${stopId}"]`
      );
      const stopItem = btn.closest(".stop-item");
      const address = stopItem.querySelector(".stop-address").textContent;

      appointments.push({
        stopId: stopId,
        address: address,
        date: dateInput.value,
        time: timeInput.value,
        duration: parseInt(durationSelect.value),
        title: `Claim Inspection - ${address}`,
        details: `Route optimized appointment\nScheduled: ${dateInput.value} at ${timeInput.value}\nEstimated duration: ${durationSelect.value} minutes\nGenerated by Claim Cipher Route Optimizer`,
      });
    });

    return appointments;
  }

  formatDateForGoogle(date) {
    return date
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  }

  formatDateForICS(date) {
    return date
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  }

  renderMapRoute(route, splitRoute = null) {
    if (!this.map) {
      console.warn("🗺️ Map not available for route rendering");
      return;
    }

    // Clear existing renderers
    this.clearMapRenderers();

    // If we have split routes, render all days with different colors
    if (splitRoute && splitRoute.days.length > 1) {
      this.renderMultiDayRoutes(splitRoute);
    } else if (route.googleRoute && this.directionsRenderer) {
      // Single day route
      this.directionsRenderer.setDirections(route.googleRoute);
    } else {
      // Fallback visualization for non-Google Maps routes
      this.renderFallbackRoute(route, splitRoute);
    }
  }

  setupMapDayControls(splitRoute) {
    const dayButtons = document.querySelectorAll(".day-btn");
    dayButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        // Update active button
        dayButtons.forEach((b) => b.classList.remove("active"));
        e.target.classList.add("active");

        const dayIndex = e.target.dataset.day;
        if (dayIndex === "all") {
          this.renderMultiDayRoutes(splitRoute);
        } else {
          this.renderSingleDay(splitRoute, parseInt(dayIndex));
        }
      });
    });
  }

  clearMapRenderers() {
    // Clear existing directions renderers
    if (this.dayRenderers) {
      this.dayRenderers.forEach((renderer) => {
        renderer.setMap(null);
      });
    }

    if (this.directionsRenderer) {
      this.directionsRenderer.setMap(null);
      this.directionsRenderer.setMap(this.map);
    }

    // Clear existing markers
    if (this.dayMarkers) {
      this.dayMarkers.forEach((marker) => marker.setMap(null));
    }

    this.dayRenderers = [];
    this.dayMarkers = [];
  }

  renderMultiDayRoutes(splitRoute) {
    if (!this.map || typeof google === "undefined") {
      this.renderFallbackRoute(null, splitRoute);
      return;
    }

    this.clearMapRenderers();

    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#96CEB4",
      "#FECA57",
      "#FF9FF3",
      "#54A0FF",
    ];
    const bounds = new google.maps.LatLngBounds();

    splitRoute.days.forEach((day, dayIndex) => {
      if (day.stops.length < 2) return;

      const color = colors[dayIndex % colors.length];

      // Create directions renderer for this day
      const dayRenderer = new google.maps.DirectionsRenderer({
        suppressMarkers: false,
        polylineOptions: {
          strokeColor: color,
          strokeWeight: 4,
          strokeOpacity: 0.8,
        },
        markerOptions: {
          icon: {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
              this.createDayMarkerSVG(dayIndex + 1, color)
            )}`,
            scaledSize: new google.maps.Size(30, 30),
          },
        },
      });

      dayRenderer.setMap(this.map);
      this.dayRenderers.push(dayRenderer);

      // Calculate route for this day
      this.calculateDayRoute(day, dayRenderer, bounds);
    });

    // Fit map to show all routes
    setTimeout(() => {
      if (!bounds.isEmpty()) {
        this.map.fitBounds(bounds);
      }
    }, 1000);
  }

  renderSingleDay(splitRoute, dayIndex) {
    if (!this.map || typeof google === "undefined") {
      this.renderFallbackRoute(null, splitRoute, dayIndex);
      return;
    }

    this.clearMapRenderers();

    const day = splitRoute.days[dayIndex];
    if (!day || day.stops.length < 2) return;

    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#96CEB4",
      "#FECA57",
      "#FF9FF3",
      "#54A0FF",
    ];
    const color = colors[dayIndex % colors.length];

    const dayRenderer = new google.maps.DirectionsRenderer({
      suppressMarkers: false,
      polylineOptions: {
        strokeColor: color,
        strokeWeight: 6,
        strokeOpacity: 0.9,
      },
    });

    dayRenderer.setMap(this.map);
    this.dayRenderers.push(dayRenderer);

    const bounds = new google.maps.LatLngBounds();
    this.calculateDayRoute(day, dayRenderer, bounds);

    setTimeout(() => {
      if (!bounds.isEmpty()) {
        this.map.fitBounds(bounds);
      }
    }, 500);
  }

  calculateDayRoute(day, renderer, bounds) {
    if (!this.directionsService || typeof google === "undefined") return;

    const waypoints = day.stops.slice(1, -1).map((stop) => ({
      location: stop,
      stopover: true,
    }));

    const request = {
      origin: day.stops[0],
      destination: day.stops[day.stops.length - 1],
      waypoints: waypoints,
      travelMode: google.maps.TravelMode.DRIVING,
      unitSystem: google.maps.UnitSystem.IMPERIAL,
    };

    this.directionsService.route(request, (result, status) => {
      if (status === "OK") {
        renderer.setDirections(result);

        // Extend bounds to include this route
        if (bounds) {
          result.routes[0].bounds && bounds.union(result.routes[0].bounds);
        }
      } else {
        console.warn(`Day route calculation failed: ${status}`);
      }
    });
  }

  createDayMarkerSVG(dayNumber, color) {
    return `
            <svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
                <circle cx="15" cy="15" r="14" fill="${color}" stroke="white" stroke-width="2"/>
                <text x="15" y="20" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="12" font-weight="bold">${dayNumber}</text>
            </svg>
        `;
  }

  renderFallbackRoute(route, splitRoute, specificDay = null) {
    // Fallback visualization when Google Maps is not available
    const mapContainer = document.getElementById("routeMap");
    if (!mapContainer) return;

    let fallbackHtml = `
            <div style="
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                height: 100%;
                background: linear-gradient(135deg, rgba(26, 26, 26, 0.95), rgba(30, 30, 30, 0.95));
                border-radius: var(--cipher-radius-lg);
                color: var(--cipher-text-primary);
                padding: var(--cipher-space-lg);
            ">
                <div style="font-size: 2rem; margin-bottom: var(--cipher-space-md);">🗺️</div>
                <h3 style="color: var(--cipher-gold); margin-bottom: var(--cipher-space-md);">Route Visualization</h3>
        `;

    if (splitRoute && splitRoute.days.length > 1) {
      const colors = [
        "#FF6B6B",
        "#4ECDC4",
        "#45B7D1",
        "#96CEB4",
        "#FECA57",
        "#FF9FF3",
        "#54A0FF",
      ];

      if (specificDay !== null) {
        const day = splitRoute.days[specificDay];
        const color = colors[specificDay % colors.length];
        fallbackHtml += `
                    <div style="text-align: center; max-width: 400px;">
                        <div style="
                            background: ${color}20;
                            border: 2px solid ${color};
                            border-radius: var(--cipher-radius-md);
                            padding: var(--cipher-space-md);
                            margin-bottom: var(--cipher-space-md);
                        ">
                            <h4 style="color: ${color}; margin: 0 0 var(--cipher-space-sm) 0;">${
          day.label
        }</h4>
                            <div style="font-size: 0.9rem; color: var(--cipher-text-secondary);">
                                ${day.stops.length} stops • ${
          day.totalMiles
        } miles • ${Math.floor(day.totalMinutes / 60)}h ${
          day.totalMinutes % 60
        }m
                            </div>
                        </div>
                        <div style="font-size: 0.85rem; color: var(--cipher-text-muted);">
                            Route: ${day.stops
                              .map((stop) => this.shortenAddress(stop))
                              .join(" → ")}
                        </div>
                    </div>
                `;
      } else {
        fallbackHtml += `
                    <div style="text-align: center; max-width: 500px;">
                        <div style="margin-bottom: var(--cipher-space-lg);">
                            <strong>${
                              splitRoute.days.length
                            } Day Route Plan</strong>
                        </div>
                        ${splitRoute.days
                          .map((day, index) => {
                            const color = colors[index % colors.length];
                            return `
                                <div style="
                                    background: ${color}20;
                                    border-left: 4px solid ${color};
                                    padding: var(--cipher-space-sm) var(--cipher-space-md);
                                    margin-bottom: var(--cipher-space-sm);
                                    border-radius: 0 var(--cipher-radius-sm) var(--cipher-radius-sm) 0;
                                ">
                                    <div style="font-weight: bold; color: ${color};">${
                              day.label
                            }</div>
                                    <div style="font-size: 0.8rem; color: var(--cipher-text-secondary);">
                                        ${day.stops.length} stops • ${
                              day.totalMiles
                            }mi • ${Math.floor(day.totalMinutes / 60)}h ${
                              day.totalMinutes % 60
                            }m
                                    </div>
                                </div>
                            `;
                          })
                          .join("")}
                    </div>
                `;
      }
    } else {
      fallbackHtml += `
                <div style="text-align: center; color: var(--cipher-text-secondary);">
                    <div style="margin-bottom: var(--cipher-space-sm);">Single Day Route</div>
                    <div style="font-size: 0.9rem;">
                        ${
                          route
                            ? `${
                                Math.round(route.totalDistance * 10) / 10
                              } miles • ${Math.floor(
                                route.totalDuration / 60
                              )}h ${Math.round(route.totalDuration % 60)}m`
                            : "Route calculated"
                        }
                    </div>
                </div>
            `;
    }

    fallbackHtml += `
                <div style="
                    margin-top: var(--cipher-space-lg);
                    font-size: 0.8rem;
                    color: var(--cipher-text-muted);
                    text-align: center;
                ">
                    ⚠️ Google Maps visualization not available<br>
                    Route optimization and scheduling still functional
                </div>
            </div>
        `;

    mapContainer.innerHTML = fallbackHtml;
  }

  copyRoute() {
    if (!this.currentRoute) return;

    let text = `🗺️ ROUTE CIPHER RESULTS\n\n`;
    text += `Overall: ${this.currentRoute.overall.miles} miles, ${Math.floor(
      this.currentRoute.overall.minutes / 60
    )}h ${this.currentRoute.overall.minutes % 60}m\n`;
    text += `Days: ${this.currentRoute.days.length}\n\n`;

    this.currentRoute.days.forEach((day) => {
      text += `${day.label}: ${day.totalMiles} mi, ${Math.floor(
        day.totalMinutes / 60
      )}h ${day.totalMinutes % 60}m\n`;
      day.stops.forEach((stop, i) => {
        text += `  ${i + 1}. ${this.shortenAddress(stop)}\n`;
      });
      text += "\n";
    });

    navigator.clipboard
      .writeText(text)
      .then(() => {
        this.showToast("Route copied to clipboard!");
      })
      .catch((err) => {
        console.error("Copy failed:", err);
        this.showError("Copy failed. Please try again.");
      });
  }

  exportToMileage() {
    if (!this.currentRoute) return;

    // Calculate total distance for mileage calculator
    const totalDistance = this.currentRoute.overall.miles;

    // Store in localStorage for mileage calculator to pick up
    localStorage.setItem(
      "cc_route_export",
      JSON.stringify({
        distance: totalDistance,
        route: this.currentRoute,
        timestamp: Date.now(),
      })
    );

    this.showToast(`Exported ${totalDistance} miles to Mileage Calculator`);

    // Optionally redirect to mileage calculator
    if (confirm("Open Mileage Calculator with this distance?")) {
      window.location.href = "mileage-cypher.html";
    }
  }

  getStopPriority(stopAddress, routeData) {
    // Find priority for this stop from the original destination data
    if (routeData && routeData.destinationData) {
      const dest = routeData.destinationData.find(
        (d) => d.address === stopAddress
      );
      return dest ? dest.priority : "normal";
    }
    return "normal";
  }

  shortenAddress(address) {
    if (address.length <= 50) return address;
    return address.substring(0, 47) + "...";
  }

  showLoading(show) {
    document.getElementById("loadingOverlay").style.display = show
      ? "flex"
      : "none";
  }

  showError(message) {
    document.getElementById("errorMessage").textContent = message;
    document.getElementById("errorDisplay").style.display = "block";
  }

  hideError() {
    document.getElementById("errorDisplay").style.display = "none";
  }

  showToast(message) {
    // Simple toast notification
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;

    document.body.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  loadSettings() {
    // Load from global settings manager if available
    if (window.settingsManager) {
      console.log("📋 Loading settings from Settings Manager");

      // Load route optimization settings
      const territoryType = window.settingsManager.getSetting("territoryType");
      const maxDailyHours = window.settingsManager.getSetting("maxDailyHours");
      const maxStopsPerDay =
        window.settingsManager.getSetting("maxStopsPerDay");
      const maxLegMiles = window.settingsManager.getSetting("maxLegMiles");
      const enableGeographicClustering = window.settingsManager.getSetting(
        "enableGeographicClustering"
      );
      const homeBaseLocation =
        window.settingsManager.getSetting("homeBaseLocation");
      const defaultAppointmentDuration = window.settingsManager.getSetting(
        "defaultAppointmentDuration"
      );

      // Apply to form fields
      if (territoryType && document.getElementById("territoryType")) {
        document.getElementById("territoryType").value = territoryType;
      }
      if (maxDailyHours && document.getElementById("maxDailyHours")) {
        document.getElementById("maxDailyHours").value = maxDailyHours;
      }
      if (maxStopsPerDay && document.getElementById("maxStopsPerDay")) {
        document.getElementById("maxStopsPerDay").value = maxStopsPerDay;
      }
      if (maxLegMiles && document.getElementById("maxLegMiles")) {
        document.getElementById("maxLegMiles").value = maxLegMiles;
      }
      if (
        enableGeographicClustering !== undefined &&
        document.getElementById("geographicClustering")
      ) {
        document.getElementById("geographicClustering").checked =
          enableGeographicClustering;
      }
      if (homeBaseLocation && document.getElementById("startLocation")) {
        document.getElementById("startLocation").value = homeBaseLocation;
      }
      if (
        defaultAppointmentDuration &&
        document.getElementById("timePerAppointment")
      ) {
        document.getElementById("timePerAppointment").value =
          defaultAppointmentDuration;
      }
    } else {
      // Fallback to legacy settings
      const settings = JSON.parse(
        localStorage.getItem("cc_route_settings") || "{}"
      );

      if (settings.maxLegMiles) {
        document.getElementById("maxLegMiles").value = settings.maxLegMiles;
      }
      if (settings.splitEnabled !== undefined) {
        document.getElementById("splitEnabled").checked = settings.splitEnabled;
      }
      if (settings.optimizeEnabled !== undefined) {
        document.getElementById("optimizeEnabled").checked =
          settings.optimizeEnabled;
      }
      if (
        settings.optimizationMode &&
        document.getElementById("optimizationMode")
      ) {
        document.getElementById("optimizationMode").value =
          settings.optimizationMode;
      }
      if (settings.maxDailyHours && document.getElementById("maxDailyHours")) {
        document.getElementById("maxDailyHours").value = settings.maxDailyHours;
      }
      if (
        settings.maxStopsPerDay &&
        document.getElementById("maxStopsPerDay")
      ) {
        document.getElementById("maxStopsPerDay").value =
          settings.maxStopsPerDay;
      }
      if (
        settings.timePerAppointment &&
        document.getElementById("timePerAppointment")
      ) {
        document.getElementById("timePerAppointment").value =
          settings.timePerAppointment;
      }
    }
  }

  initializeGooglePlacesAutocomplete() {
    // Wait for Google Maps API to load
    if (typeof google === "undefined" || !google.maps || !google.maps.places) {
      console.log("🗺️ Google Places not available - autocomplete disabled");
      return;
    }

    console.log(
      "🗺️ Initializing Google Places Autocomplete for Route Optimizer"
    );

    // Autocomplete for starting location
    const startLocationInput = document.getElementById("startLocation");
    if (startLocationInput) {
      const autocompleteStart = new google.maps.places.Autocomplete(
        startLocationInput,
        {
          types: ["address"],
          componentRestrictions: { country: "us" },
        }
      );

      autocompleteStart.addListener("place_changed", () => {
        const place = autocompleteStart.getPlace();
        if (place.formatted_address) {
          startLocationInput.value = place.formatted_address;
          console.log(
            "🗺️ Starting location selected:",
            place.formatted_address
          );
        }
      });
    }

    // Autocomplete for existing destination inputs
    this.addAutocompleteToDestinationInputs();

    console.log("🗺️ Google Places Autocomplete initialized");
  }

  addAutocompleteToDestinationInputs() {
    if (typeof google === "undefined" || !google.maps || !google.maps.places) {
      console.log("🗺️ Google Places not available, skipping autocomplete");
      return;
    }

    const destinationInputs = document.querySelectorAll(
      ".destination-address-input"
    );

    console.log(
      `🗺️ Found ${destinationInputs.length} destination inputs to check for autocomplete`
    );

    destinationInputs.forEach((input, index) => {
      // Check if autocomplete already initialized
      if (input.dataset.autocompleteInitialized === "true") {
        console.log(`🗺️ Input ${index + 1} already has autocomplete`);
        return;
      }

      console.log(`🗺️ Adding autocomplete to input ${index + 1}`);

      const autocomplete = new google.maps.places.Autocomplete(input, {
        types: ["address"],
        componentRestrictions: { country: "us" },
      });

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place.formatted_address) {
          input.value = place.formatted_address;
          console.log("🗺️ Destination selected:", place.formatted_address);
        }
      });

      // Mark as initialized
      input.dataset.autocompleteInitialized = "true";
      console.log(`🗺️ Autocomplete initialized for input ${index + 1}`);
    });
  }

  saveSettings() {
    const settings = {
      maxLegMiles: parseInt(document.getElementById("maxLegMiles").value),
      splitEnabled: document.getElementById("splitEnabled").checked,
      optimizeEnabled: document.getElementById("optimizeEnabled").checked,
      optimizationMode:
        document.getElementById("optimizationMode")?.value || "distance",
      maxDailyHours:
        parseInt(document.getElementById("maxDailyHours")?.value) || 8,
      maxStopsPerDay:
        parseInt(document.getElementById("maxStopsPerDay")?.value) || 6,
      timePerAppointment:
        parseInt(document.getElementById("timePerAppointment")?.value) || 30,
    };

    localStorage.setItem("cc_route_settings", JSON.stringify(settings));
  }

  // =================================
  // DRAG-AND-DROP CLAIM ROUTING
  // =================================

  initializeDropZone() {
    const dropZone = document.getElementById('claimDropZone');
    const routeClaimsBtn = document.getElementById('routeClaims');
    const clearClaimsBtn = document.getElementById('clearClaims');
    const pasteClaimsBtn = document.getElementById('pasteClaimsBtn');

    if (!dropZone) {
      console.warn('Drop zone element not found');
      return;
    }

    // Desktop drag-drop event listeners
    dropZone.addEventListener('dragover', (e) => this.handleDragOver(e));
    dropZone.addEventListener('drop', (e) => this.handleDrop(e));
    dropZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));

    // Button event listeners
    if (routeClaimsBtn) {
      routeClaimsBtn.addEventListener('click', () => this.routeFromClaims());
    }

    if (clearClaimsBtn) {
      clearClaimsBtn.addEventListener('click', () => {
        this.routeStops = [];
        this.renderDroppedClaims();
        this.saveClaims();
      });
    }

    if (pasteClaimsBtn) {
      pasteClaimsBtn.addEventListener('click', () => this.pasteClaimsFromClipboard());
    }

    // Event delegation for dynamically created elements
    dropZone.addEventListener('click', (e) => {
      // Handle remove button clicks
      if (e.target.classList.contains('claim-remove-btn') || e.target.closest('.claim-remove-btn')) {
        const card = e.target.closest('.claim-card');
        if (card) {
          const claimId = card.dataset.claimId;
          this.removeClaimFromRoute(claimId);
        }
      }
    });

    // Handle priority select changes
    dropZone.addEventListener('change', (e) => {
      if (e.target.classList.contains('claim-priority-select')) {
        const card = e.target.closest('.claim-card');
        if (card) {
          const claimId = card.dataset.claimId;
          const claim = this.routeStops.find(stop => stop.id === claimId);
          if (claim) {
            claim.priority = e.target.value;
            this.saveClaims();
          }
        }
      }
    });

    console.log('Drop zone initialized successfully');
  }

  handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    const dropZone = document.getElementById('claimDropZone');
    if (dropZone) {
      dropZone.classList.add('drag-over');
    }
  }

  handleDragLeave(e) {
    const dropZone = document.getElementById('claimDropZone');
    if (dropZone && !dropZone.contains(e.relatedTarget)) {
      dropZone.classList.remove('drag-over');
    }
  }

  handleDrop(e) {
    e.preventDefault();
    const dropZone = document.getElementById('claimDropZone');
    if (dropZone) {
      dropZone.classList.remove('drag-over');
    }

    // Try to get JSON data from drop event
    let data = e.dataTransfer.getData('application/json');
    if (!data) {
      data = e.dataTransfer.getData('text/plain');
    }

    if (!data) {
      console.warn('No data in drop event');
      this.showError('No data received. Make sure you are dragging claim data from Cipher Dispatch.');
      return;
    }

    // Check if it looks like JSON before trying to parse
    const trimmedData = data.trim();
    if (!trimmedData.startsWith('{') && !trimmedData.startsWith('[')) {
      console.warn('Dropped data is not JSON:', trimmedData.substring(0, 50));
      this.showError('Invalid data format. Please drag claims from Cipher Dispatch, not links or text.');
      return;
    }

    try {
      const claimData = JSON.parse(data);

      // Handle both single claim and array of claims
      if (Array.isArray(claimData)) {
        claimData.forEach(claim => this.addClaimToRoute(claim));
      } else {
        this.addClaimToRoute(claimData);
      }
    } catch (error) {
      console.error('Error parsing dropped data:', error);
      this.showError('Invalid JSON format. Please ensure claims are properly formatted from Cipher Dispatch.');
    }
  }

  addClaimToRoute(claimData) {
    // Validate required fields
    if (!claimData.id || !claimData.lat || !claimData.lng || !claimData.addressLine1) {
      console.error('Missing required fields:', claimData);
      this.showError('Claim is missing required fields (id, lat, lng, addressLine1)');
      return;
    }

    // Check for duplicates
    if (this.isDuplicateClaim(claimData.id)) {
      // Flash the existing card
      const existingCard = document.querySelector(`.claim-card[data-claim-id="${claimData.id}"]`);
      if (existingCard) {
        existingCard.classList.add('duplicate-flash');
        setTimeout(() => {
          existingCard.classList.remove('duplicate-flash');
        }, 500);
      }
      this.showError('This claim has already been added to the route');
      return;
    }

    // Normalize data with defaults
    const normalizedClaim = {
      id: claimData.id,
      claimNumber: claimData.claimNumber || claimData.claim_number || 'N/A',
      customerName: claimData.customerName || claimData.customer_name || 'Unknown',
      firmName: claimData.firmName || claimData.firm_name || 'Unknown',
      addressLine1: claimData.addressLine1 || claimData.address_line1,
      city: claimData.city || '',
      state: claimData.state || '',
      postalCode: claimData.postalCode || claimData.postal_code || '',
      lat: claimData.lat,
      lng: claimData.lng,
      phone: claimData.phone || '',
      priority: claimData.priority || 'normal'
    };

    // Get firm color
    normalizedClaim.firmColor = this.firmColors[normalizedClaim.firmName] || this.firmColors['default'];

    // Add to routeStops array
    this.routeStops.push(normalizedClaim);

    // Update UI
    this.renderDroppedClaims();
    this.saveClaims();

    console.log('Claim added successfully:', normalizedClaim);
  }

  isDuplicateClaim(id) {
    return this.routeStops.some(stop => stop.id === id);
  }

  removeClaimFromRoute(id) {
    this.routeStops = this.routeStops.filter(stop => stop.id !== id);
    this.renderDroppedClaims();
    this.saveClaims();
    console.log('Claim removed:', id);
  }

  renderDroppedClaims() {
    const dropZone = document.getElementById('claimDropZone');
    const actionsDiv = document.querySelector('.drop-zone-actions');
    const routeClaimsBtn = document.getElementById('routeClaims');
    const routeClaimsText = document.querySelector('.route-claims-text');

    if (!dropZone) return;

    // Clear drop zone
    dropZone.innerHTML = '';

    // If no claims, show empty state
    if (this.routeStops.length === 0) {
      dropZone.classList.remove('has-claims');
      if (actionsDiv) actionsDiv.style.display = 'none';

      dropZone.innerHTML = `
        <div class="drop-zone-empty-state">
          <span class="empty-icon">📦</span>
          <p>Drop claims here from Cipher Dispatch</p>
          <button id="pasteClaimsBtn" class="secondary-btn">
            <span class="btn-icon">📋</span>
            Paste Claims (Mobile)
          </button>
        </div>
      `;

      // Re-attach paste button listener
      const pasteBtn = document.getElementById('pasteClaimsBtn');
      if (pasteBtn) {
        pasteBtn.addEventListener('click', () => this.pasteClaimsFromClipboard());
      }

      return;
    }

    // Show actions and update button state
    dropZone.classList.add('has-claims');
    if (actionsDiv) actionsDiv.style.display = 'flex';

    // Render claim cards
    this.routeStops.forEach(claim => {
      const card = document.createElement('div');
      card.className = 'claim-card';
      card.dataset.claimId = claim.id;

      card.innerHTML = `
        <div class="claim-header">
          <span class="firm-badge" style="background: ${claim.firmColor}">${claim.firmName}</span>
          <button class="claim-remove-btn" title="Remove claim">×</button>
        </div>
        <div class="claim-body">
          <div class="claim-customer">${claim.customerName}</div>
          <div class="claim-address">${claim.addressLine1}${claim.city ? ', ' + claim.city : ''}${claim.state ? ', ' + claim.state : ''}</div>
          <div class="claim-number">#${claim.claimNumber}</div>
        </div>
        <div class="claim-footer">
          <select class="claim-priority-select">
            <option value="normal" ${claim.priority === 'normal' ? 'selected' : ''}>🔵 Normal</option>
            <option value="high" ${claim.priority === 'high' ? 'selected' : ''}>🟡 High</option>
            <option value="urgent" ${claim.priority === 'urgent' ? 'selected' : ''}>🔴 Urgent</option>
          </select>
        </div>
      `;

      dropZone.appendChild(card);
    });

    // Update route button
    if (routeClaimsBtn) {
      routeClaimsBtn.disabled = this.routeStops.length < 2;
      if (routeClaimsText) {
        routeClaimsText.textContent = `Route ${this.routeStops.length} Claim${this.routeStops.length !== 1 ? 's' : ''}`;
      }
    }
  }

  routeFromClaims() {
    if (this.routeStops.length < 2) {
      this.showError('You need at least 2 claims to build a route');
      return;
    }

    // Sort by priority (urgent > high > normal)
    const priorityValues = { urgent: 3, high: 2, normal: 1 };
    const sorted = [...this.routeStops].sort((a, b) => {
      return priorityValues[b.priority] - priorityValues[a.priority];
    });

    // Clear existing destinations list
    const destList = document.getElementById('destinationsList');
    if (!destList) {
      this.showError('Destinations list not found');
      return;
    }
    destList.innerHTML = '';

    // Create destination inputs from claims
    sorted.forEach(claim => {
      // Add a destination
      this.addDestination();

      // Get the last added destination
      const destinations = destList.querySelectorAll('.destination-input');
      const lastDest = destinations[destinations.length - 1];

      if (lastDest) {
        const input = lastDest.querySelector('.destination-address-input');
        const priority = lastDest.querySelector('.priority-select');

        if (input) {
          // Format full address
          let address = claim.addressLine1;
          if (claim.city) address += ', ' + claim.city;
          if (claim.state) address += ', ' + claim.state;
          if (claim.postalCode) address += ' ' + claim.postalCode;

          input.value = address;
        }

        if (priority) {
          priority.value = claim.priority;
        }

        // Store claim metadata for reference
        lastDest.dataset.claimId = claim.id;
        lastDest.dataset.claimNumber = claim.claimNumber;
      }
    });

    // Scroll to top to see the destinations
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Auto-trigger optimization after a brief delay
    setTimeout(() => {
      this.optimizeRoute();
    }, 500);

    console.log(`Routing ${this.routeStops.length} claims`);
  }

  saveClaims() {
    try {
      localStorage.setItem('cc_route_stops', JSON.stringify(this.routeStops));
    } catch (error) {
      console.error('Error saving claims to localStorage:', error);
    }
  }

  loadSavedClaims() {
    try {
      const saved = localStorage.getItem('cc_route_stops');
      if (saved) {
        const claims = JSON.parse(saved);
        if (Array.isArray(claims)) {
          this.routeStops = claims;
          this.renderDroppedClaims();
          console.log(`Loaded ${claims.length} saved claims`);
        }
      }
    } catch (error) {
      console.error('Error loading saved claims:', error);
    }
  }

  async pasteClaimsFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      const data = JSON.parse(text);

      if (Array.isArray(data)) {
        data.forEach(claim => this.addClaimToRoute(claim));
        this.showError(`Added ${data.length} claims from clipboard`, 'success');
      } else if (typeof data === 'object') {
        this.addClaimToRoute(data);
        this.showError('Added 1 claim from clipboard', 'success');
      } else {
        this.showError('Clipboard data is not valid claim JSON');
      }
    } catch (error) {
      console.error('Error pasting claims:', error);
      this.showError('Could not paste claims. Copy valid JSON first.');
    }
  }

  // =================================
  // LOCALSTORAGE ROUTE PERSISTENCE
  // =================================

  /**
   * Check if demo mode is active
   */
  isDemoMode() {
    return sessionStorage.getItem('demo_mode') === 'true';
  }

  /**
   * Auto-save route state to localStorage on every meaningful change
   * Key: cipher_optimizer_draft_state
   */
  autoSaveRouteState() {
    // Don't save in demo mode
    if (this.isDemoMode()) {
      console.log('📁 Demo mode active - skipping auto-save');
      return;
    }

    if (!this.currentRoute && !this.editingRouteId) {
      console.log('📁 No route to save');
      return;
    }

    try {
      const routeState = {
        startLocation: this.startLocation,
        destinations: [...(this.destinations || [])],
        territoryType: this.settings?.territoryType,
        settings: { ...this.settings },
        days: {},
        route: this.currentRoute,
        originalRoute: this.currentOriginalRoute,
        editingRouteId: this.editingRouteId || null,
        editingRouteDate: this.editingRouteDate || null,
        lastUpdated: Date.now()
      };

      // Store each day's route data
      if (this.currentRoute && this.currentRoute.days) {
        this.currentRoute.days.forEach((day, index) => {
          const dayName = this.getDayNameFromIndex(index);
          routeState.days[dayName] = day;
        });
      }

      localStorage.setItem('cipher_optimizer_draft_state', JSON.stringify(routeState));
      console.log('📁 Route state auto-saved to cipher_optimizer_draft_state');
    } catch (error) {
      console.error('📁 Error auto-saving route state:', error);
    }
  }

  /**
   * Save a specific day's route to SessionManager AND optionally Supabase
   * @param {string} dayName - day identifier (e.g. 'monday', 'day_1')
   * @param {string|null} [routeDate] - optional YYYY-MM-DD date; skip Supabase if null
   */
  async saveDayRoute(dayName, routeDate) {
    // Don't save in demo mode
    if (this.isDemoMode()) {
      this.showToast('Cannot save routes in demo mode');
      return;
    }

    if (!this.currentRoute || !this.currentRoute.days) {
      this.showError('No route to save');
      return;
    }

    const dayIndex = this.getDayIndexFromName(dayName);
    if (dayIndex === -1 || !this.currentRoute.days[dayIndex]) {
      this.showError('Invalid day selected');
      return;
    }

    const dayData = this.currentRoute.days[dayIndex];

    try {
      const stops = dayData.stops || [];
      const startAddress = this.startLocation || stops[0] || 'Unknown';
      const endAddress = stops.length > 1 ? stops[stops.length - 1] : startAddress;
      const totalMiles = dayData.totalMiles || 0;

      // 1. Save to SessionManager (skip during edits — editing updates in-place)
      if (!this.editingRouteId && window.SessionManager) {
        const sessionRouteData = {
          dayName: dayName,
          startLocation: startAddress,
          endAddress: endAddress,
          totalMiles: totalMiles,
          date: routeDate || null,
          day: dayData,
          destinations: (this.destinations || []).filter((dest) => {
            return stops.some(stop => stop.includes(dest.address) || dest.address.includes(stop));
          }),
          settings: { ...this.settings }
        };
        window.SessionManager.addRouteToSession(sessionRouteData);
        console.log(`📁 Saved ${dayName} route to SessionManager`);
      }

      // Clear start_fresh flag so resume modal can show again next session
      sessionStorage.removeItem('cipher_start_fresh');

      // 2. Persist to Supabase — edit-update or new-save
      if (this.editingRouteId && window.RouteService) {
        // EDIT PATH: update existing row in-place
        const routeData = {
          date: routeDate || this.editingRouteDate || null,
          start_address: startAddress,
          end_address: endAddress,
          total_miles: totalMiles,
          stop_count: Math.max(stops.length, 1)
        };

        const result = await window.RouteService.updateRoute(this.editingRouteId, routeData);

        if (result.success) {
          this.showToast(`Route updated (${totalMiles} mi).`);
          console.log(`✅ Route updated in Supabase:`, result.data);
        } else {
          console.error('❌ Supabase update failed:', result.error);
          this.showToast(`Update failed: ${result.error}`);
        }

        // Clear edit state regardless of outcome
        this.clearEditState();

      } else if (routeDate && window.RouteService) {
        // NEW SAVE PATH: create new row + activate
        const routeData = {
          date: routeDate,
          start_address: startAddress,
          end_address: endAddress,
          total_miles: totalMiles,
          stop_count: Math.max(stops.length, 1)
        };

        const result = await window.RouteService.saveRoute(routeData);

        if (result.success) {
          const activateResult = await window.RouteService.activateRoute(result.data.id);

          if (activateResult.success) {
            this.showToast(`Route saved (${totalMiles} mi). Ready to close in My Routes.`);
            console.log(`✅ Route persisted to Supabase (active):`, activateResult.data);
          } else {
            this.showToast(`Route saved as draft. Activate it in My Routes.`);
            console.warn('Route saved but activation failed:', activateResult.error);
          }
        } else {
          console.error('❌ Supabase save failed:', result.error);
          this.showToast(`Route saved to session only. Database sync failed.`);
        }
      } else if (!routeDate) {
        this.showToast(`${this.formatDayName(dayName)} route saved to session.`);
      } else {
        this.showToast(`${this.formatDayName(dayName)} route saved to session.`);
        console.warn('RouteService not available - saved to session only');
      }

      // Close the save modal
      this.closeSaveDayModal();

    } catch (error) {
      console.error('📁 Error saving route:', error);
      this.showError('Failed to save route: ' + error.message);
    }
  }

  /**
   * Calculate the actual date for a given day name
   * Returns YYYY-MM-DD format
   */
  calculateDateForDay(dayName) {
    const dayMap = {
      'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
      'thursday': 4, 'friday': 5, 'saturday': 6
    };

    const today = new Date();
    const todayDay = today.getDay();
    const targetDay = dayMap[dayName.toLowerCase()];

    if (targetDay === undefined) {
      // If dayName is like "day_1", "day_2", use today + offset
      const match = dayName.match(/day_(\d+)/i);
      if (match) {
        const offset = parseInt(match[1], 10) - 1;
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + offset);
        return targetDate.toISOString().split('T')[0];
      }
      // Default to today
      return today.toISOString().split('T')[0];
    }

    // Calculate days until the target day (this week or next)
    let daysUntil = targetDay - todayDay;
    if (daysUntil < 0) daysUntil += 7; // Next week

    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntil);
    return targetDate.toISOString().split('T')[0];
  }

  /**
   * Check for saved routes on page load and show restore modal if found
   * Checks: draft state + SessionManager history
   */
  checkForSavedRoutes() {
    // Check if user clicked "Start Fresh" this session - suppress modal
    if (sessionStorage.getItem('cipher_start_fresh') === 'true') {
      console.log('📁 Start Fresh active - suppressing resume modal');
      return;
    }

    const draftState = localStorage.getItem('cipher_optimizer_draft_state');
    const sessionHistory = window.SessionManager ? window.SessionManager.getSessionHistory() : [];
    const activeSession = window.SessionManager ? window.SessionManager.getActiveSession() : null;

    const hasDraft = !!draftState;
    const hasHistory = sessionHistory.length > 0;
    const hasActiveSession = activeSession && (activeSession.routeIds || []).length > 0;

    if (hasDraft || hasHistory || hasActiveSession) {
      this.showRestoreModal(hasDraft, activeSession, sessionHistory);
    }
  }

  /**
   * Show the restore route modal
   * @param {boolean} hasDraft - whether a draft state exists
   * @param {Object|null} activeSession - current active session
   * @param {Array} sessionHistory - past session summaries
   */
  showRestoreModal(hasDraft, activeSession, sessionHistory) {
    // Build session history buttons
    const historyButtons = (sessionHistory || []).slice(0, 5).map(s => `
      <button class="restore-day-btn modal-btn modal-btn-secondary" onclick="window.routeOptimizer.restoreSession('${s.id || s.sessionId}')" style="justify-content: flex-start; width: 100%;">
        <span>📂</span>
        <span>${s.name} (${s.routeCount || 0} routes)</span>
      </button>
    `).join('');

    // Build active session info
    const activeInfo = activeSession && (activeSession.routeIds || []).length > 0 ? `
      <button class="restore-day-btn modal-btn modal-btn-secondary" onclick="window.routeOptimizer.restoreActiveSession()" style="justify-content: flex-start; width: 100%;">
        <span>📋</span>
        <span>Continue ${activeSession.name} (${activeSession.routeIds.length} routes)</span>
      </button>
    ` : '';

    // Create modal HTML
    const modalHTML = `
      <div id="restoreRouteModal" class="route-map-modal">
        <div class="modal-container" style="max-width: 500px; height: auto; margin: auto;">
          <div class="modal-header">
            <div class="modal-title">
              <span>📂</span>
              <span>Resume a Saved Route?</span>
            </div>
            <button class="modal-close-btn" onclick="window.routeOptimizer.closeRestoreModal()">×</button>
          </div>
          <div class="modal-content" style="padding: var(--cipher-space-xl); display: block;">
            <p style="color: var(--cipher-text-secondary); margin-bottom: var(--cipher-space-lg);">
              We found saved routes. Would you like to restore one?
            </p>
            <div class="restore-options" style="display: flex; flex-direction: column; gap: var(--cipher-space-md);">
              ${hasDraft ? `
                <button class="restore-last-btn modal-btn modal-btn-secondary" onclick="window.routeOptimizer.restoreLastRoute()" style="justify-content: flex-start; width: 100%;">
                  <span>🔄</span>
                  <span>Resume Draft (unsaved work)</span>
                </button>
              ` : ''}
              ${activeInfo}
              ${historyButtons}
              <button class="start-fresh-btn modal-btn modal-btn-primary" onclick="window.routeOptimizer.startFresh()" style="justify-content: center; width: 100%; margin-top: var(--cipher-space-md);">
                <span>✨</span>
                <span>Start Fresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('restoreRouteModal');
    if (existingModal) {
      existingModal.remove();
    }

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Show modal
    setTimeout(() => {
      document.getElementById('restoreRouteModal').classList.add('active');
      document.body.style.overflow = 'hidden';
    }, 100);
  }

  /**
   * Close the restore modal
   */
  closeRestoreModal() {
    const modal = document.getElementById('restoreRouteModal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
      setTimeout(() => modal.remove(), 300);
    }
  }

  /**
   * Start Fresh - fully reset route state and suppress resume modal for this session
   * Called when user clicks "Start Fresh" in the restore modal
   */
  startFresh() {
    try {
      // 1. Clear draft, edit payload, and legacy route-related localStorage keys
      localStorage.removeItem('cipher_optimizer_draft_state');
      localStorage.removeItem('cipher_edit_route');
      localStorage.removeItem('cc_route_export');
      localStorage.removeItem('cc_route_settings');
      localStorage.removeItem('cc_route_stops');

      // Remove edit banner if present
      const editBanner = document.getElementById('editModeBanner');
      if (editBanner) editBanner.remove();

      // Archive active session to history via SessionManager
      if (window.SessionManager) {
        window.SessionManager.startFresh();
      }

      // 2. Set session flag to suppress resume modal for this session
      sessionStorage.setItem('cipher_start_fresh', 'true');

      // 3. Reset in-memory route state
      this.resetRouteState();

      // 4. Close the modal
      this.closeRestoreModal();

      // 5. Clear UI elements
      this.renderEmptyRouteState();

      // 6. Clear form inputs
      const startInput = document.getElementById('startLocation');
      if (startInput) startInput.value = '';

      const destList = document.getElementById('destinationsList');
      if (destList) destList.innerHTML = '';

      this.showToast('Started fresh! All saved routes cleared.');
      console.log('📁 Start Fresh: Cleared all route data and suppressed resume modal');
    } catch (error) {
      console.error('📁 Error in startFresh:', error);
      this.showError('Failed to start fresh');
    }
  }

  /**
   * Restore a specific day's route (legacy - kept for compatibility with migrated data)
   */
  restoreDayRoute(dayName) {
    try {
      // Try legacy key first (for migrated data), then fall back
      const legacyRaw = localStorage.getItem('cipher_routes_by_day');
      const savedDays = legacyRaw ? JSON.parse(legacyRaw) : {};
      const dayData = savedDays[dayName];

      if (!dayData) {
        this.showError('Could not find saved route for ' + this.formatDayName(dayName));
        return;
      }

      this.closeRestoreModal();

      // Restore start location
      if (dayData.startLocation) {
        const startInput = document.getElementById('startLocation');
        if (startInput) startInput.value = dayData.startLocation;
      }

      // Clear and restore destinations
      const destList = document.getElementById('destinationsList');
      if (destList) destList.innerHTML = '';

      if (dayData.day && dayData.day.stops) {
        // Restore stops (excluding first and last which are start/return)
        const stops = dayData.day.stops.slice(1, -1);
        stops.forEach(stop => {
          this.addDestination();
          const inputs = destList.querySelectorAll('.destination-address-input');
          const lastInput = inputs[inputs.length - 1];
          if (lastInput) lastInput.value = stop;
        });
      }

      // Restore settings
      if (dayData.settings) {
        this.applySettings(dayData.settings);
      }

      // Store the restored route data
      this.currentRoute = { days: [dayData.day], overall: this.calculateOverall([dayData.day]) };

      this.showToast(`${this.formatDayName(dayName)} route restored!`);
      console.log(`📁 Restored ${dayName} route`);
    } catch (error) {
      console.error('📁 Error restoring day route:', error);
      this.showError('Failed to restore route');
    }
  }

  /**
   * Restore a session from SessionManager history
   */
  restoreSession(sessionId) {
    try {
      if (!window.SessionManager) {
        this.showError('SessionManager not available');
        return;
      }

      const { session, routes } = window.SessionManager.restoreSession(sessionId);
      if (!session) {
        this.showError('Session not found');
        return;
      }

      this.closeRestoreModal();

      if (routes.length > 0) {
        // Restore the most recent route from the session
        const latestRoute = routes.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0))[0];
        const data = latestRoute.data || latestRoute || {};

        if (data.startLocation) {
          const startInput = document.getElementById('startLocation');
          if (startInput) startInput.value = data.startLocation;
        }

        if (data.destinations) {
          const destList = document.getElementById('destinationsList');
          if (destList) {
            destList.innerHTML = '';
            data.destinations.forEach(dest => {
              this.addDestination();
              const inputs = destList.querySelectorAll('.destination-input');
              const lastDest = inputs[inputs.length - 1];
              if (lastDest) {
                const input = lastDest.querySelector('.destination-address-input');
                if (input) input.value = dest.address || dest;
              }
            });
          }
        }

        if (data.settings) {
          this.applySettings(data.settings);
        }
      }

      this.showToast(`Session "${session.name}" restored with ${routes.length} route(s)!`);
      console.log('📁 Restored session:', sessionId);
    } catch (error) {
      console.error('📁 Error restoring session:', error);
      this.showError('Failed to restore session');
    }
  }

  /**
   * Continue the active session (re-enter without archiving)
   */
  restoreActiveSession() {
    this.closeRestoreModal();
    this.showToast('Continuing active session.');
    console.log('📁 Continuing active session');
  }

  /**
   * Restore the last draft route state
   */
  restoreLastRoute() {
    try {
      const lastRoute = JSON.parse(localStorage.getItem('cipher_optimizer_draft_state') || '{}');

      if (!lastRoute.startLocation) {
        this.showError('Could not find last route data');
        return;
      }

      this.closeRestoreModal();

      // Restore start location
      const startInput = document.getElementById('startLocation');
      if (startInput) startInput.value = lastRoute.startLocation;

      // Clear and restore destinations
      const destList = document.getElementById('destinationsList');
      if (destList) destList.innerHTML = '';

      if (lastRoute.destinations) {
        lastRoute.destinations.forEach(dest => {
          this.addDestination();
          const inputs = destList.querySelectorAll('.destination-input');
          const lastDest = inputs[inputs.length - 1];
          if (lastDest) {
            const input = lastDest.querySelector('.destination-address-input');
            const prioritySelect = lastDest.querySelector('.priority-select');
            if (input) input.value = dest.address;
            if (prioritySelect) prioritySelect.value = dest.priority || 'normal';
          }
        });
      }

      // Restore settings
      if (lastRoute.settings) {
        this.applySettings(lastRoute.settings);
      }

      // Restore route data
      if (lastRoute.route) {
        this.currentRoute = lastRoute.route;
        this.currentOriginalRoute = lastRoute.originalRoute;

        // Show results and modal
        this.showRouteModal(this.currentRoute, this.currentOriginalRoute);
      }

      // Restore edit state if draft was an edit-in-progress
      if (lastRoute.editingRouteId) {
        this.editingRouteId = lastRoute.editingRouteId;
        this.editingRouteDate = lastRoute.editingRouteDate || null;
        this.showEditModeBanner({
          date: this.editingRouteDate,
          total_miles: lastRoute.route?.overall?.miles || null,
          status: null
        });
        console.log('📝 Edit state restored from draft:', this.editingRouteId);
      }

      this.showToast(lastRoute.editingRouteId ? 'Edit session restored!' : 'Last session restored!');
      console.log('📁 Restored last route');
    } catch (error) {
      console.error('📁 Error restoring last route:', error);
      this.showError('Failed to restore route');
    }
  }

  /**
   * Apply settings to form fields
   */
  applySettings(settings) {
    if (settings.territoryType) {
      const el = document.getElementById('territoryType');
      if (el) el.value = settings.territoryType;
    }
    if (settings.maxDailyHours) {
      const el = document.getElementById('maxDailyHours');
      if (el) el.value = settings.maxDailyHours;
    }
    if (settings.maxStopsPerDay) {
      const el = document.getElementById('maxStopsPerDay');
      if (el) el.value = settings.maxStopsPerDay;
    }
    if (settings.maxLegMiles) {
      const el = document.getElementById('maxLegMiles');
      if (el) el.value = settings.maxLegMiles;
    }
    if (settings.timePerAppointment) {
      const el = document.getElementById('timePerAppointment');
      if (el) el.value = settings.timePerAppointment;
    }
    if (settings.geographicClustering !== undefined) {
      const el = document.getElementById('geographicClustering');
      if (el) el.checked = settings.geographicClustering;
    }
    if (settings.optimizeEnabled !== undefined) {
      const el = document.getElementById('optimizeEnabled');
      if (el) el.checked = settings.optimizeEnabled;
    }
    if (settings.splitEnabled !== undefined) {
      const el = document.getElementById('splitEnabled');
      if (el) el.checked = settings.splitEnabled;
    }
  }

  /**
   * Calculate overall stats from days array
   */
  calculateOverall(days) {
    const totalMiles = days.reduce((sum, day) => sum + (day.totalMiles || 0), 0);
    const totalMinutes = days.reduce((sum, day) => sum + (day.totalMinutes || 0), 0);
    return {
      miles: Math.round(totalMiles * 10) / 10,
      minutes: Math.round(totalMinutes),
      totalDays: days.length
    };
  }

  /**
   * Edit a specific day's route (called from modal)
   */
  editDayRoute(dayIndex) {
    if (!this.currentRoute || !this.currentRoute.days || !this.currentRoute.days[dayIndex]) {
      this.showError('No route data for this day');
      return;
    }

    const day = this.currentRoute.days[dayIndex];

    // Close the visualization modal
    const modal = document.getElementById('routeMapModal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }

    // Clear existing destinations
    const destList = document.getElementById('destinationsList');
    if (destList) destList.innerHTML = '';

    // Load only this day's stops into the form (excluding start and return)
    const stops = day.stops.slice(1, -1);
    stops.forEach(stop => {
      this.addDestination();
      const inputs = destList.querySelectorAll('.destination-address-input');
      const lastInput = inputs[inputs.length - 1];
      if (lastInput) lastInput.value = stop;
    });

    // Store which day we're editing for save functionality
    this.editingDayIndex = dayIndex;

    this.showToast(`Editing Day ${dayIndex + 1} - ${stops.length} stops loaded`);
    console.log(`📁 Loaded Day ${dayIndex + 1} for editing`);
  }

  /**
   * Merge a re-optimized day back into the full route
   * Preserves other days that weren't being edited
   * @param {Object} newDayRoute - The re-optimized route (may contain 1+ days)
   * @param {number} editedDayIndex - Which day in the original route was being edited
   * @returns {Object} - Complete merged route with all days
   */
  mergeEditedDay(newDayRoute, editedDayIndex) {
    if (!this.currentRoute?.days || editedDayIndex < 0) {
      console.warn('🎵 Cannot merge: no existing route or invalid day index');
      return newDayRoute;
    }

    const originalDays = [...this.currentRoute.days];
    const newDays = newDayRoute.days || [];

    console.log(`🎵 Merging: replacing Day ${editedDayIndex + 1} with ${newDays.length} new day(s)`);

    if (newDays.length === 1) {
      // Simple case: edited day is still one day
      // Replace just that day, keeping the original label
      originalDays[editedDayIndex] = {
        ...newDays[0],
        label: `Day ${editedDayIndex + 1}`
      };
    } else if (newDays.length > 1) {
      // Complex case: edited day split into multiple days
      // Remove the old day and insert the new days
      originalDays.splice(editedDayIndex, 1, ...newDays);

      // Relabel all days sequentially
      originalDays.forEach((day, idx) => {
        day.label = `Day ${idx + 1}`;
      });
    } else {
      // No new days (shouldn't happen, but handle gracefully)
      console.warn('🎵 No new days to merge, keeping original');
      return this.currentRoute;
    }

    // Recalculate overall stats
    const overall = this.calculateOverallStats(originalDays);

    console.log(`🎵 Merge complete: ${originalDays.length} total days`);

    return {
      days: originalDays,
      overall: overall
    };
  }

  /**
   * Recalculate overall route statistics from all days
   * @param {Array} days - Array of day objects
   * @returns {Object} - Overall statistics
   */
  calculateOverallStats(days) {
    if (!days || days.length === 0) {
      return { miles: 0, minutes: 0, totalDays: 0, avgStopsPerDay: 0, avgEfficiency: 0 };
    }

    const totalMiles = days.reduce((sum, day) => sum + (day.totalMiles || 0), 0);
    const totalMinutes = days.reduce((sum, day) => sum + (day.totalMinutes || 0), 0);
    const totalStops = days.reduce((sum, day) => sum + (day.stopsCount || 0), 0);
    const totalEfficiency = days.reduce((sum, day) => sum + (day.efficiency || 0), 0);

    return {
      miles: Math.round(totalMiles * 10) / 10,
      minutes: Math.round(totalMinutes),
      totalDays: days.length,
      avgStopsPerDay: Math.round((totalStops / days.length) * 10) / 10,
      avgEfficiency: Math.round(totalEfficiency / days.length)
    };
  }

  /**
   * Clear all saved routes from localStorage and SessionManager
   */
  clearSavedRoutes() {
    if (!confirm('Are you sure you want to clear all saved routes? This cannot be undone.')) {
      return;
    }

    try {
      // Clear draft state
      localStorage.removeItem('cipher_optimizer_draft_state');

      // Clear SessionManager active session
      if (window.SessionManager) {
        window.SessionManager.startFresh();
      }

      // Clear in-memory state and re-render UI
      this.resetRouteState();
      this.renderEmptyRouteState();

      this.showToast('All saved routes cleared');
      console.log('📁 Cleared all saved routes and reset UI');
    } catch (error) {
      console.error('📁 Error clearing saved routes:', error);
      this.showError('Failed to clear saved routes');
    }
  }

  /**
   * Reset all in-memory route state
   * Call this when clearing routes or starting fresh
   */
  resetRouteState() {
    // Clear route data
    this.currentRoute = null;
    this.currentOriginalRoute = null;
    this.routeStops = [];

    // Clear editing state
    this.editingDayIndex = null;
    this.editingRouteId = null;
    this.editingRouteDate = null;
    this.activeModalDay = 0;

    // Clear clustering state
    this.clusterOverrideDecisions.clear();
    this._distanceCache.clear();

    // Clear any pending override modal state
    this._overrideResolve = null;
    this._pendingCluster = null;

    console.log('📁 Route state reset');
  }

  /**
   * Re-render UI to empty state (no routes displayed)
   * Does not reload the page
   */
  renderEmptyRouteState() {
    // Close any open modals
    const routeModal = document.getElementById('routeMapModal');
    if (routeModal) {
      routeModal.classList.remove('active');
    }

    const overrideModal = document.getElementById('clusterOverrideModal');
    if (overrideModal) {
      overrideModal.classList.remove('active');
    }

    const restoreModal = document.getElementById('restoreRouteModal');
    if (restoreModal) {
      restoreModal.remove(); // This one is dynamically created
    }

    // Restore body scroll
    document.body.style.overflow = '';

    // Hide the results section
    const resultsSection = document.getElementById('routeResults');
    if (resultsSection) {
      resultsSection.style.display = 'none';
    }

    // Clear route output
    const routeOutput = document.getElementById('routeOutput');
    if (routeOutput) {
      routeOutput.innerHTML = '';
    }

    // Clear modal content
    const dayTabs = document.getElementById('dayTabs');
    if (dayTabs) {
      dayTabs.innerHTML = '';
    }

    const modalTimeline = document.getElementById('modalTimeline');
    if (modalTimeline) {
      modalTimeline.innerHTML = '';
    }

    const modalStats = document.getElementById('modalStats');
    if (modalStats) {
      modalStats.innerHTML = '';
    }

    // Reset optimize button state
    const optimizeBtn = document.getElementById('optimizeRoute');
    if (optimizeBtn) {
      optimizeBtn.disabled = false;
      optimizeBtn.textContent = optimizeBtn.textContent.includes('Optimizing')
        ? '🗺️ Optimize Route'
        : optimizeBtn.textContent;
    }

    console.log('📁 UI reset to empty state');
  }

  /**
   * Get day name from index (0 = monday, etc.)
   */
  getDayNameFromIndex(index) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    return days[index] || `day_${index + 1}`;
  }

  /**
   * Get day index from name
   */
  getDayIndexFromName(dayName) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const index = days.indexOf(dayName.toLowerCase());
    return index !== -1 ? index : parseInt(dayName.replace('day_', '')) - 1;
  }

  /**
   * Format day name for display
   */
  formatDayName(dayName) {
    if (dayName.startsWith('day_')) {
      return `Day ${dayName.replace('day_', '')}`;
    }
    return dayName.charAt(0).toUpperCase() + dayName.slice(1);
  }

  /**
   * Show the save day selector modal with optional date picker and dynamic day buttons
   */
  showSaveDayModal() {
    // Don't allow in demo mode
    if (this.isDemoMode()) {
      this.showToast('Cannot save routes in demo mode');
      return;
    }

    if (!this.currentRoute || !this.currentRoute.days) {
      this.showError('No route to save');
      return;
    }

    // Build dynamic day buttons based on actual route days
    const dayButtons = this.currentRoute.days.map((day, index) => {
      const dayName = this.getDayNameFromIndex(index);
      const miles = day.totalMiles ? ` (${Math.round(day.totalMiles * 10) / 10} mi)` : '';
      const stopsCount = day.stops ? day.stops.length : 0;
      return `
        <button class="modal-btn modal-btn-secondary save-day-btn" data-day="${dayName}" style="justify-content: flex-start; width: 100%;">
          <span>📅</span>
          <span>Day ${index + 1} - ${this.formatDayName(dayName)}${miles} - ${stopsCount} stops</span>
        </button>
      `;
    }).join('');

    const modalHTML = `
      <div id="saveDayModal" class="route-map-modal">
        <div class="modal-container" style="max-width: 450px; height: auto; margin: auto;">
          <div class="modal-header">
            <div class="modal-title">
              <span>💾</span>
              <span>Save Route</span>
            </div>
            <button class="modal-close-btn" onclick="window.routeOptimizer.closeSaveDayModal()">×</button>
          </div>
          <div class="modal-content" style="padding: var(--cipher-space-xl); display: block;">
            <div style="margin-bottom: var(--cipher-space-lg);">
              <label style="color: var(--cipher-text-secondary); display: block; margin-bottom: var(--cipher-space-xs); font-size: 0.85rem;">
                Route Date (optional)
              </label>
              <input type="date" id="saveDayDatePicker" value="" style="
                width: 100%; padding: 8px 12px; border-radius: 6px;
                border: 1px solid var(--cipher-border, #333);
                background: var(--cipher-bg-secondary, #1a1a2e);
                color: var(--cipher-text-primary, #fff);
                font-size: 0.9rem;
              " />
              <span style="color: var(--cipher-text-muted); font-size: 0.75rem; display: block; margin-top: 4px;">
                Leave blank to save without a date (session only)
              </span>
            </div>
            <p style="color: var(--cipher-text-secondary); margin-bottom: var(--cipher-space-md); font-size: 0.9rem;">
              Select which day to save:
            </p>
            <div class="save-day-options" style="display: flex; flex-direction: column; gap: var(--cipher-space-sm);">
              ${dayButtons}
            </div>
          </div>
        </div>
      </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('saveDayModal');
    if (existingModal) existingModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Attach click handlers to day buttons (reads date picker value at click time)
    const modal = document.getElementById('saveDayModal');
    modal.querySelectorAll('.save-day-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const datePicker = document.getElementById('saveDayDatePicker');
        const routeDate = datePicker ? datePicker.value || null : null;
        this.saveDayRoute(btn.dataset.day, routeDate);
      });
    });

    // Pre-fill date picker when editing an existing route
    if (this.editingRouteId && this.editingRouteDate) {
      const datePicker = document.getElementById('saveDayDatePicker');
      if (datePicker) datePicker.value = this.editingRouteDate;
    }

    setTimeout(() => {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }, 100);
  }

  /**
   * Close the save day modal
   */
  closeSaveDayModal() {
    const modal = document.getElementById('saveDayModal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
      setTimeout(() => modal.remove(), 300);
    }
  }
}

// Global functions
// Enhanced removeDestination function by Lyricist Agent
function removeDestination(button) {
  const destDiv = button.closest(".destination-input");
  const input = destDiv.querySelector(".destination-address-input");
  const address = input.value.trim();

  // If input has content, ask for confirmation
  if (address) {
    if (!confirm(`Remove destination: "${address}"?`)) {
      return;
    }
  }

  // Remove the destination
  destDiv.remove();

  console.log("🎵 Lyricist: Destination removed:", address || "empty");
}

function hideError() {
  document.getElementById("errorDisplay").style.display = "none";
}

// Initialize when Google Maps loads
function initRouteOptimizer() {
  console.log("🔒 Security Agent: initRouteOptimizer called");

  if (window.routeOptimizer) {
    console.log("🔒 RouteOptimizer already exists, updating with Google Maps");
    const routeOptimizer = window.routeOptimizer;

    // Initialize Google Maps for existing optimizer
    if (typeof google !== "undefined") {
      routeOptimizer.map = new google.maps.Map(
        document.getElementById("routeMap"),
        {
          zoom: 10,
          center: { lat: 40.7128, lng: -74.006 }, // Default to NYC
        }
      );

      routeOptimizer.directionsService = new google.maps.DirectionsService();
      routeOptimizer.directionsRenderer = new google.maps.DirectionsRenderer();
      routeOptimizer.geocoder = new google.maps.Geocoder();

      routeOptimizer.directionsRenderer.setMap(routeOptimizer.map);
      console.log("🔒 Google Maps initialized for existing RouteOptimizer");
    }
  } else {
    const routeOptimizer = new RouteOptimizer();

    // Initialize Google Maps if available
    if (typeof google !== "undefined") {
      routeOptimizer.map = new google.maps.Map(
        document.getElementById("routeMap"),
        {
          zoom: 10,
          center: { lat: 40.7128, lng: -74.006 }, // Default to NYC
        }
      );

      routeOptimizer.directionsService = new google.maps.DirectionsService();
      routeOptimizer.directionsRenderer = new google.maps.DirectionsRenderer();
      routeOptimizer.geocoder = new google.maps.Geocoder();

      routeOptimizer.directionsRenderer.setMap(routeOptimizer.map);
      console.log("🔒 New RouteOptimizer created with Google Maps");
    } else {
      console.log("🔒 New RouteOptimizer created without Google Maps");
    }

    window.routeOptimizer = routeOptimizer;
  }
}

// Fallback initialization if Google Maps doesn't load
document.addEventListener("DOMContentLoaded", () => {
  console.log("🔒 Security Agent: DOM loaded, initializing Route Optimizer...");

  // Only create if it doesn't exist
  if (!window.routeOptimizer) {
    const routeOptimizer = new RouteOptimizer();
    window.routeOptimizer = routeOptimizer;
    console.log(
      "🔒 Security Agent: Route Optimizer initialized successfully (fallback mode)"
    );
  } else {
    console.log("🔒 Security Agent: Route Optimizer already exists");
  }

  // Test if Add Stop button is working
  const addBtn = document.getElementById("addDestination");
  if (addBtn) {
    console.log("🔒 Add Destination button found and ready");
  } else {
    console.error("🔒 Add Destination button NOT found!");
  }

  // Initialize fallback map container if needed
  const mapContainer = document.getElementById("routeMap");
  if (mapContainer && !mapContainer.innerHTML.trim()) {
    console.log("🗺️ Initializing fallback map container");
    mapContainer.innerHTML = `
            <div style="
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100%;
                background: linear-gradient(135deg, rgba(26, 26, 26, 0.95), rgba(30, 30, 30, 0.95));
                border-radius: var(--cipher-radius-lg);
                color: var(--cipher-text-secondary);
                font-size: 1rem;
            ">
                🗺️ Ready for route visualization
            </div>
        `;
  }
});
