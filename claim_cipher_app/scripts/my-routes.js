/**
 * My Routes Page Controller
 * Handles route listing, lifecycle actions, and mileage log export
 */

(function () {
  "use strict";

  // State
  let currentRoutes = [];
  let pendingCloseRouteId = null;

  /**
   * Initialize the page
   */
  async function init() {
    console.log("📋 My Routes initializing...");
    setupEventListeners();
    await loadRoutes();
    updateUserDisplay();
  }

  /**
   * Set up event listeners
   */
  function setupEventListeners() {
    // Filters
    document
      .getElementById("applyFilters")
      ?.addEventListener("click", loadRoutes);
    document
      .getElementById("clearFilters")
      ?.addEventListener("click", clearFilters);

    // Export
    document
      .getElementById("exportCsvBtn")
      ?.addEventListener("click", showExportModal);
    document
      .getElementById("confirmExportBtn")
      ?.addEventListener("click", exportToCsv);

    // Close route confirmation
    document
      .getElementById("confirmCloseBtn")
      ?.addEventListener("click", confirmCloseRoute);

    // Filter on Enter key
    document.querySelectorAll(".filter-input, .filter-select").forEach((el) => {
      el.addEventListener("keypress", (e) => {
        if (e.key === "Enter") loadRoutes();
      });
    });
  }

  /**
   * Update user display in header
   */
  async function updateUserDisplay() {
    try {
      const { user } = await window.SupabaseAuth.getSession();
      if (user) {
        const userName =
          user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
        document.getElementById("userName").textContent = userName;
      }
    } catch (err) {
      console.warn("Could not update user display:", err);
    }
  }

  // ========================================
  // ROUTE LISTING
  // ========================================

  /**
   * Load routes from Supabase with current filters
   */
  async function loadRoutes() {
    const listContainer = document.getElementById("routesList");
    listContainer.innerHTML = `
      <div class="routes-loading">
        <div class="cipher-spinner"></div>
        <span>Loading routes...</span>
      </div>
    `;

    const filters = {
      status: document.getElementById("statusFilter")?.value || null,
      dateFrom: document.getElementById("dateFromFilter")?.value || null,
      dateTo: document.getElementById("dateToFilter")?.value || null,
    };

    // Remove null/empty filters
    Object.keys(filters).forEach((key) => {
      if (!filters[key]) delete filters[key];
    });

    const result = await window.RouteService.listRoutes(filters);

    if (!result.success) {
      listContainer.innerHTML = `
        <div class="routes-error">
          <span class="error-icon">⚠️</span>
          <span>Error loading routes: ${escapeHtml(result.error)}</span>
        </div>
      `;
      return;
    }

    currentRoutes = result.data;
    renderRoutes(result.data);
    updateRouteCount(result.data.length);
  }

  /**
   * Clear all filters and reload
   */
  function clearFilters() {
    document.getElementById("statusFilter").value = "";
    document.getElementById("dateFromFilter").value = "";
    document.getElementById("dateToFilter").value = "";
    loadRoutes();
  }

  /**
   * Update the route count badge
   */
  function updateRouteCount(count) {
    const countEl = document.getElementById("routeCount");
    if (countEl) {
      countEl.textContent = count > 0 ? `(${count})` : "";
    }
  }

  /**
   * Render the routes list
   */
  function renderRoutes(routes) {
    const listContainer = document.getElementById("routesList");

    if (!routes || routes.length === 0) {
      listContainer.innerHTML = `
        <div class="routes-empty">
          <span class="empty-icon">📭</span>
          <p>No routes found</p>
          <p class="empty-hint">Routes will appear here when you save them from the Route Optimizer</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = routes
      .map(
        (route) => `
      <div class="route-item" data-route-id="${route.id}" data-status="${route.status}">
        <div class="route-info">
          <div class="route-date">${formatDate(route.date)}</div>
          <div class="route-addresses">
            <span class="address-label">From:</span>
            <span class="start-address">${escapeHtml(route.start_address)}</span>
          </div>
          <div class="route-addresses">
            <span class="address-label">To:</span>
            <span class="end-address">${escapeHtml(route.end_address)}</span>
          </div>
        </div>
        <div class="route-meta">
          <div class="route-miles ${route.total_miles ? "" : "miles-missing"}">
            ${route.total_miles ? route.total_miles + " miles" : "Miles not set"}
          </div>
          <span class="cipher-badge cipher-badge--${getStatusBadgeClass(route.status)}">
            ${route.status}
          </span>
        </div>
        <div class="route-actions">
          ${renderRouteActions(route)}
        </div>
      </div>
    `
      )
      .join("");

    attachActionListeners();
  }

  /**
   * Render action buttons based on route status
   */
  function renderRouteActions(route) {
    if (route.status === "closed") {
      return `
        <span class="read-only-badge">
          <span class="badge-icon">🔒</span>
          Logged
        </span>
      `;
    }

    if (route.status === "draft") {
      return `
        <button class="action-btn action-btn--activate" data-action="activate" data-route-id="${route.id}">
          <span class="btn-icon">✅</span>
          Activate
        </button>
        <button class="action-btn action-btn--delete" data-action="delete" data-route-id="${route.id}">
          <span class="btn-icon">🗑️</span>
        </button>
      `;
    }

    if (route.status === "active") {
      const canClose = route.total_miles !== null && route.total_miles > 0;
      return `
        <button class="action-btn action-btn--close ${canClose ? "" : "action-btn--disabled"}"
                data-action="close"
                data-route-id="${route.id}"
                ${canClose ? "" : "disabled"}>
          <span class="btn-icon">🔒</span>
          Close Route
        </button>
        ${!canClose ? '<span class="action-hint">Set miles first</span>' : ""}
      `;
    }

    return "";
  }

  /**
   * Attach click listeners to action buttons
   */
  function attachActionListeners() {
    document.querySelectorAll(".action-btn[data-action]").forEach((btn) => {
      btn.addEventListener("click", handleActionClick);
    });
  }

  /**
   * Handle action button clicks
   */
  async function handleActionClick(e) {
    const btn = e.currentTarget;
    const action = btn.dataset.action;
    const routeId = btn.dataset.routeId;

    if (btn.disabled || btn.classList.contains("action-btn--disabled")) {
      return;
    }

    switch (action) {
      case "activate":
        await handleActivate(routeId);
        break;
      case "close":
        showCloseRouteModal(routeId);
        break;
      case "delete":
        await handleDelete(routeId);
        break;
    }
  }

  // ========================================
  // ROUTE LIFECYCLE ACTIONS
  // ========================================

  /**
   * Handle route activation (draft -> active)
   */
  async function handleActivate(routeId) {
    const result = await window.RouteService.activateRoute(routeId);
    if (result.success) {
      notify("Route activated successfully", "success");
      await loadRoutes();
    } else {
      notify(result.error || "Failed to activate route", "error");
    }
  }

  /**
   * Handle route deletion (draft only)
   */
  async function handleDelete(routeId) {
    if (!confirm("Delete this draft route? This cannot be undone.")) {
      return;
    }

    const result = await window.RouteService.deleteRoute(routeId);
    if (result.success) {
      notify("Route deleted", "success");
      await loadRoutes();
    } else {
      notify(result.error || "Failed to delete route", "error");
    }
  }

  /**
   * Show close route confirmation modal
   */
  function showCloseRouteModal(routeId) {
    const route = currentRoutes.find((r) => r.id === routeId);
    if (!route) return;

    pendingCloseRouteId = routeId;

    const summaryEl = document.getElementById("closeRouteSummary");
    summaryEl.innerHTML = `
      <div class="summary-row">
        <span class="summary-label">Date:</span>
        <span class="summary-value">${formatDate(route.date)}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">From:</span>
        <span class="summary-value">${escapeHtml(route.start_address)}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">To:</span>
        <span class="summary-value">${escapeHtml(route.end_address)}</span>
      </div>
      <div class="summary-row summary-row--highlight">
        <span class="summary-label">Total Miles:</span>
        <span class="summary-value">${route.total_miles} miles</span>
      </div>
    `;

    document.getElementById("closeRouteModal").style.display = "flex";
  }

  /**
   * Close the close route modal
   */
  function closeCloseRouteModal() {
    document.getElementById("closeRouteModal").style.display = "none";
    pendingCloseRouteId = null;
  }
  window.closeCloseRouteModal = closeCloseRouteModal;

  /**
   * Confirm and execute route closure
   */
  async function confirmCloseRoute() {
    if (!pendingCloseRouteId) return;

    const btn = document.getElementById("confirmCloseBtn");
    btn.disabled = true;
    btn.innerHTML =
      '<span class="btn-icon">⏳</span> Closing...';

    const result = await window.RouteService.closeRoute(pendingCloseRouteId, {});

    btn.disabled = false;
    btn.innerHTML =
      '<span class="btn-icon">🔒</span> Close Route & Log Mileage';

    if (result.success) {
      notify("Mileage logged and ready for export.", "success");
      closeCloseRouteModal();
      await loadRoutes();
    } else {
      notify(result.error || "Failed to close route", "error");
    }
  }

  // ========================================
  // CSV EXPORT
  // ========================================

  /**
   * Show export modal with default date range
   */
  function showExportModal() {
    // Default to current year
    const now = new Date();
    const yearStart = `${now.getFullYear()}-01-01`;
    const today = now.toISOString().split("T")[0];

    document.getElementById("exportDateFrom").value = yearStart;
    document.getElementById("exportDateTo").value = today;
    document.getElementById("exportModal").style.display = "flex";
  }

  /**
   * Close export modal
   */
  function closeExportModal() {
    document.getElementById("exportModal").style.display = "none";
  }
  window.closeExportModal = closeExportModal;

  /**
   * Export mileage logs to CSV
   */
  async function exportToCsv() {
    const dateFrom = document.getElementById("exportDateFrom").value;
    const dateTo = document.getElementById("exportDateTo").value;

    if (!dateFrom || !dateTo) {
      notify("Please select both start and end dates", "warning");
      return;
    }

    if (dateFrom > dateTo) {
      notify("Start date must be before end date", "warning");
      return;
    }

    const btn = document.getElementById("confirmExportBtn");
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-icon">⏳</span> Exporting...';

    const result = await window.RouteService.getMileageLogs(dateFrom, dateTo);

    btn.disabled = false;
    btn.innerHTML = '<span class="btn-icon">💾</span> Download CSV';

    if (!result.success) {
      notify(result.error || "Failed to fetch mileage logs", "error");
      return;
    }

    if (result.data.length === 0) {
      notify("No mileage logs found for selected date range", "info");
      return;
    }

    generateCsv(result.data, dateFrom, dateTo);
    closeExportModal();
  }

  /**
   * Generate and download CSV file
   */
  function generateCsv(logs, dateFrom, dateTo) {
    // IRS-friendly columns
    const headers = [
      "Date",
      "Start Address",
      "End Address",
      "Total Miles",
      "Business Purpose",
      "Claim Count",
      "Claim IDs",
    ];

    const rows = logs.map((log) => [
      log.log_date,
      `"${(log.start_address || "").replace(/"/g, '""')}"`,
      `"${(log.end_address || "").replace(/"/g, '""')}"`,
      log.total_miles,
      "Business - Claims Inspection",
      log.claim_count || 0,
      `"${(log.claim_ids || []).join("; ")}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join(
      "\n"
    );

    // Add BOM for Excel compatibility
    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mileage_log_${dateFrom}_to_${dateTo}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    notify(`Exported ${logs.length} mileage records`, "success");
  }

  // ========================================
  // UTILITIES
  // ========================================

  /**
   * Get badge class for status
   */
  function getStatusBadgeClass(status) {
    switch (status) {
      case "draft":
        return "info";
      case "active":
        return "warning";
      case "closed":
        return "success";
      default:
        return "info";
    }
  }

  /**
   * Format date for display
   */
  function formatDate(dateStr) {
    if (!dateStr) return "No date";
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Show notification
   */
  function notify(message, type = "info") {
    if (window.showCipherNotification) {
      window.showCipherNotification(message, type);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
      // Fallback alert for critical errors
      if (type === "error") {
        alert(message);
      }
    }
  }

  // ========================================
  // INITIALIZATION
  // ========================================

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
