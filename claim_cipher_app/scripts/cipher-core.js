// 🎤 Cipher Core JavaScript Functions
// Shared utilities for the hip-hop professional cipher experience

// Initialize cipher user context across all pages
function initializeCipherUserContext() {
    const isDemoMode = sessionStorage.getItem('demo_mode') === 'true';
    const userEmail = localStorage.getItem('cipher_user_email') || 'demo@claimcipher.com';
    const userName = isDemoMode ? 'Demo User' : userEmail.split('@')[0];
    
    // Set user type attribute on body
    document.body.setAttribute('data-cipher-user-type', userType);
    
    // Update user display elements
    const userNameEl = document.getElementById('user-name');
    const userRoleEl = document.getElementById('user-role');
    const userAvatarEl = document.getElementById('user-avatar');
    
    if (userNameEl) userNameEl.textContent = userName;
    if (userRoleEl) userRoleEl.textContent = isDemoMode ? 'Demo Mode' : 'Free User';
    if (userAvatarEl) userAvatarEl.textContent = userName.substring(0, 2).toUpperCase();
    
    // Show demo notice if needed
    if (isDemoMode) {
        const demoNotice = document.getElementById('demo-notice');
        if (demoNotice) {
            demoNotice.style.display = 'flex';
        }
    }
    

}

function applyBillingRole(detail) {
    const isDemoMode = sessionStorage.getItem('demo_mode') === 'true';
    const userRoleEl = document.getElementById('user-role');
    if (!userRoleEl) return;
    if (isDemoMode) {
        userRoleEl.textContent = 'Demo Mode';
        return;
    }
    if (detail?.tier === 'pro') {
        userRoleEl.textContent = 'Pro User';
        return;
    }
    if (detail?.tier === 'basic') {
        userRoleEl.textContent = 'Basic User';
        return;
    }
    userRoleEl.textContent = 'Free User';
}

// Setup logout handler
function setupCipherLogoutHandler() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {

            
            // Clear all cipher session data
            localStorage.removeItem('cipher_authenticated');
            localStorage.removeItem('cipher_user_type');
            localStorage.removeItem('cipher_user_email');
            localStorage.removeItem('cipher_demo_start_time');
            localStorage.removeItem('cipher_demo_expiry');
            localStorage.removeItem('cipher_remember_me');
            
            // Redirect to login
            window.location.href = './login-cypher.html';
        });
    }
}

// Animate numbers for stats
function animateCipherNumber(element, targetValue, isCurrency = false, duration = 1000) {
    const startValue = 0;
    const increment = targetValue / (duration / 16); // 60 FPS
    let currentValue = startValue;
    
    const timer = setInterval(() => {
        currentValue += increment;
        
        if (currentValue >= targetValue) {
            currentValue = targetValue;
            clearInterval(timer);
        }
        
        const displayValue = isCurrency 
            ? `$${Math.floor(currentValue).toLocaleString()}` 
            : Math.floor(currentValue).toLocaleString();
            
        element.textContent = displayValue;
    }, 16);
}

// Show cipher notification
function showCipherNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `cipher-notification cipher-notification--${type}`;
    
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
    notification.innerHTML = `
        <span class="cipher-notification-icon">${icon}</span>
        <span class="cipher-notification-message">${message}</span>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Position and show
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--cipher-bg-secondary);
        color: var(--cipher-text-primary);
        padding: var(--cipher-space-md);
        border-radius: var(--cipher-radius-md);
        border: 1px solid var(--cipher-${type === 'info' ? 'electric-blue' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'danger'});
        display: flex;
        align-items: center;
        gap: var(--cipher-space-sm);
        z-index: 9999;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto remove
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, duration);
}

// Format relative time
function formatCipherTime(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
}

// Generate sample data for demo mode
function generateCipherDemoData() {
    return {
        stats: {
            miles: Math.floor(Math.random() * 500) + 100,
            routes: Math.floor(Math.random() * 30) + 5,
            jobs: Math.floor(Math.random() * 100) + 20,
            earnings: Math.floor(Math.random() * 3000) + 1000
        },
        jobs: [
            {
                id: 1,
                claimNumber: 'CLM-2024-001',
                insured: 'John Smith',
                address: '123 Main St, Atlanta, GA',
                status: 'scheduled',
                priority: 'high',
                created: new Date(Date.now() - 86400000) // 1 day ago
            },
            {
                id: 2,
                claimNumber: 'CLM-2024-002',
                insured: 'Jane Doe',
                address: '456 Oak Ave, Decatur, GA',
                status: 'in-progress',
                priority: 'medium',
                created: new Date(Date.now() - 172800000) // 2 days ago
            }
        ],
        routes: [
            {
                id: 1,
                name: 'Downtown Route',
                date: 'Aug 9',
                stops: 8,
                miles: 47,
                hours: 3.2,
                status: 'completed'
            },
            {
                id: 2,
                name: 'Northside Loop',
                date: 'Aug 8',
                stops: 12,
                miles: 63,
                hours: 4.1,
                status: 'completed'
            }
        ]
    };
}

// Global logout function for onclick handlers
// Delegates to Supabase Auth if available (proper session termination)
async function handleLogout() {


    // Demo mode logout - clear demo state and redirect (no Supabase session)
    if (sessionStorage.getItem('demo_mode') === 'true') {

        sessionStorage.removeItem('demo_mode');
        sessionStorage.removeItem('claimCipherAuth');
        if (window.FirmStore) window.FirmStore.clearDemo();
        if (window.SessionManager) window.SessionManager.clearDemo();
        localStorage.removeItem('cc_recent_activities');
        window.location.replace('login-cypher.html');
        return;
    }

    // Use Supabase Auth signOut if available (MUST be awaited)
    if (window.SupabaseAuth && window.SupabaseAuth.signOut) {

        await window.SupabaseAuth.signOut();
        // signOut() handles redirect internally after session termination
        return;
    }

    // Fallback: Clear localStorage and redirect (legacy mode only)

    localStorage.removeItem('cipher_authenticated');
    localStorage.removeItem('cipher_user_type');
    localStorage.removeItem('cipher_user_email');
    localStorage.removeItem('cipher_demo_start_time');
    localStorage.removeItem('cipher_demo_expiry');
    localStorage.removeItem('cipher_remember_me');
    sessionStorage.removeItem('claimCipherAuth');

    // Redirect to login
    window.location.href = './login-cypher.html';
}

// Export functions globally
window.initializeCipherUserContext = initializeCipherUserContext;
window.applyBillingRole = applyBillingRole;
window.setupCipherLogoutHandler = setupCipherLogoutHandler;
window.animateCipherNumber = animateCipherNumber;
window.showCipherNotification = showCipherNotification;
window.formatCipherTime = formatCipherTime;
window.generateCipherDemoData = generateCipherDemoData;
window.handleLogout = handleLogout;



// ─── NAV USER NAME + BUSINESS — auto-runs on every page ────────────────────
// Reads the user's profile from Supabase profiles table and updates:
//   #userName         → first_name + last_name (or email prefix fallback)
//   #userBusinessName → company (hidden if empty)
(async function updateNavUserDisplay() {
    const nameEl = document.getElementById('userName');
    const bizEl  = document.getElementById('userBusinessName');
    if (!nameEl) return;

    // Demo mode
    if (sessionStorage.getItem('demo_mode') === 'true') {
        nameEl.textContent = 'Demo User';
        if (bizEl) { bizEl.textContent = 'Demo Appraisal Co.'; }
        return;
    }

    if (!window.SupabaseAuth) return;

    try {
        const sb = window.SupabaseAuth.init();
        if (!sb) return;
        const { data: { user } } = await sb.auth.getUser();
        if (!user) return;

        // Read from profiles table (where Settings page saves)
        let profile = null;
        const { data } = await sb
            .from('profiles')
            .select('first_name, last_name, company')
            .eq('id', user.id)
            .maybeSingle();
        profile = data;

        // Fall back to user_id if id didn't match
        if (!profile) {
            const { data: d2 } = await sb
                .from('profiles')
                .select('first_name, last_name, company')
                .eq('user_id', user.id)
                .maybeSingle();
            profile = d2;
        }

        // User name: first + last, fall back to email prefix
        const fullName = profile
            ? [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim()
            : '';
        const email = user.email || '';
        nameEl.textContent = fullName
            || email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
            || 'Professional User';

        // Business name
        const company = (profile?.company || '').trim();
        if (bizEl) {
            if (company) {
                bizEl.textContent = company;
                bizEl.style.display = '';
            } else {
                bizEl.textContent = '';
                bizEl.style.display = 'none';
            }
        }
    } catch (e) {
        // Silently fail — hardcoded fallback stays visible
    }
})();