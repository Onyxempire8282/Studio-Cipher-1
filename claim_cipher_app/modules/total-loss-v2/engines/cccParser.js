// Generic CCC Preliminary Estimate text parser.
// Extracts claim, vehicle, condition, and financial data using
// anchor-based pattern matching. No reliance on file names,
// insured names, or fixed line numbers.

// =========================================
//  MAKE ABBREVIATION MAP
// =========================================

const MAKE_ABBREV = {
    "HOND": "HONDA",
    "CHEV": "CHEVROLET",
    "TOYT": "TOYOTA",
    "NISS": "NISSAN",
    "HYUN": "HYUNDAI",
    "MITS": "MITSUBISHI",
    "MERZ": "MERCEDES-BENZ",
    "BENZ": "MERCEDES-BENZ",
    "MERC": "MERCURY",
    "LINC": "LINCOLN",
    "CADI": "CADILLAC",
    "BUIC": "BUICK",
    "PONT": "PONTIAC",
    "OLDS": "OLDSMOBILE",
    "CHRY": "CHRYSLER",
    "DODG": "DODGE",
    "JEEP": "JEEP",
    "SUBA": "SUBARU",
    "MAZD": "MAZDA",
    "VOLV": "VOLVO",
    "SATU": "SATURN",
    "ACUR": "ACURA",
    "LEXU": "LEXUS",
    "INFI": "INFINITI",
    "SCION": "SCION",
    "MASE": "MASERATI",
    "JAGU": "JAGUAR",
    "LNDR": "LAND ROVER",
    "ROVE": "LAND ROVER",
    "PORS": "PORSCHE",
    "AUDI": "AUDI",
    "SAAB": "SAAB",
    "SUZU": "SUZUKI",
    "ISUZ": "ISUZU",
    "VOLK": "VOLKSWAGEN",
    "FORD": "FORD",
    "GMC":  "GMC",
    "BMW":  "BMW",
    "KIA":  "KIA",
    "MINI": "MINI",
    "FIAT": "FIAT",
    "RAM":  "RAM",
    "TSLA": "TESLA",
    "TELA": "TESLA",
    "RIVE": "RIVIAN",
    "GENI": "GENESIS",
    "ALFA": "ALFA ROMEO",
};

// =========================================
//  PUBLIC API
// =========================================

export function parseCCCText(rawText) {
    const text = normalizeWhitespace(rawText);

    // ── 1. Format guard ───────────────────────────────────────────────
    if (!looksLikeCCCDocument(text)) {
        return {
            success: false,
            error:   'UNSUPPORTED_FORMAT',
            message: 'This does not appear to be a CCC Preliminary Estimate. ' +
                     'Required document markers (Preliminary Estimate, Claim #, VIN) were not found.'
        };
    }

    // ── 2. Extract required fields first ─────────────────────────────
    const claimNumber = extractFieldSameLine(text, /claim\s*#\s*:?/i);
    const vin         = extractVIN(text);
    const options     = extractOptions(text);

    // ── 3. Required field guards ──────────────────────────────────────
    if (!claimNumber) {
        return {
            success: false,
            error:   'MISSING_CLAIM_NUMBER',
            message: 'Claim number could not be found in this estimate. ' +
                     'Verify the PDF is a complete CCC Preliminary Estimate.'
        };
    }

    if (!vin) {
        return {
            success: false,
            error:   'MISSING_VIN',
            message: 'VIN could not be extracted from this estimate. ' +
                     'Expected a 17-character alphanumeric identifier after "VIN:".'
        };
    }

    if (!options || options.length === 0) {
        return {
            success: false,
            error:   'EMPTY_OPTIONS',
            message: 'No vehicle options or equipment features could be extracted. ' +
                     'The TRANSMISSION / options section may be missing or formatted unexpectedly.'
        };
    }

    // ── 4. Full parse ─────────────────────────────────────────────────
    const veh = parseVehicleLine(text);
    const costBreakdown = extractCostBreakdown(text);

    return {
        success:                  true,
        ownerName:                extractOwnerName(text),
        insuredName:              extractInsured(text),
        ownerPhone:               extractOwnerPhone(text),
        carrierName:              extractCarrier(text),
        claimNumber,
        policyNumber:             extractFieldSameLine(text, /policy\s*#\s*:?/i),
        dateOfLoss:               extractDateOfLoss(text),
        lossType:                 extractLossType(text),
        lossZip:                  extractLossZip(text),
        inspectionLocation:       extractInspectionLocation(text),
        year:                     veh.year,
        make:                     veh.make,
        model:                    veh.model,
        bodyStyle:                veh.bodyStyle,
        cylinders:                veh.cylinders,
        engineSize:               veh.engineSize,
        transmission:             veh.transmission,
        vin,
        mileage:                  extractMileage(text),
        conditionRating:          extractCondition(text),
        pointOfImpact:            extractPointOfImpact(text),
        estimateTotal:            extractEstimateTotal(text),
        acv:                      extractACV(text),
        estimateTimestamp:        extractTimestamp(text),
        oemOnly:                  detectOEMOnly(text),
        alternativePartsDetected: detectAlternativeParts(text),
        options,
        repairDays:               extractRepairDays(text),
        priorDamage:              extractPriorDamage(text),
        laborTotal:               costBreakdown.labor,
        partsTotal:               costBreakdown.parts,
        paintTotal:               costBreakdown.paint,
    };
}

// =========================================
//  CLAIM FIELDS
// =========================================

function extractOwnerName(text) {
    // "Owner: Shingleton, Julia Job Number:"
    // Bounded: capture between "Owner:" and "Job Number" (or end of line).
    const match = text.match(/Owner\s*:\s*([\s\S]*?)(?=Job\s*Number|Written\s*By|\n\s*\n)/i);
    if (!match) return "";
    // Take only first line of match (in case multiline captured)
    const firstLine = match[1].split("\n")[0].trim();
    return cleanName(firstLine);
}

function extractInsured(text) {
    // "Insured: Spartan Fire & Emergency Policy #: Claim #: 10382231"
    // "Apparatus, Inc"
    // Bounded: capture between "Insured:" and "Policy #:" or "Claim #:"
    const match = text.match(/Insured\s*:\s*([\s\S]*?)(?=Policy\s*#|Claim\s*#)/i);
    if (!match) return "";

    let firstPart = match[1].trim();

    // Check for continuation line after the Claim #/Policy # on the next line
    const afterPos = match.index + match[0].length;
    const rest = text.substring(afterPos);
    const eol = rest.indexOf("\n");
    if (eol !== -1) {
        const contLines = rest.substring(eol + 1, eol + 200).split("\n");
        for (const cline of contLines) {
            const trimmed = cline.trim();
            if (!trimmed) break;
            if (/^(Type\s+of\s+Loss|Date\s+of\s+Loss|Point\s+of\s+Impact|Owner|Written|Adjuster|Inspection|VEHICLE)/i.test(trimmed)) break;
            if (trimmed.length < 60 && !trimmed.includes(":") && !/^\d/.test(trimmed)) {
                firstPart = firstPart + " " + trimmed;
            }
            break; // Only check first continuation line
        }
    }

    return firstPart.trim();
}

function extractCarrier(text) {
    const headerArea = text.split(/Preliminary\s+Estimate/i)[0] || text;
    const headerLines = headerArea.split("\n").map(l => l.trim()).filter(Boolean);
    for (const line of headerLines) {
        if (/INSURANCE|MUTUAL|INDEMNITY|CASUALTY|ASSURANCE/i.test(line)) {
            return line;
        }
    }

    const forBlock = text.match(/For\s*:\s*\n([\s\S]*?)(?=Preliminary\s+Estimate)/i);
    if (forBlock) {
        const lines = forBlock[1].split("\n").map(l => l.trim()).filter(Boolean);
        for (const line of lines) {
            if (/INSURANCE|MUTUAL|INDEMNITY|CASUALTY|ASSURANCE/i.test(line)) {
                return line;
            }
        }
        if (lines.length > 1) return lines[lines.length - 1];
        if (lines.length === 1) return lines[0];
    }

    return "";
}

function extractOwnerPhone(text) {
    // Phone lives in the Inspection Location block, NOT the owner header.
    // Layout:
    //   Inspection Location:    Repair Facility:
    //   Name                    Name
    //   123 Street              123 Street
    //   City, ST ZIP            City, ST ZIP
    //   (555) 123-4567 Business Home
    const anchorIdx = text.search(/Inspection\s+Location\s*:/i);
    if (anchorIdx === -1) return "";

    // Scan a window after the anchor for a phone number
    const window = text.substring(anchorIdx, anchorIdx + 600);
    const phoneMatch = window.match(/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
    if (!phoneMatch) return "";

    // Clean: strip "Business", "Home", leading/trailing whitespace
    let phone = phoneMatch[0].trim();
    // Normalize to (XXX) XXX-XXXX format
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 10) {
        phone = `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
    }
    return phone;
}

function extractLossType(text) {
    // Bounded: between "Type of Loss:" and "Date of Loss:"
    const match = text.match(/Type\s+of\s+Loss\s*:\s*([\s\S]*?)(?=Date\s+of\s+Loss)/i);
    if (!match) return "";
    // Take first line only, trim
    return match[1].split("\n")[0].trim();
}

function extractDateOfLoss(text) {
    // Bounded: after "Date of Loss:" capture the date value
    const match = text.match(/Date\s+of\s+Loss\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM))?)/i);
    return match ? match[1].trim() : "";
}

function extractLossZip(text) {
    // ZIP from Inspection Location block (NOT owner address block).
    const anchorIdx = text.search(/Inspection\s+Location\s*:/i);
    if (anchorIdx === -1) return "";

    const window = text.substring(anchorIdx, anchorIdx + 400);
    // Look for City, ST ZZZZZ pattern
    const zipMatch = window.match(/[A-Za-z]+,?\s+[A-Z]{2}\s+(\d{5})/);
    return zipMatch ? zipMatch[1] : "";
}

function extractInspectionLocation(text) {
    const anchorIdx = text.search(/Inspection\s+Location\s*:/i);
    if (anchorIdx === -1) return "";

    const window = text.substring(anchorIdx, anchorIdx + 400);
    const lines = window.split("\n").map(l => l.trim()).filter(Boolean);
    lines.shift(); // skip anchor line

    let streetAddr = "";
    let streetIdx = -1;

    for (let i = 0; i < lines.length; i++) {
        if (/^\d+\s+[A-Za-z]/.test(lines[i])) {
            streetAddr = lines[i];
            streetIdx = i;
            break;
        }
        if (/^[A-Za-z]+,?\s+[A-Z]{2}\s+\d{5}/.test(lines[i])) {
            return lines[i];
        }
    }

    if (streetAddr) {
        for (let j = streetIdx + 1; j < Math.min(streetIdx + 5, lines.length); j++) {
            if (/^[A-Za-z]+,?\s+[A-Z]{2}\s+\d{5}/.test(lines[j])) {
                return streetAddr + ", " + lines[j];
            }
        }
        return streetAddr;
    }

    for (const line of lines) {
        if (/^(Repair|Owner|VEHICLE|Phone|Insured)\b/i.test(line)) continue;
        if (line.length > 3) return line;
    }

    return "";
}

// =========================================
//  VEHICLE LINE PARSER
// =========================================

function parseVehicleLine(text) {
    const result = {
        year: "",
        make: "",
        model: "",
        bodyStyle: "",
        cylinders: "",
        engineSize: "",
        transmission: "",
    };

    const desc = extractVehicleDescLine(text);
    if (!desc) return result;

    // Year: first 4 digits
    const yearMatch = desc.match(/^(\d{4})\b/);
    if (yearMatch) result.year = yearMatch[1];

    // Make: next word after year, normalized
    const makeMatch = desc.match(/^\d{4}\s+([A-Za-z]+)/);
    if (makeMatch) {
        const rawMake = makeMatch[1].toUpperCase();
        result.make = MAKE_ABBREV[rawMake] || rawMake;
    }

    // Model: next word(s) after make, before trim/body/engine markers
    const modelMatch = desc.match(/^\d{4}\s+\S+\s+(\S+)/);
    if (modelMatch) result.model = modelMatch[1];

    // Body style: look for "2D"/"4D" patterns or keyword
    const bodyToken = parseBodyFromDesc(desc);
    result.bodyStyle = bodyToken;

    // Cylinders + Engine size: pattern like "4-1.8L" or "6-3.5L"
    const cylEngMatch = desc.match(/(\d+)-([\d.]+L)/i);
    if (cylEngMatch) {
        result.cylinders = `CYL_${cylEngMatch[1]}`;
        result.engineSize = cylEngMatch[2];
    } else {
        // Fallback: look for "V6", "V8", "I4" etc.
        const vMatch = desc.match(/[VvIi](\d+)/);
        if (vMatch) result.cylinders = `CYL_${vMatch[1]}`;

        // Fallback engine size: "X.XL" pattern
        const sizeMatch = desc.match(/(\d+\.\d+L)/i);
        if (sizeMatch) result.engineSize = sizeMatch[1];
    }

    // Transmission
    result.transmission = parseTransFromDesc(desc);

    return result;
}

function parseBodyFromDesc(desc) {
    const d = desc.toUpperCase();

    // CCC uses "4D SED", "2D CPE", "4D SUV", "4D HBK", "2D CNV" etc.
    if (/\b4D\b/.test(d) || /\bSEDAN\b/.test(d) || /\bSED\b/.test(d)) return "BODY_4DR";
    if (/\b2D\b/.test(d) || /\bCOUPE\b/.test(d) || /\bCPE\b/.test(d)) return "BODY_2DR";
    if (/\bCONVERT/.test(d) || /\bCNV\b/.test(d)) return "BODY_CONVERTIBLE";
    if (/\bHATCH/.test(d) || /\bHBK\b/.test(d)) return "BODY_HATCHBACK";
    if (/\bPICKUP\b/.test(d) || /\bPKP\b/.test(d)) return "BODY_PICKUP";
    if (/\bUTIL/.test(d) || /\bSUV\b/.test(d)) return "BODY_UTILITY";
    if (/\bVAN\b/.test(d) || /\bMINIVAN\b/.test(d)) return "BODY_VAN";
    if (/\bWAGON\b/.test(d) || /\bWGN\b/.test(d) || /\bESTATE\b/.test(d)) return "BODY_WAGON";

    return "";
}

function parseTransFromDesc(desc) {
    const d = desc.toUpperCase();

    // CVT / Automatic
    if (/CONTINUOUSLY\s+VARIABLE/i.test(desc)) return "TRANS_AUTO";
    if (/\bAUTOMATIC\b/.test(d)) return "TRANS_AUTO";
    if (/\bCVT\b/.test(d)) return "TRANS_AUTO";

    // Manual speeds
    if (/\b6[\s-]*SP(?:EED|D)?\b/.test(d)) return "TRANS_S6";
    if (/\b5[\s-]*SP(?:EED|D)?\b/.test(d)) return "TRANS_S5";
    if (/\b4[\s-]*SP(?:EED|D)?\b/.test(d)) return "TRANS_S4";
    if (/\b3[\s-]*SP(?:EED|D)?\b/.test(d)) return "TRANS_S3";

    // 4WD/AWD
    if (/\b4WD\b/.test(d) || /\b4X4\b/.test(d) || /\bAWD\b/.test(d)) return "TRANS_4W";

    // Overdrive
    if (/\bOVERDRIVE\b/.test(d) || /\bO\/D\b/.test(d)) return "TRANS_OD";

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
    poi = poi.replace(/^\d+\s*/, "");
    return poi;
}

// =========================================
//  FINANCIAL
// =========================================

function extractEstimateTotal(text) {
    const totalRepairs = text.match(/Total\s+Cost\s+of\s+Repairs\s*[\s:]*\$?\s*([\d,]+\.?\d*)/i);
    if (totalRepairs) return parseFloat(totalRepairs[1].replace(/,/g, ""));

    const netRepairs = text.match(/Net\s+Cost\s+of\s+Repairs\s*[\s:]*\$?\s*([\d,]+\.?\d*)/i);
    if (netRepairs) return parseFloat(netRepairs[1].replace(/,/g, ""));

    const subtotal = text.match(/Subtotal\s*[\s:]*\$?\s*([\d,]+\.?\d*)/i);
    if (subtotal) return parseFloat(subtotal[1].replace(/,/g, ""));

    return 0;
}

function extractACV(text) {
    const acvMatch = text.match(/(?:Actual\s+Cash\s+Value|ACV)\s*[\s:]*\$?\s*([\d,]+\.?\d*)/i);
    if (acvMatch) return parseFloat(acvMatch[1].replace(/,/g, ""));

    const fmvMatch = text.match(/Fair\s+Market\s+Value\s*[\s:]*\$?\s*([\d,]+\.?\d*)/i);
    if (fmvMatch) return parseFloat(fmvMatch[1].replace(/,/g, ""));

    return 0;
}

// =========================================
//  PARTS ANALYSIS
// =========================================

function detectOEMOnly(text) {
    const tableSelected = countAlternatePartsSelected(text);
    if (tableSelected > 0) return false;
    if (tableSelected === 0) return true;

    const hasRecycled = /RECYCLED\s+PARTS\s+USED\s*\(Y\)/i.test(text);
    const hasAftermarket = /AFTERMARKET\s+PARTS\s+USED\s*\(Y\)/i.test(text);

    if (!hasRecycled && !hasAftermarket) return true;
    return false;
}

function detectAlternativeParts(text) {
    const tableSelected = countAlternatePartsSelected(text);
    if (tableSelected !== null) return tableSelected > 0;

    if (/AFTERMARKET\s+PARTS\s+USED\s*\(Y\)/i.test(text)) return true;
    if (/RECYCLED\s+PARTS\s+USED\s*\(Y\)/i.test(text)) return true;
    return false;
}

function countAlternatePartsSelected(text) {
    const section = text.match(/ALTERNATE\s+PARTS\s+USAGE[\s\S]{0,600}/i);
    if (!section) return null;

    const selected = section[0].match(/#\s*Of\s+Parts\s+Selected[\s\S]{0,300}/i);
    if (!selected) return null;

    let window = selected[0];
    window = window.split(/\d{1,2}\/\d{1,2}\/\d{4}/)[0] || window;
    window = window.split(/\bPage\s+\d/i)[0] || window;

    const counts = window.match(/^(\d+)\s*$/gm);
    if (!counts) return 0;

    return counts.reduce((sum, n) => sum + parseInt(n, 10), 0);
}

// =========================================
//  OPTIONS / FEATURES
// =========================================

function extractOptions(text) {
    const options = [];

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
    const match = text.match(/(\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}:\d{2}\s*(?:AM|PM))/i);
    return match ? match[1] : "";
}

// =========================================
//  REPAIR DAYS / PRIOR DAMAGE / COST BREAKDOWN
// =========================================

function extractRepairDays(text) {
    const match = text.match(/(?:Repair|Labor)\s*Days?\s*:?\s*(\d+(?:\.\d+)?)/i);
    if (match) return parseFloat(match[1]);

    const hrsMatch = text.match(/(?:Total\s*)?Labor\s*Hours?\s*:?\s*(\d+(?:\.\d+)?)/i);
    if (hrsMatch) {
        const hours = parseFloat(hrsMatch[1]);
        return Math.ceil(hours / 8);
    }
    return 0;
}

function extractPriorDamage(text) {
    const updMatch = text.match(/(?:Unrelated\s*Prior\s*Damage|UPD)\s*:?\s*([^\n]+)/i);
    if (updMatch) return updMatch[1].trim();

    if (/NO\s+UPD\s+VISIBLE/i.test(text)) return "NO UPD VISIBLE";
    if (/PRIOR\s+DAMAGE\s*:\s*NONE/i.test(text)) return "NONE";

    return "";
}

function extractCostBreakdown(text) {
    const result = { labor: 0, parts: 0, paint: 0 };

    const laborMatch = text.match(/(?:Total\s+)?Labor\s*(?:Cost|Amount)?\s*[\s:]*\$?\s*([\d,]+\.?\d*)/i);
    if (laborMatch) result.labor = parseFloat(laborMatch[1].replace(/,/g, ""));

    const partsMatch = text.match(/(?:Total\s+)?Parts?\s*(?:Cost|Amount)?\s*[\s:]*\$?\s*([\d,]+\.?\d*)/i);
    if (partsMatch) result.parts = parseFloat(partsMatch[1].replace(/,/g, ""));

    const paintMatch = text.match(/(?:Total\s+)?(?:Paint|Refinish)\s*(?:Cost|Amount|Material)?\s*[\s:]*\$?\s*([\d,]+\.?\d*)/i);
    if (paintMatch) result.paint = parseFloat(paintMatch[1].replace(/,/g, ""));

    return result;
}

// =========================================
//  HELPERS
// =========================================

function looksLikeCCCDocument(text) {
    // CCC ONE Preliminary Estimates always contain at least one of these structural markers.
    return (
        /Preliminary\s+Estimate/i.test(text) ||
        /\bCCC\s+ONE\b/i.test(text) ||
        /CCC\s+Information\s+Services/i.test(text)
    );
}

function extractFieldSameLine(text, anchorPattern) {
    const anchorMatch = text.match(anchorPattern);
    if (!anchorMatch) return "";

    const afterAnchor = text.substring(anchorMatch.index + anchorMatch[0].length);

    const sameLine = afterAnchor.match(/^[^\n]*\S[^\n]*/);
    if (sameLine) return sameLine[0].trim();

    const nextLine = afterAnchor.match(/\n[ \t]*(\S[^\n]*)/);
    if (nextLine) {
        const candidate = nextLine[1].trim();
        if (/^[A-Za-z].*[#:]/.test(candidate)) return "";
        return candidate;
    }

    return "";
}

function normalizeWhitespace(text) {
    if (!text) return "";
    return text
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\t/g, " ")
        .replace(/\u00A0/g, " ")
        .replace(/ {2,}/g, " ");
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
