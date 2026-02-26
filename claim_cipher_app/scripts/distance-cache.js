/**
 * 📏 DISTANCE CACHE - Authoritative Distance Storage
 *
 * Provides canonical, symmetric caching for Google Distance Matrix results.
 * Used to ensure billing calculations use authoritative data only.
 *
 * Key Features:
 * - Canonical key format (addresses sorted alphabetically)
 * - Source tracking (google_api, cache_google, user_manual)
 * - TTL enforcement (7 days default)
 * - Symmetric by default (A→B === B→A)
 */

(function() {
    'use strict';

    const CACHE_KEY = 'cc_distance_cache';
    const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

    // Valid sources for billing (heuristic is NOT included)
    const AUTHORITATIVE_SOURCES = ['google_api', 'cache_google', 'user_manual'];

    /**
     * Normalize an address for consistent key generation
     * @param {string} address
     * @returns {string}
     */
    function normalizeAddress(address) {
        if (!address || typeof address !== 'string') return '';
        return address
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ')      // Collapse whitespace
            .replace(/[.,#]/g, '');    // Remove common punctuation
    }

    /**
     * Generate a canonical cache key from two addresses.
     * Always sorts addresses to ensure A→B and B→A hit the same key.
     * @param {string} addressA
     * @param {string} addressB
     * @returns {string}
     */
    function getCanonicalKey(addressA, addressB) {
        const normA = normalizeAddress(addressA);
        const normB = normalizeAddress(addressB);

        // Sort alphabetically to ensure canonical ordering
        const sorted = [normA, normB].sort();
        return `${sorted[0]}|||${sorted[1]}`;
    }

    /**
     * Load the cache from localStorage
     * @returns {object}
     */
    function loadCache() {
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            console.warn('📏 DistanceCache: Failed to load cache, resetting', e);
            return {};
        }
    }

    /**
     * Save the cache to localStorage
     * @param {object} cache
     */
    function saveCache(cache) {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        } catch (e) {
            console.error('📏 DistanceCache: Failed to save cache', e);
        }
    }

    /**
     * Get a cached distance entry
     * Returns source as 'cache_google' to distinguish from fresh API calls.
     * @param {string} origin
     * @param {string} destination
     * @returns {object|null} { miles, source, timestamp, ttlMs, originalSource } or null if not found/expired
     */
    function get(origin, destination) {
        const cache = loadCache();
        const key = getCanonicalKey(origin, destination);
        const entry = cache[key];

        if (!entry) {
            return null;
        }

        // Check TTL expiration
        const ttl = entry.ttlMs || DEFAULT_TTL_MS;
        if (Date.now() - entry.timestamp > ttl) {
            // Expired - remove and return null
            delete cache[key];
            saveCache(cache);

            return null;
        }

        // Return with source normalized to 'cache_google' for audit trail
        // Preserve originalSource for transparency
        return {
            miles: entry.miles,
            source: entry.source === 'google_api' ? 'cache_google' : entry.source,
            originalSource: entry.source,
            timestamp: entry.timestamp,
            ttlMs: entry.ttlMs || DEFAULT_TTL_MS
        };
    }

    /**
     * Set a cached distance entry (symmetric - one canonical key)
     * @param {string} origin
     * @param {string} destination
     * @param {number} miles
     * @param {string} source - 'google_api' | 'user_manual'
     * @param {number} [ttlMs] - Optional TTL override
     */
    function set(origin, destination, miles, source, ttlMs = DEFAULT_TTL_MS) {
        if (typeof miles !== 'number' || isNaN(miles) || miles < 0) {
            console.warn('📏 DistanceCache: Invalid miles value', miles);
            return;
        }

        if (!AUTHORITATIVE_SOURCES.includes(source) && source !== 'cache_google') {
            console.warn('📏 DistanceCache: Invalid source for caching', source);
            return;
        }

        const cache = loadCache();
        const key = getCanonicalKey(origin, destination);

        cache[key] = {
            miles: miles,
            source: source,
            timestamp: Date.now(),
            ttlMs: ttlMs
        };

        saveCache(cache);

    }

    /**
     * Invalidate a cached entry
     * @param {string} origin
     * @param {string} destination
     */
    function invalidate(origin, destination) {
        const cache = loadCache();
        const key = getCanonicalKey(origin, destination);

        if (cache[key]) {
            delete cache[key];
            saveCache(cache);

        }
    }

    /**
     * Clear all cached entries
     */
    function clearAll() {
        localStorage.removeItem(CACHE_KEY);

    }

    /**
     * Get cache statistics
     * @returns {object} { totalEntries, oldestEntry, newestEntry }
     */
    function getStats() {
        const cache = loadCache();
        const entries = Object.values(cache);

        if (entries.length === 0) {
            return { totalEntries: 0, oldestEntry: null, newestEntry: null };
        }

        const timestamps = entries.map(e => e.timestamp);
        return {
            totalEntries: entries.length,
            oldestEntry: new Date(Math.min(...timestamps)),
            newestEntry: new Date(Math.max(...timestamps))
        };
    }

    /**
     * Check if a distance source is authoritative (valid for billing)
     * @param {string} source
     * @returns {boolean}
     */
    function isAuthoritativeSource(source) {
        return AUTHORITATIVE_SOURCES.includes(source);
    }

    /**
     * Validate that a distance value is suitable for billing
     * @param {number} miles
     * @param {string} source
     * @returns {{ valid: boolean, reason?: string }}
     */
    function validateForBilling(miles, source) {
        if (typeof miles !== 'number' || isNaN(miles)) {
            return { valid: false, reason: 'Distance must be a valid number' };
        }

        if (miles < 0) {
            return { valid: false, reason: 'Distance cannot be negative' };
        }

        if (miles > 500) {
            return { valid: false, reason: 'Distance exceeds 500-mile sanity limit. Please verify.' };
        }

        if (!source) {
            return { valid: false, reason: 'Distance source is unknown' };
        }

        if (!isAuthoritativeSource(source)) {
            return {
                valid: false,
                reason: `Estimated distances cannot be used for billing. Source: ${source}`
            };
        }

        return { valid: true };
    }

    // Export to window
    window.DistanceCache = {
        get,
        set,
        invalidate,
        clearAll,
        getStats,
        getCanonicalKey,
        isAuthoritativeSource,
        validateForBilling,
        AUTHORITATIVE_SOURCES,
        DEFAULT_TTL_MS
    };


})();
