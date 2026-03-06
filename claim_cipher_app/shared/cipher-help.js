/**
 * Echo — Claim Cipher Help Assistant
 * Chat-style keyword assistant with typing indicator and suggestion buttons.
 */
(function () {
  var FALLBACK = "I\u2019m not sure about that one. Try asking about running a route, logging mileage, managing routes, processing a total loss estimate, or configuring your settings.";
  var SUGGESTIONS = [
    "How do I optimize a route?",
    "How do I log mileage?",
    "How do I export routes?",
    "How do I upload a CCC estimate?",
    "How do I add firms?"
  ];

  function findWorkflow(question) {
    var q = question.toLowerCase();
    var best = null, bestScore = 0;
    claimCipherWorkflows.forEach(function (wf) {
      var score = 0;
      wf.keywords.forEach(function (kw) { if (q.indexOf(kw) !== -1) score++; });
      if (score > bestScore) { bestScore = score; best = wf; }
    });
    return bestScore > 0 ? best : null;
  }

  // ── DOM helpers ──────────────────────────────────────────────────
  function el(tag, cls, html) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (html) d.innerHTML = html;
    return d;
  }

  function renderUserBubble(text) {
    var wrap = el('div', 'echo-msg echo-msg--user');
    var bubble = el('div', 'echo-bubble-user', '');
    bubble.textContent = text;
    wrap.appendChild(bubble);
    return wrap;
  }

  function renderWorkflowCard(wf) {
    var card = el('div', 'echo-card');
    var h = '<div class="echo-card-title">\u25C8 ' + wf.title + '</div>';
    h += '<div class="echo-card-label">START AT: ' + wf.entry_point.toUpperCase() + '</div>';
    h += '<div class="echo-card-label" style="margin-top:8px">STEPS</div>';
    wf.steps.forEach(function (s) {
      h += '<div class="echo-card-step"><span class="echo-bullet">\u2022</span>' + s + '</div>';
    });
    h += '<div class="echo-card-label" style="margin-top:8px">OUTPUT</div>';
    wf.outputs.forEach(function (o) {
      h += '<div class="echo-card-output"><span class="echo-arrow">\u2192</span>' + o + '</div>';
    });
    card.innerHTML = h;
    return card;
  }

  function renderFallback(text) {
    var d = el('div', 'echo-fallback', '');
    d.textContent = text;
    return d;
  }

  function renderTyping() {
    var d = el('div', 'echo-typing');
    d.innerHTML = '<span></span><span></span><span></span>';
    return d;
  }

  // ── Widget logic ─────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    var toggle  = document.getElementById('echo-toggle');
    var panel   = document.getElementById('echo-panel');
    var close   = document.getElementById('echo-close');
    var input   = document.getElementById('echo-input');
    var submit  = document.getElementById('echo-submit');
    var chat    = document.getElementById('echo-chat');
    var welcome = document.getElementById('echo-welcome');
    var sugBox  = document.getElementById('echo-suggestions');
    if (!toggle || !panel) return;

    var hasMessages = false;

    function scrollBottom() {
      if (chat) chat.scrollTop = chat.scrollHeight;
    }

    function hideWelcome() {
      if (!hasMessages && welcome) {
        welcome.style.display = 'none';
        hasMessages = true;
      }
    }

    function ask(question) {
      var q = question.trim();
      if (!q) return;
      hideWelcome();
      chat.appendChild(renderUserBubble(q));
      var dots = renderTyping();
      chat.appendChild(dots);
      scrollBottom();
      input.value = '';

      setTimeout(function () {
        dots.remove();
        var wf = findWorkflow(q);
        chat.appendChild(wf ? renderWorkflowCard(wf) : renderFallback(FALLBACK));
        scrollBottom();
      }, 700);
    }

    // Toggle open/close
    toggle.addEventListener('click', function () {
      var isHidden = panel.classList.toggle('echo-hidden');
      toggle.classList.toggle('echo-toggle--open', !isHidden);
      if (!isHidden && input) input.focus();
    });
    close.addEventListener('click', function () {
      panel.classList.add('echo-hidden');
      toggle.classList.remove('echo-toggle--open');
    });

    // Submit
    submit.addEventListener('click', function () { ask(input.value); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') ask(input.value); });

    // Suggestion buttons
    if (sugBox) {
      SUGGESTIONS.forEach(function (s) {
        var btn = el('button', 'echo-suggestion', '');
        btn.textContent = '\u2192 ' + s;
        btn.addEventListener('click', function () { ask(s); });
        sugBox.appendChild(btn);
      });
    }
  });

  window.EchoHelp = { findWorkflow: findWorkflow };
})();
