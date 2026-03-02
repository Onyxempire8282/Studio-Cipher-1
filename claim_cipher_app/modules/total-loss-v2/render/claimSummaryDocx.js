// Claim Summary DOCX Generator — Template Fill Approach
// Loads CLAIM_SUMMARY_TEMPLATE.docx (navy/gold design with {{TOKEN}} placeholders),
// builds a token map from state data, fills tokens via JSZip, returns Blob.
//
// Same public API: generateClaimSummaryDocx(state, userProfile) → Promise<Blob>
// Requires JSZip loaded globally (window.JSZip).

import { fillTokensInXml } from './bcifDocxFiller.js';

const TEMPLATE_PATH = 'forms/summaries/CLAIM_SUMMARY_TEMPLATE.docx';

// =========================================
//  OPTION CODE LABELS (for vehicle options)
// =========================================

const OPTION_LABELS = {
    "PS":"Power Steering","PB":"Power Brakes","PW":"Power Windows","PL":"Power Locks",
    "SP":"Power Driver Seat","PC":"Power Passenger Seat","PA":"Power Antenna",
    "PM":"Power Mirrors","PT":"Power Trunk/Gate","PP":"Power Adj Pedals",
    "PD":"Power Sliding Door","DP":"Dual Pwr Slide Doors","AC":"Air Conditioning",
    "DA":"Dual Air Cond","CL":"Climate Control","RD":"Rear Defogger",
    "IW":"Intermittent Wipers","TW":"Tilt Wheel","TL":"Telescopic Wheel",
    "CC":"Cruise Control","KE":"Keyless Entry","CN":"Console/Storage",
    "CO":"Overhead Console","EC":"Entertainment Ctr","NV":"Navigation System",
    "C2":"Communications Sys","HU":"Heads-Up Display","WT":"Wood Interior/Trim",
    "EI":"Electronic Instrum","IB":"Onboard Computer","MC":"Message Center",
    "MM":"Memory Package","RJ":"Remote Start","HL":"Homelink","DE":"Deluxe Equipment",
    "CS":"Cloth Seats","LS":"Leather Seats","RL":"Reclining Seats","BS":"Bucket Seats",
    "SH":"Heated Seats","RH":"Rear Heated Seats","3S":"3rd Row Seat",
    "3P":"Power 3rd Seat","R3":"Retractable Seats","VS":"Ventilated Seats",
    "AM":"AM Radio","FM":"FM Radio","ST":"Stereo","CA":"Cassette","SE":"Search/Seek",
    "CD":"CD Player","SK":"CD Changer","UR":"Premium Radio","XM":"Satellite Radio",
    "TQ":"Steering Whl Ctrls","M3":"Aux Audio Input","EQ":"Equalizer",
    "AW":"Aluminum/Alloy","CJ":"Chrome Wheels","W2":'20" Wheels',
    "DC":"Deluxe Whl Covers","FC":"Full Whl Covers","SA":"Spoke Aluminum",
    "SY":"Styled Steel","WW":"Wire Wheels","WC":"Wire Whl Covers",
    "RW":"Rally Wheels","KW":"Locking Wheels","LC":"Locking Whl Covers",
    "EG":"Elec Glass Roof","ES":"Elec Steel Roof","OR":"Skyview Roof",
    "SD":"Dual Sunroof","MS":"Manual Steel Roof","MG":"Manual Glass Roof",
    "FR":"Flip Roof","TT":"T-Top","GT":"Glass T-Top","VP":"Power Convert Roof",
    "RM":"Detachable Roof","VR":"Vinyl Covered Roof","RF":"Cabriolet Roof",
    "LR":"Landau Roof","LP":"Padded Landau Roof","PV":"Padded Vinyl Roof","HT":"Hard Top",
    "AG":"Driver Air Bag","RG":"Passenger Air Bag","XG":"Front Side Air Bags",
    "ZG":"Rear Side Air Bags","DG":"Head/Curtain Bags","TD":"Alarm/Anti-Theft",
    "VZ":"Night Vision","IC":"Adaptive Cruise","PJ":"Parking Sensors",
    "PX":"Parking Assist","AB":"Anti-Lock Brakes","A2":"ABS (alt)",
    "DB":"4-Whl Disc Brakes","RB":"Roll Bar","TX":"Traction Control",
    "T1":"Stability Control","AL":"Auto Level","SV":"Surround View/360",
    "LW":"Lane Departure","RR":"Roof/Luggage Rack","WG":"Woodgrain",
    "WP":"Rear Wndw Wiper","2T":"Two-Tone Paint","HP":"Three Stage Paint",
    "IP":"Clearcoat Paint","MP":"Metallic Paint","SL":"Rear Spoiler",
    "FL":"Fog Lamps","TG":"Tinted Glass","DT":"Privacy Glass",
    "BN":"Body Side Moldings","DM":"Dual Mirrors","HM":"Heated Mirrors",
    "HV":"Headlamp Washers","MX":"Signal Integ Mirrors","XE":"Xenon Headlamps",
    "TP":"Towing Package","BL":"Bedliner","BY":"Spray-On Bedliner",
    "SAFETY_BC":"Backup Camera","SAFETY_BD":"Blind Spot Monitor",
};

// =========================================
//  TEMPLATE FETCH + CACHE
// =========================================

let templateCache = null;

async function fetchTemplate() {
    if (templateCache) return templateCache;
    const url = new URL(TEMPLATE_PATH, window.location.href).href;
    console.log('[ClaimSummary] Fetching template:', url);
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch Claim Summary template: ${response.status} ${response.statusText}`);
    }
    templateCache = await response.arrayBuffer();
    console.log('[ClaimSummary] Template loaded, size:', templateCache.byteLength);
    return templateCache;
}

// =========================================
//  FORMAT HELPERS
// =========================================

function _toNumber(value) {
    if (value == null || value === '') return 0;
    const num = Number(String(value).replace(/[$,]/g, ''));
    return isNaN(num) ? 0 : num;
}

function _formatCurrency(value) {
    const num = Number(value);
    if (isNaN(num)) return '';
    return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function _formatCommas(value) {
    const num = Number(value);
    if (isNaN(num)) return String(value);
    return Math.round(num).toLocaleString('en-US');
}

// =========================================
//  TOKEN MAP BUILDER
// =========================================

function buildTokenMap(state, userProfile) {
    const payload = state.bcifPayload    || {};
    const parsed  = state.parsedEstimate || {};

    // POI — strip leading numeric code
    const poiRaw   = parsed.pointOfImpact || '';
    const poiCode  = parseInt(poiRaw, 10);
    const poiLabel = poiRaw.replace(/^\d+\s*/, '').trim();

    // Total loss detection — POI 15 OR cost-to-ACV ratio >= 75%
    const estimateTotal = _toNumber(parsed.estimateTotal);
    const acv = _toNumber(parsed.acv);
    const isTotalLoss = poiCode === 15
        || (acv > 0 && estimateTotal > 0 && (estimateTotal / acv) >= 0.75);

    // User profile
    const fullName      = (userProfile.fullName      || '').trim();
    const licenseNumber = (userProfile.licenseNumber || '').trim();
    const businessName  = (userProfile.businessName  || '').trim();

    // ─── Claim / Insured fields ──────────────────────────────────────────────
    const claimNumber = payload.claim?.claimNumber || parsed.claimNumber || '';
    const dateOfLoss  = payload.claim?.dateOfLoss  || parsed.dateOfLoss  || '';
    const lossType    = payload.claim?.lossType    || parsed.lossType    || '';
    const carrier     = payload.claim?.carrier     || parsed.carrierName || '';
    const ownerName   = payload.claim?.ownerName   || parsed.ownerName  || '';
    const ownerPhone  = payload.claim?.ownerPhone  || parsed.ownerPhone || '';
    const lossLoc     = payload.claim?.lossLocation || '';

    // Report ID — use state-level if available, otherwise generate
    const reportId = state.reportId || '';

    // ─── Vehicle fields ──────────────────────────────────────────────────────
    const vehicle = [payload.vehicle?.year, payload.vehicle?.make, payload.vehicle?.model]
        .filter(Boolean).join(' ');

    const rawOdo = payload.vehicle?.odometer || parsed.mileage || '';
    const odoNum = Number(String(rawOdo).replace(/,/g, ''));
    const odometer = (odoNum > 0) ? _formatCommas(odoNum) + ' miles' : 'Not Available';

    const engineSize = parsed.engineSize || '';
    const cylinders  = (parsed.cylinders || '').replace('CYL_', '');
    const engineDesc = payload.vehicle?.engine
        || [cylinders ? cylinders + '-Cyl' : '', engineSize].filter(Boolean).join(' ')
        || 'N/A';

    const transRaw = parsed.transmission || '';
    const TRANS_LABELS = {
        'TRANS_AUTO': 'Automatic', 'TRANS_OD': 'Overdrive', 'TRANS_S3': '3-Speed Manual',
        'TRANS_S4': '4-Speed Manual', 'TRANS_S5': '5-Speed Manual', 'TRANS_S6': '6-Speed Manual',
        'TRANS_4W': '4WD/AWD', 'TRANS_PO': 'Power', 'TRANS_UNLISTED': 'Not Listed on Estimate',
    };
    const transmission = TRANS_LABELS[transRaw] || transRaw || 'N/A';

    const descLine = parsed._vehicleDescLine || '';
    const colorMatch = descLine.match(/\b(BLACK|WHITE|SILVER|GRAY|GREY|RED|BLUE|GREEN|BROWN|GOLD|BEIGE|TAN|ORANGE|YELLOW|PURPLE|MAROON|BURGUNDY|CHARCOAL|PEARL|BRONZE|COPPER|CREAM|IVORY)\b/i);
    const extColor = colorMatch
        ? colorMatch[1].charAt(0).toUpperCase() + colorMatch[1].slice(1).toLowerCase()
        : 'N/A';

    const overallCondition = isTotalLoss ? 'Total Loss' : 'Repairable';

    // ─── Loss Description ────────────────────────────────────────────────────
    const vehicleRef = vehicle ? `The ${vehicle}` : 'The vehicle';
    const lossTypeLower = (lossType || 'collision').toLowerCase();
    const lineItems = parsed.repairLineItems || {};

    const damageCats = [];
    if (lineItems.structural?.length > 0) damageCats.push('structural');
    if (lineItems.bodyPanels?.length > 0) damageCats.push('body panel and cosmetic');
    if (lineItems.restraints?.length > 0) damageCats.push('restraint system');
    if (lineItems.interior?.length > 0) damageCats.push('interior');
    const damageDesc = damageCats.length > 0 ? damageCats.join(', ') : 'the documented areas';

    const poiFragment = poiLabel
        ? `a ${poiLabel.toLowerCase()} (CCC Position ${poiCode || 'N/A'})`
        : 'the reported loss';

    let para1 = `${vehicleRef} sustained ${lossTypeLower} damage consistent with ${poiFragment}.`;

    if (isTotalLoss) {
        para1 += ' Based on documented damage severity and repair cost analysis, the vehicle has been designated a total loss.';
    } else {
        const shopName = parsed.shopName || '';
        const workfileId = parsed.workfileId || '';
        if (shopName || workfileId) {
            para1 += ` The preliminary estimate`;
            if (shopName) para1 += ` prepared by ${shopName}`;
            if (workfileId) para1 += ` (Workfile ID: ${workfileId})`;
            para1 += ` documents repair procedures addressing ${damageDesc}`;
            para1 += poiLabel ? ` to the ${poiLabel.toLowerCase()} of the vehicle.` : '.';
        }
    }

    let para2 = '';
    if (isTotalLoss) {
        para2 = 'The estimated cost of repairs exceeds the economic repair threshold relative to the vehicle\'s actual cash value.';
        para2 += ' This claim will proceed under total loss settlement guidelines.';
    } else {
        para2 = 'Based on current inspection and estimate documentation, the vehicle is repairable within economic guidelines.';
        para2 += ' A supplement may be required following teardown.';
        const repairDays = parsed.repairDays || 0;
        if (repairDays > 0) {
            para2 += ` Estimated repair duration is approximately ${repairDays} day${repairDays !== 1 ? 's' : ''}.`;
        }
    }

    // ─── Damage Assessment ───────────────────────────────────────────────────
    const hasLineItems = Object.values(lineItems).some(arr => arr?.length > 0);

    const categories = {
        structural: [],
        bodyPanels: [],
        restraints: [],
        interior: [],
    };

    if (hasLineItems) {
        if (lineItems.structural?.length > 0)
            categories.structural = lineItems.structural.map(s => s.replace(/\s+/g, ' ').trim());
        if (lineItems.bodyPanels?.length > 0)
            categories.bodyPanels = lineItems.bodyPanels.map(s => s.replace(/\s+/g, ' ').trim());
        if (lineItems.restraints?.length > 0)
            categories.restraints = lineItems.restraints.map(s => s.replace(/\s+/g, ' ').trim());
        if (lineItems.interior?.length > 0)
            categories.interior = lineItems.interior.map(s => s.replace(/\s+/g, ' ').trim());
    } else {
        const label = (poiLabel || '').toUpperCase();
        if (/FRAME|RAIL|APRON|PILLAR|UNIBODY|SUBFRAME|CROSS.?MEMBER|STRUCTURAL/i.test(label))
            categories.structural.push(poiLabel);
        if (/BUMPER|FENDER|HOOD|DOOR|QUARTER|PANEL|DECKLID|TRUNK|TAILGATE|ROOF|GRILLE|HEADER/i.test(label))
            categories.bodyPanels.push(poiLabel);
        if (/AIRBAG|AIR.?BAG|SRS|RESTRAINT|SEAT.?BELT/i.test(label))
            categories.restraints.push(poiLabel);
        if (/DASH|CONSOLE|HEADLINER|CARPET|TRIM|SEAT|INTERIOR/i.test(label))
            categories.interior.push(poiLabel);

        const hasAny = Object.values(categories).some(arr => arr.length > 0);
        if (!hasAny && poiLabel) categories.bodyPanels.push(poiLabel);
    }

    function formatCatItems(items) {
        if (items.length === 0) return 'No damage documented';
        return items.slice(0, 6).join('. ') + (items.length > 6 ? '...' : '');
    }

    // Zone-aware damage narrative builder
    const ZONE_LABELS = {
        frontEnd: 'Front End', rightSide: 'Right Side', leftSide: 'Left Side',
        rear: 'Rear', structural: 'Structural', restraints: 'Restraints',
        wheels: 'Wheels/Suspension', mechanical: 'Mechanical',
    };

    const zones = lineItems.damageZones || {};
    const structFlags = parsed.structuralFlagged || [];
    const hasZoneData = Object.values(zones).some(arr => arr?.length > 0);

    function buildZoneNarrative(zoneKeys) {
        const entries = [];
        for (const zk of zoneKeys) {
            const items = zones[zk];
            if (items && items.length > 0) {
                const cleaned = items.map(s => s.replace(/\s+/g, ' ').trim());
                entries.push(`${ZONE_LABELS[zk]}: ${cleaned.slice(0, 5).join(', ')}${cleaned.length > 5 ? '...' : ''}`);
            }
        }
        return entries.length > 0 ? entries.join('. ') + '.' : null;
    }

    // ─── Repair Cost Summary ─────────────────────────────────────────────────
    const partsTotal   = _toNumber(parsed.partsTotal);
    const laborTotal   = _toNumber(parsed.laborTotal);
    const paintTotal   = _toNumber(parsed.paintTotal);
    const total        = _toNumber(parsed.estimateTotal);
    const deductible   = _toNumber(parsed.deductible);
    const bodyHrs      = _toNumber(parsed.bodyLaborHrs);
    const bodyRate     = _toNumber(parsed.bodyLaborRate);
    const paintHrs     = _toNumber(parsed.paintLaborHrs);
    const paintRate    = _toNumber(parsed.paintLaborRate);
    const mechHrs      = _toNumber(parsed.mechLaborHrs);
    const mechRate     = _toNumber(parsed.mechLaborRate);
    const paintSupp    = _toNumber(parsed.paintSupplies);
    const salesTax     = _toNumber(parsed.salesTax);

    function laborLabel(prefix, hrs, rate) {
        if (hrs > 0 && rate > 0) {
            return `${prefix} (${hrs} hrs @ $${rate.toFixed(2)}/hr)`;
        }
        return prefix;
    }

    const hasLaborBreakdown = bodyHrs > 0 || paintHrs > 0 || mechHrs > 0;
    const computedSubtotal = partsTotal + laborTotal + (paintSupp || paintTotal);

    // Tax
    const taxAmount = salesTax > 0 ? salesTax : (total > computedSubtotal ? total - computedSubtotal : 0);

    // Sales tax label
    let salesTaxLabel = 'Sales Tax';
    if (parsed.salesTaxRate) {
        salesTaxLabel = `Sales Tax (${parsed.salesTaxRate}%)`;
    } else if (taxAmount > 0 && computedSubtotal > 0) {
        const rate = ((taxAmount / computedSubtotal) * 100).toFixed(1);
        salesTaxLabel = `Sales Tax (${rate}%)`;
    }

    // ─── Vehicle Condition ───────────────────────────────────────────────────
    const cond = payload.condition || {};
    const ratingLabels = ['Below Average', 'Normal', 'Above Average', 'Exceptional'];
    const ratingNotes = {
        0: 'Below average for vehicle age and mileage',
        1: 'Consistent with vehicle age and mileage',
        2: 'Above average for vehicle age and mileage',
        3: 'Exceptional condition for vehicle age',
    };

    function condRating(comp) {
        if (!comp || comp.rating === null || comp.rating === undefined) return '';
        return ratingLabels[comp.rating] || `Rating ${comp.rating}`;
    }
    function condNotes(comp) {
        if (!comp || comp.rating === null || comp.rating === undefined) return '';
        return comp.comment || ratingNotes[comp.rating] || '';
    }

    // ─── Prior Damage ────────────────────────────────────────────────────────
    const pd = (parsed.priorDamage || '').trim();
    const pdNormalized = pd.toUpperCase();
    const pdIsNone = !pd
        || pdNormalized === 'NO UPD VISIBLE'
        || pdNormalized === 'NONE'
        || pdNormalized === 'N/A'
        || pd.length < 4;

    const priorDamageText = pdIsNone
        ? 'No unrelated prior damage was observed during inspection.'
        : 'Prior damage noted: ' + pd + '.';

    // ─── Important Notice ────────────────────────────────────────────────────
    const noticeText = isTotalLoss
        ? 'This valuation report is based on the vehicle\'s condition, equipment, ' +
          'and mileage at the time of loss. The actual cash value determination is ' +
          'subject to review and may be adjusted based on additional documentation ' +
          'or comparable vehicle analysis. Settlement terms are subject to policy ' +
          'provisions and applicable state regulations.'
        : 'This estimate is preliminary and does not represent a final repair cost. ' +
          'Actual repair costs may change following vehicle teardown and supplemental ' +
          'inspection. Additional hidden or structural damage not visible at the time ' +
          'of initial appraisal may result in supplemental claims. Final authorization ' +
          'and payment remain subject to carrier review and approval of any supplement requests.';

    // ─── Certification ───────────────────────────────────────────────────────
    const certPara1 = 'This report has been prepared based on a physical inspection of the referenced vehicle ' +
        'and a thorough review of the associated CCC estimate documentation. All findings contained herein ' +
        'are presented in accordance with accepted industry standards for vehicle damage appraisal and are ' +
        'intended to provide an accurate and objective assessment of the vehicle\'s condition at the time of inspection.';

    const certPara2 = 'The appraiser certifies that the information provided in this report is true and accurate to ' +
        'the best of their knowledge and professional judgment. This document does not constitute a guarantee ' +
        'of repair costs and is subject to revision upon supplemental inspection or teardown findings.';

    // ─── Signature ───────────────────────────────────────────────────────────
    const sigName = fullName || payload.claim?.writer || '';
    const sigText = sigName ? `/s/ ${sigName}` : '';
    const today = new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
    });

    // ─── Build Token Map ─────────────────────────────────────────────────────
    const tokens = {
        // Title
        TITLE:    isTotalLoss ? 'TOTAL LOSS EVALUATION' : 'VEHICLE DAMAGE ASSESSMENT',
        SUBTITLE: [businessName, 'Claim Summary Report', isTotalLoss ? 'Total Loss' : 'Repairable Vehicle']
            .filter(Boolean).join('  |  '),

        // Claim / Insured
        CLAIM_NUMBER:  claimNumber,
        DATE_OF_LOSS:  dateOfLoss,
        LOSS_TYPE:     lossType,
        CARRIER:       carrier,
        OWNER_NAME:    ownerName,
        OWNER_PHONE:   ownerPhone,
        LOSS_LOCATION: lossLoc,
        REPORT_ID:     reportId,

        // Vehicle
        VEHICLE:           vehicle || 'N/A',
        VIN:               payload.vehicle?.vin || parsed.vin || 'N/A',
        ODOMETER:          odometer,
        ENGINE:            engineDesc,
        TRANSMISSION:      transmission,
        EXTERIOR_COLOR:    extColor,
        OVERALL_CONDITION: overallCondition,

        // Loss Description
        LOSS_PARA_1: para1,
        LOSS_PARA_2: para2,

        // Damage Assessment — prefer zone narratives, fall back to legacy
        DAMAGE_STRUCTURAL:  hasZoneData
            ? (buildZoneNarrative(['structural'])
                || (structFlags.length > 0 ? 'Structural components flagged: ' + structFlags.slice(0, 4).join(', ') + '.' : formatCatItems(categories.structural)))
            : formatCatItems(categories.structural),
        DAMAGE_BODY_PANELS: hasZoneData
            ? (buildZoneNarrative(['frontEnd', 'rightSide', 'leftSide', 'rear']) || formatCatItems(categories.bodyPanels))
            : formatCatItems(categories.bodyPanels),
        DAMAGE_RESTRAINTS:  hasZoneData
            ? (buildZoneNarrative(['restraints']) || formatCatItems(categories.restraints))
            : formatCatItems(categories.restraints),
        DAMAGE_INTERIOR:    hasZoneData
            ? (buildZoneNarrative(['wheels', 'mechanical']) || formatCatItems(categories.interior))
            : formatCatItems(categories.interior),

        // Repair Cost Summary
        PARTS_AMOUNT:          partsTotal > 0 ? _formatCurrency(partsTotal) : '',
        BODY_LABOR_LABEL:      hasLaborBreakdown && bodyHrs > 0 ? laborLabel('Body Labor', bodyHrs, bodyRate) : 'Body Labor',
        BODY_LABOR_AMOUNT:     hasLaborBreakdown && bodyHrs > 0 ? _formatCurrency(bodyHrs * bodyRate) : '',
        PAINT_LABOR_LABEL:     hasLaborBreakdown && paintHrs > 0 ? laborLabel('Paint Labor', paintHrs, paintRate) : 'Paint Labor',
        PAINT_LABOR_AMOUNT:    hasLaborBreakdown && paintHrs > 0 ? _formatCurrency(paintHrs * paintRate) : '',
        MECH_LABOR_LABEL:      hasLaborBreakdown && mechHrs > 0 ? laborLabel('Mechanical Labor', mechHrs, mechRate) : 'Mechanical Labor',
        MECH_LABOR_AMOUNT:     hasLaborBreakdown && mechHrs > 0 ? _formatCurrency(mechHrs * mechRate) : '',
        PAINT_SUPPLIES_LABEL:  paintSupp > 0 ? 'Paint Supplies' : 'Paint Supplies',
        PAINT_SUPPLIES_AMOUNT: paintSupp > 0 ? _formatCurrency(paintSupp) : '',
        SUBTOTAL_AMOUNT:       computedSubtotal > 0 && computedSubtotal !== total ? _formatCurrency(computedSubtotal) : '',
        SALES_TAX_LABEL:       salesTaxLabel,
        SALES_TAX_AMOUNT:      taxAmount > 0 ? _formatCurrency(taxAmount) : '',
        TOTAL_AMOUNT:          total > 0 ? _formatCurrency(total) : '',
        DEDUCTIBLE_AMOUNT:     deductible > 0 ? _formatCurrency(deductible) : '',
        NET_COST_AMOUNT:       deductible > 0 ? _formatCurrency(total - deductible) : '',

        // Vehicle Condition
        COND_PAINT_RATING:       condRating(cond.paint),
        COND_PAINT_NOTES:        condNotes(cond.paint),
        COND_SHEET_METAL_RATING: condRating(cond.sheetMetal),
        COND_SHEET_METAL_NOTES:  condNotes(cond.sheetMetal),
        COND_GLASS_RATING:       condRating(cond.glass),
        COND_GLASS_NOTES:        condNotes(cond.glass),
        COND_TRIM_RATING:        condRating(cond.trim),
        COND_TRIM_NOTES:         condNotes(cond.trim),
        COND_SEATS_RATING:       condRating(cond.seats),
        COND_SEATS_NOTES:        condNotes(cond.seats),
        COND_CARPET_RATING:      condRating(cond.carpet),
        COND_CARPET_NOTES:       condNotes(cond.carpet),
        COND_ENGINE_RATING:      condRating(cond.engine),
        COND_ENGINE_NOTES:       condNotes(cond.engine),
        COND_TRANS_RATING:       condRating(cond.transmission),
        COND_TRANS_NOTES:        condNotes(cond.transmission),

        // Prior Damage
        PRIOR_DAMAGE_TEXT: priorDamageText,

        // Recalls
        RECALL_HEADER: (state.recalls?.length > 0)
            ? `NHTSA has issued ${state.recalls.length} safety-related recall(s) that may apply to this vehicle:`
            : 'No open recall notices were identified for this vehicle at the time of inspection.',
        RECALL_1_ID:   state.recalls?.[0]?.id   || '',
        RECALL_1_DESC: state.recalls?.[0]?.desc  || '',
        RECALL_2_ID:   state.recalls?.[1]?.id   || '',
        RECALL_2_DESC: state.recalls?.[1]?.desc  || '',

        // Certification
        CERT_PARA_1: certPara1,
        CERT_PARA_2: certPara2,

        // Important Notice
        NOTICE_TEXT: noticeText,

        // Signature
        SIGNATURE_TEXT:  sigText,
        SIGNATURE_DATE:  today,
        APPRAISER_NAME:  sigName,
        LICENSE_NUMBER:  licenseNumber || 'N/A',
    };

    return tokens;
}

// =========================================
//  MAIN EXPORT
// =========================================

export async function generateClaimSummaryDocx(state, userProfile = {}) {
    if (typeof window.JSZip === 'undefined') {
        throw new Error('JSZip is not loaded. Add JSZip CDN to the page.');
    }

    const tokenMap = buildTokenMap(state, userProfile);
    const templateBytes = await fetchTemplate();

    // Open template as zip
    const zip = await JSZip.loadAsync(templateBytes);

    // Extract and fill word/document.xml
    const docXmlEntry = zip.file('word/document.xml');
    if (!docXmlEntry) {
        throw new Error('Template missing word/document.xml');
    }

    const docXml = await docXmlEntry.async('string');
    const { xml: filledXml, fillCount } = fillTokensInXml(docXml, tokenMap);

    console.log(`[ClaimSummary] Filled ${fillCount} tokens in word/document.xml`);

    // Replace the document XML in the zip
    zip.file('word/document.xml', filledXml);

    // Generate the filled DOCX as a Blob
    const blob = await zip.generateAsync({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
    });

    console.log('[ClaimSummary] Generated DOCX, size:', blob.size);
    return blob;
}
