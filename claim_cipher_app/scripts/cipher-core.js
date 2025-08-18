// 🎤 Cipher Core JavaScript Functions
// Shared utilities for the hip-hop professional cipher experience

// Initialize cipher user context across all pages
function initializeCipherUserContext() {
    const userType = localStorage.getItem('cipher_user_type') || 'demo';
    const userEmail = localStorage.getItem('cipher_user_email') || 'demo@claimcipher.com';
    const userName = userType === 'demo' ? 'Demo User' : userEmail.split('@')[0];
    
    // Set user type attribute on body
    document.body.setAttribute('data-cipher-user-type', userType);
    
    // Update user display elements
    const userNameEl = document.getElementById('user-name');
    const userRoleEl = document.getElementById('user-role');
    const userAvatarEl = document.getElementById('user-avatar');
    
    if (userNameEl) userNameEl.textContent = userName;
    if (userRoleEl) userRoleEl.textContent = userType === 'demo' ? 'Demo Mode' : 'Pro User';
    if (userAvatarEl) userAvatarEl.textContent = userName.substring(0, 2).toUpperCase();
    
    // Show demo notice if needed
    if (userType === 'demo') {
        const demoNotice = document.getElementById('demo-notice');
        if (demoNotice) {
            demoNotice.style.display = 'flex';
        }
    }
    
    console.log(`🎤 Cipher user context initialized: ${userType}`);
}

// Setup logout handler
function setupCipherLogoutHandler() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            console.log('🚪 User signing out of cipher');
            
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
function handleLogout() {
    console.log('🚪 User signing out of cipher');
    
    // Clear all cipher session data
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
window.setupCipherLogoutHandler = setupCipherLogoutHandler;
window.animateCipherNumber = animateCipherNumber;
window.showCipherNotification = showCipherNotification;
window.formatCipherTime = formatCipherTime;
window.generateCipherDemoData = generateCipherDemoData;
window.handleLogout = handleLogout;

console.log('🎤 Cipher Core JavaScript loaded - No Matter What!');