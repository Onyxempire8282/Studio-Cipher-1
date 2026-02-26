// Total Loss Security Validation
class TotalLossSecurityValidator {
    constructor() {
        this.requiredFields = [
            'officeId', 'claimNumber', 'year', 'make', 'model',
            'adjusterLastName', 'insuredLastName', 'ownerLastName',
            'lossZipCode', 'lossState', 'dateOfLoss', 'typeOfLoss',
            'lossCategory', 'odometer', 'transmission'
        ];
        this.init();
    }

    init() {


    }

    validateVIN(vin) {
        // VIN validation for 17 characters
        const vinPattern = /^[A-HJ-NPR-Z0-9]{17}$/i;
        return vinPattern.test(vin);
    }

    validateZipCode(zip) {
        // ZIP code validation
        const zipPattern = /^\d{5}(-\d{4})?$/;
        return zipPattern.test(zip);
    }

    validateDate(dateString) {
        // Date validation for mm/dd/yyyy format
        const datePattern = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/;
        return datePattern.test(dateString);
    }

    validateOdometer(odometer) {
        // Odometer validation - numbers only
        const odometerPattern = /^\d+$/;
        return odometerPattern.test(odometer);
    }

    validateRequiredFields(formData) {
        const missingFields = [];
        this.requiredFields.forEach(field => {
            if (!formData[field] || formData[field].trim() === '') {
                missingFields.push(field);
            }
        });
        return missingFields;
    }

    sanitizeInput(input) {
        // Basic XSS prevention
        return input.replace(/[<>'"]/g, '');
    }
}

// Initialize security validator
document.addEventListener('DOMContentLoaded', () => {
    window.securityValidator = new TotalLossSecurityValidator();
});
