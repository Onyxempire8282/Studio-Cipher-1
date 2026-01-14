/**
 * Command Center Security Enhancement
 * Session timeout, activity tracking, and UI security features
 *
 * NOTE: Authentication verification is handled by Supabase Auth (supabase-auth.js).
 * This file provides session timeout warnings and activity tracking only.
 * DO NOT add localStorage-based auth decisions.
 */

class CommandCenterSecurity {
    constructor() {
        this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
        this.warningTimeout = 25 * 60 * 1000; // 25 minutes

        this.initializeSecurity();
        console.log('Command Center security initialized (Supabase Auth mode)');
    }

    initializeSecurity() {
        // Setup session timeout warnings (UX feature, not auth)
        this.setupSessionMonitoring();

        // Setup activity tracking
        this.setupActivityTracking();

        // Setup suspicious activity monitoring
        this.startSecurityMonitoring();
    }

    /**
     * DISABLED - Auth verification handled by Supabase
     * Always returns true - Supabase protectPage() handles real auth
     */
    verifyAuthentication() {
        // DISABLED - Supabase Auth handles authentication
        // This method is kept for backward compatibility but performs NO auth checks
        console.log('Security: Auth verification delegated to Supabase');
        return true;
    }

    setupSessionMonitoring() {
        // Session warning timer (UX reminder, not auth enforcement)
        this.warningTimer = setTimeout(() => {
            this.showSessionWarning();
        }, this.warningTimeout);

        // Session expiry timer
        this.expiryTimer = setTimeout(() => {
            this.handleSessionExpiry();
        }, this.sessionTimeout);
    }

    setupActivityTracking() {
        // Track user activity for session timeout reset
        const events = ['click', 'keydown', 'scroll', 'mousemove'];
        let activityTimer;

        events.forEach(eventType => {
            document.addEventListener(eventType, () => {
                clearTimeout(activityTimer);
                activityTimer = setTimeout(() => {
                    this.resetSessionTimers();
                }, 1000);
            }, true);
        });
    }

    resetSessionTimers() {
        // Reset timeout timers on activity
        clearTimeout(this.warningTimer);
        clearTimeout(this.expiryTimer);

        this.warningTimer = setTimeout(() => {
            this.showSessionWarning();
        }, this.warningTimeout);

        this.expiryTimer = setTimeout(() => {
            this.handleSessionExpiry();
        }, this.sessionTimeout);
    }

    showSessionWarning() {
        const warningModal = this.createSecurityModal(
            'Session Warning',
            `
            <div style="padding: 20px; text-align: center;">
                <p style="margin-bottom: 20px; color: #f39c12;">
                    Your session will expire in 5 minutes due to inactivity.
                </p>
                <p style="margin-bottom: 20px; color: #7f8c8d;">
                    Click "Stay Logged In" to extend your session.
                </p>
                <div>
                    <button onclick="commandCenterSecurity.extendSession()"
                            style="background: #27ae60; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; margin: 5px;">
                        Stay Logged In
                    </button>
                    <button onclick="commandCenterSecurity.secureLogout()"
                            style="background: #e74c3c; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; margin: 5px;">
                        Logout Now
                    </button>
                </div>
            </div>
            `,
            false
        );

        document.body.appendChild(warningModal);
    }

    extendSession() {
        console.log('Security: Session extended by user');

        // Close warning modal
        const modal = document.querySelector('.security-modal-overlay');
        if (modal) {
            modal.remove();
        }

        // Reset timers
        this.resetSessionTimers();

        // Show confirmation
        this.showSecurityNotification('Session extended successfully', 'success');

        // Log activity
        if (window.commandCenter) {
            window.commandCenter.logActivity('Session extended by user', 'auth');
        }
    }

    handleSessionExpiry() {
        console.warn('Security: Session timeout - logging out via Supabase');

        this.showSecurityNotification('Session expired. Logging out...', 'warning');

        // Use Supabase signOut
        setTimeout(() => {
            if (window.SupabaseAuth && window.SupabaseAuth.signOut) {
                window.SupabaseAuth.signOut();
            } else {
                window.location.href = 'login-cypher.html';
            }
        }, 2000);
    }

    async secureLogout() {
        console.log('Security: Secure logout initiated');

        const confirmed = confirm('Are you sure you want to logout?');

        if (confirmed) {
            // Log activity
            if (window.commandCenter) {
                window.commandCenter.logActivity('User initiated secure logout', 'auth');
            }

            this.showSecurityNotification('Logging out securely...', 'info');

            // Use Supabase signOut - MUST await to ensure session is terminated
            if (window.SupabaseAuth && window.SupabaseAuth.signOut) {
                await window.SupabaseAuth.signOut();
                // signOut() handles redirect after session termination
            } else {
                window.location.href = 'login-cypher.html';
            }
        }
    }

    startSecurityMonitoring() {
        // Monitor for suspicious activity only (no auth checks)
        let rapidClickCount = 0;
        let rapidClickTimer;

        document.addEventListener('click', () => {
            rapidClickCount++;

            clearTimeout(rapidClickTimer);
            rapidClickTimer = setTimeout(() => {
                rapidClickCount = 0;
            }, 1000);

            if (rapidClickCount > 20) {
                console.warn('Security: Suspicious rapid clicking detected');
                this.showSecurityNotification('Unusual activity detected', 'warning');
            }
        });
    }

    createSecurityModal(title, content, allowOutsideClose = true) {
        const modal = document.createElement('div');
        modal.className = 'security-modal-overlay';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            backdrop-filter: blur(8px);
        `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            border-radius: 15px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
            border: 2px solid #e74c3c;
        `;

        modalContent.innerHTML = `
            <div style="padding: 20px; border-bottom: 1px solid #eee; background: #e74c3c; color: white;">
                <h2 style="margin: 0;">${title}</h2>
            </div>
            ${content}
        `;

        modal.appendChild(modalContent);

        if (allowOutsideClose) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        }

        return modal;
    }

    showSecurityNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `security-notification security-notification-${type}`;

        const colors = {
            info: '#3498db',
            success: '#27ae60',
            warning: '#f39c12',
            error: '#e74c3c'
        };

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type]};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 99998;
            transform: translateX(400px);
            transition: transform 0.3s ease;
            border-left: 4px solid rgba(255, 255, 255, 0.3);
            font-weight: 600;
        `;

        notification.innerHTML = `
            <div style="display: flex; align-items: center;">
                <span style="margin-right: 10px;">${type === 'error' ? '🚨' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️'}</span>
                ${message}
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }

    // Public methods (backward compatible, but auth-neutral)
    getCurrentUser() {
        // Delegate to Supabase
        if (window.SupabaseAuth && window.SupabaseAuth.getCurrentUser) {
            return window.SupabaseAuth.getCurrentUser();
        }
        return null;
    }

    isUserAuthenticated() {
        // Always return true - Supabase handles actual auth
        return true;
    }

    getSessionTimeRemaining() {
        // Return remaining time until UI timeout warning
        return this.sessionTimeout;
    }

    formatTimeRemaining(milliseconds) {
        const minutes = Math.floor(milliseconds / 60000);
        const seconds = Math.floor((milliseconds % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

// Initialize Security when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('Security: Initializing Command Center security...');
    window.commandCenterSecurity = new CommandCenterSecurity();
});
