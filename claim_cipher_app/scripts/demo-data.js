(function() {
  'use strict';
  if (sessionStorage.getItem('demo_mode') !== 'true') return;

  // ═══════════════════════════════════════════
  //  1. MOCK DATA
  // ═══════════════════════════════════════════

  var now = Date.now();
  var DAY = 86400000;

  // ── Firms ──
  var DEMO_FIRMS = [
    { id: 'sedgwick',       name: 'Sedgwick',        freeMiles: 50, ratePerMile: 0.60, roundTripDefault: false },
    { id: 'doan',           name: 'Doan',             freeMiles: 50, ratePerMile: 0.60, roundTripDefault: false },
    { id: 'claim-solution', name: 'Claim Solution',   freeMiles: 50, ratePerMile: 0.60, roundTripDefault: false },
    { id: 'nexterra',       name: 'Nexterra',         freeMiles: 50, ratePerMile: 0.60, roundTripDefault: true  }
  ];

  // ── Mileage Entries (10 Texas trips, calculationHistory shape) ──
  var texasTrips = [
    { from: '100 Congress Ave, Austin, TX',     to: '1600 Pacific Ave, Dallas, TX',       dist: 195.2 },
    { from: '100 Congress Ave, Austin, TX',     to: '400 Main St, Houston, TX',           dist: 162.4 },
    { from: '400 Main St, Houston, TX',         to: '300 Alamo Plaza, San Antonio, TX',   dist: 197.1 },
    { from: '300 Alamo Plaza, San Antonio, TX', to: '100 Congress Ave, Austin, TX',        dist: 79.5  },
    { from: '100 Congress Ave, Austin, TX',     to: '210 W Rusk St, Fort Worth, TX',      dist: 189.3 },
    { from: '210 W Rusk St, Fort Worth, TX',    to: '1600 Pacific Ave, Dallas, TX',       dist: 32.8  },
    { from: '1600 Pacific Ave, Dallas, TX',     to: '100 Congress Ave, Austin, TX',        dist: 195.2 },
    { from: '100 Congress Ave, Austin, TX',     to: '600 E Whitestone Blvd, Cedar Park, TX', dist: 18.7 },
    { from: '100 Congress Ave, Austin, TX',     to: '2300 S 1st St, Waco, TX',            dist: 103.6 },
    { from: '2300 S 1st St, Waco, TX',          to: '400 Main St, Houston, TX',           dist: 185.9 }
  ];

  var DEMO_MILEAGE_ENTRIES = texasTrips.map(function(trip, i) {
    var firmIdx = i % DEMO_FIRMS.length;
    var firm = DEMO_FIRMS[firmIdx];
    var roundTrip = i % 3 === 0;
    var baseMiles = roundTrip ? trip.dist * 2 : trip.dist;
    var freeMiles = Math.min(baseMiles, firm.freeMiles);
    var billableMiles = Math.max(0, baseMiles - freeMiles);
    var totalFee = parseFloat((billableMiles * firm.ratePerMile).toFixed(2));
    return {
      firm: firm,
      route: { from: trip.from, to: trip.to },
      distance: trip.dist,
      roundTrip: roundTrip,
      baseMiles: parseFloat(baseMiles.toFixed(1)),
      freeMiles: freeMiles,
      billableMiles: parseFloat(billableMiles.toFixed(1)),
      ratePerMile: firm.ratePerMile,
      totalFee: totalFee,
      note: 'CLM-2026-001' + String(i).padStart(2, '0') + ' field inspection',
      timestamp: now - (13 - i) * DAY + Math.floor(Math.random() * DAY * 0.5),
      calculationId: 'demo-calc-' + (i + 1)
    };
  });

  // ── Routes (25 for my-routes) ──
  var txAddresses = [
    '100 Congress Ave, Austin, TX 78701',
    '400 Main St, Houston, TX 77002',
    '1600 Pacific Ave, Dallas, TX 75201',
    '300 Alamo Plaza, San Antonio, TX 78205',
    '210 W Rusk St, Fort Worth, TX 76104',
    '600 E Whitestone Blvd, Cedar Park, TX 78613',
    '2300 S 1st St, Waco, TX 76706',
    '1500 Marilla St, Dallas, TX 75201',
    '500 Jefferson St, Houston, TX 77002',
    '100 Dolorosa St, San Antonio, TX 78205'
  ];

  function randomAddr(exclude) {
    var a;
    do { a = txAddresses[Math.floor(Math.random() * txAddresses.length)]; }
    while (a === exclude);
    return a;
  }

  function fmtDate(ts) {
    var d = new Date(ts);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  var DEMO_ROUTES = [];
  var routeMilesTotal = 0;

  // 15 closed routes
  for (var c = 0; c < 15; c++) {
    var start = txAddresses[c % txAddresses.length];
    var end = randomAddr(start);
    var miles = parseFloat((30 + Math.random() * 170).toFixed(1));
    routeMilesTotal += miles;
    DEMO_ROUTES.push({
      id: 'demo-route-' + (c + 1),
      date: fmtDate(now - (29 - c) * DAY),
      start_address: start,
      end_address: end,
      total_miles: miles,
      stop_count: 2 + Math.floor(Math.random() * 5),
      status: 'closed',
      _mileageLogId: 'demo-log-' + (c + 1),
      _voided: false
    });
  }

  // 5 active routes
  for (var a = 0; a < 5; a++) {
    var startA = txAddresses[(a + 3) % txAddresses.length];
    var endA = randomAddr(startA);
    var milesA = parseFloat((25 + Math.random() * 120).toFixed(1));
    DEMO_ROUTES.push({
      id: 'demo-route-' + (16 + a),
      date: fmtDate(now - (5 - a) * DAY),
      start_address: startA,
      end_address: endA,
      total_miles: milesA,
      stop_count: 2 + Math.floor(Math.random() * 4),
      status: 'active'
    });
  }

  // 5 draft routes
  for (var d = 0; d < 5; d++) {
    var startD = txAddresses[(d + 7) % txAddresses.length];
    var endD = randomAddr(startD);
    var milesD = parseFloat((15 + Math.random() * 80).toFixed(1));
    DEMO_ROUTES.push({
      id: 'demo-route-' + (21 + d),
      date: fmtDate(now - (2 - d) * DAY),
      start_address: startD,
      end_address: endD,
      total_miles: milesD,
      stop_count: 1 + Math.floor(Math.random() * 3),
      status: 'draft'
    });
  }

  // ── Mileage Logs (for closed routes, used by getRouteMileageLogs) ──
  var DEMO_MILEAGE_LOGS = [];
  for (var ml = 0; ml < 15; ml++) {
    DEMO_MILEAGE_LOGS.push({
      id: 'demo-log-' + (ml + 1),
      route_id: 'demo-route-' + (ml + 1),
      voided_at: null,
      total_miles: DEMO_ROUTES[ml].total_miles,
      start_address: DEMO_ROUTES[ml].start_address,
      end_address: DEMO_ROUTES[ml].end_address,
      stop_count: DEMO_ROUTES[ml].stop_count,
      created_at: DEMO_ROUTES[ml].date
    });
  }

  // ── Dashboard Stats ──
  var DEMO_STATS = {
    routes: 25,
    miles: parseFloat(routeMilesTotal.toFixed(1))
  };

  // ── Activity Feed (5 recent items) ──
  var DEMO_ACTIVITIES = [
    { id: 'demo-act-1', description: 'Route optimized: Austin → Houston (162.4 mi)',     type: 'route',   timestamp: now - 1 * DAY, timeAgo: '1 day ago'  },
    { id: 'demo-act-2', description: 'Mileage calculated: Dallas round trip ($87.12)',    type: 'mileage', timestamp: now - 2 * DAY, timeAgo: '2 days ago' },
    { id: 'demo-act-3', description: 'Route closed: San Antonio → Austin (79.5 mi)',     type: 'route',   timestamp: now - 3 * DAY, timeAgo: '3 days ago' },
    { id: 'demo-act-4', description: 'BCIF generated: 2019 Honda Accord EX',             type: 'tls',     timestamp: now - 4 * DAY, timeAgo: '4 days ago' },
    { id: 'demo-act-5', description: 'Firm added: Sedgwick ($0.60/mi, 50 free)',          type: 'firm',    timestamp: now - 5 * DAY, timeAgo: '5 days ago' }
  ];

  // ── TLS Payload (2019 Honda Accord EX) ──
  var DEMO_TLS_OPTIONS = [
    'AC','PS','PB','PW','PL','PM','CC','CL','TL','KE',
    'AB','SB','IW','TW','RD','AW','CD','DA','HL','AG',
    'BL','FM','LP','SW','DC'
  ];

  var DEMO_TLS_PAYLOAD = {
    claim: {
      carrier: 'State Farm Insurance',
      claimNumber: 'CLM-2026-00142',
      adjuster: 'Demo Adjuster',
      dateOfLoss: '2026-01-15',
      policyNumber: 'POL-SF-8834201'
    },
    vehicle: {
      year: '2019',
      make: 'Honda',
      model: 'Accord EX',
      vin: '1HGCV1F34KA019284',
      mileage: '47382',
      color: 'Lunar Silver Metallic',
      engine: '4 cylinder 1.5L Turbo Auto',
      driveType: 'FWD',
      bodyStyle: 'Sedan 4D'
    },
    condition: {
      paint:        { rating: 2, comment: 'Normal wear for age. Minor chips or scratches. No major deterioration.' },
      sheetMetal:   { rating: 2, comment: 'Minor dings or typical wear. Panels align properly.' },
      glass:        { rating: 3, comment: 'Glass clear. No cracks or defects observed.' },
      trim:         { rating: 2, comment: 'Normal wear. Minor blemishes only.' },
      seats:        { rating: 2, comment: 'Light wear. No major damage.' },
      carpet:       { rating: 2, comment: 'Light wear consistent with age.' },
      dashboard:    { rating: 3, comment: 'Clean with no damage noted.' },
      headliner:    { rating: 3, comment: 'Clean and properly secured.' },
      frontTires:   { rating: 1, treadDepth: '4/32', comment: 'Moderate wear, approaching replacement threshold.' },
      rearTires:    { rating: 2, treadDepth: '6/32', comment: 'Even wear within acceptable range.' },
      engine:       { rating: 2, comment: 'Operational with no major issues observed at inspection.' },
      transmission: { rating: 2, comment: 'No operational concerns observed during inspection.' }
    },
    options: DEMO_TLS_OPTIONS,
    summary: {
      damageSummary: 'Front-end collision. Bumper cover, hood, left fender, headlamp assembly, and radiator support require replacement. Supplemental restraint system deployed. Condenser and A/C lines compromised. Frame rail shows measurable deformation at left front. Repair cost exceeds total loss threshold per carrier guidelines.',
      conclusion: 'Total Loss',
      additionalNotes: 'Vehicle was inspected at owner residence. All mechanical ratings reflect condition prior to loss. Tire tread measured with calibrated depth gauge. Interior and exterior condition ratings represent pre-loss state and are not influenced by collision damage.'
    }
  };

  var DEMO_TLS_PARSED = {
    claim: {
      carrier: 'State Farm Insurance',
      claimNumber: 'CLM-2026-00142',
      adjuster: 'Demo Adjuster'
    },
    vehicle: {
      year: '2019',
      make: 'Honda',
      model: 'Accord EX',
      vin: '1HGCV1F34KA019284',
      mileage: '47382',
      color: 'Lunar Silver Metallic'
    },
    cylinders: 'CYL_4',
    engineSize: '1.5L',
    transmission: 'TRANS_AUTO',
    options: DEMO_TLS_OPTIONS,
    damage: {
      estimateTotal: 14287.52,
      laborTotal: 4320.00,
      partsTotal: 8967.52,
      paintTotal: 1000.00
    }
  };


  // ═══════════════════════════════════════════
  //  2. GLOBAL OVERRIDES
  // ═══════════════════════════════════════════

  function overrideRouteService() {
    // Poll until RouteService exists
    function patch() {
      if (!window.RouteService) { setTimeout(patch, 100); return; }

      window.RouteService.getDashboardStats = function() {
        return Promise.resolve({ success: true, data: DEMO_STATS });
      };

      window.RouteService.listRoutes = function(filters) {
        var routes = DEMO_ROUTES.slice();
        if (filters) {
          if (filters.status) {
            routes = routes.filter(function(r) { return r.status === filters.status; });
          }
          if (filters.dateFrom) {
            routes = routes.filter(function(r) { return r.date >= filters.dateFrom; });
          }
          if (filters.dateTo) {
            routes = routes.filter(function(r) { return r.date <= filters.dateTo; });
          }
        }
        return Promise.resolve({ success: true, data: routes });
      };

      window.RouteService.getRouteMileageLogs = function(routeIds) {
        var logs = DEMO_MILEAGE_LOGS.filter(function(log) {
          return routeIds.indexOf(log.route_id) !== -1;
        });
        return Promise.resolve({ success: true, data: logs });
      };

      window.RouteService.getMileageLogs = function(dateFrom, dateTo) {
        var logs = DEMO_MILEAGE_LOGS.slice();
        if (dateFrom) {
          logs = logs.filter(function(l) { return l.created_at >= dateFrom; });
        }
        if (dateTo) {
          logs = logs.filter(function(l) { return l.created_at <= dateTo; });
        }
        return Promise.resolve({ success: true, data: logs });
      };

      // Write operations — return success silently
      window.RouteService.saveRoute = function() {
        return Promise.resolve({ success: true, data: { id: 'demo-new-' + Date.now() } });
      };
      window.RouteService.updateRoute = function() {
        return Promise.resolve({ success: true });
      };
      window.RouteService.activateRoute = function() {
        return Promise.resolve({ success: true });
      };
      window.RouteService.closeRoute = function() {
        return Promise.resolve({ success: true, data: { mileage_log_id: 'demo-log-new' } });
      };
      window.RouteService.reopenRoute = function() {
        return Promise.resolve({ success: true });
      };
      window.RouteService.deleteRoute = function() {
        return Promise.resolve({ success: true });
      };
      window.RouteService.voidMileageLog = function() {
        return Promise.resolve({ success: true });
      };
      window.RouteService.getRoute = function(id) {
        var found = null;
        for (var i = 0; i < DEMO_ROUTES.length; i++) {
          if (DEMO_ROUTES[i].id === id) { found = DEMO_ROUTES[i]; break; }
        }
        return Promise.resolve(found ? { success: true, data: found } : { success: false, error: 'Not found' });
      };
      window.RouteService.getMileageLogForRoute = function(routeId) {
        var found = null;
        for (var i = 0; i < DEMO_MILEAGE_LOGS.length; i++) {
          if (DEMO_MILEAGE_LOGS[i].route_id === routeId) { found = DEMO_MILEAGE_LOGS[i]; break; }
        }
        return Promise.resolve(found ? { success: true, data: found } : { success: false, error: 'Not found' });
      };
    }
    patch();
  }

  function seedFirmStoreCache() {
    localStorage.setItem('demo_cipher_user_firms', JSON.stringify(DEMO_FIRMS));
  }

  function seedActivityFeed() {
    localStorage.setItem('cc_recent_activities', JSON.stringify(DEMO_ACTIVITIES));
  }


  // ═══════════════════════════════════════════
  //  3. PER-PAGE INJECTORS
  // ═══════════════════════════════════════════

  function injectCommandCenter() {
    // Patch TLS files counter and footer counters after DOM settles
    setTimeout(function() {
      var tlsEl = document.getElementById('tlsFiles');
      if (tlsEl) tlsEl.textContent = '3';

      var footerRoutes = document.getElementById('footerRoutes');
      if (footerRoutes) footerRoutes.textContent = '25';

      var footerMiles = document.getElementById('footerMiles');
      if (footerMiles) footerMiles.textContent = DEMO_STATS.miles.toLocaleString();

      var footerOpen = document.getElementById('footerOpenRoutes');
      if (footerOpen) footerOpen.textContent = '10';

      var footerTls = document.getElementById('footerTlsFiles');
      if (footerTls) footerTls.textContent = '3';

      // Welcome title
      var welcome = document.getElementById('welcomeTitle');
      if (welcome) welcome.textContent = 'Welcome, Demo User.';
    }, 600);
  }

  function injectMileageCypher() {
    // Poll for mileageCipher instance, then inject history and render
    function tryInject() {
      if (!window.mileageCipher) { setTimeout(tryInject, 200); return; }

      window.mileageCipher.calculationHistory = DEMO_MILEAGE_ENTRIES.slice();

      // Trigger the session log panel update if the function exists
      if (typeof updateSessionLogPanel === 'function') {
        updateSessionLogPanel();
      } else {
        // Fallback: manually render the session log
        renderDemoSessionLog();
      }
    }

    function renderDemoSessionLog() {
      var history = DEMO_MILEAGE_ENTRIES;
      var logList = document.getElementById('sessionLogList');
      var logCount = document.getElementById('logCount');
      var sessionTotal = document.getElementById('sessionTotal');
      var sessionMilesHeader = document.getElementById('sessionMilesHeader');
      var sessionEntriesHeader = document.getElementById('sessionEntriesHeader');
      var sessionBilledHeader = document.getElementById('sessionBilledHeader');

      var totalMiles = 0, totalBilled = 0;
      history.forEach(function(r) { totalMiles += r.baseMiles || 0; totalBilled += r.totalFee || 0; });

      if (logCount) logCount.textContent = history.length + ' entries';
      if (sessionTotal) sessionTotal.textContent = totalMiles.toFixed(1) + ' mi';
      if (sessionMilesHeader) sessionMilesHeader.textContent = totalMiles.toFixed(1);
      if (sessionEntriesHeader) sessionEntriesHeader.textContent = history.length;
      if (sessionBilledHeader) sessionBilledHeader.textContent = '$' + totalBilled.toFixed(2);

      if (logList) {
        logList.innerHTML = history.map(function(r, i) {
          return '<div class="mc-log-item">'
            + '<div><div class="mc-log-item-name">' + (r.route ? r.route.to : 'Route ' + (i + 1)) + '</div>'
            + '<div class="mc-log-item-miles">' + r.baseMiles + ' mi</div></div>'
            + '<div class="mc-log-item-fee">$' + r.totalFee + '</div>'
            + '</div>';
        }).join('');
      }
    }

    tryInject();
  }

  function injectRouteCypher() {
    // Route cipher already has its own initializeDemoMode() in route-cipher.js
    // We just ensure RouteService overrides are in place (done globally)
  }

  function injectTotalLossStudio() {
    // Set demo payload on window for the ES module to pick up
    window.__tlsDemoPayload = DEMO_TLS_PAYLOAD;
    window.__tlsDemoParsed = DEMO_TLS_PARSED;
  }


  // ═══════════════════════════════════════════
  //  4. DEMO BANNER
  // ═══════════════════════════════════════════

  function injectDemoBanner() {
    var banner = document.createElement('div');
    banner.id = 'demoBanner';
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:10000;'
      + 'background:#e8952a;color:#000;text-align:center;padding:6px 16px;'
      + 'font-family:"DM Mono",monospace;font-size:12px;letter-spacing:0.08em;'
      + 'text-transform:uppercase;display:flex;align-items:center;justify-content:center;gap:12px;';

    banner.innerHTML = '<span>Demo Mode \u2014 Activate to save your data</span>'
      + '<a href="login-cypher.html" id="demoBannerLink" style="color:#000;font-weight:600;text-decoration:underline;">Activate \u2192</a>';

    document.body.insertBefore(banner, document.body.firstChild);

    // Push body content down
    document.body.style.paddingTop = (banner.offsetHeight || 30) + 'px';

    // Clear demo_mode when clicking activate
    var link = document.getElementById('demoBannerLink');
    if (link) {
      link.addEventListener('click', function() {
        sessionStorage.removeItem('demo_mode');
      });
    }
  }


  // ═══════════════════════════════════════════
  //  5. INIT
  // ═══════════════════════════════════════════

  // Seed caches immediately (before DOM)
  seedFirmStoreCache();
  seedActivityFeed();
  overrideRouteService();

  // Detect page and inject
  var page = window.location.pathname.split('/').pop().replace('.html', '');

  if (page === 'command-center') {
    document.addEventListener('DOMContentLoaded', injectCommandCenter);
  } else if (page === 'mileage-cypher') {
    document.addEventListener('DOMContentLoaded', injectMileageCypher);
  } else if (page === 'route-cypher') {
    injectRouteCypher();
  } else if (page === 'total-loss-studio') {
    injectTotalLossStudio();
  }

  // Banner on all pages
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectDemoBanner);
  } else {
    injectDemoBanner();
  }

})();
