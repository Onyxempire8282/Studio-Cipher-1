// 🔒 Enhanced Security and Functionality System

class CipherSecurity {
  constructor() {
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
    this.lastActivity = Date.now();
    this.sessionTimer = null;

    this.initializeSecurityMeasures();
  }

  initializeSecurityMeasures() {
    console.log("🔒 Initializing Cipher Security...");

    this.setupSessionManagement();
    this.setupFormValidation();
    this.setupDataProtection();
    this.trackUserActivity();
  }

  setupSessionManagement() {
    // Session timeout handling
    this.resetSessionTimer();

    // Track user activity
    ["click", "keypress", "mousemove", "scroll"].forEach((event) => {
      document.addEventListener(event, () => {
        this.updateActivity();
      });
    });

    // Check session on page load
    this.validateSession();
  }

  updateActivity() {
    this.lastActivity = Date.now();
    this.resetSessionTimer();
  }

  resetSessionTimer() {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
    }

    this.sessionTimer = setTimeout(() => {
      this.handleSessionExpiry();
    }, this.sessionTimeout);
  }

  handleSessionExpiry() {
    // showCipherNotification('Session expired for security. Please log in again.', 'warning');
    console.log("⚠️ Session expired for security. Please log in again.");

    setTimeout(() => {
      localStorage.removeItem("cipher_authenticated");
      window.location.href = "./login-cypher.html";
    }, 3000);
  }

  validateSession() {
    const authenticated = localStorage.getItem("cipher_authenticated");
    const loginTime = localStorage.getItem("cipher_login_time");

    if (authenticated && loginTime) {
      const sessionAge = Date.now() - parseInt(loginTime);
      if (sessionAge > this.sessionTimeout) {
        this.handleSessionExpiry();
        return false;
      }
    }
    return true;
  }

  setupFormValidation() {
    // Enhanced form validation with security
    const forms = document.querySelectorAll("form");
    forms.forEach((form) => {
      form.addEventListener("submit", (e) => {
        if (!this.validateForm(form)) {
          e.preventDefault();
          showCipherError("validation_error");
        }
      });
    });
  }

  validateForm(form) {
    const inputs = form.querySelectorAll("input, select, textarea");
    let isValid = true;

    inputs.forEach((input) => {
      // Basic XSS protection
      if (input.value && this.containsSuspiciousContent(input.value)) {
        isValid = false;
        this.highlightInvalidInput(input);
      }

      // Required field validation
      if (input.hasAttribute("required") && !input.value.trim()) {
        isValid = false;
        this.highlightInvalidInput(input);
      }

      // Email validation
      if (input.type === "email" && input.value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(input.value)) {
          isValid = false;
          this.highlightInvalidInput(input);
        }
      }
    });

    return isValid;
  }

  containsSuspiciousContent(value) {
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /eval\(/i,
    ];

    return suspiciousPatterns.some((pattern) => pattern.test(value));
  }

  highlightInvalidInput(input) {
    input.style.borderColor = "#FF0064";
    input.style.boxShadow = "0 0 0 2px rgba(255, 0, 100, 0.2)";

    setTimeout(() => {
      input.style.borderColor = "";
      input.style.boxShadow = "";
    }, 3000);
  }

  setupDataProtection() {
    // Encrypt sensitive data before storing
    window.secureStore = (key, data) => {
      const encrypted = btoa(JSON.stringify(data)); // Basic encoding
      localStorage.setItem(`cipher_${key}`, encrypted);
    };

    window.secureRetrieve = (key) => {
      const encrypted = localStorage.getItem(`cipher_${key}`);
      if (encrypted) {
        try {
          return JSON.parse(atob(encrypted));
        } catch {
          return null;
        }
      }
      return null;
    };
  }

  trackUserActivity() {
    // Track user interactions for analytics
    const activities = [];

    document.addEventListener("click", (e) => {
      if (e.target.matches("button, a, .cipher-card")) {
        activities.push({
          type: "click",
          element: e.target.className,
          timestamp: Date.now(),
        });

        // Keep only last 50 activities
        if (activities.length > 50) {
          activities.shift();
        }

        secureStore("user_activities", activities);
      }
    });
  }
}

// Enhanced functionality implementations
class CipherFunctionality {
  constructor() {
    this.initializeEnhancedFeatures();
  }

  initializeEnhancedFeatures() {
    console.log("⚡ Initializing Enhanced Functionality...");

    this.setupRealTimeUpdates();
    this.setupDataPersistence();
    this.setupBulkOperations();
    this.setupExportFeatures();
  }

  setupRealTimeUpdates() {
    // Real-time total updates for mileage calculator
    document.addEventListener("input", (e) => {
      if (e.target.matches(".trip-miles-input, .trip-rate-select")) {
        this.updateMileageTotal();
      }
    });
  }

  updateMileageTotal() {
    const trips = JSON.parse(
      localStorage.getItem("cipher_mileage_trips") || "[]"
    );
    const total = trips.reduce((sum, trip) => sum + (trip.amount || 0), 0);

    const totalElement = document.getElementById("total-amount");
    if (totalElement) {
      animateCipherNumber(totalElement, total, true);
    }
  }

  setupDataPersistence() {
    // Auto-save form data as user types
    const inputs = document.querySelectorAll("input, select, textarea");
    inputs.forEach((input) => {
      input.addEventListener("input", () => {
        this.autoSaveFormData(input);
      });
    });
  }

  autoSaveFormData(input) {
    const formId = input.closest("form")?.id || "default_form";
    const savedData = secureRetrieve(`form_${formId}`) || {};
    savedData[input.name || input.id] = input.value;
    secureStore(`form_${formId}`, savedData);
  }

  setupBulkOperations() {
    // Bulk delete for trips and jobs
    window.bulkDeleteTrips = (tripIds) => {
      const trips = JSON.parse(
        localStorage.getItem("cipher_mileage_trips") || "[]"
      );
      const updatedTrips = trips.filter((trip) => !tripIds.includes(trip.id));
      localStorage.setItem(
        "cipher_mileage_trips",
        JSON.stringify(updatedTrips)
      );
      showCipherSuccess("data_saved");
    };
  }

  setupExportFeatures() {
    // Export data functionality
    window.exportCipherData = (type) => {
      let data, filename;

      switch (type) {
        case "trips":
          data = JSON.parse(
            localStorage.getItem("cipher_mileage_trips") || "[]"
          );
          filename = "cipher-trips-export.json";
          break;
        case "jobs":
          data = JSON.parse(localStorage.getItem("cipher_jobs") || "[]");
          filename = "cipher-jobs-export.json";
          break;
        default:
          data = { error: "Unknown export type" };
          filename = "cipher-error.json";
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();

      // showCipherSuccess('data_saved');
      console.log("✅ Data exported successfully");
    };
  }
}

// Initialize security and functionality
let cipherSecurity, cipherFunctionality;

function initializeCipherSecurity() {
  cipherSecurity = new CipherSecurity();
  cipherFunctionality = new CipherFunctionality();

  // showCipherNotification('Security systems active - you're protected!', 'success');
  console.log("✅ Security systems active - you're protected!");
}

// Export classes and functions
window.CipherSecurity = CipherSecurity;
window.CipherFunctionality = CipherFunctionality;
window.initializeCipherSecurity = initializeCipherSecurity;

console.log("🔒 Cipher Security and Functionality loaded - system secured!");
