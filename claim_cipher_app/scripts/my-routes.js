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
  let pendingVoidLogId = null;
  let pendingVoidRoute = null;
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

    const statusEl = document.getElementById("statusFilter");
    const filters = {
      status: statusEl ? statusEl.value || null : null,
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

    // Batch-fetch mileage log void status for closed routes
    const closedRouteIds = currentRoutes
      .filter((r) => r.status === "closed")
      .map((r) => r.id);

    if (closedRouteIds.length > 0 && window.RouteService.getRouteMileageLogs) {
      const logsResult = await window.RouteService.getRouteMileageLogs(closedRouteIds);
      if (logsResult.success && logsResult.data) {
        logsResult.data.forEach((log) => {
          const route = currentRoutes.find((r) => r.id === log.route_id);
          if (route) {
            route._mileageLogId = log.id;
            route._voided = !!log.voided_at;
          }
        });
      }
    }

    renderRoutes(currentRoutes);
    updateRouteCount(currentRoutes.length);
  }

  /**
   * Clear all filters and reload
   */
  function clearFilters() {
    const statusEl = document.getElementById("statusFilter");
    if (statusEl) statusEl.value = "";
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
          <p class="empty-hint">Routes will appear here when you save them from the Route Cipher</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = routes
      .map(
        (route) => `
      <div class="route-item ${route.status === 'closed' ? 'route-item--closed' : ''}" data-route-id="${route.id}" data-status="${route.status}">
        <div class="rivet tl"></div><div class="rivet tr"></div><div class="rivet bl"></div><div class="rivet br"></div>
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
          ${route.status === 'closed' ? (route._voided ? '<span class="voided-indicator">Voided</span>' : '<span class="export-indicator">Included in export</span>') : ''}
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
      if (route._voided) {
        return `
          <span class="read-only-badge" style="opacity: 0.6;">
            <span class="badge-icon">🚫</span>
            Voided
          </span>
        `;
      }
      return `
        <span class="read-only-badge">
          <span class="badge-icon">🔒</span>
          Logged
        </span>
        ${route._mileageLogId ? `
          <button class="action-btn action-btn--void" data-action="void" data-route-id="${route.id}">
            <span class="btn-icon">🚫</span>
            Void Log
          </button>
        ` : ''}
      `;
    }

    if (route.status === "draft") {
      return `
        <button class="action-btn action-btn--edit" data-action="edit" data-route-id="${route.id}">
          <span class="btn-icon">✏️</span>
          Edit
        </button>
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
        <button class="action-btn action-btn--edit" data-action="edit" data-route-id="${route.id}">
          <span class="btn-icon">✏️</span>
          Edit
        </button>
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
      case "edit":
        handleEditRoute(routeId);
        break;
      case "activate":
        await handleActivate(routeId);
        break;
      case "close":
        showCloseRouteModal(routeId);
        break;
      case "delete":
        await handleDelete(routeId);
        break;
      case "void":
        showVoidLogModal(routeId);
        break;
    }
  }

  // ========================================
  // ROUTE LIFECYCLE ACTIONS
  // ========================================

  /**
   * Handle route edit - store payload and redirect to Route Cipher
   */
  function handleEditRoute(routeId) {
    const route = currentRoutes.find((r) => r.id === routeId);
    if (!route) {
      notify("Route not found", "error");
      return;
    }

    if (route.status === "closed") {
      notify("Closed routes cannot be edited", "warning");
      return;
    }

    const editPayload = {
      routeId: route.id,
      date: route.date,
      start_address: route.start_address,
      end_address: route.end_address,
      total_miles: route.total_miles,
      status: route.status,
      storedAt: Date.now()
    };

    localStorage.setItem('cipher_edit_route', JSON.stringify(editPayload));
    window.location.href = 'route-cypher.html';
  }

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
  // VOID MILEAGE LOG
  // ========================================

  /**
   * Show void log confirmation modal
   */
  function showVoidLogModal(routeId) {
    const route = currentRoutes.find((r) => r.id === routeId);
    if (!route || !route._mileageLogId) {
      notify("No mileage log found for this route", "error");
      return;
    }

    pendingVoidLogId = route._mileageLogId;
    pendingVoidRoute = route;

    // Build modal in JS (matching close route modal pattern)
    const existing = document.getElementById("voidLogModal");
    if (existing) existing.remove();

    const addressDisplay = isRoundTrip(route)
      ? `<div class="summary-row">
          <span class="summary-label">Route:</span>
          <span class="summary-value">Round-trip from ${escapeHtml(route.start_address)}</span>
        </div>`
      : `<div class="summary-row">
          <span class="summary-label">From:</span>
          <span class="summary-value">${escapeHtml(route.start_address)}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">To:</span>
          <span class="summary-value">${escapeHtml(route.end_address)}</span>
        </div>`;

    const modalHTML = `
      <div id="voidLogModal" class="cipher-modal" style="display: flex;">
        <div class="cipher-modal-content">
          <div class="cipher-modal-header">
            <h3>Void Mileage Log</h3>
            <button class="close-btn" onclick="window.closeVoidLogModal()">&times;</button>
          </div>
          <div class="cipher-modal-body">
            <p class="modal-warning">
              This removes the mileage log from <strong>exports and totals</strong> but keeps it for audit purposes.
            </p>
            <div class="route-summary">
              <div class="summary-row">
                <span class="summary-label">Date:</span>
                <span class="summary-value">${formatDate(route.date)}</span>
              </div>
              ${addressDisplay}
              <div class="summary-row summary-row--highlight">
                <span class="summary-label">Total Miles:</span>
                <span class="summary-value">${route.total_miles} miles</span>
              </div>
            </div>
          </div>
          <div class="cipher-modal-footer">
            <button class="plate-btn plate-btn--muted" onclick="window.closeVoidLogModal()">
              Cancel
            </button>
            <button id="confirmVoidBtn" class="plate-btn plate-btn--danger">
              Void Log
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);

    document.getElementById("confirmVoidBtn").addEventListener("click", confirmVoidLog);
  }

  /**
   * Close the void log modal
   */
  function closeVoidLogModal() {
    const modal = document.getElementById("voidLogModal");
    if (modal) modal.remove();
    pendingVoidLogId = null;
    pendingVoidRoute = null;
  }
  window.closeVoidLogModal = closeVoidLogModal;

  /**
   * Confirm and execute mileage log void
   */
  async function confirmVoidLog() {
    if (!pendingVoidLogId || !pendingVoidRoute) return;

    const route = pendingVoidRoute;
    const btn = document.getElementById("confirmVoidBtn");
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-icon">⏳</span> Voiding...';

    const result = await window.RouteService.voidMileageLog(pendingVoidLogId);

    btn.disabled = false;
    btn.innerHTML = '<span class="btn-icon">🚫</span> Void Log';

    if (result.success) {
      const dateStr = formatDate(route.date);
      notify(`Mileage log voided for ${dateStr} (${route.total_miles} mi). Excluded from exports.`, "success");
      closeVoidLogModal();
      await loadRoutes();
    } else {
      notify(result.error || "Failed to void mileage log", "error");
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
            <p>No mileage logs yet</p>
            <p class="empty-hint">Close active routes to create exportable mileage logs</p>
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
      notify("No closed routes in this date range. Close routes first to create mileage logs.", "info");
      return;
    }

    generateCsv(logs, dateFrom, dateTo);
    closeExportModal();
  }

  /**
   * Escape a value for CSV (wrap in quotes if it contains commas, quotes, or newlines)
   */
  function csvEscape(value) {
    const str = String(value == null ? '' : value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  /**
   * Generate and download CSV file
   */
  function generateCsv(logs, dateFrom, dateTo) {
    const headers = [
      "Log Date",
      "Route Ref",
      "Start Address",
      "End Address",
      "Total Miles",
      "Stops",
      "Miles Per Stop",
      "Business Purpose",
    ];

    const rows = logs.map((log) => {
      const stops = log.claim_count || 0;
      const milesPerStop = stops > 0
        ? (parseFloat(log.total_miles) / stops).toFixed(1)
        : '';
      const routeRef = log.route_id ? 'R-' + log.route_id.slice(0, 8) : '';

      return [
        log.log_date,
        routeRef,
        csvEscape(log.start_address || ''),
        csvEscape(log.end_address || ''),
        log.total_miles,
        stops,
        milesPerStop,
        csvEscape('Business – Claims Inspection'),
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
    notify(`Exported ${logs.length} routes · ${totalMiles.toFixed(1)} total miles`, "success");
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
