/**
 * SessionManager - Multi-route session manager
 * Manages active sessions, session history, and a route registry.
 *
 * Keys:
 *   cipher_active_session   - current workspace metadata
 *   cipher_session_history   - list of past sessions (max 20)
 *   cipher_route_registry    - append-only map of all saved routes
 *
 * The optimizer draft (cipher_optimizer_draft_state) is NOT managed here.
 */
(function () {
  const KEYS = {
    active: 'cipher_active_session',
    history: 'cipher_session_history',
    registry: 'cipher_route_registry'
  };

  const DEMO_PREFIX = 'demo_';
  const MAX_HISTORY = 20;

  let _migrated = false;

  function _isDemoMode() {
    return sessionStorage.getItem('demo_mode') === 'true';
  }

  function _k(base) {
    return _isDemoMode() ? DEMO_PREFIX + base : base;
  }

  function _read(baseKey) {
    try {
      const raw = localStorage.getItem(_k(baseKey));
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('SessionManager: read error for', baseKey, e);
      return null;
    }
  }

  function _write(baseKey, value) {
    try {
      localStorage.setItem(_k(baseKey), JSON.stringify(value));
    } catch (e) {
      console.error('SessionManager: write error for', baseKey, e);
    }
  }

  function _generateId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  }

  function _generateRouteId() {
    return 'route_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  }

  /**
   * One-time migration from old keys.
   * cipher_last_route -> cipher_optimizer_draft_state
   * cipher_routes_by_day -> session + registry entries
   */
  function _migrate() {
    if (_migrated || _isDemoMode()) return;
    _migrated = true;

    // Skip if we already have session data
    if (localStorage.getItem(KEYS.active) || localStorage.getItem(KEYS.history)) return;

    try {
      // Migrate cipher_last_route -> cipher_optimizer_draft_state
      const lastRoute = localStorage.getItem('cipher_last_route');
      if (lastRoute && !localStorage.getItem('cipher_optimizer_draft_state')) {
        localStorage.setItem('cipher_optimizer_draft_state', lastRoute);
        console.log('SessionManager: Migrated cipher_last_route -> cipher_optimizer_draft_state');
      }

      // Migrate cipher_routes_by_day -> session + registry
      const routesByDay = localStorage.getItem('cipher_routes_by_day');
      if (routesByDay) {
        const days = JSON.parse(routesByDay);
        const dayKeys = Object.keys(days);

        if (dayKeys.length > 0) {
          // Create a legacy session
          const sessionId = _generateId();
          const session = {
            id: sessionId,
            name: 'Migrated Session',
            createdAt: Date.now(),
            routeIds: []
          };

          const registry = {};

          dayKeys.forEach(dayName => {
            const dayData = days[dayName];
            const routeId = _generateRouteId();
            session.routeIds.push(routeId);

            registry[routeId] = {
              id: routeId,
              sessionId: sessionId,
              dayName: dayName,
              data: dayData,
              savedAt: dayData.savedAt || Date.now()
            };
          });

          // Write to new keys
          _write(KEYS.history, [{ id: session.id, name: session.name, createdAt: session.createdAt, routeCount: session.routeIds.length }]);
          _write(KEYS.registry, registry);

          console.log('SessionManager: Migrated', dayKeys.length, 'day routes into session', sessionId);
        }
      }

      // Clean up old keys
      localStorage.removeItem('cipher_last_route');
      localStorage.removeItem('cipher_routes_by_day');

    } catch (error) {
      console.error('SessionManager: Migration error:', error);
    }
  }

  window.SessionManager = {
    /**
     * Create a new active session.
     * @param {string} [name] - optional name, defaults to date-based name
     * @returns {Object} session
     */
    createSession(name) {
      _migrate();
      const session = {
        id: _generateId(),
        name: name || ('Session ' + new Date().toLocaleDateString()),
        createdAt: Date.now(),
        routeIds: []
      };
      _write(KEYS.active, session);
      return session;
    },

    /**
     * Get the current active session, or null.
     * @returns {Object|null}
     */
    getActiveSession() {
      _migrate();
      return _read(KEYS.active);
    },

    /**
     * Get session history (list of summaries).
     * @returns {Array}
     */
    getSessionHistory() {
      _migrate();
      return _read(KEYS.history) || [];
    },

    /**
     * Add a route to the active session. Creates a session if none exists.
     * @param {Object} routeData - route data to persist
     * @returns {string} routeId
     */
    addRouteToSession(routeData) {
      _migrate();

      // Ensure active session exists
      let session = _read(KEYS.active);
      if (!session) {
        session = this.createSession();
      }

      const routeId = _generateRouteId();
      const registry = _read(KEYS.registry) || {};

      registry[routeId] = {
        id: routeId,
        sessionId: session.id,
        data: routeData,
        savedAt: Date.now()
      };

      session.routeIds.push(routeId);

      _write(KEYS.active, session);
      _write(KEYS.registry, registry);

      console.log('SessionManager: Route', routeId, 'added to session', session.id);
      return routeId;
    },

    /**
     * Get all routes for a given session.
     * @param {string} sessionId
     * @returns {Array} route objects
     */
    getSessionRoutes(sessionId) {
      _migrate();
      const registry = _read(KEYS.registry) || {};
      return Object.values(registry).filter(r => r.sessionId === sessionId);
    },

    /**
     * Archive the active session to history and restore a past session.
     * @param {string} sessionId
     * @returns {Object} { session, routes }
     */
    restoreSession(sessionId) {
      _migrate();

      // Archive current active session first
      this._archiveActive();

      const history = _read(KEYS.history) || [];
      const summary = history.find(s => s.id === sessionId);
      if (!summary) return { session: null, routes: [] };

      const routes = this.getSessionRoutes(sessionId);

      // Reconstruct full session from summary + routes
      const session = {
        id: summary.id,
        name: summary.name,
        createdAt: summary.createdAt,
        routeIds: routes.map(r => r.id)
      };

      // Set as active
      _write(KEYS.active, session);

      // Remove from history (it's now active)
      const updated = history.filter(s => s.id !== sessionId);
      _write(KEYS.history, updated);

      return { session, routes };
    },

    /**
     * Clear active session, keep history.
     */
    startFresh() {
      _migrate();
      this._archiveActive();
      localStorage.removeItem(_k(KEYS.active));
    },

    /**
     * Delete a session and its routes from history and registry.
     * @param {string} sessionId
     */
    deleteSession(sessionId) {
      _migrate();

      // Remove from history
      const history = (_read(KEYS.history) || []).filter(s => s.id !== sessionId);
      _write(KEYS.history, history);

      // Remove routes from registry
      const registry = _read(KEYS.registry) || {};
      Object.keys(registry).forEach(routeId => {
        if (registry[routeId].sessionId === sessionId) {
          delete registry[routeId];
        }
      });
      _write(KEYS.registry, registry);

      // If active session matches, clear it
      const active = _read(KEYS.active);
      if (active && active.id === sessionId) {
        localStorage.removeItem(_k(KEYS.active));
      }
    },

    /**
     * Archive the active session to history (internal helper).
     */
    _archiveActive() {
      const active = _read(KEYS.active);
      if (!active || !active.id) return;

      const history = _read(KEYS.history) || [];

      // Don't duplicate
      if (history.some(s => s.id === active.id)) return;

      history.unshift({
        id: active.id,
        name: active.name,
        createdAt: active.createdAt,
        routeCount: (active.routeIds || []).length
      });

      // Trim to max
      while (history.length > MAX_HISTORY) {
        const removed = history.pop();
        // Also clean up its routes from registry
        const registry = _read(KEYS.registry) || {};
        Object.keys(registry).forEach(routeId => {
          if (registry[routeId].sessionId === removed.id) {
            delete registry[routeId];
          }
        });
        _write(KEYS.registry, registry);
      }

      _write(KEYS.history, history);
    },

    /**
     * Wipe all demo-prefixed SessionManager keys.
     */
    clearDemo() {
      Object.values(KEYS).forEach(base => {
        localStorage.removeItem(DEMO_PREFIX + base);
      });
      localStorage.removeItem('demo_cipher_optimizer_draft_state');
    }
  };

  console.log('SessionManager loaded');
})();
