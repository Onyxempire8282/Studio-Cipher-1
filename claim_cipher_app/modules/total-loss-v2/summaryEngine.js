// Builds Claim Cipher standardized summary text from parsedEstimate + bcifPayload

export function buildClaimSummary(parsedEstimate, payload) {
    const { header, narrative, estimateSummary } = buildSummaryParts(parsedEstimate, payload);
    const sections = buildSummarySections(narrative, estimateSummary, payload);

    return [header, narrative, estimateSummary].filter(Boolean).join("\n\n");
}

export function buildClaimSummarySections(parsedEstimate, payload) {
    const { narrative, estimateSummary } = buildSummaryParts(parsedEstimate, payload);
    return buildSummarySections(narrative, estimateSummary, payload);
}

function buildSummaryParts(parsedEstimate, payload) {
    const est = parsedEstimate || {};

    const poiRaw   = est.pointOfImpact || "";
    const poiCode  = parseInt(poiRaw);
    const poiLabel = extractPOILabel(poiRaw);

    const estimateTotalNum = toNumber(est.estimateTotal);
    const acvNum           = toNumber(est.acv);
    const deductibleNum    = toNumber(est.deductible);
    const isTotalLoss      = poiCode === 15
        || (acvNum > 0 && estimateTotalNum > 0 && (estimateTotalNum / acvNum) >= 0.75);

    const data = {
        claimNumber:   est.claimNumber  || payload.claim.claimNumber || "",
        ownerName:     est.ownerName    || "",
        ownerAddress:  "",
        ownerPhone:    est.ownerPhone   || "",
        ownerEmail:    "",
        adjusterName:  payload.claim.adjuster || "",
        adjusterPhone: "",
        adjusterEmail: "",
        year:          est.year         || payload.vehicle.year   || "",
        make:          est.make         || payload.vehicle.make   || "",
        model:         est.model        || payload.vehicle.model  || "",
        vin:           est.vin          || payload.vehicle.vin    || "",
        mileage:       formatNumberWithCommas(est.mileage || payload.vehicle.odometer || ""),
        poiLabel,
        damageAreas:   poiLabel         || "documented areas per estimate",
        estimateTotal: estimateTotalNum ? formatCurrency(estimateTotalNum) : "",
        acv:           acvNum           ? formatCurrency(acvNum)           : "",
        deductible:    deductibleNum    ? formatCurrency(deductibleNum)    : "",
        repairDays:    est.repairDays   || 0,
        isTotalLoss,
    };

    const header          = buildSummaryHeader(data);
    const narrative       = routeNarrative(data, poiCode, isTotalLoss);
    const estimateSummary = buildEstimateSummary(data);

    return { header, narrative, estimateSummary };
}

function buildSummarySections(narrative, estimateSummary, payload) {
    const sections = [
        { title: "LOSS DESCRIPTION", content: narrative }
    ];

    const additionalNotes = payload?.summary?.additionalNotes?.trim();
    if (additionalNotes) {
        sections.push({
            title: "ADDITIONAL NOTES",
            content: additionalNotes
        });
    }

    if (estimateSummary) {
        sections.push({
            title: "ESTIMATE SUMMARY",
            content: estimateSummary
        });
    }

    return sections;
}

// =========================================
//  POI HELPER
// =========================================

function extractPOILabel(poiRaw) {
    if (!poiRaw) return "";
    return poiRaw.replace(/^\d+\s*/, "").trim();
}

// =========================================
//  NARRATIVE ROUTING
// =========================================

function routeNarrative(data, poiCode, isTotalLoss) {
    if (isTotalLoss) {
        return buildTotalLossSummary(data);
    }
    if ([16, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29].includes(poiCode)) {
        return buildSpecialEventSummary(data);
    }
    if ([17, 18, 19].includes(poiCode)) {
        return buildComplexCollisionSummary(data);
    }
    return buildStandardCollisionSummary(data);
}

// =========================================
//  HEADER BLOCK
// =========================================

function buildSummaryHeader(data) {
    const lines = [];

    if (data.claimNumber)  lines.push(`Claim Number: ${data.claimNumber}`);
    if (data.ownerName)    lines.push(`Insured: ${data.ownerName}`);
    if (data.ownerAddress) lines.push(`Address: ${data.ownerAddress}`);
    if (data.ownerPhone)   lines.push(`Phone: ${data.ownerPhone}`);
    if (data.ownerEmail)   lines.push(`Email: ${data.ownerEmail}`);

    const hasAdjuster = data.adjusterName || data.adjusterPhone || data.adjusterEmail;
    if (hasAdjuster) {
        if (lines.length) lines.push("");
        if (data.adjusterName)  lines.push(`Carrier / Adjuster: ${data.adjusterName}`);
        if (data.adjusterPhone) lines.push(`Adjuster Phone: ${data.adjusterPhone}`);
        if (data.adjusterEmail) lines.push(`Adjuster Email: ${data.adjusterEmail}`);
    }

    const vehicle    = [data.year, data.make, data.model].filter(Boolean).join(" ");
    const hasVehicle = vehicle || data.vin || data.mileage || data.poiLabel;
    if (hasVehicle) {
        if (lines.length) lines.push("");
        if (vehicle)       lines.push(`Vehicle: ${vehicle}`);
        if (data.vin)      lines.push(`VIN: ${data.vin}`);
        if (data.mileage)  lines.push(`Odometer: ${data.mileage}`);
        if (data.poiLabel) lines.push(`Primary Point of Impact: ${data.poiLabel}`);
    }

    return lines.join("\n");
}

// =========================================
//  ESTIMATE FOOTER
// =========================================

function buildEstimateSummary(data) {
    const lines = [];
    if (data.estimateTotal) lines.push(`Estimate Total: ${data.estimateTotal}`);
    if (data.deductible)    lines.push(`Deductible: ${data.deductible}`);
    return lines.join("\n");
}

// =========================================
//  NARRATIVE BUILDERS
// =========================================

function buildStandardCollisionSummary(data) {
    const repairNote = data.repairDays > 0
        ? ` Estimated repair time: ${data.repairDays} day${data.repairDays !== 1 ? 's' : ''}.`
        : '';

    return `The vehicle sustained collision-related damage primarily to the ${data.damageAreas} as reflected by the CCC point of impact classification.

Visible damage includes: ${data.damageAreas}.

Based on the current inspection and estimate documentation, the vehicle appears repairable within economic guidelines.${repairNote} A supplement may be required following teardown. Final repair costs may be subject to supplemental findings.`.trim();
}

function buildTotalLossSummary(data) {
    const acvNote = data.acv
        ? ` Estimate total of ${data.estimateTotal} exceeds the economic repair threshold relative to the vehicle's actual cash value of ${data.acv}.`
        : '';

    return `The point of impact classification within the CCC estimating platform is designated as ${data.poiLabel}.

Based on the severity threshold reached within CCC, the amount of visible structural and mechanical damage meets total loss criteria and is not considered economically repairable.${acvNote}`.trim();
}

function buildSpecialEventSummary(data) {
    return `The vehicle sustained damage consistent with a special event loss classification as reflected by the CCC point of impact designation.

Damages documented to the ${data.damageAreas} are consistent with the reported loss type. Based on current documentation, the vehicle is subject to further review pending final valuation.`.trim();
}

function buildComplexCollisionSummary(data) {
    return `The vehicle sustained complex collision damage as reflected by the CCC point of impact classification.

Damage observed includes ${data.damageAreas}. Given the nature and distribution of the damage, a supplemental assessment may be required following initial teardown.`.trim();
}

// =========================================
//  HELPERS
// =========================================

function formatNumberWithCommas(value) {
    if (value === "" || value == null) return "";
    const num = Number(value);
    if (isNaN(num)) return String(value);
    return Math.round(num).toLocaleString("en-US");
}

function formatCurrency(value) {
    if (value === "" || value == null) return "";
    const num = Number(value);
    if (isNaN(num)) return String(value);
    return "$" + num.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function toNumber(value) {
    if (value == null || value === "") return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
}
