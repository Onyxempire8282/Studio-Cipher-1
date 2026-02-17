// Generic CCC Preliminary Estimate text parser.
// Extracts claim, vehicle, condition, and financial data using
// anchor-based pattern matching. No reliance on file names,
// insured names, or fixed line numbers.

export function parseCCCText(rawText) {
    const text = normalizeWhitespace(rawText);

    return {
        ownerName:                extractOwnerName(text),
        insuredName:              extractInsured(text),
        carrierName:              extractCarrier(text),
        claimNumber:              extractFieldSameLine(text, /claim\s*#\s*:?/i),
        policyNumber:             extractFieldSameLine(text, /policy\s*#\s*:?/i),
        dateOfLoss:               extractField(text, /date\s+of\s+loss\s*:?\s*(.+)/i),
        inspectionLocation:       extractInspectionLocation(text),
        year:                     extractVehicleYear(text),
        make:                     extractVehicleMake(text),
        model:                    extractVehicleModel(text),
        vin:                      extractVIN(text),
        mileage:                  extractMileage(text),
        conditionRating:          extractCondition(text),
        pointOfImpact:            extractPointOfImpact(text),
        lossType:                 extractField(text, /type\s+of\s+loss\s*:?\s*(.+)/i),
        estimateTotal:            extractEstimateTotal(text),
        acv:                      extractACV(text),
        estimateTimestamp:        extractTimestamp(text),
        oemOnly:                  detectOEMOnly(text),
        alternativePartsDetected: detectAlternativeParts(text),
        options:                  extractOptions(text)
    };
}

// =========================================
//  CLAIM FIELDS
// =========================================

function extractOwnerName(text) {
    // First "Owner:" on page 1 header area (before VEHICLE block)
    const match = text.match(/Owner\s*:\s*([A-Z][A-Za-z',.\- ]+)/);
    return match ? cleanName(match[1]) : "";
}

function extractInsured(text) {
    const match = text.match(/Insured\s*:\s*([A-Z][A-Za-z',.\- ]+)/);
    return match ? cleanName(match[1]) : "";
}

function extractCarrier(text) {
    // Priority 1: Look for known carrier keywords (INSURANCE, MUTUAL, etc.)
    // in the header area before the first "Preliminary Estimate" line.
    // This avoids picking up the appraisal company from "For:" field.
    const headerArea = text.split(/Preliminary\s+Estimate/i)[0] || text;
    const headerLines = headerArea.split("\n").map(l => l.trim()).filter(Boolean);
    for (const line of headerLines) {
        if (/INSURANCE|MUTUAL|INDEMNITY|CASUALTY|ASSURANCE/i.test(line)) {
            return line;
        }
    }

    // Priority 2: "For:" block — scan all lines between "For:" and
    // "Preliminary Estimate", skipping the appraisal company name that
    // often appears on the first line immediately after "For:".
    const forBlock = text.match(/For\s*:\s*\n([\s\S]*?)(?=Preliminary\s+Estimate)/i);
    if (forBlock) {
        const lines = forBlock[1].split("\n").map(l => l.trim()).filter(Boolean);
        // Return the first line that contains a carrier keyword
        for (const line of lines) {
            if (/INSURANCE|MUTUAL|INDEMNITY|CASUALTY|ASSURANCE/i.test(line)) {
                return line;
            }
        }
        // If no keyword match, return the last non-empty line before header
        // (carrier is typically listed below the appraisal company)
        if (lines.length > 1) return lines[lines.length - 1];
        if (lines.length === 1) return lines[0];
    }

    return "";
}

function extractInspectionLocation(text) {
    // CCC multi-column layout flattens Inspection Location / Repair Facility
    // headers together, with address data below. Strategy:
    // 1. Find the "Inspection Location:" anchor
    // 2. Scan the next ~300 chars for address-like content
    // 3. Skip lines that are other field headers or person names only

    const anchorIdx = text.search(/Inspection\s+Location\s*:/i);
    if (anchorIdx === -1) return "";

    const window = text.substring(anchorIdx, anchorIdx + 400);
    const lines = window.split("\n").map(l => l.trim()).filter(Boolean);

    // Skip the anchor line itself
    lines.shift();

    // Look for a street address line (digits + words)
    // In multi-column CCC layouts, the city/state/zip may not be the
    // very next line (repair facility address may interleave).
    // So find the first street address, then scan ahead for matching city/state/zip.
    let streetAddr = "";
    let streetIdx = -1;

    for (let i = 0; i < lines.length; i++) {
        if (/^\d+\s+[A-Za-z]/.test(lines[i])) {
            streetAddr = lines[i];
            streetIdx = i;
            break;
        }
        // City, ST ZIP on its own (no street line)
        if (/^[A-Za-z]+,?\s+[A-Z]{2}\s+\d{5}/.test(lines[i])) {
            return lines[i];
        }
    }

    if (streetAddr) {
        // Scan the next few lines for a city, ST ZIP pattern
        for (let j = streetIdx + 1; j < Math.min(streetIdx + 5, lines.length); j++) {
            if (/^[A-Za-z]+,?\s+[A-Z]{2}\s+\d{5}/.test(lines[j])) {
                return streetAddr + ", " + lines[j];
            }
        }
        return streetAddr;
    }

    // Fallback: first line after anchor that isn't another header
    for (const line of lines) {
        if (/^(Repair|Owner|VEHICLE|Phone|Insured)\b/i.test(line)) continue;
        if (line.length > 3) return line;
    }

    return "";
}

// =========================================
//  VEHICLE FIELDS
// =========================================

function extractVehicleYear(text) {
    const desc = extractVehicleDescLine(text);
    if (desc) {
        const yearMatch = desc.match(/^(\d{4})\b/);
        if (yearMatch) return yearMatch[1];
    }
    return "";
}

function extractVehicleMake(text) {
    const desc = extractVehicleDescLine(text);
    if (desc) {
        const parts = desc.match(/^\d{4}\s+(\S+)/);
        if (parts) return parts[1];
    }
    return "";
}

function extractVehicleModel(text) {
    const desc = extractVehicleDescLine(text);
    if (desc) {
        // Pattern: YEAR MAKE Model [trim] [drivetrain] [body] [engine...]
        const parts = desc.match(/^\d{4}\s+\S+\s+(\S+)/);
        if (parts) return parts[1];
    }
    return "";
}

function extractVehicleDescLine(text) {
    // CCC vehicle description line appears after "VEHICLE" header
    // Format: YYYY MAKE Model Trim Drivetrain Body Engine Color
    const match = text.match(/VEHICLE\s*\n\s*(\d{4}\s+[A-Z].+)/i);
    if (match) return match[1].trim();

    // Fallback: look for the repeated description line on subsequent pages
    const fallback = text.match(/(\d{4}\s+[A-Z]{2,}\s+\S+\s+\S+\s+\S+\s+\S+\s+\S+[^\n]+)/);
    return fallback ? fallback[1].trim() : "";
}

function extractVIN(text) {
    const match = text.match(/VIN\s*:\s*([A-HJ-NPR-Z0-9]{17})/i);
    return match ? match[1].toUpperCase() : "";
}

function extractMileage(text) {
    const match = text.match(/Odometer\s*:\s*([\d,]+)/i);
    return match ? match[1].replace(/,/g, "") : "";
}

function extractCondition(text) {
    const match = text.match(/Condition\s*:\s*(Excellent|Good|Fair|Poor)/i);
    return match ? capitalize(match[1]) : "";
}

// =========================================
//  DAMAGE / LOSS
// =========================================

function extractPointOfImpact(text) {
    const match = text.match(/Point\s+of\s+Impact\s*:\s*(.+)/i);
    if (!match) return "";

    let poi = match[1].trim();
    // CCC often prefixes with a numeric code like "29 Vandalism" or "01 Front"
    poi = poi.replace(/^\d+\s*/, "");
    return poi;
}

// =========================================
//  FINANCIAL
// =========================================

function extractEstimateTotal(text) {
    // "Total Cost of Repairs" is the gross total before deductible
    const totalRepairs = text.match(/Total\s+Cost\s+of\s+Repairs\s*[\s:]*\$?\s*([\d,]+\.?\d*)/i);
    if (totalRepairs) return parseFloat(totalRepairs[1].replace(/,/g, ""));

    // Fallback: "Net Cost of Repairs"
    const netRepairs = text.match(/Net\s+Cost\s+of\s+Repairs\s*[\s:]*\$?\s*([\d,]+\.?\d*)/i);
    if (netRepairs) return parseFloat(netRepairs[1].replace(/,/g, ""));

    // Fallback: generic "Subtotal"
    const subtotal = text.match(/Subtotal\s*[\s:]*\$?\s*([\d,]+\.?\d*)/i);
    if (subtotal) return parseFloat(subtotal[1].replace(/,/g, ""));

    return 0;
}

function extractACV(text) {
    // "Actual Cash Value" or "ACV"
    const acvMatch = text.match(/(?:Actual\s+Cash\s+Value|ACV)\s*[\s:]*\$?\s*([\d,]+\.?\d*)/i);
    if (acvMatch) return parseFloat(acvMatch[1].replace(/,/g, ""));

    // "Fair Market Value"
    const fmvMatch = text.match(/Fair\s+Market\s+Value\s*[\s:]*\$?\s*([\d,]+\.?\d*)/i);
    if (fmvMatch) return parseFloat(fmvMatch[1].replace(/,/g, ""));

    return 0;
}

// =========================================
//  PARTS ANALYSIS
// =========================================

function detectOEMOnly(text) {
    // The ALTERNATE PARTS USAGE table is the authoritative source.
    // Flags like "*AFTERMARKET PARTS USED (Y)" only indicate that
    // alternate parts were *listed as available*, not actually selected.
    const tableSelected = countAlternatePartsSelected(text);

    // Table found and shows actual selections → not OEM-only
    if (tableSelected > 0) return false;

    // Table found and shows 0 selections → OEM-only regardless of flags
    if (tableSelected === 0) return true;

    // No table found — fall back to flag-based detection
    const hasRecycled = /RECYCLED\s+PARTS\s+USED\s*\(Y\)/i.test(text);
    const hasAftermarket = /AFTERMARKET\s+PARTS\s+USED\s*\(Y\)/i.test(text);

    if (!hasRecycled && !hasAftermarket) return true;

    return false;
}

function detectAlternativeParts(text) {
    // The ALTERNATE PARTS USAGE table is authoritative over flags.
    const tableSelected = countAlternatePartsSelected(text);

    // Table found — trust the actual count
    if (tableSelected !== null) return tableSelected > 0;

    // No table — fall back to flags
    if (/AFTERMARKET\s+PARTS\s+USED\s*\(Y\)/i.test(text)) return true;
    if (/RECYCLED\s+PARTS\s+USED\s*\(Y\)/i.test(text)) return true;

    return false;
}

function countAlternatePartsSelected(text) {
    // Returns total # of alternate parts selected from the table,
    // or null if the table was not found.
    const section = text.match(/ALTERNATE\s+PARTS\s+USAGE[\s\S]{0,600}/i);
    if (!section) return null;

    const selected = section[0].match(/#\s*Of\s+Parts\s+Selected[\s\S]{0,300}/i);
    if (!selected) return null;

    // Trim the window at the first page footer (timestamp or "Page N")
    // to avoid counting footer numbers like "476348" or page numbers.
    let window = selected[0];
    window = window.split(/\d{1,2}\/\d{1,2}\/\d{4}/)[0] || window;
    window = window.split(/\bPage\s+\d/i)[0] || window;

    // Each alternate parts row (Aftermarket, Optional OEM, Reconditioned, Recycled)
    // has two numeric values: "# notified" and "# selected".
    // We only want the "# selected" column — every 2nd number per row group.
    // Simplest approach: sum all small digits found (0-9 range rows).
    const counts = window.match(/^(\d+)\s*$/gm);
    if (!counts) return 0;

    return counts.reduce((sum, n) => sum + parseInt(n, 10), 0);
}

// =========================================
//  OPTIONS / FEATURES
// =========================================

function extractOptions(text) {
    const options = [];

    // The CCC estimate has a features/equipment table between
    // TRANSMISSION/POWER headers and the line items section.
    const featureSection = text.match(
        /TRANSMISSION[\s\S]*?(?=Line\s+Oper|FRONT\s+BUMPER|Subtotal|ALTERNATE\s+PARTS)/i
    );
    if (!featureSection) return options;

    const lines = featureSection[0].split("\n").map(l => l.trim()).filter(Boolean);

    const headers = new Set([
        "TRANSMISSION", "POWER", "SEATS", "WHEELS", "PAINT",
        "SAFETY", "DECOR", "CONVENIENCE", "RADIO", "OTHER",
        "ROOF", "TRUCK", "EXTERIOR", "INTERIOR", "BRAKES",
        "OPTIONS", "EQUIPMENT", "FEATURES"
    ]);

    for (const line of lines) {
        if (headers.has(line.toUpperCase())) continue;
        if (line.length < 3) continue;
        if (/^\d/.test(line)) continue;
        options.push(line);
    }

    return options;
}

// =========================================
//  TIMESTAMP
// =========================================

function extractTimestamp(text) {
    // CCC footer timestamps: "8/15/2025 5:43:23 PM"
    const match = text.match(/(\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}:\d{2}\s*(?:AM|PM))/i);
    return match ? match[1] : "";
}

// =========================================
//  HELPERS
// =========================================

function extractField(text, pattern) {
    const match = text.match(pattern);
    if (!match) return "";
    return match[1].trim();
}

function extractFieldSameLine(text, anchorPattern) {
    // Find the anchor (e.g. "Policy #:"), then capture remaining text on
    // the SAME line only. If nothing remains on the anchor line, grab the
    // next non-empty line — but only if it doesn't look like another header.
    const anchorMatch = text.match(anchorPattern);
    if (!anchorMatch) return "";

    const afterAnchor = text.substring(anchorMatch.index + anchorMatch[0].length);

    // Same-line content (up to the next newline)
    const sameLine = afterAnchor.match(/^[^\n]*\S[^\n]*/);
    if (sameLine) return sameLine[0].trim();

    // Next non-empty line
    const nextLine = afterAnchor.match(/\n[ \t]*(\S[^\n]*)/);
    if (nextLine) {
        const candidate = nextLine[1].trim();
        // Skip if it looks like another field header (e.g. "Claim #:", "Type of Loss:")
        if (/^[A-Za-z].*[#:]/.test(candidate)) return "";
        return candidate;
    }

    return "";
}

function normalizeWhitespace(text) {
    if (!text) return "";
    // Normalize various whitespace but preserve newlines for anchor matching
    return text
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\t/g, " ")
        .replace(/\u00A0/g, " ")   // non-breaking space
        .replace(/ {2,}/g, " ");   // collapse multiple spaces
}

function cleanName(raw) {
    if (!raw) return "";
    let name = raw.trim();

    // Remove trailing noise (phone numbers, addresses, etc.)
    name = name.replace(/\s*\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}.*$/, "");
    name = name.replace(/\s*\d+\s+[A-Z].*$/, "");

    // If LASTNAME, FIRSTNAME → Firstname Lastname
    if (name.includes(",")) {
        const parts = name.split(",").map(p => p.trim());
        if (parts.length === 2 && parts[0].length > 1 && parts[1].length > 1) {
            name = capitalize(parts[1]) + " " + capitalize(parts[0]);
        }
    }

    return name.trim();
}

function capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
