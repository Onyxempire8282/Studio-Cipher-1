/* 🔍 CCC PDF EXTRACTOR - Coordinate-Based Extraction System */
/* Precise field extraction using PDF coordinates and text positioning */

class CCCPDFExtractor {
    constructor() {
        this.extractionZones = null;
        this.professionalMapper = null;
        this.initialized = false;
        this.initPromise = this.init();
    }

    async init() {
        console.log('🔍 CCC PDF Extractor initializing...');
        this.setupCoordinateZones();
        
        // Initialize professional mapper for pattern-based extraction
        this.professionalMapper = new BCIFProfessionalMapper();
        await this.professionalMapper.init();
        
        this.initialized = true;
        console.log('✅ CCC PDF Extractor ready with professional mapping');
    }

    setupCoordinateZones() {
        // Define coordinate zones based on the actual CCC estimate layout
        // Calibrated from debug output of Jalston 25 Chevy Equinox estimate
        this.extractionZones = {
            // Basic claim information (from debug coordinates)
            claimNumber: { page: 1, x: 445, y: 564, width: 100, height: 15, label: 'Claim Number' }, // "664723-GQ-1" at (445, 564)
            policyNumber: { page: 1, x: 240, y: 564, width: 130, height: 15, label: 'Policy Number' }, // Empty at Policy #: 
            
            // Owner/Insured Information
            insuredFirstName: { page: 1, x: 89, y: 564, width: 60, height: 15, label: 'Insured First Name' }, // "ALSTON," from "ALSTON, JESSICA" at (89, 564)
            insuredLastName: { page: 1, x: 89, y: 564, width: 120, height: 15, label: 'Insured Last Name' }, // "ALSTON, JESSICA" at (89, 564)
            ownerFirstName: { page: 1, x: 24, y: 499, width: 60, height: 15, label: 'Owner First Name' }, // "ALSTON," from "ALSTON, JESSICA" at (24, 499)
            ownerLastName: { page: 1, x: 24, y: 499, width: 120, height: 15, label: 'Owner Last Name' }, // "ALSTON, JESSICA" at (24, 499)
            
            // Vehicle Information
            vin: { page: 1, x: 73, y: 363, width: 150, height: 15, label: 'VIN' }, // "3GNAXHEG0SL290421" at (73, 363)
            year: { page: 1, x: 24, y: 383, width: 50, height: 15, label: 'Year' }, // "2025" from vehicle line at (24, 383)
            make: { page: 1, x: 29, y: 383, width: 50, height: 15, label: 'Make' }, // "CHEV" from vehicle line
            model: { page: 1, x: 54, y: 383, width: 80, height: 15, label: 'Model' }, // "Equinox" from vehicle line
            trim: { page: 1, x: 98, y: 383, width: 50, height: 15, label: 'Trim' }, // "LT1" from vehicle line
            odometer: { page: 1, x: 294, y: 349, width: 50, height: 15, label: 'Odometer' }, // "6,826" at (294, 349)
            
            // Loss Information
            lossDate: { page: 1, x: 267, y: 551, width: 120, height: 15, label: 'Date of Loss' }, // "8/8/2025 12:00 PM" at (267, 551)
            lossZipCode: { page: 1, x: 24, y: 472, width: 80, height: 15, label: 'Loss ZIP Code' }, // "27589" from address
            lossState: { page: 1, x: 73, y: 336, width: 30, height: 15, label: 'Loss State' }, // "NC" at (73, 336)
            
            // Adjuster Information (from debug output at line 26)
            adjusterFirstName: { page: 1, x: 240, y: 588, width: 80, height: 15, label: 'Adjuster First Name' }, // "Boone," from "Adjuster: Boone, Brittany..."
            adjusterLastName: { page: 1, x: 275, y: 588, width: 80, height: 15, label: 'Adjuster Last Name' }, // "Brittany" from adjuster line
            adjusterContact: { page: 1, x: 350, y: 588, width: 150, height: 15, label: 'Adjuster Contact' }, // "(833) 369-2567" from adjuster line
            
            // Vehicle Options Areas (covering the equipment lists from debug)
            transmissionZone: { page: 1, x: 46, y: 270, width: 130, height: 40, label: 'Transmission Options' }, // TRANSMISSION section (46, 298) down
            powerOptionsZone: { page: 1, x: 46, y: 190, width: 130, height: 80, label: 'Power Options' }, // POWER section (46, 271) down to heated mirrors
            convenienceZone: { page: 1, x: 46, y: 109, width: 130, height: 80, label: 'Convenience Options' }, // CONVENIENCE section down
            radioZone: { page: 1, x: 181, y: 109, width: 130, height: 190, label: 'Radio Options' }, // RADIO section and above
            safetyZone: { page: 1, x: 316, y: 109, width: 130, height: 110, label: 'Safety Options' }, // SAFETY section
            seatingZone: { page: 1, x: 451, y: 190, width: 130, height: 50, label: 'Seating Options' }, // SEATS section
            wheelsZone: { page: 1, x: 451, y: 163, width: 130, height: 30, label: 'Wheels Options' }, // WHEELS section
            paintZone: { page: 1, x: 451, y: 136, width: 130, height: 30, label: 'Paint Options' } // PAINT section
        };

        // Vehicle options keywords for zone scanning (based on actual CCC estimate format)
        this.vehicleOptionsKeywords = {
            transmission: [
                'Automatic Transmission', 'Tilt Wheel', 'Cruise Control', 'Rear Defogger',
                'Keyless Entry', 'Alarm', 'Message Center', 'Steering Wheel Touch Controls',
                'Telescopic Wheel', 'Heated Steering Wheel'
            ],
            powerOptions: [
                'Power Steering', 'Power Brakes', 'Power Windows', 'Power Locks', 
                'Power Mirrors', 'Heated Mirrors'
            ],
            convenience: [
                'Navigation System', 'Backup Camera', 'Parking Sensors', 'Remote Starter',
                'Intelligent Cruise', 'Dual Mirrors', 'Privacy Glass', 'Console/Storage',
                'Air Conditioning'
            ],
            radio: [
                'AM Radio', 'FM Radio', 'Stereo', 'Search/Seek', 'Auxiliary Audio Connection',
                'Satellite Radio'
            ],
            safety: [
                'Communications System', 'Hands Free Device', 'Xenon or L.E.D. Headlamps',
                'Blind Spot Detection', 'Lane Departure Warning', 'Drivers Side Air Bag',
                'Passenger Air Bag', 'Anti-Lock Brakes (4)', '4 Wheel Disc Brakes',
                'Traction Control', 'Stability Control', 'Front Side Impact Air Bags',
                'Head/Curtain Air Bags'
            ],
            seating: [
                'Cloth Seats', 'Bucket Seats', 'Heated Seats', 'Leather Seats',
                'Reclining Seats', 'Captain Chairs'
            ],
            wheels: [
                'Aluminum/Alloy Wheels', 'Styled Steel Wheels', 'Chrome Wheels',
                'Wire Wheels', 'Full Wheel Covers'
            ],
            paint: [
                'Clear Coat Paint', 'Metallic Paint', 'Two Tone Paint', 'Three Stage Paint'
            ]
        };
    }

    /**
     * Main extraction method using coordinate-based approach
     * @param {File} pdfFile - The uploaded CCC PDF file
     * @returns {Object} - Extracted data in BCIF format
     */
    async extractDataFromCCC(pdfFile) {
        console.log('🔍 Starting advanced CCC PDF extraction...');
        
        // Ensure initialization is complete
        if (!this.initialized) {
            await this.initPromise;
        }
        
        try {
            // Convert file to array buffer for PDF.js
            const arrayBuffer = await pdfFile.arrayBuffer();
            
            // Parse PDF with coordinate information
            const pdfData = await this.extractWithCoordinates(arrayBuffer);
            
            // Debug: Show what we extracted from PDF
            console.log('📄 PDF parsed successfully, running test extraction...');
            this.testExtraction(pdfData);
            
            // Use professional pattern-based extraction as primary method
            const professionalData = this.professionalMapper.extractFromText(pdfData.fullText);
            console.log('🏢 Professional extraction results:', professionalData);
            
            // Fall back to coordinate extraction for missing fields
            const coordinateData = this.parseCoordinateData(pdfData);
            console.log('📍 Coordinate extraction results:', coordinateData);
            
            // Merge the results (professional takes priority)
            const extractedData = this.mergeExtractionResults(professionalData, coordinateData);
            
            // Enhance with additional processing
            const enhancedData = this.enhanceExtractedData(extractedData);
            
            console.log('✅ Coordinate-based extraction completed:', enhancedData);
            return enhancedData;
            
        } catch (error) {
            console.error('❌ Coordinate extraction failed:', error);
            throw new Error(`Extraction failed: ${error.message}`);
        }
    }

    /**
     * Extract PDF content with coordinate information
     * @param {ArrayBuffer} pdfBuffer - PDF file as array buffer
     * @returns {Object} - PDF data with text and coordinates
     */
    async extractWithCoordinates(pdfBuffer) {
        console.log('📄 Extracting PDF with coordinate data...');
        
        // Configure PDF.js worker
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        
        // Load PDF document
        const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
        console.log(`📄 PDF loaded: ${pdf.numPages} pages`);
        
        const pdfData = {
            pages: [],
            fullText: ''
        };
        
        // Extract data from each page with coordinates
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const viewport = page.getViewport({ scale: 1.0 });
            
            const pageData = {
                pageNumber: pageNum,
                viewport: viewport,
                textItems: [],
                text: ''
            };
            
            // Process each text item with its coordinates
            for (const item of textContent.items) {
                const textItem = {
                    text: item.str,
                    x: item.transform[4],
                    y: item.transform[5],
                    width: item.width,
                    height: item.height,
                    fontName: item.fontName
                };
                
                pageData.textItems.push(textItem);
                pageData.text += item.str + ' ';
            }
            
            pdfData.pages.push(pageData);
            pdfData.fullText += pageData.text + '\n';
        }
        
        console.log(`📄 Coordinate data extracted from ${pdfData.pages.length} pages`);
        console.log('📄 Sample text items:', pdfData.pages[0]?.textItems.slice(0, 5));
        
        return pdfData;
    }

    /**
     * Parse data using coordinate zones
     * @param {Object} pdfData - PDF data with coordinates
     * @returns {Object} - Extracted field data
     */
    parseCoordinateData(pdfData) {
        console.log('🎯 Parsing data using coordinate zones...');
        
        const extractedData = {};
        
        // Extract data from each defined zone
        for (const [fieldName, zone] of Object.entries(this.extractionZones)) {
            if (fieldName.includes('Zone')) continue; // Skip zone definitions for now
            
            const value = this.extractFromZone(pdfData, zone);
            if (value) {
                extractedData[fieldName] = value;
                console.log(`✅ Found ${fieldName}: "${value}" at zone (${zone.x}, ${zone.y})`);
            } else {
                console.log(`❌ No data found for ${fieldName} in zone (${zone.x}, ${zone.y})`);
            }
        }
        
        // Extract vehicle options from zones
        extractedData.vehicleOptions = this.extractVehicleOptionsFromZones(pdfData);
        
        return extractedData;
    }

    /**
     * Extract text from a specific coordinate zone
     * @param {Object} pdfData - PDF data with coordinates
     * @param {Object} zone - Zone definition with coordinates
     * @returns {String} - Extracted text from zone
     */
    extractFromZone(pdfData, zone) {
        const targetPage = pdfData.pages[zone.page - 1];
        if (!targetPage) return null;
        
        const zoneTexts = [];
        
        // Find text items within the zone boundaries
        for (const item of targetPage.textItems) {
            if (this.isInZone(item, zone)) {
                zoneTexts.push({
                    text: item.text,
                    x: item.x,
                    y: item.y
                });
            }
        }
        
        // Sort by position and combine text
        zoneTexts.sort((a, b) => {
            // Sort by Y position first (top to bottom), then X position (left to right)
            if (Math.abs(a.y - b.y) > 5) {
                return b.y - a.y; // Higher Y values first (PDF coordinates are bottom-up)
            }
            return a.x - b.x;
        });
        
        const combinedText = zoneTexts.map(item => item.text).join(' ').trim();
        
        // Clean up the extracted text
        const cleanedText = this.cleanExtractedText(combinedText);
        
        // Apply specific field parsing if needed
        return this.parseSpecificField(zone.label.replace(/\s/g, ''), cleanedText) || cleanedText;
    }

    /**
     * Check if a text item is within a coordinate zone
     * @param {Object} item - Text item with coordinates
     * @param {Object} zone - Zone boundaries
     * @returns {Boolean} - True if item is in zone
     */
    isInZone(item, zone) {
        return (
            item.x >= zone.x &&
            item.x <= zone.x + zone.width &&
            item.y >= zone.y - zone.height &&
            item.y <= zone.y
        );
    }

    /**
     * Extract vehicle options from defined zones
     * @param {Object} pdfData - PDF data with coordinates
     * @returns {Array} - Detected vehicle options
     */
    extractVehicleOptionsFromZones(pdfData) {
        console.log('🚗 Extracting vehicle options from zones...');
        
        const detectedOptions = [];
        
        // Check each vehicle option zone (transmission, power, convenience, etc.)
        for (const [zoneName, keywords] of Object.entries(this.vehicleOptionsKeywords)) {
            const zoneKey = zoneName + 'Zone';
            const zone = this.extractionZones[zoneKey];
            
            if (zone) {
                const zoneText = this.extractFromZone(pdfData, zone);
                console.log(`🔍 Zone ${zoneName}: "${zoneText}"`);
                
                if (zoneText) {
                    for (const keyword of keywords) {
                        // More flexible matching for CCC format
                        const keywordLower = keyword.toLowerCase();
                        const zoneTextLower = zoneText.toLowerCase();
                        
                        if (zoneTextLower.includes(keywordLower) || 
                            this.fuzzyMatch(keywordLower, zoneTextLower)) {
                            const normalizedOption = keyword.toLowerCase()
                                .replace(/[^a-z0-9]/g, '_')
                                .replace(/_{2,}/g, '_')
                                .replace(/^_|_$/g, '');
                            detectedOptions.push(normalizedOption);
                            console.log(`🔧 Found option: ${keyword} in ${zoneName} zone`);
                        }
                    }
                }
            } else {
                console.log(`⚠️ Zone ${zoneKey} not found in extraction zones`);
            }
        }
        
        return [...new Set(detectedOptions)]; // Remove duplicates
    }

    /**
     * Fuzzy matching for vehicle options (handle variations in CCC format)
     * @param {String} keyword - Target keyword
     * @param {String} text - Text to search in
     * @returns {Boolean} - True if fuzzy match found
     */
    fuzzyMatch(keyword, text) {
        // Handle common CCC abbreviations and variations
        const mappings = {
            'power steering': ['ps', 'p/s'],
            'power brakes': ['pb', 'p/b'],
            'power windows': ['pw', 'p/w'],
            'power locks': ['pl', 'p/l'],
            'power mirrors': ['pm', 'p/m'],
            'air conditioning': ['ac', 'a/c'],
            'cruise control': ['cc', 'c/c'],
            'tilt wheel': ['tw', 't/w'],
            'navigation system': ['nav', 'nv'],
            'keyless entry': ['ke', 'k/e'],
            'remote starter': ['rj', 'r/j'],
            'anti-lock brakes': ['abs', 'antilock'],
            'aluminum/alloy wheels': ['alloy', 'aluminum wheels', 'aw']
        };
        
        // Check direct abbreviation mapping
        if (mappings[keyword]) {
            return mappings[keyword].some(abbrev => text.includes(abbrev));
        }
        
        // Check for partial word matches
        const keywordWords = keyword.split(' ');
        return keywordWords.every(word => text.includes(word));
    }

    /**
     * Clean and normalize extracted text
     * @param {String} text - Raw extracted text
     * @returns {String} - Cleaned text
     */
    cleanExtractedText(text) {
        if (!text) return '';
        
        return text
            .replace(/\s+/g, ' ')           // Multiple spaces to single
            .replace(/[^\w\s\-\.\@\/]/g, '') // Remove special chars except common ones
            .trim();
    }

    /**
     * Extract specific data from combined text fields
     * @param {String} fieldName - Field to extract
     * @param {String} text - Source text
     * @returns {String} - Extracted value
     */
    parseSpecificField(fieldName, text) {
        if (!text) return '';
        
        const patterns = {
            // Parse year from vehicle line: "2025 CHEV Equinox..."
            year: /^(\d{4})\s/,
            
            // Parse make from vehicle line: "2025 CHEV Equinox..."  
            make: /^\d{4}\s+(\w+)\s/,
            
            // Parse model from vehicle line: "2025 CHEV Equinox..."
            model: /^\d{4}\s+\w+\s+(\w+)/,
            
            // Parse trim from vehicle line: "2025 CHEV Equinox LT1..."
            trim: /^\d{4}\s+\w+\s+\w+\s+(\w+)/,
            
            // Parse adjuster first name: "Adjuster: Boone, Brittany..."
            adjusterFirstName: /Adjuster:\s+(\w+),/,
            
            // Parse adjuster last name: "Adjuster: Boone, Brittany..."
            adjusterLastName: /Adjuster:\s+\w+,\s+(\w+)/,
            
            // Parse adjuster phone: "Adjuster: Boone, Brittany, (833) 369-2567"
            adjusterContact: /\((\d{3})\)\s*(\d{3})-(\d{4})/,
            
            // Parse first name from "LASTNAME, FIRSTNAME"
            firstName: /,\s*(\w+)/,
            
            // Parse last name from "LASTNAME, FIRSTNAME"  
            lastName: /^(\w+),/,
            
            // Parse ZIP from address
            zipCode: /(\d{5})$/,
            
            // Parse odometer number only
            odometerNumber: /(\d{1,3}(?:,\d{3})*)/
        };
        
        const pattern = patterns[fieldName];
        if (pattern) {
            const match = text.match(pattern);
            if (match) {
                if (fieldName === 'adjusterContact') {
                    return `(${match[1]}) ${match[2]}-${match[3]}`;
                }
                return match[1];
            }
        }
        
        return text;
    }

    /**
     * Merge professional and coordinate extraction results
     * @param {Object} professionalData - Results from pattern-based extraction
     * @param {Object} coordinateData - Results from coordinate-based extraction
     * @returns {Object} - Merged extraction results
     */
    mergeExtractionResults(professionalData, coordinateData) {
        console.log('🔄 Merging extraction results...');
        
        const merged = {
            // Start with coordinate data as base
            ...coordinateData,
            // Override with professional data (higher quality)
            ...professionalData.textFields,
            // Add vehicle options from both sources
            vehicleOptions: [
                ...(coordinateData.vehicleOptions || []),
                ...Object.keys(professionalData.checkboxFields || {})
            ],
            // Professional checkboxes take priority
            checkboxFields: professionalData.checkboxFields || {},
            // Merge metadata
            extractionMetadata: {
                professionalConfidence: professionalData.metadata?.confidence || 0,
                coordinateFieldsFound: Object.keys(coordinateData).length,
                professionalFieldsFound: professionalData.metadata?.fieldsFound || 0,
                mergedApproach: 'hybrid'
            }
        };

        // Remove duplicates from vehicle options
        merged.vehicleOptions = [...new Set(merged.vehicleOptions)];
        
        console.log(`🔄 Merged results: ${Object.keys(merged).length} total fields`);
        return merged;
    }

    /**
     * Enhance extracted data with additional processing
     * @param {Object} extractedData - Raw extracted data
     * @returns {Object} - Enhanced data ready for BCIF mapping
     */
    enhanceExtractedData(extractedData) {
        console.log('✨ Enhancing extracted data...');
        
        // Clean up specific fields
        if (extractedData.odometer) {
            extractedData.odometer = extractedData.odometer.replace(/[^0-9]/g, '');
        }
        
        if (extractedData.vin) {
            extractedData.vin = extractedData.vin.replace(/[^A-HJ-NPR-Z0-9]/g, '').toUpperCase();
        }
        
        // Add comprehensive defaults for all required fields
        this.addDefaultValues(extractedData);
        
        // Add estimated conditions
        extractedData.conditions = this.getDefaultConditions();
        
        return extractedData;
    }

    /**
     * Add default values for missing required fields
     * @param {Object} extractedData - Data to enhance
     */
    addDefaultValues(extractedData) {
        const currentDate = new Date();
        const dateString = (currentDate.getMonth() + 1) + '/' + currentDate.getDate() + '/' + currentDate.getFullYear();
        
        const defaults = {
            // Required BCIF fields with intelligent fallbacks
            claimNumber: extractedData.claimNumber || 'CLM-' + Date.now().toString().slice(-6),
            policyNumber: extractedData.policyNumber || 'POL-' + Date.now().toString().slice(-6),
            
            // Vehicle information
            year: extractedData.year || '2020',
            make: extractedData.make || 'Unknown',
            model: extractedData.model || 'Vehicle',
            vin: extractedData.vin || '1HGBH41JXMN109186',
            
            // People information
            insuredFirstName: extractedData.insuredFirstName || 'John',
            insuredLastName: extractedData.insuredLastName || 'Doe',
            ownerFirstName: extractedData.ownerFirstName || extractedData.insuredFirstName || 'John',
            ownerLastName: extractedData.ownerLastName || extractedData.insuredLastName || 'Doe',
            
            // Adjuster information
            adjusterFirstName: extractedData.adjusterFirstName || 'Claims',
            adjusterLastName: extractedData.adjusterLastName || 'Adjuster',
            adjusterEmail: extractedData.adjusterEmail || 'adjuster@insurance.com',
            adjusterContact: extractedData.adjusterContact || '555-000-0000',
            
            // Loss information
            lossDate: extractedData.lossDate || dateString,
            lossZipCode: extractedData.lossZipCode || '27101',
            lossState: extractedData.lossState || 'NC',
            odometer: extractedData.odometer || '50000',
            
            // Vehicle options
            vehicleOptions: extractedData.vehicleOptions || []
        };
        
        for (const [field, defaultValue] of Object.entries(defaults)) {
            if (!extractedData[field] || (typeof extractedData[field] === 'string' && extractedData[field].trim() === '')) {
                extractedData[field] = defaultValue;
                console.log(`📝 Added default ${field}: ${defaultValue}`);
            }
        }
    }

    /**
     * Get default condition ratings
     * @returns {Object} - Default condition ratings
     */
    getDefaultConditions() {
        return {
            engine_condition: 2,
            transmission_condition: 2,
            paint_condition: 1,
            front_tires_condition: 2,
            rear_tires_condition: 2,
            body_glass_condition: 1,
            interior_condition: 2
        };
    }

    /**
     * Validate extracted data quality
     * @param {Object} extractedData - Data to validate
     * @returns {Object} - Validation results
     */
    validateExtraction(extractedData) {
        const validation = {
            confidence: 100, // Start optimistic with coordinate-based extraction
            warnings: [],
            fieldsFound: 0,
            totalFields: Object.keys(this.extractionZones).length
        };
        
        // Count successfully extracted fields (non-default values)
        const defaultIndicators = ['Unknown', 'Doe', 'CLM-', 'POL-', 'adjuster@'];
        
        for (const [field, value] of Object.entries(extractedData)) {
            if (field === 'vehicleOptions' || field === 'conditions') continue;
            
            const isDefault = defaultIndicators.some(indicator => 
                String(value).includes(indicator)
            );
            
            if (!isDefault) {
                validation.fieldsFound++;
            }
        }
        
        validation.confidence = Math.round((validation.fieldsFound / validation.totalFields) * 100);
        
        return validation;
    }

    /**
     * Debug method to show all text items and their coordinates
     * @param {Object} pdfData - PDF data to analyze
     * @param {Number} pageNum - Page number to debug (default: 1)
     */
    debugCoordinates(pdfData, pageNum = 1) {
        const page = pdfData.pages[pageNum - 1];
        if (!page) {
            console.log(`❌ Page ${pageNum} not found`);
            return;
        }
        
        console.log(`🔍 Debug: Text items on page ${pageNum} (total: ${page.textItems.length}):`);
        console.log(`📄 Page viewport:`, page.viewport);
        page.textItems.forEach((item, index) => {
            console.log(`${index}: "${item.text}" at (${Math.round(item.x)}, ${Math.round(item.y)})`);
        });
        
        // Show our extraction zones for comparison
        console.log('🎯 Configured extraction zones:');
        for (const [fieldName, zone] of Object.entries(this.extractionZones)) {
            if (zone.page === pageNum) {
                console.log(`${fieldName}: (${zone.x}, ${zone.y}) ${zone.width}x${zone.height}`);
            }
        }
    }

    /**
     * Test extraction with debugging - call this from console
     * @param {Object} pdfData - PDF data to test
     */
    testExtraction(pdfData) {
        console.log('🧪 Testing extraction with debug output...');
        
        // Debug coordinates first
        this.debugCoordinates(pdfData, 1);
        
        // Test each extraction zone
        console.log('\n🎯 Testing extraction zones:');
        for (const [fieldName, zone] of Object.entries(this.extractionZones)) {
            const value = this.extractFromZone(pdfData, zone);
            console.log(`${fieldName}: "${value}" from zone (${zone.x}, ${zone.y})`);
        }
        
        // Test vehicle options
        console.log('\n🚗 Testing vehicle options:');
        const options = this.extractVehicleOptionsFromZones(pdfData);
        console.log('Detected options:', options);
    }
}

// Export for use in main forms processor
window.CCCPDFExtractor = CCCPDFExtractor;