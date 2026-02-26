// 🧭 Enhanced Navigation with Active States and Mobile Support

function initializeEnhancedNavigation() {

    
    setupMobileToggle();
    setupActiveStates();
    setupBreadcrumbs();
    setupPageTransitions();
}

function setupMobileToggle() {
    // Create mobile toggle button
    const mobileToggle = document.createElement('button');
    mobileToggle.className = 'cipher-mobile-toggle';
    mobileToggle.innerHTML = '☰';
    mobileToggle.id = 'mobile-nav-toggle';
    
    document.body.appendChild(mobileToggle);
    
    mobileToggle.addEventListener('click', function() {
        const sidebar = document.getElementById('cipher-sidebar');
        if (sidebar) {
            sidebar.classList.toggle('open');
            this.innerHTML = sidebar.classList.contains('open') ? '✕' : '☰';
        }
    });
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(e) {
        const sidebar = document.getElementById('cipher-sidebar');
        const toggle = document.getElementById('mobile-nav-toggle');
        
        if (window.innerWidth <= 768 && 
            sidebar && 
            !sidebar.contains(e.target) && 
            !toggle.contains(e.target) &&
            sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
            toggle.innerHTML = '☰';
        }
    });
}

function setupActiveStates() {
    // Update active states based on current page
    const currentPage = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('.sidebar-cipher-nav-link');
    
    navLinks.forEach(link => {
        link.classList.remove('sidebar-cipher-nav-link--active');
        
        const linkHref = link.getAttribute('href');
        if (linkHref && linkHref.includes(currentPage)) {
            link.classList.add('sidebar-cipher-nav-link--active');
        }
    });
}

function setupBreadcrumbs() {
    const breadcrumbContainer = document.createElement('div');
    breadcrumbContainer.className = 'cipher-breadcrumbs';
    
    const pageTitle = document.querySelector('.page-cipher-title');
    if (pageTitle) {
        const currentPage = window.location.pathname.split('/').pop();
        let breadcrumbText = '';
        
        switch(currentPage) {
            case 'login-cypher.html':
                breadcrumbText = '<a href="./index.html" class="cipher-breadcrumb-link">Home</a> <span class="cipher-breadcrumb-separator">></span> Login';
                break;
            case 'command-center.html':
                breadcrumbText = '<a href="./index.html" class="cipher-breadcrumb-link">Home</a> <span class="cipher-breadcrumb-separator">></span> Command Center';
                break;
            case 'mileage-cypher.html':
                breadcrumbText = '<a href="./command-center.html" class="cipher-breadcrumb-link">Dashboard</a> <span class="cipher-breadcrumb-separator">></span> Mileage Cypher';
                break;
            case 'route-cypher.html':
                breadcrumbText = '<a href="./command-center.html" class="cipher-breadcrumb-link">Dashboard</a> <span class="cipher-breadcrumb-separator">></span> Route Cypher';
                break;
            case 'jobs-studio.html':
                breadcrumbText = '<a href="./command-center.html" class="cipher-breadcrumb-link">Dashboard</a> <span class="cipher-breadcrumb-separator">></span> Jobs Studio';
                break;
            default:
                breadcrumbText = '<a href="./command-center.html" class="cipher-breadcrumb-link">Dashboard</a>';
        }
        
        breadcrumbContainer.innerHTML = breadcrumbText;
        pageTitle.parentNode.insertBefore(breadcrumbContainer, pageTitle);
    }
}

function setupPageTransitions() {
    // Add page transition class to main content
    const mainContent = document.querySelector('.main-cipher-content');
    if (mainContent) {
        mainContent.classList.add('page-transition');
    }
}

// Export functions
window.initializeEnhancedNavigation = initializeEnhancedNavigation;

