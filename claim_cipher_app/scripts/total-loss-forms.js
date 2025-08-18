/* 🚗 TOTAL LOSS FORMS - Main Processing Logic */
/* PDF-lib integration and workflow management */

class TotalLossFormsProcessor {
    constructor() {
        this.fieldMapper = null;
        this.uploadedFile = null;
        this.extractedData = null;
        this.bcifData = null;
        this.filledPDF = null;
        this.currentStep = 1;
        
        this.init();
    }

    async init() {
        console.log('🚗 Total Loss Forms Processor initializing...');
        
        // Initialize field mapper and extractor
        this.fieldMapper = new BCIFFieldMapper();
        this.pdfExtractor = new CCCPDFExtractor();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize UI state
        this.updateProgressStep(1);
        
        console.log('✅ Total Loss Forms Processor ready');
    }

    setupEventListeners() {
        // File upload handling
        const fileInput = document.getElementById('cccFileInput');
        const uploadZone = document.getElementById('uploadZone');
        const removeFileBtn = document.getElementById('removeFile');

        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }

        if (uploadZone) {
            // Drag and drop functionality
            uploadZone.addEventListener('dragover', (e) => this.handleDragOver(e));
            uploadZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            uploadZone.addEventListener('drop', (e) => this.handleFileDrop(e));
            uploadZone.addEventListener('click', () => fileInput?.click());
        }

        if (removeFileBtn) {
            removeFileBtn.addEventListener('click', () => this.removeFile());
        }

        // Form generation and download
        const generateFormBtn = document.getElementById('generateFormBtn');
        const editFormBtn = document.getElementById('editFormBtn');
        const finalizeFormBtn = document.getElementById('finalizeFormBtn');
        const downloadPdfBtn = document.getElementById('downloadPdfBtn');

        if (generateFormBtn) {
            generateFormBtn.addEventListener('click', () => this.generateBCIFForm());
        }

        if (editFormBtn) {
            editFormBtn.addEventListener('click', () => this.editForm());
        }

        if (finalizeFormBtn) {
            finalizeFormBtn.addEventListener('click', () => this.finalizeForm());
        }

        if (downloadPdfBtn) {
            downloadPdfBtn.addEventListener('click', () => this.downloadPDF());
        }
    }

    /* ================================
       FILE UPLOAD HANDLING
       ================================ */

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        const uploadZone = document.getElementById('uploadZone');
        uploadZone?.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        const uploadZone = document.getElementById('uploadZone');
        uploadZone?.classList.remove('dragover');
    }

    handleFileDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const uploadZone = document.getElementById('uploadZone');
        uploadZone?.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processUploadedFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.processUploadedFile(file);
        }
    }

    async processUploadedFile(file) {
        console.log('📄 Processing uploaded file:', file.name);

        // Validate file type
        if (!file.type.includes('pdf')) {
            this.showError('Please upload a PDF file only.');
            return;
        }

        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            this.showError('File size must be less than 10MB.');
            return;
        }

        // Store uploaded file
        this.uploadedFile = file;

        // Update UI
        this.displayFileInfo(file);
        this.showProcessingModal('Uploading and processing PDF...');

        try {
            // Start automatic extraction process
            await this.startExtractionProcess(file);
        } catch (error) {
            console.error('Error processing file:', error);
            this.showError('Error processing PDF file. Please try again.');
        } finally {
            this.hideProcessingModal();
        }
    }

    displayFileInfo(file) {
        const fileInfo = document.getElementById('fileInfo');
        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');

        if (fileName) fileName.textContent = file.name;
        if (fileSize) fileSize.textContent = this.formatFileSize(file.size);
        if (fileInfo) fileInfo.style.display = 'block';

        // Hide upload zone, show file info
        const uploadZone = document.getElementById('uploadZone');
        if (uploadZone) uploadZone.style.display = 'none';
    }

    removeFile() {
        this.uploadedFile = null;
        this.extractedData = null;
        this.bcifData = null;

        // Reset UI
        const fileInfo = document.getElementById('fileInfo');
        const uploadZone = document.getElementById('uploadZone');
        const fileInput = document.getElementById('cccFileInput');

        if (fileInfo) fileInfo.style.display = 'none';
        if (uploadZone) uploadZone.style.display = 'flex';
        if (fileInput) fileInput.value = '';

        // Reset to step 1
        this.updateProgressStep(1);
        this.resetPreviewPanel();
    }

    /* ================================
       EXTRACTION PROCESS (YOUR SECRET SAUCE)
       ================================ */

    async startExtractionProcess(file) {
        console.log('🔍 Starting automatic extraction process...');

        // Show processing status
        this.updateStepStatus('uploadStep', 'processing', 'Processing...');
        this.updatePreviewStatus('Processing PDF...', 'processing');

        try {
            // Call your CCC PDF extraction system
            this.extractedData = await this.callYourExtractionAPI(file);

            // The extraction now returns professional format, use directly or map as needed
            if (this.extractedData.textFields && this.extractedData.checkboxFields) {
                // Professional format - use directly
                this.bcifData = {
                    textFields: this.extractedData.textFields || {},
                    checkboxFields: this.extractedData.checkboxFields || {},
                    conditionRatings: this.extractedData.conditionRatings || {}
                };
            } else {
                // Legacy format - map with field mapper
                this.bcifData = this.fieldMapper.mapToBCIF(this.extractedData);
            }

            // Validate mapped data
            const validation = this.fieldMapper.validateMappedData(this.bcifData);
            if (!validation.valid) {
                throw new Error(`Data validation failed: ${validation.errors.join(', ')}`);
            }

            // Update UI for successful extraction
            this.updateStepStatus('uploadStep', 'completed', 'Completed');
            this.updateProgressStep(2);
            this.updateStepStatus('previewStep', 'ready', 'Ready');
            
            // Enable form generation
            const generateFormBtn = document.getElementById('generateFormBtn');
            if (generateFormBtn) generateFormBtn.disabled = false;

            // Update preview panel
            this.updateFilePreview(file);
            this.updatePreviewStatus('Extraction Complete', 'completed');

            console.log('✅ Extraction completed successfully');

        } catch (error) {
            console.error('❌ Extraction failed:', error);
            this.updateStepStatus('uploadStep', 'waiting', 'Failed');
            this.showError('Extraction failed: ' + error.message);
        }
    }

    async callYourExtractionAPI(file) {
        // 🔍 YOUR SECRET SAUCE - CCC PDF Extraction System
        console.log('🔒 Calling proprietary CCC extraction system...');
        
        try {
            // Use your custom PDF extractor
            const extractedData = await this.pdfExtractor.extractDataFromCCC(file);
            
            // Validate extraction quality
            const validation = this.pdfExtractor.validateExtraction(extractedData);
            console.log(`🎯 Extraction confidence: ${validation.confidence}%`);
            
            if (validation.confidence < 50) {
                console.warn('⚠️ Low confidence extraction, but proceeding...');
            }
            
            return extractedData;
            
        } catch (error) {
            console.error('❌ Extraction system error:', error);
            throw error;
        }
    }

    /* ================================
       BCIF FORM GENERATION
       ================================ */

    async generateBCIFForm() {
        console.log('📄 Generating BCIF form using Python API...');
        
        this.showProcessingModal('Generating CCC BCIF form via server...');
        this.updateStepStatus('previewStep', 'processing', 'Generating...');

        try {
            // Use Python API for reliable form filling
            this.filledPDF = await this.fillBCIFFormViaAPI();
            
            // Update UI
            this.updateStepStatus('previewStep', 'completed', 'Completed');
            this.updateProgressStep(3);
            this.updateStepStatus('downloadStep', 'ready', 'Ready');
            
            // Show form preview
            this.displayFormPreview();
            
            // Enable finalize button
            const finalizeFormBtn = document.getElementById('finalizeFormBtn');
            if (finalizeFormBtn) finalizeFormBtn.disabled = false;

            console.log('✅ BCIF form generated successfully via Python API');

        } catch (error) {
            console.error('❌ Form generation failed:', error);
            this.updateStepStatus('previewStep', 'waiting', 'Failed');
            this.showError('Form generation failed: ' + error.message);
        } finally {
            this.hideProcessingModal();
        }
    }

    async fillBCIFFormViaAPI() {
        console.log('🐍 Using Python API for BCIF form filling...');
        
        try {
            // Get the full text from the PDF for the API
            const pdfData = await this.pdfExtractor.extractWithCoordinates(await this.uploadedFile.arrayBuffer());
            const fullText = pdfData.fullText;
            
            console.log(`📄 Sending ${fullText.length} characters to Python API`);
            console.log('🔍 First 1000 characters of extracted text:');
            console.log(fullText.substring(0, 1000));
            
            // Call the Python API
            const response = await fetch('http://localhost:5000/fill-bcif', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    extracted_text: fullText,
                    template_name: 'Fillable_CCC_BCIF.pdf'
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            
            // Get the filled PDF as blob
            const pdfBlob = await response.blob();
            console.log(`✅ Received filled PDF: ${pdfBlob.size} bytes`);
            
            // Convert to array buffer for consistency
            return await pdfBlob.arrayBuffer();
            
        } catch (error) {
            console.error('❌ Python API call failed:', error);
            
            // Fallback to client-side approach if API fails
            console.log('🔄 Falling back to client-side PDF generation...');
            return await this.createFallbackPDF(this.bcifData);
        }
    }

    async loadBCIFTemplate() {
        console.log('📄 Loading BCIF form template...');
        
        try {
            // Load the blank BCIF form template (correct filename)
            const response = await fetch('./forms/Fillable_CCC_BCIF.pdf');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const pdfBytes = await response.arrayBuffer();
            
            if (pdfBytes.byteLength === 0) {
                throw new Error('Template PDF file is empty');
            }
            
            console.log(`✅ BCIF template loaded: ${pdfBytes.byteLength} bytes`);
            return pdfBytes;
            
        } catch (error) {
            console.error('❌ Failed to load BCIF template:', error);
            throw new Error(`Template loading failed: ${error.message}`);
        }
    }

    async fillBCIFForm(templateBytes, bcifData) {
        console.log('📝 Filling BCIF form with extracted data...');
        console.log('📊 BCIF data to fill:', bcifData);
        
        try {
            // Check PDF-lib availability
            if (typeof PDFLib === 'undefined' || typeof window.PDFLib === 'undefined') {
                throw new Error('PDF-lib library not loaded. Using fallback approach.');
            }
            
            // Try the simple form filling approach first
            return await this.simpleFillBCIFForm(templateBytes, bcifData);
            
        } catch (error) {
            console.error('❌ Standard form filling failed:', error);
            console.log('🔄 Attempting fallback approach...');
            
            // Fallback: Create a summary PDF instead
            return await this.createFallbackPDF(bcifData);
        }
    }

    async simpleFillBCIFForm(templateBytes, bcifData) {
        console.log('📄 Using simple PDF-lib approach...');
        
        // Use global PDFLib if available
        const PDFLibrary = window.PDFLib || PDFLib;
        const { PDFDocument } = PDFLibrary;
        
        // Load template with minimal processing
        const pdfDoc = await PDFDocument.load(templateBytes);
        
        // Try to get form
        let form;
        try {
            form = pdfDoc.getForm();
        } catch (error) {
            console.warn('⚠️ Could not access form, creating blank PDF');
            return await pdfDoc.save();
        }
        
        console.log(`📋 Form loaded with ${form.getFields().length} fields`);
        
        // Simple text field filling
        const textFields = bcifData.textFields || {};
        let fieldsSet = 0;
        
        for (const [fieldName, value] of Object.entries(textFields)) {
            try {
                const field = form.getTextField(fieldName);
                field.setText(String(value || ''));
                fieldsSet++;
                console.log(`✅ Set: ${fieldName}`);
            } catch (error) {
                // Silently skip fields that don't exist
                continue;
            }
        }
        
        console.log(`📊 Successfully set ${fieldsSet} fields`);
        return await pdfDoc.save();
    }

    async createFallbackPDF(bcifData) {
        console.log('📄 Creating fallback PDF summary...');
        
        try {
            const PDFLibrary = window.PDFLib || PDFLib;
            const { PDFDocument, StandardFonts, rgb } = PDFLibrary;
            
            // Create a new PDF document
            const pdfDoc = await PDFDocument.create();
            const page = pdfDoc.addPage([612, 792]); // Standard letter size
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            
            // Add title
            page.drawText('CCC BCIF Form - Extracted Data', {
                x: 50,
                y: 750,
                size: 16,
                font: font,
                color: rgb(0, 0, 0),
            });
            
            // Add extracted data
            let yPosition = 700;
            const textFields = bcifData.textFields || {};
            
            for (const [fieldName, value] of Object.entries(textFields)) {
                if (yPosition < 50) break; // Prevent overflow
                
                page.drawText(`${fieldName}: ${value}`, {
                    x: 50,
                    y: yPosition,
                    size: 10,
                    font: font,
                    color: rgb(0, 0, 0),
                });
                yPosition -= 20;
            }
            
            console.log('✅ Fallback PDF created successfully');
            return await pdfDoc.save();
            
        } catch (fallbackError) {
            console.error('❌ Fallback PDF creation failed:', fallbackError);
            throw new Error('Both PDF filling approaches failed');
        }
    }

    /* ================================
       FORM PREVIEW AND FINALIZATION
       ================================ */

    displayFormPreview() {
        // Show form preview section
        const formPreviewContainer = document.getElementById('formPreviewContainer');
        if (formPreviewContainer) {
            formPreviewContainer.style.display = 'block';
        }

        // Update preview data
        this.updateFormPreviewData();
        this.updatePreviewStatus('Form Generated', 'completed');
        
        // Show interactive PDF preview in right panel
        this.showInteractivePDFPreview();
    }
    
    async showInteractivePDFPreview() {
        console.log('📄 Displaying interactive PDF preview...');
        console.log('💾 BCIF Data:', this.bcifData);
        
        // Create a preview of the filled form with editable checkboxes
        const previewHTML = this.createInteractiveBCIFPreview();
        
        // Show in right panel
        const formPreviewSection = document.getElementById('formPreviewSection');
        if (formPreviewSection) {
            formPreviewSection.innerHTML = `
                <h4>📑 Interactive BCIF Form Preview</h4>
                <p style="font-size: 0.9rem; color: var(--cipher-text-secondary); margin-bottom: 1rem;">
                    Review the filled form below. Click checkboxes to add missing options, then download when ready.
                </p>
                <div class="interactive-pdf-preview">
                    ${previewHTML}
                </div>
                <div style="margin-top: 1rem; text-align: center;">
                    <button class="cipher-btn cipher-btn--primary" onclick="window.totalLossProcessor.downloadFinalPDF()">
                        📥 Download Final PDF
                    </button>
                </div>
            `;
            formPreviewSection.style.display = 'block';
        }
    }
    
    createInteractiveBCIFPreview() {
        if (!this.bcifData) return '<p>No form data available</p>';
        
        const textFields = this.bcifData.textFields || {};
        const checkboxFields = this.bcifData.checkboxFields || [];
        
        // Create a form-like preview with the actual BCIF structure
        return `
            <div class="bcif-form-preview">
                <!-- Header Section -->
                <div class="form-section">
                    <h3>🏢 Insurance Information</h3>
                    <div class="form-row">
                        <div class="field-group">
                            <label>Company:</label>
                            <span class="field-value">${textFields['Company'] || '-'}</span>
                        </div>
                        <div class="field-group">
                            <label>Claim #:</label>
                            <span class="field-value">${textFields['Claim Number'] || '-'}</span>
                        </div>
                        <div class="field-group">
                            <label>Policy #:</label>
                            <span class="field-value">${textFields['Policy Number'] || '-'}</span>
                        </div>
                    </div>
                </div>

                <!-- Customer Information -->
                <div class="form-section">
                    <h3>👤 Customer Information</h3>
                    <div class="form-row">
                        <div class="field-group">
                            <label>Insured:</label>
                            <span class="field-value">${textFields['Insured First Name'] || ''} ${textFields['Insured Last Name'] || ''}</span>
                        </div>
                        <div class="field-group">
                            <label>Owner:</label>
                            <span class="field-value">${textFields['Owner First Name'] || ''} ${textFields['Owner Last Name'] || ''}</span>
                        </div>
                    </div>
                </div>

                <!-- Vehicle Information -->
                <div class="form-section">
                    <h3>🚗 Vehicle Information</h3>
                    <div class="form-row">
                        <div class="field-group">
                            <label>Year:</label>
                            <span class="field-value">${textFields['Year'] || '-'}</span>
                        </div>
                        <div class="field-group">
                            <label>Make:</label>
                            <span class="field-value">${this.getMakeDisplayName(textFields['Make']) || '-'}</span>
                        </div>
                        <div class="field-group">
                            <label>Model:</label>
                            <span class="field-value">${textFields['Model'] || '-'}</span>
                        </div>
                        <div class="field-group">
                            <label>Trim:</label>
                            <span class="field-value">${textFields['Trim'] || '-'}</span>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="field-group">
                            <label>VIN:</label>
                            <span class="field-value">${textFields['VIN'] || '-'}</span>
                        </div>
                        <div class="field-group">
                            <label>Mileage:</label>
                            <span class="field-value">${textFields['Odometer (mi)'] || textFields['Odometer'] || '-'}</span>
                        </div>
                    </div>
                </div>

                <!-- Vehicle Options (Interactive Checkboxes) -->
                <div class="form-section">
                    <h3>⚙️ Vehicle Options & Features</h3>
                    <p style="font-size: 0.8rem; margin-bottom: 0.5rem; color: var(--cipher-text-secondary);">
                        ✓ = Auto-detected | Click to add/remove options
                    </p>
                    ${this.createInteractiveCheckboxGrid(checkboxFields)}
                </div>

                <!-- Loss Information -->
                <div class="form-section">
                    <h3>📋 Loss Information</h3>
                    <div class="form-row">
                        <div class="field-group">
                            <label>Date of Loss:</label>
                            <span class="field-value">${textFields['Date of loss (mm/dd/yyyy)'] || '-'}</span>
                        </div>
                        <div class="field-group">
                            <label>Type:</label>
                            <span class="field-value">${textFields['Type of Loss'] || '-'}</span>
                        </div>
                        <div class="field-group">
                            <label>State:</label>
                            <span class="field-value">${textFields['Loss State'] || '-'}</span>
                        </div>
                        <div class="field-group">
                            <label>ZIP:</label>
                            <span class="field-value">${textFields['Loss ZIP Code'] || '-'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    createInteractiveCheckboxGrid(selectedOptions) {
        // Common BCIF checkbox options organized by category
        const optionCategories = {
            'Body Style': ['2DR', '4DR', 'Convertible', 'Hatchback', 'Station Wagon', 'Utility'],
            'Fuel Type': ['Gas', 'Diesel', 'Hybrid', 'Electric'],
            'Transmission': ['Automatic', 'Manual'],
            'Power Options': ['PS Power Steering', 'PB Power Brakes', 'PW Power Windows', 'PL Power Locks', 'PM Power Mirrors'],
            'Comfort': ['AC Air Conditioning', 'TW Tilt Wheel', 'CC Cruise Control', 'TL Telescopic Wheel'],
            'Audio': ['AM AM Radio', 'FM FM Radio', 'ST Stereo', 'SE Search/Seek', 'XM Satellite Radio'],
            'Safety': ['AG Driver\'s Side Air Bag', 'RG Passenger Air Bag', 'AB Anti-Lock Brakes (4)', 'DB 4-Wheel Disc Brakes'],
            'Wheels': ['AW Aluminum/Alloy Wheels'],
            'Other': ['KE Keyless Entry', 'RD Rear Defogger', 'NV Navigation System']
        };
        
        let html = '';
        
        for (const [category, options] of Object.entries(optionCategories)) {
            html += `
                <div class="checkbox-category">
                    <h4>${category}</h4>
                    <div class="checkbox-grid">
                        ${options.map(option => {
                            const isChecked = selectedOptions.includes(option);
                            const cleanLabel = option.replace(/^[A-Z0-9]+ /, ''); // Remove prefix codes
                            return `
                                <label class="interactive-checkbox ${isChecked ? 'auto-detected' : ''}">
                                    <input type="checkbox" 
                                           ${isChecked ? 'checked' : ''} 
                                           data-option="${option}"
                                           onchange="window.totalLossProcessor.toggleOption('${option}', this.checked)">
                                    <span class="checkbox-text">${cleanLabel}</span>
                                    ${isChecked ? '<span class="auto-tag">✓</span>' : ''}
                                </label>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }
        
        return html;
    }
    
    toggleOption(option, isChecked) {
        console.log(`${isChecked ? '✅' : '❌'} Toggle option: ${option}`);
        
        if (!this.bcifData.checkboxFields) {
            this.bcifData.checkboxFields = [];
        }
        
        if (isChecked && !this.bcifData.checkboxFields.includes(option)) {
            this.bcifData.checkboxFields.push(option);
        } else if (!isChecked) {
            this.bcifData.checkboxFields = this.bcifData.checkboxFields.filter(opt => opt !== option);
        }
        
        // Update the auto-detected styling
        const checkbox = document.querySelector(`input[data-option="${option}"]`);
        const label = checkbox?.closest('.interactive-checkbox');
        if (label) {
            if (isChecked) {
                label.classList.add('user-selected');
            } else {
                label.classList.remove('user-selected', 'auto-detected');
            }
        }
    }
    
    async downloadFinalPDF() {
        console.log('📥 Generating final PDF with user selections...');
        
        // Show processing
        this.showProcessingModal('Generating final PDF with your selections...');
        
        try {
            // Send updated data to API for final PDF generation
            const response = await fetch('http://localhost:5000/fill-bcif', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    extracted_text: this.buildCustomTextForAPI(),
                    template_name: 'Fillable_CCC_BCIF.pdf'
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            // Download the final PDF
            const pdfBlob = await response.blob();
            const url = URL.createObjectURL(pdfBlob);
            
            const claimNumber = this.bcifData.textFields['Claim Number'] || 'FINAL';
            const timestamp = new Date().toISOString().slice(0, 10);
            const filename = `CCC_BCIF_FINAL_${claimNumber}_${timestamp}.pdf`;
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log('✅ Final PDF downloaded:', filename);
            
        } catch (error) {
            console.error('❌ Final PDF generation failed:', error);
            this.showError('Failed to generate final PDF: ' + error.message);
        } finally {
            this.hideProcessingModal();
        }
    }
    
    buildCustomTextForAPI() {
        // Build text that includes all user selections for the API
        const textFields = this.bcifData.textFields || {};
        const checkboxFields = this.bcifData.checkboxFields || [];
        
        let customText = '';
        
        // Add basic text fields
        for (const [field, value] of Object.entries(textFields)) {
            if (value) {
                customText += `${field}: ${value}\n`;
            }
        }
        
        // Add selected options as text that the checkbox patterns will match
        checkboxFields.forEach(option => {
            const cleanOption = option.replace(/^[A-Z0-9]+ /, '');
            customText += `${cleanOption}\n`;
        });
        
        return customText;
    }
    
    getMakeDisplayName(make) {
        const makeMapping = {
            'CHEV': 'Chevrolet',
            'FORD': 'Ford',
            'TOYO': 'Toyota',
            'HOND': 'Honda',
            'NISS': 'Nissan',
            'HYUN': 'Hyundai',
            'MAZD': 'Mazda',
            'SUBR': 'Subaru',
            'VOLK': 'Volkswagen',
            'JEEP': 'Jeep',
            'CHRY': 'Chrysler',
            'DODG': 'Dodge',
            'BUIC': 'Buick',
            'CADI': 'Cadillac',
            'GMC': 'GMC',
            'LINC': 'Lincoln',
            'ACUR': 'Acura',
            'LEXU': 'Lexus',
            'INFI': 'Infiniti',
            'VOLV': 'Volvo',
            'KIA': 'Kia'
        };
        
        return makeMapping[make] || make;
    }

    updateFormPreviewData() {
        const elements = {
            'previewName': this.bcifData.textFields['Insured Last Name'],
            'previewClaim': this.bcifData.textFields['Claim Number'],
            'previewPolicy': this.bcifData.textFields['Policy Number'],
            'formPreviewName': this.bcifData.textFields['Insured Last Name'],
            'formPreviewClaim': this.bcifData.textFields['Claim Number'],
            'formPreviewPolicy': this.bcifData.textFields['Policy Number']
        };

        for (const [id, value] of Object.entries(elements)) {
            const element = document.getElementById(id);
            if (element && value) {
                element.textContent = value;
            }
        }
    }

    editForm() {
        console.log('✏️ Opening form editor...');
        
        // Convert current BCIF data to editable form
        if (!this.bcifData) {
            this.showError('No form data available to edit');
            return;
        }
        
        // Create editable fields for the key data
        const editableFields = {
            'Insured First Name': this.bcifData.textFields['Insured First Name'] || '',
            'Insured Last Name': this.bcifData.textFields['Insured Last Name'] || '',
            'Claim Number': this.bcifData.textFields['Claim Number'] || '',
            'Policy Number': this.bcifData.textFields['Policy Number'] || '',
            'VIN': this.bcifData.textFields['VIN'] || '',
            'Year': this.bcifData.textFields['Year'] || '',
            'Make': this.bcifData.textFields['Make'] || '',
            'Model': this.bcifData.textFields['Model'] || '',
            'Trim': this.bcifData.textFields['Trim'] || ''
        };
        
        // Create a simple edit modal
        this.showEditModal(editableFields);
    }
    
    showEditModal(fields) {
        // Create modal HTML
        const modalHTML = `
            <div class="cipher-modal" id="editModal" style="display: flex;">
                <div class="modal-content" style="max-width: 600px; max-height: 80vh; overflow-y: auto;">
                    <div class="modal-header">
                        <h3>✏️ Edit BCIF Form Data</h3>
                        <button class="modal-close" id="closeEditModal">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="edit-form">
                            ${Object.entries(fields).map(([key, value]) => `
                                <div class="data-field">
                                    <label for="edit_${key.replace(/\s+/g, '_')}">${key}:</label>
                                    <input type="text" 
                                           id="edit_${key.replace(/\s+/g, '_')}" 
                                           class="cipher-input" 
                                           value="${value}" 
                                           data-field="${key}">
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="cipher-btn cipher-btn--secondary" id="cancelEdit">Cancel</button>
                        <button class="cipher-btn cipher-btn--primary" id="saveEdit">Save Changes</button>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Set up event listeners
        document.getElementById('closeEditModal').addEventListener('click', () => this.closeEditModal());
        document.getElementById('cancelEdit').addEventListener('click', () => this.closeEditModal());
        document.getElementById('saveEdit').addEventListener('click', () => this.saveEditedForm());
    }
    
    closeEditModal() {
        const modal = document.getElementById('editModal');
        if (modal) {
            modal.remove();
        }
    }
    
    saveEditedForm() {
        // Get all edited values
        const editInputs = document.querySelectorAll('#editModal .cipher-input[data-field]');
        const updates = {};
        
        editInputs.forEach(input => {
            const fieldName = input.getAttribute('data-field');
            const newValue = input.value.trim();
            if (newValue) {
                updates[fieldName] = newValue;
            }
        });
        
        // Update the BCIF data
        Object.assign(this.bcifData.textFields, updates);
        
        // Update the preview
        this.updateFormPreviewData();
        
        // Close modal
        this.closeEditModal();
        
        // Show success message
        console.log('✅ Form data updated:', updates);
        
        // Re-generate the form with updated data
        this.generateBCIFForm();
    }

    finalizeForm() {
        console.log('✅ Form finalized');
        
        // Update UI
        this.updateStepStatus('downloadStep', 'completed', 'Ready');
        
        // Show download section
        const downloadReady = document.getElementById('downloadReady');
        const downloadWaiting = document.getElementById('downloadWaiting');
        
        if (downloadReady) downloadReady.style.display = 'block';
        if (downloadWaiting) downloadWaiting.style.display = 'none';
        
        // Enable download button
        const downloadPdfBtn = document.getElementById('downloadPdfBtn');
        if (downloadPdfBtn) downloadPdfBtn.disabled = false;

        // Show download preview
        this.showDownloadPreviewSection();
    }

    /* ================================
       PDF DOWNLOAD
       ================================ */

    async downloadPDF() {
        if (!this.filledPDF) {
            this.showError('No form available to download');
            return;
        }

        try {
            // Create download link
            const blob = new Blob([this.filledPDF], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            
            // Generate filename
            const claimNumber = this.bcifData.textFields['Claim Number'] || 'UNKNOWN';
            const timestamp = new Date().toISOString().slice(0, 10);
            const filename = `CCC_BCIF_${claimNumber}_${timestamp}.pdf`;
            
            // Trigger download
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Clean up
            URL.revokeObjectURL(url);
            
            console.log('📥 PDF downloaded:', filename);

        } catch (error) {
            console.error('❌ Download failed:', error);
            this.showError('Download failed: ' + error.message);
        }
    }

    /* ================================
       UI HELPER METHODS
       ================================ */

    updateProgressStep(step) {
        this.currentStep = step;
        
        // Update overall status
        const overallStatus = document.getElementById('overallStatus');
        if (overallStatus) {
            overallStatus.textContent = `Step ${step} of 3`;
        }

        // Update progress circles
        for (let i = 1; i <= 3; i++) {
            const progressStep = document.getElementById(`progressStep${i}`);
            if (progressStep) {
                progressStep.classList.remove('active', 'completed');
                if (i === step) {
                    progressStep.classList.add('active');
                } else if (i < step) {
                    progressStep.classList.add('completed');
                }
            }
        }
    }

    updateStepStatus(stepId, status, text) {
        const step = document.getElementById(stepId);
        const statusElement = step?.querySelector('.step-status');
        
        if (statusElement) {
            statusElement.className = `step-status ${status}`;
            statusElement.textContent = text;
        }

        if (step) {
            step.classList.remove('active', 'completed');
            if (status === 'processing' || status === 'ready') {
                step.classList.add('active');
            } else if (status === 'completed') {
                step.classList.add('completed');
            }
        }
    }

    updatePreviewStatus(message, status) {
        const previewStatusIndicator = document.getElementById('previewStatusIndicator');
        if (previewStatusIndicator) {
            previewStatusIndicator.innerHTML = `<span class="step-status ${status}">${message}</span>`;
        }
    }

    updateFilePreview(file) {
        const uploadPreview = document.getElementById('uploadPreview');
        const previewFileName = document.getElementById('previewFileName');
        const previewFileSize = document.getElementById('previewFileSize');

        if (previewFileName) previewFileName.textContent = file.name;
        if (previewFileSize) previewFileSize.textContent = this.formatFileSize(file.size);
        if (uploadPreview) uploadPreview.style.display = 'block';
    }

    showFormPreviewSection() {
        const formPreviewSection = document.getElementById('formPreviewSection');
        if (formPreviewSection) formPreviewSection.style.display = 'block';
    }

    showDownloadPreviewSection() {
        const downloadPreview = document.getElementById('downloadPreview');
        if (downloadPreview) downloadPreview.style.display = 'block';
    }

    resetPreviewPanel() {
        const previewSections = ['uploadPreview', 'formPreviewSection', 'downloadPreview'];
        previewSections.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.style.display = 'none';
        });
        
        this.updatePreviewStatus('Waiting for Upload', 'waiting');
    }

    showProcessingModal(message) {
        const modal = document.getElementById('processingModal');
        const messageElement = document.getElementById('processingMessage');
        
        if (messageElement) messageElement.textContent = message;
        if (modal) modal.style.display = 'flex';
    }

    hideProcessingModal() {
        const modal = document.getElementById('processingModal');
        if (modal) modal.style.display = 'none';
    }

    showError(message) {
        // Simple error display - could be enhanced with better UI
        alert(`Error: ${message}`);
        console.error('Error:', message);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.totalLossProcessor = new TotalLossFormsProcessor();
});

// Export for global access
window.TotalLossFormsProcessor = TotalLossFormsProcessor;