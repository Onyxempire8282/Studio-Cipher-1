// Summary Verification UI (Editable Structured View)

export function renderSummaryView(payload) {
    return `
        <div class="tls-summary-layout">
            <section class="tls-summary-header tl-header">
                <div class="tls-summary-header-inner">
                    <div class="tls-summary-header-left">
                        <div class="tls-summary-label tl-label">TOTAL LOSS STUDIO</div>
                        <div class="tls-summary-title tl-title">SUMMARY VERIFICATION</div>
                        
                    </div>
                    <div class="tls-summary-header-right tl-meta">
                        <div class="tls-summary-claim">CLAIM <span id="claimNumberDisplay" class="tls-data"></span></div>
                        <div class="tls-summary-vehicle"><span id="vehicleSummaryDisplay" class="tls-data"></span></div>
                        <div class="tls-summary-vin">VIN: <span id="vehicleVinDisplay" class="tls-data"></span></div>
                    </div>
                </div>
            </section>

            <section class="tls-verify-strip">
                <span class="tls-verify-dot" aria-hidden="true"></span>
                <span class="tls-verify-text">VERIFY BEFORE COMMITTING — Correct any errors below. Downloads are final.</span>
            </section>

            <section class="tls-summary-scroll">
                <div class="total-loss-v2-scope tls-summary">
                    <div class="sv-stack">
                        <section class="cipher-plate elevation-2 sv-plate sv-claim-plate">
                            <div class="rivet tl"></div><div class="rivet tr"></div>
                            <div class="rivet bl"></div><div class="rivet br"></div>
                            <div class="sv-plate-header">
                                <div class="sv-plate-title">CLAIM &amp; VEHICLE INFORMATION</div>
                            </div>
                            <div class="sv-plate-body">
                                <div class="sv-grid">
                                    <section class="sv-section">
                                        <h3 class="cipher-label sv-section-heading">Claim Information</h3>
                                        <div class="sv-field-group">
                                            <label class="cipher-body" for="sv-carrier">Carrier</label>
                                            <input type="text" id="sv-carrier" class="cipher-input" value="${payload.claim.carrier}" />
                                        </div>
                                        <div class="sv-field-group">
                                            <label class="cipher-body" for="sv-claimNumber">Claim Number</label>
                                            <input type="text" id="sv-claimNumber" class="cipher-input" value="${payload.claim.claimNumber}" />
                                        </div>
                                        <div class="sv-field-group">
                                            <label class="cipher-body" for="sv-adjuster">Adjuster</label>
                                            <input type="text" id="sv-adjuster" class="cipher-input" value="${payload.claim.adjuster}" />
                                        </div>
                                    </section>

                                    <section class="sv-section">
                                        <h3 class="cipher-label sv-section-heading">Vehicle Information</h3>
                                        <div class="sv-field-group">
                                            <label class="cipher-body" for="sv-year">Year</label>
                                            <input type="text" id="sv-year" class="cipher-input" value="${payload.vehicle.year}" />
                                        </div>
                                        <div class="sv-field-group">
                                            <label class="cipher-body" for="sv-make">Make</label>
                                            <input type="text" id="sv-make" class="cipher-input" value="${payload.vehicle.make}" />
                                        </div>
                                        <div class="sv-field-group">
                                            <label class="cipher-body" for="sv-model">Model</label>
                                            <input type="text" id="sv-model" class="cipher-input" value="${payload.vehicle.model}" />
                                        </div>
                                        <div class="sv-field-group">
                                            <label class="cipher-body" for="sv-vin">VIN</label>
                                            <input type="text" id="sv-vin" class="cipher-input" value="${payload.vehicle.vin}" />
                                        </div>
                                    </section>
                                </div>
                            </div>
                        </section>

                        <section class="cipher-plate elevation-2 sv-plate sv-accordion" data-accordion-item>
                            <div class="rivet tl"></div><div class="rivet tr"></div>
                            <div class="rivet bl"></div><div class="rivet br"></div>
                            <button class="sv-accordion-toggle" type="button" data-accordion-toggle aria-expanded="false">
                                <span class="sv-plate-title">OPTIONS / EQUIPMENT</span>
                                <span class="sv-chevron" aria-hidden="true"></span>
                            </button>
                            <div class="sv-accordion-body">
                                <div id="optionsContainer"></div>
                            </div>
                        </section>

                        <section class="cipher-plate elevation-2 sv-plate sv-accordion" data-accordion-item>
                            <div class="rivet tl"></div><div class="rivet tr"></div>
                            <div class="rivet bl"></div><div class="rivet br"></div>
                            <button class="sv-accordion-toggle" type="button" data-accordion-toggle aria-expanded="false">
                                <span class="sv-plate-title">CONDITION</span>
                                <span class="sv-chevron" aria-hidden="true"></span>
                            </button>
                            <div class="sv-accordion-body">
                                ${renderGranularCondition(payload.condition)}
                            </div>
                        </section>

                        <section class="cipher-plate elevation-2 sv-plate sv-accordion" data-accordion-item>
                            <div class="rivet tl"></div><div class="rivet tr"></div>
                            <div class="rivet bl"></div><div class="rivet br"></div>
                            <button class="sv-accordion-toggle" type="button" data-accordion-toggle aria-expanded="false">
                                <span class="sv-plate-title">DAMAGE SUMMARY</span>
                                <span class="sv-chevron" aria-hidden="true"></span>
                            </button>
                            <div class="sv-accordion-body">
                                <textarea id="sv-damageSummary" class="cipher-input sv-textarea" readonly>${payload.summary.damageSummary}</textarea>
                            </div>
                        </section>

                        <section class="cipher-plate elevation-2 sv-plate sv-accordion" data-accordion-item>
                            <div class="rivet tl"></div><div class="rivet tr"></div>
                            <div class="rivet bl"></div><div class="rivet br"></div>
                            <button class="sv-accordion-toggle" type="button" data-accordion-toggle aria-expanded="false">
                                <span class="sv-plate-title">ADDITIONAL NOTES</span>
                                <span class="sv-chevron" aria-hidden="true"></span>
                            </button>
                            <div class="sv-accordion-body">
                                <textarea id="sv-additionalNotes" class="cipher-input sv-textarea">${payload.summary.additionalNotes}</textarea>
                            </div>
                        </section>
                    </div>
                </div>
            </section>

            <section class="tls-summary-footer">
                <div class="tls-summary-footer-inner">
                    <div class="sv-actions-left">
                        <div class="tls-footer-claim">CLAIM <span id="footerClaimNumber" class="tls-data"></span> — Ready for Download</div>
                        <div class="tls-footer-vehicle"><span id="footerVehicleSummary" class="tls-data"></span></div>
                    </div>
                    <div class="sv-actions-right">
                        <button id="sv-reset" class="cipher-btn cipher-btn--ghost">Reset</button>
                        <button id="tls-download-summary" class="cipher-btn cipher-btn--secondary">Download Claim Summary</button>
                        <button id="sv-download" class="cipher-btn cipher-btn--primary">Download BCIF Form</button>
                    </div>
                </div>
            </section>
        </div>
    `;
}

// =========================================
//  GRANULAR CONDITION UI
// =========================================

function renderGranularCondition(condition) {
    const ratingChoices = [
        { value: 0, text: 'Poor' },
        { value: 1, text: 'Fair' },
        { value: 2, text: 'Good' },
        { value: 3, text: 'Excellent' },
    ];

    const columns = [
        [
            { key: 'paint', label: 'Paint' },
            { key: 'glass', label: 'Glass' },
            { key: 'seats', label: 'Seats' },
            { key: 'engine', label: 'Engine' },
            { key: 'frontTires', label: 'Front Tires', isTire: true },
        ],
        [
            { key: 'sheetMetal', label: 'Sheet Metal' },
            { key: 'trim', label: 'Trim' },
            { key: 'carpet', label: 'Carpet' },
            { key: 'transmission', label: 'Transmission' },
            { key: 'rearTires', label: 'Rear Tires', isTire: true },
        ]
    ];

    const renderBlock = ({ key, label, isTire }) => {
        const comp = condition[key] || {};
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
                    <div class="sv-tread-depth-group">
                        <span class="sv-tread-depth-label">Tread depth:</span>
                        <input type="text" class="cipher-input sv-tread-depth-input condition-tread-depth"
                               placeholder="e.g. 7/32" value="${comp.treadDepth || ''}" />
                    </div>` : '';

        return `
                <div class="sv-condition-block sv-condition-row" data-component="${key}">
                    <div class="sv-condition-label">${label.toUpperCase()}</div>
                    <div class="sv-condition-rating">
                        <span class="sv-rating-bar" aria-hidden="true"></span>
                        <select class="cipher-input condition-rating-select">${options}</select>
                    </div>
                    ${treadBlock}
                    <textarea class="condition-comment cipher-input sv-textarea" placeholder="Condition notes...">${comp.comment || ''}</textarea>
                </div>`;
    };

    const columnMarkup = columns
        .map(group => `<div class="sv-condition-col">${group.map(renderBlock).join('')}</div>`)
        .join('');

    return `<div class="sv-condition-grid">${columnMarkup}</div>`;
}
