/**
 * Welcome Cipher — Onboarding flow
 * Split controls: checkbox toggles completion, card body navigates.
 * Pulse reminder when returning from a linked page.
 */
(function () {
  var STORAGE_KEY = 'cipher_onboarding';
  var PULSE_KEY = 'cipher_onboarding_pulse';
  var TOTAL = 5;

  var STEPS = [
    {
      id: 'profile',
      number: '01',
      title: 'Complete Your Profile',
      section: 'SETTINGS \u2192 PROFILE',
      description: 'Set your name, license number, and contact info so your documents are properly attributed.',
      cta: 'Go to Settings \u2192 Profile',
      link: 'settings.html'
    },
    {
      id: 'address',
      number: '02',
      title: 'Save Your Home Address',
      section: 'SETTINGS \u2192 PROFILE \u2192 ADDRESS',
      description: 'Your home base auto-fills Route Cipher and Mileage Cipher so you never re-enter it.',
      cta: 'Go to Settings \u2192 Address',
      link: 'settings.html'
    },
    {
      id: 'firms',
      number: '03',
      title: 'Add Your Insurance Firms',
      section: 'SETTINGS \u2192 MY FIRMS',
      description: 'Add the carriers you work with and set their mileage rates. This unlocks billing calculations.',
      cta: 'Go to Settings \u2192 My Firms',
      link: 'settings.html'
    },
    {
      id: 'route',
      number: '04',
      title: 'Run Your First Route',
      section: 'ROUTES \u2192 ROUTE CIPHER',
      description: 'Enter your stops, hit Optimize Route, and see your day mapped out in seconds.',
      cta: 'Go to Route Cipher',
      link: 'route-cypher.html'
    },
    {
      id: 'echo',
      number: '\u25C8',
      title: 'Meet Echo',
      section: 'AVAILABLE ON EVERY PAGE',
      description: 'Echo is your built-in assistant. Ask it anything \u2014 how to log mileage, process an estimate, or export your routes.',
      cta: 'Open Echo',
      isEcho: true
    }
  ];

  // ── State ────────────────────────────────────────────────────────
  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch (_) { return {}; }
  }
  function saveState(s) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

  var completed = loadState();

  function countDone() {
    var n = 0;
    STEPS.forEach(function (s) { if (completed[s.id]) n++; });
    return n;
  }

  // ── DOM helpers ──────────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }

  // ── Progress bar ─────────────────────────────────────────────────
  function updateProgress() {
    var done = countDone();
    var allDone = done === TOTAL;
    var pct = (done / TOTAL) * 100;
    var fill = $('wc-progress-fill');
    var count = $('wc-progress-count');
    var banner = $('wc-done-banner');
    var footer = $('wc-footer');

    if (fill) {
      fill.style.width = pct + '%';
      fill.className = allDone ? 'wc-progress-fill wc-progress-fill--done' : 'wc-progress-fill';
    }
    if (count) {
      count.textContent = done + '/' + TOTAL + ' COMPLETE';
      count.className = allDone ? 'wc-progress-count wc-progress-count--done' : 'wc-progress-count wc-progress-count--active';
    }
    if (banner) banner.style.display = allDone ? 'flex' : 'none';
    if (footer) footer.style.display = allDone ? 'none' : 'block';
  }

  // ── Step DOM update ──────────────────────────────────────────────
  function updateStepDOM(step) {
    var card = document.querySelector('[data-step="' + step.id + '"]');
    if (!card) return;
    var done = !!completed[step.id];

    // Card class
    card.className = 'wc-step wc-mounted' + (done ? ' wc-step--done' : '');

    // Checkbox
    var cb = card.querySelector('.wc-checkbox');
    if (cb) {
      cb.className = 'wc-checkbox' + (done ? ' wc-checkbox--done' : '');
      cb.innerHTML = done ? '<span class="wc-check-mark">\u2713</span>' : '';
    }

    // Section
    var secEl = card.querySelector('.wc-section');
    if (secEl) secEl.className = 'wc-section' + (done ? ' wc-section--done' : step.isEcho ? ' wc-section--echo' : '');

    // Title
    var titleEl = card.querySelector('.wc-step-title');
    if (titleEl) titleEl.className = 'wc-step-title' + (done ? ' wc-step-title--done' : step.isEcho ? ' wc-step-title--echo' : '');

    // CTA
    var ctaEl = card.querySelector('.wc-cta');
    if (ctaEl) ctaEl.style.display = done ? 'none' : '';

    // Description
    var descEl = card.querySelector('.wc-description');
    if (descEl) descEl.className = 'wc-description' + (done ? ' wc-description--done' : '');

    // Echo badge
    var badge = card.querySelector('.wc-echo-badge');
    if (badge) badge.style.display = done ? 'none' : '';

    // Remove pulse reminder if present
    var pulse = card.querySelector('.wc-pulse-hint');
    if (pulse && done) pulse.remove();
  }

  // ── Checkbox toggle (independent of navigation) ──────────────────
  function toggleComplete(e, step) {
    e.stopPropagation();
    completed[step.id] = !completed[step.id];
    saveState(completed);
    updateStepDOM(step);
    updateProgress();
  }

  // ── Navigate (card body click) ───────────────────────────────────
  function handleNavigate(step) {
    if (step.isEcho) {
      // Open the Echo widget
      var toggle = document.getElementById('echo-toggle');
      if (toggle) toggle.click();
      return;
    }
    // Store which step was navigated so we can pulse on return
    localStorage.setItem(PULSE_KEY, step.id);
    window.location.href = step.link;
  }

  // ── Pulse reminder ───────────────────────────────────────────────
  function checkPulseOnLoad() {
    var pulseId = localStorage.getItem(PULSE_KEY);
    if (!pulseId) return;
    localStorage.removeItem(PULSE_KEY);

    // Don't pulse if already completed
    if (completed[pulseId]) return;

    var card = document.querySelector('[data-step="' + pulseId + '"]');
    if (!card) return;

    // Add pulse class
    card.classList.add('wc-step--pulse');

    // Add pulse hint text
    var content = card.querySelector('.wc-content');
    if (content) {
      var hint = document.createElement('div');
      hint.className = 'wc-pulse-hint';
      hint.innerHTML = '<span class="wc-pulse-dot">\u25CF</span> DONE? TICK THE CHECKBOX TO MARK COMPLETE';
      content.appendChild(hint);
    }

    // Remove pulse after 2.5s
    setTimeout(function () {
      card.classList.remove('wc-step--pulse');
      var h = card.querySelector('.wc-pulse-hint');
      if (h) h.remove();
    }, 2500);
  }

  // ── Mount animation ──────────────────────────────────────────────
  function animateMount() {
    setTimeout(function () {
      var header = $('wc-header');
      var progress = $('wc-progress');
      if (header) header.classList.add('wc-mounted');
      if (progress) progress.classList.add('wc-mounted');

      var cards = document.querySelectorAll('.wc-step');
      cards.forEach(function (card, i) {
        setTimeout(function () {
          card.classList.add('wc-mounted');
        }, 150 + i * 80);
      });
    }, 100);
  }

  // ── Build steps ──────────────────────────────────────────────────
  function buildSteps() {
    var container = $('wc-steps');
    if (!container) return;

    STEPS.forEach(function (step) {
      var done = !!completed[step.id];
      var card = document.createElement('div');
      card.className = 'wc-step' + (done ? ' wc-step--done' : '');
      card.setAttribute('data-step', step.id);
      card.style.transitionDelay = (0.15 + STEPS.indexOf(step) * 0.08) + 's';

      var html = '<div class="wc-accent"></div>';

      // Checkbox
      html += '<div class="wc-checkbox' + (done ? ' wc-checkbox--done' : '') + '" title="' + (done ? 'Mark incomplete' : 'Mark complete') + '">';
      if (done) html += '<span class="wc-check-mark">\u2713</span>';
      html += '</div>';

      // Card body (navigable)
      html += '<div class="wc-content">';
      html += '<div class="wc-section' + (done ? ' wc-section--done' : step.isEcho ? ' wc-section--echo' : '') + '">' + step.section + '</div>';
      html += '<div class="wc-title-row">';
      html += '<div class="wc-step-title' + (done ? ' wc-step-title--done' : step.isEcho ? ' wc-step-title--echo' : '') + '">' + step.title + '</div>';
      html += '<div class="wc-cta"' + (done ? ' style="display:none"' : '') + '>';
      html += '<span>' + step.cta + '</span>';
      html += '<span class="wc-cta-arrow">\u2192</span>';
      html += '</div>';
      html += '</div>';
      html += '<p class="wc-description' + (done ? ' wc-description--done' : '') + '">' + step.description + '</p>';

      if (step.isEcho && !done) {
        html += '<div class="wc-echo-badge"><span>\u25C8</span> ECHO IS READY</div>';
      }

      html += '</div>';
      card.innerHTML = html;

      // Wire checkbox click (stopPropagation so it doesn't trigger navigate)
      var cb = card.querySelector('.wc-checkbox');
      if (cb) {
        cb.addEventListener('click', function (e) { toggleComplete(e, step); });
      }

      // Wire card body click (navigate)
      var content = card.querySelector('.wc-content');
      if (content) {
        content.addEventListener('click', function () { handleNavigate(step); });
      }

      container.appendChild(card);
    });
  }

  // ── Dismiss ──────────────────────────────────────────────────────
  function dismiss() {
    window.location.href = 'command-center.html';
  }

  // ── Init ─────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    buildSteps();
    updateProgress();
    animateMount();
    checkPulseOnLoad();

    var skipBtn = $('wc-skip');
    var enterBtn = $('wc-enter');
    if (skipBtn) skipBtn.addEventListener('click', dismiss);
    if (enterBtn) enterBtn.addEventListener('click', dismiss);
  });
})();
