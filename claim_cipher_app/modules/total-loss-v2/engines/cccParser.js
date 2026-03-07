// Generic CCC Preliminary Estimate text parser.
// Extracts claim, vehicle, condition, and financial data using
// anchor-based pattern matching. No reliance on file names,
// insured names, or fixed line numbers.

// =========================================
//  MAKE ABBREVIATION MAP
// =========================================

const MAKE_ABBREV = {
    "HOND": "Honda",
    "CHEV": "Chevrolet",
    "TOYT": "Toyota",
    "NISS": "Nissan",
    "HYUN": "Hyundai",
    "MITS": "Mitsubishi",
    "MERZ": "Mercedes-Benz",
    "BENZ": "Mercedes-Benz",
    "MERC": "Mercury",
    "LINC": "Lincoln",
    "CADI": "Cadillac",
    "BUIC": "Buick",
    "PONT": "Pontiac",
    "OLDS": "Oldsmobile",
    "CHRY": "Chrysler",
    "DODG": "Dodge",
    "JEEP": "Jeep",
    "SUBA": "Subaru",
    "MAZD": "Mazda",
    "VOLV": "Volvo",
    "SATU": "Saturn",
    "ACUR": "Acura",
    "LEXU": "Lexus",
    "LEXS": "Lexus",
    "INFI": "Infiniti",
    "SCION": "Scion",
    "MASE": "Maserati",
    "JAGU": "Jaguar",
    "LNDR": "Land Rover",
    "ROVE": "Land Rover",
    "PORS": "Porsche",
    "AUDI": "Audi",
    "SAAB": "Saab",
    "SUZU": "Suzuki",
    "SUZK": "Suzuki",
    "ISUZ": "Isuzu",
    "VOLK": "Volkswagen",
    "FORD": "Ford",
    "GMC":  "GMC",
    "BMW":  "BMW",
    "KIA":  "Kia",
    "MINI": "MINI",
    "FIAT": "Fiat",
    "RAM":  "Ram",
    "TESL": "Tesla",
    "TSLA": "Tesla",
    "TELA": "Tesla",
    "RIVE": "Rivian",
    "RIVN": "Rivian",
    "GENI": "Genesis",
    "GNES": "Genesis",
    "ALFA": "Alfa Romeo",
    "LUCD": "Lucid",
    "PLST": "Polestar",
    "SMRT": "Smart",
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
    const vehicleDescLine = extractVehicleDescLine(text) || '';
    const costBreakdown = extractCostBreakdown(text);
    const repairLineItems = extractRepairLineItems(text);
    const poi = extractPointOfImpact(text);

    return {
        success:                  true,
        ownerName:                extractOwnerName(text),
        insuredName:              extractInsured(text),
        ownerPhone:               extractOwnerPhone(text),
        carrierName:              extractCarrier(text),
        adjuster:                 extractAdjuster(text),
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
        exteriorColor:            extractExteriorColor(text),
        interiorColor:            extractInteriorColor(text),
        pointOfImpact:            poi.raw,
        pointOfImpactCode:        poi.code,
        pointOfImpactText:        poi.text,
        estimateTotal:            extractEstimateTotal(text),
        estimateTimestamp:        extractTimestamp(text),
        oemOnly:                  detectOEMOnly(text),
        alternativePartsDetected: detectAlternativeParts(text),
        options,
        repairDays:               extractRepairDays(text),
        priorDamage:              extractPriorDamage(text),
        laborTotal:               costBreakdown.labor,
        partsTotal:               costBreakdown.parts,
        paintTotal:               costBreakdown.paint,
        bodyLaborHrs:             costBreakdown.bodyLaborHrs,
        paintLaborHrs:            costBreakdown.paintLaborHrs,
        mechLaborHrs:             costBreakdown.mechLaborHrs,
        bodyLaborRate:            costBreakdown.bodyLaborRate,
        paintLaborRate:           costBreakdown.paintLaborRate,
        mechLaborRate:            costBreakdown.mechLaborRate,
        paintSupplies:            costBreakdown.paintSupplies,
        salesTax:                 costBreakdown.salesTax,
        salesTaxRate:             costBreakdown.salesTaxRate,
        deductible:               costBreakdown.deductible,
        frameLaborHrs:            costBreakdown.frameLaborHrs,
        frameLaborRate:           costBreakdown.frameLaborRate,
        repairLineItems,
        structuralFlagged:        repairLineItems.structuralFlagged || [],
        shopName:                 extractShopName(text),
        workfileId:               extractWorkfileId(text),
        _vehicleDescLine:         vehicleDescLine,
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
    // Carrier name appears on the line immediately after "For:" at the top
    const forMatch = text.match(/^For:\s*\n\s*(.+)$/m);
    let carrier = forMatch?.[1]?.trim() || '';

    // Guard: reject if matched disclaimer text — a carrier name will never exceed 8 words
    if (carrier.split(/\s+/).filter(Boolean).length > 8) {
        carrier = '';
    }

    return carrier;
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
    if (match) {
        const val = match[1].split("\n")[0].trim();
        if (val) return val;
    }

    // Fallback: capture word(s) after "Type of Loss:" until whitespace gap or newline
    const alt1 = text.match(/Type\s+of\s+Loss\s*:?\s*(\w[\w\s&/-]*?\w)(?=\s{2,}|\n)/i);
    if (alt1) {
        const val = alt1[1].trim();
        if (val) return val;
    }

    // Fallback: "Loss Type: Collision"
    const alt2 = text.match(/Loss\s+Type\s*:\s*(\S+)/i);
    if (alt2) return alt2[1].trim();

    return "";
}

function extractDateOfLoss(text) {
    // Primary: "Date of Loss: MM/DD/YYYY [HH:MM AM]"
    const match = text.match(/Date\s+of\s+Loss\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM))?)/i);
    if (match) return match[1].trim();

    // Alternate: "Loss Date: MM/DD/YYYY" or "Loss Date MM/DD/YYYY"
    const alt1 = text.match(/Loss\s+Date\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
    if (alt1) return alt1[1].trim();

    // Alternate: "DOL: MM/DD/YYYY" or "DOL MM/DD/YYYY"
    const alt2 = text.match(/DOL\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
    if (alt2) return alt2[1].trim();

    // Alternate: date on the line AFTER "Date of Loss" (separated by newline)
    const alt3 = text.match(/Date\s+of\s+Loss\s*:?\s*\n\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
    if (alt3) return alt3[1].trim();

    return "";
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
        // Skip vehicle description lines (start with 4-digit year)
        if (/^\d{4}\s+[A-Z]/i.test(line)) continue;
        // Skip lines with VIN-like patterns, engine specs, or vehicle keywords
        if (/[A-HJ-NPR-Z0-9]{17}/.test(line)) continue;
        if (/\d+-[\d.]+L\b/.test(line)) continue;
        if (/\b(SED|CPE|UTV|SUV|HBK|WGN|PKP|VAN|FWD|RWD|AWD|4WD|MPI|DOHC|SOHC|Flex\s*Fuel)\b/i.test(line)) continue;
        // Only accept lines that look address-like (contain digits + letters, not vehicle specs)
        if (line.length > 3 && /\d/.test(line) && /[A-Za-z]/.test(line)) return line;
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

    // Model: word(s) after make, before body style (2D/4D), engine (V6/4-1.5L), or trim markers
    // CCC format: "2022 HOND CR-V EX-L 4D UTV 4-1.5L ..."
    // We capture up to (but not including) the body code (2D/4D), cylinder-engine (4-1.5L), or drivetrain
    const modelMatch = desc.match(/^\d{4}\s+\S+\s+(.+?)(?=\s+(?:\d+D\b|\d+-[\d.]+L|\bSED\b|\bCPE\b|\bHBK\b|\bCNV\b|\bUTV\b|\bSUV\b|\bWGN\b|\bPKP\b|\bVAN\b|\bCONV\b|\b[VvIi]\d|\bAWD\b|\bFWD\b|\bRWD\b|\b4WD\b))/i);
    if (modelMatch) {
        result.model = modelMatch[1].trim();
    } else {
        // Fallback: just grab next token
        const simpleFallback = desc.match(/^\d{4}\s+\S+\s+(\S+)/);
        if (simpleFallback) result.model = simpleFallback[1];
    }

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

    return "TRANS_UNLISTED";
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
    let value = match ? match[1].replace(/,/g, "") : "";

    // Sanity check: if extracted value < 100, it's likely a column artifact
    if (value && parseInt(value, 10) < 100) {
        // Try "Odometer <digit> : <mileage>" (column index before colon)
        const alt1 = text.match(/Odometer\s*\d\s*:\s*([\d,]+)/i);
        if (alt1 && parseInt(alt1[1].replace(/,/g, ""), 10) >= 100) {
            return alt1[1].replace(/,/g, "");
        }
        // Try standalone mileage near vehicle description
        const alt2 = text.match(/(\d{3,6})\s*(?:miles?|mi)\b/i);
        if (alt2 && parseInt(alt2[1], 10) >= 100) {
            return alt2[1];
        }
        // Value is too low to be real mileage
        return "";
    }

    return value;
}

function extractCondition(text) {
    const match = text.match(/Condition\s*:\s*(Excellent|Good|Fair|Poor)/i);
    return match ? capitalize(match[1]) : "";
}

function extractExteriorColor(text) {
    // Primary: "Exterior Color: PEARL WHITE"
    const match = text.match(/Exterior\s+Color:\s*([^\n]+)/i);
    let color = match?.[1]?.trim() || '';

    // Convert ALL CAPS to Title Case (e.g. "PEARL WHITE" → "Pearl White")
    if (color) {
        color = color.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    }

    return color;
}

function extractInteriorColor(text) {
    const match = text.match(/Interior\s+Color:\s*([^\n]+)/i);
    let color = match?.[1]?.trim() || '';

    if (color) {
        color = color.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    }

    return color;
}

// =========================================
//  DAMAGE / LOSS
// =========================================

function extractPointOfImpact(text) {
    const match = text.match(/Point\s+of\s+Impact\s*:\s*(.+)/i);
    if (!match) return { raw: "", code: null, text: null };

    const raw = match[1].trim();
    const codeMatch = raw.match(/^(\d+)/);
    const code = codeMatch ? parseInt(codeMatch[1], 10) : null;
    const label = raw.replace(/^\d+\s*/, '').trim() || null;

    return { raw, code, text: label };
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
        // Noise filters — suppress labor categories, dollar amounts,
        // PDF artifacts, and overly long descriptive lines
        if (line.length > 80) continue;
        if (/^(body|paint|frame|mechanical|electrical|structural)\s+labor/i.test(line)) continue;
        if (/labor\s*(hours?|rate|amount|total)/i.test(line)) continue;
        if (/subtotal|^total\b|\bgrand\s*total/i.test(line)) continue;
        if (/^\$[\d,.]+/.test(line)) continue;
        if (/CCC\s*(ONE|Info)|estimate\s*generated|page\s*\d+\s*of/i.test(line)) continue;
        if (/^\s*[-–—]{3,}\s*$/.test(line)) continue;
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
    const NONE_SENTENCE = "No unrelated prior damage observed";

    // Look for "NO UPD VISIBLE" first — most common
    if (/NO\s+UP\s*D\s+VISIBLE/i.test(text)) return NONE_SENTENCE;
    if (/NO\s+UNRELATED\s+PRIOR\s+DAMAGE/i.test(text)) return NONE_SENTENCE;
    if (/PRIOR\s+DAMAGE\s*:\s*NONE/i.test(text)) return NONE_SENTENCE;

    // "Unrelated Prior Damage: <description>" — must capture meaningful text
    const updMatch = text.match(/(?:Unrelated\s+Prior\s+Damage|UPD)\s*:\s*([^\n]+)/i);
    if (updMatch) {
        const value = updMatch[1].trim();
        // Guard against partial-word captures (must be at least 4 chars and start with a letter)
        if (value.length >= 4 && /^[A-Za-z]/.test(value)) {
            return value;
        }
    }

    // "Prior Damage:" section
    const pdMatch = text.match(/Prior\s+Damage\s*:\s*([^\n]+)/i);
    if (pdMatch) {
        const value = pdMatch[1].trim();
        if (value.length >= 4 && /^[A-Za-z]/.test(value)) {
            return value;
        }
    }

    return NONE_SENTENCE;
}

function extractCostBreakdown(text) {
    const result = { labor: 0, parts: 0, paint: 0,
                     bodyLaborHrs: 0, paintLaborHrs: 0, mechLaborHrs: 0,
                     frameLaborHrs: 0,
                     bodyLaborRate: 0, paintLaborRate: 0, mechLaborRate: 0,
                     frameLaborRate: 0,
                     paintSupplies: 0, salesTax: 0, salesTaxRate: 0,
                     deductible: 0, subtotal: 0, netCost: 0 };

    // ── Strategy: CCC ESTIMATE TOTALS is a columnar layout ──────────
    // Categories are listed vertically, then dollar amounts appear in order
    // after a "Cost $" header. We parse by:
    //   1. Locating the ESTIMATE TOTALS section
    //   2. Identifying category order (Parts, Body Labor, Paint Labor, etc.)
    //   3. Extracting the dollar amounts in the same order from "Cost $" column
    //   4. Extracting hours + rates from "X.X hrs @ $ XX.XX /hr" patterns

    const totalsIdx = text.search(/ESTIMATE\s+TOTALS/i);
    if (totalsIdx === -1) return result;

    const section = text.substring(totalsIdx, totalsIdx + 2000);

    // Build ordered list of category labels as they appear
    const CATEGORIES = [
        { key: 'parts',         re: /^Parts$/i },
        { key: 'bodyLabor',     re: /^Body\s+Labor$/i },
        { key: 'paintLabor',    re: /^Paint\s+Labor$/i },
        { key: 'mechLabor',     re: /^Mech(?:anical)?\s+Labor$/i },
        { key: 'frameLabor',    re: /^Frame\s+Labor$/i },
        { key: 'paintSupplies', re: /^Paint\s+Supplies$/i },
        { key: 'subtotal',      re: /^Subtotal$/i },
        { key: 'salesTax',      re: /^Sales\s+Tax$/i },
        { key: 'totalCost',     re: /^Total\s+Cost\s+of\s+Repairs$/i },
        { key: 'deductible',    re: /^Deductible$/i },
        { key: 'totalAdj',      re: /^Total\s+Adjustments$/i },
        { key: 'netCost',       re: /^Net\s+Cost\s+of\s+Repairs$/i },
    ];

    const lines = section.split("\n").map(l => l.trim()).filter(Boolean);
    const orderedKeys = [];

    for (const line of lines) {
        for (const cat of CATEGORIES) {
            if (cat.re.test(line) && !orderedKeys.includes(cat.key)) {
                orderedKeys.push(cat.key);
                break;
            }
        }
    }

    // Extract dollar amounts from "Cost $" column — these are the numbers
    // appearing AFTER the "Cost $" header, in order matching the categories
    const costIdx = section.search(/Cost\s*\$/i);
    if (costIdx === -1) return result;

    const rawAfterCost = section.substring(costIdx);
    // Strip taxable base amounts from tax calculation lines.
    // CCC format: "5,552.49 @ 6.7500 %" or split across lines as "5,552.49\n@ 6.7500 %"
    // These are NOT cost items — only the resulting tax amount is.
    const afterCost = rawAfterCost.replace(/[\d,]+\.\d{2}\s*\n?\s*@\s*[\d.]+\s*%/g, '');
    // Match all dollar amounts (with optional comma separators)
    const amounts = [];
    const amountRe = /(?:^|\n)\s*([\d,]+\.\d{2})\s*(?:\n|$)/g;
    let m;
    while ((m = amountRe.exec(afterCost)) !== null) {
        amounts.push(parseFloat(m[1].replace(/,/g, "")));
    }

    // Map amounts to categories
    const costMap = {};
    for (let i = 0; i < orderedKeys.length && i < amounts.length; i++) {
        costMap[orderedKeys[i]] = amounts[i];
    }

    result.parts = costMap.parts || 0;
    result.paintSupplies = costMap.paintSupplies || 0;
    result.paint = result.paintSupplies;
    result.subtotal = costMap.subtotal || 0;
    result.deductible = costMap.deductible || 0;
    result.netCost = costMap.netCost || 0;

    // Labor totals (sum the dollar amounts for body+paint+mech+frame)
    const bodyAmt = costMap.bodyLabor || 0;
    const paintAmt = costMap.paintLabor || 0;
    const mechAmt = costMap.mechLabor || 0;
    const frameAmt = costMap.frameLabor || 0;
    result.labor = bodyAmt + paintAmt + mechAmt + frameAmt;

    // Extract hours and rates from "X.X hrs @ $ XX.XX /hr" patterns
    const hrsRateRe = /([\d.]+)\s*hrs?\s*@\s*\$\s*([\d,.]+)\s*\/hr/g;
    const hrsRatePairs = [];
    let hrm;
    while ((hrm = hrsRateRe.exec(section)) !== null) {
        hrsRatePairs.push({
            hrs: parseFloat(hrm[1]),
            rate: parseFloat(hrm[2].replace(/,/g, "")),
        });
    }

    // Map hours/rate pairs to labor categories in order:
    // body, paint, mechanical, (frame if present), paint supplies
    const laborKeys = orderedKeys.filter(k =>
        ['bodyLabor', 'paintLabor', 'mechLabor', 'frameLabor', 'paintSupplies'].includes(k));
    for (let i = 0; i < laborKeys.length && i < hrsRatePairs.length; i++) {
        const k = laborKeys[i];
        const p = hrsRatePairs[i];
        if (k === 'bodyLabor')     { result.bodyLaborHrs = p.hrs; result.bodyLaborRate = p.rate; }
        if (k === 'paintLabor')    { result.paintLaborHrs = p.hrs; result.paintLaborRate = p.rate; }
        if (k === 'mechLabor')     { result.mechLaborHrs = p.hrs; result.mechLaborRate = p.rate; }
        if (k === 'frameLabor')    { result.frameLaborHrs = p.hrs; result.frameLaborRate = p.rate; }
    }

    // Extract sales tax from the full "Sales Tax $ [base] @ [rate] % [amount]" line.
    // This targeted regex avoids matching miscellaneous T-flagged line items.
    const taxLineMatch = section.match(
        /Sales\s+Tax\s+\$?\s*([\d,]+\.?\d*)\s*@\s*([\d.]+)\s*%\s+([\d,]+\.?\d*)/i
    );
    if (taxLineMatch) {
        result.salesTax     = parseFloat(taxLineMatch[3].replace(/,/g, ''));
        result.salesTaxRate = parseFloat(taxLineMatch[2]);
    }

    return result;
}

function extractRepairLineItems(text) {
    // Parse CCC estimate line items to build damage categories.
    // CCC format: component description followed by operation type
    // e.g. "FRONT BUMPER COVER R&R", "LEFT FENDER Repair", "HEADLINER R&I"

    // Legacy categories (backward compat)
    const categories = {
        structural: [],
        bodyPanels: [],
        restraints: [],
        interior: [],
    };

    // New zone-based grouping per CCC spec
    const damageZones = {
        frontEnd: [],
        rightSide: [],
        leftSide: [],
        rear: [],
        structural: [],
        restraints: [],
        wheels: [],
        mechanical: [],
    };

    // Structural-flagged parts (CCC marks with "s" after part price)
    const structuralFlagged = [];

    // ── Keyword regexes for legacy categorization ────────────────────────
    const STRUCTURAL_RE = /\b(frame|rail|apron|pillar|rocker|unibody|subframe|cross\s*member|firewall|floor\s*pan|strut\s*tower|radiator\s*support|aperture)\b/i;
    const BODY_RE = /\b(bumper|fender|hood|door|quarter\s*panel|decklid|trunk|tailgate|roof|grille|header\s*panel|fascia|valance|bed\s*panel|lamp|headl|taill|mirror|molding|handle|hinge|latch)\b/i;
    const RESTRAINT_RE = /\b(air\s*bag|airbag|srs|restraint|seat\s*belt|impact\s*sensor|clockspring|diagnostic)\b/i;
    const INTERIOR_RE = /\b(seat\s*cover|headliner|trim\s*panel|carpet|console|dash|instrument|door\s*panel|garnish|pillar\s*trim|visor|glove|armrest)\b/i;

    // ── CCC section header → zone mapping ────────────────────────────────
    const SECTION_ZONE_MAP = [
        { re: /\bFRONT\s+BUMPER\b/i,    zone: 'frontEnd' },
        { re: /\bGRILLE\b/i,            zone: 'frontEnd' },
        { re: /\bFRONT\s+LAMPS?\b/i,    zone: 'frontEnd' },
        { re: /\bHEADLAMP\b/i,          zone: 'frontEnd' },
        { re: /\bRADIATOR\s+SUPPORT\b/i,zone: 'frontEnd' },
        { re: /\bFRONT\s+PANELS?\b/i,   zone: 'frontEnd' },
        { re: /\bHOOD\b/i,              zone: 'frontEnd' },
        { re: /\bCOOLING\b/i,           zone: 'frontEnd' },
        { re: /\bREAR\s+BUMPER\b/i,     zone: 'rear' },
        { re: /\bTRUNK\s+LID\b/i,       zone: 'rear' },
        { re: /\bLIFT\s*GATE\b/i,       zone: 'rear' },
        { re: /\bDECKLID\b/i,           zone: 'rear' },
        { re: /\bREAR\s+BODY\b/i,       zone: 'rear' },
        { re: /\bREAR\s+LAMPS?\b/i,     zone: 'rear' },
        { re: /\bTAIL\s*LAMP\b/i,       zone: 'rear' },
        { re: /\bTAILGATE\b/i,          zone: 'rear' },
        { re: /\bFRAME\b/i,             zone: 'structural' },
        { re: /\bRAIL\b/i,              zone: 'structural' },
        { re: /\bUNIBODY\b/i,           zone: 'structural' },
        { re: /\bSTRUCTURAL\b/i,        zone: 'structural' },
        { re: /\bAIR\s*BAG\b/i,         zone: 'restraints' },
        { re: /\bSRS\b/i,               zone: 'restraints' },
        { re: /\bRESTRAINT\b/i,         zone: 'restraints' },
        { re: /\bWHEEL/i,               zone: 'wheels' },
        { re: /\bTIRE/i,                zone: 'wheels' },
        { re: /\bHUB\b/i,               zone: 'wheels' },
        { re: /\bSUSPENSION\b/i,        zone: 'wheels' },
        { re: /\bMECHANICAL\b/i,        zone: 'mechanical' },
        { re: /\bENGINE\b/i,            zone: 'mechanical' },
        { re: /\bTRANSMISSION\b/i,      zone: 'mechanical' },
        { re: /\bA\/C\b/i,              zone: 'mechanical' },
        { re: /\bAIR\s+CONDITIONER\b/i, zone: 'mechanical' },
        { re: /\bHEATER\b/i,            zone: 'mechanical' },
        { re: /\bFUEL\s+SYSTEM\b/i,     zone: 'mechanical' },
        { re: /\bELECTRICAL\b/i,        zone: 'mechanical' },
    ];

    // Sections to exclude from damage narratives
    const EXCLUDE_RE = /\b(VEHICLE\s+DIAGNOSTICS|MISCELLANEOUS\s+OPERATIONS)\b/i;

    // ── Parse lines ──────────────────────────────────────────────────────
    const opPattern = /\b(R&R|R&I|Repair|Replace|Refinish|Blend|Overhaul|Section|Remove|Install|Repl|Rpr|Sect|O\/H|Blnd)\b/i;
    const allLines = text.split("\n").map(l => l.trim());

    // Track current section zone from CCC section headers
    let currentZone = null;

    for (const line of allLines) {
        // Skip boilerplate
        if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/i.test(line)) continue;
        if (/^Page\s+\d/i.test(line)) continue;
        if (/Subtotal|Total|Labor\s+Type/i.test(line)) continue;
        if (line.length < 3) continue;

        // Detect CCC section headers (all-caps, no dollar amounts, no operation codes)
        const isHeader = /^[A-Z][A-Z\s,/&-]+$/.test(line) && !/\$/.test(line) && !opPattern.test(line) && line.length < 60;
        if (isHeader) {
            // Check for exclusions
            if (EXCLUDE_RE.test(line)) {
                currentZone = null;
                continue;
            }
            // Try to map header to a zone
            for (const { re, zone } of SECTION_ZONE_MAP) {
                if (re.test(line)) {
                    currentZone = zone;
                    break;
                }
            }
            // Side-specific headers: FENDER, DOOR, QUARTER PANEL, PILLAR, ROCKER
            if (/\bFENDER\b/i.test(line)) {
                // Fender special handling: default to frontEnd (will be refined by RT/LT on items)
                currentZone = 'frontEnd';
            }
            if (/\bDOOR\b/i.test(line) || /\bQUARTER\s*PANEL\b/i.test(line) || /\bPILLAR\b/i.test(line) || /\bROCKER\b/i.test(line)) {
                // Side determined by RT/LT prefix on individual items below
                if (!currentZone || currentZone === 'frontEnd') currentZone = null; // let items decide
            }
            continue;
        }

        // Only process lines with repair operations
        if (!opPattern.test(line)) continue;

        // Detect structural flag: "$XXX.XX s" pattern
        if (/\$[\d,.]+\s*s\b/.test(line)) {
            const flagDesc = line.replace(/^\d+\s+/, '').replace(/\$[\d,.]+\s*s?\b/g, '').replace(/[\d.]+\s*hrs?/ig, '').trim();
            if (flagDesc.length >= 5) structuralFlagged.push(flagDesc);
        }

        // Clean the line: remove leading line numbers, pricing columns
        let desc = line.replace(/^\d+\s+/, '').replace(/\$[\d,.]+\s*s?\b/g, '').replace(/[\d.]+\s*hrs?/ig, '').trim();
        if (desc.length < 5) continue;

        // ── Legacy categorization ────────────────────────────────────────
        if (STRUCTURAL_RE.test(desc)) {
            categories.structural.push(desc);
        } else if (RESTRAINT_RE.test(desc)) {
            categories.restraints.push(desc);
        } else if (INTERIOR_RE.test(desc)) {
            categories.interior.push(desc);
        } else if (BODY_RE.test(desc)) {
            categories.bodyPanels.push(desc);
        }

        // ── Zone-based categorization ────────────────────────────────────
        // Determine zone: use RT/LT prefix detection first, then current section, then keyword fallback
        let zone = currentZone;

        // RT/LT prefix override for side determination
        if (/\bRT\b/i.test(desc) || /\bRIGHT\b/i.test(desc)) {
            zone = 'rightSide';
        } else if (/\bLT\b/i.test(desc) || /\bLEFT\b/i.test(desc)) {
            zone = 'leftSide';
        }

        // If still no zone, fall back to keyword matching
        if (!zone) {
            for (const { re, zone: z } of SECTION_ZONE_MAP) {
                if (re.test(desc)) {
                    zone = z;
                    break;
                }
            }
        }

        // If still no zone, try legacy keyword categories to pick a zone
        if (!zone) {
            if (STRUCTURAL_RE.test(desc)) zone = 'structural';
            else if (RESTRAINT_RE.test(desc)) zone = 'restraints';
            else if (INTERIOR_RE.test(desc)) zone = 'mechanical'; // interior → mechanical slot
            else if (BODY_RE.test(desc)) zone = 'frontEnd'; // generic body → frontEnd default
        }

        if (zone && damageZones[zone]) {
            damageZones[zone].push(desc);
        }
    }

    return {
        // Legacy (unchanged for backward compat)
        structural: categories.structural,
        bodyPanels: categories.bodyPanels,
        restraints: categories.restraints,
        interior:   categories.interior,
        // New zone-based grouping
        damageZones,
        // Structural-flagged parts
        structuralFlagged,
    };
}

function extractAdjuster(text) {
    // Line-anchored to avoid matching disclaimer text at bottom of estimate
    const match = text.match(/^Adjuster:\s*(.+)$/m);
    let adjuster = match?.[1]?.trim() || '';

    // Reject if matched disclaimer text — a real name will never exceed 6 words
    if (adjuster.split(/\s+/).filter(Boolean).length > 6) {
        adjuster = '';
    }

    return adjuster;
}

function extractShopName(text) {
    // Line-anchored regex to avoid matching disclaimer text
    const writtenBy = text.match(/^Written\s+By:\s*(.+)$/m);
    if (writtenBy) return writtenBy[1].trim();

    const repairFac = text.match(/Repair\s+Facility\s*:\s*\n?\s*([^\n]+)/i);
    if (repairFac) {
        const val = repairFac[1].trim();
        // Skip if it looks like an address
        if (!/^\d/.test(val)) return val;
    }

    return "";
}

function extractWorkfileId(text) {
    // CCC workfile ID / job number
    const match = text.match(/(?:Job\s*Number|Workfile\s*(?:ID|#)|File\s*#)\s*:?\s*([A-Z0-9-]+)/i);
    return match ? match[1].trim() : "";
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
