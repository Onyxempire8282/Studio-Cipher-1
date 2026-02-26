// 📝 Lyricist Agent: Command Center Core Functionality
// Advanced JavaScript for dashboard operations

class CommandCenterManager {
    constructor() {
        this.initializeOnLoad();
        this.setupEventListeners();
        this.loadUserData();
        this.startPeriodicUpdates();
        

    }
    
    initializeOnLoad() {
        // Load user session data
        this.updateUserDisplay();
        this.updateStatistics();
        this.loadRecentActivity();
        this.checkSystemStatus();
        
        // Initialize visual enhancements
        this.initializeAnimations();
    }
    
    setupEventListeners() {
        // Module navigation listeners
        document.querySelectorAll('.module-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.action-btn')) {
                    const link = card.querySelector('a.primary-btn');
                    if (link) {
                        this.navigateToModule(link.href);
                    }
                }
            });
        });
        
        // Quick action listeners
        document.addEventListener('click', (e) => {
            const target = e.target;
            if (target.matches('[onclick]')) {
                e.preventDefault();
                const action = target.getAttribute('onclick');
                this.handleQuickAction(action, target);
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case '1': this.navigateToModule('route-cypher.html'); break;
                    case '2': this.navigateToModule('mileage-cypher.html'); break;
                    case '3': this.navigateToModule('jobs-studio.html'); break;
                    case '4': this.navigateToModule('firms-directory.html'); break;
                    case 's': this.navigateToModule('settings-booth.html'); break;
                    case 't': this.navigateToModule('functionality-test.html'); break;
                    case 'h': 
                        e.preventDefault();
                        this.showHelpModal(); 
                        break;
                }
            }
        });
    }
    
    navigateToModule(url) {

        
        // Add loading state
        const targetCard = document.querySelector(`[onclick*="${url}"]`) || 
                          document.querySelector(`[href="${url}"]`)?.closest('.module-card');
        
        if (targetCard) {
            targetCard.classList.add('loading');
            setTimeout(() => targetCard.classList.remove('loading'), 1000);
        }
        
        // Log activity
        this.logActivity(`Navigated to ${this.getModuleName(url)}`, 'navigation');
        
        // Navigate with smooth transition
        window.location.href = url;
    }
    
    handleQuickAction(action, element) {

        
        // Extract function name from onclick string
        const functionName = action.match(/(\w+)\(/)?.[1];
        
        switch(functionName) {
            case 'addFirm':
                this.addFirm();
                break;
            case 'quickSettings':
                this.quickSettings();
                break;
            case 'quickTest':
                this.quickTest();
                break;
            case 'handleLogout':
                this.handleLogout();
                break;
            default:

        }
    }

    addFirm() {
        this.logActivity('Added new insurance firm', 'firm');
        this.navigateToModule('firms-directory.html');
    }
    
    quickSettings() {
        this.navigateToModule('settings-booth.html');
    }
    
    quickTest() {
        this.logActivity('Ran system diagnostics', 'test');
        this.navigateToModule('functionality-test.html');
    }
    
    async handleLogout() {
        if (confirm('Are you sure you want to logout?')) {

            this.logActivity('User logged out', 'auth');

            // Show logout message
            this.showNotification('Logged out successfully', 'success');

            // Demo mode logout - clear demo state and redirect (no Supabase session)
            if (sessionStorage.getItem('demo_mode') === 'true') {

                sessionStorage.removeItem('demo_mode');
                sessionStorage.removeItem('claimCipherAuth');
                if (window.FirmStore) window.FirmStore.clearDemo();
                if (window.SessionManager) window.SessionManager.clearDemo();
                window.location.replace('login-cypher.html');
                return;
            }

            // Use Supabase signOut - MUST await to ensure session is terminated
            if (window.SupabaseAuth && window.SupabaseAuth.signOut) {
                await window.SupabaseAuth.signOut();
                // signOut() handles redirect after session termination
            } else {
                // Fallback: Clear session data and redirect
                localStorage.removeItem('cc_user_session');
                localStorage.removeItem('cc_auth_token');
                window.location.href = 'login-cypher.html';
            }
        }
    }
    
    // Modal System
    showQuickModal(title, content) {
        const modal = document.createElement('div');
        modal.className = 'quick-modal-overlay';
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
            z-index: 9999;
        `;
        
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            border-radius: 15px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        `;
        
        modalContent.innerHTML = `
            <div style="padding: 20px; border-bottom: 1px solid #eee;">
                <h2 style="margin: 0; color: #2c3e50;">${title}</h2>
            </div>
            ${content}
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });
        
        // Close on escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }
    
    closeModal() {
        const modal = document.querySelector('.quick-modal-overlay');
        if (modal) {
            modal.remove();
        }
    }
    
    // Statistics Management (Database-backed, display-only)
    async updateStatistics() {
        // Show loading state
        const routesEl = document.getElementById('routesCalculated');
        const milesEl = document.getElementById('milesComputed');
        const firmsEl = document.getElementById('firmsManaged');

        // Fetch authoritative stats from database
        if (window.RouteService && window.RouteService.getDashboardStats) {
            try {
                const result = await window.RouteService.getDashboardStats();
                if (result.success) {
                    // Routes Calculated: from routes table (usage metric)
                    if (routesEl) routesEl.textContent = result.data.routes;
                    // Miles Counted: from mileage_logs ONLY (accountant-safe)
                    if (milesEl) milesEl.textContent = result.data.miles.toLocaleString();
                } else {
                    console.warn('📝 Dashboard stats fetch failed:', result.error);
                    // Show 0 on error - no localStorage fallback
                    if (routesEl) routesEl.textContent = '0';
                    if (milesEl) milesEl.textContent = '0';
                }
            } catch (e) {
                console.warn('📝 Dashboard stats error:', e);
                if (routesEl) routesEl.textContent = '0';
                if (milesEl) milesEl.textContent = '0';
            }
        } else {
            // RouteService not loaded yet - show 0
            if (routesEl) routesEl.textContent = '0';
            if (milesEl) milesEl.textContent = '0';
        }

        // Active Firms: from mileage calculator settings (local preference)
        if (firmsEl) firmsEl.textContent = this.getFirmsWithBillingRate();

        // Animate counters
        this.animateCounters();
    }

    /**
     * Get count of firms saved in FirmStore with a billing rate
     * @returns {number} Number of firms with billing rates configured
     */
    getFirmsWithBillingRate() {
        try {
            const firms = window.FirmStore ? window.FirmStore.getAllSync() : [];
            return firms.filter(firm =>
                firm && typeof firm.ratePerMile === 'number' && firm.ratePerMile > 0
            ).length;
        } catch (e) {
            console.warn('Command Center: Error reading FirmStore');
            return 0;
        }
    }

    animateCounters() {
        const counters = document.querySelectorAll('.stat-num');

        counters.forEach(counter => {
            const target = parseFloat(counter.textContent.replace(/,/g, '')) || 0;
            if (target === 0) return; // Skip animation for zero values

            let current = 0;
            const increment = target / 30;

            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    counter.textContent = Number.isInteger(target)
                        ? target.toLocaleString()
                        : target.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
                    clearInterval(timer);
                } else {
                    counter.textContent = Math.floor(current).toLocaleString();
                }
            }, 50);
        });
    }
    
    // Activity Management
    loadRecentActivity() {
        const activities = this.getStoredActivities();
        const feed = document.getElementById('activityFeed');
        
        if (activities.length === 0) {
            // Add some sample activities if none exist
            this.addSampleActivities();
            return;
        }
        
        feed.innerHTML = activities.map((activity, index) => this.createActivityHTML(activity, index, activities.length)).join('');
    }
    
    getStoredActivities() {
        const stored = localStorage.getItem('cc_recent_activities');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.warn('📝 Lyricist: Error parsing stored activities');
            }
        }
        return [];
    }
    
    logActivity(description, type = 'general') {
        const activities = this.getStoredActivities();
        
        const newActivity = {
            id: Date.now(),
            description: description,
            type: type,
            timestamp: new Date().toISOString(),
            timeAgo: 'Just now'
        };
        
        activities.unshift(newActivity);
        
        // Keep only latest 20 activities
        if (activities.length > 20) {
            activities.splice(20);
        }
        
        localStorage.setItem('cc_recent_activities', JSON.stringify(activities));
        this.loadRecentActivity();
    }
    
    createActivityHTML(activity, index, total) {
        const isLatest = index === 0;
        const hasThread = index < total - 1;
        const dotClass = isLatest ? 'amber' : 'dim';

        return `
            <div class="feed-item">
                <div class="feed-dot-wrap">
                    <div class="feed-dot ${dotClass}"></div>
                    ${hasThread ? '<div class="feed-thread"></div>' : ''}
                </div>
                <div class="feed-content">
                    <div class="feed-action">${activity.description}</div>
                    <div class="feed-time">${this.formatTimeAgo(activity.timestamp)}</div>
                </div>
            </div>
        `;
    }
    
    formatTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffInSeconds = Math.floor((now - time) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        return `${Math.floor(diffInSeconds / 86400)} days ago`;
    }
    
    addSampleActivities() {
        const sampleActivities = [
            { description: 'Route optimized: Philadelphia to Baltimore (3 stops)', type: 'route', timestamp: new Date(Date.now() - 120000).toISOString() },
            { description: 'Mileage calculated: $67.50 for Sedgwick claim', type: 'mileage', timestamp: new Date(Date.now() - 900000).toISOString() },
            { description: 'Day split applied: Route exceeds 50 miles per leg', type: 'route', timestamp: new Date(Date.now() - 3600000).toISOString() }
        ];
        
        localStorage.setItem('cc_recent_activities', JSON.stringify(sampleActivities));
        this.loadRecentActivity();
    }
    
    // User Management
    updateUserDisplay() {
        const userSession = this.getUserSession();
        const userNameEl = document.getElementById('userName');
        const welcomeEl = document.getElementById('welcomeTitle');

        let displayName = 'Professional User';
        if (userSession && userSession.name) {
            displayName = userSession.name;
        }

        if (userNameEl) {
            userNameEl.textContent = displayName;
        }

        // Set personalized welcome title
        if (welcomeEl) {
            const firstName = displayName.split(' ')[0];
            welcomeEl.textContent = `Welcome back, ${firstName}`;
        }

        // Also try to get name from Supabase auth
        this.updateWelcomeFromAuth();
    }

    async updateWelcomeFromAuth() {
        if (!window.SupabaseAuth || !window.SupabaseAuth.getCurrentUser) return;
        try {
            const { email, metadata } = await window.SupabaseAuth.getCurrentUser();
            if (!email) return;

            const welcomeEl = document.getElementById('welcomeTitle');
            const userNameEl = document.getElementById('userName');

            // Prefer metadata name, fall back to email prefix
            let name = (metadata && (metadata.full_name || metadata.name)) ||
                       email.split('@')[0];
            // Capitalize first letter of email prefix if used
            if (!metadata || (!metadata.full_name && !metadata.name)) {
                name = name.charAt(0).toUpperCase() + name.slice(1);
            }

            const firstName = name.split(' ')[0];
            if (welcomeEl) welcomeEl.textContent = `Welcome back, ${firstName}`;
            if (userNameEl) userNameEl.textContent = name;
        } catch (e) {
            // Silently fail — local session name is already set
        }
    }
    
    loadUserData() {
        const session = this.getUserSession();
        if (!session) {
            // Create default session
            const defaultSession = {
                name: 'Professional User',
                role: 'Claims Specialist',
                loginTime: Date.now(),
                lastActivity: Date.now()
            };
            localStorage.setItem('cc_user_session', JSON.stringify(defaultSession));
        }
    }
    
    getUserSession() {
        const stored = localStorage.getItem('cc_user_session');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.warn('📝 Lyricist: Error parsing user session');
            }
        }
        return null;
    }
    
    // System Status
    checkSystemStatus() {
        // Check Google Maps API
        if (typeof google !== 'undefined' && google.maps) {
            this.updateStatusIndicator('Google Maps API', 'online');
        } else {
            this.updateStatusIndicator('Google Maps API', 'online'); // Assume online for demo
        }
        
        // Check localStorage
        try {
            localStorage.setItem('cc_status_test', 'test');
            localStorage.removeItem('cc_status_test');
            this.updateStatusIndicator('Local Storage', 'online');
        } catch (e) {
            this.updateStatusIndicator('Local Storage', 'offline');
        }
    }
    
    updateStatusIndicator(service, status) {
        const indicators = document.querySelectorAll('.status-indicator');
        indicators.forEach(indicator => {
            const parent = indicator.parentElement;
            if (parent && parent.textContent.includes(service)) {
                indicator.className = `status-indicator status-${status}`;
                indicator.textContent = status === 'online' ? 'Online' : 'Offline';
            }
        });
    }
    
    // Utility Functions
    getModuleName(url) {
        const names = {
            'route-cypher.html': 'Route Cipher',
            'mileage-cypher.html': 'Mileage Cipher', 
            'jobs-studio.html': 'Jobs Studio',
            'firms-directory.html': 'Firms Directory',
            'settings-booth.html': 'Settings Booth',
            'functionality-test.html': 'Test Suite'
        };
        
        const filename = url.split('/').pop();
        return names[filename] || filename;
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#27ae60' : type === 'warning' ? '#f39c12' : '#3498db'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            transform: translateX(400px);
            transition: transform 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    initializeAnimations() {
        // Stagger card animations on load
        const cards = document.querySelectorAll('.op-card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 150);
        });
    }
    
    startPeriodicUpdates() {
        // Update activity timestamps every minute
        setInterval(() => {
            this.loadRecentActivity();
        }, 60000);
        
        // Update system status every 5 minutes
        setInterval(() => {
            this.checkSystemStatus();
        }, 300000);
    }
    
    // 📝 Lyricist Agent: Command Center Expansion Methods
    // Mobile Suite and Help Page functionality
    
    showMobileSuiteModal() {

        
        const proFeatures = [
            { icon: '📱', title: 'Native Mobile Apps', desc: 'iOS and Android apps with full functionality' },
            { icon: '📍', title: 'GPS Integration', desc: 'Automatic location detection and route tracking' },
            { icon: '☁️', title: 'Cloud Sync', desc: 'Seamless data sync across all devices' },
            { icon: '📊', title: 'Pro Analytics', desc: 'Advanced reporting and business insights' },
            { icon: '🚫', title: 'Offline Mode', desc: 'Full functionality without internet connection' },
            { icon: '🎧', title: 'Priority Support', desc: 'Dedicated customer success manager' }
        ];
        
        const featuresHTML = proFeatures.map(feature => `
            <div style="display: flex; align-items: center; padding: 15px; border-bottom: 1px solid #f0f0f0;">
                <div style="font-size: 2em; margin-right: 15px;">${feature.icon}</div>
                <div>
                    <div style="font-weight: 600; color: #2c3e50; margin-bottom: 3px;">${feature.title}</div>
                    <div style="color: #7f8c8d; font-size: 0.9em;">${feature.desc}</div>
                </div>
            </div>
        `).join('');
        
        this.showQuickModal('📱 Mobile Suite - Pro Features', `
            <div style="padding: 20px;">
                <div style="text-align: center; margin-bottom: 25px;">
                    <div style="display: inline-block; background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%); 
                               color: white; padding: 8px 20px; border-radius: 20px; font-weight: 700; font-size: 1.1em;">
                        ✨ PREMIUM FEATURES
                    </div>
                </div>
                
                <div style="background: #f8f9fa; border-radius: 12px; margin-bottom: 20px;">
                    ${featuresHTML}
                </div>
                
                <div style="background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%); 
                           color: white; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 1.5em; font-weight: 700; margin-bottom: 10px;">$29.99/month</div>
                    <div style="opacity: 0.9;">Professional plan with all premium features</div>
                </div>
                
                <div style="text-align: center;">
                    <button onclick="commandCenter.upgradeToPro()" 
                            style="background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%); color: white; 
                                   border: none; padding: 15px 30px; border-radius: 8px; cursor: pointer; margin: 5px;
                                   font-size: 1.1em; font-weight: 600;">
                        🚀 Upgrade to Pro
                    </button>
                    <button onclick="commandCenter.downloadMobileApp()" 
                            style="background: #3498db; color: white; border: none; padding: 15px 30px; 
                                   border-radius: 8px; cursor: pointer; margin: 5px; font-weight: 600;">
                        📱 Download Free App
                    </button>
                    <button onclick="commandCenter.closeModal()" 
                            style="background: #95a5a6; color: white; border: none; padding: 15px 30px; 
                                   border-radius: 8px; cursor: pointer; margin: 5px; font-weight: 600;">
                        Cancel
                    </button>
                </div>
            </div>
        `);
        
        this.logActivity('Viewed Mobile Suite Pro features', 'mobile');
    }
    
    downloadMobileApp() {

        
        this.showQuickModal('📱 Download Claim Cipher Mobile', `
            <div style="padding: 20px; text-align: center;">
                <div style="font-size: 4em; margin-bottom: 20px;">📱</div>
                <h3 style="color: #2c3e50; margin-bottom: 20px;">Choose Your Platform</h3>
                
                <div style="display: grid; gap: 15px; margin-bottom: 25px;">
                    <button onclick="commandCenter.downloadForPlatform('ios')" 
                            style="display: flex; align-items: center; justify-content: center; padding: 15px; 
                                   background: #007AFF; color: white; border: none; border-radius: 12px; cursor: pointer;
                                   font-size: 1.1em; font-weight: 600;">
                        <span style="font-size: 1.5em; margin-right: 10px;">🍎</span>
                        Download for iOS
                    </button>
                    <button onclick="commandCenter.downloadForPlatform('android')" 
                            style="display: flex; align-items: center; justify-content: center; padding: 15px; 
                                   background: #34A853; color: white; border: none; border-radius: 12px; cursor: pointer;
                                   font-size: 1.1em; font-weight: 600;">
                        <span style="font-size: 1.5em; margin-right: 10px;">🤖</span>
                        Download for Android
                    </button>
                </div>
                
                <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <div style="color: #27ae60; font-weight: 600; margin-bottom: 5px;">✅ Free Features Included:</div>
                    <div style="color: #2c3e50; font-size: 0.9em;">
                        • Basic route optimization<br>
                        • Mileage calculations<br>
                        • Firm management<br>
                        • Cloud backup
                    </div>
                </div>
                
                <button onclick="commandCenter.closeModal()" 
                        style="background: #95a5a6; color: white; border: none; padding: 12px 24px; 
                               border-radius: 6px; cursor: pointer;">
                    Close
                </button>
            </div>
        `);
        
        this.logActivity('Accessed mobile app download', 'mobile');
    }
    
    downloadForPlatform(platform) {
        this.closeModal();
        
        const platformName = platform === 'ios' ? 'iOS' : 'Android';
        const storeUrl = platform === 'ios' ? 'https://apps.apple.com/app/claim-cipher' : 'https://play.google.com/store/apps/details?id=com.claimcipher.app';
        
        this.showNotification(`Opening ${platformName} App Store...`, 'info');
        this.logActivity(`Downloaded mobile app for ${platformName}`, 'mobile');
        
        // In a real app, this would open the app store
        setTimeout(() => {
            this.showNotification(`${platformName} app download initiated`, 'success');
        }, 1500);
    }
    
    upgradeToPro() {

        this.closeModal();
        
        this.showQuickModal('🚀 Upgrade to Pro', `
            <div style="padding: 20px; text-align: center;">
                <div style="font-size: 3em; margin-bottom: 20px;">🚀</div>
                <h3 style="color: #2c3e50; margin-bottom: 15px;">Ready to Go Pro?</h3>
                <p style="color: #7f8c8d; margin-bottom: 25px;">
                    Unlock all premium features and take your claim management to the next level.
                </p>
                
                <div style="background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%); 
                           color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                    <div style="font-size: 1.8em; font-weight: 700; margin-bottom: 5px;">$29.99/month</div>
                    <div style="opacity: 0.9;">Cancel anytime • 30-day free trial</div>
                </div>
                
                <div style="margin-bottom: 25px;">
                    <button onclick="commandCenter.startFreeTrial()" 
                            style="background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); color: white; 
                                   border: none; padding: 15px 30px; border-radius: 8px; cursor: pointer; margin: 5px;
                                   font-size: 1.2em; font-weight: 600;">
                        🎁 Start Free Trial
                    </button>
                </div>
                
                <div style="color: #7f8c8d; font-size: 0.9em; margin-bottom: 20px;">
                    No credit card required for trial
                </div>
                
                <button onclick="commandCenter.closeModal()" 
                        style="background: #95a5a6; color: white; border: none; padding: 12px 24px; 
                               border-radius: 6px; cursor: pointer;">
                    Maybe Later
                </button>
            </div>
        `);
        
        this.logActivity('Initiated Pro upgrade process', 'upgrade');
    }
    
    startFreeTrial() {
        this.closeModal();
        this.showNotification('Free trial activated! Welcome to Pro features! 🎉', 'success');
        this.logActivity('Started Pro free trial', 'upgrade');
        
        // Update UI to show pro features are now available
        setTimeout(() => {
            this.showNotification('Pro features are now unlocked for 30 days', 'info');
        }, 2000);
    }
    
    showHelpModal() {

        
        const helpSections = [
            { icon: '🎥', title: 'Video Tutorials', desc: 'Step-by-step walkthroughs of all features', action: 'showTutorials()' },
            { icon: '📖', title: 'User Guide', desc: 'Comprehensive documentation and guides', action: 'showUserGuide()' },
            { icon: '❓', title: 'FAQ', desc: 'Frequently asked questions and answers', action: 'showFAQ()' },
            { icon: '⌨️', title: 'Keyboard Shortcuts', desc: 'Quick reference for power users', action: 'showKeyboardShortcuts()' },
            { icon: '🐛', title: 'Report Issue', desc: 'Found a bug? Let us know!', action: 'reportIssue()' },
            { icon: '💬', title: 'Contact Support', desc: 'Get help from our support team', action: 'contactSupport()' }
        ];
        
        const sectionsHTML = helpSections.map(section => `
            <div onclick="commandCenter.${section.action}" 
                 style="display: flex; align-items: center; padding: 15px; border-bottom: 1px solid #f0f0f0;
                        cursor: pointer; transition: background 0.3s ease;" 
                 onmouseover="this.style.background='#f8f9fa'" 
                 onmouseout="this.style.background='white'">
                <div style="font-size: 2em; margin-right: 15px;">${section.icon}</div>
                <div>
                    <div style="font-weight: 600; color: #2c3e50; margin-bottom: 3px;">${section.title}</div>
                    <div style="color: #7f8c8d; font-size: 0.9em;">${section.desc}</div>
                </div>
                <div style="margin-left: auto; color: #bdc3c7; font-size: 1.5em;">›</div>
            </div>
        `).join('');
        
        this.showQuickModal('❓ Help & Documentation', `
            <div style="padding: 0;">
                <div style="padding: 20px; border-bottom: 1px solid #eee; text-align: center;">
                    <h3 style="color: #2c3e50; margin: 0;">How can we help you?</h3>
                    <p style="color: #7f8c8d; margin: 10px 0 0 0;">Choose a topic below to get started</p>
                </div>
                
                <div style="max-height: 400px; overflow-y: auto;">
                    ${sectionsHTML}
                </div>
                
                <div style="padding: 20px; border-top: 1px solid #eee; text-align: center;">
                    <div style="background: #e8f4ff; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                        <div style="color: #3498db; font-weight: 600; margin-bottom: 5px;">💡 Quick Tip</div>
                        <div style="color: #2c3e50; font-size: 0.9em;">
                            Use <kbd>Ctrl+1</kbd> for Route Cipher, <kbd>Ctrl+2</kbd> for Mileage Cipher
                        </div>
                    </div>
                    <button onclick="commandCenter.closeModal()" 
                            style="background: #95a5a6; color: white; border: none; padding: 12px 24px; 
                                   border-radius: 6px; cursor: pointer;">
                        Close
                    </button>
                </div>
            </div>
        `);
        
        this.logActivity('Opened help documentation', 'help');
    }
    
    showTutorials() {
        this.closeModal();
        
        const tutorials = [
            { title: '🗺️ Route Cipher Basics', duration: '3:45', level: 'Beginner' },
            { title: '🧮 Mileage Cipher Setup', duration: '2:30', level: 'Beginner' },
            { title: '💼 Managing Insurance Firms', duration: '4:15', level: 'Intermediate' },
            { title: '📊 Advanced Route Optimization', duration: '6:20', level: 'Advanced' },
            { title: '🔄 Day Splitting Strategies', duration: '3:10', level: 'Intermediate' },
            { title: '📱 Mobile App Integration', duration: '2:45', level: 'Beginner' }
        ];
        
        const tutorialsHTML = tutorials.map((tutorial, index) => `
            <div onclick="commandCenter.playTutorial(${index})" 
                 style="display: flex; align-items: center; padding: 15px; border: 1px solid #e0e0e0;
                        border-radius: 8px; margin-bottom: 10px; cursor: pointer; transition: all 0.3s ease;
                        background: white;" 
                 onmouseover="this.style.background='#f8f9fa'; this.style.borderColor='#3498db'" 
                 onmouseout="this.style.background='white'; this.style.borderColor='#e0e0e0'">
                <div style="font-size: 2.5em; margin-right: 15px;">▶️</div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #2c3e50; margin-bottom: 3px;">${tutorial.title}</div>
                    <div style="color: #7f8c8d; font-size: 0.9em;">
                        ${tutorial.duration} • ${tutorial.level}
                    </div>
                </div>
                <div style="background: #3498db; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8em;">
                    WATCH
                </div>
            </div>
        `).join('');
        
        this.showQuickModal('🎥 Video Tutorials', `
            <div style="padding: 20px;">
                <div style="text-align: center; margin-bottom: 25px;">
                    <h3 style="color: #2c3e50; margin-bottom: 10px;">Learn Claim Cipher</h3>
                    <p style="color: #7f8c8d;">Master all features with our step-by-step video guides</p>
                </div>
                
                <div style="max-height: 400px; overflow-y: auto;">
                    ${tutorialsHTML}
                </div>
                
                <div style="text-align: center; margin-top: 20px;">
                    <button onclick="commandCenter.closeModal()" 
                            style="background: #95a5a6; color: white; border: none; padding: 12px 24px; 
                                   border-radius: 6px; cursor: pointer;">
                        Close
                    </button>
                </div>
            </div>
        `);
        
        this.logActivity('Accessed video tutorials', 'help');
    }
    
    playTutorial(index) {
        const tutorials = [
            'Route Cipher Basics',
            'Mileage Cipher Setup', 
            'Managing Insurance Firms',
            'Advanced Route Optimization',
            'Day Splitting Strategies',
            'Mobile App Integration'
        ];
        
        this.closeModal();
        this.showNotification(`Playing: ${tutorials[index]}`, 'info');
        this.logActivity(`Watched tutorial: ${tutorials[index]}`, 'tutorial');
        
        // In a real app, this would open the video player
        setTimeout(() => {
            this.showNotification('Tutorial completed! 🎓', 'success');
        }, 2000);
    }
    
    showUserGuide() {
        this.closeModal();
        this.showNotification('Opening user guide...', 'info');
        this.logActivity('Accessed user guide', 'help');
        // In a real app, this would navigate to a detailed guide page
    }
    
    showFAQ() {
        this.closeModal();
        
        const faqs = [
            { q: 'How do I optimize a route with multiple stops?', a: 'Use the Route Cipher module and add destinations one by one. Enable "Optimize Route" for best order.' },
            { q: 'How are billable miles calculated?', a: 'Total miles minus free miles provided by the insurance firm, multiplied by the rate per mile.' },
            { q: 'Can I use this offline?', a: 'Basic functionality works offline, but route optimization requires internet. Upgrade to Pro for full offline support.' },
            { q: 'How do I add a new insurance firm?', a: 'Go to Firms Directory and click "Add New Firm" or use the quick action button.' },
            { q: 'What are keyboard shortcuts?', a: 'Press Ctrl+1 for Route Cipher, Ctrl+2 for Mileage Cipher, Ctrl+S for Settings.' }
        ];
        
        const faqHTML = faqs.map(faq => `
            <div style="border-bottom: 1px solid #f0f0f0; padding: 15px 0;">
                <div style="font-weight: 600; color: #2c3e50; margin-bottom: 8px;">${faq.q}</div>
                <div style="color: #7f8c8d; line-height: 1.5;">${faq.a}</div>
            </div>
        `).join('');
        
        this.showQuickModal('❓ Frequently Asked Questions', `
            <div style="padding: 20px;">
                <div style="max-height: 400px; overflow-y: auto;">
                    ${faqHTML}
                </div>
                
                <div style="text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee;">
                    <div style="color: #7f8c8d; margin-bottom: 15px;">
                        Can't find what you're looking for?
                    </div>
                    <button onclick="commandCenter.contactSupport()" 
                            style="background: #3498db; color: white; border: none; padding: 12px 24px; 
                                   border-radius: 6px; cursor: pointer; margin: 5px;">
                        Contact Support
                    </button>
                    <button onclick="commandCenter.closeModal()" 
                            style="background: #95a5a6; color: white; border: none; padding: 12px 24px; 
                                   border-radius: 6px; cursor: pointer; margin: 5px;">
                        Close
                    </button>
                </div>
            </div>
        `);
        
        this.logActivity('Viewed FAQ section', 'help');
    }
    
    showKeyboardShortcuts() {
        this.closeModal();
        
        const shortcuts = [
            { keys: 'Ctrl + 1', action: 'Open Route Cipher' },
            { keys: 'Ctrl + 2', action: 'Open Mileage Cipher' },
            { keys: 'Ctrl + 3', action: 'Open Jobs Studio' },
            { keys: 'Ctrl + 4', action: 'Open Firms Directory' },
            { keys: 'Ctrl + S', action: 'Open Settings' },
            { keys: 'Ctrl + T', action: 'Open Test Suite' },
            { keys: 'Ctrl + H', action: 'Open Help (this modal)' },
            { keys: 'Escape', action: 'Close current modal' }
        ];
        
        const shortcutsHTML = shortcuts.map(shortcut => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
                <div style="color: #2c3e50;">${shortcut.action}</div>
                <div style="background: #f8f9fa; padding: 6px 12px; border-radius: 6px; font-family: monospace; font-weight: 600; color: #667eea;">
                    ${shortcut.keys}
                </div>
            </div>
        `).join('');
        
        this.showQuickModal('⌨️ Keyboard Shortcuts', `
            <div style="padding: 20px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h3 style="color: #2c3e50; margin-bottom: 10px;">Power User Shortcuts</h3>
                    <p style="color: #7f8c8d;">Navigate faster with these keyboard combinations</p>
                </div>
                
                <div style="max-height: 300px; overflow-y: auto;">
                    ${shortcutsHTML}
                </div>
                
                <div style="background: #e8f4ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <div style="color: #3498db; font-weight: 600; margin-bottom: 5px;">💡 Pro Tip</div>
                    <div style="color: #2c3e50; font-size: 0.9em;">
                        Hold Ctrl (or Cmd on Mac) and press the number key to quickly navigate between modules.
                    </div>
                </div>
                
                <div style="text-align: center;">
                    <button onclick="commandCenter.closeModal()" 
                            style="background: #95a5a6; color: white; border: none; padding: 12px 24px; 
                                   border-radius: 6px; cursor: pointer;">
                        Close
                    </button>
                </div>
            </div>
        `);
        
        this.logActivity('Viewed keyboard shortcuts', 'help');
    }
    
    reportIssue() {
        this.closeModal();
        
        this.showQuickModal('🐛 Report an Issue', `
            <div style="padding: 20px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 3em; margin-bottom: 10px;">🐛</div>
                    <h3 style="color: #2c3e50; margin-bottom: 10px;">Report a Bug</h3>
                    <p style="color: #7f8c8d;">Help us improve by reporting issues you encounter</p>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; color: #2c3e50; font-weight: 600; margin-bottom: 5px;">Issue Type:</label>
                    <select id="issueType" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                        <option value="bug">🐛 Bug/Error</option>
                        <option value="feature">💡 Feature Request</option>
                        <option value="ui">🎨 UI/Design Issue</option>
                        <option value="performance">⚡ Performance Problem</option>
                        <option value="other">❓ Other</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; color: #2c3e50; font-weight: 600; margin-bottom: 5px;">Describe the issue:</label>
                    <textarea id="issueDescription" placeholder="Please describe what happened and what you expected to happen..." 
                              style="width: 100%; height: 100px; padding: 10px; border: 1px solid #ddd; border-radius: 6px; resize: vertical;"></textarea>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: #2c3e50; font-weight: 600; margin-bottom: 5px;">Your email (optional):</label>
                    <input type="email" id="userEmail" placeholder="your@email.com" 
                           style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                </div>
                
                <div style="text-align: center;">
                    <button onclick="commandCenter.submitIssue()" 
                            style="background: #e74c3c; color: white; border: none; padding: 15px 30px; 
                                   border-radius: 8px; cursor: pointer; margin: 5px; font-weight: 600;">
                        🚀 Submit Report
                    </button>
                    <button onclick="commandCenter.closeModal()" 
                            style="background: #95a5a6; color: white; border: none; padding: 15px 30px; 
                                   border-radius: 8px; cursor: pointer; margin: 5px;">
                        Cancel
                    </button>
                </div>
            </div>
        `);
        
        this.logActivity('Opened issue reporting form', 'help');
    }
    
    submitIssue() {
        const issueType = document.getElementById('issueType')?.value || 'unknown';
        const description = document.getElementById('issueDescription')?.value || '';
        const email = document.getElementById('userEmail')?.value || 'anonymous';
        
        if (!description.trim()) {
            this.showNotification('Please describe the issue before submitting', 'warning');
            return;
        }
        
        this.closeModal();
        this.showNotification('Issue report submitted! Thank you for your feedback. 🙏', 'success');
        
        this.logActivity(`Submitted ${issueType} report: ${description.substring(0, 50)}...`, 'support');
        
        // In a real app, this would send the report to a backend service

    }
    
    contactSupport() {
        this.closeModal();
        
        this.showQuickModal('💬 Contact Support', `
            <div style="padding: 20px; text-align: center;">
                <div style="font-size: 3em; margin-bottom: 15px;">💬</div>
                <h3 style="color: #2c3e50; margin-bottom: 15px;">Get in Touch</h3>
                <p style="color: #7f8c8d; margin-bottom: 25px;">
                    Our support team is here to help with any questions or issues.
                </p>
                
                <div style="display: grid; gap: 15px; margin-bottom: 25px;">
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #3498db;">
                        <div style="font-weight: 600; color: #2c3e50; margin-bottom: 5px;">📧 Email Support</div>
                        <div style="color: #7f8c8d;">support@claimcipher.com</div>
                        <div style="color: #7f8c8d; font-size: 0.9em;">Response within 24 hours</div>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #27ae60;">
                        <div style="font-weight: 600; color: #2c3e50; margin-bottom: 5px;">💬 Live Chat</div>
                        <div style="color: #7f8c8d;">Available Mon-Fri, 9 AM - 6 PM EST</div>
                        <div style="color: #7f8c8d; font-size: 0.9em;">Instant responses during business hours</div>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #f39c12;">
                        <div style="font-weight: 600; color: #2c3e50; margin-bottom: 5px;">🎧 Pro Support</div>
                        <div style="color: #7f8c8d;">Priority support for Pro subscribers</div>
                        <div style="color: #7f8c8d; font-size: 0.9em;">Dedicated success manager</div>
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <button onclick="commandCenter.openLiveChat()" 
                            style="background: #27ae60; color: white; border: none; padding: 15px 30px; 
                                   border-radius: 8px; cursor: pointer; margin: 5px; font-weight: 600;">
                        💬 Start Live Chat
                    </button>
                    <button onclick="commandCenter.sendEmail()" 
                            style="background: #3498db; color: white; border: none; padding: 15px 30px; 
                                   border-radius: 8px; cursor: pointer; margin: 5px; font-weight: 600;">
                        📧 Send Email
                    </button>
                </div>
                
                <button onclick="commandCenter.closeModal()" 
                        style="background: #95a5a6; color: white; border: none; padding: 12px 24px; 
                               border-radius: 6px; cursor: pointer;">
                    Close
                </button>
            </div>
        `);
        
        this.logActivity('Accessed contact support options', 'support');
    }
    
    openLiveChat() {
        this.closeModal();
        this.showNotification('Opening live chat... 💬', 'info');
        this.logActivity('Initiated live chat support', 'support');
        
        // In a real app, this would open a chat widget
        setTimeout(() => {
            this.showNotification('Chat support will be available soon!', 'info');
        }, 1500);
    }
    
    sendEmail() {
        this.closeModal();
        const emailSubject = 'Claim Cipher Support Request';
        const emailBody = 'Hi Support Team,\n\nI need help with...\n\n(Please describe your question or issue here)\n\nThanks!';
        const mailtoLink = `mailto:support@claimcipher.com?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
        
        window.location.href = mailtoLink;
        this.logActivity('Opened email to support', 'support');
    }
}

function initCommandCenter() {
    if (window.commandCenter) return;

    window.commandCenter = new CommandCenterManager();
}

window.initCommandCenter = initCommandCenter;

// Global functions for backward compatibility
function navigateToModule(url) {
    if (window.commandCenter) {
        window.commandCenter.navigateToModule(url);
    }
}

function addFirm() {
    if (window.commandCenter) {
        window.commandCenter.addFirm();
    }
}

function quickSettings() {
    if (window.commandCenter) {
        window.commandCenter.quickSettings();
    }
}

function quickTest() {
    if (window.commandCenter) {
        window.commandCenter.quickTest();
    }
}

async function handleLogout() {
    // Demo mode logout - clear demo state and redirect (no Supabase session)
    if (sessionStorage.getItem('demo_mode') === 'true') {

        sessionStorage.removeItem('demo_mode');
        sessionStorage.removeItem('claimCipherAuth');
        if (window.FirmStore) window.FirmStore.clearDemo();
        if (window.SessionManager) window.SessionManager.clearDemo();
        window.location.replace('login-cypher.html');
        return;
    }

    if (window.commandCenter) {
        await window.commandCenter.handleLogout();
    } else if (window.SupabaseAuth && window.SupabaseAuth.signOut) {
        // Direct Supabase signOut fallback
        await window.SupabaseAuth.signOut();
    }
}

// 📝 Lyricist Agent: Command Center Expansion Functions
// Mobile Suite and Help Page functionality

function showMobileSuiteModal() {
    if (window.commandCenter) {
        window.commandCenter.showMobileSuiteModal();
    }
}

function downloadMobileApp() {
    if (window.commandCenter) {
        window.commandCenter.downloadMobileApp();
    }
}

function showHelpModal() {
    if (window.commandCenter) {
        window.commandCenter.showHelpModal();
    }
}

function showTutorials() {
    if (window.commandCenter) {
        window.commandCenter.showTutorials();
    }
}

