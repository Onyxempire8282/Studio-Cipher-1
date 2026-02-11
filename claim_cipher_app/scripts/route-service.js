/**
 * Route Service for Claim Cipher
 * Handles CRUD operations for routes and mileage_logs tables
 *
 * Route Lifecycle: draft -> active -> closed
 * Mileage logs are immutable tax records created on route closure
 */

(function() {
    'use strict';

    /**
     * Get the Supabase client instance
     * @returns {object|null} Supabase client or null if not configured
     */
    function getSupabaseClient() {
        if (window.SupabaseAuth && typeof window.SupabaseAuth.init === 'function') {
            return window.SupabaseAuth.init();
        }
        // Fallback to direct initialization
        const config = window.SUPABASE_CONFIG;
        if (!config || !config.url) {
            console.error('RouteService: Supabase not configured');
            return null;
        }
        return supabase.createClient(config.url, config.anonKey);
    }

    /**
     * Get the current authenticated user's ID
     * @returns {Promise<string|null>} User UUID or null
     */
    async function getUserId() {
        const client = getSupabaseClient();
        if (!client) return null;

        try {
            const { data: { user }, error } = await client.auth.getUser();
            if (error || !user) {
                console.warn('RouteService: No authenticated user');
                return null;
            }
            return user.id;
        } catch (err) {
            console.error('RouteService: Error getting user:', err);
            return null;
        }
    }

    /**
     * Show notification to user (uses global notification system if available)
     * @param {string} message
     * @param {string} type - 'success', 'error', 'warning', 'info'
     */
    function notify(message, type = 'info') {
        if (window.showCipherNotification) {
            window.showCipherNotification(message, type);
        } else {
            console.log(`RouteService [${type}]: ${message}`);
        }
    }

    // ========================================
    // ROUTE CRUD OPERATIONS
    // ========================================

    /**
     * Save a new route or update an existing draft route
     * @param {object} routeData - { date, start_address, end_address, total_miles }
     * @param {string|null} existingRouteId - UUID if updating, null for new
     * @returns {Promise<{success: boolean, data?: object, error?: string}>}
     */
    async function saveRoute(routeData, existingRouteId = null) {
        const client = getSupabaseClient();
        const userId = await getUserId();

        if (!client) {
            return { success: false, error: 'Supabase not configured' };
        }
        if (!userId) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            if (existingRouteId) {
                // Update existing draft route
                const { data, error } = await client
                    .from('routes')
                    .update({
                        date: routeData.date,
                        start_address: routeData.start_address,
                        end_address: routeData.end_address,
                        total_miles: routeData.total_miles
                    })
                    .eq('id', existingRouteId)
                    .eq('user_id', userId)
                    .eq('status', 'draft')
                    .select()
                    .single();

                if (error) throw error;
                if (!data) throw new Error('Route not found or not in draft status');
                return { success: true, data };
            } else {
                // Create new route in draft status
                const { data, error } = await client
                    .from('routes')
                    .insert({
                        user_id: userId,
                        date: routeData.date,
                        status: 'draft',
                        start_address: routeData.start_address,
                        end_address: routeData.end_address,
                        total_miles: routeData.total_miles
                    })
                    .select()
                    .single();

                if (error) throw error;
                return { success: true, data };
            }
        } catch (error) {
            console.error('RouteService.saveRoute error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update an existing route (draft or active) with new route data.
     * Used by the Edit Route flow from My Routes.
     * @param {string} routeId - UUID of the route to update
     * @param {object} routeData - { date, start_address, end_address, total_miles }
     * @returns {Promise<{success: boolean, data?: object, error?: string}>}
     */
    async function updateRoute(routeId, routeData) {
        const client = getSupabaseClient();
        const userId = await getUserId();

        if (!client) {
            return { success: false, error: 'Supabase not configured' };
        }
        if (!userId) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            const { data, error } = await client
                .from('routes')
                .update({
                    date: routeData.date,
                    start_address: routeData.start_address,
                    end_address: routeData.end_address,
                    total_miles: routeData.total_miles
                })
                .eq('id', routeId)
                .eq('user_id', userId)
                .in('status', ['draft', 'active'])
                .select()
                .single();

            if (error) throw error;
            if (!data) throw new Error('Route not found or is closed');
            return { success: true, data };
        } catch (error) {
            console.error('RouteService.updateRoute error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Activate a draft route (draft -> active)
     * @param {string} routeId - UUID
     * @returns {Promise<{success: boolean, data?: object, error?: string}>}
     */
    async function activateRoute(routeId) {
        const client = getSupabaseClient();
        const userId = await getUserId();

        if (!client) {
            return { success: false, error: 'Supabase not configured' };
        }
        if (!userId) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            const { data, error } = await client
                .from('routes')
                .update({ status: 'active' })
                .eq('id', routeId)
                .eq('user_id', userId)
                .eq('status', 'draft')
                .select()
                .single();

            if (error) throw error;
            if (!data) throw new Error('Route not found or not in draft status');
            return { success: true, data };
        } catch (error) {
            console.error('RouteService.activateRoute error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Close an active route and create immutable mileage log
     * @param {string} routeId - UUID
     * @param {object} claimInfo - { claim_count, claim_ids } (optional)
     * @returns {Promise<{success: boolean, data?: object, error?: string}>}
     */
    async function closeRoute(routeId, claimInfo = {}) {
        const client = getSupabaseClient();
        const userId = await getUserId();

        if (!client) {
            return { success: false, error: 'Supabase not configured' };
        }
        if (!userId) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            // 1. Fetch the route (must be active)
            const { data: route, error: fetchError } = await client
                .from('routes')
                .select('*')
                .eq('id', routeId)
                .eq('user_id', userId)
                .single();

            if (fetchError) throw fetchError;
            if (!route) throw new Error('Route not found');
            if (route.status === 'closed') throw new Error('Route is already closed');
            if (route.status !== 'active') throw new Error('Route must be active to close');
            if (route.total_miles === null || route.total_miles === undefined) {
                throw new Error('Cannot close route without total miles');
            }
            if (route.total_miles <= 0) {
                throw new Error('Cannot close route with zero or negative mileage');
            }

            // 2. Check for existing mileage_log (UNIQUE constraint backup)
            const { data: existingLog } = await client
                .from('mileage_logs')
                .select('id')
                .eq('route_id', routeId)
                .maybeSingle();

            if (existingLog) throw new Error('Mileage log already exists for this route');

            // 3. Create mileage_log snapshot
            const { data: mileageLog, error: logError } = await client
                .from('mileage_logs')
                .insert({
                    route_id: routeId,
                    user_id: userId,
                    log_date: route.date,
                    start_address: route.start_address,
                    end_address: route.end_address,
                    total_miles: route.total_miles,
                    claim_count: claimInfo.claim_count
                        || (claimInfo.claim_ids && claimInfo.claim_ids.length)
                        || 1,
                    claim_ids: claimInfo.claim_ids || []
                })
                .select()
                .single();

            if (logError) throw logError;

            // 4. Update route status to closed
            const { data: closedRoute, error: updateError } = await client
                .from('routes')
                .update({ status: 'closed' })
                .eq('id', routeId)
                .select()
                .single();

            if (updateError) throw updateError;

            return {
                success: true,
                data: {
                    route: closedRoute,
                    mileageLog
                }
            };
        } catch (error) {
            console.error('RouteService.closeRoute error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Reopen a closed route (for corrections - deletes mileage log, sets status to active)
     * NOTE: Pre-RLS only. Post-RLS requires admin/service role.
     * @param {string} routeId - UUID
     * @returns {Promise<{success: boolean, data?: object, error?: string}>}
     */
    async function reopenRoute(routeId) {
        const client = getSupabaseClient();
        const userId = await getUserId();

        if (!client) {
            return { success: false, error: 'Supabase not configured' };
        }
        if (!userId) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            // Fetch the route
            const { data: route, error: fetchError } = await client
                .from('routes')
                .select('*')
                .eq('id', routeId)
                .eq('user_id', userId)
                .single();

            if (fetchError) throw fetchError;
            if (!route) throw new Error('Route not found');
            if (route.status !== 'closed') throw new Error('Route is not closed');

            // This will fail due to RLS policy blocking DELETE on mileage_logs
            // In production, this would require admin/service role
            const { error: deleteError } = await client
                .from('mileage_logs')
                .delete()
                .eq('route_id', routeId);

            if (deleteError) {
                throw new Error('Cannot reopen route: mileage log is immutable. Contact admin.');
            }

            // Update route status back to active
            const { data: reopenedRoute, error: updateError } = await client
                .from('routes')
                .update({ status: 'active' })
                .eq('id', routeId)
                .select()
                .single();

            if (updateError) throw updateError;

            return { success: true, data: reopenedRoute };
        } catch (error) {
            console.error('RouteService.reopenRoute error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * List routes for current user with optional filters
     * @param {object} filters - { status, dateFrom, dateTo }
     * @returns {Promise<{success: boolean, data?: array, error?: string}>}
     */
    async function listRoutes(filters = {}) {
        const client = getSupabaseClient();
        const userId = await getUserId();

        if (!client) {
            return { success: false, error: 'Supabase not configured' };
        }
        if (!userId) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            let query = client
                .from('routes')
                .select('*')
                .eq('user_id', userId)
                .order('date', { ascending: false });

            if (filters.status) {
                query = query.eq('status', filters.status);
            }
            if (filters.dateFrom) {
                query = query.gte('date', filters.dateFrom);
            }
            if (filters.dateTo) {
                query = query.lte('date', filters.dateTo);
            }

            const { data, error } = await query;
            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('RouteService.listRoutes error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get a single route by ID
     * @param {string} routeId - UUID
     * @returns {Promise<{success: boolean, data?: object, error?: string}>}
     */
    async function getRoute(routeId) {
        const client = getSupabaseClient();
        const userId = await getUserId();

        if (!client) {
            return { success: false, error: 'Supabase not configured' };
        }
        if (!userId) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            const { data, error } = await client
                .from('routes')
                .select('*')
                .eq('id', routeId)
                .eq('user_id', userId)
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('RouteService.getRoute error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete a draft route
     * @param {string} routeId - UUID
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async function deleteRoute(routeId) {
        const client = getSupabaseClient();
        const userId = await getUserId();

        if (!client) {
            return { success: false, error: 'Supabase not configured' };
        }
        if (!userId) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            // RLS policy only allows deleting drafts
            const { error } = await client
                .from('routes')
                .delete()
                .eq('id', routeId)
                .eq('user_id', userId)
                .eq('status', 'draft');

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('RouteService.deleteRoute error:', error);
            return { success: false, error: error.message };
        }
    }

    // ========================================
    // MILEAGE LOG OPERATIONS
    // ========================================

    /**
     * Query mileage logs for CSV export
     * @param {string} dateFrom - YYYY-MM-DD
     * @param {string} dateTo - YYYY-MM-DD
     * @returns {Promise<{success: boolean, data?: array, error?: string}>}
     */
    async function getMileageLogs(dateFrom, dateTo) {
        const client = getSupabaseClient();
        const userId = await getUserId();

        if (!client) {
            return { success: false, error: 'Supabase not configured' };
        }
        if (!userId) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            const { data, error } = await client
                .from('mileage_logs')
                .select('*')
                .eq('user_id', userId)
                .is('voided_at', null)
                .gte('log_date', dateFrom)
                .lte('log_date', dateTo)
                .order('log_date', { ascending: true });

            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('RouteService.getMileageLogs error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get mileage log for a specific route
     * @param {string} routeId - UUID
     * @returns {Promise<{success: boolean, data?: object, error?: string}>}
     */
    async function getMileageLogForRoute(routeId) {
        const client = getSupabaseClient();
        const userId = await getUserId();

        if (!client) {
            return { success: false, error: 'Supabase not configured' };
        }
        if (!userId) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            const { data, error } = await client
                .from('mileage_logs')
                .select('*')
                .eq('route_id', routeId)
                .eq('user_id', userId)
                .maybeSingle();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('RouteService.getMileageLogForRoute error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Batch-fetch mileage logs for a list of route IDs (includes voided)
     * Used to display void status on closed routes in My Routes
     * @param {string[]} routeIds - Array of route UUIDs
     * @returns {Promise<{success: boolean, data?: object[], error?: string}>}
     */
    async function getRouteMileageLogs(routeIds) {
        const client = getSupabaseClient();
        const userId = await getUserId();

        if (!client) {
            return { success: false, error: 'Supabase not configured' };
        }
        if (!userId) {
            return { success: false, error: 'Not authenticated' };
        }
        if (!routeIds || routeIds.length === 0) {
            return { success: true, data: [] };
        }

        try {
            const { data, error } = await client
                .from('mileage_logs')
                .select('id, route_id, voided_at')
                .in('route_id', routeIds)
                .eq('user_id', userId);

            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('RouteService.getRouteMileageLogs error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Void a mileage log (soft-delete for audit trail)
     * Sets voided_at timestamp — log is excluded from exports and totals
     * @param {string} logId - Mileage log UUID
     * @returns {Promise<{success: boolean, data?: object, error?: string}>}
     */
    async function voidMileageLog(logId) {
        const client = getSupabaseClient();
        const userId = await getUserId();

        if (!client) {
            return { success: false, error: 'Supabase not configured' };
        }
        if (!userId) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            const { data, error } = await client
                .from('mileage_logs')
                .update({ voided_at: new Date().toISOString() })
                .eq('id', logId)
                .eq('user_id', userId)
                .is('voided_at', null)
                .select();

            if (error) throw error;
            if (data.length === 0) {
                return { success: false, error: 'Log already voided or not found.' };
            }

            console.log('Mileage log voided:', logId);
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('RouteService.voidMileageLog error:', error);
            return { success: false, error: error.message };
        }
    }

    // ========================================
    // DASHBOARD STATS (READ-ONLY METRICS)
    // ========================================

    /**
     * Get dashboard statistics for Command Center
     * Routes Calculated: Count of routes created (usage metric)
     * Miles Counted: Sum from mileage_logs ONLY (accountant-safe, tax-ready)
     * @returns {Promise<{success: boolean, data?: {routes: number, miles: number}, error?: string}>}
     */
    async function getDashboardStats() {
        const client = getSupabaseClient();
        const userId = await getUserId();

        if (!client) {
            return { success: false, error: 'Supabase not configured' };
        }
        if (!userId) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            // Routes Calculated: Count of all routes (usage/engagement metric)
            const { count: routesCount, error: routesError } = await client
                .from('routes')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);

            if (routesError) throw routesError;

            // Miles Counted: ONLY from non-voided mileage_logs (authoritative, tax-ready)
            // This matches CSV export totals exactly
            const { data: milesData, error: milesError } = await client
                .from('mileage_logs')
                .select('total_miles')
                .eq('user_id', userId)
                .is('voided_at', null);

            if (milesError) throw milesError;

            // Sum total miles from mileage_logs
            const totalMiles = (milesData || []).reduce((sum, log) => {
                return sum + (parseFloat(log.total_miles) || 0);
            }, 0);

            return {
                success: true,
                data: {
                    routes: routesCount || 0,
                    miles: Math.round(totalMiles * 10) / 10 // One decimal place
                }
            };
        } catch (error) {
            console.error('RouteService.getDashboardStats error:', error);
            return { success: false, error: error.message };
        }
    }

    // ========================================
    // EXPOSE PUBLIC API
    // ========================================

    window.RouteService = {
        // Route operations
        saveRoute,
        updateRoute,
        activateRoute,
        closeRoute,
        reopenRoute,
        listRoutes,
        getRoute,
        deleteRoute,

        // Mileage log operations
        getMileageLogs,
        getMileageLogForRoute,
        getRouteMileageLogs,
        voidMileageLog,

        // Dashboard stats (read-only)
        getDashboardStats
    };

    console.log('RouteService initialized');
})();
