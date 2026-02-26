/**
 * Supabase Authentication System for Claim Cipher
 * Handles login, signup, session management, and protected page guards
 */

(function() {
    'use strict';

    // Initialize Supabase client
    let supabaseClient = null;

    // State tracking
    let isManualLogout = false;
    let wasAuthenticated = false;
    let authListenerInitialized = false;

    function initSupabase() {
        if (supabaseClient) return supabaseClient;

        const config = window.SUPABASE_CONFIG;
        if (!config || !config.url || !config.anonKey ||
            config.url.includes('placeholder') || config.anonKey.includes('placeholder')) {
            console.error('Supabase not configured: resolved URL or anon key is empty or a placeholder.');
            return null;
        }

        try {
            supabaseClient = supabase.createClient(config.url, config.anonKey);

            return supabaseClient;
        } catch (error) {
            console.error('Failed to initialize Supabase:', error);
            return null;
        }
    }

    /**
     * Sign in with email and password
     * @param {string} email
     * @param {string} password
     * @returns {Promise<{success: boolean, error?: string, user?: object}>}
     */
    async function signIn(email, password) {
        const client = initSupabase();
        if (!client) {
            return { success: false, error: 'Supabase not configured' };
        }

        try {
            const { data, error } = await client.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                console.error('Sign in error:', error.message);
                return { success: false, error: error.message };
            }

            // Clear old localStorage auth keys (cleanup)
            cleanupOldAuthKeys();

            // Mark as authenticated
            wasAuthenticated = true;


            return { success: true, user: data.user, session: data.session };
        } catch (error) {
            console.error('Sign in exception:', error);
            return { success: false, error: 'An unexpected error occurred' };
        }
    }

    /**
     * Sign up with email and password
     * @param {string} email
     * @param {string} password
     * @param {object} metadata - Optional user metadata (name, company, etc.)
     * @returns {Promise<{success: boolean, error?: string, user?: object}>}
     */
    async function signUp(email, password, metadata = {}) {
        const client = initSupabase();
        if (!client) {
            return { success: false, error: 'Supabase not configured' };
        }

        try {
            const { data, error } = await client.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: metadata
                }
            });

            if (error) {
                console.error('Sign up error:', error.message);
                return { success: false, error: error.message };
            }

            // Check if email confirmation is required
            if (data.user && !data.session) {
                return {
                    success: true,
                    user: data.user,
                    requiresConfirmation: true,
                    message: 'Please check your email to confirm your account'
                };
            }


            return { success: true, user: data.user, session: data.session };
        } catch (error) {
            console.error('Sign up exception:', error);
            return { success: false, error: 'An unexpected error occurred' };
        }
    }

    /**
     * Sign out the current user
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async function signOut() {
        // Mark as manual logout BEFORE calling signOut
        isManualLogout = true;

        const client = initSupabase();
        if (!client) {
            // Even if Supabase isn't configured, clean up localStorage and redirect
            cleanupOldAuthKeys();
            window.location.href = 'login-cypher.html';
            return { success: true };
        }

        try {
            const { error } = await client.auth.signOut();

            // Always clean up old localStorage keys
            cleanupOldAuthKeys();

            if (error) {
                console.error('Sign out error:', error.message);
            }


            window.location.href = 'login-cypher.html';
            return { success: !error };
        } catch (error) {
            console.error('Sign out exception:', error);
            cleanupOldAuthKeys();
            window.location.href = 'login-cypher.html';
            return { success: false, error: 'An unexpected error occurred' };
        }
    }

    /**
     * Get the current session (awaited, race-condition safe)
     * @returns {Promise<{session: object|null, user: object|null}>}
     */
    async function getSession() {
        const client = initSupabase();
        if (!client) {
            return { session: null, user: null };
        }

        try {
            const { data, error } = await client.auth.getSession();

            if (error) {
                console.error('Get session error:', error.message);
                return { session: null, user: null };
            }

            return {
                session: data.session,
                user: data.session?.user || null
            };
        } catch (error) {
            console.error('Get session exception:', error);
            return { session: null, user: null };
        }
    }

    /**
     * Check if user is authenticated
     * @returns {Promise<boolean>}
     */
    async function isAuthenticated() {
        const { session } = await getSession();
        return session !== null;
    }

    /**
     * Setup auth state change listener
     * Handles session invalidation (e.g., another device logging in)
     */
    function setupAuthStateListener() {
        if (authListenerInitialized) return;

        const client = initSupabase();
        if (!client) return;

        authListenerInitialized = true;

        client.auth.onAuthStateChange((event, session) => {


            if (event === 'SIGNED_OUT') {
                // Only show "another session" message if:
                // 1. User was previously authenticated on this page
                // 2. This is NOT a manual logout
                // 3. We're on a protected page
                if (wasAuthenticated && !isManualLogout) {
                    const currentPage = window.location.pathname.split('/').pop();
                    const protectedPages = [
                        'command-center.html',
                        'settings-booth.html',
                        'route-cypher.html',
                        'mileage-cypher.html',
                        'jobs-studio.html',
                        'firms-directory.html',
                        'total-loss-forms.html',
                        'functionality-test.html'
                    ];

                    if (protectedPages.includes(currentPage)) {
                        showSessionMessage('Another session is active. Please log out of the other session.');

                        // Redirect after showing message
                        setTimeout(() => {
                            cleanupOldAuthKeys();
                            window.location.href = 'login-cypher.html';
                        }, 2500);
                    }
                }

                // Reset state
                wasAuthenticated = false;
            }

            if (event === 'TOKEN_REFRESHED') {

            }

            if (event === 'SIGNED_IN') {

                wasAuthenticated = true;
                isManualLogout = false;
            }
        });
    }

    /**
     * Show a session message to the user
     * @param {string} message
     */
    function showSessionMessage(message) {
        // Remove existing message if any
        const existing = document.getElementById('supabase-session-message');
        if (existing) existing.remove();

        const messageDiv = document.createElement('div');
        messageDiv.id = 'supabase-session-message';
        messageDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: #fff;
            padding: 30px 40px;
            border-radius: 12px;
            z-index: 999999;
            text-align: center;
            font-size: 18px;
            border: 2px solid #ff4444;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            max-width: 90%;
        `;
        messageDiv.innerHTML = `
            <div style="margin-bottom: 15px; font-size: 40px;">&#9888;</div>
            <div>${message}</div>
            <div style="margin-top: 15px; font-size: 14px; color: #999;">Redirecting to login...</div>
        `;

        document.body.appendChild(messageDiv);
    }

    /**
     * Protected page guard - redirects to login if not authenticated
     * MUST be awaited before rendering protected content
     * @returns {Promise<boolean>}
     */
    async function protectPage() {
        // Demo mode bypass - allow access without auth
        if (sessionStorage.getItem('demo_mode') === 'true') {

            return true;
        }

        const client = initSupabase();

        // If Supabase isn't configured, allow access (for development)
        if (!client) {
            console.warn('Supabase not configured - page protection disabled');
            return true;
        }

        // AWAIT session check - race-condition safe
        const { session } = await getSession();

        if (!session) {

            cleanupOldAuthKeys();
            window.location.href = 'login-cypher.html';
            return false;
        }

        // Mark that user was authenticated when page loaded
        wasAuthenticated = true;

        // Setup listener for future auth state changes
        setupAuthStateListener();


        return true;
    }

    /**
     * Login page guard - redirects to dashboard if already authenticated
     * Call this EARLY to prevent login form flash
     * @returns {Promise<boolean>} - true if should stay on login page, false if redirecting
     */
    async function loginPageGuard() {
        // Demo mode - stay on login page, let demo button handle redirect
        if (sessionStorage.getItem('demo_mode') === 'true') {

            window.location.replace('command-center.html');
            return false;
        }

        const client = initSupabase();

        // If Supabase isn't configured, stay on login page
        if (!client) {
            console.warn('Supabase not configured');
            return true;
        }

        // AWAIT session check
        const { session } = await getSession();

        if (session) {

            window.location.href = 'command-center.html';
            return false;
        }

        return true;
    }

    /**
     * Clean up old localStorage auth keys (legacy cleanup)
     */
    function cleanupOldAuthKeys() {
        const keysToRemove = [
            'cc_user_logged_in',
            'cc_user_email',
            'cc_login_timestamp',
            'cc_auth_token',
            'cc_user_session',
            'cipher_authenticated',
            'cipher_user_type',
            'cipher_user_email',
            'cipher_demo_start_time',
            'cipher_demo_expiry',
            'cipher_remember_me',
            'claimCipherAuth'
        ];

        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });

        sessionStorage.removeItem('claimCipherAuth');
        sessionStorage.removeItem('cipher_session');


    }

    /**
     * Get current user info
     * @returns {Promise<{email: string|null, metadata: object|null}>}
     */
    async function getCurrentUser() {
        const { user } = await getSession();
        if (!user) return { email: null, metadata: null };

        return {
            email: user.email,
            metadata: user.user_metadata || {}
        };
    }

    /**
     * Display loading state on a button
     * @param {HTMLElement} button
     * @param {boolean} isLoading
     * @param {string} loadingText
     */
    function setButtonLoading(button, isLoading, loadingText = 'Loading...') {
        if (!button) return;

        if (isLoading) {
            button.disabled = true;
            button.dataset.originalText = button.innerHTML;
            button.innerHTML = `<span class="loading-spinner"></span> ${loadingText}`;
        } else {
            button.disabled = false;
            if (button.dataset.originalText) {
                button.innerHTML = button.dataset.originalText;
            }
        }
    }

    // Expose functions globally
    window.SupabaseAuth = {
        init: initSupabase,
        getClient: initSupabase,       // Returns the shared Supabase client instance
        signIn: signIn,
        signUp: signUp,
        signOut: signOut,
        getSession: getSession,
        isAuthenticated: isAuthenticated,
        protectPage: protectPage,
        loginPageGuard: loginPageGuard,
        getCurrentUser: getCurrentUser,
        setupAuthStateListener: setupAuthStateListener,
        cleanupOldAuthKeys: cleanupOldAuthKeys,
        setButtonLoading: setButtonLoading
    };

    // Override global handleLogout function
    window.handleLogout = function() {
        // Demo mode logout - clear demo state and redirect (no Supabase session)
        if (sessionStorage.getItem('demo_mode') === 'true') {

            sessionStorage.removeItem('demo_mode');
            sessionStorage.removeItem('claimCipherAuth');
            if (window.FirmStore) window.FirmStore.clearDemo();
            if (window.SessionManager) window.SessionManager.clearDemo();
            window.location.replace('login-cypher.html');
            return;
        }

        // Authenticated user logout via Supabase

        window.SupabaseAuth.signOut();
    };


})();
