// Total Loss Studio — Page controller
// Owns shared state, PDF extraction, CCC parsing, payload hydration,
// summary generation, and BCIF download wiring.
// Imports engines directly — does NOT delegate to index.js.

import { parseCCCText } from './engines/cccParser.js';
import { createEmptyBCIFPayload } from './bcifPayload.js';
import { mapConditionFromCCC } from './engines/conditionEngine.js';
import { evaluateLossType } from './engines/lossEngine.js';
import { buildClaimSummary } from './summaryEngine.js';
import { renderBCIFPayload } from './render/bcifRenderer.js';
import { renderProcessingView, updateStage } from './ui/processingView.js';
import { renderSummaryView } from './ui/summaryView.js';
import { mapEstimateOptionsToBCIF } from './bcifPayloadBuilder.js';
import { generateBCIFPdf } from './render/bcifPdfGenerator.js';

// =========================================
//  BCIF SERVER (optional — DOCX fill when running)
// =========================================

const BCIF_SERVER_BASE = window.BCIF_SERVER_BASE || "http://127.0.0.1:5000";

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
const ASSET_INDEX_PATH = 'forms/bcif/asset-index.json';
let assetIndexCache = null;
let assetIndexPromise = null;

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
//  OPTION LINE PRE-FILTER
//  Keeps only lines that look like vehicle options/features.
//  Prevents non-option lines from spamming "Unmapped option" warnings.
// =========================================

const OPTION_KEYWORDS = /\b(power|pwr|air\s*cond|a\/c|cruise|tilt|leather|cloth|alloy|chrome|heated|sunroof|moonroof|roof|airbag|abs|traction|radio|stereo|cd|bluetooth|navigation|nav|keyless|remote|seat|bucket|captain|spoiler|fog|tint|privacy|rack|tonneau|bedliner|running\s*board|tow|xenon|hid|led|sensor|camera|blind\s*spot|lane|parking|alarm|anti.?theft|turbo|diesel|4wd|awd|4x4|dual|premium|deluxe|conv(ertible)?|woodgrain|vinyl|wiper|defog|console|overhead|memory|homelink)\b/i;

const OPTION_REJECT = /^\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\$[\d,.]+|page\s+\d|^\d+$|claim\s*#|policy\s*#|insured|claimant|vehicle\s*identification|preliminary|supplement|estimate\s*total)/i;

function extractOptionLines(rawText) {
    return rawText
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 3 && l.length < 200)
        .filter(l => OPTION_KEYWORDS.test(l) && !OPTION_REJECT.test(l));
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
        const assetIndex = await loadAssetIndex();

        // Asset-index extraction (2-char code matching)
        const assetOptions = extractOptionsFromText(rawText, assetIndex);
        console.log('[TLS] Asset-index matched codes:', assetOptions);

        // Pattern-based extraction (descriptive text → tokens)
        const optionLines = extractOptionLines(rawText);
        console.log(`[TLS] Option lines extracted: ${optionLines.length} of ${rawText.split('\n').length} total`);
        const patternTokens = mapEstimateOptionsToBCIF(optionLines);
        console.log('[TLS] Pattern-matched tokens:', patternTokens);

        // Merge both sources (deduplicated)
        const mergedOptions = [...new Set([...assetOptions, ...patternTokens])];
        parsed.options = mergedOptions;
        console.log('[TLS] Raw options (merged):', mergedOptions);
        console.log(`[TLS] Parsed options count: ${parsed.options.length}`);

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

    // New parsed fields → claim
    payload.claim.ownerName    = parsed.ownerName            || '';
    payload.claim.ownerPhone   = parsed.ownerPhone           || '';
    payload.claim.lossZip      = parsed.lossZip              || '';

    // Vehicle
    payload.vehicle.year       = String(parsed.year || '');
    payload.vehicle.make       = parsed.make                || '';
    payload.vehicle.model      = parsed.model               || '';
    payload.vehicle.vin        = parsed.vin                 || '';
    payload.vehicle.odometer   = parsed.mileage             || '';
    payload.vehicle.bodyStyle  = parsed.bodyStyle            || '';
    payload.vehicle.engine     = buildEngineString(parsed);

    // Condition
    const condition = mapConditionFromCCC(parsed.conditionRating);
    payload.condition = { ...payload.condition, ...condition };

    // Options — run through pattern matcher to get 2-char BCIF token codes
    payload.options = mapEstimateOptionsToBCIF(parsed.options || []);
    console.log('[TLS] Matched tokens:', Array.from(payload.options));

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

function buildEngineString(parsed) {
    // Compose an engine description string compatible with bcifRenderer's
    // parseCylinders() and parseTransmission() helpers.
    // e.g. "4 cylinder 1.8L Auto"
    const parts = [];

    // Cylinders: "CYL_4" → "4 cylinder"
    if (parsed.cylinders) {
        const n = parsed.cylinders.replace(/^CYL_/, '');
        if (n) parts.push(`${n} cylinder`);
    }

    // Engine size: "1.8L"
    if (parsed.engineSize) parts.push(parsed.engineSize);

    // Transmission: "TRANS_AUTO" → "Auto", "TRANS_S5" → "5-Speed"
    if (parsed.transmission) {
        const t = parsed.transmission;
        if (t === 'TRANS_AUTO') parts.push('Auto');
        else if (t === 'TRANS_S3') parts.push('3-Speed');
        else if (t === 'TRANS_S4') parts.push('4-Speed');
        else if (t === 'TRANS_S5') parts.push('5-Speed');
        else if (t === 'TRANS_S6') parts.push('6-Speed');
        else if (t === 'TRANS_4W') parts.push('4WD');
        else if (t === 'TRANS_OD') parts.push('Overdrive');
        else if (t === 'TRANS_PO') parts.push('Power Overdrive');
    }

    return parts.join(' ') || '';
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

    // --- Copy Summary ---

    document.getElementById('tls-copy-summary')
        ?.addEventListener('click', handleCopySummary);

    // --- Download Summary (.txt) ---

    document.getElementById('tls-download-summary')
        ?.addEventListener('click', handleDownloadSummary);

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
//  COPY SUMMARY
// =========================================

function handleCopySummary() {
    const textarea = document.getElementById('sv-damageSummary');
    const status = document.getElementById('tls-copy-status');

    if (!textarea || !textarea.value.trim()) {
        if (status) status.textContent = "Nothing to copy.";
        return;
    }

    const text = textarea.value;

    async function copyModern() {
        await navigator.clipboard.writeText(text);
    }

    function copyFallback() {
        textarea.select();
        document.execCommand('copy');
    }

    (async () => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await copyModern();
            } else {
                copyFallback();
            }
            if (status) {
                status.textContent = "Copied \u2713";
                setTimeout(() => status.textContent = "", 1500);
            }
        } catch (err) {
            console.error("[TLS] Copy failed:", err);
            if (status) status.textContent = "Copy failed.";
        }
    })();
}

// =========================================
//  DOWNLOAD SUMMARY (.txt)
// =========================================

function handleDownloadSummary() {
    const textarea = document.getElementById('sv-damageSummary');
    const status = document.getElementById('tls-copy-status');

    if (!textarea || !textarea.value.trim()) {
        if (status) status.textContent = "Nothing to download.";
        return;
    }

    const claimNumber = state.bcifPayload?.claim?.claimNumber || 'EXPORT';
    const fileName = `SUMMARY_${claimNumber}.txt`;
    const blob = new Blob([textarea.value], { type: 'text/plain' });
    triggerDownload(blob, fileName);

    if (status) {
        status.textContent = "Summary downloaded \u2713";
        setTimeout(() => status.textContent = "", 1500);
    }
}

// =========================================
//  DOWNLOAD — validates, renders tokens, fills form
//  Priority: DOCX server → client-side PDF → JSON fallback
// =========================================

async function handleDownload() {
    if (!state.bcifPayload) {
        console.warn('[TLS] Download aborted: bcifPayload is null');
        return;
    }

    console.log('[TLS] Download clicked');

    if (!validateBeforeDownload(state.bcifPayload)) return;

    const downloadBtn = document.getElementById('sv-download');
    if (downloadBtn) downloadBtn.disabled = true;

    try {
        // ── 1. Summary generation (no server dependency) ──
        console.log('[TLS] Summary generation starting...');
        state.bcifPayload.summary.damageSummary = buildClaimSummary(
            state.parsedEstimate,
            state.bcifPayload
        );
        console.log('[TLS] Summary generation complete:', state.bcifPayload.summary.damageSummary.length, 'chars');

        const textarea = document.getElementById('sv-damageSummary');
        if (textarea) textarea.value = state.bcifPayload.summary.damageSummary;

        // ── 2. Build final token map (no server dependency) ──
        state.tokenMap = renderBCIFPayload(state.bcifPayload);
        state.tokenMap._DAMAGE_SUMMARY = state.bcifPayload.summary.damageSummary || '';

        const tokenKeys = Object.keys(state.tokenMap || {});
        const activeTokens = tokenKeys.filter(k => state.tokenMap[k] !== '' && !k.startsWith('_'));
        console.log(`[TLS] TokenMap total keys: ${tokenKeys.length}, active (non-empty): ${activeTokens.length}`);

        let downloaded = false;

        // ── 3a. Try DOCX server fill (if Flask is running) ──
        try {
            const bcifUrl = `${BCIF_SERVER_BASE}/fill-bcif-docx`;
            console.log('[TLS] Attempting DOCX server fill:', bcifUrl);
            const response = await fetch(bcifUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(state.tokenMap)
            });

            if (response.ok) {
                const blob = await response.blob();
                if (blob.size > 0) {
                    triggerDownload(blob, buildFileName('.docx'));
                    downloaded = true;
                    console.log('[TLS] DOCX download complete, size:', blob.size);
                }
            } else {
                console.warn('[TLS] DOCX server responded:', response.status);
            }
        } catch (fetchErr) {
            console.log('[TLS] DOCX server not available:', fetchErr.message);
        }

        // ── 3b. Fallback: client-side PDF via pdf-lib ──
        if (!downloaded) {
            try {
                if (typeof window.PDFLib === 'undefined') {
                    throw new Error('pdf-lib not loaded.');
                }
                console.log('[TLS] Generating BCIF PDF client-side...');
                const pdfBytes = await generateBCIFPdf(state.tokenMap);
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                console.log('[TLS] PDF generated, size:', blob.size);
                triggerDownload(blob, buildFileName('.pdf'));
                downloaded = true;
            } catch (pdfErr) {
                console.error('[TLS] Client-side PDF failed:', pdfErr);
            }
        }

        // ── 3c. Last resort: JSON download ──
        if (!downloaded) {
            console.log('[TLS] Fallback: JSON download');
            const jsonStr = JSON.stringify(state.tokenMap, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            triggerDownload(blob, buildFileName('.json'));
            alert('Form generation failed. Token map saved as JSON.');
        }

    } catch (err) {
        console.error('[TLS] Download failed:', err);
        alert(err.message || 'Download failed. Please try again.');
    } finally {
        if (downloadBtn) downloadBtn.disabled = false;
    }
}

function buildFileName(ext) {
    const claimNumber = state.bcifPayload?.claim?.claimNumber || '';
    return claimNumber ? `BCIF_${claimNumber}${ext}` : `BCIF_EXPORT${ext}`;
}

function triggerDownload(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    console.log('[TLS] Download triggered:', fileName, 'size:', blob.size);
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
        state.bcifPayload.options = mapEstimateOptionsToBCIF(selectedValues.length ? selectedValues : []);
        console.debug('[TLS] Options selected:', state.bcifPayload.options);
    };

    applySelectedOptions();
    optionsSelect.addEventListener('change', applySelectedOptions);
}

async function loadAssetIndex() {
    if (assetIndexCache) return assetIndexCache;
    if (assetIndexPromise) return assetIndexPromise;

    assetIndexPromise = fetch(ASSET_INDEX_PATH)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Asset index load failed: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            assetIndexCache = data;
            return data;
        })
        .catch(error => {
            console.warn('[TLS] Asset index unavailable:', error.message || error);
            assetIndexCache = null;
            return null;
        })
        .finally(() => {
            assetIndexPromise = null;
        });

    return assetIndexPromise;
}

function extractOptionsFromText(rawText, assetIndex) {
    const optionList = assetIndex?.schema?.parts?.options || [];
    if (!rawText || optionList.length === 0) return [];

    const tokens = new Set(
        rawText
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, ' ')
            .trim()
            .split(/\s+/)
            .filter(Boolean)
    );

    return optionList.filter(code => tokens.has(String(code).toUpperCase()));
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
