/**
 * FirmStore - Shared firm storage module
 * Reads/writes cipher_user_firms localStorage key.
 * Used by both Mileage Calculator and Route Optimizer.
 */
(function () {
  const STORAGE_KEY = 'cipher_user_firms';
  const DEMO_STORAGE_KEY = 'demo_cipher_user_firms';
  const LAST_SELECTED_KEY = 'cipher_last_selected_firm';
  const DEMO_LAST_SELECTED_KEY = 'demo_cipher_last_selected_firm';
  const OLD_SETTINGS_KEY = 'mileage_cypher_settings_v2';

  let _migrated = false;

  function _isDemoMode() {
    return sessionStorage.getItem('demo_mode') === 'true';
  }

  function _key() {
    return _isDemoMode() ? DEMO_STORAGE_KEY : STORAGE_KEY;
  }

  function _lastSelectedKey() {
    return _isDemoMode() ? DEMO_LAST_SELECTED_KEY : LAST_SELECTED_KEY;
  }

  /**
   * One-time migration: copy firms from mileage_cypher_settings_v2 to cipher_user_firms.
   * Only runs in non-demo mode.
   */
  function _migrate() {
    if (_migrated || _isDemoMode()) return;
    _migrated = true;

    // If cipher_user_firms already exists, nothing to do
    if (localStorage.getItem(STORAGE_KEY)) return;

    try {
      const raw = localStorage.getItem(OLD_SETTINGS_KEY);
      if (!raw) return;

      const settings = JSON.parse(raw);
      if (!Array.isArray(settings.firms) || settings.firms.length === 0) return;

      // Copy firms to new key
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.firms));

      // Copy last selected firm
      if (settings.lastSelectedFirmId) {
        localStorage.setItem(LAST_SELECTED_KEY, settings.lastSelectedFirmId);
      }

      // Remove firms and lastSelectedFirmId from old settings (rewrite without them)
      const { firms, lastSelectedFirmId, ...rest } = settings;
      localStorage.setItem(OLD_SETTINGS_KEY, JSON.stringify(rest));

      console.log('FirmStore: Migrated', settings.firms.length, 'firms from settings_v2');
    } catch (error) {
      console.error('FirmStore: Migration error:', error);
    }
  }

  function _read() {
    try {
      const raw = localStorage.getItem(_key());
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      console.error('FirmStore: Read error:', error);
      return [];
    }
  }

  function _write(firms) {
    try {
      localStorage.setItem(_key(), JSON.stringify(firms));
    } catch (error) {
      console.error('FirmStore: Write error:', error);
    }
  }

  window.FirmStore = {
    /**
     * Get all firms. Triggers migration on first call.
     * @returns {Array} firm objects
     */
    getAll() {
      _migrate();
      return _read();
    },

    /**
     * Get a firm by its id.
     * @param {string} id
     * @returns {Object|null}
     */
    getById(id) {
      _migrate();
      return _read().find(f => f.id === id) || null;
    },

    /**
     * Add or update a firm. If a firm with the same id exists, it is replaced.
     * @param {Object} firm - must have an `id` property
     */
    save(firm) {
      _migrate();
      const firms = _read();
      const idx = firms.findIndex(f => f.id === firm.id);
      if (idx !== -1) {
        firms[idx] = firm;
      } else {
        firms.push(firm);
      }
      _write(firms);
    },

    /**
     * Delete a firm by id.
     * @param {string} firmId
     */
    delete(firmId) {
      _migrate();
      const firms = _read().filter(f => f.id !== firmId);
      _write(firms);
    },

    /**
     * Get the last selected firm id.
     * @returns {string}
     */
    getLastSelected() {
      _migrate();
      return localStorage.getItem(_lastSelectedKey()) || '';
    },

    /**
     * Set the last selected firm id.
     * @param {string} id
     */
    setLastSelected(id) {
      localStorage.setItem(_lastSelectedKey(), id || '');
    },

    /**
     * Wipe all demo-prefixed FirmStore keys.
     * Called on demo exit.
     */
    clearDemo() {
      localStorage.removeItem(DEMO_STORAGE_KEY);
      localStorage.removeItem(DEMO_LAST_SELECTED_KEY);
    }
  };

  console.log('FirmStore loaded');
})();
