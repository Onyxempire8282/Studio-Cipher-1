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
        // Inject modal HTML once if it doesn't exist yet
        if (!document.getElementById('sessionWarningModal')) {
            const tpl = document.createElement('div');
            tpl.innerHTML = `
<div class="session-modal-overlay" id="sessionWarningModal">
  <div class="session-modal">
    <div class="session-modal-header">
      <div class="session-modal-eyebrow">System Alert</div>
      <div class="session-modal-title">Session Expiring</div>
    </div>
    <div class="session-modal-body">
      <div class="session-modal-icon">\u23F1</div>
      <div class="session-modal-message">
        Your session will expire in
        <span class="session-countdown" id="sessionCountdown">5:00</span>
        due to inactivity.
      </div>
      <div class="session-modal-sub">
        Click \u201CStay Logged In\u201D to extend your session.
      </div>
    </div>
    <div class="session-modal-footer">
      <button class="btn btn-ghost" id="sessionLogoutBtn">Logout Now</button>
      <button class="btn btn-primary" id="sessionStayBtn">Stay Logged In \u2192</button>
    </div>
  </div>
</div>`;
            document.body.appendChild(tpl.firstElementChild);

            document.getElementById('sessionStayBtn').addEventListener('click', () => {
                this.extendSession();
            });
            document.getElementById('sessionLogoutBtn').addEventListener('click', () => {
                this.secureLogout();
            });
        }

        // Show modal
        document.getElementById('sessionWarningModal')?.classList.add('active');

        // Start live countdown (5 minutes = 300 seconds)
        this._countdownSeconds = 300;
        clearInterval(this._countdownInterval);
        this.updateCountdownDisplay(this._countdownSeconds);
        this._countdownInterval = setInterval(() => {
            this._countdownSeconds--;
            if (this._countdownSeconds <= 0) {
                clearInterval(this._countdownInterval);
                this.handleSessionExpiry();
                return;
            }
            this.updateCountdownDisplay(this._countdownSeconds);
        }, 1000);
    }

    updateCountdownDisplay(secondsRemaining) {
        const mins = Math.floor(secondsRemaining / 60);
        const secs = secondsRemaining % 60;
        const display = `${mins}:${secs.toString().padStart(2, '0')}`;

        const el = document.getElementById('sessionCountdown');
        if (!el) return;

        el.textContent = display;

        if (secondsRemaining <= 60) {
            el.classList.add('urgent');
        } else {
            el.classList.remove('urgent');
        }
    }

    extendSession() {
        // Close warning modal
        document.getElementById('sessionWarningModal')?.classList.remove('active');
        clearInterval(this._countdownInterval);

        // Reset countdown urgency state for next show
        document.getElementById('sessionCountdown')?.classList.remove('urgent');

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
            background: #111;
            opacity: 0.95;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
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

    window.commandCenterSecurity = new CommandCenterSecurity();
});
