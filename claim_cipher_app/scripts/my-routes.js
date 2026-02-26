/**
 * My Routes Page Controller
 * Handles route listing, lifecycle actions, and mileage log export
 */

(function () {
  "use strict";

  // State
  let allRoutes = [];              // Full unfiltered set from server
  let currentStatusFilter = 'all'; // Active pill selection
  let pendingCloseRouteId = null;
  let pendingCloseRoute = null;
  let pendingVoidLogId = null;
  let pendingVoidRoute = null;
  let exportPreviewLogs = [];

  /**
   * Initialize the page
   */
  async function init() {

    if (window.BillingGuard && window.BillingGuard.waitForAccess) {
      const allowed = await window.BillingGuard.waitForAccess();
      if (!allowed) return;
    }
    setupEventListeners();
    await loadRoutes();
    updateUserDisplay();
  }

  /**
   * Set up event listeners
   */
  function setupEventListeners() {
    // Date filters
    document.getElementById("applyFilters")
      ?.addEventListener("click", loadRoutes);
    document.getElementById("clearFilters")
      ?.addEventListener("click", clearFilters);

    // Status pills
    document.querySelectorAll('.pill[data-filter]').forEach(pill => {
      pill.addEventListener('click', () => setPillFilter(pill.dataset.filter));
    });

    // Export
    document.getElementById("exportCsvBtn")
      ?.addEventListener("click", showExportModal);
    document.getElementById("confirmExportBtn")
      ?.addEventListener("click", exportToCsv);

    // Export date change listeners for preview
    document.getElementById("exportDateFrom")
      ?.addEventListener("change", updateExportPreview);
    document.getElementById("exportDateTo")
      ?.addEventListener("change", updateExportPreview);

    // Close route confirmation
    document.getElementById("confirmCloseBtn")
      ?.addEventListener("click", confirmCloseRoute);

    // Filter on Enter key in date inputs
    document.querySelectorAll(".filter-input").forEach(el => {
      el.addEventListener("keypress", e => {
        if (e.key === "Enter") loadRoutes();
      });
    });
  }

  /**
   * Update user display in nav
   */
  async function updateUserDisplay() {
    try {
      const { user } = await window.SupabaseAuth.getSession();
      if (user) {
        const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
        const el = document.getElementById("userName");
        if (el) el.textContent = name;
      }
    } catch (err) {
      console.warn("Could not update user display:", err);
    }
  }

  // ========================================
  // FILTER & PILL LOGIC
  // ========================================

  /**
   * Set the active status pill and re-render from cached allRoutes
   */
  function setPillFilter(type) {
    currentStatusFilter = type;
    document.querySelectorAll('.pill').forEach(p => {
      p.className = 'pill';
      if (p.dataset.filter === type) p.classList.add('active-' + type);
    });
    applyFilter();
  }

  /**
   * Apply currentStatusFilter client-side from allRoutes
   */
  function applyFilter() {
    let filtered;
    switch (currentStatusFilter) {
      case 'open':
        filtered = allRoutes.filter(r => r.status !== 'closed');
        break;
      case 'closed':
        filtered = allRoutes.filter(r => r.status === 'closed' && !r._voided);
        break;
      case 'void':
        filtered = allRoutes.filter(r => r.status === 'closed' && r._voided);
        break;
      default: // 'all'
        filtered = [...allRoutes];
    }
    renderRoutes(filtered);
    updateRouteCount(filtered.length);
  }

  /**
   * Clear all filters and reload from server
   */
  function clearFilters() {
    const dateFrom = document.getElementById("dateFromFilter");
    const dateTo = document.getElementById("dateToFilter");
    if (dateFrom) dateFrom.value = "";
    if (dateTo) dateTo.value = "";

    currentStatusFilter = 'all';
    document.querySelectorAll('.pill').forEach(p => p.className = 'pill');
    const allPill = document.querySelector('.pill[data-filter="all"]');
    if (allPill) allPill.classList.add('active-all');

    loadRoutes();
  }

  // ========================================
  // ROUTE LISTING
  // ========================================

  /**
   * Load all routes from Supabase, apply optional date filters
   */
  async function loadRoutes() {
    showLoadingState();

    const filters = {};
    const dateFrom = document.getElementById("dateFromFilter")?.value;
    const dateTo   = document.getElementById("dateToFilter")?.value;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo)   filters.dateTo   = dateTo;

    const result = await window.RouteService.listRoutes(filters);

    if (!result.success) {
      showErrorState(result.error);
      return;
    }

    allRoutes = result.data;

    // Batch-fetch mileage log void status for closed routes
    const closedIds = allRoutes.filter(r => r.status === 'closed').map(r => r.id);
    if (closedIds.length > 0 && window.RouteService.getRouteMileageLogs) {
      const logsResult = await window.RouteService.getRouteMileageLogs(closedIds);
      if (logsResult.success && logsResult.data) {
        logsResult.data.forEach(log => {
          const route = allRoutes.find(r => r.id === log.route_id);
          if (route) {
            route._mileageLogId = log.id;
            route._voided = !!log.voided_at;
          }
        });
      }
    }

    updateHeaderStats(allRoutes);
    updateTotalsStrip(allRoutes);
    applyFilter();
  }

  function showLoadingState() {
    const list = document.getElementById('routesList');
    if (list) list.innerHTML = `
      <div class="routes-state">
        <div class="spinner"></div>
        <div class="state-label">Loading routes...</div>
      </div>`;
  }

  function showErrorState(error) {
    const list = document.getElementById('routesList');
    if (list) list.innerHTML = `
      <div class="routes-state">
        <div class="state-icon">⚠️</div>
        <div class="state-label">Error loading routes</div>
        <div class="state-sub">${escapeHtml(error)}</div>
      </div>`;
  }

  /**
   * Update the route count label
   */
  function updateRouteCount(count) {
    const el = document.getElementById("routeCount");
    if (el) el.textContent = count > 0 ? `(${count})` : "";
  }

  /**
   * Update header badge stats from all routes (unfiltered)
   */
  function updateHeaderStats(routes) {
    const closedNonVoided = routes.filter(r => r.status === 'closed' && !r._voided);
    const open = routes.filter(r => r.status !== 'closed').length;
    const totalMiles = closedNonVoided.reduce((s, r) => s + (parseFloat(r.total_miles) || 0), 0);

    setElText('hTotal',  routes.length);
    setElText('hClosed', closedNonVoided.length);
    setElText('hOpen',   open);
    setElText('hMiles',  totalMiles.toFixed(1));
  }

  /**
   * Update totals strip from all routes (unfiltered)
   */
  function updateTotalsStrip(routes) {
    const closedNonVoided = routes.filter(r => r.status === 'closed' && !r._voided);
    const totalMiles = closedNonVoided.reduce((s, r) => s + (parseFloat(r.total_miles) || 0), 0);
    const avg = closedNonVoided.length > 0 ? totalMiles / closedNonVoided.length : 0;

    setElText('sumTotal',  routes.length);
    setElText('sumClosed', closedNonVoided.length);

    const milesEl = document.getElementById('sumTotalMiles');
    if (milesEl) milesEl.innerHTML = milesHtml(totalMiles);

    const avgEl = document.getElementById('sumAvg');
    if (avgEl) avgEl.innerHTML = milesHtml(avg);
  }

  function setElText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  // ========================================
  // ROUTE CARD RENDERING
  // ========================================

  /**
   * Determine if route is a round-trip (start === end)
   */
  function isRoundTrip(route) {
    if (!route.start_address || !route.end_address) return false;
    return route.start_address.trim().toLowerCase() === route.end_address.trim().toLowerCase();
  }

  /**
   * Map route data model to card CSS status
   */
  function getCardStatus(route) {
    if (route.status === 'closed' && route._voided) return 'void';
    if (route.status === 'closed') return 'closed';
    return 'open'; // draft + active both render as open
  }

  /**
   * Human-readable status label for badge
   */
  function getStatusLabel(route) {
    if (route.status === 'closed' && route._voided) return 'Void';
    if (route.status === 'closed') return 'Closed';
    if (route.status === 'active') return 'Open';
    return 'Draft';
  }

  /**
   * Split miles float into integer and fractional parts for display
   */
  function splitMiles(miles) {
    const m = parseFloat(miles);
    if (!miles && miles !== 0 || isNaN(m)) return { int: '—', frac: '' };
    const [int, frac] = m.toFixed(1).split('.');
    return { int, frac: frac === '0' ? '' : '.' + frac };
  }

  /**
   * Build the route-miles innerHTML snippet
   */
  function milesHtml(miles) {
    const { int, frac } = splitMiles(miles);
    if (int === '—') return '<span style="font-size:18px;color:var(--muted)">—</span>';
    return `${int}<span>${frac ? frac + ' mi' : 'mi'}</span>`;
  }

  /**
   * Render the routes list
   */
  function renderRoutes(routes) {
    const list = document.getElementById("routesList");
    if (!list) return;

    if (!routes || routes.length === 0) {
      list.innerHTML = `
        <div class="routes-state">
          <div class="state-icon">📭</div>
          <div class="state-label">No routes found</div>
          <div class="state-sub">Routes appear here when saved from Route Cipher</div>
        </div>`;
      return;
    }

    list.innerHTML = routes.map(renderRouteCard).join('');
    attachActionListeners();
  }

  /**
   * Build a single route card
   */
  function renderRouteCard(route) {
    const cardStatus  = getCardStatus(route);
    const statusLabel = getStatusLabel(route);
    const roundTrip   = isRoundTrip(route);
    const { int, frac } = splitMiles(route.total_miles);

    // Tags
    const tags = roundTrip
      ? `<div class="tag tag-round">Round Trip</div>`
      : '';

    // Destination lines
    const destMain = escapeHtml(route.start_address || '—');
    const destEnd  = !roundTrip && route.end_address
      ? `<div class="route-dest-end">→ ${escapeHtml(route.end_address)}</div>`
      : '';

    const stopCount = route.stop_count || 1;
    const destStops = `${stopCount} stop${stopCount !== 1 ? 's' : ''} · ${statusLabel}`;

    // Miles label
    const milesLabel = cardStatus === 'open' ? 'Logged miles' : 'Total miles';

    // Export note (only for closed, non-voided)
    const exportNote = cardStatus === 'closed'
      ? `<div class="export-note">Included in export</div>`
      : '';

    // Miles display
    const milesDisplay = int === '—'
      ? `<div class="route-miles" style="font-size:18px;color:var(--muted)">—</div>`
      : `<div class="route-miles">${int}<span>${frac ? frac + ' mi' : 'mi'}</span></div>`;

    return `
      <div class="route-card status-${cardStatus}" data-route-id="${route.id}" data-status="${route.status}">
        <div class="route-card-inner">
          <div class="route-date-block">
            <div class="route-date">${formatDate(route.date)}</div>
            <div class="route-tags">${tags}</div>
          </div>
          <div class="route-dest">
            <div class="route-dest-main">${destMain}</div>
            ${destEnd}
            <div class="route-dest-stops">${destStops}</div>
          </div>
          <div class="route-miles-block">
            ${milesDisplay}
            <div class="route-miles-label">${milesLabel}</div>
          </div>
          <div class="route-actions">
            <div class="status-badge status-${cardStatus}">${statusLabel}</div>
            ${renderRouteActions(route)}
          </div>
        </div>
        ${exportNote}
      </div>`;
  }

  /**
   * Render action buttons based on route status
   */
  function renderRouteActions(route) {
    const id = route.id;

    if (route.status === 'closed') {
      if (route._voided) return ''; // void card — status badge is enough

      return `
        <button class="route-action-btn logged" disabled>🔒 Logged</button>
        ${route._mileageLogId
          ? `<button class="route-action-btn danger" data-action="void" data-route-id="${id}">Void</button>`
          : ''}`;
    }

    if (route.status === 'active') {
      const canClose = route.total_miles !== null && route.total_miles > 0;
      return `
        <button class="route-action-btn" data-action="close" data-route-id="${id}"
                ${canClose ? '' : 'disabled'}>🔒 Close Route</button>
        ${!canClose ? '<span style="font-family:\'DM Mono\',monospace;font-size:9px;color:var(--muted);letter-spacing:0.08em;">Set miles first</span>' : ''}`;
    }

    if (route.status === 'draft') {
      return `
        <button class="route-action-btn" data-action="activate" data-route-id="${id}">Activate</button>
        <button class="route-action-btn danger" data-action="delete" data-route-id="${id}">Delete</button>`;
    }

    return '';
  }

  /**
   * Attach click listeners to action buttons (event delegation)
   */
  function attachActionListeners() {
    document.querySelectorAll(".route-action-btn[data-action]").forEach(btn => {
      btn.addEventListener("click", handleActionClick);
    });
  }

  /**
   * Handle action button clicks
   */
  async function handleActionClick(e) {
    const btn = e.currentTarget;
    if (btn.disabled) return;

    const action  = btn.dataset.action;
    const routeId = btn.dataset.routeId;

    switch (action) {
      case "close":    showCloseRouteModal(routeId); break;
      case "void":     showVoidLogModal(routeId);    break;
      case "activate": await handleActivate(routeId); break;
      case "delete":   await handleDelete(routeId);   break;
      case "edit":     handleEditRoute(routeId);      break;
    }
  }

  // ========================================
  // ROUTE LIFECYCLE ACTIONS
  // ========================================

  function handleEditRoute(routeId) {
    const route = allRoutes.find(r => r.id === routeId);
    if (!route) { notify("Route not found", "error"); return; }
    if (route.status === 'closed') { notify("Closed routes cannot be edited", "warning"); return; }

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

  async function handleActivate(routeId) {
    const result = await window.RouteService.activateRoute(routeId);
    if (result.success) {
      notify("Route activated successfully", "success");
      await loadRoutes();
    } else {
      notify(result.error || "Failed to activate route", "error");
    }
  }

  async function handleDelete(routeId) {
    if (!confirm("Delete this draft route? This cannot be undone.")) return;
    const result = await window.RouteService.deleteRoute(routeId);
    if (result.success) {
      notify("Route deleted", "success");
      await loadRoutes();
    } else {
      notify(result.error || "Failed to delete route", "error");
    }
  }

  // ========================================
  // CLOSE ROUTE MODAL
  // ========================================

  function showCloseRouteModal(routeId) {
    const route = allRoutes.find(r => r.id === routeId);
    if (!route) return;

    pendingCloseRouteId = routeId;
    pendingCloseRoute   = route;

    const summaryEl = document.getElementById("closeRouteSummary");
    let addressRows;

    if (isRoundTrip(route)) {
      addressRows = `
        <div class="summary-row">
          <span class="summary-label">Route</span>
          <span class="summary-value">Round-trip from ${escapeHtml(route.start_address)}</span>
        </div>`;
    } else {
      addressRows = `
        <div class="summary-row">
          <span class="summary-label">From</span>
          <span class="summary-value">${escapeHtml(route.start_address)}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">To</span>
          <span class="summary-value">${escapeHtml(route.end_address)}</span>
        </div>`;
    }

    summaryEl.innerHTML = `
      <div class="summary-row">
        <span class="summary-label">Date</span>
        <span class="summary-value">${formatDate(route.date)}</span>
      </div>
      ${addressRows}
      <div class="summary-row summary-row--highlight">
        <span class="summary-label">Total Miles</span>
        <span class="summary-value">${route.total_miles} mi</span>
      </div>`;

    document.getElementById("closeRouteModal").style.display = "flex";
  }

  function closeCloseRouteModal() {
    document.getElementById("closeRouteModal").style.display = "none";
    pendingCloseRouteId = null;
    pendingCloseRoute   = null;
  }
  window.closeCloseRouteModal = closeCloseRouteModal;

  async function confirmCloseRoute() {
    if (!pendingCloseRouteId || !pendingCloseRoute) return;

    const route = pendingCloseRoute;
    const btn   = document.getElementById("confirmCloseBtn");
    btn.disabled = true;
    btn.textContent = '⏳ Closing...';

    const result = await window.RouteService.closeRoute(pendingCloseRouteId, {});

    btn.disabled = false;
    btn.textContent = '🔒 Close Route & Log Mileage';

    if (result.success) {
      notify(`${route.total_miles} miles logged for ${formatDate(route.date)}. Ready for export.`, "success");
      closeCloseRouteModal();
      await loadRoutes();
    } else {
      notify(result.error || "Failed to close route", "error");
    }
  }

  // ========================================
  // VOID MILEAGE LOG
  // ========================================

  function showVoidLogModal(routeId) {
    const route = allRoutes.find(r => r.id === routeId);
    if (!route || !route._mileageLogId) {
      notify("No mileage log found for this route", "error");
      return;
    }

    pendingVoidLogId  = route._mileageLogId;
    pendingVoidRoute  = route;

    const existing = document.getElementById("voidLogModal");
    if (existing) existing.remove();

    const addrHtml = isRoundTrip(route)
      ? `<div class="summary-row">
           <span class="summary-label">Route</span>
           <span class="summary-value">Round-trip from ${escapeHtml(route.start_address)}</span>
         </div>`
      : `<div class="summary-row">
           <span class="summary-label">From</span>
           <span class="summary-value">${escapeHtml(route.start_address)}</span>
         </div>
         <div class="summary-row">
           <span class="summary-label">To</span>
           <span class="summary-value">${escapeHtml(route.end_address)}</span>
         </div>`;

    document.body.insertAdjacentHTML('beforeend', `
      <div id="voidLogModal" class="cc-overlay" style="display:flex;">
        <div class="cc-dialog">
          <div class="cc-dialog-header">
            <div class="cc-dialog-title">Void Mileage Log</div>
            <button class="cc-close-btn" onclick="window.closeVoidLogModal()">×</button>
          </div>
          <div class="cc-dialog-body">
            <p>This removes the mileage log from <strong>exports and totals</strong> but keeps it for audit purposes.</p>
            <div class="summary-grid">
              <div class="summary-row">
                <span class="summary-label">Date</span>
                <span class="summary-value">${formatDate(route.date)}</span>
              </div>
              ${addrHtml}
              <div class="summary-row summary-row--highlight">
                <span class="summary-label">Total Miles</span>
                <span class="summary-value">${route.total_miles} mi</span>
              </div>
            </div>
          </div>
          <div class="cc-dialog-footer">
            <button class="cc-btn cc-btn-muted" onclick="window.closeVoidLogModal()">Cancel</button>
            <button id="confirmVoidBtn" class="cc-btn cc-btn-danger">Void Log</button>
          </div>
        </div>
      </div>`);

    document.getElementById("confirmVoidBtn").addEventListener("click", confirmVoidLog);
  }

  function closeVoidLogModal() {
    const modal = document.getElementById("voidLogModal");
    if (modal) modal.remove();
    pendingVoidLogId  = null;
    pendingVoidRoute  = null;
  }
  window.closeVoidLogModal = closeVoidLogModal;

  async function confirmVoidLog() {
    if (!pendingVoidLogId || !pendingVoidRoute) return;

    const route = pendingVoidRoute;
    const btn   = document.getElementById("confirmVoidBtn");
    btn.disabled = true;
    btn.textContent = '⏳ Voiding...';

    const result = await window.RouteService.voidMileageLog(pendingVoidLogId);

    btn.disabled = false;
    btn.textContent = 'Void Log';

    if (result.success) {
      notify(`Mileage log voided for ${formatDate(route.date)} (${route.total_miles} mi). Excluded from exports.`, "success");
      closeVoidLogModal();
      await loadRoutes();
    } else {
      notify(result.error || "Failed to void mileage log", "error");
    }
  }

  // ========================================
  // CSV EXPORT
  // ========================================

  async function showExportModal() {
    const modal       = document.getElementById("exportModal");
    const summaryEl   = document.getElementById("exportSummary");
    const downloadBtn = document.getElementById("confirmExportBtn");

    modal.style.display = "flex";
    if (summaryEl) summaryEl.innerHTML = '<span class="export-loading">Loading mileage logs...</span>';

    const result = await window.RouteService.getMileageLogs('1900-01-01', '2100-12-31');

    if (!result.success) {
      if (summaryEl) summaryEl.innerHTML = `<span class="export-error">Error: ${escapeHtml(result.error)}</span>`;
      downloadBtn.disabled = true;
      return;
    }

    const logs = result.data || [];

    if (logs.length === 0) {
      document.getElementById("exportDateFrom").value = "";
      document.getElementById("exportDateTo").value   = "";
      if (summaryEl) summaryEl.innerHTML = `
        <div class="export-empty">
          <div style="font-size:28px;opacity:0.3">📭</div>
          <p>No mileage logs yet</p>
          <p class="export-hint">Close active routes to create exportable mileage logs</p>
        </div>`;
      downloadBtn.disabled  = true;
      downloadBtn.textContent = 'No Logs to Export';
      return;
    }

    const dates  = logs.map(l => l.log_date).sort();
    document.getElementById("exportDateFrom").value = dates[0];
    document.getElementById("exportDateTo").value   = dates[dates.length - 1];

    exportPreviewLogs = logs;
    updateExportSummary(logs);
    downloadBtn.disabled  = false;
    downloadBtn.textContent = 'Download CSV';
  }

  async function updateExportPreview() {
    const dateFrom    = document.getElementById("exportDateFrom").value;
    const dateTo      = document.getElementById("exportDateTo").value;
    const summaryEl   = document.getElementById("exportSummary");
    const downloadBtn = document.getElementById("confirmExportBtn");

    if (!dateFrom || !dateTo) {
      if (summaryEl) summaryEl.innerHTML = '<span class="export-hint">Select date range to preview</span>';
      downloadBtn.disabled = true;
      return;
    }
    if (dateFrom > dateTo) {
      if (summaryEl) summaryEl.innerHTML = '<span class="export-error">Start date must be before end date</span>';
      downloadBtn.disabled = true;
      return;
    }

    const result = await window.RouteService.getMileageLogs(dateFrom, dateTo);
    if (!result.success) {
      if (summaryEl) summaryEl.innerHTML = `<span class="export-error">Error: ${escapeHtml(result.error)}</span>`;
      downloadBtn.disabled = true;
      return;
    }

    exportPreviewLogs = result.data || [];
    updateExportSummary(exportPreviewLogs);

    if (exportPreviewLogs.length === 0) {
      downloadBtn.disabled    = true;
      downloadBtn.textContent = 'No Logs in Range';
    } else {
      downloadBtn.disabled    = false;
      downloadBtn.textContent = 'Download CSV';
    }
  }

  function updateExportSummary(logs) {
    const summaryEl = document.getElementById("exportSummary");
    if (!summaryEl) return;

    if (!logs || logs.length === 0) {
      summaryEl.innerHTML = `
        <div class="export-empty-range">
          <p>No mileage logs in selected date range</p>
        </div>`;
      return;
    }

    const totalMiles = logs.reduce((s, l) => s + (parseFloat(l.total_miles) || 0), 0);
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
      </div>`;
  }

  function closeExportModal() {
    document.getElementById("exportModal").style.display = "none";
    exportPreviewLogs = [];
  }
  window.closeExportModal = closeExportModal;

  async function exportToCsv() {
    const dateFrom = document.getElementById("exportDateFrom").value;
    const dateTo   = document.getElementById("exportDateTo").value;

    if (!dateFrom || !dateTo) { notify("Please select both start and end dates", "warning"); return; }
    if (dateFrom > dateTo)    { notify("Start date must be before end date",     "warning"); return; }

    let logs = exportPreviewLogs;
    if (!logs || logs.length === 0) {
      const btn = document.getElementById("confirmExportBtn");
      btn.disabled    = true;
      btn.textContent = '⏳ Exporting...';

      const result = await window.RouteService.getMileageLogs(dateFrom, dateTo);
      btn.disabled    = false;
      btn.textContent = 'Download CSV';

      if (!result.success) { notify(result.error || "Failed to fetch mileage logs", "error"); return; }
      logs = result.data;
    }

    if (logs.length === 0) {
      notify("No closed routes in this date range.", "info");
      return;
    }

    generateCsv(logs, dateFrom, dateTo);
    closeExportModal();
  }

  function csvEscape(value) {
    const str = String(value == null ? '' : value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  function generateCsv(logs, dateFrom, dateTo) {
    const headers = [
      "Log Date", "Route Ref", "Start Address", "End Address",
      "Total Miles", "Stops", "Miles Per Stop", "Business Purpose"
    ];

    const rows = logs.map(log => {
      const stops        = log.claim_count || 0;
      const milesPerStop = stops > 0 ? (parseFloat(log.total_miles) / stops).toFixed(1) : '';
      const routeRef     = log.route_id ? 'R-' + log.route_id.slice(0, 8) : '';
      return [
        log.log_date, routeRef,
        csvEscape(log.start_address || ''),
        csvEscape(log.end_address   || ''),
        log.total_miles, stops, milesPerStop,
        csvEscape('Business – Claims Inspection')
      ];
    });

    const csv  = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = `mileage_log_${dateFrom}_to_${dateTo}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    const total = logs.reduce((s, l) => s + (parseFloat(l.total_miles) || 0), 0);
    notify(`Exported ${logs.length} routes · ${total.toFixed(1)} total miles`, "success");
  }

  // ========================================
  // UTILITIES
  // ========================================

  function formatDate(dateStr) {
    if (!dateStr) return "No date";
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric", year: "numeric"
    });
  }

  function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function notify(message, type = "info") {
    if (window.showCipherNotification) {
      window.showCipherNotification(message, type);
    } else {

      if (type === "error") alert(message);
    }
  }

  // ========================================
  // INITIALIZATION
  // ========================================

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
