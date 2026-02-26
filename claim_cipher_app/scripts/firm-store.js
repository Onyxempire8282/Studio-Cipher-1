/**
 * FirmStore — cloud-persisted firm storage.
 *
 * Source of truth: Supabase `user_firms` table, scoped by user_id.
 * Local cache:     localStorage `cipher_user_firms` — write-through, used for
 *                  synchronous reads (dropdowns, calculations) and offline fallback.
 *
 * After deploy, device change, or browser cache clear, firms are always
 * recovered from Supabase on the next getAll() call.
 */
(function () {
  const CACHE_KEY           = 'cipher_user_firms';
  const DEMO_CACHE_KEY      = 'demo_cipher_user_firms';
  const LAST_SELECTED_KEY   = 'cipher_last_selected_firm';
  const DEMO_LAST_SELECTED_KEY = 'demo_cipher_last_selected_firm';
  const OLD_SETTINGS_KEY    = 'mileage_cypher_settings_v2';

  // ── helpers ──────────────────────────────────────────────────────────────

  function _isDemoMode() {
    return sessionStorage.getItem('demo_mode') === 'true';
  }

  function _cacheKey() {
    return _isDemoMode() ? DEMO_CACHE_KEY : CACHE_KEY;
  }

  function _lastSelectedKey() {
    return _isDemoMode() ? DEMO_LAST_SELECTED_KEY : LAST_SELECTED_KEY;
  }

  // Returns the initialised Supabase client or null (demo / not configured).
  function _client() {
    if (_isDemoMode()) return null;
    return (window.SupabaseAuth && window.SupabaseAuth.getClient)
      ? window.SupabaseAuth.getClient()
      : (window._supabaseClient || null);
  }

  // Returns the authenticated user's UUID or null.
  async function _userId() {
    const c = _client();
    if (!c) return null;
    try {
      const { data } = await c.auth.getSession();
      return data?.session?.user?.id || null;
    } catch (_) {
      return null;
    }
  }

  // ── local cache (synchronous) ─────────────────────────────────────────────

  function _readCache() {
    try {
      const raw = localStorage.getItem(_cacheKey());
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  function _writeCache(firms) {
    try {
      localStorage.setItem(_cacheKey(), JSON.stringify(firms));
    } catch (_) { /* quota exceeded — silent */ }
  }

  // ── row shape converters ─────────────────────────────────────────────────

  // DB row → FirmStore object (camelCase)
  function _fromRow(row) {
    return {
      id:               row.firm_id,
      name:             row.name,
      freeMiles:        row.free_miles,
      ratePerMile:      parseFloat(row.rate_per_mile),
      roundTripDefault: row.round_trip_default,
    };
  }

  // FirmStore object → DB upsert payload (snake_case + user_id)
  function _toRow(firm, userId) {
    return {
      user_id:            userId,
      firm_id:            firm.id,
      name:               firm.name,
      free_miles:         firm.freeMiles        || 0,
      rate_per_mile:      firm.ratePerMile       || 0,
      round_trip_default: firm.roundTripDefault  || false,
    };
  }

  // ── one-time migration from legacy settings key ───────────────────────────

  let _migrated = false;

  function _migrateIfNeeded() {
    if (_migrated || _isDemoMode()) return;
    _migrated = true;

    if (localStorage.getItem(CACHE_KEY)) return; // already migrated

    try {
      const raw = localStorage.getItem(OLD_SETTINGS_KEY);
      if (!raw) return;
      const settings = JSON.parse(raw);
      if (!Array.isArray(settings.firms) || settings.firms.length === 0) return;

      localStorage.setItem(CACHE_KEY, JSON.stringify(settings.firms));
      if (settings.lastSelectedFirmId) {
        localStorage.setItem(LAST_SELECTED_KEY, settings.lastSelectedFirmId);
      }
      const { firms, lastSelectedFirmId, ...rest } = settings;
      localStorage.setItem(OLD_SETTINGS_KEY, JSON.stringify(rest));

    } catch (e) {
      console.error('FirmStore: migration error', e);
    }
  }

  // ── public API ────────────────────────────────────────────────────────────

  window.FirmStore = {

    /**
     * Fetch all firms for the current user.
     * Prefers Supabase; falls back to localStorage cache if offline or unauthenticated.
     * Updates the cache after a successful cloud fetch.
     * @returns {Promise<Array>}
     */
    async getAll() {
      _migrateIfNeeded();

      const uid = await _userId();
      const c   = _client();

      if (!uid || !c) {
        // Demo mode or unauthenticated — use cache only
        return _readCache();
      }

      try {
        const { data, error } = await c
          .from('user_firms')
          .select('*')
          .eq('user_id', uid)
          .order('created_at', { ascending: true });

        if (error) throw error;

        const firms = (data || []).map(_fromRow);
        _writeCache(firms);
        return firms;
      } catch (e) {
        console.warn('FirmStore.getAll: Supabase unavailable, using cache.', e.message);
        return _readCache();
      }
    },

    /**
     * Synchronous read from local cache only.
     * Use for rendering dropdowns without awaiting; call getAll() first to warm cache.
     * @returns {Array}
     */
    getAllSync() {
      _migrateIfNeeded();
      return _readCache();
    },

    /**
     * Get a firm by its slug id (synchronous, from cache).
     * @param {string} id
     * @returns {Object|null}
     */
    getById(id) {
      _migrateIfNeeded();
      return _readCache().find(f => f.id === id) || null;
    },

    /**
     * Add or update a firm.
     * Upserts to Supabase (matched on user_id + firm_id), updates cache.
     * @param {Object} firm — must have an `id` property (slug)
     * @returns {Promise<void>}
     */
    async save(firm) {
      _migrateIfNeeded();

      // Update cache immediately so UI stays responsive
      const firms = _readCache();
      const idx   = firms.findIndex(f => f.id === firm.id);
      if (idx !== -1) { firms[idx] = firm; } else { firms.push(firm); }
      _writeCache(firms);

      const uid = await _userId();
      const c   = _client();
      if (!uid || !c) return; // demo / offline — cache-only is fine

      try {
        const { error } = await c
          .from('user_firms')
          .upsert(_toRow(firm, uid), { onConflict: 'user_id,firm_id' });
        if (error) throw error;
      } catch (e) {
        console.error('FirmStore.save: Supabase write failed.', e.message);
        // Cache already updated — data survives until next cloud sync
      }
    },

    /**
     * Delete a firm by its slug id.
     * @param {string} firmId
     * @returns {Promise<void>}
     */
    async delete(firmId) {
      _migrateIfNeeded();

      // Remove from cache immediately
      const firms = _readCache().filter(f => f.id !== firmId);
      _writeCache(firms);

      const uid = await _userId();
      const c   = _client();
      if (!uid || !c) return;

      try {
        const { error } = await c
          .from('user_firms')
          .delete()
          .eq('user_id', uid)
          .eq('firm_id', firmId);
        if (error) throw error;
      } catch (e) {
        console.error('FirmStore.delete: Supabase delete failed.', e.message);
      }
    },

    /**
     * Get the last-selected firm id (synchronous).
     * @returns {string}
     */
    getLastSelected() {
      return localStorage.getItem(_lastSelectedKey()) || '';
    },

    /**
     * Set the last-selected firm id.
     * @param {string} id
     */
    setLastSelected(id) {
      localStorage.setItem(_lastSelectedKey(), id || '');
    },

    /**
     * Wipe demo-prefixed cache keys.
     * Called on demo exit.
     */
    clearDemo() {
      localStorage.removeItem(DEMO_CACHE_KEY);
      localStorage.removeItem(DEMO_LAST_SELECTED_KEY);
    },
  };


})();
