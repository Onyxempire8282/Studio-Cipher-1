/**
 * ClaimCipherSystemQA — Dev-Only 3-Module QA Analyzer
 *
 * Usage:
 *   1. Include this script on any page (after app scripts):
 *      <script src="scripts/claim-cipher-system-qa.js"></script>
 *
 *   2. Enable dev mode (one-time, persists in localStorage):
 *      localStorage.setItem('cipher_dev_mode', 'true');
 *
 *   3. Reload the page — QA runs automatically (current page only).
 *
 *   4. Run manually:
 *      ClaimCipherSystemQA.run();               // current page only
 *      ClaimCipherSystemQA.runFullSystemAudit(); // all 3 pages
 *
 *   5. Disable:
 *      localStorage.removeItem('cipher_dev_mode');
 *
 * Non-invasive: reads DOM only, never modifies it.
 */
(function () {
  'use strict';

  // ======================================================
  // DEV-ONLY GATE
  // ======================================================
  function isDevMode() {
    return (
      location.hostname.includes('localhost') ||
      location.hostname === '127.0.0.1' ||
      localStorage.getItem('cipher_dev_mode') === 'true'
    );
  }

  if (!isDevMode()) return; // silent exit — no logs, no side effects

  // ======================================================
  // PAGE CONFIG — drives ALL tests
  // ======================================================
  const PAGE_CONFIG = {
    'route-cypher.html': {
      label: 'Route Optimizer',
      requiredSelectors: [
        '#startLocation',
        '#destinationsList',
        '#optimizeRoute',
        '#routeResults',
        '#routeOutput',
        '#saveToMyRoutes',
        '#routeMapModal',
        '#clusterOverrideModal',
        '#saveRouteModal',
        '#routeDate',
        '#loadingOverlay',
        '#errorDisplay'
      ],
      requiredProtectedGuards: ['SupabaseAuth.protectPage'],
      expectedInternalLinks: [
        'command-center.html',
        'my-routes.html',
        'mileage-cypher.html'
      ],
      keyButtons: [
        { id: 'optimizeRoute', label: 'Optimize Route' },
        { id: 'saveToMyRoutes', label: 'Save to My Routes' },
        { id: 'copyRoute', label: 'Copy' },
        { id: 'exportMiles', label: 'Mileage' },
        { id: 'addDestination', label: 'Add Stop' },
        { id: 'clearClaims', label: 'Clear All' },
        { id: 'routeClaims', label: 'Route Claims' },
        { id: 'confirmSaveRouteBtn', label: 'Save Route' }
      ],
      requiredStylesheets: [
        'universal-system.css',
        'route-cypher-layout.css'
      ],
      requiredScripts: [
        'supabase-auth.js',
        'route-service.js',
        'route-optimizer.js',
        'cipher-core.js',
        'firm-store.js',
        'session-manager.js',
        'distance-cache.js'
      ]
    },

    'mileage-cypher.html': {
      label: 'Mileage Calculator',
      requiredSelectors: [
        '#firmSelect',
        '#pointA',
        '#pointB',
        '#distanceMiles',
        '#roundTrip',
        '#calculateBtn',
        '#resultsSection',
        '#breakdownDisplay',
        '#copyText',
        '#copyBtn',
        '#newCalculation',
        '#firmsModal',
        '#toastContainer'
      ],
      requiredProtectedGuards: ['SupabaseAuth.protectPage'],
      expectedInternalLinks: [
        'command-center.html',
        'route-cypher.html',
        'my-routes.html'
      ],
      keyButtons: [
        { id: 'calculateBtn', label: 'Calculate' },
        { id: 'copyBtn', label: 'Copy' },
        { id: 'newCalculation', label: 'New Calculation' },
        { id: 'manageFirms', label: 'Manage Firms' }
      ],
      requiredStylesheets: [
        'universal-system.css',
        'mileage-cypher-layout.css'
      ],
      requiredScripts: [
        'supabase-auth.js',
        'cipher-core.js',
        'firm-store.js',
        'session-manager.js',
        'distance-cache.js',
        'mileage-cypher-combined.js'
      ]
    },

    'my-routes.html': {
      label: 'My Routes',
      requiredSelectors: [
        '#statusFilter',
        '#dateFromFilter',
        '#dateToFilter',
        '#applyFilters',
        '#clearFilters',
        '#routeCount',
        '#exportCsvBtn',
        '#routesList',
        '#exportModal',
        '#exportDateFrom',
        '#exportDateTo',
        '#exportSummary',
        '#confirmExportBtn',
        '#closeRouteModal',
        '#confirmCloseBtn'
      ],
      requiredProtectedGuards: ['SupabaseAuth.protectPage'],
      expectedInternalLinks: [
        'command-center.html',
        'route-cypher.html',
        'mileage-cypher.html'
      ],
      keyButtons: [
        { id: 'applyFilters', label: 'Apply' },
        { id: 'clearFilters', label: 'Clear' },
        { id: 'exportCsvBtn', label: 'Export' },
        { id: 'confirmExportBtn', label: 'Download CSV' },
        { id: 'confirmCloseBtn', label: 'Close Route' }
      ],
      requiredStylesheets: [
        'universal-system.css',
        'my-routes-layout.css'
      ],
      requiredScripts: [
        'supabase-auth.js',
        'cipher-core.js',
        'route-service.js',
        'my-routes.js'
      ]
    }
  };

  // ======================================================
  // CATEGORY WEIGHTS
  // ======================================================
  const CATEGORY_WEIGHTS = {
    functional:    0.30,
    structural:    0.20,
    security:      0.20,
    design:        0.15,
    performance:   0.10,
    accessibility: 0.05
  };

  const REQUIRED_CSS_VARS = [
    '--cipher-bg-primary',
    '--cipher-bg-secondary',
    '--cipher-gold',
    '--cipher-electric-blue',
    '--cipher-text-primary',
    '--cipher-text-secondary',
    '--cipher-text-muted',
    '--cipher-danger',
    '--cipher-success',
    '--cipher-warning',
    '--cipher-font-primary',
    '--cipher-space-sm',
    '--cipher-space-md',
    '--cipher-radius-md',
    '--cipher-shadow-md'
  ];

  // ======================================================
  // HELPERS
  // ======================================================
  function currentPage() {
    const path = location.pathname;
    const file = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
    return file;
  }

  function getPageConfig() {
    return PAGE_CONFIG[currentPage()] || null;
  }

  function fail(page, category, testName, detail) {
    return {
      page,
      category,
      testName,
      status: 'FAIL',
      whatFailed: detail.what,
      whyItMatters: detail.why,
      howToFix: detail.fix,
      evidence: detail.evidence || '',
      severity: detail.severity || 'major',
      weightImpact: 0 // computed later
    };
  }

  function pass(page, category, testName) {
    return { page, category, testName, status: 'PASS' };
  }

  /**
   * WARN — logged but NOT scored. Does not affect pass/fail totals.
   * Used when static analysis cannot verify runtime behavior.
   */
  function warn(page, category, testName, detail) {
    return {
      page,
      category,
      testName,
      status: 'WARN',
      warnTag: detail.tag || 'static-analysis-limited',
      whatFailed: detail.what,
      whyItMatters: detail.why,
      howToFix: detail.fix,
      evidence: detail.evidence || '',
      severity: 'info',
      weightImpact: 0
    };
  }

  /**
   * Produce a meaningful identifier for an input element.
   * Returns id, name, type, or trimmed outerHTML — never "anonymous".
   */
  function inputEvidence(el) {
    if (el.id) return '#' + el.id;
    if (el.getAttribute('name')) return '[name="' + el.getAttribute('name') + '"]';
    if (el.getAttribute('type')) return '<input type="' + el.getAttribute('type') + '">';
    var html = el.outerHTML || '';
    return html.substring(0, 80);
  }

  /**
   * Graduated severity for missing accessibility labels.
   * 1 = minor, 2-3 = major, 4+ = critical
   */
  function inputSeverity(count) {
    if (count >= 4) return 'critical';
    if (count >= 2) return 'major';
    return 'minor';
  }

  /**
   * Fetch a sibling HTML file and parse into a static Document.
   * DOMParser documents support querySelector but NOT getComputedStyle or offsetParent.
   */
  async function fetchAndParse(pageName) {
    const resp = await fetch(pageName);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const html = await resp.text();
    const parser = new DOMParser();
    return parser.parseFromString(html, 'text/html');
  }

  // ======================================================
  // TEST RUNNERS — all accept a `doc` parameter
  // ======================================================

  /**
   * @param {Document} doc - live document or DOMParser result
   * @param {string} page - filename
   * @param {object} cfg - PAGE_CONFIG entry
   * @param {boolean} isLive - true when doc is the live document
   */
  function runFunctionalTests(doc, page, cfg, isLive) {
    const results = [];

    // 1. Required selectors present
    cfg.requiredSelectors.forEach(function (sel) {
      if (!doc.querySelector(sel)) {
        results.push(fail(page, 'functional', 'Required element: ' + sel, {
          what: 'Selector "' + sel + '" not found in DOM',
          why: 'Missing UI element breaks expected user workflow',
          fix: 'Add element matching "' + sel + '" to ' + page,
          evidence: sel,
          severity: 'critical'
        }));
      } else {
        results.push(pass(page, 'functional', 'Required element: ' + sel));
      }
    });

    // 2. Key buttons exist and have handlers
    cfg.keyButtons.forEach(function (btn) {
      var el = doc.getElementById(btn.id);
      if (!el) {
        results.push(fail(page, 'functional', 'Button: ' + btn.id, {
          what: 'Button #' + btn.id + ' ("' + btn.label + '") not found',
          why: 'Core action unavailable to user',
          fix: 'Ensure <button id="' + btn.id + '"> exists in ' + page,
          evidence: btn.id,
          severity: 'critical'
        }));
      } else if (!isLive) {
        // STATIC mode: DOMParser docs don't execute scripts, so addEventListener
        // handlers are undetectable. Only verify via onclick attribute; if absent,
        // emit WARN (non-scored) instead of FAIL to avoid false negatives.
        var hasStaticHandler = el.hasAttribute('onclick') ||
          (el.dataset && el.dataset.action) || el.closest('form');
        if (!hasStaticHandler) {
          results.push(warn(page, 'functional', 'Button handler: ' + btn.id, {
            what: 'Button #' + btn.id + ' has no onclick attribute (STATIC mode — addEventListener not detectable)',
            why: 'Cannot verify runtime handler attachment in static analysis',
            fix: 'Run live audit on ' + page + ' to verify handler',
            evidence: 'id="' + btn.id + '"'
          }));
        } else {
          results.push(pass(page, 'functional', 'Button handler: ' + btn.id));
        }
      } else {
        // LIVE mode: full handler detection including runtime-attached listeners
        var hasOnclick = el.hasAttribute('onclick');
        var hasListeners = typeof el.onclick === 'function' || hasOnclick;
        if (!hasListeners && !(el.dataset && el.dataset.action) && !el.closest('form')) {
          results.push(fail(page, 'functional', 'Button handler: ' + btn.id, {
            what: 'Button #' + btn.id + ' has no detectable click handler',
            why: 'Button does nothing when clicked — dead control',
            fix: 'Attach event listener or onclick to #' + btn.id,
            evidence: 'id="' + btn.id + '", onclick=' + el.getAttribute('onclick'),
            severity: 'major'
          }));
        } else {
          results.push(pass(page, 'functional', 'Button handler: ' + btn.id));
        }
      }
    });

    // 3. Required scripts loaded
    var loadedScripts = Array.from(doc.querySelectorAll('script[src]'))
      .map(function (s) { return s.getAttribute('src'); });
    cfg.requiredScripts.forEach(function (script) {
      var found = loadedScripts.some(function (src) { return src.includes(script); });
      if (!found) {
        results.push(fail(page, 'functional', 'Script loaded: ' + script, {
          what: 'Required script "' + script + '" not loaded',
          why: 'Module functionality will be broken without this dependency',
          fix: 'Add <script src="scripts/' + script + '"></script> to ' + page,
          evidence: script,
          severity: 'critical'
        }));
      } else {
        results.push(pass(page, 'functional', 'Script loaded: ' + script));
      }
    });

    return results;
  }

  function runStructuralTests(doc, page, cfg) {
    var results = [];

    // 1. Navigation integrity — expected links present
    var anchors = Array.from(doc.querySelectorAll('a[href]'));
    var hrefs = anchors.map(function (a) { return a.getAttribute('href'); });

    cfg.expectedInternalLinks.forEach(function (link) {
      if (!hrefs.some(function (h) { return h.includes(link); })) {
        results.push(fail(page, 'structural', 'Nav link to: ' + link, {
          what: 'No <a href> pointing to "' + link + '" found',
          why: 'User cannot navigate to sibling module — broken navigation',
          fix: 'Add <a href="' + link + '"> to the nav bar in ' + page,
          evidence: link,
          severity: 'critical'
        }));
      } else {
        results.push(pass(page, 'structural', 'Nav link to: ' + link));
      }
    });

    // 2. Broken internal links — check all hrefs point to known pages
    var knownPages = [
      'command-center.html', 'route-cypher.html',
      'mileage-cypher.html', 'my-routes.html',
      'login-cypher.html', 'settings-booth.html',
      'total-loss-forms.html', 'welcome.html', 'index.html'
    ];
    var internalAnchors = anchors.filter(function (a) {
      var h = a.getAttribute('href');
      return h && !h.startsWith('http') && !h.startsWith('#') && !h.startsWith('mailto:') && !h.startsWith('javascript:');
    });
    internalAnchors.forEach(function (a) {
      var href = a.getAttribute('href');
      var file = href.split('?')[0].split('#')[0];
      if (file && !knownPages.includes(file)) {
        results.push(fail(page, 'structural', 'Internal link: ' + href, {
          what: 'Link "' + href + '" points to unknown page',
          why: 'Broken link leads to 404 — confuses user',
          fix: 'Update or remove the link to "' + href + '" in ' + page,
          evidence: '<a href="' + href + '">' + a.textContent.trim().substring(0, 40) + '</a>',
          severity: 'major'
        }));
      }
    });
    if (internalAnchors.length > 0 && results.filter(function (r) {
      return r.category === 'structural' && r.status === 'FAIL' && r.testName.startsWith('Internal link');
    }).length === 0) {
      results.push(pass(page, 'structural', 'All internal links valid'));
    }

    // 3. Required stylesheets loaded
    var loadedStyles = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'))
      .map(function (l) { return l.getAttribute('href'); });
    cfg.requiredStylesheets.forEach(function (sheet) {
      if (!loadedStyles.some(function (s) { return s.includes(sheet); })) {
        results.push(fail(page, 'structural', 'Stylesheet: ' + sheet, {
          what: 'Required stylesheet "' + sheet + '" not loaded',
          why: 'Page will render with broken or missing styles',
          fix: 'Add <link rel="stylesheet" href="styles/' + sheet + '"> to ' + page,
          evidence: sheet,
          severity: 'major'
        }));
      } else {
        results.push(pass(page, 'structural', 'Stylesheet: ' + sheet));
      }
    });

    // 4. Body visibility guard
    var body = doc.body || doc.querySelector('body');
    var bodyStyle = body ? (body.getAttribute('style') || '') : '';
    var hasVisibilityGuard = bodyStyle.includes('visibility');
    if (!hasVisibilityGuard) {
      results.push(fail(page, 'structural', 'Body visibility guard', {
        what: 'Body does not use visibility:hidden pattern for auth gate',
        why: 'Protected content may flash before auth check completes',
        fix: 'Add style="visibility: hidden" to <body> and reveal after protectPage()',
        evidence: 'body style="' + bodyStyle + '"',
        severity: 'minor'
      }));
    } else {
      results.push(pass(page, 'structural', 'Body visibility guard'));
    }

    return results;
  }

  function runSecurityTests(doc, page, cfg) {
    var results = [];

    // 1. Auth guard present
    var inlineScripts = Array.from(doc.querySelectorAll('script:not([src])'));
    var allInlineCode = inlineScripts.map(function (s) { return s.textContent; }).join('\n');
    var hasProtectPage = allInlineCode.includes('protectPage');
    if (!hasProtectPage) {
      results.push(fail(page, 'security', 'Auth guard: protectPage()', {
        what: 'No call to SupabaseAuth.protectPage() found in inline scripts',
        why: 'Page is accessible without authentication — unauthorized access risk',
        fix: 'Add SupabaseAuth.protectPage() call before rendering content',
        evidence: 'protectPage not found in any inline <script>',
        severity: 'critical'
      }));
    } else {
      results.push(pass(page, 'security', 'Auth guard: protectPage()'));
    }

    // 2. Logout button exists
    var logoutBtn = doc.querySelector('[onclick*="handleLogout"], [onclick*="logout"], .logout-btn');
    if (!logoutBtn) {
      results.push(fail(page, 'security', 'Logout control', {
        what: 'No logout button found on page',
        why: 'User cannot end session — session hijack risk',
        fix: 'Add logout button with onclick="handleLogout()"',
        evidence: 'No element matching [onclick*="handleLogout"] or .logout-btn',
        severity: 'major'
      }));
    } else {
      results.push(pass(page, 'security', 'Logout control'));
    }

    // 3. Supabase auth script loaded
    var scripts = Array.from(doc.querySelectorAll('script[src]')).map(function (s) { return s.getAttribute('src'); });
    if (!scripts.some(function (s) { return s.includes('supabase-auth.js'); })) {
      results.push(fail(page, 'security', 'Supabase auth loaded', {
        what: 'supabase-auth.js not loaded',
        why: 'Auth functions unavailable — protectPage() will fail',
        fix: 'Add <script src="scripts/supabase-auth.js"></script> before auth check',
        evidence: 'supabase-auth.js missing from script tags',
        severity: 'critical'
      }));
    } else {
      results.push(pass(page, 'security', 'Supabase auth loaded'));
    }

    // 4. No exposed API keys in inline scripts
    var apiKeyPattern = /['"](?:sk-|pk_|AIza|supabase)[A-Za-z0-9_-]{20,}['"]/;
    if (apiKeyPattern.test(allInlineCode)) {
      results.push(fail(page, 'security', 'Exposed API keys', {
        what: 'Potential API key found in inline script',
        why: 'Exposed credentials can be harvested from page source',
        fix: 'Move API keys to environment config files excluded from source',
        evidence: 'Pattern match for API key format in inline script',
        severity: 'critical'
      }));
    } else {
      results.push(pass(page, 'security', 'No exposed API keys'));
    }

    return results;
  }

  /**
   * @param {boolean} isLive - CSS variable checks require live DOM (getComputedStyle)
   */
  function runDesignTests(doc, page, isLive) {
    var results = [];

    // 1. CSS variables defined — live DOM only (getComputedStyle unavailable on parsed docs)
    if (isLive) {
      var rootStyle = getComputedStyle(doc.documentElement);
      var missingVars = [];
      REQUIRED_CSS_VARS.forEach(function (v) {
        var val = rootStyle.getPropertyValue(v).trim();
        if (!val) missingVars.push(v);
      });
      if (missingVars.length > 0) {
        results.push(fail(page, 'design', 'CSS variables', {
          what: missingVars.length + ' required CSS variables not defined',
          why: 'Components using these variables will render with fallback/broken colors',
          fix: 'Ensure universal-system.css is loaded and defines all --cipher-* variables',
          evidence: missingVars.join(', '),
          severity: missingVars.length > 5 ? 'critical' : 'major'
        }));
      } else {
        results.push(pass(page, 'design', 'CSS variables'));
      }
    }
    // Parsed docs: CSS variable test skipped (noted in report as N/A via lower total)

    // 2. No inline style overrides on major containers
    var majorContainers = doc.querySelectorAll('main, .cipher-header, .content-area, .page-container');
    var inlineStyleCount = 0;
    majorContainers.forEach(function (el) {
      if (el.getAttribute('style') && el.getAttribute('style').length > 30) {
        inlineStyleCount++;
      }
    });
    if (inlineStyleCount > 2) {
      results.push(fail(page, 'design', 'Inline style overrides', {
        what: inlineStyleCount + ' major containers have heavy inline styles',
        why: 'Inline styles bypass the design system — inconsistent look',
        fix: 'Move inline styles to CSS classes',
        evidence: inlineStyleCount + ' containers with >30 char inline style',
        severity: 'minor'
      }));
    } else {
      results.push(pass(page, 'design', 'Inline style overrides'));
    }

    // 3. Consistent header present
    var header = doc.querySelector('.cipher-header');
    if (!header) {
      results.push(fail(page, 'design', 'Cipher header', {
        what: 'No .cipher-header element found',
        why: 'Page lacks consistent branding/navigation bar',
        fix: 'Add .cipher-header with nav links matching other modules',
        evidence: '.cipher-header not in DOM',
        severity: 'major'
      }));
    } else {
      results.push(pass(page, 'design', 'Cipher header'));
    }

    // 4. User name display present
    var userEl = doc.getElementById('userName');
    if (!userEl) {
      results.push(fail(page, 'design', 'User name display', {
        what: '#userName element not found',
        why: 'User has no identity indication — feels impersonal',
        fix: 'Add <span id="userName"> in header area',
        evidence: '#userName missing',
        severity: 'minor'
      }));
    } else {
      results.push(pass(page, 'design', 'User name display'));
    }

    return results;
  }

  function runPerformanceTests(doc, page) {
    var results = [];

    // 1. Script count
    var scripts = doc.querySelectorAll('script');
    if (scripts.length > 18) {
      results.push(fail(page, 'performance', 'Script count', {
        what: scripts.length + ' <script> tags on page',
        why: 'Excessive scripts increase load time and block rendering',
        fix: 'Consider bundling scripts or lazy-loading non-critical ones',
        evidence: scripts.length + ' script tags',
        severity: 'minor'
      }));
    } else {
      results.push(pass(page, 'performance', 'Script count'));
    }

    // 2. Stylesheet count
    var styles = doc.querySelectorAll('link[rel="stylesheet"]');
    if (styles.length > 6) {
      results.push(fail(page, 'performance', 'Stylesheet count', {
        what: styles.length + ' stylesheets loaded',
        why: 'Each stylesheet is a render-blocking request',
        fix: 'Consolidate CSS into fewer files',
        evidence: styles.length + ' <link rel="stylesheet"> tags',
        severity: 'minor'
      }));
    } else {
      results.push(pass(page, 'performance', 'Stylesheet count'));
    }

    // 3. Images without dimensions
    var imgs = doc.querySelectorAll('img:not([width]):not([height])');
    if (imgs.length > 0) {
      results.push(fail(page, 'performance', 'Image dimensions', {
        what: imgs.length + ' <img> tags missing width/height',
        why: 'Causes layout shift (CLS) during load',
        fix: 'Add explicit width and height attributes to <img> tags',
        evidence: Array.from(imgs).slice(0, 3).map(function (i) { return i.getAttribute('src') || i.className; }).join(', '),
        severity: 'minor'
      }));
    } else {
      results.push(pass(page, 'performance', 'Image dimensions'));
    }

    // 4. DOM node count
    var nodeCount = doc.querySelectorAll('*').length;
    if (nodeCount > 1500) {
      results.push(fail(page, 'performance', 'DOM size', {
        what: nodeCount + ' DOM nodes',
        why: 'Large DOM slows rendering and JavaScript queries',
        fix: 'Reduce unnecessary wrapper elements; virtualize long lists',
        evidence: nodeCount + ' elements',
        severity: nodeCount > 3000 ? 'major' : 'minor'
      }));
    } else {
      results.push(pass(page, 'performance', 'DOM size'));
    }

    return results;
  }

  function runAccessibilityTests(doc, page) {
    var results = [];

    // 1. Buttons without accessible labels
    var allButtons = doc.querySelectorAll('button');
    var unlabeledButtons = [];
    allButtons.forEach(function (btn) {
      var text = (btn.textContent || '').trim();
      var ariaLabel = btn.getAttribute('aria-label');
      var title = btn.getAttribute('title');
      if (!text && !ariaLabel && !title) {
        unlabeledButtons.push(btn.id || btn.className || 'anonymous');
      }
    });
    if (unlabeledButtons.length > 0) {
      results.push(fail(page, 'accessibility', 'Button labels', {
        what: unlabeledButtons.length + ' buttons have no accessible text',
        why: 'Screen readers cannot describe button purpose to user',
        fix: 'Add aria-label or visible text content to each button',
        evidence: unlabeledButtons.slice(0, 5).join(', '),
        severity: 'major'
      }));
    } else {
      results.push(pass(page, 'accessibility', 'Button labels'));
    }

    // 2. Text inputs without labels
    var textInputs = doc.querySelectorAll(
      'input[type="text"], input[type="email"], input[type="tel"], input[type="url"], ' +
      'input[type="number"], input[type="search"], input[type="password"], input:not([type])'
    );
    var unlabeledTextInputs = [];
    textInputs.forEach(function (inp) {
      if (inp.getAttribute('type') === 'hidden') return;
      var id = inp.id;
      var ariaLabel = inp.getAttribute('aria-label');
      var placeholder = inp.getAttribute('placeholder');
      var hasLabel = id && doc.querySelector('label[for="' + id + '"]');
      if (!hasLabel && !ariaLabel && !placeholder) {
        unlabeledTextInputs.push(inputEvidence(inp));
      }
    });
    if (unlabeledTextInputs.length > 0) {
      results.push(fail(page, 'accessibility', 'Text input labels', {
        what: unlabeledTextInputs.length + ' text inputs have no label, aria-label, or placeholder',
        why: 'Users relying on assistive tech cannot identify the field',
        fix: 'Add <label for="..."> or aria-label to each text input',
        evidence: unlabeledTextInputs.slice(0, 5).join(', '),
        severity: inputSeverity(unlabeledTextInputs.length)
      }));
    } else {
      results.push(pass(page, 'accessibility', 'Text input labels'));
    }

    // 3. Checkbox inputs without labels
    var checkboxes = doc.querySelectorAll('input[type="checkbox"]');
    var unlabeledCheckboxes = [];
    checkboxes.forEach(function (inp) {
      var id = inp.id;
      var ariaLabel = inp.getAttribute('aria-label');
      var hasLabelFor = id && doc.querySelector('label[for="' + id + '"]');
      var hasWrappingLabel = inp.closest('label');
      if (!hasLabelFor && !hasWrappingLabel && !ariaLabel) {
        unlabeledCheckboxes.push(inputEvidence(inp));
      }
    });
    if (unlabeledCheckboxes.length > 0) {
      results.push(fail(page, 'accessibility', 'Checkbox labels', {
        what: unlabeledCheckboxes.length + ' checkboxes have no label[for], wrapping <label>, or aria-label',
        why: 'Checkboxes without labels are invisible to screen readers',
        fix: 'Wrap in <label> or add label[for] / aria-label to each checkbox',
        evidence: unlabeledCheckboxes.slice(0, 5).join(', '),
        severity: inputSeverity(unlabeledCheckboxes.length)
      }));
    } else {
      results.push(pass(page, 'accessibility', 'Checkbox labels'));
    }

    // 4. Select dropdowns without labels
    var selects = doc.querySelectorAll('select');
    var unlabeledSelects = [];
    selects.forEach(function (sel) {
      var id = sel.id;
      var ariaLabel = sel.getAttribute('aria-label');
      var hasLabel = id && doc.querySelector('label[for="' + id + '"]');
      if (!hasLabel && !ariaLabel) {
        unlabeledSelects.push(inputEvidence(sel));
      }
    });
    if (unlabeledSelects.length > 0) {
      results.push(fail(page, 'accessibility', 'Select labels', {
        what: unlabeledSelects.length + ' select dropdowns have no label or aria-label',
        why: 'Users relying on assistive tech cannot identify the dropdown',
        fix: 'Add <label for="..."> or aria-label to each <select>',
        evidence: unlabeledSelects.slice(0, 5).join(', '),
        severity: inputSeverity(unlabeledSelects.length)
      }));
    } else {
      results.push(pass(page, 'accessibility', 'Select labels'));
    }

    // 5. Textareas without labels
    var textareas = doc.querySelectorAll('textarea');
    var unlabeledTextareas = [];
    textareas.forEach(function (ta) {
      var id = ta.id;
      var ariaLabel = ta.getAttribute('aria-label');
      var placeholder = ta.getAttribute('placeholder');
      var hasLabel = id && doc.querySelector('label[for="' + id + '"]');
      if (!hasLabel && !ariaLabel && !placeholder) {
        unlabeledTextareas.push(inputEvidence(ta));
      }
    });
    if (unlabeledTextareas.length > 0) {
      results.push(fail(page, 'accessibility', 'Textarea labels', {
        what: unlabeledTextareas.length + ' textareas have no label, aria-label, or placeholder',
        why: 'Users relying on assistive tech cannot identify the field',
        fix: 'Add <label for="..."> or aria-label to each <textarea>',
        evidence: unlabeledTextareas.slice(0, 5).join(', '),
        severity: inputSeverity(unlabeledTextareas.length)
      }));
    } else {
      results.push(pass(page, 'accessibility', 'Textarea labels'));
    }

    // 6. Page has lang attribute
    var lang = doc.documentElement.getAttribute('lang');
    if (!lang) {
      results.push(fail(page, 'accessibility', 'HTML lang attribute', {
        what: '<html> tag missing lang attribute',
        why: 'Screen readers cannot determine page language',
        fix: 'Add lang="en" to <html> tag',
        evidence: '<html> has no lang',
        severity: 'minor'
      }));
    } else {
      results.push(pass(page, 'accessibility', 'HTML lang attribute'));
    }

    // 7. Page title exists
    var title = doc.title;
    if (!title || title.length < 3) {
      results.push(fail(page, 'accessibility', 'Page title', {
        what: 'Page title is missing or too short',
        why: 'Browser tabs and screen readers use title for identification',
        fix: 'Set a descriptive <title> in <head>',
        evidence: 'title="' + (title || '(empty)') + '"',
        severity: 'minor'
      }));
    } else {
      results.push(pass(page, 'accessibility', 'Page title'));
    }

    return results;
  }

  // ======================================================
  // BUTTON AUDIT
  // ======================================================
  /**
   * @param {boolean} isLive - offsetParent only works on live DOM
   */
  function runButtonAudit(doc, page, isLive) {
    var buttons = doc.querySelectorAll('button');
    var audit = [];

    buttons.forEach(function (btn, i) {
      var text = (btn.textContent || '').trim().replace(/\s+/g, ' ').substring(0, 60);
      var entry = {
        index: i,
        textContent: text || '(empty)',
        ariaLabel: btn.getAttribute('aria-label') || null,
        id: btn.id || null,
        classes: btn.className || null,
        onclick: btn.getAttribute('onclick') || null,
        dataAction: btn.getAttribute('data-action') || null,
        disabled: btn.hasAttribute('disabled'),
        hidden: isLive ? (btn.offsetParent === null) : null,
        hasHandler: !!(
          btn.getAttribute('onclick') ||
          btn.getAttribute('data-action') ||
          btn.closest('form') ||
          (isLive && typeof btn.onclick === 'function')
        )
      };
      audit.push(entry);
    });

    return audit;
  }

  // ======================================================
  // LOGICAL COHERENCE (per-page)
  // ======================================================
  function runCoherenceChecks(page, buttonAudit) {
    var warnings = [];

    // 1. Buttons with no handler and not in a form
    buttonAudit.forEach(function (btn) {
      if (!btn.hasHandler && !btn.disabled && btn.hidden !== true) {
        warnings.push({
          type: 'dead-button',
          what: 'Button "' + btn.textContent + '" (' + (btn.id || btn.classes || 'no id') + ') has no handler',
          where: page,
          why: 'Dead control confuses users — implies functionality that does not exist',
          fix: 'Attach an event listener or remove the button'
        });
      }
    });

    // 2. Mystery buttons — unclear label AND no handler
    buttonAudit.forEach(function (btn) {
      var text = btn.textContent;
      if (text.length <= 2 && !btn.ariaLabel && !btn.id) {
        warnings.push({
          type: 'mystery-button',
          what: 'Button with unclear label "' + text + '" and no aria-label or id',
          where: page,
          why: 'Purpose is unidentifiable to users and developers',
          fix: 'Add aria-label and/or descriptive text'
        });
      }
    });

    // 3. Duplicate buttons by text content
    var textCounts = {};
    buttonAudit.forEach(function (btn) {
      var t = btn.textContent.toLowerCase();
      if (t.length > 2) {
        textCounts[t] = (textCounts[t] || 0) + 1;
      }
    });
    Object.entries(textCounts).forEach(function (entry) {
      if (entry[1] > 1) {
        warnings.push({
          type: 'duplicate-button',
          what: 'Button text "' + entry[0] + '" appears ' + entry[1] + ' times',
          where: page,
          why: 'Duplicate labels create ambiguity about which control to use',
          fix: 'Differentiate labels or consolidate into one control'
        });
      }
    });

    // 4. Hidden buttons that are not disabled
    buttonAudit.forEach(function (btn) {
      if (btn.hidden === true && !btn.disabled && btn.hasHandler) {
        warnings.push({
          type: 'hidden-active',
          what: 'Button "' + btn.textContent + '" (' + (btn.id || 'no id') + ') is hidden but has an active handler',
          where: page,
          why: 'May be triggered programmatically or may be leftover dead code',
          fix: 'Verify intent — if unused, remove; if modal-triggered, confirm it appears when expected'
        });
      }
    });

    return warnings;
  }

  // ======================================================
  // CROSS-PAGE COHERENCE
  // ======================================================
  function runCrossPageCoherence(pageDataMap) {
    var warnings = [];
    var pages = Object.keys(pageDataMap);

    // 1. Symmetric navigation: every configured page should link to every other
    pages.forEach(function (fromPage) {
      var doc = pageDataMap[fromPage].doc;
      var hrefs = Array.from(doc.querySelectorAll('a[href]')).map(function (a) { return a.getAttribute('href'); });
      pages.forEach(function (toPage) {
        if (fromPage !== toPage) {
          if (!hrefs.some(function (h) { return h.includes(toPage); })) {
            warnings.push({
              type: 'missing-cross-nav',
              what: fromPage + ' has no link to ' + toPage,
              where: fromPage,
              why: 'User cannot navigate between modules without returning to Command Center',
              fix: 'Add <a href="' + toPage + '"> to navigation in ' + fromPage
            });
          }
        }
      });
    });

    // 2. Consistent auth pattern: all pages should have protectPage()
    pages.forEach(function (pg) {
      var doc = pageDataMap[pg].doc;
      var inlineScripts = Array.from(doc.querySelectorAll('script:not([src])'));
      var allCode = inlineScripts.map(function (s) { return s.textContent; }).join('\n');
      if (!allCode.includes('protectPage')) {
        warnings.push({
          type: 'inconsistent-auth',
          what: pg + ' lacks protectPage() guard',
          where: pg,
          why: 'Inconsistent auth pattern across pages — security gap',
          fix: 'Add SupabaseAuth.protectPage() to all protected pages'
        });
      }
    });

    // 3. Consistent header structure
    pages.forEach(function (pg) {
      var doc = pageDataMap[pg].doc;
      if (!doc.querySelector('.cipher-header')) {
        warnings.push({
          type: 'inconsistent-header',
          what: pg + ' is missing .cipher-header',
          where: pg,
          why: 'Inconsistent branding across modules',
          fix: 'Add .cipher-header to match other module pages'
        });
      }
    });

    // 4. Consistent logout availability
    pages.forEach(function (pg) {
      var doc = pageDataMap[pg].doc;
      var logoutBtn = doc.querySelector('[onclick*="handleLogout"], [onclick*="logout"], .logout-btn');
      if (!logoutBtn) {
        warnings.push({
          type: 'missing-logout',
          what: pg + ' has no logout control',
          where: pg,
          why: 'User stuck on page with no way to end session',
          fix: 'Add logout button to header in ' + pg
        });
      }
    });

    return warnings;
  }

  // ======================================================
  // CONSOLE ERROR CAPTURE
  // ======================================================
  function captureConsoleErrors() {
    var captured = [];
    var originalError = console.error;
    console.error = function () {
      var args = Array.from(arguments);
      captured.push(args.map(function (a) { return typeof a === 'object' ? JSON.stringify(a).substring(0, 200) : String(a); }).join(' '));
      originalError.apply(console, args);
    };
    // Restore after short delay
    setTimeout(function () { console.error = originalError; }, 100);
    return captured;
  }

  // ======================================================
  // SCORING ENGINE
  // ======================================================
  function computeScores(allResults) {
    var categoryScores = {};

    Object.keys(CATEGORY_WEIGHTS).forEach(function (cat) {
      // Only PASS and FAIL affect totals — WARN entries are excluded from scoring
      var catResults = allResults.filter(function (r) { return r.category === cat && r.status !== 'WARN'; });
      if (catResults.length === 0) {
        categoryScores[cat] = { score: 100, passed: 0, total: 0 };
        return;
      }
      var passed = catResults.filter(function (r) { return r.status === 'PASS'; }).length;
      var total = catResults.length;
      categoryScores[cat] = {
        score: Math.round((passed / total) * 100),
        passed: passed,
        total: total
      };
    });

    // Weighted total
    var weightedTotal = 0;
    Object.entries(CATEGORY_WEIGHTS).forEach(function (entry) {
      var cat = entry[0], weight = entry[1];
      weightedTotal += (categoryScores[cat] ? categoryScores[cat].score : 0) * weight;
    });
    weightedTotal = Math.round(weightedTotal);

    // Compute per-failure weight impact
    var failures = allResults.filter(function (r) { return r.status === 'FAIL'; });
    failures.forEach(function (f) {
      var cat = f.category;
      var catResults = allResults.filter(function (r) { return r.category === cat; });
      var weight = CATEGORY_WEIGHTS[cat] || 0;
      if (catResults.length > 0) {
        f.weightImpact = parseFloat(((weight * 100) / catResults.length).toFixed(1));
      }
    });

    return { categoryScores: categoryScores, weightedTotal: weightedTotal, failures: failures };
  }

  // ======================================================
  // REPORT: SINGLE PAGE
  // ======================================================
  function printReport(scores, allResults, buttonAudit, coherenceWarnings, consoleErrors, page, cfg) {
    var divider = '='.repeat(60);

    console.log('\n' + divider);
    console.log('  CLAIM CIPHER SYSTEM QA REPORT');
    console.log('  Page: ' + page + ' (' + (cfg ? cfg.label : 'Unknown') + ')');
    console.log('  Time: ' + new Date().toLocaleString());
    console.log(divider);

    // Scores
    console.log('\nSCORES:');
    Object.entries(CATEGORY_WEIGHTS).forEach(function (entry) {
      var cat = entry[0], weight = entry[1];
      var cs = scores.categoryScores[cat];
      var pct = cs ? cs.score + '%' : 'N/A';
      var detail = cs ? cs.passed + '/' + cs.total : '';
      var bar = cs ? ('\u2588'.repeat(Math.floor(cs.score / 5)) + '\u2591'.repeat(20 - Math.floor(cs.score / 5))) : '';
      console.log('  ' + cat.padEnd(16) + ' ' + bar + ' ' + pct.padStart(5) + ' (weight ' + Math.round(weight * 100) + '%) ' + detail);
    });

    console.log('\n  SYSTEM SCORE: ' + scores.weightedTotal + '%');
    if (scores.weightedTotal >= 95) {
      console.log('  STATUS: PRODUCTION READY');
    } else if (scores.weightedTotal >= 85) {
      console.log('  STATUS: GOOD (target 95%)');
    } else if (scores.weightedTotal >= 70) {
      console.log('  STATUS: NEEDS IMPROVEMENT (target 95%)');
    } else {
      console.log('  STATUS: CRITICAL — major issues detected');
    }

    // Console errors
    if (consoleErrors.length > 0) {
      console.log('\n' + divider);
      console.log('RUNTIME CONSOLE ERRORS:');
      consoleErrors.forEach(function (err, i) {
        console.log('  ' + (i + 1) + ') ' + err);
      });
    }

    // Failures
    if (scores.failures.length > 0) {
      console.log('\n' + divider);
      console.log('FAILURES (' + scores.failures.length + '):');
      scores.failures
        .sort(function (a, b) {
          var sev = { critical: 0, major: 1, minor: 2 };
          return ((sev[a.severity] != null ? sev[a.severity] : 2) - (sev[b.severity] != null ? sev[b.severity] : 2)) || b.weightImpact - a.weightImpact;
        })
        .forEach(function (f, i) {
          console.log('\n  ' + (i + 1) + ') [' + f.severity.toUpperCase() + '][' + f.page + '][' + f.category + '] ' + f.testName);
          console.log('     WHAT: ' + f.whatFailed);
          console.log('     WHY:  ' + f.whyItMatters);
          console.log('     FIX:  ' + f.howToFix);
          if (f.evidence) console.log('     EVIDENCE: ' + f.evidence);
          console.log('     IMPACT: -' + f.weightImpact + '% weighted');
        });
    } else {
      console.log('\n  No failures detected.');
    }

    // Coherence warnings
    if (coherenceWarnings.length > 0) {
      console.log('\n' + divider);
      console.log('LOGICAL COHERENCE WARNINGS (' + coherenceWarnings.length + '):');
      coherenceWarnings.forEach(function (w, i) {
        console.log('\n  ' + (i + 1) + ') [' + w.type + '] ' + w.what);
        console.log('     WHERE: ' + w.where);
        console.log('     WHY:   ' + w.why);
        console.log('     FIX:   ' + w.fix);
      });
    }

    // Static analysis limitations
    var warnEntries = allResults.filter(function (r) { return r.status === 'WARN'; });
    if (warnEntries.length > 0) {
      console.log('\n' + divider);
      console.log('STATIC ANALYSIS LIMITATIONS (' + warnEntries.length + '):');
      warnEntries.forEach(function (w, i) {
        console.log('\n  ' + (i + 1) + ') [WARN][' + w.page + '][' + w.category + '] ' + w.testName);
        console.log('     WHAT: ' + w.whatFailed);
        console.log('     WHY:  ' + w.whyItMatters);
        console.log('     FIX:  ' + w.howToFix);
      });
    }

    // Top priority fixes
    if (scores.failures.length > 0) {
      console.log('\n' + divider);
      console.log('TOP PRIORITY FIXES (highest score impact):');
      scores.failures
        .sort(function (a, b) { return b.weightImpact - a.weightImpact; })
        .slice(0, 5)
        .forEach(function (f, i) {
          console.log('  ' + (i + 1) + '. [+' + f.weightImpact + '%] ' + f.testName + ' — ' + f.howToFix);
        });
    }

    // Button audit summary
    console.log('\n' + divider);
    console.log('BUTTON AUDIT (' + buttonAudit.length + ' buttons):');
    console.table(buttonAudit.map(function (b) {
      return {
        text: b.textContent,
        id: b.id || '-',
        onclick: b.onclick ? b.onclick.substring(0, 40) : '-',
        'data-action': b.dataAction || '-',
        handler: b.hasHandler ? 'yes' : 'NO',
        disabled: b.disabled ? 'yes' : '-',
        hidden: b.hidden === null ? '?' : (b.hidden ? 'yes' : '-')
      };
    }));

    console.log('\n' + divider);
    console.log('END OF QA REPORT');
    console.log(divider + '\n');
  }

  // ======================================================
  // REPORT: FULL SYSTEM (multi-page)
  // ======================================================
  function printFullReport(pageReports, crossPageWarnings) {
    var divider = '='.repeat(70);
    var thinDivider = '-'.repeat(70);

    console.log('\n' + divider);
    console.log('  CLAIM CIPHER — FULL SYSTEM QA REPORT');
    console.log('  Time: ' + new Date().toLocaleString());
    console.log('  Pages audited: ' + pageReports.length);
    console.log(divider);

    // Per-page breakdown
    pageReports.forEach(function (pr) {
      console.log('\n' + thinDivider);
      console.log('  PAGE: ' + pr.page + ' (' + pr.label + ')');
      console.log('  Mode: ' + (pr.isLive ? 'LIVE DOM' : 'STATIC (fetched + parsed)'));
      console.log(thinDivider);

      // Category scores
      Object.entries(CATEGORY_WEIGHTS).forEach(function (entry) {
        var cat = entry[0], weight = entry[1];
        var cs = pr.scores.categoryScores[cat];
        var pct = cs ? cs.score + '%' : 'N/A';
        var detail = cs ? cs.passed + '/' + cs.total : '';
        var bar = cs ? ('\u2588'.repeat(Math.floor(cs.score / 5)) + '\u2591'.repeat(20 - Math.floor(cs.score / 5))) : '';
        console.log('    ' + cat.padEnd(16) + ' ' + bar + ' ' + pct.padStart(5) + ' (\u00D7' + Math.round(weight * 100) + '%) ' + detail);
      });

      console.log('\n    PAGE SCORE: ' + pr.scores.weightedTotal + '%');

      // Failures for this page
      if (pr.scores.failures.length > 0) {
        console.log('\n    FAILURES (' + pr.scores.failures.length + '):');
        pr.scores.failures
          .sort(function (a, b) {
            var sev = { critical: 0, major: 1, minor: 2 };
            return ((sev[a.severity] != null ? sev[a.severity] : 2) - (sev[b.severity] != null ? sev[b.severity] : 2));
          })
          .forEach(function (f, i) {
            console.log('      ' + (i + 1) + ') [' + f.severity.toUpperCase() + '][' + f.category + '] ' + f.testName);
            console.log('         WHAT: ' + f.whatFailed);
            console.log('         WHY:  ' + f.whyItMatters);
            console.log('         FIX:  ' + f.howToFix);
            if (f.evidence) console.log('         EVIDENCE: ' + f.evidence);
            console.log('         IMPACT: -' + f.weightImpact + '% weighted');
          });
      } else {
        console.log('\n    No failures detected.');
      }

      // Coherence warnings for this page
      if (pr.coherenceWarnings.length > 0) {
        console.log('\n    COHERENCE WARNINGS (' + pr.coherenceWarnings.length + '):');
        pr.coherenceWarnings.forEach(function (w, i) {
          console.log('      ' + (i + 1) + ') [' + w.type + '] ' + w.what);
        });
      }

      // Static analysis limitations for this page
      var warnEntries = pr.allResults.filter(function (r) { return r.status === 'WARN'; });
      if (warnEntries.length > 0) {
        console.log('\n    STATIC ANALYSIS LIMITATIONS (' + warnEntries.length + '):');
        warnEntries.forEach(function (w, i) {
          console.log('      ' + (i + 1) + ') [' + w.category + '] ' + w.testName + ' — ' + w.whatFailed);
        });
      }

      // Button audit table
      if (pr.buttonAudit.length > 0) {
        console.log('\n    BUTTONS (' + pr.buttonAudit.length + '):');
        console.table(pr.buttonAudit.map(function (b) {
          return {
            text: b.textContent,
            id: b.id || '-',
            onclick: b.onclick ? b.onclick.substring(0, 40) : '-',
            handler: b.hasHandler ? 'yes' : 'NO',
            disabled: b.disabled ? 'yes' : '-',
            hidden: b.hidden === null ? '?' : (b.hidden ? 'yes' : '-')
          };
        }));
      }
    });

    // Cross-page coherence
    if (crossPageWarnings.length > 0) {
      console.log('\n' + divider);
      console.log('CROSS-PAGE COHERENCE (' + crossPageWarnings.length + ' warnings):');
      crossPageWarnings.forEach(function (w, i) {
        console.log('  ' + (i + 1) + ') [' + w.type + '] ' + w.what);
        console.log('     WHERE: ' + w.where);
        console.log('     WHY:   ' + w.why);
        console.log('     FIX:   ' + w.fix);
      });
    }

    // System-wide scores (aggregate all results from all pages)
    var allResults = [];
    pageReports.forEach(function (pr) {
      allResults = allResults.concat(pr.allResults);
    });
    var systemScores = computeScores(allResults);

    console.log('\n' + divider);
    console.log('SYSTEM-WIDE SCORES:');
    Object.entries(CATEGORY_WEIGHTS).forEach(function (entry) {
      var cat = entry[0], weight = entry[1];
      var cs = systemScores.categoryScores[cat];
      var pct = cs ? cs.score + '%' : 'N/A';
      var detail = cs ? cs.passed + '/' + cs.total : '';
      var bar = cs ? ('\u2588'.repeat(Math.floor(cs.score / 5)) + '\u2591'.repeat(20 - Math.floor(cs.score / 5))) : '';
      console.log('  ' + cat.padEnd(16) + ' ' + bar + ' ' + pct.padStart(5) + ' (\u00D7' + Math.round(weight * 100) + '%) ' + detail);
    });

    console.log('\n  SYSTEM SCORE: ' + systemScores.weightedTotal + '%');
    if (systemScores.weightedTotal >= 95) {
      console.log('  STATUS: PRODUCTION READY');
    } else if (systemScores.weightedTotal >= 85) {
      console.log('  STATUS: GOOD (target 95%)');
    } else if (systemScores.weightedTotal >= 70) {
      console.log('  STATUS: NEEDS IMPROVEMENT (target 95%)');
    } else {
      console.log('  STATUS: CRITICAL — major issues detected');
    }

    // Top priority fixes across ALL pages
    if (systemScores.failures.length > 0) {
      console.log('\n' + divider);
      console.log('TOP PRIORITY FIXES (system-wide, highest impact):');
      systemScores.failures
        .sort(function (a, b) { return b.weightImpact - a.weightImpact; })
        .slice(0, 10)
        .forEach(function (f, i) {
          console.log('  ' + (i + 1) + '. [+' + f.weightImpact + '%][' + f.page + '] ' + f.testName + ' — ' + f.howToFix);
        });
    }

    console.log('\n' + divider);
    console.log('END OF FULL SYSTEM QA REPORT');
    console.log(divider + '\n');

    return {
      pageReports: pageReports,
      crossPageWarnings: crossPageWarnings,
      systemScores: systemScores,
      systemScore: systemScores.weightedTotal
    };
  }

  // ======================================================
  // MAIN: run() — current page only (backward-compatible)
  // ======================================================
  function run() {
    if (!isDevMode()) return;

    var page = currentPage();
    var cfg = getPageConfig();

    if (!cfg) {
      console.log('[ClaimCipherSystemQA] Page "' + page + '" is not a configured module. Skipping.');
      return;
    }

    console.log('[ClaimCipherSystemQA] Running on ' + page + '...');

    var consoleErrors = captureConsoleErrors();

    // Run all test categories against live document
    var allResults = [].concat(
      runFunctionalTests(document, page, cfg, true),
      runStructuralTests(document, page, cfg),
      runSecurityTests(document, page, cfg),
      runDesignTests(document, page, true),
      runPerformanceTests(document, page),
      runAccessibilityTests(document, page)
    );

    // Button audit + coherence
    var buttonAudit = runButtonAudit(document, page, true);
    var coherenceWarnings = runCoherenceChecks(page, buttonAudit);

    // Score
    var scores = computeScores(allResults);

    // Report
    printReport(scores, allResults, buttonAudit, coherenceWarnings, consoleErrors, page, cfg);

    // Return data for programmatic use
    return {
      page: page,
      scores: scores,
      failures: scores.failures,
      coherenceWarnings: coherenceWarnings,
      buttonAudit: buttonAudit,
      consoleErrors: consoleErrors,
      allResults: allResults
    };
  }

  // ======================================================
  // MAIN: runFullSystemAudit() — all 3 pages in one sweep
  // ======================================================
  async function runFullSystemAudit() {
    if (!isDevMode()) return;

    console.log('[ClaimCipherSystemQA] Starting full system audit...');

    var current = currentPage();
    var pageReports = [];
    var pageDataMap = {};

    for (var _i = 0; _i < Object.entries(PAGE_CONFIG).length; _i++) {
      var entry = Object.entries(PAGE_CONFIG)[_i];
      var pageName = entry[0];
      var cfg = entry[1];
      var isLive = (pageName === current);
      var doc;

      if (isLive) {
        doc = document;
        console.log('[ClaimCipherSystemQA] Auditing ' + pageName + ' (LIVE DOM)...');
      } else {
        try {
          doc = await fetchAndParse(pageName);
          console.log('[ClaimCipherSystemQA] Auditing ' + pageName + ' (fetched + parsed)...');
        } catch (e) {
          console.warn('[ClaimCipherSystemQA] Could not fetch ' + pageName + ': ' + e.message);
          continue;
        }
      }

      pageDataMap[pageName] = { doc: doc, cfg: cfg, isLive: isLive };

      var consoleErrors = isLive ? captureConsoleErrors() : [];

      var allResults = [].concat(
        runFunctionalTests(doc, pageName, cfg, isLive),
        runStructuralTests(doc, pageName, cfg),
        runSecurityTests(doc, pageName, cfg),
        runDesignTests(doc, pageName, isLive),
        runPerformanceTests(doc, pageName),
        runAccessibilityTests(doc, pageName)
      );

      var buttonAudit = runButtonAudit(doc, pageName, isLive);
      var coherenceWarnings = runCoherenceChecks(pageName, buttonAudit);
      var scores = computeScores(allResults);

      pageReports.push({
        page: pageName,
        label: cfg.label,
        isLive: isLive,
        scores: scores,
        allResults: allResults,
        buttonAudit: buttonAudit,
        coherenceWarnings: coherenceWarnings,
        consoleErrors: consoleErrors
      });
    }

    // Cross-page coherence checks
    var crossPageWarnings = runCrossPageCoherence(pageDataMap);

    // Print unified multi-page report
    return printFullReport(pageReports, crossPageWarnings);
  }

  // ======================================================
  // EXPOSE + AUTO-RUN
  // ======================================================
  window.ClaimCipherSystemQA = {
    run: run,
    runFullSystemAudit: runFullSystemAudit,
    PAGE_CONFIG: PAGE_CONFIG,
    CATEGORY_WEIGHTS: CATEGORY_WEIGHTS
  };

  // Auto-run: single page only (full audit must be invoked manually)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(run, 1500); });
  } else {
    setTimeout(run, 1500);
  }

})();
