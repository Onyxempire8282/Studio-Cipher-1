// Builds Claim Cipher standardized summary text from parsedEstimate + bcifPayload
import { internalToSummaryText } from "./ratingMap.js";

export function buildClaimSummary(parsedEstimate, payload) {
    const est = parsedEstimate || {};
    const conditionText = internalToSummaryText[payload.condition.overall] || "condition consistent with age and mileage";

    const header = buildHeaderBlock(est, payload, conditionText);
    const inspection = buildInspectionSection(est, payload);
    const damage = buildDamageSection(est);
    const parts = buildPartsSection(est);
    const conclusion = buildConclusionSection(est, payload);

    return [header, inspection, damage, parts, conclusion]
        .filter(Boolean)
        .join("\n\n");
}

// =========================================
//  HEADER BLOCK
// =========================================

function buildHeaderBlock(est, payload, conditionText) {
    const owner = est.ownerName || "";
    const carrier = est.carrierName || payload.claim.carrier || "";
    const claimNumber = est.claimNumber || payload.claim.claimNumber || "";
    const dateOfLoss = formatDate(est.dateOfLoss || payload.claim.dateOfLoss || "");
    const inspectionDate = formatDate(est.estimateTimestamp || est.inspectionDate || payload.claim.dateOfInspection || "");
    const inspectionLocation = est.inspectionLocation || payload.claim.lossLocation || "";

    const year = est.year || payload.vehicle.year || "";
    const make = est.make || payload.vehicle.make || "";
    const model = est.model || payload.vehicle.model || "";
    const vehicle = [year, make, model].filter(Boolean).join(" ");
    const vin = est.vin || payload.vehicle.vin || "";
    const odometer = formatNumberWithCommas(est.mileage || est.odometer || payload.vehicle.odometer || "");
    const condition = capitalizeFirst(conditionText);

    const lines = [
        `Owner: ${owner}`,
        `Carrier: ${carrier}`,
        `Claim Number: ${claimNumber}`,
        `Date of Loss: ${dateOfLoss}`,
        `Inspection Date: ${inspectionDate}`,
        `Inspection Location: ${inspectionLocation}`,
        "",
        `Vehicle: ${vehicle}`,
        `VIN: ${vin}`,
        `Odometer: ${odometer}`,
        `Condition: ${condition}`
    ];

    return lines.join("\n");
}

// =========================================
//  INSPECTION
// =========================================

function buildInspectionSection(est, payload) {
    const location = est.inspectionLocation || payload.claim.lossLocation || "";
    const inspectionDate = formatDate(est.estimateTimestamp || est.inspectionDate || payload.claim.dateOfInspection || "");

    const year = est.year || payload.vehicle.year || "";
    const make = est.make || payload.vehicle.make || "";
    const model = est.model || payload.vehicle.model || "";
    const vehicle = [year, make, model].filter(Boolean).join(" ");
    const vin = est.vin || payload.vehicle.vin || "";

    const lines = ["INSPECTION"];

    const locationPart = location ? ` at ${location}` : "";
    const datePart = inspectionDate ? ` on ${inspectionDate}` : "";
    lines.push(`Vehicle inspected${locationPart}${datePart}.`);

    if (vehicle || vin) {
        const vinPart = vin ? `, VIN ${vin}` : "";
        lines.push(`Vehicle identified as a ${vehicle}${vinPart}.`);
    }

    return lines.join("\n");
}

// =========================================
//  DAMAGE OBSERVATION
// =========================================

function buildDamageSection(est) {
    const poi = est.pointOfImpact || "";
    const lossType = est.lossType || "";

    const lines = ["DAMAGE OBSERVATION"];

    if (poi) {
        lines.push(`Damages observed primarily in the ${poi} region as outlined in the uploaded estimate.`);
    } else {
        lines.push("Damages documented as outlined in the uploaded estimate.");
    }

    if (lossType) {
        lines.push(`Loss type listed as ${lossType}.`);
    }

    return lines.join("\n");
}

// =========================================
//  PARTS & VERIFICATION
// =========================================

function buildPartsSection(est) {
    const lines = ["PARTS & VERIFICATION"];

    lines.push("Parts availability verified with suppliers within a 150-mile radius.");
    lines.push("According to the insured and estimate documentation, part selection is consistent with current market availability.");

    const isOemOnly = est.oemOnly === true || est.alternativePartsDetected === false;

    if (isOemOnly) {
        lines.push("If alternative components were unavailable, OEM parts were selected accordingly.");
    }

    return lines.join("\n");
}

// =========================================
//  CONCLUSION
// =========================================

function buildConclusionSection(est, payload) {
    const lines = ["CONCLUSION"];

    const estimateTotal = toNumber(est.estimateTotal);
    const acv = toNumber(est.acv);
    const isTotalLoss = acv > 0 && estimateTotal > 0 && (estimateTotal / acv) >= 0.75;

    if (isTotalLoss) {
        lines.push(`Based on the estimate total of ${formatCurrency(estimateTotal)} compared to ACV of ${formatCurrency(acv)}, the vehicle is declared a total loss.`);
    } else {
        lines.push("Vehicle appears repairable based on current valuation thresholds.");
    }

    return lines.join("\n");
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

function formatDate(value) {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
}

function toNumber(value) {
    if (value == null || value === "") return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
}

function capitalizeFirst(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
}
