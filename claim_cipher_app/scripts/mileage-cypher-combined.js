/**
 * MILEAGE CYPHER - Combined Professional Calculator
 * Features: Firm Management, Auto-Distance, Quick Calculate, Copy-Ready Billing
 */

class MileageCypherCalculator {
  constructor() {
    this.settings = this.initializeSettings();
    this.currentCalculation = null;
    this.calculationHistory = [];
    this.isRoundTrip = false;

    // Distance source metadata (separate from distance value)
    // Tracks: 'google_api' | 'cache_google' | 'user_manual' | null
    this.currentDistanceSource = null;

    this.initializeRuntimeBindings();
    this.loadFirmsToDropdown();
  }

  initializeRuntimeBindings() {
    this.loadFirmsToDropdown();
    this.setupEventListeners();
    this.loadUserHomeLocation();
  }

  setupEventListeners() {
    const calculateBtn = document.getElementById("calculateBtn");
    if (calculateBtn) {
      calculateBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.performCalculation(false);
      });
    }

    const firmSelect = document.getElementById("firmSelect");
    if (firmSelect) {
      firmSelect.addEventListener("change", () => {
        const firmId = firmSelect.value;
        if (firmId) {
          this.onFirmChange(firmId);
        }
        this.performCalculation(true);
      });
    }

    const copyBtn = document.getElementById("copyBtn");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => this.handleCopy());
    }

    const copyMathBtn = document.getElementById("copyMathBtn");
    if (copyMathBtn) {
      copyMathBtn.addEventListener("click", () => this.copyBillingMath());
    }

    const newCalcBtn = document.getElementById("newCalculation");
    if (newCalcBtn) {
      newCalcBtn.addEventListener("click", () => this.startNewCalculation());
    }

    const pointBInput = document.getElementById("pointB");
    if (pointBInput) {
      pointBInput.addEventListener("blur", () => {
        setTimeout(() => this.triggerAutoDistance(), 500);
      });

      pointBInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.triggerAutoDistance();
        }
      });

      let typingTimer;
      pointBInput.addEventListener("input", () => {
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
          if (pointBInput.value.trim().length > 5) {
            this.triggerAutoDistance();
          }
        }, 2000);
      });
    }

    const distanceInput = document.getElementById("distanceMiles");
    if (distanceInput) {
      distanceInput.addEventListener("input", () => {
        if (this.settings.autoCalculateEnabled) {
          this.debounceAutoCalculate();
        }
      });
    }

    const roundTripToggle = document.getElementById("roundTrip");
    if (roundTripToggle) {
      this.isRoundTrip = !!roundTripToggle.checked;
      roundTripToggle.addEventListener("change", () => {
        this.isRoundTrip = !!roundTripToggle.checked;
      });
    }

    console.log("Event listeners configured");
  }

  handleCalculation(e) {
    if (e) e.preventDefault();

    // Show loading state
    this.showCalculateLoading(true);

    // Check if distance field is empty and try auto-calculation first
    const distanceInput = document.getElementById("distanceMiles");
    const distance = parseFloat(distanceInput?.value) || 0;
    const pointA = document.getElementById("pointA")?.value.trim() || "";
    const pointB = document.getElementById("pointB")?.value.trim() || "";

    console.log(
      "Calculate button clicked - Distance:",
      distance,
      "Point A:",
      pointA,
      "Point B:",
      pointB
    );

    if (distance <= 0 && pointA && pointB) {
      console.log("Attempting auto-distance calculation...");
      this.triggerAutoDistance();
    } else if (distance > 0) {
      console.log(
        "Distance already set (" +
          distance +
          " miles), calculating billing now"
      );
      this.performCalculation(false); // false = not silent, show results and errors
    } else {
      console.warn("Missing required data - cannot calculate");
      this.showNotification("Please enter all required fields", "error");
      this.showCalculateLoading(false);
    }
  }

  handleCopy() {
    this.copyCalculationToClipboard();
  }

  loadFirmsToDropdown() {
    this.refreshFirmDropdown();
  }

  refreshFirmDropdown() {
    const select = document.getElementById("firmSelect");
    if (!select) return;

    select.innerHTML = '<option value="">Choose insurance firm...</option>';

    const firms = window.FirmStore ? window.FirmStore.getAllSync() : [];
    firms.forEach((firm) => {
      const option = document.createElement("option");
      option.value = firm.id;
      option.textContent = `${firm.name} (${firm.freeMiles} free, $${firm.ratePerMile}/mi)`;
      select.appendChild(option);
    });

    const lastSelected = window.FirmStore ? window.FirmStore.getLastSelected() : '';
    if (lastSelected) {
      select.value = lastSelected;
      this.onFirmChange(lastSelected);
    }
  }

  getSelectedFirm() {
    const select = document.getElementById("firmSelect");
    if (!select || select.value === "") return null;

    const firmId = select.value;
    return window.FirmStore ? window.FirmStore.getById(firmId) : null;
  }

  loadUserHomeLocation() {
    const pointAInput = document.getElementById("pointA");
    if (pointAInput) {
      // Check settings first, then fall back to shared cipher_home_address from Settings page
      const homeAddr = this.settings.homeLocation
        || localStorage.getItem('cipher_home_address')
        || '';

      if (homeAddr) {
        pointAInput.value = homeAddr;
        pointAInput.placeholder = "Your home base location";
        // Sync back so both sources stay in sync
        if (!this.settings.homeLocation) {
          this.settings.homeLocation = homeAddr;
          this.saveSettings();
        }
      } else {
        pointAInput.placeholder =
          "Enter your home/office address (this will be saved)";
      }

      // Save home location when user enters or changes it
      pointAInput.addEventListener("blur", () => {
        const homeAddress = pointAInput.value.trim();
        if (homeAddress && homeAddress !== this.settings.homeLocation) {
          this.settings.homeLocation = homeAddress;
          this.saveSettings();
          // Also update the shared key for Route Cipher
          localStorage.setItem('cipher_home_address', homeAddress);
          console.log("Home location saved:", homeAddress);
        }
      });
    }
  }

  setupAutoCalculation() {
    // Initialize auto-calculation timeout tracker
    this.autoCalculateTimeout = null;

    // Listen to input changes for auto-calculation
    const pointAInput = document.getElementById("pointA");
    const pointBInput = document.getElementById("pointB");
    const distanceInput = document.getElementById("distanceMiles");

    if (pointAInput && pointBInput) {
      [pointAInput, pointBInput].forEach((input) => {
        input.addEventListener("input", () => {
          // Reset distance source when address changes (prevents stale data)
          this.currentDistanceSource = null;
          console.log("Distance source reset (address changed)");

          if (this.settings.autoCalculateEnabled) {
            this.debounceAutoCalculate();
          }
        });
      });
    }

    if (distanceInput) {
      distanceInput.addEventListener("input", () => {
        // Mark as manual entry when user types in the distance field
        this.currentDistanceSource = 'user_manual';
        console.log("Distance source set to: user_manual (manual input)");

        if (this.settings.autoCalculateEnabled) {
          this.debounceAutoCalculate();
        }
      });
    }

    console.log("Auto-calculation setup complete");
  }

  initializeGooglePlacesAutocomplete() {
    // Wait for Google Maps API to load
    if (typeof google === "undefined" || !google.maps || !google.maps.places) {
      console.log("Google Places not available - autocomplete disabled");
      return;
    }

    const pointAInput = document.getElementById("pointA");
    const pointBInput = document.getElementById("pointB");

    if (pointAInput) {
      const autocompleteA = new google.maps.places.Autocomplete(pointAInput, {
        types: ["address"],
        componentRestrictions: { country: "us" },
      });

      autocompleteA.addListener("place_changed", () => {
        const place = autocompleteA.getPlace();
        if (place.formatted_address) {
          pointAInput.value = place.formatted_address;
          // Save as home location
          this.settings.homeLocation = place.formatted_address;
          this.saveSettings();
          console.log("Home location updated:", place.formatted_address);
        }
      });

      console.log("Google Places Autocomplete enabled for Point A");
    }

    if (pointBInput) {
      const autocompleteB = new google.maps.places.Autocomplete(pointBInput, {
        types: ["address"],
        componentRestrictions: { country: "us" },
      });

      autocompleteB.addListener("place_changed", () => {
        const place = autocompleteB.getPlace();
        if (place.formatted_address) {
          pointBInput.value = place.formatted_address;
          console.log("Destination selected:", place.formatted_address);
          // Trigger auto-distance calculation
          setTimeout(() => this.triggerAutoDistance(), 300);
        }
      });

      console.log("Google Places Autocomplete enabled for Point B");
    }
  }

  debounceAutoCalculate() {
    // Clear existing timeout
    if (this.autoCalculateTimeout) {
      clearTimeout(this.autoCalculateTimeout);
    }

    // Set new timeout for auto-calculation
    this.autoCalculateTimeout = setTimeout(() => {
      this.performCalculation(true); // true = silent mode
    }, 500); // Wait 500ms after last input
  }

  onFirmChange(firmId) {
    if (!firmId) return;

    const firm = window.FirmStore ? window.FirmStore.getById(firmId) : null;
    if (!firm) return;

    var rateEl = document.querySelector('[data-rate-display]')
      || document.getElementById('rateDisplay');
    var freeEl = document.querySelector('[data-free-display]')
      || document.getElementById('freeDisplay');

    if (rateEl) rateEl.textContent = '$' + firm.ratePerMile.toFixed(2);
    if (freeEl) freeEl.textContent = firm.freeMiles > 0
      ? firm.freeMiles + ' mi' : 'None';

    const roundTripToggle = document.getElementById("roundTrip");
    const roundTripThumb = document.getElementById("rtMainThumb");
    if (roundTripToggle) {
      roundTripToggle.checked = !!firm.roundTripDefault;
      this.isRoundTrip = !!firm.roundTripDefault;
    }
    if (roundTripThumb && roundTripToggle) {
      roundTripThumb.style.left = roundTripToggle.checked ? '21px' : '3px';
      roundTripThumb.style.background = roundTripToggle.checked ? '#e8952a' : '#4a5058';
    }

    // Reset distance source when firm changes (different billing rules may apply)
    this.currentDistanceSource = null;
    console.log("Distance source reset (firm changed)");

    // Set round trip default based on firm preference

    // Save selection to FirmStore
    if (window.FirmStore) {
      window.FirmStore.setLastSelected(firmId);
    }

    // Auto-calculate if we have all required data
    if (this.settings.autoCalculateEnabled) {
      this.debounceAutoCalculate();
    }

    console.log(`Firm changed to: ${firm.name}`);
  }

  async triggerAutoDistance() {
    // Check if Google Maps API is available
    const apiKey = window.MILEAGE_CYPHER_CONFIG?.GOOGLE_MAPS_API_KEY;

    if (!apiKey || apiKey === "YOUR_API_KEY_HERE") {
      console.log("Auto-distance skipped: No API key configured");
      this.showNotification("Please enter distance manually", "info");
      this.showCalculateLoading(false);
      return;
    }

    if (typeof google === "undefined") {
      console.log("Auto-distance skipped: Google Maps not loaded yet");
      this.showNotification("Please enter distance manually", "info");
      this.showCalculateLoading(false);
      return;
    }

    console.log("Triggering auto-distance calculation...");

    const pointA = document.getElementById("pointA").value.trim();
    const pointB = document.getElementById("pointB").value.trim();

    if (!pointA || !pointB) {
      console.log(
        "Missing addresses - Point A:",
        pointA,
        "Point B:",
        pointB
      );
      this.showCalculateLoading(false);
      return;
    }

    console.log("Calculating distance from:", pointA, "to:", pointB);
    this.updateDistanceStatus("Calculating distance...");

    try {
      await this.calculateDistanceWithGoogleMaps(pointA, pointB);
      this.updateDistanceStatus("Distance calculated");
    } catch (error) {
      console.error("Auto-distance calculation failed:", error);
      this.updateDistanceStatus("Enter distance manually");
      this.showNotification(
        "Could not calculate distance - please enter manually",
        "warning"
      );
      this.showCalculateLoading(false);
    }
  }

  async calculateDistanceWithGoogleMaps(origin, destination) {
    if (typeof google === "undefined") {
      throw new Error("Google Maps API not loaded");
    }

    this.setSessionIndicator(true);

    const distanceInput = document.getElementById("distanceMiles");
    const originalPlaceholder = distanceInput.placeholder;

    distanceInput.placeholder = "Calculating distance...";
    distanceInput.disabled = true;

    try {
      const service = new google.maps.DistanceMatrixService();
      const result = await new Promise((resolve, reject) => {
        service.getDistanceMatrix(
          {
            origins: [origin],
            destinations: [destination],
            travelMode: google.maps.TravelMode.DRIVING,
            unitSystem: google.maps.UnitSystem.IMPERIAL,
            avoidHighways: false,
            avoidTolls: false,
          },
          (response, status) => {
            if (status === "OK") {
              const element = response.rows[0].elements[0];
              if (element.status === "OK") {
                const miles = element.distance.value * 0.000621371; // Convert meters to miles
                resolve(Math.round(miles * 10) / 10); // Round to 1 decimal
              } else {
                reject(new Error("Route not found between these locations"));
              }
            } else {
              reject(new Error(`Google Maps API error: ${status}`));
            }
          }
        );
      });

      // Write to DistanceCache with source 'google_api'
      if (window.DistanceCache) {
        window.DistanceCache.set(origin, destination, result, 'google_api');
      }

      // Track source metadata for billing validation
      this.currentDistanceSource = 'google_api';

      distanceInput.value = result;
      console.log("Distance set to:", result, "miles (source: google_api)");

      // Automatically perform the billing calculation
      setTimeout(() => {
        console.log("Starting automatic billing calculation...");
        this.performCalculation(true); // true = auto, no modal
        this.showCalculateLoading(false); // Hide loading state
      }, 1000); // Small delay to let user see the distance notification
    } finally {
      distanceInput.placeholder = originalPlaceholder;
      distanceInput.disabled = false;
    }
  }

  debounceAutoCalculate() {
    clearTimeout(this.autoCalculateTimeout);
    this.autoCalculateTimeout = setTimeout(() => {
      this.performCalculation(true); // true = silent mode
    }, 1000);
  }

  performCalculation(auto = false) {
    console.log("performCalculation called, auto:", auto);

    this.setSessionIndicator(true);

    const calculationData = this.gatherCalculationInputs();
    console.log("Calculation data gathered:", calculationData);

    if (!this.validateCalculationInputs(calculationData, auto)) {
      console.log("Validation failed, aborting calculation");
      return null;
    }

    console.log("Validation passed, proceeding with calculation");

    try {
      const result = this.calculateMileageBilling(calculationData);
      this.displayCalculationResults(result);
      if (!auto) {
        this.openBillingModal();
      }
      this.currentCalculation = result;

      // Add to history (keep last 10)
      this.calculationHistory.unshift(result);
      if (this.calculationHistory.length > 10) {
        this.calculationHistory = this.calculationHistory.slice(0, 10);
      }

      // Only show success notification for manual calculations (when user clicks button)
      // Auto-calculations don't need success notifications

      console.log("Calculation completed:", result);
      this.showCalculateLoading(false); // Hide loading state
      return result;
    } catch (error) {
      console.error("Calculation error:", error);
      this.showCalculateLoading(false); // Hide loading state
      return null;
    } finally {
      this.setSessionIndicator(false);
    }
  }

  gatherCalculationInputs() {
    const firm = this.getSelectedFirm();

    const pointA = document.getElementById("pointA")?.value?.trim() || "";
    const pointB = document.getElementById("pointB")?.value?.trim() || "";
    const distanceValue =
      document.getElementById("distanceMiles")?.value || "0";
    const distance = parseFloat(distanceValue);
    const roundTripToggle = document.getElementById("roundTrip");
    const roundTrip = roundTripToggle ? !!roundTripToggle.checked : (firm?.roundTripDefault || false);
    const note = document.getElementById("noteField")?.value?.trim() || "";

    console.log(
      "Gathering inputs - Distance field value:",
      distanceValue,
      "-> Parsed:",
      distance
    );

    return {
      firm,
      pointA,
      pointB,
      distance: distance || 0,
      roundTrip,
      note,
    };
  }

  validateCalculationInputs(data, silentMode = false) {
    if (!data.firm) {
      if (!silentMode) {
        console.warn("Validation failed: No firm selected");
        this.showNotification("Please select a firm", "error");
      }
      return false;
    }

    if (!data.pointA || !data.pointB) {
      if (!silentMode) {
        console.warn(
          'Validation failed: Missing addresses (Point A: "' +
            data.pointA +
            '", Point B: "' +
            data.pointB +
            '")'
        );
        this.showNotification(
          "Please enter both Point A and Point B addresses",
          "error"
        );
      }
      return false;
    }

    if (data.distance <= 0) {
      if (!silentMode) {
        console.warn(
          "Validation failed: No valid distance (distance: " +
            data.distance +
            ")"
        );
        // If auto-calculation is enabled, try to trigger it first
        if (this.settings.autoCalculateEnabled && data.pointA && data.pointB) {
          console.log("Attempting auto-distance calculation...");
          this.triggerAutoDistance();
        } else {
          this.showNotification("Please enter the distance in miles", "error");
        }
      }
      return false;
    }

    // Billing source validation - CRITICAL for billing integrity
    // Block billing if distance source is unknown or not authoritative
    if (!silentMode) {
      if (!this.currentDistanceSource) {
        console.warn("Validation failed: Distance source is unknown");
        this.showNotification(
          "Distance source unknown. Click 'Calculate Distance' or enter miles manually.",
          "error"
        );
        this.showCalculateLoading(false);
        return false;
      }

      // Validate source is authoritative using DistanceCache
      if (window.DistanceCache) {
        const validation = window.DistanceCache.validateForBilling(
          data.distance,
          this.currentDistanceSource
        );
        if (!validation.valid) {
          console.warn("Billing validation failed:", validation.reason);
          this.showNotification(validation.reason, "error");
          this.showCalculateLoading(false);
          return false;
        }
      }
    }

    console.log(
      "Validation passed - Firm:",
      data.firm.name,
      "Distance:",
      data.distance,
      "miles",
      "Source:",
      this.currentDistanceSource
    );
    return true;
  }

  calculateMileageBilling(data) {
    const { firm, pointA, pointB, distance, roundTrip, note } = data;

    // Core billing calculation
    const baseMiles = distance * (roundTrip ? 2 : 1);
    const billableMiles = Math.max(0, baseMiles - firm.freeMiles);
    const totalFee = billableMiles * firm.ratePerMile;

    // Update billing display elements
    var amountEl = document.getElementById('billingAmount');
    var formulaEl = document.getElementById('billingFormula');
    var freeNote = document.getElementById('freeMilesNote');

    if (amountEl) {
      amountEl.textContent = '$' + totalFee.toFixed(2);
    }
    if (formulaEl) {
      var fmiPart = firm.freeMiles > 0
        ? baseMiles.toFixed(1) + ' mi \u2212 ' + firm.freeMiles + ' mi = ' + billableMiles.toFixed(1) + ' mi'
        : baseMiles.toFixed(1) + ' mi';
      formulaEl.textContent = fmiPart + ' \u00d7 $' + firm.ratePerMile.toFixed(2) + '/mi = $' + totalFee.toFixed(2);
    }
    if (freeNote && firm.freeMiles > 0) {
      freeNote.textContent = 'First ' + firm.freeMiles
        + ' mi free per firm policy';
      freeNote.style.display = 'block';
    } else if (freeNote) {
      freeNote.style.display = 'none';
    }

    return {
      firm,
      route: { from: pointA, to: pointB },
      distance: this.roundTo(distance, 1),
      roundTrip,
      baseMiles: this.roundTo(baseMiles, 1),
      freeMiles: firm.freeMiles,
      billableMiles: this.roundTo(billableMiles, 1),
      ratePerMile: firm.ratePerMile,
      totalFee: this.roundTo(totalFee, 2),
      note,
      timestamp: new Date(),
      calculationId: this.generateCalculationId(),
    };
  }

  displayCalculationResults(result) {
    const {
      firm,
      route,
      distance,
      roundTrip,
      baseMiles,
      freeMiles,
      billableMiles,
      ratePerMile,
      totalFee,
      note,
    } = result;

    const distanceLabel = roundTrip ? "One-way Distance:" : "Distance:";
    const breakdownHtml = `
            <div class="breakdown-item">
              <span class="label">Route:</span>
              <span class="value">${route.from} → ${route.to}</span>
            </div>
            <div class="breakdown-item">
              <span class="label">${distanceLabel}</span>
              <span class="value">${distance} miles</span>
            </div>
            <div class="breakdown-item">
              <span class="label">Round Trip:</span>
              <span class="value">${roundTrip ? "Yes" : "No"}</span>
            </div>
            <div class="breakdown-item">
              <span class="label">Total Distance:</span>
              <span class="value">${baseMiles} miles</span>
            </div>
            <div class="breakdown-item">
              <span class="label">Free Miles (${firm.name}):</span>
              <span class="value">${freeMiles} miles</span>
            </div>
            <div class="breakdown-item highlight">
              <span class="label">Billable Miles:</span>
              <span class="value">${billableMiles} miles</span>
            </div>
            <div class="breakdown-item">
              <span class="label">Rate per Mile:</span>
              <span class="value">$${ratePerMile}/mile</span>
            </div>
            <div class="breakdown-item total">
              <span class="label">Total Billing Fee:</span>
              <span class="value">$${totalFee}</span>
            </div>
            ${
              note
                ? `
            <div class="breakdown-item">
              <span class="label">Note:</span>
              <span class="value">${note}</span>
            </div>
            `
                : ""
            }
        `;

    const breakdownContainer = document.getElementById("breakdownDisplay");
    const totalContainer = document.getElementById("billingTotal");
    if (breakdownContainer) {
      breakdownContainer.innerHTML = breakdownHtml;
    }
    if (totalContainer) {
      totalContainer.innerHTML = `
        <span class="label">Total Billing Fee</span>
        <span class="value">$${totalFee}</span>
      `;
    }

    // Update copy-ready text
    this.updateCopyReadyText(result);

    // Results are shown by openBillingModal when triggered manually.
  }

  updateCopyReadyText(result) {
    let copyText = "";

    switch (this.settings.copyFormat) {
      case "brief":
        copyText = this.generateBriefCopyText(result);
        break;
      case "detailed":
        copyText = this.generateDetailedCopyText(result);
        break;
      default:
        copyText = this.generateDetailedCopyText(result);
    }

    this.latestCopyText = copyText;
  }

  generateBriefCopyText(result) {
    const { baseMiles, billableMiles, totalFee, firm } = result;
    return `${baseMiles} miles - ${firm.freeMiles} free miles = ${billableMiles} billable miles × $${firm.ratePerMile} = $${totalFee}`;
  }

  generateDetailedCopyText(result) {
    const { baseMiles, freeMiles, billableMiles, ratePerMile, totalFee } =
      result;
    return `${baseMiles} miles - ${freeMiles} free miles = ${billableMiles} billable miles × $${ratePerMile} = $${totalFee}`;
  }

  async copyBillingMath() {
    const formula = document.getElementById('billingFormula');
    const amount = document.getElementById('billingAmount');
    const btn = document.getElementById('copyMathBtn');

    let text = '';
    if (formula && formula.textContent !== '\u2014') {
      text = formula.textContent;
    }
    if (amount && amount.textContent !== '$0.00') {
      text = text ? text + ' = ' + amount.textContent : amount.textContent;
    }
    if (!text) {
      text = this.latestCopyText || '';
    }
    if (!text) return;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'absolute';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      if (btn) {
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy Math'; }, 1600);
      }
    } catch (e) {
      console.error('Copy math failed:', e);
      if (btn) btn.textContent = 'Failed';
    }
  }

  async copyCalculationToClipboard() {
    const copyText = this.latestCopyText || "";
    if (!copyText) return;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(copyText);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = copyText;
        textarea.setAttribute("readonly", "readonly");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      console.log("Calculation copied to clipboard");
      this.showCopySuccess();
    } catch (error) {
      console.error("Copy failed:", error);
      this.showNotification("Copy failed", "error");
    }
  }

  startNewCalculation() {
    // Clear inputs except firm and home location
    const pointBInput = document.getElementById("pointB");
    const distanceInput = document.getElementById("distanceMiles");
    const noteInput = document.getElementById("noteField");

    if (pointBInput) pointBInput.value = "";
    if (distanceInput) distanceInput.value = "";
    if (noteInput) noteInput.value = "";

    this.closeBillingModal();
    this.latestCopyText = "";

    this.currentCalculation = null;

    // Focus on destination input
    if (pointBInput) {
      pointBInput.focus();
    }

    console.log("New calculation started");
  }

  // Route Import Support
  checkForRouteImport() {
    const routeData = localStorage.getItem("cc_route_export");
    if (routeData) {
      try {
        const data = JSON.parse(routeData);
        if (Date.now() - data.timestamp < 3600000) {
          // 1 hour validity
          this.offerRouteImport(data);
        } else {
          localStorage.removeItem("cc_route_export");
        }
      } catch (error) {
        console.error("Route import error:", error);
        localStorage.removeItem("cc_route_export");
      }
    }
  }

  offerRouteImport(routeData) {
    const modal = document.getElementById("routeImportModal");
    if (modal) {
      const dataContainer = document.getElementById("routeImportData");
      if (dataContainer) {
        dataContainer.innerHTML = `
                    <p><strong>Distance:</strong> ${routeData.distance} miles</p>
                    <p><strong>Route:</strong> ${routeData.route.overall.miles} total miles across ${routeData.route.days.length} day(s)</p>
                `;
      }
      modal.style.display = "flex";
      this.pendingRouteImport = routeData;
    }
  }

  importFromRoute() {
    if (!this.pendingRouteImport) return;

    const distanceInput = document.getElementById("distanceMiles");
    if (distanceInput) {
      distanceInput.value = this.pendingRouteImport.distance;
    }

    // IMPORTANT: Do NOT set currentDistanceSource for imports
    // Route Cipher may have used heuristic estimates for some legs.
    // Source remains null, which will block billing until user either:
    // 1. Recalculates with Google (authoritative)
    // 2. Manually enters/confirms distance (user_manual)
    this.currentDistanceSource = null;
    console.log("Route imported - source NOT set (may contain estimates). Recalculate for billing.");

    // Import route points if available
    if (this.pendingRouteImport.route.days[0]?.stops) {
      const stops = this.pendingRouteImport.route.days[0].stops;
      const pointBInput = document.getElementById("pointB");
      if (pointBInput && stops.length > 1) {
        pointBInput.value = this.shortenAddress(stops[stops.length - 1]);
      }
    }

    this.closeRouteImportModal();

    // Show notification about needing to recalculate for billing
    this.showNotification(
      "Route imported for planning. Recalculate or enter miles manually before billing.",
      "warning"
    );

    localStorage.removeItem("cc_route_export");
    this.pendingRouteImport = null;

    console.log("Route data imported successfully");
  }

  closeRouteImportModal() {
    const modal = document.getElementById("routeImportModal");
    if (modal) {
      modal.style.display = "none";
    }
    this.pendingRouteImport = null;
  }

  // Utility Functions
  roundTo(value, decimals) {
    const multiplier = Math.pow(10, decimals);
    return Math.round(value * multiplier) / multiplier;
  }

  generateCalculationId() {
    return "calc_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
  }

  shortenAddress(address) {
    return address.length <= 40 ? address : address.substring(0, 37) + "...";
  }

  initializeSettings() {
    try {
      const saved = localStorage.getItem("mileage_cypher_settings_v2");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }

    return {
      autoCalculateEnabled: true,
      homeLocation: "",
      copyFormat: "detailed"
    };
  }

  saveSettings() {
    try {
      // Firms are managed by FirmStore, so exclude them from settings
      const { firms, lastSelectedFirmId, ...settingsToSave } = this.settings;
      localStorage.setItem(
        "mileage_cypher_settings_v2",
        JSON.stringify(settingsToSave)
      );
      console.log("Settings saved to localStorage");
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  }

  // UI State Management Functions
  showCalculateLoading(show) {
    const calculateBtn = document.getElementById("calculateBtn");
    if (!calculateBtn) return;

    const btnText = calculateBtn.querySelector(".btn-text");
    const btnLoading = calculateBtn.querySelector(".btn-loading");

    if (show) {
      calculateBtn.disabled = true;
      if (btnText) btnText.style.display = "none";
      if (btnLoading) btnLoading.style.display = "flex";
    } else {
      calculateBtn.disabled = false;
      if (btnText) btnText.style.display = "inline";
      if (btnLoading) btnLoading.style.display = "none";
    }
  }

  showCopySuccess() {
    const copyBtn = document.getElementById("copyBtn");
    if (!copyBtn) return;

    const btnText = copyBtn.querySelector(".btn-text");
    const btnSuccess = copyBtn.querySelector(".btn-success");

    if (btnText && btnSuccess) {
      btnText.style.display = "none";
      btnSuccess.style.display = "flex";

      setTimeout(() => {
        btnText.style.display = "inline";
        btnSuccess.style.display = "none";
      }, 2000);
    }
  }

  updateDistanceStatus(status) {
    const distanceStatus = document.getElementById("distanceStatus");
    if (distanceStatus) {
      distanceStatus.textContent = status;
    }
  }

  setSessionIndicator(active) {
    const indicator = document.getElementById("sessionIndicator");
    if (!indicator) return;
    indicator.classList.toggle("hidden", !active);
  }

  showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `toast toast-${type}`;
    notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()" class="toast-close">×</button>
        `;

    const container = document.getElementById("toastContainer");
    if (container) {
      container.appendChild(notification);

      // Auto-remove after 5 seconds
      setTimeout(() => {
        if (notification.parentElement) {
          notification.remove();
        }
      }, 5000);
    } else {
      // Fallback to console if no toast container
      console.log(`${type.toUpperCase()}: ${message}`);
    }
  }

  openBillingModal() {
    const modal = document.getElementById("billingModal");
    if (!modal) return;

    if (!modal.classList.contains("modal-overlay")) {
      modal.classList.add("modal-overlay");
    }

    modal.style.display = "flex";
    const modalPanel = modal.querySelector(".billing-modal");
    if (modalPanel) {
      if (!modalPanel.classList.contains("cipher-plate")) {
        modalPanel.classList.add("cipher-plate", "elevation-3");
      }
      requestAnimationFrame(() => {
        modalPanel.classList.add("is-open");
      });
    }
    document.body.style.overflow = "hidden";
  }

  closeBillingModal() {
    const modal = document.getElementById("billingModal");
    if (!modal) return;

    const modalPanel = modal.querySelector(".billing-modal");
    if (modalPanel) {
      modalPanel.classList.remove("is-open");
    }
    setTimeout(() => {
      modal.style.display = "none";
      document.body.style.overflow = "";
    }, 250);
  }

  // =================================
  // DEMO MODE FUNCTIONALITY
  // =================================

  /**
   * Initialize demo mode with seeded data and locked inputs
   */
  initializeDemoMode() {
    console.log("Demo mode detected - initializing demo mileage data");

    // Demo mileage entries - 3 California, 3 Oklahoma
    const demoEntries = [
      { from: '111 S Grand Ave, Los Angeles, CA 90012', to: '1 Market St, San Francisco, CA 94105', miles: 382.5 },
      { from: '1 Market St, San Francisco, CA 94105', to: '600 W Broadway, San Diego, CA 92101', miles: 502.3 },
      { from: '600 W Broadway, San Diego, CA 92101', to: '111 S Grand Ave, Los Angeles, CA 90012', miles: 120.8 },
      { from: '100 W Main St, Oklahoma City, OK 73102', to: '401 S Boston Ave, Tulsa, OK 74103', miles: 107.2 },
      { from: '401 S Boston Ave, Tulsa, OK 74103', to: '15 W 6th St, Stillwater, OK 74074', miles: 68.5 },
      { from: '15 W 6th St, Stillwater, OK 74074', to: '100 W Main St, Oklahoma City, OK 73102', miles: 65.3 }
    ];

    // Select a demo firm
    const firmSelect = document.getElementById('firmSelect');
    if (firmSelect && firmSelect.options.length > 1) {
      const allFirms = window.FirmStore ? window.FirmStore.getAllSync() : [];
      firmSelect.value = allFirms[0]?.id || '';
      firmSelect.disabled = true;
      this.onFirmChange(firmSelect.value);
    }

    // Set demo starting location and destination
    const pointA = document.getElementById('pointA');
    const pointB = document.getElementById('pointB');
    const distanceInput = document.getElementById('distanceMiles');
    const noteField = document.getElementById('noteField');

    if (pointA) {
      pointA.value = demoEntries[0].from;
      pointA.disabled = true;
    }
    if (pointB) {
      pointB.value = demoEntries[0].to;
      pointB.disabled = true;
    }
    if (distanceInput) {
      distanceInput.value = demoEntries[0].miles;
      distanceInput.disabled = true;
    }
    if (noteField) {
      noteField.value = 'Demo inspection - San Francisco to Los Angeles';
      noteField.disabled = true;
    }

    // Disable new calculation button's clearing functionality
    const newCalcBtn = document.getElementById('newCalculation');
    if (newCalcBtn) {
      newCalcBtn.disabled = true;
      newCalcBtn.title = 'Disabled in demo mode';
    }

    // Show demo mode banner
    this.showDemoModeBanner();

    // Auto-calculate to show results
    setTimeout(() => {
      this.performCalculation(false);
    }, 500);

    console.log("Demo mode initialized with sample mileage data");
  }

  /**
   * Show demo mode banner
   */
  showDemoModeBanner() {
    const formSection = document.querySelector('.calculator-form');
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
        <div>
          <strong style="color: #ffc107;">Demo Mode:</strong>
          <span style="color: var(--cipher-text-secondary);">Example calculation shown. Upgrade to use your own data.</span>
        </div>
      `;
      formSection.insertBefore(banner, formSection.firstChild);
    }
  }
}

// Global Functions for HTML onclick handlers
function closeRouteImportModal() {
  if (window.mileageCipher) {
    window.mileageCipher.closeRouteImportModal();
  }
}

async function handleLogout() {
  console.log("Logout requested");

  // Demo mode logout - clear demo state and redirect (no Supabase session)
  if (sessionStorage.getItem('demo_mode') === 'true') {
    console.log("Demo mode logout - clearing demo state");
    sessionStorage.removeItem('demo_mode');
    sessionStorage.removeItem('claimCipherAuth');
    if (window.FirmStore) window.FirmStore.clearDemo();
    if (window.SessionManager) window.SessionManager.clearDemo();
    window.location.replace('login-cypher.html');
    return;
  }

  // Delegate to Supabase Auth for proper session termination
  if (window.SupabaseAuth && window.SupabaseAuth.signOut) {
    await window.SupabaseAuth.signOut();
  } else {
    window.location.href = './login-cypher.html';
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", async () => {
  // Demo mode bypass — skip billing wait
  if (sessionStorage.getItem('demo_mode') !== 'true') {
    if (window.BillingGuard && window.BillingGuard.waitForAccess) {
      const allowed = await window.BillingGuard.waitForAccess();
      if (!allowed) return;
    }
  }
  // Check if API configuration is available
  if (window.MILEAGE_CYPHER_CONFIG?.GOOGLE_MAPS_API_KEY) {
    const apiKey = window.MILEAGE_CYPHER_CONFIG.GOOGLE_MAPS_API_KEY;
    if (apiKey !== "YOUR_API_KEY_HERE") {
      console.log(
        "Google Maps API key configured for auto-distance calculation"
      );
    } else {
      console.warn(
        "Google Maps API key needs to be set in config/api-config.js"
      );
    }
  } else {
    console.warn("API configuration not found - manual distance entry only");
  }

  // Warm the FirmStore cache from Supabase before constructing the calculator.
  // The constructor calls refreshFirmDropdown() synchronously via getAllSync(),
  // so the cloud data must be in the cache first.
  if (window.FirmStore) {
    await window.FirmStore.getAll();
  }

  // Initialize the calculator
  window.mileageCipher = new MileageCypherCalculator();

  console.log("Mileage Cypher Calculator fully loaded and ready!");
});

// Export for global access
window.MileageCypherCalculator = MileageCypherCalculator;
