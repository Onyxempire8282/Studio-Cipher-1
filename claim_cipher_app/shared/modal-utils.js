/**
 * Shared modal utilities — replaces native alert() and confirm() dialogs.
 * Dark UI with amber/steel accents matching the Claim Cipher v2 design system.
 */
(function () {
  'use strict';

  var MODAL_ID = 'cc-shared-modal';

  function ensureModal() {
    var existing = document.getElementById(MODAL_ID);
    if (existing) return existing;

    var overlay = document.createElement('div');
    overlay.id = MODAL_ID;
    overlay.style.cssText =
      'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.75);' +
      'z-index:99999;align-items:center;justify-content:center;';

    overlay.innerHTML =
      '<div style="background:#1a1a1a;border:1px solid #c8922a;padding:32px;max-width:420px;width:90%;">' +
        '<p id="cc-modal-msg" style="color:#fff;font-family:\'DM Mono\',monospace;font-size:13px;line-height:1.6;margin:0 0 24px;letter-spacing:0.03em;white-space:pre-line;"></p>' +
        '<div id="cc-modal-btns" style="display:flex;gap:12px;justify-content:flex-end;"></div>' +
      '</div>';

    // Close on backdrop click
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) hideModal(null);
    });

    document.body.appendChild(overlay);
    return overlay;
  }

  // Internal state for the active callback
  var _onResult = null;

  function hideModal(result) {
    var overlay = document.getElementById(MODAL_ID);
    if (overlay) overlay.style.display = 'none';
    if (_onResult) {
      var cb = _onResult;
      _onResult = null;
      cb(result);
    }
  }

  function showModal(message, buttons, onResult) {
    var overlay = ensureModal();
    var msgEl = document.getElementById('cc-modal-msg');
    var btnsEl = document.getElementById('cc-modal-btns');

    msgEl.textContent = message;
    _onResult = onResult || null;

    // Build fresh buttons (avoids stale listeners)
    btnsEl.innerHTML = '';
    buttons.forEach(function (btn) {
      var el = document.createElement('button');
      el.textContent = btn.label;
      el.style.cssText = btn.primary
        ? 'background:#c8922a;color:#000;border:none;padding:10px 24px;cursor:pointer;font-family:\'DM Mono\',monospace;font-size:12px;font-weight:bold;letter-spacing:0.1em;text-transform:uppercase;'
        : 'background:transparent;color:#fff;border:1px solid #555;padding:10px 24px;cursor:pointer;font-family:\'DM Mono\',monospace;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;';
      el.addEventListener('click', function () { hideModal(btn.value); });
      btnsEl.appendChild(el);
    });

    overlay.style.display = 'flex';
  }

  /**
   * Alert replacement — single OK button.
   * @param {string} message
   * @param {function} [onClose] — called after OK is clicked
   */
  function showAlertModal(message, onClose) {
    showModal(message, [
      { label: 'OK', value: true, primary: true }
    ], function () {
      if (onClose) onClose();
    });
  }

  /**
   * Confirm replacement — CANCEL + OK buttons.
   * @param {string} message
   * @param {function} onConfirm — called when OK is clicked
   * @param {function} [onCancel] — called when Cancel is clicked or backdrop
   */
  function showConfirmModal(message, onConfirm, onCancel) {
    showModal(message, [
      { label: 'CANCEL', value: false, primary: false },
      { label: 'OK', value: true, primary: true }
    ], function (confirmed) {
      if (confirmed && onConfirm) onConfirm();
      else if (!confirmed && onCancel) onCancel();
    });
  }

  // Export globally
  window.showAlertModal = showAlertModal;
  window.showConfirmModal = showConfirmModal;
})();
