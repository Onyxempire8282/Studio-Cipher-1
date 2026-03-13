/**
 * email-capture-modal.js
 * Shared email capture modal for Claim Cipher.
 * Shows before demo mode activation (login page) or on demo exit (command center).
 *
 * Usage:
 *   <script defer src="shared/email-capture-modal.js"></script>
 *
 * API:
 *   window.CipherCapture.show(onComplete, location)
 *     — Shows the modal. location = 'login' | 'exit'.
 *       Calls onComplete() after submit, skip, or Esc.
 *   window.CipherCapture.shouldShow(location)
 *     — Returns true if the modal should show for the given location.
 *       Once an email is submitted the modal never shows again.
 *       A skip only suppresses that specific location.
 */
(function () {
  'use strict';

  var SUBMITTED_KEY = 'cc_capture_submitted';
  var SKIPPED_KEY   = 'cc_capture_skipped';

  // Migrate legacy flag — treat old "seen" as "submitted" since we can't tell
  if (localStorage.getItem('cc_capture_seen') === '1' && !localStorage.getItem(SUBMITTED_KEY)) {
    localStorage.setItem(SUBMITTED_KEY, '1');
    localStorage.removeItem('cc_capture_seen');
  }

  function isValidEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  }

  function isPaidSubscriber() {
    try {
      var session = window.__cipherSession || null;
      return !!(session && session.user);
    } catch (_) { return false; }
  }

  function hasSubmitted() {
    return localStorage.getItem(SUBMITTED_KEY) === '1';
  }

  function markSubmitted() {
    localStorage.setItem(SUBMITTED_KEY, '1');
  }

  function getSkippedLocations() {
    var raw = localStorage.getItem(SKIPPED_KEY) || '';
    return raw ? raw.split(',') : [];
  }

  function markSkipped(location) {
    var skipped = getSkippedLocations();
    if (skipped.indexOf(location) === -1) {
      skipped.push(location);
      localStorage.setItem(SKIPPED_KEY, skipped.join(','));
    }
  }

  function track(eventName, props) {
    try { if (window.va) window.va.track(eventName, props); } catch (_) {}
  }

  function shouldShow(location) {
    if (hasSubmitted()) return false;
    if (isPaidSubscriber()) return false;
    if (location && getSkippedLocations().indexOf(location) !== -1) return false;
    return true;
  }

  // ── Build DOM ──────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('cc-modal-styles')) return;
    var style = document.createElement('style');
    style.id = 'cc-modal-styles';
    style.textContent = [
      '#cipher-capture-overlay{position:fixed;inset:0;z-index:9999;background:rgba(8,9,10,0.88);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:1rem;opacity:0;pointer-events:none;transition:opacity 0.22s ease}',
      '#cipher-capture-overlay.visible{opacity:1;pointer-events:all}',
      '.cc-modal{background:#0e0f11;border:1px solid #2e353d;border-top:2px solid #e8952a;width:100%;max-width:480px;padding:2.5rem 2.25rem 2rem;position:relative;transform:translateY(12px);transition:transform 0.22s ease;background-image:linear-gradient(rgba(46,53,61,0.18) 1px,transparent 1px),linear-gradient(90deg,rgba(46,53,61,0.18) 1px,transparent 1px);background-size:48px 48px}',
      '#cipher-capture-overlay.visible .cc-modal{transform:translateY(0)}',
      '.cc-modal::before,.cc-modal::after{content:"";position:absolute;width:6px;height:6px;background:#2e353d;border-radius:50%;bottom:12px}',
      '.cc-modal::before{left:12px}.cc-modal::after{right:12px}',
      '.cc-modal-glow{position:absolute;top:-1px;left:50%;transform:translateX(-50%);width:180px;height:1px;box-shadow:0 0 28px 8px rgba(232,149,42,0.35);pointer-events:none}',
      '.cc-modal-eyebrow{font-family:"DM Mono",monospace;font-size:0.65rem;font-weight:500;letter-spacing:0.18em;text-transform:uppercase;color:#e8952a;margin:0 0 0.5rem}',
      '.cc-modal-headline{font-family:"Bebas Neue",sans-serif;font-size:2.6rem;line-height:1;letter-spacing:0.04em;color:#edeae4;margin:0 0 0.75rem}',
      '.cc-modal-subline{font-family:"Barlow",sans-serif;font-size:0.875rem;line-height:1.6;color:#6b7480;margin:0 0 1.75rem}',
      '.cc-input-wrap{position:relative;margin-bottom:0.75rem}',
      '.cc-input-label{display:block;font-family:"DM Mono",monospace;font-size:0.6rem;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#6b7480;margin-bottom:0.4rem}',
      '#cc-email-input{width:100%;background:#161a1d;border:1px solid #2e353d;border-radius:0;padding:0.75rem 1rem;font-family:"Barlow",sans-serif;font-size:0.9rem;color:#edeae4;outline:none;transition:border-color 0.15s;box-sizing:border-box;-webkit-appearance:none}',
      '#cc-email-input::placeholder{color:#3a4149}',
      '#cc-email-input:focus{border-color:#e8952a}',
      '#cc-email-input.error{border-color:#c0392b}',
      '.cc-input-error{font-family:"DM Mono",monospace;font-size:0.65rem;color:#c0392b;letter-spacing:0.08em;margin-top:0.3rem;min-height:1em}',
      '#cc-submit-btn{width:100%;background:#e8952a;color:#0e0f11;border:none;border-radius:0;padding:0.85rem 1.5rem;font-family:"DM Mono",monospace;font-size:0.75rem;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;cursor:pointer;margin-bottom:0.75rem;transition:background 0.15s,transform 0.1s;position:relative;overflow:hidden}',
      '#cc-submit-btn:hover:not(:disabled){background:#f0a03a}',
      '#cc-submit-btn:active:not(:disabled){transform:scale(0.99)}',
      '#cc-submit-btn:disabled{opacity:0.55;cursor:not-allowed}',
      '#cc-submit-btn .cc-spinner{display:none;width:14px;height:14px;border:2px solid rgba(14,15,17,0.3);border-top-color:#0e0f11;border-radius:50%;animation:cc-spin 0.6s linear infinite;margin:0 auto}',
      '#cc-submit-btn.loading .cc-btn-text{display:none}#cc-submit-btn.loading .cc-spinner{display:block}',
      '@keyframes cc-spin{to{transform:rotate(360deg)}}',
      '.cc-skip-wrap{text-align:center;margin-top:0.25rem}',
      '#cc-skip-link{font-family:"DM Mono",monospace;font-size:0.65rem;letter-spacing:0.12em;text-transform:uppercase;color:#3a4149;text-decoration:none;cursor:pointer;border:none;background:none;padding:0;transition:color 0.15s}',
      '#cc-skip-link:hover{color:#6b7480}',
      '.cc-success{display:none;text-align:center;padding:1rem 0 0.5rem}',
      '.cc-success-icon{font-size:1.8rem;margin-bottom:0.75rem;display:block}',
      '.cc-success-headline{font-family:"Bebas Neue",sans-serif;font-size:2rem;letter-spacing:0.04em;color:#edeae4;margin:0 0 0.5rem}',
      '.cc-success-sub{font-family:"Barlow",sans-serif;font-size:0.85rem;color:#6b7480;margin:0 0 1.5rem;line-height:1.5}',
      '#cc-proceed-btn{display:inline-block;background:#e8952a;color:#0e0f11;border:none;border-radius:0;padding:0.75rem 2rem;font-family:"DM Mono",monospace;font-size:0.7rem;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;cursor:pointer;transition:background 0.15s}',
      '#cc-proceed-btn:hover{background:#f0a03a}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function injectHTML() {
    if (document.getElementById('cipher-capture-overlay')) return;
    var div = document.createElement('div');
    div.innerHTML = '<div id="cipher-capture-overlay" role="dialog" aria-modal="true" aria-label="Email capture">'
      + '<div class="cc-modal"><div class="cc-modal-glow"></div>'
      + '<div id="cc-form-state">'
      + '<p class="cc-modal-eyebrow">Claim Cipher</p>'
      + '<h2 class="cc-modal-headline">See It In Action</h2>'
      + '<p class="cc-modal-subline">Drop your email and we\'ll keep you updated as new features ship. No spam. Unsubscribe anytime.</p>'
      + '<div class="cc-input-wrap">'
      + '<label class="cc-input-label" for="cc-email-input">Email address</label>'
      + '<input type="email" id="cc-email-input" placeholder="you@example.com" autocomplete="email" inputmode="email">'
      + '<p class="cc-input-error" id="cc-input-error" aria-live="polite"></p>'
      + '</div>'
      + '<button id="cc-submit-btn" type="button"><span class="cc-btn-text">Take Me To The Demo</span><span class="cc-spinner"></span></button>'
      + '<div class="cc-skip-wrap"><button id="cc-skip-link" type="button">Skip \u2014 just show me the demo</button></div>'
      + '</div>'
      + '<div class="cc-success" id="cc-success-state">'
      + '<span class="cc-success-icon">\u25C8</span>'
      + '<h2 class="cc-success-headline">You\'re In</h2>'
      + '<p class="cc-success-sub">We\'ll send you a heads-up when new features drop.<br>Now let\'s get to the demo.</p>'
      + '<button id="cc-proceed-btn" type="button">Enter Demo</button>'
      + '</div></div></div>';
    document.body.appendChild(div.firstChild);
  }

  // ── Show / wire / hide ─────────────────────────────────
  var _onComplete = null;
  var _location   = 'login';
  var _wired = false;

  function show(onComplete, location) {
    injectStyles();
    injectHTML();

    _onComplete = onComplete || function () {};
    _location   = location || 'login';

    var overlay      = document.getElementById('cipher-capture-overlay');
    var emailInput   = document.getElementById('cc-email-input');
    var submitBtn    = document.getElementById('cc-submit-btn');
    var skipLink     = document.getElementById('cc-skip-link');
    var formState    = document.getElementById('cc-form-state');
    var successState = document.getElementById('cc-success-state');
    var proceedBtn   = document.getElementById('cc-proceed-btn');
    var errorEl      = document.getElementById('cc-input-error');

    // Reset to form state
    formState.style.display = '';
    successState.style.display = 'none';
    if (emailInput) { emailInput.value = ''; emailInput.classList.remove('error'); }
    if (errorEl) errorEl.textContent = '';

    overlay.classList.add('visible');
    track('email_capture_shown', { location: _location });
    setTimeout(function () { if (emailInput) emailInput.focus(); }, 250);

    if (_wired) return;
    _wired = true;

    function hideModal() {
      overlay.classList.remove('visible');
    }

    function finish() {
      hideModal();
      if (_onComplete) _onComplete();
    }

    async function handleSubmit() {
      var email = emailInput.value.trim();
      if (!isValidEmail(email)) {
        emailInput.classList.add('error');
        errorEl.textContent = 'Enter a valid email address';
        emailInput.focus();
        return;
      }
      emailInput.classList.remove('error');
      errorEl.textContent = '';
      submitBtn.disabled = true;
      submitBtn.classList.add('loading');

      try {
        var res = await fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email }),
        });
        if (!res.ok) console.warn('[CipherCapture] Subscribe failed:', res.status);
      } catch (err) {
        console.warn('[CipherCapture] Subscribe error:', err);
      }

      markSubmitted();
      track('email_capture_submitted', { location: _location });
      formState.style.display = 'none';
      successState.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
    }

    function handleSkip() {
      markSkipped(_location);
      track('email_capture_skipped', { location: _location });
      finish();
    }

    function handleProceed() {
      finish();
    }

    submitBtn.addEventListener('click', handleSubmit);
    skipLink.addEventListener('click', handleSkip);
    proceedBtn.addEventListener('click', handleProceed);

    emailInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') handleSubmit();
    });
    emailInput.addEventListener('input', function () {
      emailInput.classList.remove('error');
      errorEl.textContent = '';
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('visible')) handleSkip();
    });
  }

  // ── Public API ─────────────────────────────────────────
  window.CipherCapture = {
    show: show,
    shouldShow: shouldShow
  };
})();
