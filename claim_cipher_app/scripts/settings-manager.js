/**
 * Settings Manager - Claim Cipher
 * Comprehensive settings management system
 */

class SettingsManager {
    constructor() {
        this.settingsKey = 'claim_cipher_settings';
        this.defaultSettings = {
            // Profile
            displayName: 'Demo User',
            userEmail: 'demo@claimcipher.com',
            licenseNumber: 'DEMO-2024',
            homeBaseLocation: '',

            // Calendar & Scheduling
            calendarSystem: 'mobile',
            defaultAppointmentDuration: 30,
            workingHoursStart: '08:00',
            workingHoursEnd: '17:00',
            enableWeekends: false,

            // Route Optimization
            territoryType: 'mixed',
            maxDailyHours: 8,
            maxStopsPerDay: 6,
            maxLegMiles: 50,
            enableGeographicClustering: true,

            // Mileage Calculator
            defaultMileageRate: 0.67,
            measurementUnits: 'miles',
            roundTripDefault: false,
            autoSaveCalculations: true,

            // Firms & Billing
            defaultFirm: '',
            invoiceFormat: 'standard',
            currencyFormat: 'usd',

            // App Preferences
            appTheme: 'dark',
            defaultView: 'dashboard',
            enableNotifications: true,
            autoLogoutTime: 30,

            // Data & Security
            enableCloudSync: true,
            enableLocationTracking: true,
            enableDataEncryption: true
        };

        this.init();
    }

    init() {
        this.loadSettings();
        this.setupEventListeners();
        this.populateFormFields();
    }

    setupEventListeners() {
        // Save settings button
        const saveBtn = document.getElementById('saveSettingsBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveSettings());
        }

        // Reset to defaults button
        const resetBtn = document.getElementById('resetToDefaultsBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetToDefaults());
        }

        // Data management buttons
        document.getElementById('exportDataBtn')?.addEventListener('click', () => this.exportData());
        document.getElementById('importDataBtn')?.addEventListener('click', () => this.importData());
        document.getElementById('clearCacheBtn')?.addEventListener('click', () => this.clearCache());
        document.getElementById('resetAllBtn')?.addEventListener('click', () => this.resetAll());

        // Auto-save on critical changes
        const criticalFields = ['calendarSystem', 'territoryType', 'homeBaseLocation'];
        criticalFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('change', () => {
                    this.saveSettings();
                    this.showNotification(`${fieldId} updated automatically`, 'success');
                });
            }
        });
    }

    loadSettings() {
        const stored = localStorage.getItem(this.settingsKey);
        if (stored) {
            try {
                this.settings = { ...this.defaultSettings, ...JSON.parse(stored) };
            } catch (error) {
                console.warn('Failed to parse stored settings, using defaults');
                this.settings = { ...this.defaultSettings };
            }
        } else {
            this.settings = { ...this.defaultSettings };
        }
    }

    populateFormFields() {
        Object.keys(this.settings).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = this.settings[key];
                } else {
                    element.value = this.settings[key];
                }
            }
        });
    }

    gatherFormData() {
        const formData = {};
        
        Object.keys(this.defaultSettings).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    formData[key] = element.checked;
                } else if (element.type === 'number') {
                    formData[key] = parseFloat(element.value) || this.defaultSettings[key];
                } else {
                    formData[key] = element.value || this.defaultSettings[key];
                }
            }
        });

        return formData;
    }

    saveSettings() {
        try {
            const formData = this.gatherFormData();
            this.settings = { ...this.settings, ...formData };
            
            localStorage.setItem(this.settingsKey, JSON.stringify(this.settings));
            
            // Update other systems
            this.updateRouteOptimizerSettings();
            this.updateMileageCalculatorSettings();
            
            this.showNotification('Settings saved successfully!', 'success');
            
            console.log('✅ Settings saved:', this.settings);
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.showNotification('Failed to save settings', 'error');
        }
    }

    updateRouteOptimizerSettings() {
        // Update route optimizer if it exists
        if (window.routeOptimizer) {
            console.log('🗺️ Updating route optimizer settings');
            // The route optimizer will read from settings on next optimization
        }

        // Update starting location if set
        if (this.settings.homeBaseLocation) {
            const startLocationField = document.getElementById('startLocation');
            if (startLocationField && !startLocationField.value) {
                startLocationField.value = this.settings.homeBaseLocation;
            }
        }
    }

    updateMileageCalculatorSettings() {
        // Update mileage calculator settings if it exists
        if (window.mileageCalculator) {
            console.log('🧮 Updating mileage calculator settings');
            // The mileage calculator will read from settings on next calculation
        }
    }

    resetToDefaults() {
        if (confirm('Reset all settings to defaults? This cannot be undone.')) {
            this.settings = { ...this.defaultSettings };
            localStorage.setItem(this.settingsKey, JSON.stringify(this.settings));
            this.populateFormFields();
            this.showNotification('Settings reset to defaults', 'info');
        }
    }

    exportData() {
        try {
            const exportData = {
                settings: this.settings,
                routeHistory: JSON.parse(localStorage.getItem('cc_route_history') || '[]'),
                mileageHistory: JSON.parse(localStorage.getItem('cc_mileage_history') || '[]'),
                firms: JSON.parse(localStorage.getItem('cc_firms') || '[]'),
                exportDate: new Date().toISOString(),
                version: '1.0'
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `claim-cipher-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();

            this.showNotification('Data exported successfully!', 'success');
        } catch (error) {
            console.error('Export failed:', error);
            this.showNotification('Export failed', 'error');
        }
    }

    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importData = JSON.parse(e.target.result);
                    
                    if (importData.settings) {
                        this.settings = { ...this.defaultSettings, ...importData.settings };
                        localStorage.setItem(this.settingsKey, JSON.stringify(this.settings));
                        this.populateFormFields();
                    }

                    if (importData.routeHistory) {
                        localStorage.setItem('cc_route_history', JSON.stringify(importData.routeHistory));
                    }

                    if (importData.mileageHistory) {
                        localStorage.setItem('cc_mileage_history', JSON.stringify(importData.mileageHistory));
                    }

                    if (importData.firms) {
                        localStorage.setItem('cc_firms', JSON.stringify(importData.firms));
                    }

                    this.showNotification('Data imported successfully!', 'success');
                } catch (error) {
                    console.error('Import failed:', error);
                    this.showNotification('Invalid import file', 'error');
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }

    clearCache() {
        if (confirm('Clear all cached data? This will not affect saved settings.')) {
            // Clear non-essential cached data
            const keysToKeep = [this.settingsKey, 'cipher_authenticated'];
            const allKeys = Object.keys(localStorage);
            
            allKeys.forEach(key => {
                if (!keysToKeep.includes(key)) {
                    localStorage.removeItem(key);
                }
            });
            
            this.showNotification('Cache cleared successfully', 'info');
        }
    }

    resetAll() {
        if (confirm('⚠️ DANGER: This will delete ALL data including settings, history, and firms. Are you absolutely sure?')) {
            if (confirm('This action cannot be undone. Click OK to proceed with complete reset.')) {
                localStorage.clear();
                this.showNotification('All data has been reset', 'warning');
                setTimeout(() => {
                    window.location.href = 'login-cypher.html';
                }, 2000);
            }
        }
    }

    // Get a specific setting value
    getSetting(key) {
        return this.settings[key];
    }

    // Set a specific setting value
    setSetting(key, value) {
        this.settings[key] = value;
        localStorage.setItem(this.settingsKey, JSON.stringify(this.settings));
    }

    // Get calendar system preference
    getCalendarSystem() {
        return this.getSetting('calendarSystem') || 'mobile';
    }

    // Get territory type
    getTerritoryType() {
        return this.getSetting('territoryType') || 'mixed';
    }

    // Get home base location
    getHomeBaseLocation() {
        return this.getSetting('homeBaseLocation') || '';
    }

    showNotification(message, type = 'info') {
        // Simple notification system
        const notification = document.createElement('div');
        notification.className = `cipher-notification cipher-notification--${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--cipher-bg-secondary);
            color: var(--cipher-text-primary);
            padding: 12px 20px;
            border-radius: var(--cipher-radius-md);
            border-left: 4px solid ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : type === 'warning' ? '#F59E0B' : '#3B82F6'};
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Global instance
window.settingsManager = new SettingsManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SettingsManager;
}