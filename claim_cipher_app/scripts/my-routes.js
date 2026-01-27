/**
 * My Routes Page Controller
 * Handles route listing, lifecycle actions, and mileage log export
 */

(function () {
  "use strict";

  // State
  let currentRoutes = [];
  let pendingCloseRouteId = null;
  let pendingCloseRoute = null;
  let exportPreviewLogs = [];

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

    // Export date change listeners for preview
    document
      .getElementById("exportDateFrom")
      ?.addEventListener("change", updateExportPreview);
    document
      .getElementById("exportDateTo")
      ?.addEventListener("change", updateExportPreview);

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
   * Determine if route is a round-trip (start === end)
   */
  function isRoundTrip(route) {
    if (!route.start_address || !route.end_address) return false;
    return route.start_address.trim().toLowerCase() === route.end_address.trim().toLowerCase();
  }

  /**
   * Format route address display
   * Shows "Round-trip from X" if start === end
   */
  function formatRouteAddresses(route) {
    if (isRoundTrip(route)) {
      return `
        <div class="route-addresses route-addresses--roundtrip">
          <span class="trip-type-badge">Round Trip</span>
          <span class="route-address">${escapeHtml(route.start_address)}</span>
        </div>
      `;
    }
    return `
      <div class="route-addresses">
        <span class="trip-type-badge trip-type-badge--oneway">One Way</span>
      </div>
      <div class="route-addresses">
        <span class="address-label">From:</span>
        <span class="start-address">${escapeHtml(route.start_address)}</span>
      </div>
      <div class="route-addresses">
        <span class="address-label">To:</span>
        <span class="end-address">${escapeHtml(route.end_address)}</span>
      </div>
    `;
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
      <div class="route-item ${route.status === 'closed' ? 'route-item--closed' : ''}" data-route-id="${route.id}" data-status="${route.status}">
        <div class="route-info">
          <div class="route-date">${formatDate(route.date)}</div>
          ${formatRouteAddresses(route)}
        </div>
        <div class="route-meta">
          <div class="route-miles ${route.total_miles ? "" : "miles-missing"}">
            ${route.total_miles ? route.total_miles + " miles" : "Miles not set"}
          </div>
          <span class="cipher-badge cipher-badge--${getStatusBadgeClass(route.status)}">
            ${route.status}
          </span>
          ${route.status === 'closed' ? '<span class="export-indicator">Included in export</span>' : ''}
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
    pendingCloseRoute = route;

    const summaryEl = document.getElementById("closeRouteSummary");

    // Format address display based on round-trip
    let addressHtml;
    if (isRoundTrip(route)) {
      addressHtml = `
        <div class="summary-row">
          <span class="summary-label">Route:</span>
          <span class="summary-value">Round-trip from ${escapeHtml(route.start_address)}</span>
        </div>
      `;
    } else {
      addressHtml = `
        <div class="summary-row">
          <span class="summary-label">From:</span>
          <span class="summary-value">${escapeHtml(route.start_address)}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">To:</span>
          <span class="summary-value">${escapeHtml(route.end_address)}</span>
        </div>
      `;
    }

    summaryEl.innerHTML = `
      <div class="summary-row">
        <span class="summary-label">Date:</span>
        <span class="summary-value">${formatDate(route.date)}</span>
      </div>
      ${addressHtml}
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
    pendingCloseRoute = null;
  }
  window.closeCloseRouteModal = closeCloseRouteModal;

  /**
   * Confirm and execute route closure
   */
  async function confirmCloseRoute() {
    if (!pendingCloseRouteId || !pendingCloseRoute) return;

    const route = pendingCloseRoute;
    const btn = document.getElementById("confirmCloseBtn");
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-icon">⏳</span> Closing...';

    const result = await window.RouteService.closeRoute(pendingCloseRouteId, {});

    btn.disabled = false;
    btn.innerHTML = '<span class="btn-icon">🔒</span> Close Route & Log Mileage';

    if (result.success) {
      // Show detailed success message with date and miles
      const dateStr = formatDate(route.date);
      notify(`${route.total_miles} miles logged for ${dateStr}. Ready for export.`, "success");
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
   * Show export modal with auto-populated date range from existing logs
   */
  async function showExportModal() {
    const modal = document.getElementById("exportModal");
    const summaryEl = document.getElementById("exportSummary");
    const downloadBtn = document.getElementById("confirmExportBtn");

    // Show loading state
    modal.style.display = "flex";
    if (summaryEl) {
      summaryEl.innerHTML = '<span class="export-loading">Loading mileage logs...</span>';
    }

    // Fetch ALL mileage logs to determine date range
    const result = await window.RouteService.getMileageLogs('1900-01-01', '2100-12-31');

    if (!result.success) {
      if (summaryEl) {
        summaryEl.innerHTML = `<span class="export-error">Error loading logs: ${escapeHtml(result.error)}</span>`;
      }
      downloadBtn.disabled = true;
      return;
    }

    const logs = result.data || [];

    if (logs.length === 0) {
      // No logs exist - show empty state
      document.getElementById("exportDateFrom").value = "";
      document.getElementById("exportDateTo").value = "";
      if (summaryEl) {
        summaryEl.innerHTML = `
          <div class="export-empty">
            <span class="empty-icon">📭</span>
            <p>No mileage logs found</p>
            <p class="empty-hint">Close routes to create mileage logs for export</p>
          </div>
        `;
      }
      downloadBtn.disabled = true;
      downloadBtn.innerHTML = '<span class="btn-icon">💾</span> No Logs to Export';
      return;
    }

    // Calculate date range from existing logs
    const dates = logs.map(log => log.log_date).sort();
    const minDate = dates[0];
    const maxDate = dates[dates.length - 1];

    document.getElementById("exportDateFrom").value = minDate;
    document.getElementById("exportDateTo").value = maxDate;

    // Store for export and show preview
    exportPreviewLogs = logs;
    updateExportSummary(logs);
    downloadBtn.disabled = false;
    downloadBtn.innerHTML = '<span class="btn-icon">💾</span> Download CSV';
  }

  /**
   * Update export preview when dates change
   */
  async function updateExportPreview() {
    const dateFrom = document.getElementById("exportDateFrom").value;
    const dateTo = document.getElementById("exportDateTo").value;
    const summaryEl = document.getElementById("exportSummary");
    const downloadBtn = document.getElementById("confirmExportBtn");

    if (!dateFrom || !dateTo) {
      if (summaryEl) {
        summaryEl.innerHTML = '<span class="export-hint">Select date range to preview</span>';
      }
      downloadBtn.disabled = true;
      return;
    }

    if (dateFrom > dateTo) {
      if (summaryEl) {
        summaryEl.innerHTML = '<span class="export-error">Start date must be before end date</span>';
      }
      downloadBtn.disabled = true;
      return;
    }

    // Fetch logs for the selected range
    const result = await window.RouteService.getMileageLogs(dateFrom, dateTo);

    if (!result.success) {
      if (summaryEl) {
        summaryEl.innerHTML = `<span class="export-error">Error: ${escapeHtml(result.error)}</span>`;
      }
      downloadBtn.disabled = true;
      return;
    }

    exportPreviewLogs = result.data || [];
    updateExportSummary(exportPreviewLogs);

    if (exportPreviewLogs.length === 0) {
      downloadBtn.disabled = true;
      downloadBtn.innerHTML = '<span class="btn-icon">💾</span> No Logs in Range';
    } else {
      downloadBtn.disabled = false;
      downloadBtn.innerHTML = '<span class="btn-icon">💾</span> Download CSV';
    }
  }

  /**
   * Update export summary display
   */
  function updateExportSummary(logs) {
    const summaryEl = document.getElementById("exportSummary");
    if (!summaryEl) return;

    if (!logs || logs.length === 0) {
      summaryEl.innerHTML = `
        <div class="export-empty-range">
          <span class="empty-icon">📭</span>
          <p>No mileage logs in selected date range</p>
        </div>
      `;
      return;
    }

    const totalMiles = logs.reduce((sum, log) => sum + (parseFloat(log.total_miles) || 0), 0);

    summaryEl.innerHTML = `
      <div class="export-preview">
        <div class="preview-stat">
          <span class="stat-value">${logs.length}</span>
          <span class="stat-label">${logs.length === 1 ? 'route' : 'routes'}</span>
        </div>
        <div class="preview-divider">·</div>
        <div class="preview-stat">
          <span class="stat-value">${totalMiles.toFixed(1)}</span>
          <span class="stat-label">total miles</span>
        </div>
      </div>
    `;
  }

  /**
   * Close export modal
   */
  function closeExportModal() {
    document.getElementById("exportModal").style.display = "none";
    exportPreviewLogs = [];
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

    // Use cached logs if available, otherwise fetch
    let logs = exportPreviewLogs;
    if (!logs || logs.length === 0) {
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

      logs = result.data;
    }

    if (logs.length === 0) {
      notify("No mileage logs found for selected date range", "info");
      return;
    }

    generateCsv(logs, dateFrom, dateTo);
    closeExportModal();
  }

  /**
   * Generate and download CSV file
   */
  function generateCsv(logs, dateFrom, dateTo) {
    // IRS-friendly columns
    const headers = [
      "Date",
      "Trip Type",
      "Start Address",
      "End Address",
      "Total Miles",
      "Business Purpose",
      "Claim Count",
      "Claim IDs",
    ];

    const rows = logs.map((log) => {
      const isRT = log.start_address && log.end_address &&
                   log.start_address.trim().toLowerCase() === log.end_address.trim().toLowerCase();
      return [
        log.log_date,
        isRT ? "Round Trip" : "One Way",
        `"${(log.start_address || "").replace(/"/g, '""')}"`,
        `"${(log.end_address || "").replace(/"/g, '""')}"`,
        log.total_miles,
        "Business - Claims Inspection",
        log.claim_count || 0,
        `"${(log.claim_ids || []).join("; ")}"`,
      ];
    });

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

    const totalMiles = logs.reduce((sum, log) => sum + (parseFloat(log.total_miles) || 0), 0);
    notify(`Exported ${logs.length} routes · ${totalMiles.toFixed(1)} miles`, "success");
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
