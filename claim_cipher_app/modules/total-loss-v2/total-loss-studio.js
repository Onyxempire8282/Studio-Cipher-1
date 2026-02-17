// Total Loss Studio — Page controller
// Owns shared state, PDF extraction, CCC parsing, payload hydration,
// summary generation, and BCIF download wiring.
// Imports engines directly — does NOT delegate to index.js.

import { parseCCCText } from './engines/cccParser.js';
import { createEmptyBCIFPayload } from './bcifPayload.js';
import { mapConditionFromCCC } from './engines/conditionEngine.js';
import { normalizeOptions } from './engines/optionsEngine.js';
import { evaluateLossType } from './engines/lossEngine.js';
import { buildClaimSummary } from './summaryEngine.js';
import { renderBCIFPayload } from './render/bcifRenderer.js';
import { renderProcessingView, updateStage } from './ui/processingView.js';
import { renderSummaryView } from './ui/summaryView.js';

// =========================================
//  SHARED STATE
// =========================================

const state = {
    parsedEstimate: null,
    bcifPayload: null,
    tokenMap: null
};

// Expose for console inspection / downstream consumers
window.tlsState = state;

const container = document.getElementById('tl-v2-container');

// =========================================
//  INIT
// =========================================

export function initTotalLossStudio() {
    if (!container) {
        console.error('[TLS] #tl-v2-container not found.');
        return;
    }
    state.parsedEstimate = null;
    state.bcifPayload = null;
    state.tokenMap = null;
    renderDropZone();
}

// =========================================
//  DROP ZONE
// =========================================

function renderDropZone() {
    container.innerHTML = `
        <div class="tls-dropzone" id="tls-dropzone">
            <div class="tls-dropzone__icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(184,115,51,0.6)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
            </div>

            <h3 class="cipher-section-title tls-dropzone__title">Drop CCC Estimate Here</h3>
            <p class="cipher-body tls-dropzone__subtitle">PDF format accepted</p>

            <button class="cipher-btn cipher-btn--primary" id="tls-browse-btn">
                <div class="rivet tl"></div><div class="rivet tr"></div>
                <div class="rivet bl"></div><div class="rivet br"></div>
                Browse Files
            </button>

            <input type="file" id="tls-file-input" accept=".pdf" style="display: none;" />
        </div>
    `;

    const dropzone = document.getElementById('tls-dropzone');
    const fileInput = document.getElementById('tls-file-input');
    const browseBtn = document.getElementById('tls-browse-btn');

    browseBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        fileInput.click();
    });

    dropzone.addEventListener('click', function () {
        fileInput.click();
    });

    dropzone.addEventListener('dragover', function (e) {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--cipher-accent)';
        dropzone.style.background = 'rgba(184, 115, 51, 0.05)';
    });

    dropzone.addEventListener('dragleave', function (e) {
        e.preventDefault();
        dropzone.style.borderColor = 'rgba(184, 115, 51, 0.3)';
        dropzone.style.background = '';
    });

    dropzone.addEventListener('drop', function (e) {
        e.preventDefault();
        dropzone.style.borderColor = 'rgba(184, 115, 51, 0.3)';
        dropzone.style.background = '';

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    fileInput.addEventListener('change', function () {
        if (fileInput.files.length > 0) {
            handleFile(fileInput.files[0]);
        }
    });
}

// =========================================
//  FILE HANDLER — main pipeline
// =========================================

async function handleFile(file) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
        showError('Invalid file type. Please upload a PDF file.');
        return;
    }

    try {
        // 1. Show processing animation early
        container.innerHTML = renderProcessingView();
        updateStage(0);
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        await delay(800);

        // 2. Extract raw text
        const rawText = await extractTextFromPDF(file);

        if (!rawText || rawText.trim().length === 0) {
            showError('Could not extract text from this PDF. The file may be image-based or corrupted.');
            return;
        }

        // 2. Parse with CCC parser
        const parsed = parseCCCText(rawText);

        if (!parsed.vin && !parsed.claimNumber && !parsed.ownerName) {
            showError('This PDF does not appear to be a CCC Preliminary Estimate. No claim, VIN, or owner data could be identified.');
            return;
        }

        // 3. Store in shared state
        state.parsedEstimate = parsed;

        // 4. Build bcifPayload from parsed estimate
        state.bcifPayload = buildPayloadFromParsed(parsed);
        updateStage(1);
        await delay(600);

        // 5. Build summary text
        updateStage(2);
        state.bcifPayload.summary.damageSummary = buildClaimSummary(
            state.parsedEstimate,
            state.bcifPayload
        );
        await delay(600);

        // 6. Build token map
        updateStage(3);
        state.tokenMap = renderBCIFPayload(state.bcifPayload);
        await delay(500);

        // 7. Render summary view
        updateStage(4);
        await delay(400);

        container.style.transition = 'opacity 200ms';
        container.style.opacity = '0';

        await delay(200);
        container.innerHTML = renderSummaryView(state.bcifPayload);
        container.style.opacity = '1';

        // 8. Wire all listeners
        attachSummaryListeners();

    } catch (err) {
        console.error('[TLS] Processing failed:', err);
        showError(err.message || 'An unexpected error occurred while processing the estimate.');
    }
}

// =========================================
//  PAYLOAD BUILDER — engines only, no UI
// =========================================

function buildPayloadFromParsed(parsed) {
    const payload = createEmptyBCIFPayload();

    // Claim
    payload.claim.carrier      = parsed.carrierName         || '';
    payload.claim.claimNumber  = parsed.claimNumber         || '';
    payload.claim.policyNumber = parsed.policyNumber        || '';
    payload.claim.lossType     = parsed.lossType            || '';
    payload.claim.dateOfLoss   = parsed.dateOfLoss          || '';
    payload.claim.lossLocation = parsed.inspectionLocation  || '';

    // Vehicle
    payload.vehicle.year       = String(parsed.year || '');
    payload.vehicle.make       = parsed.make                || '';
    payload.vehicle.model      = parsed.model               || '';
    payload.vehicle.vin        = parsed.vin                 || '';
    payload.vehicle.odometer   = parsed.mileage             || '';

    // Condition
    const condition = mapConditionFromCCC(parsed.conditionRating);
    payload.condition = { ...payload.condition, ...condition };

    // Options
    payload.options = normalizeOptions(parsed.options || []);

    // Loss evaluation → conclusion
    const lossResult = evaluateLossType({
        estimateTotal: parsed.estimateTotal,
        acv: parsed.acv
    });

    payload.summary.conclusion = lossResult.isTotalLoss
        ? 'Vehicle is declared a total loss based on estimate threshold.'
        : 'Vehicle appears repairable based on current estimate data.';

    return payload;
}

// =========================================
//  SUMMARY LISTENERS — all post-render wiring
// =========================================

function attachSummaryListeners() {
    // --- Input → state sync ---

    bindInput('sv-carrier',     v => { state.bcifPayload.claim.carrier = v; });
    bindInput('sv-claimNumber', v => { state.bcifPayload.claim.claimNumber = v; });
    bindInput('sv-adjuster',    v => { state.bcifPayload.claim.adjuster = v; });
    bindInput('sv-year',        v => { state.bcifPayload.vehicle.year = v; });
    bindInput('sv-make',        v => { state.bcifPayload.vehicle.make = v; });
    bindInput('sv-model',       v => { state.bcifPayload.vehicle.model = v; });
    bindInput('sv-vin',         v => { state.bcifPayload.vehicle.vin = v; });
    bindInput('sv-additionalNotes', v => { state.bcifPayload.summary.additionalNotes = v; });

    setupOptionsSelect();

    const overallEl = document.getElementById('sv-overall');
    if (overallEl) {
        overallEl.addEventListener('change', e => {
            const val = parseInt(e.target.value, 10);
            state.bcifPayload.condition.overall   = val;
            state.bcifPayload.condition.exterior   = val;
            state.bcifPayload.condition.interior   = val;
            state.bcifPayload.condition.mechanical = val;
        });
    }

    // --- Generate Summary ---

    const generateBtn = document.getElementById('sv-generateSummary');
    if (generateBtn) {
        if (generateBtn.dataset.bound === '1') {
            console.debug('[TLS] Generate Summary already bound.');
        } else {
            generateBtn.dataset.bound = '1';
            generateBtn.addEventListener('click', handleGenerateSummary);
        }
    } else {
        console.warn('[TLS] Generate Summary button not found.');
    }

    // --- Download ---

    const downloadBtn = document.getElementById('sv-download');
    if (downloadBtn) {
        if (downloadBtn.dataset.bound === '1') {
            console.debug('[TLS] Download already bound.');
        } else {
            downloadBtn.dataset.bound = '1';
            downloadBtn.addEventListener('click', handleDownload);
        }
    }
}

function bindInput(id, setter) {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('input', e => setter(e.target.value));
    }
}

// =========================================
//  GENERATE SUMMARY — rebuilds from state
// =========================================

function handleGenerateSummary() {
    if (!state.parsedEstimate) {
        console.warn('[TLS] Generate Summary aborted: parsedEstimate missing.');
        showSummaryStatus('Summary unavailable.');
        return;
    }

    if (!state.bcifPayload) {
        console.warn('[TLS] Generate Summary aborted: bcifPayload missing.');
        showSummaryStatus('Summary unavailable.');
        return;
    }

    console.log('[TLS] Generate Summary clicked.');

    // Rebuild summary text from current parsed estimate + edited payload
    const previousSummary = state.bcifPayload.summary.damageSummary || '';
    state.bcifPayload.summary.damageSummary = buildClaimSummary(
        state.parsedEstimate,
        state.bcifPayload
    );
    const nextSummary = state.bcifPayload.summary.damageSummary || '';

    // Refresh token map
    state.tokenMap = renderBCIFPayload(state.bcifPayload);

    // Update the textarea
    const textarea = document.getElementById('sv-damageSummary');
    if (textarea) {
        if (textarea.value !== nextSummary) {
            textarea.value = nextSummary;
        }
    }

    if (previousSummary === nextSummary) {
        showSummaryStatus('Summary regenerated.');
    } else {
        showSummaryStatus('Summary updated.');
    }
}

function showSummaryStatus(message) {
    const actions = document.querySelector('.sv-actions');
    if (!actions) return;

    let status = document.getElementById('sv-status');
    if (!status) {
        status = document.createElement('div');
        status.id = 'sv-status';
        status.style.marginTop = '8px';
        status.style.fontSize = '0.85rem';
        status.style.color = 'var(--cipher-text-muted, #9aa0a6)';
        status.style.transition = 'opacity 200ms';
        actions.appendChild(status);
    }

    status.textContent = message;
    status.style.opacity = '1';
    setTimeout(() => {
        if (status) {
            status.style.opacity = '0';
        }
    }, 1500);
}

// =========================================
//  DOWNLOAD — validates, renders tokens, POSTs
// =========================================

async function handleDownload() {
    if (!state.bcifPayload) return;

    console.debug('[TLS] Download clicked');

    if (!validateBeforeDownload(state.bcifPayload)) return;

    const downloadBtn = document.getElementById('sv-download');
    if (downloadBtn) downloadBtn.disabled = true;

    try {
        // Build final token map from current state
        state.tokenMap = renderBCIFPayload(state.bcifPayload);
        const tokenKeys = Object.keys(state.tokenMap || {});
        console.debug(`[TLS] Posting tokenMap keys: ${tokenKeys.length}`);

        const response = await fetch('/fill-bcif-docx', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state.tokenMap)
        });

        console.debug('[TLS] Download response:', response.status, response.headers.get('content-type'));

        if (!response.ok) {
            let msg = `Request failed with status ${response.status}.`;
            try {
                const json = await response.json();
                msg = json.error || JSON.stringify(json);
            } catch (_) {
                const text = await response.text();
                if (text) msg = text;
            }
            alert(msg);
            return;
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const claimNumber = state.bcifPayload.claim.claimNumber || '';
        const fileName = claimNumber ? `BCIF_${claimNumber}.docx` : 'BCIF_EXPORT.docx';

        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);

    } catch (err) {
        alert(err.message || 'Download failed. Please try again.');
    } finally {
        if (downloadBtn) downloadBtn.disabled = false;
    }
}

function validateBeforeDownload(payload) {
    const required = [
        { name: 'carrier', value: payload.claim.carrier },
        { name: 'claimNumber', value: payload.claim.claimNumber },
        { name: 'year', value: payload.vehicle.year },
        { name: 'make', value: payload.vehicle.make },
        { name: 'model', value: payload.vehicle.model },
        { name: 'vin', value: payload.vehicle.vin }
    ];

    const missing = required.find(field => !String(field.value || '').trim());
    if (missing) {
        console.warn('[TLS] Validation failed. Missing:', missing.name);
        alert('Please complete all required claim and vehicle fields before downloading the form.');
        return false;
    }

    const overallValue = Number(payload.condition.overall);
    if (!Number.isFinite(overallValue)) {
        console.warn('[TLS] Validation failed. Invalid condition.overall:', payload.condition.overall);
        alert('Please select a condition rating before downloading.');
        return false;
    }

    return true;
}

function setupOptionsSelect() {
    const optionsSelect = document.getElementById('sv-optionsSelect');
    const options = Array.isArray(state.parsedEstimate?.options)
        ? state.parsedEstimate.options
        : [];

    console.debug('[TLS] Options select exists:', Boolean(optionsSelect));
    console.debug(`[TLS] Parsed options count: ${options.length}`);

    if (!optionsSelect) return;

    if (options.length === 0) {
        optionsSelect.disabled = true;
        optionsSelect.innerHTML = '<option value="" disabled>No options parsed</option>';
        return;
    }

    const uniqueOptions = [...new Set(options.filter(Boolean))];
    const selectedOptions = new Set(state.bcifPayload?.options || []);
    optionsSelect.disabled = false;
    optionsSelect.innerHTML = '';
    uniqueOptions.forEach(optionValue => {
        const optionEl = document.createElement('option');
        optionEl.value = String(optionValue);
        optionEl.textContent = String(optionValue);
        if (selectedOptions.has(optionEl.value)) {
            optionEl.selected = true;
        }
        optionsSelect.appendChild(optionEl);
    });

    const applySelectedOptions = () => {
        const selectedValues = Array.from(optionsSelect.selectedOptions).map(opt => opt.value);
        state.bcifPayload.options = normalizeOptions(selectedValues.length ? selectedValues : []);
        console.debug('[TLS] Options selected:', state.bcifPayload.options);
    };

    applySelectedOptions();
    optionsSelect.addEventListener('change', applySelectedOptions);
}

// =========================================
//  PDF TEXT EXTRACTION (pdf.js)
// =========================================

async function extractTextFromPDF(file) {
    if (typeof pdfjsLib === 'undefined') {
        throw new Error('PDF.js library not loaded. Cannot extract text.');
    }

    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map(item => item.str);
        pages.push(strings.join('\n'));
    }

    return pages.join('\n');
}

// =========================================
//  ERROR DISPLAY
// =========================================

function showError(message) {
    container.innerHTML = `
        <div class="cipher-plate elevation-1" style="padding: var(--cipher-space-xl); text-align: center; border: 1px solid rgba(231, 76, 60, 0.3);">
            <div class="rivet tl"></div>
            <div class="rivet tr"></div>
            <div class="rivet bl"></div>
            <div class="rivet br"></div>

            <div style="margin-bottom: var(--cipher-space-md); color: var(--cipher-danger, #e74c3c);">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
            </div>

            <h3 class="cipher-section-title" style="color: var(--cipher-danger, #e74c3c); margin-bottom: var(--cipher-space-xs);">Processing Failed</h3>
            <p class="cipher-body" style="color: var(--cipher-text-muted); margin-bottom: var(--cipher-space-lg); max-width: 480px; margin-left: auto; margin-right: auto;">${escapeHTML(message)}</p>

            <button class="cipher-btn cipher-btn--primary" id="tls-retry-btn">
                <div class="rivet tl"></div><div class="rivet tr"></div>
                <div class="rivet bl"></div><div class="rivet br"></div>
                Try Again
            </button>
        </div>
    `;

    document.getElementById('tls-retry-btn').addEventListener('click', renderDropZone);
}

// =========================================
//  HELPERS
// =========================================

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
