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
import { mountProcessingView, unmountProcessingView, updateStage } from './ui/processingView.js';
import { renderSummaryView } from './ui/summaryView.js';
import { mapEstimateOptionsToBCIF, TOKEN_META } from './bcifPayloadBuilder.js';
import { generateBCIFPdf } from './render/bcifPdfGenerator.js';
import { generateClaimSummaryDocx } from './render/claimSummaryDocx.js';

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

export function initTotalLossDemo(demoPayload, demoParsed) {
    if (!container) return;

    // Stage 1: Render normal drop zone, then flip to "file selected" state
    renderDropZone();

    const defaultState  = document.getElementById('defaultState');
    const selectedState = document.getElementById('selectedState');
    const fileNameEl    = document.getElementById('fileName');
    const fileSizeEl    = document.getElementById('fileSize');
    const dropzone      = document.getElementById('dropzone');
    const proceedBtn    = document.getElementById('proceedBtn');
    const cancelBtn     = document.getElementById('cancelBtn');

    if (defaultState)  defaultState.style.display = 'none';
    if (selectedState) selectedState.style.display = 'flex';
    if (fileNameEl)    fileNameEl.textContent = 'CCC_Estimate_CLM-2026-00142.pdf';
    if (fileSizeEl)    fileSizeEl.textContent = '0.2 MB';
    if (dropzone) {
        dropzone.style.borderColor = 'var(--amber, #e8952a)';
        dropzone.style.borderStyle = 'solid';
    }

    // Disable cancel — there's no real file to remove
    if (cancelBtn) cancelBtn.style.display = 'none';

    // Stage 2 & 3: On click, run the processing animation then show summary
    if (proceedBtn) {
        proceedBtn.addEventListener('click', async function demoProcess() {
            proceedBtn.removeEventListener('click', demoProcess);

            // Processing animation — same stages as handleFile()
            mountProcessingView();
            updateStage(0);
            await delay(800);

            state.parsedEstimate = demoParsed;
            state.bcifPayload = demoPayload;
            updateStage(1);
            await delay(600);

            updateStage(2);
            await delay(600);

            state.tokenMap = renderBCIFPayload(demoPayload);
            updateStage(3);
            await delay(500);

            updateStage(4);
            await delay(400);

            unmountProcessingView();

            // Fade in summary
            container.style.transition = 'opacity 200ms';
            container.style.opacity = '0';
            await delay(200);
            container.innerHTML = renderSummaryView(demoPayload);
            container.style.opacity = '1';
            updateSummaryHeaderFooter(demoPayload);
            attachSummaryListeners();

            // Intercept downloads in demo mode — show toast instead
            interceptDemoDownloads();
        });
    }
}

function interceptDemoDownloads() {
    const downloadBtn = document.getElementById('sv-download');
    const summaryBtn  = document.getElementById('tls-download-summary');

    function showDemoToast(msg) {
        let toast = document.getElementById('demo-download-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'demo-download-toast';
            toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);'
                + 'background:#1a1a1a;border:1px solid #e8952a;color:#d0d0d0;padding:12px 24px;'
                + 'font-family:"DM Mono",monospace;font-size:13px;z-index:10001;border-radius:4px;'
                + 'transition:opacity 300ms;';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.style.opacity = '1';
        clearTimeout(toast._timer);
        toast._timer = setTimeout(function() { toast.style.opacity = '0'; }, 3000);
    }

    if (downloadBtn) {
        // Remove the real handler that attachSummaryListeners just added
        const fresh = downloadBtn.cloneNode(true);
        downloadBtn.parentNode.replaceChild(fresh, downloadBtn);
        fresh.addEventListener('click', function(e) {
            e.preventDefault();
            showDemoToast('Demo Mode — Sign up to download BCIF forms');
        });
    }

    if (summaryBtn) {
        const fresh = summaryBtn.cloneNode(true);
        summaryBtn.parentNode.replaceChild(fresh, summaryBtn);
        fresh.addEventListener('click', function(e) {
            e.preventDefault();
            showDemoToast('Demo Mode — Sign up to download claim summaries');
        });
    }
}

// =========================================
//  DROP ZONE
// =========================================

function renderDropZone() {
    container.innerHTML = `
<div class="stage">

    <div class="stage-glow"></div>

    <div class="upload-panel">

        <div class="panel-chrome">

            <div class="panel-header">
                <div class="panel-title">Load Estimate</div>
                <div class="panel-line"></div>
                <div class="panel-status">
                    <div class="status-dot ready"></div>
                    Ready
                </div>
            </div>

            <div class="panel-body">

                <div class="dropzone" id="dropzone">

                    <!-- Default state -->
                    <div class="dz-default" id="defaultState">
                        <div class="upload-icon-wrap">
                            <div style="display:flex;flex-direction:column;align-items:center">
                                <div class="upload-icon"></div>
                                <div class="upload-tray"></div>
                            </div>
                        </div>
                        <div>
                            <div class="drop-headline">Drop CCC Estimate Here</div>
                            <div class="drop-sub">PDF format · CCC ONE exports accepted</div>
                        </div>
                        <div class="drop-or">
                            <div class="drop-or-line"></div>
                            <div class="drop-or-text">or</div>
                            <div class="drop-or-line"></div>
                        </div>
                        <button class="browse-btn" id="browseBtn">Browse Files</button>
                    </div>

                    <!-- File selected state -->
                    <div class="dz-selected" id="selectedState">
                        <div class="file-icon-wrap">PDF</div>
                        <div>
                            <div class="file-name" id="fileName">estimate.pdf</div>
                            <div class="file-size" id="fileSize">—</div>
                        </div>
                        <button class="file-proceed" id="proceedBtn">Process Estimate →</button>
                        <button class="file-cancel" id="cancelBtn">✕ Remove file</button>
                    </div>

                    <input type="file" id="fileInput" accept=".pdf" hidden>

                </div>

            </div>

            <div class="specs-row">
                <div class="spec">
                    <div class="spec-label">Accepted Source</div>
                    <div class="spec-value">CCC ONE</div>
                </div>
                <div class="spec">
                    <div class="spec-label">Output</div>
                    <div class="spec-value">BCIF + Claim Summary</div>
                </div>
                <div class="spec">
                    <div class="spec-label">Processing</div>
                    <div class="spec-value">~4 seconds</div>
                </div>
            </div>

        </div>

        <div class="history-strip">

            <div class="history-header">
                <div class="history-title">Recent</div>
                <div class="history-line"></div>
            </div>

            <div class="history-items" id="historyItems"></div>

        </div>

    </div>

</div>
    `;

    const dropzone      = document.getElementById('dropzone');
    const fileInput     = document.getElementById('fileInput');
    const browseBtn     = document.getElementById('browseBtn');
    const defaultState  = document.getElementById('defaultState');
    const selectedState = document.getElementById('selectedState');
    const fileNameEl    = document.getElementById('fileName');
    const fileSizeEl    = document.getElementById('fileSize');
    const proceedBtn    = document.getElementById('proceedBtn');
    const cancelBtn     = document.getElementById('cancelBtn');

    let pendingFile = null;

    function showSelected(file) {
        pendingFile = file;
        fileNameEl.textContent = file.name;
        fileSizeEl.textContent = (file.size / 1024 / 1024).toFixed(1) + ' MB';
        defaultState.style.display = 'none';
        selectedState.style.display = 'flex';
        dropzone.style.borderColor = 'var(--amber, #e8952a)';
        dropzone.style.borderStyle = 'solid';
    }

    function resetDrop() {
        pendingFile = null;
        defaultState.style.display = 'flex';
        selectedState.style.display = 'none';
        dropzone.style.borderColor = '';
        dropzone.style.borderStyle = '';
        fileInput.value = '';
    }

    browseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) showSelected(file);
    });

    proceedBtn.addEventListener('click', () => {
        if (pendingFile) handleFile(pendingFile);
    });

    cancelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetDrop();
    });

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('drag-over');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) showSelected(file);
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
        mountProcessingView();
        updateStage(0);
        await delay(800);

        // 2. Extract raw text
        const rawText = await extractTextFromPDF(file);

        if (!rawText || rawText.trim().length === 0) {
            showError('Could not extract text from this PDF. The file may be image-based or corrupted.');
            return;
        }

        // 2. Parse with CCC parser
        const parsed = parseCCCText(rawText);

        if (!parsed.success) {
            unmountProcessingView();
            showError(parsed.message);
            return;
        }

        const assetIndex = await loadAssetIndex();

        // Asset-index extraction (2-char code matching)
        const assetOptions = extractOptionsFromText(rawText, assetIndex);
        console.log('[TLS] Asset-index matched codes:', assetOptions);

        // Pattern-based extraction (descriptive text → tokens)
        const optionLines = extractOptionLines(rawText);
        console.log(`[TLS] Option lines extracted: ${optionLines.length} of ${rawText.split('\n').length} total`);
        const patternTokens = mapEstimateOptionsToBCIF(optionLines);
        console.log('[TLS] Pattern-matched tokens:', patternTokens);

        // Merge both sources (deduplicated) — overrides parser's raw text options
        const mergedOptions = [...new Set([...assetOptions, ...patternTokens])];
        parsed.options = mergedOptions;
        console.log('[TLS] Raw options (merged):', mergedOptions);
        console.log(`[TLS] Parsed options count: ${parsed.options.length}`);

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

        unmountProcessingView();

        container.style.transition = 'opacity 200ms';
        container.style.opacity = '0';

        await delay(200);
        container.innerHTML = renderSummaryView(state.bcifPayload);
        container.style.opacity = '1';

        updateSummaryHeaderFooter(state.bcifPayload);

        // 8. Wire all listeners
        attachSummaryListeners();

    } catch (err) {
        console.error('[TLS] Processing failed:', err);
        unmountProcessingView();
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

    renderOptionsCheckboxes();

    setupGranularConditionRows();
    setupSummaryAccordion();

    // --- Download BCIF Form ---

    const downloadBtn = document.getElementById('sv-download');
    if (downloadBtn) {
        if (downloadBtn.dataset.bound === '1') {
            console.debug('[TLS] Download already bound.');
        } else {
            downloadBtn.dataset.bound = '1';
            downloadBtn.addEventListener('click', handleDownload);
        }
    }

    // --- Download Claim Summary ---

    document.getElementById('tls-download-summary')
        ?.addEventListener('click', handleDownloadSummary);

    // --- Reset ---

    document.getElementById('sv-reset')?.addEventListener('click', () => {
        state.parsedEstimate = null;
        state.bcifPayload    = null;
        state.tokenMap       = null;
        renderDropZone();
    });
}

function updateSummaryHeaderFooter(payload) {
    const claimEl = document.getElementById('claimNumberDisplay');
    const vehicleEl = document.getElementById('vehicleSummaryDisplay');
    const vinEl = document.getElementById('vehicleVinDisplay');
    const footerClaimEl = document.getElementById('footerClaimNumber');
    const footerVehicleEl = document.getElementById('footerVehicleSummary');

    if (!claimEl || !vehicleEl || !vinEl || !footerClaimEl || !footerVehicleEl) return;

    const claimNumber = String(payload?.claim?.claimNumber || '').trim();
    const year = String(payload?.vehicle?.year || '').trim();
    const make = String(payload?.vehicle?.make || '').trim();
    const model = String(payload?.vehicle?.model || '').trim();
    const vin = String(payload?.vehicle?.vin || '').trim();

    const applyFade = (el, text) => {
        el.classList.add('is-fading');
        el.textContent = text;
        requestAnimationFrame(() => {
            el.classList.remove('is-fading');
        });
    };

    if (!claimNumber || !year || !make || !model || !vin) {
        applyFade(claimEl, 'UNPARSED');
        applyFade(vehicleEl, 'No vehicle data detected');
        applyFade(vinEl, 'UNPARSED');
        applyFade(footerClaimEl, 'UNPARSED');
        applyFade(footerVehicleEl, 'No vehicle data detected');
        return;
    }

    const vehicleName = `${year} ${make} ${model}`;
    const vehicleSummary = `${vehicleName} · VIN: ${vin}`;

    applyFade(claimEl, claimNumber);
    applyFade(vehicleEl, vehicleName);
    applyFade(vinEl, vin);
    applyFade(footerClaimEl, claimNumber);
    applyFade(footerVehicleEl, vehicleSummary);
}


function setupSummaryAccordion() {
    const accordions = Array.from(document.querySelectorAll('.sv-accordion'));
    if (accordions.length === 0) return;

    const closeAccordion = item => {
        const toggle = item.querySelector('[data-accordion-toggle]');
        item.classList.remove('is-open');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
    };

    const openAccordion = item => {
        const toggle = item.querySelector('[data-accordion-toggle]');
        item.classList.add('is-open');
        if (toggle) toggle.setAttribute('aria-expanded', 'true');
    };

    accordions.forEach(item => {
        closeAccordion(item);

        const toggle = item.querySelector('[data-accordion-toggle]');
        if (!toggle) return;

        toggle.addEventListener('click', () => {
            const isOpen = item.classList.contains('is-open');
            accordions.forEach(closeAccordion);
            if (!isOpen) {
                openAccordion(item);
            }
        });
    });
}

function bindInput(id, setter) {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('input', e => setter(e.target.value));
    }
}

function bindSummaryHeaderFooter(parseResult) {
    const claimNumber = parseResult?.claim?.claimNumber || 'UNPARSED';
    const year = parseResult?.vehicle?.year || '';
    const make = parseResult?.vehicle?.make || '';
    const model = parseResult?.vehicle?.model || '';
    const vin = parseResult?.vehicle?.vin || '';

    const vehicleSummary = (year || make || model || vin)
        ? `${year} ${make} ${model}   ${vin}`.replace(/\s+/g, ' ').trim()
        : 'No vehicle data detected';

    const bindings = [
        { id: 'claimNumberDisplay', value: claimNumber },
        { id: 'vehicleSummaryDisplay', value: vehicleSummary },
        { id: 'footerClaimNumber', value: claimNumber },
        { id: 'footerVehicleSummary', value: vehicleSummary }
    ];

    bindings.forEach(({ id, value }) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });
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
//  DOWNLOAD SUMMARY (.docx)
// =========================================

async function handleDownloadSummary() {
    const status = document.getElementById('tls-copy-status');

    if (!state.bcifPayload) {
        if (status) status.textContent = 'Nothing to download.';
        return;
    }

    const btn = document.getElementById('tls-download-summary');
    if (btn) btn.disabled = true;
    if (status) status.textContent = 'Generating report\u2026';

    try {
        const blob = await generateClaimSummaryDocx(state);
        const claimNumber = state.bcifPayload?.claim?.claimNumber || 'EXPORT';
        triggerDownload(blob, `SUMMARY_${claimNumber}.docx`);
        if (status) {
            status.textContent = 'Summary downloaded \u2713';
            setTimeout(() => { status.textContent = ''; }, 1500);
        }
    } catch (err) {
        console.error('[TLS] DOCX summary generation failed:', err);
        if (status) status.textContent = 'Download failed.';
    } finally {
        if (btn) btn.disabled = false;
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

    // Require at least one condition component to have a rating set
    const cond = payload.condition || {};
    const hasAnyRating = Object.values(cond).some(
        c => c && typeof c === 'object' && c.rating !== null && c.rating !== undefined
    );
    if (!hasAnyRating) {
        console.warn('[TLS] Validation failed. No condition ratings set.');
        alert('Please complete at least one condition rating before downloading.');
        return false;
    }

    return true;
}

// =========================================
//  OPTIONS — CATEGORIZED CHECKBOX UI
// =========================================

const OPTION_CATEGORY_ORDER = [
    'Power / Convenience',
    'Seats',
    'Audio / Entertainment',
    'Wheels',
    'Roof',
    'Safety',
    'Exterior / Truck Accessories',
    'Other'
];

// =========================================
//  CONDITION AUTO-FILL — professional text per component × rating
//  Tires excluded — no auto-fill; user enters tread depth manually.
// =========================================

const CONDITION_AUTO_FILL = {
    paint: {
        0: "Heavy oxidation, peeling, large chips and clear failure present.",
        1: "Noticeable wear with chips and surface defects beyond normal use.",
        2: "Normal wear for age. Minor chips or scratches. No major deterioration.",
        3: "Finish is clean with minimal wear. No significant defects noted."
    },
    sheetMetal: {
        0: "Major dents, corrosion, or prior poor-quality repairs visible.",
        1: "Multiple dents or prior repair evidence. Alignment not perfect.",
        2: "Minor dings or typical wear. Panels align properly.",
        3: "Panels straight. No visible damage or prior repair concerns."
    },
    glass: {
        0: "Cracks or significant damage affecting integrity.",
        1: "Chips or defects present but not fully compromised.",
        2: "Light wear or minor pitting. No structural cracks.",
        3: "Glass clear. No cracks or defects observed."
    },
    trim: {
        0: "Missing, damaged, or heavily deteriorated trim components.",
        1: "Fading, pitting, or loose trim present.",
        2: "Normal wear. Minor blemishes only.",
        3: "Trim intact and clean with minimal wear."
    },
    seats: {
        0: "Heavy wear, tears, burns, or significant staining.",
        1: "Noticeable wear or small tears consistent with age.",
        2: "Light wear. No major damage.",
        3: "Seats clean with minimal wear."
    },
    carpet: {
        0: "Heavy staining, damage, or deterioration.",
        1: "Visible wear or moderate staining.",
        2: "Light wear consistent with age.",
        3: "Clean with minimal wear."
    },
    dashboard: {
        0: "Cracks, warping, or heavy deterioration.",
        1: "Visible wear or minor cracking.",
        2: "Normal wear. No major defects.",
        3: "Clean with no damage noted."
    },
    headliner: {
        0: "Sagging, stains, or separation present.",
        1: "Minor staining or looseness.",
        2: "Normal condition with light wear.",
        3: "Clean and properly secured."
    },
    engine: {
        0: "Mechanical issues evident. Leaks or performance concerns.",
        1: "Minor leaks or maintenance concerns noted.",
        2: "Operational with no major issues observed at inspection.",
        3: "Runs properly with no visible concerns at time of inspection."
    },
    transmission: {
        0: "Operational concerns evident at inspection.",
        1: "Performance irregularities or prior concerns noted.",
        2: "No operational concerns observed during inspection.",
        3: "Functioning normally at time of inspection."
    },
};

function getSelectedOptionCodes() {
    return Array.from(
        document.querySelectorAll('#optionsContainer input[type="checkbox"]:checked')
    ).map(cb => cb.value);
}

function syncOptionsToState() {
    if (state.bcifPayload) {
        state.bcifPayload.options = getSelectedOptionCodes();
        console.debug('[TLS] Options synced to state:', state.bcifPayload.options.length, 'selected');
    }
}

// =========================================
//  GRANULAR CONDITION ROWS — per-component rating + comment (+ tread for tires)
// =========================================

const TIRE_COMPONENTS = new Set(['frontTires', 'rearTires']);

function setupGranularConditionRows() {
    const rows = document.querySelectorAll('.sv-condition-row[data-component]');

    rows.forEach(row => {
        const component = row.dataset.component;
        if (!component || !state.bcifPayload.condition[component]) return;

        const isTire   = TIRE_COMPONENTS.has(component);
        const condComp = state.bcifPayload.condition[component];

        const select   = row.querySelector('.condition-rating-select');
        const textarea = row.querySelector('.condition-comment');
        const treadEl  = row.querySelector('.condition-tread-depth'); // null for non-tires
        if (!select || !textarea) return;

        // Initialise select from state
        if (condComp.rating !== null && condComp.rating !== undefined) {
            select.value = String(condComp.rating);
        }

        // Initialise tread depth input
        if (treadEl && condComp.treadDepth) {
            treadEl.value = condComp.treadDepth;
        }

        // Auto-populate comment (non-tires only, if still empty)
        if (!isTire && !textarea.value.trim() && CONDITION_AUTO_FILL[component]) {
            const rating = condComp.rating ?? 1;
            textarea.value = CONDITION_AUTO_FILL[component][rating] || '';
            condComp.comment = textarea.value;
        }

        // Textarea → state + user-edit flag
        textarea.addEventListener('input', () => {
            textarea.dataset.userEdited = 'true';
            condComp.comment = textarea.value;
        });

        // Tread depth → state
        if (treadEl) {
            treadEl.addEventListener('input', () => {
                condComp.treadDepth = treadEl.value;
            });
        }

        // Rating select → state + auto-fill comment
        select.addEventListener('change', e => {
            const raw    = e.target.value;
            const rating = raw === '' ? null : parseInt(raw, 10);
            condComp.rating = rating;

            if (!isTire && rating !== null && textarea.dataset.userEdited !== 'true'
                    && CONDITION_AUTO_FILL[component]) {
                textarea.value = CONDITION_AUTO_FILL[component][rating] || '';
                condComp.comment = textarea.value;
            }

            // Transmission inherits engine rating until user edits it
            if (component === 'engine') {
                _syncTransmissionToEngine(rating);
            }
        });

        // Track user edits on the transmission SELECT itself
        if (component === 'transmission') {
            select.addEventListener('change', () => {
                select.dataset.userEdited = 'true';
            });
        }
    });
}

function _syncTransmissionToEngine(engineRating) {
    const transRow = document.querySelector('.sv-condition-row[data-component="transmission"]');
    if (!transRow) return;

    const transSelect   = transRow.querySelector('.condition-rating-select');
    const transTextarea = transRow.querySelector('.condition-comment');
    if (!transSelect || transSelect.dataset.userEdited === 'true') return;

    if (engineRating !== null) {
        transSelect.value = String(engineRating);
        state.bcifPayload.condition.transmission.rating = engineRating;
    }

    if (transTextarea && transTextarea.dataset.userEdited !== 'true'
            && CONDITION_AUTO_FILL.transmission && engineRating !== null) {
        transTextarea.value = CONDITION_AUTO_FILL.transmission[engineRating] || '';
        state.bcifPayload.condition.transmission.comment = transTextarea.value;
    }
}

function renderOptionsCheckboxes() {
    const optionsEl = document.getElementById('optionsContainer');
    if (!optionsEl) return;

    const parsedSet = new Set(
        (state.parsedEstimate?.options || []).map(o =>
            typeof o === 'object' ? o.code : o
        )
    );

    const groups = {};
    for (const [code, meta] of Object.entries(TOKEN_META)) {
        const cat = meta.category;
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push({ code, label: meta.label });
    }

    const orderedCats = [
        ...OPTION_CATEGORY_ORDER.filter(c => groups[c]),
        ...Object.keys(groups).filter(c => !OPTION_CATEGORY_ORDER.includes(c))
    ];

    const html = orderedCats.map(cat => {
        const items = groups[cat].map(({ code, label }) => {
            const detected = parsedSet.has(code);
            const checked = detected ? ' checked' : '';
            const itemClass = detected ? 'option-item option-detected' : 'option-item';
            return `
            <div class="${itemClass}">
                <label>
                    <input type="checkbox" value="${escapeHTML(code)}"${checked}>
                    <span>${escapeHTML(label)}</span>
                </label>
            </div>`;
        }).join('');
        return `
            <div class="option-category">
                <div class="option-category-title">${escapeHTML(cat)}</div>
                ${items}
            </div>`;
    }).join('');

    optionsEl.innerHTML = html;

    optionsEl.addEventListener('change', e => {
        if (e.target.type === 'checkbox') {
            syncOptionsToState();
        }
    });

    syncOptionsToState();
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
