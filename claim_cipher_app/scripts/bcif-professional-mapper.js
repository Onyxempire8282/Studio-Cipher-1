/* 🏢 BCIF PROFESSIONAL MAPPER - Advanced Pattern-Based Extraction */
/* Based on professional BCIF mapping configuration v1 */

class BCIFProfessionalMapper {
    constructor() {
        this.mapping = null;
        this.init();
    }

    async init() {
        console.log('🏢 BCIF Professional Mapper initializing...');
        
        // Load the professional mapping configuration
        await this.loadMappingConfig();
        
        console.log('✅ BCIF Professional Mapper ready');
    }

    async loadMappingConfig() {
        try {
            const response = await fetch('./config/bcif-mapping.json');
            this.mapping = await response.json();
            console.log('📋 Loaded professional BCIF mapping configuration');
        } catch (error) {
            console.error('❌ Failed to load BCIF mapping config:', error);
            this.mapping = this.getFallbackMapping();
        }
    }

    /**
     * Extract data from PDF text using professional patterns
     * @param {String} pdfText - Full text extracted from PDF
     * @returns {Object} - Extracted data in BCIF format
     */
    extractFromText(pdfText) {
        console.log('🔍 Starting professional pattern-based extraction...');
        
        const extractedData = {
            textFields: {},
            checkboxFields: {},
            metadata: {
                confidence: 0,
                fieldsFound: 0,
                totalFields: 0
            }
        };

        // Extract text fields using patterns
        const textFields = this.applyTextMapping(pdfText, this.mapping.text_fields || {});
        extractedData.textFields = textFields;

        // Apply post-processing transformations
        this.applyPostProcessing(extractedData.textFields, this.mapping.post_processing || {});

        // Extract checkbox states
        const checkboxStates = this.collectCheckboxStates(pdfText, this.mapping.checkbox_rules || {});
        extractedData.checkboxFields = this.convertCheckboxesToObject(checkboxStates);

        // Calculate confidence
        extractedData.metadata = this.calculateConfidence(extractedData);

        console.log('✅ Professional extraction completed:', extractedData.metadata);
        return extractedData;
    }

    /**
     * Apply text field mapping using regex patterns
     * @param {String} text - Source text
     * @param {Object} textFieldsSpec - Text field specifications
     * @returns {Object} - Extracted text fields
     */
    applyTextMapping(text, textFieldsSpec) {
        const results = {};
        
        for (const [fieldName, rules] of Object.entries(textFieldsSpec)) {
            // Handle composed fields (like cylinders)
            if (rules.compose) {
                const value = this.buildComposedField(text, rules.compose);
                if (value) {
                    results[fieldName] = value;
                }
                continue;
            }

            // Handle pattern-based fields
            const patterns = rules.patterns || [];
            if (patterns.length === 0) continue;

            const [value, match] = this.findWithPatterns(text, patterns);
            if (value === null && match === null) continue;

            // Apply transformations
            let finalValue = value;
            const transform = rules.transform;
            
            if (transform && match) {
                finalValue = this.applyTransform(transform, value, match);
            }

            if (typeof finalValue === 'string') {
                results[fieldName] = finalValue.trim();
                console.log(`📝 Found ${fieldName}: "${finalValue}"`);
            }
        }

        return results;
    }

    /**
     * Find text using multiple regex patterns
     * @param {String} text - Source text
     * @param {Array} patterns - Regex patterns to try
     * @returns {Array} - [value, match] or [null, null]
     */
    findWithPatterns(text, patterns) {
        for (let pattern of patterns) {
            try {
                // Convert Python regex syntax to JavaScript
                pattern = this.convertPythonRegexToJS(pattern);
                
                // Determine flags based on pattern content
                let flags = 'gi';
                if (pattern.includes('^') || pattern.includes('$')) {
                    flags = 'gim'; // Add multiline flag for ^ and $ anchors
                }
                
                const regex = new RegExp(pattern, flags);
                const match = regex.exec(text);
                if (match) {
                    // Prefer last group if present, else the whole match
                    const value = match.length > 1 ? match[1] : match[0];
                    return [value, match];
                }
            } catch (error) {
                console.warn(`Skipping invalid regex pattern: ${pattern}`, error);
                continue;
            }
        }
        return [null, null];
    }

    /**
     * Convert Python regex syntax to JavaScript compatible syntax
     * @param {String} pattern - Python regex pattern
     * @returns {String} - JavaScript compatible pattern
     */
    convertPythonRegexToJS(pattern) {
        // Remove Python-specific inline flags like (?m)
        return pattern
            .replace(/\(\?m\)/g, '')  // Remove (?m) multiline flag
            .replace(/\(\?i\)/g, '')  // Remove (?i) case-insensitive flag
            .replace(/\(\?s\)/g, '')  // Remove (?s) dotall flag
            .replace(/\(\?x\)/g, '')  // Remove (?x) verbose flag
            .replace(/\\b\(/g, '\\b(') // Ensure word boundaries are preserved
            .trim();
    }

    /**
     * Apply transformation to extracted value
     * @param {String} transform - Transform type
     * @param {String} value - Original value
     * @param {Object} match - Regex match object
     * @returns {String} - Transformed value
     */
    applyTransform(transform, value, match) {
        switch (transform) {
            case 'first_group':
                return match.length >= 2 ? match[1] : value;
            
            case 'second_group':
                return match.length >= 3 ? match[2] : value;
            
            case 'first_group_title':
                const firstGroup = match.length >= 2 ? match[1] : value;
                return this.titleCase(firstGroup);
            
            case 'second_group_title':
                const secondGroup = match.length >= 3 ? match[2] : value;
                return this.titleCase(secondGroup);
            
            case 'digits_only':
                return this.digitsOnly(value);
            
            default:
                return value;
        }
    }

    /**
     * Build composed fields like cylinders
     * @param {String} text - Source text
     * @param {Object} composeSpec - Composition specification
     * @returns {String|null} - Composed value
     */
    buildComposedField(text, composeSpec) {
        let cylValue = null;
        let dispValue = null;
        const normalize = composeSpec.normalize || {};

        // Find cylinder value
        for (let pattern of composeSpec.cyl_from || []) {
            try {
                pattern = this.convertPythonRegexToJS(pattern);
                const match = text.match(new RegExp(pattern, 'i'));
                if (match) {
                    cylValue = match[1];
                    cylValue = normalize[cylValue] || cylValue;
                    break;
                }
            } catch (error) {
                console.warn(`Skipping invalid cylinder pattern: ${pattern}`, error);
                continue;
            }
        }

        // Find displacement value
        for (let pattern of composeSpec.disp_from || []) {
            try {
                pattern = this.convertPythonRegexToJS(pattern);
                const match = text.match(new RegExp(pattern, 'i'));
                if (match) {
                    dispValue = match[1];
                    if (!dispValue.toLowerCase().endsWith('l')) {
                        dispValue += 'L';
                    }
                    break;
                }
            } catch (error) {
                console.warn(`Skipping invalid displacement pattern: ${pattern}`, error);
                continue;
            }
        }

        // Handle case where only displacement is found
        if (dispValue && !cylValue) {
            const assumedCyl = composeSpec.if_only_displacement_found_assume;
            if (assumedCyl) {
                cylValue = normalize[assumedCyl] || assumedCyl;
            }
        }

        // Format final value
        if (cylValue && dispValue) {
            const format = composeSpec.format || '{cyl}-{disp}';
            return format.replace('{cyl}', cylValue).replace('{disp}', dispValue);
        }

        return null;
    }

    /**
     * Collect checkbox states using pattern matching
     * @param {String} text - Source text
     * @param {Object} checkboxRules - Checkbox rules specification
     * @returns {Array} - Array of enabled checkbox field names
     */
    collectCheckboxStates(text, checkboxRules) {
        const enabledFields = new Set();

        for (const rule of checkboxRules.rules || []) {
            const fieldName = rule.field;
            if (!fieldName) continue;

            const patterns = rule.match_any || [];
            const found = patterns.some(pattern => {
                try {
                    // Convert Python regex to JavaScript
                    const jsPattern = this.convertPythonRegexToJS(pattern);
                    const regex = new RegExp(jsPattern, 'gi');
                    return regex.test(text);
                } catch (error) {
                    console.warn(`Skipping invalid checkbox pattern: ${pattern}`, error);
                    return false;
                }
            });

            if (found) {
                enabledFields.add(fieldName);
                console.log(`☑️ Found checkbox: ${fieldName}`);
            }
        }

        // Apply preference rules (e.g., prefer 4DR over 2DR)
        if (checkboxRules.prefer_4dr_over_2dr && enabledFields.has('4DR') && enabledFields.has('2DR')) {
            enabledFields.delete('2DR');
            console.log('🔄 Applied 4DR preference over 2DR');
        }

        return Array.from(enabledFields).sort();
    }

    /**
     * Convert checkbox array to object format
     * @param {Array} checkboxArray - Array of enabled checkboxes
     * @returns {Object} - Object with checkbox names as keys, true as values
     */
    convertCheckboxesToObject(checkboxArray) {
        const checkboxObj = {};
        for (const field of checkboxArray) {
            checkboxObj[field] = true;
        }
        return checkboxObj;
    }

    /**
     * Apply post-processing transformations
     * @param {Object} textFields - Text fields to process
     * @param {Object} postProcessing - Post-processing rules
     */
    applyPostProcessing(textFields, postProcessing) {
        // Apply title case to specified fields
        const titleCaseFields = postProcessing.titlecase_fields || [];
        for (const fieldName of titleCaseFields) {
            if (textFields[fieldName]) {
                textFields[fieldName] = this.titleCase(textFields[fieldName]);
            }
        }

        // Normalize ZIP code
        if (postProcessing.zip_selection === 'first_five_digits' && textFields['Loss ZIP Code']) {
            const match = textFields['Loss ZIP Code'].match(/\b(\d{5})\b/);
            if (match) {
                textFields['Loss ZIP Code'] = match[1];
            }
        }
    }

    /**
     * Calculate extraction confidence
     * @param {Object} extractedData - Extracted data
     * @returns {Object} - Confidence metadata
     */
    calculateConfidence(extractedData) {
        const textFieldCount = Object.keys(extractedData.textFields).length;
        const checkboxCount = Object.keys(extractedData.checkboxFields).length;
        const totalFound = textFieldCount + checkboxCount;
        
        // Estimate total possible fields
        const expectedTextFields = Object.keys(this.mapping.text_fields || {}).length;
        const expectedCheckboxes = (this.mapping.checkbox_rules?.rules || []).length;
        const totalExpected = expectedTextFields + expectedCheckboxes;

        const confidence = totalExpected > 0 ? Math.round((totalFound / totalExpected) * 100) : 0;

        return {
            confidence: confidence,
            fieldsFound: totalFound,
            totalFields: totalExpected,
            textFields: textFieldCount,
            checkboxes: checkboxCount
        };
    }

    /**
     * Helper: Convert to title case
     * @param {String} str - String to convert
     * @returns {String} - Title cased string
     */
    titleCase(str) {
        if (!str) return str;
        return str.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    /**
     * Helper: Extract digits only
     * @param {String} str - String to process
     * @returns {String} - Digits only
     */
    digitsOnly(str) {
        return (str || '').replace(/[^\d]/g, '');
    }

    /**
     * Fallback mapping if config fails to load
     * @returns {Object} - Basic mapping configuration
     */
    getFallbackMapping() {
        return {
            text_fields: {
                "Claim Number": { patterns: ["Claim #:\\s*([A-Z0-9\\-\\/]+)"] },
                "VIN": { patterns: ["VIN:\\s*([A-HJ-NPR-Z0-9]{11,17})"] },
                "Year": { patterns: ["(\\d{4})\\s+[A-Z]{3,}\\s+[A-Za-z0-9]+"] }
            },
            checkbox_rules: { rules: [] },
            post_processing: {}
        };
    }
}

// Export for use in main forms processor
window.BCIFProfessionalMapper = BCIFProfessionalMapper;