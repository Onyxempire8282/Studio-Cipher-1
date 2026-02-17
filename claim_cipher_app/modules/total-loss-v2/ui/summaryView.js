// Summary Verification UI (Editable Structured View)

export function renderSummaryView(payload) {
    return `
        <div class="total-loss-v2-scope">
            <div class="cipher-plate elevation-2 sv-container">
                <div class="rivet tl"></div><div class="rivet tr"></div>
                <div class="rivet bl"></div><div class="rivet br"></div>

                <h2 class="cipher-section-title sv-title">SUMMARY VERIFICATION</h2>

                <div class="sv-grid">
                    <section class="cipher-plate-sm elevation-05 sv-section">
                        <div class="rivet tl"></div><div class="rivet tr"></div>
                        <div class="rivet bl"></div><div class="rivet br"></div>
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

                    <section class="cipher-plate-sm elevation-05 sv-section">
                        <div class="rivet tl"></div><div class="rivet tr"></div>
                        <div class="rivet bl"></div><div class="rivet br"></div>
                        <h3 class="cipher-label sv-section-heading">Vehicle</h3>
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

                    <section class="cipher-plate-sm elevation-05 sv-section sv-section--full">
                        <div class="rivet tl"></div><div class="rivet tr"></div>
                        <div class="rivet bl"></div><div class="rivet br"></div>
                        <h3 class="cipher-label sv-section-heading">Options / Equipment</h3>
                        <div class="sv-field-group">
                            <label class="cipher-body" for="sv-optionsSelect">Parsed CCC Options</label>
                            <select id="sv-optionsSelect" class="cipher-input" multiple size="8"></select>
                            <div class="cipher-body cipher-text-muted">Parsed options appear here. Hold Ctrl/Cmd to multi-select.</div>
                        </div>
                    </section>

                    <section class="cipher-plate-sm elevation-05 sv-section sv-section--full">
                        <div class="rivet tl"></div><div class="rivet tr"></div>
                        <div class="rivet bl"></div><div class="rivet br"></div>
                        <h3 class="cipher-label sv-section-heading">Condition</h3>
                        <div class="sv-field-group">
                            <label class="cipher-body" for="sv-overall">Overall Rating</label>
                            <select id="sv-overall" class="cipher-input">
                                ${renderRatingOptions(payload.condition.overall)}
                            </select>
                        </div>
                    </section>
                    <section class="cipher-plate-sm elevation-05 sv-section sv-section--full">
                        <div class="rivet tl"></div><div class="rivet tr"></div>
                        <div class="rivet bl"></div><div class="rivet br"></div>
                        <h3 class="cipher-label sv-section-heading">Damage Summary</h3>
                        <div class="sv-summary-actions">
                            <button id="tls-copy-summary" class="cipher-btn" type="button">Copy Summary</button>
                            <button id="tls-download-summary" class="cipher-btn" type="button">Download Summary</button>
                        </div>
                        <div id="tls-copy-status" class="tls-copy-status" aria-live="polite"></div>
                        <textarea id="sv-damageSummary" class="cipher-input sv-textarea" readonly>${payload.summary.damageSummary}</textarea>
                    </section>

                    <section class="cipher-plate-sm elevation-05 sv-section sv-section--full">
                        <div class="rivet tl"></div><div class="rivet tr"></div>
                        <div class="rivet bl"></div><div class="rivet br"></div>
                        <h3 class="cipher-label sv-section-heading">Additional Notes</h3>
                        <textarea id="sv-additionalNotes" class="cipher-input sv-textarea">${payload.summary.additionalNotes}</textarea>
                    </section>
                </div>

                <div class="sv-actions">
                    <button id="sv-download" class="cipher-btn cipher-btn--primary">
                        <div class="rivet tl"></div><div class="rivet tr"></div>
                        <div class="rivet bl"></div><div class="rivet br"></div>
                        Download Form
                    </button>
                    <button id="sv-generateSummary" class="cipher-btn">
                        <div class="rivet tl"></div><div class="rivet tr"></div>
                        <div class="rivet bl"></div><div class="rivet br"></div>
                        Generate Summary
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderRatingOptions(selected) {
    return [3, 2, 1, 0]
        .map(val => `
            <option value="${val}" ${val === selected ? "selected" : ""}>
                ${ratingLabel(val)}
            </option>
        `)
        .join("");
}

function ratingLabel(val) {
    switch (val) {
        case 3: return "Exceptional";
        case 2: return "Above Average";
        case 1: return "Normal";
        case 0: return "Below Average";
        default: return "Normal";
    }
}
