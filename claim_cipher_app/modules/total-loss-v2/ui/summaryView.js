// Summary Verification UI — v2.5 Card Layout

export function renderSummaryView(payload) {
    return `
        <div class="tls-summary-layout">

            <!-- PAGE HEADER -->
            <div class="sv-page-header">
                <div class="sv-page-header-inner">
                    <div>
                        <div class="sv-page-label">Total Loss Studio</div>
                        <div class="sv-page-title">Summary Verification</div>
                        <div class="sv-page-sub">Review extracted data — correct any errors before download</div>
                    </div>
                    <div class="sv-claim-badge">
                        <div class="sv-claim-badge-label">Claim</div>
                        <div class="sv-claim-badge-num tls-data" id="claimNumberDisplay"></div>
                        <div class="sv-claim-badge-vehicle tls-data" id="vehicleSummaryDisplay"></div>
                        <div class="sv-claim-badge-vin">VIN <span class="tls-data" id="vehicleVinDisplay"></span></div>
                    </div>
                </div>
            </div>

            <!-- VERIFY BANNER -->
            <div class="sv-verify-banner">
                <div class="sv-verify-banner-inner">
                    <div class="sv-verify-dot"></div>
                    <div class="sv-verify-text">Verify Before Committing</div>
                    <div class="sv-verify-sub">— Correct any errors below. Downloads are final.</div>
                </div>
            </div>

            <!-- MAIN SCROLL -->
            <div class="sv-main-scroll">
                <div class="sv-main">

                    <!-- CLAIM & VEHICLE INFORMATION -->
                    <div class="sv-card sv-card--accent">
                        <div class="sv-card-header">
                            <div class="sv-card-title">Claim &amp; Vehicle Information</div>
                            <div class="sv-card-line"></div>
                        </div>
                        <div class="sv-card-body" style="padding:3px">
                            <div class="sv-info-grid">

                                <div class="sv-info-col">
                                    <div class="sv-info-col-label">Claim Information</div>
                                    <div class="sv-field">
                                        <div class="sv-field-label">Carrier</div>
                                        <input class="sv-field-value" type="text" id="sv-carrier"
                                               value="${payload.claim.carrier}" placeholder="Enter carrier name" />
                                    </div>
                                    <div class="sv-field">
                                        <div class="sv-field-label">Claim Number</div>
                                        <input class="sv-field-value" type="text" id="sv-claimNumber"
                                               value="${payload.claim.claimNumber}" />
                                    </div>
                                    <div class="sv-field">
                                        <div class="sv-field-label">Adjuster</div>
                                        <input class="sv-field-value" type="text" id="sv-adjuster"
                                               value="${payload.claim.adjuster}" placeholder="Enter adjuster name" />
                                    </div>
                                </div>

                                <div class="sv-info-col">
                                    <div class="sv-info-col-label">Vehicle</div>
                                    <div class="sv-field">
                                        <div class="sv-field-label">Year</div>
                                        <input class="sv-field-value" type="text" id="sv-year"
                                               value="${payload.vehicle.year}" />
                                    </div>
                                    <div class="sv-field">
                                        <div class="sv-field-label">Make</div>
                                        <input class="sv-field-value" type="text" id="sv-make"
                                               value="${payload.vehicle.make}" />
                                    </div>
                                    <div class="sv-field">
                                        <div class="sv-field-label">Model</div>
                                        <input class="sv-field-value" type="text" id="sv-model"
                                               value="${payload.vehicle.model}" />
                                    </div>
                                    <div class="sv-field">
                                        <div class="sv-field-label">VIN</div>
                                        <input class="sv-field-value" type="text" id="sv-vin"
                                               value="${payload.vehicle.vin}" />
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>

                    <!-- OPTIONS / EQUIPMENT -->
                    <div class="sv-card">
                        <div class="sv-card-header">
                            <div class="sv-card-title">Options / Equipment</div>
                            <div class="sv-card-line"></div>
                            <div class="sv-card-count">Scroll to view all</div>
                        </div>
                        <div class="sv-card-body" style="padding:0">
                            <div class="sv-options-scroll">
                                <div id="optionsContainer"></div>
                            </div>
                        </div>
                    </div>

                    <!-- CONDITION -->
                    <div class="sv-card">
                        <div class="sv-card-header">
                            <div class="sv-card-title">Condition</div>
                            <div class="sv-card-line"></div>
                        </div>
                        ${renderGranularCondition(payload.condition)}
                    </div>

                    <!-- DAMAGE SUMMARY -->
                    <div class="sv-card">
                        <div class="sv-card-header">
                            <div class="sv-card-title">Damage Summary</div>
                            <div class="sv-card-line"></div>
                        </div>
                        <div class="sv-card-body">
                            <textarea class="sv-damage-textarea" id="sv-damageSummary"
                                      readonly>${payload.summary.damageSummary}</textarea>
                        </div>
                    </div>

                    <!-- ADDITIONAL NOTES -->
                    <div class="sv-card">
                        <div class="sv-card-header">
                            <div class="sv-card-title">Additional Notes</div>
                            <div class="sv-card-line"></div>
                        </div>
                        <div class="sv-card-body">
                            <textarea class="sv-notes-area" id="sv-additionalNotes"
                                      placeholder="Add any additional notes before generating the form...">${payload.summary.additionalNotes}</textarea>
                        </div>
                    </div>

                </div>
            </div>

            <!-- ACTION FOOTER -->
            <div class="sv-action-footer">
                <div class="sv-action-footer-inner">
                    <div>
                        <div class="sv-footer-claim">CLAIM <span id="footerClaimNumber" class="tls-data"></span> — Ready for Download</div>
                        <div class="sv-footer-vehicle"><span id="footerVehicleSummary" class="tls-data"></span></div>
                    </div>
                    <div class="sv-action-btns">
                        <button class="sv-btn sv-btn--reset" id="sv-reset">↺ Reset</button>
                        <button class="sv-btn sv-btn--secondary" id="tls-download-summary">↓ Download Claim Summary</button>
                        <button class="sv-btn sv-btn--primary" id="sv-download">↓ Download BCIF Form</button>
                    </div>
                </div>
            </div>

        </div>
    `;
}

// =========================================
//  GRANULAR CONDITION UI — Sub-sectioned
// =========================================

function renderGranularCondition(condition) {
    const ratingChoices = [
        { value: 0, text: 'Poor' },
        { value: 1, text: 'Fair' },
        { value: 2, text: 'Good' },
        { value: 3, text: 'Excellent' },
    ];

    const groups = [
        {
            label: 'Exterior',
            items: [
                { key: 'paint',      label: 'Paint' },
                { key: 'glass',      label: 'Glass' },
                { key: 'sheetMetal', label: 'Sheet Metal' },
                { key: 'trim',       label: 'Trim' },
            ]
        },
        {
            label: 'Interior',
            items: [
                { key: 'seats',  label: 'Seats' },
                { key: 'carpet', label: 'Carpet' },
            ]
        },
        {
            label: 'Mechanical',
            items: [
                { key: 'engine',       label: 'Engine' },
                { key: 'transmission', label: 'Transmission' },
                { key: 'frontTires',   label: 'Front Tires', isTire: true },
                { key: 'rearTires',    label: 'Rear Tires',  isTire: true },
            ]
        }
    ];

    const renderItem = ({ key, label, isTire }) => {
        const comp   = condition[key] || {};
        const rating = comp.rating;

        const blankOpt = isTire
            ? `<option value=""${(rating === null || rating === undefined) ? ' selected' : ''}>— not rated —</option>`
            : '';

        const options = blankOpt + ratingChoices
            .map(({ value, text }) => {
                const sel = (rating !== null && rating !== undefined && Number(value) === Number(rating))
                    ? ' selected' : '';
                return `<option value="${value}"${sel}>${text}</option>`;
            })
            .join('');

        const treadBlock = isTire ? `
                    <div class="sv-tread-row">
                        <span class="sv-tread-label">Tread:</span>
                        <input type="text" class="condition-tread-depth"
                               placeholder="e.g. 7/32" value="${comp.treadDepth || ''}" />
                    </div>` : '';

        return `
                <div class="sv-condition-row" data-component="${key}">
                    <div class="sv-condition-name">${label.toUpperCase()}</div>
                    <div class="sv-rating-row">
                        <div class="sv-rating-bar"></div>
                        <select class="condition-rating-select">${options}</select>
                    </div>
                    ${treadBlock}
                    <textarea class="condition-comment" placeholder="Condition notes...">${comp.comment || ''}</textarea>
                </div>`;
    };

    const sectionsMarkup = groups.map(group => `
        <div class="sv-sub-section">
            <div class="sv-sub-label">${group.label}</div>
            <div class="sv-condition-grid">
                ${group.items.map(renderItem).join('')}
            </div>
        </div>`).join('');

    return sectionsMarkup;
}
