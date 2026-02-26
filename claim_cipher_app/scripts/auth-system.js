/**
 * Authentication System (LEGACY - DISABLED)
 *
 * NOTE: This file has been neutralized. All auth decisions are now handled
 * by Supabase Auth (supabase-auth.js). This file is kept for backward
 * compatibility but performs NO auth checks or decisions.
 *
 * DO NOT re-enable localStorage auth logic.
 */

class AuthenticationSystem {
    constructor() {
        // Intentionally empty - auth handled by Supabase

    }

    init() {
        // Disabled - Supabase Auth handles initialization
    }

    setupLoginForm() {
        // Disabled - Supabase Auth handles login forms
    }

    async handleLogin(event) {
        // Disabled - Supabase Auth handles login
        if (event) event.preventDefault();
        console.warn('Legacy handleLogin called - use Supabase Auth instead');
    }

    checkAuthOnLoad() {
        // DISABLED - NO localStorage auth decisions
        // Supabase Auth handles all page protection via protectPage()
        return true;
    }

    logout() {
        // Delegate to Supabase Auth
        if (window.SupabaseAuth && window.SupabaseAuth.signOut) {
            window.SupabaseAuth.signOut();
        } else {
            // Fallback: just redirect
            window.location.href = 'login-cypher.html';
        }
    }

    showError(message) {
        console.warn('Legacy showError:', message);
    }
}

// Initialize but with disabled functionality
document.addEventListener('DOMContentLoaded', () => {
    window.authSystem = new AuthenticationSystem();
});

// Global logout function - delegates to Supabase
function logout() {
    if (window.SupabaseAuth && window.SupabaseAuth.signOut) {
        window.SupabaseAuth.signOut();
    } else if (window.authSystem) {
        window.authSystem.logout();
    }
}
