/**
 * 🧮 MILEAGE CYPHER - Combined Professional Calculator
 * Features: Firm Management, Auto-Distance, Quick Calculate, Copy-Ready Billing
 */

class MileageCypherCalculator {
    constructor() {
        this.settings = this.initializeSettings();
        this.currentCalculation = null;
        this.calculationHistory = [];
        
        this.init();
    }

    init() {
        console.log('🧮 Mileage Cypher Calculator initializing...');
        this.setupEventListeners();
        this.loadFirmsToDropdown();
        this.setupAutoCalculation();
        this.loadUserHomeLocation();
        this.checkForRouteImport();
        console.log('🧮 Mileage Cypher Calculator ready!');
    }

    initializeSettings() {
        const defaultSettings = {
            // Default firms with realistic rates and free miles
            firms: [
                {
                    id: 'sedgwick',
                    name: 'Sedgwick',
                    freeMiles: 50,
                    ratePerMile: 0.67,
                    roundTripDefault: true
                },
                {
                    id: 'acd',
                    name: 'ACD (American Claims & Disposal)',
                    freeMiles: 30,
                    ratePerMile: 0.60,
                    roundTripDefault: false
                },
                {
                    id: 'crawford',
                    name: 'Crawford & Company',
                    freeMiles: 40,
                    ratePerMile: 0.65,
                    roundTripDefault: true
                }
            ],
            // User preferences
            homeLocation: '', // Static starting point for user
            lastSelectedFirmId: 'sedgwick',
            // API configuration
            googleMapsApiKey: window.MILEAGE_CYPHER_CONFIG?.GOOGLE_MAPS_API_KEY || '', // Load from config
            autoCalculateEnabled: true,
            copyFormat: 'detailed' // 'brief', 'detailed', 'custom'
        };

        const saved = localStorage.getItem('mileage_cypher_settings_v2');
        return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    }

    setupEventListeners() {
        // Firm selection
        const firmSelect = document.getElementById('firmSelect');
        if (firmSelect) {
            firmSelect.addEventListener('change', (e) => this.onFirmChange(e.target.value));
        }

        // Calculate button with loading states
        const calculateBtn = document.getElementById('calculateBtn');
        if (calculateBtn) {
            calculateBtn.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Show loading state
                this.showCalculateLoading(true);
                
                // Check if distance field is empty and try auto-calculation first
                const distance = parseFloat(document.getElementById('distanceMiles').value) || 0;
                const pointA = document.getElementById('pointA').value.trim();
                const pointB = document.getElementById('pointB').value.trim();
                
                if (distance <= 0 && pointA && pointB) {
                    console.log('🧮 Calculate button clicked - attempting auto-distance first');
                    this.triggerAutoDistance();
                } else if (distance > 0) {
                    console.log('🧮 Calculate button clicked - distance already set, calculating billing');
                    this.performCalculation();
                } else {
                    console.log('🧮 Calculate button clicked - missing required data');
                    this.showCalculateLoading(false);
                }
            });
        }

        // Copy functionality with success states
        const copyBtn = document.getElementById('copyBtn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyCalculationToClipboard());
        }

        // New calculation
        const newCalcBtn = document.getElementById('newCalculation');
        if (newCalcBtn) {
            newCalcBtn.addEventListener('click', () => this.startNewCalculation());
        }

        // Firm management
        const manageFirmsBtn = document.getElementById('manageFirms');
        if (manageFirmsBtn) {
            manageFirmsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.openFirmsManagementModal();
            });
        }

        // Add firm form
        const addFirmForm = document.getElementById('addFirmForm');
        if (addFirmForm) {
            addFirmForm.addEventListener('submit', (e) => this.handleAddFirm(e));
        }

        // Auto-distance calculation triggers
        const pointBInput = document.getElementById('pointB');
        if (pointBInput) {
            // Trigger on blur (when user clicks away)
            pointBInput.addEventListener('blur', () => {
                setTimeout(() => this.triggerAutoDistance(), 500);
            });
            
            // Trigger on Enter key
            pointBInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.triggerAutoDistance();
                }
            });
            
            // Trigger after user stops typing (debounced)
            let typingTimer;
            pointBInput.addEventListener('input', () => {
                clearTimeout(typingTimer);
                typingTimer = setTimeout(() => {
                    if (pointBInput.value.trim().length > 5) { // Only if decent length address
                        this.triggerAutoDistance();
                    }
                }, 2000); // Wait 2 seconds after user stops typing
            });
        }

        // Distance input for manual entry
        const distanceInput = document.getElementById('distanceMiles');
        if (distanceInput) {
            distanceInput.addEventListener('input', () => {
                if (this.settings.autoCalculateEnabled) {
                    this.debounceAutoCalculate();
                }
            });
        }

        // Round trip checkbox
        const roundTripCheckbox = document.getElementById('roundTrip');
        if (roundTripCheckbox) {
            roundTripCheckbox.addEventListener('change', () => {
                if (this.settings.autoCalculateEnabled) {
                    this.debounceAutoCalculate();
                }
            });
        }

        console.log('🧮 Event listeners configured');
    }

    loadFirmsToDropdown() {
        const select = document.getElementById('firmSelect');
        if (!select) return;

        select.innerHTML = '<option value="">Select your firm...</option>';
        
        this.settings.firms.forEach(firm => {
            const option = document.createElement('option');
            option.value = firm.id;
            option.textContent = `${firm.name} (${firm.freeMiles} free, $${firm.ratePerMile}/mi)`;
            select.appendChild(option);
        });

        // Restore last selected firm
        if (this.settings.lastSelectedFirmId) {
            select.value = this.settings.lastSelectedFirmId;
            this.onFirmChange(this.settings.lastSelectedFirmId);
        }
    }

    loadUserHomeLocation() {
        const pointAInput = document.getElementById('pointA');
        if (pointAInput) {
            if (this.settings.homeLocation) {
                pointAInput.value = this.settings.homeLocation;
                pointAInput.placeholder = 'Your home base location';
            } else {
                // Set a default home location if none exists
                pointAInput.placeholder = 'Enter your home/office address (this will be saved)';
                
                // Save home location when user enters it
                pointAInput.addEventListener('blur', () => {
                    const homeAddress = pointAInput.value.trim();
                    if (homeAddress && homeAddress !== this.settings.homeLocation) {
                        this.settings.homeLocation = homeAddress;
                        this.saveSettings();
                        console.log('🧮 Home location saved:', homeAddress);
                    }
                });
            }
        }
    }

    onFirmChange(firmId) {
        if (!firmId) return;

        const firm = this.settings.firms.find(f => f.id === firmId);
        if (!firm) return;

        // Set round trip default based on firm preference
        const roundTripCheckbox = document.getElementById('roundTrip');
        if (roundTripCheckbox) {
            roundTripCheckbox.checked = firm.roundTripDefault;
        }

        // Save selection
        this.settings.lastSelectedFirmId = firmId;
        this.saveSettings();

        // Auto-calculate if we have all required data
        if (this.settings.autoCalculateEnabled) {
            this.debounceAutoCalculate();
        }

        console.log(`🧮 Firm changed to: ${firm.name}`);
    }

    async triggerAutoDistance() {
        // Check if Google Maps API is available
        const apiKey = window.MILEAGE_CYPHER_CONFIG?.GOOGLE_MAPS_API_KEY;
        
        if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
            console.warn('🧮 No API key configured');
            return;
        }
        
        if (typeof google === 'undefined') {
            console.warn('🧮 Google Maps API not loaded yet');
            return;
        }
        
        console.log('🧮 Triggering auto-distance calculation...');

        const pointA = document.getElementById('pointA').value.trim();
        const pointB = document.getElementById('pointB').value.trim();

        if (!pointA || !pointB) {
            console.log('🧮 Missing addresses - Point A:', pointA, 'Point B:', pointB);
            return;
        }

        console.log('🧮 Calculating distance from:', pointA, 'to:', pointB);
        this.updateDistanceStatus('Calculating distance...', '🔄');

        try {
            await this.calculateDistanceWithGoogleMaps(pointA, pointB);
            this.updateDistanceStatus('Distance calculated', '✅');
        } catch (error) {
            console.error('🧮 Auto-distance calculation failed:', error);
            this.updateDistanceStatus('Enter distance manually', '📝');
        }
    }

    async calculateDistanceWithGoogleMaps(origin, destination) {
        if (typeof google === 'undefined') {
            throw new Error('Google Maps API not loaded');
        }

        const distanceInput = document.getElementById('distanceMiles');
        const originalPlaceholder = distanceInput.placeholder;
        
        distanceInput.placeholder = '🧮 Calculating distance...';
        distanceInput.disabled = true;

        try {
            const service = new google.maps.DistanceMatrixService();
            const result = await new Promise((resolve, reject) => {
                service.getDistanceMatrix({
                    origins: [origin],
                    destinations: [destination],
                    travelMode: google.maps.TravelMode.DRIVING,
                    unitSystem: google.maps.UnitSystem.IMPERIAL,
                    avoidHighways: false,
                    avoidTolls: false
                }, (response, status) => {
                    if (status === 'OK') {
                        const element = response.rows[0].elements[0];
                        if (element.status === 'OK') {
                            const miles = element.distance.value * 0.000621371; // Convert meters to miles
                            resolve(Math.round(miles * 10) / 10); // Round to 1 decimal
                        } else {
                            reject(new Error('Route not found between these locations'));
                        }
                    } else {
                        reject(new Error(`Google Maps API error: ${status}`));
                    }
                });
            });

            distanceInput.value = result;
            console.log('🧮 Distance set to:', result, 'miles');
            
            // Automatically perform the billing calculation
            setTimeout(() => {
                console.log('🧮 Starting automatic billing calculation...');
                this.performCalculation(false); // false = not silent, show results
                this.showCalculateLoading(false); // Hide loading state
            }, 1000); // Small delay to let user see the distance notification

        } finally {
            distanceInput.placeholder = originalPlaceholder;
            distanceInput.disabled = false;
        }
    }

    debounceAutoCalculate() {
        clearTimeout(this.autoCalculateTimeout);
        this.autoCalculateTimeout = setTimeout(() => {
            this.performCalculation(true); // true = silent mode
        }, 1000);
    }

    performCalculation(silentMode = false) {
        console.log('🧮 performCalculation called, silentMode:', silentMode);
        
        const calculationData = this.gatherCalculationInputs();
        console.log('🧮 Calculation data gathered:', calculationData);
        
        if (!this.validateCalculationInputs(calculationData, silentMode)) {
            console.log('🧮 Validation failed, aborting calculation');
            return null;
        }
        
        console.log('🧮 Validation passed, proceeding with calculation');

        try {
            const result = this.calculateMileageBilling(calculationData);
            this.displayCalculationResults(result);
            this.currentCalculation = result;
            
            // Add to history (keep last 10)
            this.calculationHistory.unshift(result);
            if (this.calculationHistory.length > 10) {
                this.calculationHistory = this.calculationHistory.slice(0, 10);
            }

            // Only show success notification for manual calculations (when user clicks button)
            // Auto-calculations don't need success notifications

            console.log('🧮 Calculation completed:', result);
            this.showCalculateLoading(false); // Hide loading state
            return result;

        } catch (error) {
            console.error('🧮 Calculation error:', error);
            this.showCalculateLoading(false); // Hide loading state
            return null;
        }
    }

    gatherCalculationInputs() {
        const firmId = document.getElementById('firmSelect').value;
        const firm = this.settings.firms.find(f => f.id === firmId);
        
        return {
            firm,
            pointA: document.getElementById('pointA').value.trim(),
            pointB: document.getElementById('pointB').value.trim(),
            distance: parseFloat(document.getElementById('distanceMiles').value) || 0,
            roundTrip: document.getElementById('roundTrip').checked,
            note: document.getElementById('noteField').value.trim()
        };
    }

    validateCalculationInputs(data, silentMode = false) {
        if (!data.firm) {
            if (!silentMode) console.warn('🧮 Validation failed: No firm selected');
            return false;
        }

        if (!data.pointA || !data.pointB) {
            if (!silentMode) console.warn('🧮 Validation failed: Missing addresses');
            return false;
        }

        if (data.distance <= 0) {
            if (!silentMode) {
                // If auto-calculation is enabled, try to trigger it first
                if (this.settings.autoCalculateEnabled && data.pointA && data.pointB) {
                    console.log('🧮 Attempting auto-distance calculation...');
                    this.triggerAutoDistance();
                    return false; // Don't proceed yet, let auto-calculation finish
                } else {
                    console.warn('🧮 Validation failed: No valid distance');
                }
            }
            return false;
        }

        return true;
    }

    calculateMileageBilling(data) {
        const { firm, pointA, pointB, distance, roundTrip, note } = data;

        // Core billing calculation
        const baseMiles = distance * (roundTrip ? 2 : 1);
        const billableMiles = Math.max(0, baseMiles - firm.freeMiles);
        const totalFee = billableMiles * firm.ratePerMile;

        return {
            firm,
            route: { from: pointA, to: pointB },
            distance: this.roundTo(distance, 1),
            roundTrip,
            baseMiles: this.roundTo(baseMiles, 1),
            freeMiles: firm.freeMiles,
            billableMiles: this.roundTo(billableMiles, 1),
            ratePerMile: firm.ratePerMile,
            totalFee: this.roundTo(totalFee, 2),
            note,
            timestamp: new Date(),
            calculationId: this.generateCalculationId()
        };
    }

    displayCalculationResults(result) {
        const { firm, route, distance, roundTrip, baseMiles, freeMiles, billableMiles, ratePerMile, totalFee, note } = result;

        const breakdownHtml = `
            <div class="breakdown-item">
                <span class="label">🗺️ Route:</span>
                <span class="value">${route.from} → ${route.to}</span>
            </div>
            <div class="breakdown-item">
                <span class="label">📏 One-way Distance:</span>
                <span class="value">${distance} miles</span>
            </div>
            <div class="breakdown-item">
                <span class="label">🔄 Round Trip:</span>
                <span class="value">${roundTrip ? 'Yes' : 'No'}</span>
            </div>
            <div class="breakdown-item">
                <span class="label">📐 Total Distance:</span>
                <span class="value">${baseMiles} miles</span>
            </div>
            <div class="breakdown-item">
                <span class="label">🎁 Free Miles (${firm.name}):</span>
                <span class="value">${freeMiles} miles</span>
            </div>
            <div class="breakdown-item highlight">
                <span class="label">💰 Billable Miles:</span>
                <span class="value">${billableMiles} miles</span>
            </div>
            <div class="breakdown-item">
                <span class="label">💵 Rate per Mile:</span>
                <span class="value">$${ratePerMile}/mile</span>
            </div>
            <div class="breakdown-item total">
                <span class="label">🧾 Total Billing Fee:</span>
                <span class="value">$${totalFee}</span>
            </div>
            ${note ? `
            <div class="breakdown-item">
                <span class="label">📝 Note:</span>
                <span class="value">${note}</span>
            </div>
            ` : ''}
        `;

        const breakdownContainer = document.getElementById('breakdownDisplay');
        if (breakdownContainer) {
            breakdownContainer.innerHTML = breakdownHtml;
        }

        // Update copy-ready text
        this.updateCopyReadyText(result);

        // Show results section with animation
        const resultsSection = document.getElementById('resultsSection');
        const mileageContainer = document.querySelector('.mileage-container');
        
        if (resultsSection && mileageContainer) {
            // Add classes for side-by-side layout
            mileageContainer.classList.add('has-results');
            resultsSection.style.display = 'block';
            
            // Trigger animation after a small delay
            setTimeout(() => {
                resultsSection.classList.add('show');
            }, 100);
            
            // Smooth scroll to view both containers
            mileageContainer.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start',
                inline: 'nearest'
            });
        }
    }

    updateCopyReadyText(result) {
        const copyTextArea = document.getElementById('copyText');
        if (!copyTextArea) return;

        let copyText = '';
        
        switch (this.settings.copyFormat) {
            case 'brief':
                copyText = this.generateBriefCopyText(result);
                break;
            case 'detailed':
                copyText = this.generateDetailedCopyText(result);
                break;
            default:
                copyText = this.generateDetailedCopyText(result);
        }

        copyTextArea.value = copyText;
    }

    generateBriefCopyText(result) {
        const { baseMiles, billableMiles, totalFee, firm } = result;
        return `${baseMiles} miles - ${firm.freeMiles} free miles = ${billableMiles} billable miles × $${firm.ratePerMile} = $${totalFee}`;
    }

    generateDetailedCopyText(result) {
        const { baseMiles, freeMiles, billableMiles, ratePerMile, totalFee } = result;
        return `${baseMiles} miles - ${freeMiles} free miles = ${billableMiles} billable miles × $${ratePerMile} = $${totalFee}`;
    }

    async copyCalculationToClipboard() {
        const copyText = document.getElementById('copyText').value;
        
        try {
            await navigator.clipboard.writeText(copyText);
            console.log('🧮 Calculation copied to clipboard');
            this.showCopySuccess();
        } catch (error) {
            console.error('🧮 Copy failed:', error);
            
            // Fallback for older browsers
            const textArea = document.getElementById('copyText');
            textArea.select();
            textArea.setSelectionRange(0, 99999);
            
            try {
                document.execCommand('copy');
                console.log('🧮 Calculation copied to clipboard (fallback)');
                this.showCopySuccess();
            } catch (fallbackError) {
                console.error('🧮 Copy failed completely:', fallbackError);
            }
        }
    }

    startNewCalculation() {
        // Clear inputs except firm and home location
        const pointBInput = document.getElementById('pointB');
        const distanceInput = document.getElementById('distanceMiles');
        const noteInput = document.getElementById('noteField');
        
        if (pointBInput) pointBInput.value = '';
        if (distanceInput) distanceInput.value = '';
        if (noteInput) noteInput.value = '';

        // Reset layout and hide results
        const resultsSection = document.getElementById('resultsSection');
        const mileageContainer = document.querySelector('.mileage-container');
        
        if (resultsSection) {
            resultsSection.classList.remove('show');
            setTimeout(() => {
                resultsSection.style.display = 'none';
            }, 300);
        }
        
        if (mileageContainer) {
            mileageContainer.classList.remove('has-results');
        }

        this.currentCalculation = null;

        // Focus on destination input
        if (pointBInput) {
            pointBInput.focus();
        }

        console.log('🧮 New calculation started');
    }

    // Firm Management Functions
    openFirmsManagementModal() {
        this.loadFirmsListInModal();
        const modal = document.getElementById('firmsModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    loadFirmsListInModal() {
        const firmsList = document.getElementById('firmsList');
        if (!firmsList) return;

        firmsList.innerHTML = '';

        this.settings.firms.forEach(firm => {
            const firmElement = document.createElement('div');
            firmElement.className = 'firm-item';
            firmElement.innerHTML = `
                <div class="firm-info">
                    <strong>${firm.name}</strong>
                    <div class="firm-details">
                        Free Miles: ${firm.freeMiles} | Rate: $${firm.ratePerMile}/mile | 
                        Round Trip Default: ${firm.roundTripDefault ? 'Yes' : 'No'}
                    </div>
                </div>
                <div class="firm-actions">
                    <button class="edit-btn" data-firm-id="${firm.id}">✏️ Edit</button>
                    <button class="delete-btn" data-firm-id="${firm.id}">🗑️ Delete</button>
                </div>
            `;
            
            // Add event listeners to the buttons
            const editBtn = firmElement.querySelector('.edit-btn');
            const deleteBtn = firmElement.querySelector('.delete-btn');
            
            editBtn.addEventListener('click', () => this.editFirm(firm.id));
            deleteBtn.addEventListener('click', () => this.deleteFirm(firm.id));
            
            firmsList.appendChild(firmElement);
        });
    }

    handleAddFirm(event) {
        event.preventDefault();
        
        // Check if we're in edit mode
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const editingId = submitBtn?.dataset.editingId;
        
        // Get form field values directly
        const firmData = {
            name: document.getElementById('firmName')?.value?.trim() || '',
            freeMiles: parseInt(document.getElementById('firmFreeMiles')?.value) || 0,
            ratePerMile: parseFloat(document.getElementById('firmRate')?.value) || 0,
            roundTripDefault: document.getElementById('firmRoundTripDefault')?.checked || false
        };
        
        console.log('🧮 Form data collected:', firmData);

        if (!this.validateFirmData(firmData)) return;

        if (editingId) {
            // Edit existing firm
            const firmIndex = this.settings.firms.findIndex(f => f.id === editingId);
            if (firmIndex !== -1) {
                this.settings.firms[firmIndex] = { id: editingId, ...firmData };
                this.saveSettings();
                this.loadFirmsListInModal();
                this.loadFirmsToDropdown();
                this.resetAddFirmForm();
                console.log('🧮 Firm updated:', firmData.name);
            }
        } else {
            // Add new firm
            const firmId = this.generateFirmId(firmData.name);
            
            // Check for duplicates
            if (this.settings.firms.find(f => f.id === firmId)) {
                console.warn('🧮 Duplicate firm name:', firmData.name);
                return;
            }

            const newFirm = { id: firmId, ...firmData };
            this.settings.firms.push(newFirm);
            this.saveSettings();

            // Update UI
            this.loadFirmsListInModal();
            this.loadFirmsToDropdown();
            event.target.reset();

            console.log('🧮 Firm added:', firmData.name);
        }
    }

    editFirm(firmId) {
        console.log('🧮 Edit firm requested for ID:', firmId);
        
        const firm = this.settings.firms.find(f => f.id === firmId);
        if (!firm) {
            console.error('🧮 Firm not found:', firmId);
            return;
        }
        
        // Populate form with existing firm data
        const firmNameInput = document.getElementById('firmName');
        const firmFreeMilesInput = document.getElementById('firmFreeMiles');
        const firmRateInput = document.getElementById('firmRate');
        const firmRoundTripInput = document.getElementById('firmRoundTripDefault');
        
        if (firmNameInput) firmNameInput.value = firm.name;
        if (firmFreeMilesInput) firmFreeMilesInput.value = firm.freeMiles;
        if (firmRateInput) firmRateInput.value = firm.ratePerMile;
        if (firmRoundTripInput) firmRoundTripInput.checked = firm.roundTripDefault;
        
        // Change form to edit mode
        const form = document.getElementById('addFirmForm');
        const submitBtn = form?.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = '✏️ Update Firm';
            submitBtn.dataset.editingId = firmId;
        }
        
        // Add cancel button if not exists
        let cancelBtn = form?.querySelector('.cancel-edit-btn');
        if (!cancelBtn) {
            cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.className = 'cancel-edit-btn cipher-btn cipher-btn--secondary';
            cancelBtn.textContent = '❌ Cancel Edit';
            cancelBtn.addEventListener('click', () => this.resetAddFirmForm());
            submitBtn?.parentNode?.insertBefore(cancelBtn, submitBtn.nextSibling);
        }
        cancelBtn.style.display = 'inline-block';
        
        // Scroll to form
        const addFirmSection = document.querySelector('.add-firm-section');
        if (addFirmSection) {
            addFirmSection.scrollIntoView({ behavior: 'smooth' });
        }
        
        console.log('🧮 Edit mode activated for firm:', firmId, firm.name);
    }

    resetAddFirmForm() {
        const form = document.getElementById('addFirmForm');
        if (form) {
            form.reset();
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.textContent = '➕ Add Firm';
                delete submitBtn.dataset.editingId;
            }
            
            // Hide cancel button
            const cancelBtn = form.querySelector('.cancel-edit-btn');
            if (cancelBtn) {
                cancelBtn.style.display = 'none';
            }
        }
        console.log('🧮 Form reset to add mode');
    }

    validateFirmData(data) {
        if (!data.name || data.name.length < 2) {
            console.warn('🧮 Validation failed: Firm name too short');
            return false;
        }
        if (data.freeMiles < 0 || isNaN(data.freeMiles)) {
            console.warn('🧮 Validation failed: Invalid free miles');
            return false;
        }
        if (data.ratePerMile <= 0 || isNaN(data.ratePerMile)) {
            console.warn('🧮 Validation failed: Invalid rate per mile');
            return false;
        }
        if (data.ratePerMile > 10) {
            console.warn('🧮 Warning: Rate per mile is unusually high:', data.ratePerMile);
        }
        return true;
    }

    deleteFirm(firmId) {
        console.log('🧮 Delete firm requested for ID:', firmId);
        
        if (this.settings.firms.length <= 1) {
            console.warn('🧮 Cannot delete last firm');
            return;
        }

        const firm = this.settings.firms.find(f => f.id === firmId);
        if (!firm) {
            console.error('🧮 Firm not found for deletion:', firmId);
            return;
        }

        // Show confirmation dialog
        const confirmDelete = confirm(`Are you sure you want to delete "${firm.name}"?\n\nThis action cannot be undone.`);
        
        if (confirmDelete) {
            // Remove firm from array
            this.settings.firms = this.settings.firms.filter(f => f.id !== firmId);
            
            // Update selected firm if the deleted firm was selected
            if (this.settings.lastSelectedFirmId === firmId) {
                this.settings.lastSelectedFirmId = this.settings.firms[0]?.id || '';
            }
            
            // Save to localStorage
            this.saveSettings();
            
            // Update UI
            this.loadFirmsListInModal();
            this.loadFirmsToDropdown();
            
            // Reset form if we were editing the deleted firm
            const form = document.getElementById('addFirmForm');
            const submitBtn = form?.querySelector('button[type="submit"]');
            if (submitBtn?.dataset.editingId === firmId) {
                this.resetAddFirmForm();
            }
            
            console.log('🧮 Firm deleted:', firm.name);
            console.log('🧮 Firm deleted:', firmId);
        }
    }

    // Route Import Support
    checkForRouteImport() {
        const routeData = localStorage.getItem('cc_route_export');
        if (routeData) {
            try {
                const data = JSON.parse(routeData);
                if (Date.now() - data.timestamp < 3600000) { // 1 hour validity
                    this.offerRouteImport(data);
                } else {
                    localStorage.removeItem('cc_route_export');
                }
            } catch (error) {
                console.error('🧮 Route import error:', error);
                localStorage.removeItem('cc_route_export');
            }
        }
    }

    offerRouteImport(routeData) {
        const modal = document.getElementById('routeImportModal');
        if (modal) {
            const dataContainer = document.getElementById('routeImportData');
            if (dataContainer) {
                dataContainer.innerHTML = `
                    <p><strong>Distance:</strong> ${routeData.distance} miles</p>
                    <p><strong>Route:</strong> ${routeData.route.overall.miles} total miles across ${routeData.route.days.length} day(s)</p>
                `;
            }
            modal.style.display = 'flex';
            this.pendingRouteImport = routeData;
        }
    }

    importFromRoute() {
        if (!this.pendingRouteImport) return;

        const distanceInput = document.getElementById('distanceMiles');
        if (distanceInput) {
            distanceInput.value = this.pendingRouteImport.distance;
        }

        // Import route points if available
        if (this.pendingRouteImport.route.days[0]?.stops) {
            const stops = this.pendingRouteImport.route.days[0].stops;
            const pointBInput = document.getElementById('pointB');
            if (pointBInput && stops.length > 1) {
                pointBInput.value = this.shortenAddress(stops[stops.length - 1]);
            }
        }

        this.closeRouteImportModal();
        
        if (this.settings.autoCalculateEnabled) {
            this.debounceAutoCalculate();
        }

        localStorage.removeItem('cc_route_export');
        this.pendingRouteImport = null;
        
        console.log('🧮 Route data imported successfully');
    }

    closeRouteImportModal() {
        const modal = document.getElementById('routeImportModal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.pendingRouteImport = null;
    }

    // Utility Functions
    roundTo(value, decimals) {
        const multiplier = Math.pow(10, decimals);
        return Math.round(value * multiplier) / multiplier;
    }

    generateFirmId(name) {
        return name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    }

    generateCalculationId() {
        return 'calc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    }

    shortenAddress(address) {
        return address.length <= 40 ? address : address.substring(0, 37) + '...';
    }

    saveSettings() {
        try {
            localStorage.setItem('mileage_cypher_settings_v2', JSON.stringify(this.settings));
            console.log('🧮 Settings saved to localStorage:', this.settings.firms.length, 'firms');
        } catch (error) {
            console.error('🧮 Failed to save settings:', error);
        }
    }

    // UI State Management Functions
    showCalculateLoading(show) {
        const calculateBtn = document.getElementById('calculateBtn');
        if (!calculateBtn) return;
        
        const btnText = calculateBtn.querySelector('.btn-text');
        const btnLoading = calculateBtn.querySelector('.btn-loading');
        
        if (show) {
            calculateBtn.disabled = true;
            if (btnText) btnText.style.display = 'none';
            if (btnLoading) btnLoading.style.display = 'flex';
        } else {
            calculateBtn.disabled = false;
            if (btnText) btnText.style.display = 'inline';
            if (btnLoading) btnLoading.style.display = 'none';
        }
    }

    showCopySuccess() {
        const copyBtn = document.getElementById('copyBtn');
        if (!copyBtn) return;
        
        const btnText = copyBtn.querySelector('.btn-text');
        const btnSuccess = copyBtn.querySelector('.btn-success');
        
        if (btnText && btnSuccess) {
            btnText.style.display = 'none';
            btnSuccess.style.display = 'flex';
            
            setTimeout(() => {
                btnText.style.display = 'inline';
                btnSuccess.style.display = 'none';
            }, 2000);
        }
    }

    updateDistanceStatus(status, icon = '🎯') {
        const distanceStatus = document.getElementById('distanceStatus');
        if (distanceStatus) {
            const statusIcon = distanceStatus.querySelector('.status-icon');
            if (statusIcon) statusIcon.textContent = icon;
            distanceStatus.innerHTML = `<span class="status-icon">${icon}</span>${status}`;
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `toast toast-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()" class="toast-close">×</button>
        `;
        
        const container = document.getElementById('toastContainer');
        if (container) {
            container.appendChild(notification);
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 5000);
        } else {
            // Fallback to console if no toast container
            console.log(`🧮 ${type.toUpperCase()}: ${message}`);
        }
    }
}

// Global Functions for HTML onclick handlers
function closeFirmsModal() {
    const modal = document.getElementById('firmsModal');
    if (modal) modal.style.display = 'none';
}

function closeRouteImportModal() {
    if (window.mileageCalculator) {
        window.mileageCalculator.closeRouteImportModal();
    }
}

function handleLogout() {
    // Placeholder for logout functionality
    console.log('🧮 Logout requested');
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if API configuration is available
    if (window.MILEAGE_CYPHER_CONFIG?.GOOGLE_MAPS_API_KEY) {
        const apiKey = window.MILEAGE_CYPHER_CONFIG.GOOGLE_MAPS_API_KEY;
        if (apiKey !== 'YOUR_API_KEY_HERE') {
            console.log('🧮 Google Maps API key configured for auto-distance calculation');
        } else {
            console.warn('🧮 Google Maps API key needs to be set in config/api-config.js');
        }
    } else {
        console.warn('🧮 API configuration not found - manual distance entry only');
    }
    
    // Initialize the calculator
    window.mileageCalculator = new MileageCypherCalculator();
    
    console.log('🧮 Mileage Cypher Calculator fully loaded and ready!');
});

// Export for global access
window.MileageCypherCalculator = MileageCypherCalculator;