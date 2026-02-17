// Claim Summary editable panel
export function renderSummaryBuilder(summaryText = "") {
    return `
        <textarea class="summary-editor">${summaryText}</textarea>
    `;
}
