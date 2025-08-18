// ✍️ Enhanced Content and Hip-Hop Messaging System

const cipherMessages = {
    help: {
        login: "Drop your credentials here to enter the cipher, no matter what!",
        mileage: "Calculate your reimbursement like a boss - every mile counts in the game!",
        routes: "Optimize your path through the streets - work smarter, not harder!",
        jobs: "Manage your hustle like a professional - track every job, every dollar!",
        firms: "Keep your insurance company contacts tight - relationships matter in this game!"
    },
    
    errors: {
        login_failed: "Yo, those credentials ain't hitting right. Check your email and password, then try again!",
        network_error: "Network's acting up - stay cool, we'll get you back online soon!",
        validation_error: "Hold up! Make sure all your info is correct before we proceed.",
        session_expired: "Your session timed out - happens to the best of us. Just log back in!",
        permission_denied: "You don't have access to that area yet - keep grinding to unlock it!"
    },
    
    success: {
        login: "Welcome to the cipher! You're now in the zone - let's get this money!",
        trip_added: "Trip added to your roster! That's more money in your pocket!",
        route_optimized: "Route optimized like a pro! Time to hit the streets efficiently!",
        job_completed: "Job completed! Another one in the books - keep that momentum going!",
        data_saved: "Data locked and loaded! Your progress is secure, no matter what!"
    },
    
    onboarding: {
        welcome: "Welcome to Claim Cipher - where insurance adjusters level up their game!",
        step1: "First, let's get you logged in to access your personal cipher dashboard",
        step2: "Explore your command center - this is where you track your hustle",
        step3: "Use Mileage Cypher to calculate reimbursements like a professional",
        step4: "Route Cypher helps you optimize your daily grind for maximum efficiency",
        step5: "Jobs Studio keeps your workflow organized and your money flowing"
    }
};

function initializeCipherContent() {
    console.log('✍️ Initializing Cipher Content System...');
    
    addHelpTooltips();
    enhanceErrorMessages();
    addOnboardingFlow();
    addEmptyStateMessages();
}

function addHelpTooltips() {
    // Add help tooltips throughout the application
    const helpElements = [
        { selector: '#cipher-email', message: cipherMessages.help.login },
        { selector: '.mileage-cipher-table', message: cipherMessages.help.mileage },
        { selector: '.route-cipher-optimizer', message: cipherMessages.help.routes },
        { selector: '.jobs-cipher-list', message: cipherMessages.help.jobs }
    ];
    
    helpElements.forEach(({ selector, message }) => {
        const element = document.querySelector(selector);
        if (element) {
            const helpIcon = document.createElement('span');
            helpIcon.className = 'cipher-help-icon';
            helpIcon.innerHTML = '?';
            helpIcon.title = message;
            helpIcon.style.cssText = `
                display: inline-block;
                width: 20px;
                height: 20px;
                background: rgba(0, 191, 255, 0.2);
                border-radius: 50%;
                text-align: center;
                line-height: 20px;
                font-size: 0.8rem;
                color: #00BFFF;
                cursor: help;
                margin-left: 0.5rem;
            `;
            
            element.parentNode.insertBefore(helpIcon, element.nextSibling);
        }
    });
}

function enhanceErrorMessages() {
    // Override default error handling with hip-hop professional messages
    window.showCipherError = function(type) {
        const message = cipherMessages.errors[type] || cipherMessages.errors.validation_error;
        showCipherNotification(message, 'error');
    };
    
    window.showCipherSuccess = function(type) {
        const message = cipherMessages.success[type] || cipherMessages.success.data_saved;
        showCipherNotification(message, 'success');
    };
}

function addOnboardingFlow() {
    // Check if user is demo user and hasn't completed onboarding
    const authData = sessionStorage.getItem('claimCipherAuth');
    const isDemoUser = authData && JSON.parse(authData).type === 'demo';
    
    if (isDemoUser && localStorage.getItem('cipher_onboarding_complete') !== 'true') {
        showOnboardingModal();
    }
}

function showOnboardingModal() {
    const modal = document.createElement('div');
    modal.className = 'cipher-modal cipher-onboarding-modal';
    modal.innerHTML = `
        <div class="cipher-modal-content">
            <div class="cipher-modal-header">
                <h3>🎤 Welcome to the Cipher!</h3>
            </div>
            <div class="cipher-modal-body">
                <div class="onboarding-step" id="onboarding-step">
                    <h4>${cipherMessages.onboarding.welcome}</h4>
                    <p>${cipherMessages.onboarding.step1}</p>
                </div>
            </div>
            <div class="cipher-modal-footer">
                <button class="cipher-btn cipher-btn--ghost" id="skip-onboarding">Skip Tour</button>
                <button class="cipher-btn cipher-btn--primary" id="start-onboarding">Let's Go!</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('skip-onboarding').addEventListener('click', () => {
        localStorage.setItem('cipher_onboarding_complete', 'true');
        modal.remove();
    });
    
    document.getElementById('start-onboarding').addEventListener('click', () => {
        localStorage.setItem('cipher_onboarding_complete', 'true');
        modal.remove();
        showCipherNotification('Welcome to your cipher journey!', 'success');
    });
}

function addEmptyStateMessages() {
    // Enhanced empty state messages with hip-hop flair
    const emptyStates = document.querySelectorAll('.empty-cipher-icon');
    emptyStates.forEach(emptyState => {
        const container = emptyState.parentNode;
        if (container) {
            const enhancedMessage = document.createElement('div');
            enhancedMessage.innerHTML = `
                <h4>Ready to level up your game?</h4>
                <p>This section is waiting for your data to make it shine!</p>
                <p>Start adding your information and watch the magic happen.</p>
            `;
            container.appendChild(enhancedMessage);
        }
    });
}

// Export functions
window.initializeCipherContent = initializeCipherContent;
window.cipherMessages = cipherMessages;

console.log('✍️ Cipher Content System loaded - messages on point!');