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
import { generateBCIFDocx } from './render/bcifDocxFiller.js';
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

    // Show welcome modal first, then render the real drop zone
    showDemoWelcomeModal(() => {
        state.parsedEstimate = null;
        state.bcifPayload = null;
        state.tokenMap = null;
        renderDropZone();

        // Add "skip upload" fallback if mock data is available
        if (demoPayload && demoParsed) {
            const dropzone = document.getElementById('dropzone');
            if (dropzone) {
                const skipDiv = document.createElement('div');
                skipDiv.style.cssText = 'text-align:center;margin-top:12px;';
                skipDiv.innerHTML = `<button id="demoSkipBtn" style="
                    background:none;border:none;color:var(--amber,#e8952a);
                    font-family:'DM Mono',monospace;font-size:11px;
                    cursor:pointer;text-decoration:underline;
                    text-transform:uppercase;letter-spacing:0.06em;
                    opacity:0.7;
                ">Or preview with sample data (2019 Honda Accord)</button>`;
                dropzone.parentNode.insertBefore(skipDiv, dropzone.nextSibling);

                document.getElementById('demoSkipBtn').addEventListener('click', async () => {
                    mountProcessingView();
                    updateStage(0);
                    await delay(800);
                    state.parsedEstimate = demoParsed;
                    state.bcifPayload = demoPayload;
                    updateStage(1); await delay(600);
                    updateStage(2); await delay(600);
                    state.tokenMap = renderBCIFPayload(demoPayload);
                    updateStage(3); await delay(500);
                    updateStage(4); await delay(400);
                    unmountProcessingView();
                    container.style.transition = 'opacity 200ms';
                    container.style.opacity = '0';
                    await delay(200);
                    container.innerHTML = renderSummaryView(demoPayload);
                    container.style.opacity = '1';
                    updateSummaryHeaderFooter(demoPayload);
                    attachSummaryListeners();
                });
            }
        }
    });
}

/**
 * Dismissible welcome modal for demo users — explains the TLS workflow.
 */
function showDemoWelcomeModal(onDismiss) {
    const overlay = document.createElement('div');
    overlay.id = 'demo-welcome-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10001;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;padding:24px;';
    overlay.innerHTML = `
        <div style="background:var(--cipher-surface,#1a1a2e);border:1px solid var(--amber,#e8952a);border-radius:12px;max-width:540px;width:100%;padding:36px 32px;font-family:'Barlow',sans-serif;color:var(--cipher-text,#f0f0f0);">
            <h2 style="font-family:'Bebas Neue',sans-serif;font-size:28px;color:var(--amber,#e8952a);margin:0 0 8px;letter-spacing:0.04em;">Total Loss Studio</h2>
            <p style="font-size:14px;color:var(--cipher-text-muted,#aaa);margin:0 0 20px;">See your own claim data processed in real time.</p>
            <ol style="line-height:2.2;padding-left:22px;font-size:15px;margin:0 0 16px;">
                <li>Upload a <strong style="color:var(--amber,#e8952a);">CCC ONE</strong> estimate PDF</li>
                <li>Press <strong style="color:var(--amber,#e8952a);">Process Estimate</strong> to parse</li>
                <li>Verify vehicle options, adjust condition ratings, explore controls</li>
                <li>Download two watermarked sample forms (BCIF + Claim Summary)</li>
            </ol>
            <p style="font-size:12px;color:var(--cipher-text-muted,#888);margin:0 0 24px;line-height:1.6;">
                CCC ONE estimates only \u2014 Mitchell support coming soon.<br>
                Demo downloads are watermarked. <a href="/signup" style="color:var(--amber,#e8952a);text-decoration:underline;">Subscribe</a> for clean, professional reports.
            </p>
            <button id="demo-welcome-dismiss" style="
                display:block;width:100%;padding:14px;
                background:var(--amber,#e8952a);color:#000;border:none;border-radius:6px;
                font-family:'DM Mono',monospace;font-size:14px;font-weight:700;
                cursor:pointer;text-transform:uppercase;letter-spacing:0.08em;
            ">Got it \u2014 let me upload \u2192</button>
        </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('demo-welcome-dismiss').addEventListener('click', () => {
        overlay.remove();
        if (onDismiss) onDismiss();
    });
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

const OPTION_KEYWORDS = /\b(power|pwr|air\s*cond|air\s*bag|a\/c|cruise|tilt|telescop|leather|cloth|alloy|chrome|heated|sunroof|moonroof|roof|airbag|abs|anti.?lock|traction|stability|radio|stereo|cd|bluetooth|navigation|nav|keyless|remote|seat|bucket|captain|spoiler|fog|tint|privacy|rack|tonneau|bedliner|running\s*board|tow|xenon|hid|led|sensor|camera|blind\s*spot|lane|departure|detection|intelligent|parking|alarm|anti.?theft|turbo|diesel|4wd|awd|4x4|dual|premium|deluxe|conv(ertible)?|woodgrain|wood|vinyl|wiper|defog|defrost|climate|console|overhead|memory|homelink|mirror|signal|integrated|brake|disc|paint|coat|glass|electric|message|entry|steering|wheel|window|lock|door|antenna|pedal|gate|hatch|trunk|liftgate|auxiliary|audio|satellite|hands\s*free|search|seek|variable)\b/i;

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
    payload.claim.adjuster     = parsed.adjuster             || '';
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

    // Options — already 2-char BCIF codes from handleFile merge (asset-index + pattern matcher)
    payload.options = (parsed.options || []).filter(c => typeof c === 'string' && c.length <= 4);
    console.log('[TLS] Payload options:', payload.options);

    // Loss evaluation → conclusion (POI 15 = total loss, everything else = repairable)
    const outcome = evaluateLossType({
        pointOfImpactCode: parsed.pointOfImpactCode
    });
    const isTotalLoss = outcome === 'total_loss';

    payload.summary.isTotalLoss = isTotalLoss;
    payload.summary.deductible = parseFloat(parsed.deductible) || 0;

    payload.summary.conclusion = isTotalLoss
        ? 'Vehicle is declared a total loss based on estimate threshold.'
        : 'Vehicle appears repairable based on current estimate data.';

    // Damage assessment — appraiser fills manually (fields start blank)
    payload.damageAssessment = { structural: '', bodyPanels: '', restraints: '', interior: '' };

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
//  DAMAGE ASSESSMENT — Smart parse from CCC data
// =========================================

const BOILERPLATE_PATTERNS = [
    /THIS IS NOT AN AUTHORIZATION TO REPAIR/i,
    /ALL REPAIR COSTS ARE THE RESPONSIBILITY/i,
    /PARTS USED IN THE REPAIR OF YOUR VEHICLE/i,
    /OTHER THAN THE ORIGINAL.*?MANUFACTURER/i,
    /YOU HAVE THE RIGHT TO SELECT THE BODY SHOP/i,
    /The symbol \(<>\) indicates/i,
    /Blnd=Blend/i,
    /indicates the refinish/i,
    /ORIGINAL MANUFACTURER\./i,
    /subject to carrier review/i,
    /not constitute a guarantee/i,
    /NOTE:\s*YOU HAVE THE RIGHT/i,
    /AUTHORIZATION.*?REPAIR/i,
    /INSURANCE COMPANY/i,
];

function isBoilerplate(line) {
    return BOILERPLATE_PATTERNS.some(p => p.test(line));
}

function cleanDamageItems(items) {
    if (!items || items.length === 0) return '';
    return items
        .map(s => s.replace(/\s+/g, ' ').trim())
        .filter(s => s.length >= 3 && !isBoilerplate(s))
        .slice(0, 8)
        .join('. ')
        || '';
}

/**
 * Build damage assessment fields from parsed CCC estimate data.
 * Uses zone-based narratives when available, falls back to legacy categories.
 */
function parseDamageFromEstimate(parsed) {
    const lineItems    = parsed?.repairLineItems || {};
    const zones        = lineItems.damageZones   || {};
    const structFlags  = parsed?.structuralFlagged || [];
    const hasZoneData  = Object.values(zones).some(arr => arr?.length > 0);

    const ZONE_LABELS = {
        frontEnd: 'Front End', rightSide: 'Right Side', leftSide: 'Left Side',
        rear: 'Rear', structural: 'Structural', restraints: 'Restraints',
        wheels: 'Wheels/Suspension', mechanical: 'Mechanical',
    };

    function buildZoneText(zoneKeys) {
        const entries = [];
        for (const zk of zoneKeys) {
            const items = zones[zk];
            if (items && items.length > 0) {
                const cleaned = items.map(s => s.replace(/\s+/g, ' ').trim())
                    .filter(s => s.length >= 3 && !isBoilerplate(s));
                if (cleaned.length > 0) {
                    entries.push(`${ZONE_LABELS[zk]}: ${cleaned.slice(0, 5).join(', ')}`);
                }
            }
        }
        return entries.length > 0 ? entries.join('. ') + '.' : '';
    }

    let structural = '';
    if (hasZoneData) {
        structural = buildZoneText(['structural']);
    }
    if (!structural && structFlags.length > 0) {
        structural = 'Structural components flagged: ' + structFlags.slice(0, 4).join(', ') + '.';
    }
    if (!structural) {
        structural = cleanDamageItems(lineItems.structural);
    }

    let bodyPanels = '';
    if (hasZoneData) {
        bodyPanels = buildZoneText(['frontEnd', 'rightSide', 'leftSide', 'rear']);
    }
    if (!bodyPanels) {
        bodyPanels = cleanDamageItems(lineItems.bodyPanels);
    }

    let restraints = '';
    if (hasZoneData) {
        restraints = buildZoneText(['restraints']);
    }
    if (!restraints) {
        restraints = cleanDamageItems(lineItems.restraints);
    }

    let interior = '';
    if (hasZoneData) {
        interior = buildZoneText(['wheels', 'mechanical']);
    }
    if (!interior) {
        interior = cleanDamageItems(lineItems.interior);
    }

    return {
        structural: structural || 'No damage documented',
        bodyPanels:  bodyPanels || '',
        restraints:  restraints || 'No damage documented',
        interior:    interior   || 'No damage documented',
    };
}

/**
 * Read current damage field values from the DOM.
 * Returns the exact text the appraiser typed — what prints in the report.
 */
function getDamageAssessmentFromFields() {
    return {
        structural: document.getElementById('damageStructural')?.value?.trim() || 'No damage documented',
        bodyPanels: document.getElementById('damageBodyPanels')?.value?.trim() || 'No damage documented',
        restraints: document.getElementById('damageRestraints')?.value?.trim() || 'No damage documented',
        interior:   document.getElementById('damageInterior')?.value?.trim()   || 'No damage documented',
    };
}

function populateDamageFields(parsed) {
    const da = parseDamageFromEstimate(parsed);
    const mapping = {
        damageStructural: da.structural,
        damageBodyPanels: da.bodyPanels,
        damageRestraints: da.restraints,
        damageInterior:   da.interior,
    };

    Object.entries(mapping).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) {
            el.value = value;
            autoResizeDamageTextarea(el);
        }
    });

    // Sync to state
    if (state.bcifPayload) {
        state.bcifPayload.damageAssessment = da;
    }

    updateDamageEditorStatus();
}

function autoResizeDamageTextarea(el) {
    el.style.height = 'auto';
    el.style.height = (el.scrollHeight + 4) + 'px';
}

function updateDamageEditorStatus() {
    const ids = ['damageStructural', 'damageBodyPanels', 'damageRestraints', 'damageInterior'];
    const empty = ids.filter(id => {
        const el = document.getElementById(id);
        return !el?.value?.trim();
    }).length;

    const statusEl = document.getElementById('damageEditorStatus');
    if (!statusEl) return;

    if (empty === 0) {
        statusEl.textContent = 'All fields complete';
        statusEl.className = 'damage-editor-status status--complete';
    } else {
        statusEl.textContent = `${empty} field${empty > 1 ? 's' : ''} empty`;
        statusEl.className = 'damage-editor-status status--incomplete';
    }
}

function setupDamageAssessmentEditor() {
    const fieldIds = ['damageStructural', 'damageBodyPanels', 'damageRestraints', 'damageInterior'];
    const fieldKeys = ['structural', 'bodyPanels', 'restraints', 'interior'];

    // Auto-resize + state sync on input
    fieldIds.forEach((id, i) => {
        const el = document.getElementById(id);
        if (!el) return;
        autoResizeDamageTextarea(el);
        el.addEventListener('input', () => {
            autoResizeDamageTextarea(el);
            if (state.bcifPayload) {
                if (!state.bcifPayload.damageAssessment) state.bcifPayload.damageAssessment = {};
                state.bcifPayload.damageAssessment[fieldKeys[i]] = el.value;
            }
            updateDamageEditorStatus();
        });
    });

    // Individual clear buttons
    document.querySelectorAll('.damage-clear-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const fieldKey = btn.dataset.field;
            const idMap = { structural: 'damageStructural', bodyPanels: 'damageBodyPanels',
                            restraints: 'damageRestraints', interior: 'damageInterior' };
            const el = document.getElementById(idMap[fieldKey]);
            if (el) {
                el.value = '';
                el.focus();
                autoResizeDamageTextarea(el);
                if (state.bcifPayload?.damageAssessment) {
                    state.bcifPayload.damageAssessment[fieldKey] = '';
                }
                updateDamageEditorStatus();
            }
        });
    });

    // Clear all
    document.getElementById('damageClearAllBtn')?.addEventListener('click', () => {
        fieldIds.forEach((id, i) => {
            const el = document.getElementById(id);
            if (el) {
                el.value = '';
                autoResizeDamageTextarea(el);
            }
            if (state.bcifPayload?.damageAssessment) {
                state.bcifPayload.damageAssessment[fieldKeys[i]] = '';
            }
        });
        updateDamageEditorStatus();
    });

    // Re-parse from estimate
    document.getElementById('damageReParseBtn')?.addEventListener('click', () => {
        if (state.parsedEstimate) {
            populateDamageFields(state.parsedEstimate);
        }
    });

    updateDamageEditorStatus();
}

// =========================================
//  VERIFICATION FLOW — outcome badge, prior damage, ACV
// =========================================

/**
 * Set outcome badge text/class + show/hide ACV section based on isTotalLoss.
 */
function configureVerificationFlow() {
    const isTotalLoss = state.bcifPayload?.summary?.isTotalLoss || false;
    const badge = document.getElementById('outcomeBadge');
    if (badge) {
        badge.textContent = isTotalLoss ? 'TOTAL LOSS' : 'REPAIRABLE';
        badge.className = 'outcome-badge ' +
            (isTotalLoss ? 'outcome-badge--total-loss' : 'outcome-badge--repairable');
    }

    const acvSection = document.getElementById('acvSection');
    if (acvSection) {
        acvSection.style.display = isTotalLoss ? '' : 'none';
    }
}

/**
 * Wire prior-damage checkbox toggle + textarea sync to state.
 */
function setupPriorDamageToggle() {
    const check = document.getElementById('priorDamageCheck');
    const text  = document.getElementById('priorDamageText');
    const none  = document.getElementById('priorDamageNone');
    if (!check) return;

    check.addEventListener('change', () => {
        const checked = check.checked;
        if (text) text.style.display = checked ? '' : 'none';
        if (none) none.style.display = checked ? 'none' : '';
        if (state.bcifPayload) {
            state.bcifPayload.priorDamage.exists = checked;
        }
    });

    if (text) {
        text.addEventListener('input', () => {
            if (state.bcifPayload) {
                state.bcifPayload.priorDamage.text = text.value;
            }
        });
    }
}

/**
 * Wire ACV + deductible inputs → auto-calc net settlement, sync to state.
 */
function setupACVSection() {
    const acvInput = document.getElementById('sv-acv');
    const dedInput = document.getElementById('sv-deductible');
    const netDisp  = document.getElementById('acvNetDisplay');
    if (!acvInput || !dedInput) return;

    function recalcNet() {
        const acv = parseFloat(acvInput.value) || 0;
        const ded = parseFloat(dedInput.value) || 0;
        const net = Math.max(0, acv - ded);

        if (netDisp) {
            if (acv > 0) {
                netDisp.textContent = '$' + net.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                netDisp.classList.toggle('acv-net--positive', net > 0);
            } else {
                netDisp.textContent = '--';
                netDisp.classList.remove('acv-net--positive');
            }
        }

        if (state.bcifPayload) {
            state.bcifPayload.summary.acv = acv;
            state.bcifPayload.summary.deductible = ded;
        }
    }

    acvInput.addEventListener('input', recalcNet);
    dedInput.addEventListener('input', recalcNet);
}

/**
 * Read prior-damage state from DOM (for report generation sync).
 */
function syncPriorDamageToState() {
    if (!state.bcifPayload) return;
    const check = document.getElementById('priorDamageCheck');
    const text  = document.getElementById('priorDamageText');
    state.bcifPayload.priorDamage = {
        exists: check?.checked || false,
        text:   text?.value?.trim() || ''
    };
}

/**
 * Read ACV state from DOM (for report generation sync).
 */
function syncACVToState() {
    if (!state.bcifPayload) return;
    const acvInput = document.getElementById('sv-acv');
    const dedInput = document.getElementById('sv-deductible');
    state.bcifPayload.summary.acv = parseFloat(acvInput?.value) || 0;
    state.bcifPayload.summary.deductible = parseFloat(dedInput?.value) || 0;
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
    setupDamageAssessmentEditor();
    setupSummaryAccordion();

    // Verification flow — outcome badge, prior damage, ACV
    configureVerificationFlow();
    setupPriorDamageToggle();
    setupACVSection();

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
    state.bcifPayload.summary.damageSummary = buildClaimSummary(
        state.parsedEstimate,
        state.bcifPayload
    );

    // Sync damage assessment fields to state
    state.bcifPayload.damageAssessment = getDamageAssessmentFromFields();

    // Refresh token map
    state.tokenMap = renderBCIFPayload(state.bcifPayload);

    showSummaryStatus('Summary regenerated.');
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
    const status = document.getElementById('tls-copy-status');
    const da = getDamageAssessmentFromFields();
    const text = ['STRUCTURAL: ' + da.structural, 'BODY PANELS: ' + da.bodyPanels,
                  'RESTRAINTS: ' + da.restraints, 'INTERIOR: ' + da.interior].join('\n');

    if (!text.trim()) {
        if (status) status.textContent = "Nothing to copy.";
        return;
    }

    async function copyModern() {
        await navigator.clipboard.writeText(text);
    }

    function copyFallback() {
        const tmp = document.createElement('textarea');
        tmp.value = text;
        document.body.appendChild(tmp);
        tmp.select();
        document.execCommand('copy');
        document.body.removeChild(tmp);
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
//  USER PROFILE (for DOCX signature block)
// =========================================

async function _gatherUserProfile() {
    const profile = { businessName: '', fullName: '', licenseNumber: '' };
    const isDemo = sessionStorage.getItem('demo_mode') === 'true';
    if (isDemo) {
        profile.fullName = window.settingsManager?.getSetting('displayName') || 'Demo User';
        profile.licenseNumber = window.settingsManager?.getSetting('licenseNumber') || '';
        profile.businessName = 'Demo Appraisal Co.';
        return profile;
    }
    // Authenticated: read from profiles table (where Settings page saves)
    try {
        const sb = window.SupabaseAuth.init();
        if (!sb) { console.warn('[TLS] SupabaseAuth.init() returned null'); }
        const { data: { user } } = await sb.auth.getUser();
        console.log('[TLS] auth user:', user?.id, user?.email);
        if (user) {
            const { data, error } = await sb
                .from('profiles')
                .select('first_name, last_name, company, license_number')
                .eq('user_id', user.id)
                .maybeSingle();
            console.log('[TLS] profile by user_id:', data, error);
            if (data) {
                profile.fullName = [data.first_name, data.last_name]
                    .filter(Boolean).join(' ').trim();
                profile.businessName = (data.company || '').trim();
                profile.licenseNumber = (data.license_number || '').trim();
            }
        }
    } catch (e) { console.warn('[TLS] Profile fetch failed:', e); }
    console.log('[TLS] Final profile:', JSON.stringify(profile));
    // Fallbacks
    if (!profile.businessName) profile.businessName = 'Claim Cipher\u2122';
    if (!profile.fullName) profile.fullName = 'Appraiser';
    return profile;
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
        // Sync damage assessment fields to state before generating
        state.bcifPayload.damageAssessment = getDamageAssessmentFromFields();
        syncPriorDamageToState();
        syncACVToState();

        const userProfile = await _gatherUserProfile();
        const isDemoMode = sessionStorage.getItem('demo_mode') === 'true';
        const blob = await generateClaimSummaryDocx(state, userProfile, isDemoMode);
        const claimNumber = state.bcifPayload?.claim?.claimNumber || 'EXPORT';
        const filename = isDemoMode
            ? 'CLAIM_SUMMARY_DEMO_PREVIEW.docx'
            : `SUMMARY_${claimNumber}.docx`;
        triggerDownload(blob, filename);
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

        // Sync damage assessment fields to state before generating
        state.bcifPayload.damageAssessment = getDamageAssessmentFromFields();
        syncPriorDamageToState();
        syncACVToState();

        // ── 2. Build final token map (no server dependency) ──
        state.tokenMap = renderBCIFPayload(state.bcifPayload);
        state.tokenMap._DAMAGE_SUMMARY = state.bcifPayload.summary.damageSummary || '';

        const tokenKeys = Object.keys(state.tokenMap || {});
        const activeTokens = tokenKeys.filter(k => state.tokenMap[k] !== '' && !k.startsWith('_'));
        console.log(`[TLS] TokenMap total keys: ${tokenKeys.length}, active (non-empty): ${activeTokens.length}`);

        const isDemoMode = sessionStorage.getItem('demo_mode') === 'true';
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
                if (isDemoMode && typeof window.JSZip !== 'undefined') {
                    // Watermark the server-generated DOCX
                    const arrayBuffer = await response.arrayBuffer();
                    let zip = await JSZip.loadAsync(arrayBuffer);
                    zip = await window.DemoWatermark.injectDemoWatermark(zip);
                    const watermarkedBlob = await zip.generateAsync({
                        type: 'blob',
                        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                        compression: 'DEFLATE',
                        compressionOptions: { level: 6 }
                    });
                    triggerDownload(watermarkedBlob, 'BCIF_DEMO_PREVIEW.docx');
                    downloaded = true;
                    console.log('[TLS] DOCX download (demo watermarked), size:', watermarkedBlob.size);
                } else {
                    const blob = await response.blob();
                    if (blob.size > 0) {
                        triggerDownload(blob, buildFileName('.docx'));
                        downloaded = true;
                        console.log('[TLS] DOCX download complete, size:', blob.size);
                    }
                }
            } else {
                console.warn('[TLS] DOCX server responded:', response.status);
            }
        } catch (fetchErr) {
            console.log('[TLS] DOCX server not available:', fetchErr.message);
        }

        // ── 3b. Fallback: client-side DOCX template fill via JSZip ──
        if (!downloaded) {
            try {
                console.log('[TLS] Generating BCIF DOCX client-side...');
                const blob = await generateBCIFDocx(state.tokenMap, isDemoMode);
                console.log('[TLS] DOCX generated, size:', blob.size);
                const filename = isDemoMode ? 'BCIF_DEMO_PREVIEW.docx' : buildFileName('.docx');
                triggerDownload(blob, filename);
                downloaded = true;
            } catch (docxErr) {
                console.error('[TLS] Client-side DOCX failed:', docxErr);
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
    frontTires: {
        0: "Tread depth below safe threshold. Replacement recommended.",
        1: "Moderate wear. Tread approaching minimum safe depth.",
        2: "Adequate tread remaining. Normal wear for vehicle age.",
        3: "Minimal wear. Tread depth indicates recent replacement or low mileage."
    },
    rearTires: {
        0: "Tread depth below safe threshold. Replacement recommended.",
        1: "Moderate wear. Tread approaching minimum safe depth.",
        2: "Adequate tread remaining. Normal wear for vehicle age.",
        3: "Minimal wear. Tread depth indicates recent replacement or low mileage."
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

        // Auto-populate comment (if still empty)
        if (!textarea.value.trim() && CONDITION_AUTO_FILL[component]) {
            const rating = condComp.rating ?? 1;
            const autoText = CONDITION_AUTO_FILL[component][rating] || '';
            if (isTire && condComp.treadDepth) {
                textarea.value = `Tread depth: ${condComp.treadDepth}/32". ${autoText}`;
            } else {
                textarea.value = autoText;
            }
            condComp.comment = textarea.value;
        }

        // Textarea → state + user-edit flag
        textarea.addEventListener('input', () => {
            textarea.dataset.userEdited = 'true';
            condComp.comment = textarea.value;
        });

        // Tread depth → state + update auto-fill comment with tread prefix
        if (treadEl) {
            treadEl.addEventListener('input', () => {
                condComp.treadDepth = treadEl.value;
                // Re-compose auto-fill comment with tread depth if not user-edited
                if (textarea.dataset.userEdited !== 'true' && CONDITION_AUTO_FILL[component]) {
                    const rating = condComp.rating ?? 1;
                    const autoText = CONDITION_AUTO_FILL[component][rating] || '';
                    if (condComp.treadDepth) {
                        textarea.value = `Tread depth: ${condComp.treadDepth}/32". ${autoText}`;
                    } else {
                        textarea.value = autoText;
                    }
                    condComp.comment = textarea.value;
                }
            });
        }

        // Rating select → state + auto-fill comment
        select.addEventListener('change', e => {
            const raw    = e.target.value;
            const rating = raw === '' ? null : parseInt(raw, 10);
            condComp.rating = rating;

            if (rating !== null && textarea.dataset.userEdited !== 'true'
                    && CONDITION_AUTO_FILL[component]) {
                const autoText = CONDITION_AUTO_FILL[component][rating] || '';
                // Prepend tread depth if available for tire components
                if (isTire && condComp.treadDepth) {
                    textarea.value = `Tread depth: ${condComp.treadDepth}/32". ${autoText}`;
                } else {
                    textarea.value = autoText;
                }
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

    const parsedSet = new Set(state.parsedEstimate?.options || []);

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

const STOP_TOKENS = new Set([
    'BY', 'IN', 'OF', 'TO', 'OR', 'AN', 'AT', 'ON', 'UP',
    'DO', 'GO', 'NO', 'IF', 'IS', 'IT', 'AS', 'BE', 'HE',
    'WE', 'SO', 'US', 'MY'
]);

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

    return optionList.filter(code => {
        const upper = String(code).toUpperCase();
        return tokens.has(upper) && !STOP_TOKENS.has(upper);
    });
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
