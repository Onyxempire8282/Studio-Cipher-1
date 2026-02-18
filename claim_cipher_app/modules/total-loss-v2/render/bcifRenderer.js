// Converts bcifPayload into a flat token map matching every {{TOKEN}}
// in BCIF_AUTOMATION_TEMPLATE_v4.docx (310 tokens).
//
// Checkbox tokens → "☑" (U+2611) or "☐" (U+2610)
// Text tokens     → string value or ""

function checkbox(isSelected) {
    return isSelected ? "\u2611" : "\u2610";
}

// =========================================
//  ALL 196 OPTION CODES from template
// =========================================

const OPTION_CODES = [
    "2P","2T","3P","3S","5P",
    "A2","AB","AC","AG","AL","AM","AR","AW",
    "B2","B4","B6","BG","BL","BN","BS","BY",
    "C2","CA","CC","CD","CJ","CL","CN","CO","CP","CS",
    "DA","DB","DC","DE","DG","DM","DP","DT",
    "EC","EG","EI","EM","EQ","ES",
    "FC","FL","FM","FR",
    "GG","GT",
    "HL","HM","HP","HT","HU","HV",
    "IB","IC","IP","IW",
    "KE","KW",
    "LC","LP","LR","LS","LW",
    "M3","MC","MG","MM","MP","MS","MX",
    "NV",
    "OR",
    "PA","PB","PC","PD","PG","PJ","PL","PM","PP","PS","PT","PV","PW","PX",
    "R3","RB","RD","RF","RG","RH","RJ","RL","RM","RR","RW",
    "SA","SB","SD","SE","SG","SH","SK","SL","SP","SS","ST","SV","SW","SY",
    "T1","TB","TD","TG","TL","TN","TP","TQ","TT","TW","TX","TZ",
    "UP","UR",
    "VP","VR","VS","VZ",
    "W2","WC","WD","WG","WI","WP","WT","WW",
    "XE","XG","XM","XT",
    "ZG"
];

// =========================================
//  CONDITION RATING GROUPS
// =========================================

const CONDITION_GROUPS = {
    paint:        { prefix: "PAINT",        key: "exterior" },
    sheetMetal:   { prefix: "SHEET_METAL",  key: "exterior" },
    glass:        { prefix: "GLASS",        key: "exterior" },
    trim:         { prefix: "TRIM",         key: "exterior" },
    seats:        { prefix: "SEATS",        key: "interior" },
    carpet:       { prefix: "CARPET",       key: "interior" },
    dashboard:    { prefix: "DASHBOARD",    key: "interior" },
    headliner:    { prefix: "HEADLINER",    key: "interior" },
    frontTires:   { prefix: "FRONT_TIRES",  key: "mechanical" },
    rearTires:    { prefix: "REAR_TIRES",   key: "mechanical" },
    engine:       { prefix: "ENGINE",       key: "mechanical" },
    transmission: { prefix: "TRANSMISSION", key: "mechanical" }
};

// =========================================
//  BODY STYLE MAP
// =========================================

const BODY_STYLES = [
    "BODY_2DR", "BODY_4DR", "BODY_CONVERTIBLE", "BODY_HATCHBACK",
    "BODY_PICKUP", "BODY_UTILITY", "BODY_VAN", "BODY_WAGON"
];

const TRUCK_CONFIGS = [
    "TRUCK_CAB_CHASSIS", "TRUCK_FENDERSIDE", "TRUCK_FLEETSIDE",
    "TRUCK_HALF_TON", "TRUCK_LONG_BED", "TRUCK_ONE_TON",
    "TRUCK_SHORT_BED", "TRUCK_THREE_QUARTER_TON"
];

const CYLINDER_TOKENS = ["CYL_3","CYL_4","CYL_5","CYL_6","CYL_8","CYL_10","CYL_12"];

const TRANS_TOKENS = [
    "TRANS_AUTO","TRANS_OD","TRANS_PO",
    "TRANS_S3","TRANS_S4","TRANS_S5","TRANS_S6","TRANS_4W"
];

const COVERAGE_TOKENS = [
    "COVERAGE_COLLISION","COVERAGE_COMPREHENSIVE","COVERAGE_LIABILITY","COVERAGE_OTHER"
];

// =========================================
//  PUBLIC API
// =========================================

export function renderBCIFPayload(payload) {
    const map = {};

    renderClaimTokens(map, payload);
    renderVehicleTextTokens(map, payload);
    renderVehicleCheckboxTokens(map, payload);
    renderConditionTokens(map, payload);
    renderLossTokens(map, payload);
    renderOptionTokens(map, payload);
    renderRefurbishmentTokens(map);
    renderAdjustmentTokens(map);

    return map;
}

// =========================================
//  CLAIM
// =========================================

function renderClaimTokens(map, payload) {
    const c = payload.claim;
    map.CLAIM_NUMBER    = c.claimNumber    || "";
    map.CLAIM_NUMBER_P2 = c.claimNumber    || "";
    map.INSURED_NAME    = c.carrier        || "";
    map.OWNER_NAME      = c.ownerName      || c.carrier || "";
    map.OWNER_PHONE     = c.ownerPhone     || "";
    map.ADJR_NAME       = c.adjuster       || "";
    map.APPR_NAME       = c.writer         || "";
    map.DATE_OF_LOSS    = c.dateOfLoss     || "";
    map.OFFICE_ID       = "";
    map.LOSS_STATE      = extractState(c.lossLocation);
    map.LOSS_ZIP_CODE   = c.lossZip        || "";
}

// =========================================
//  VEHICLE — TEXT
// =========================================

function renderVehicleTextTokens(map, payload) {
    const v = payload.vehicle;
    map.YEAR             = String(v.year || "");
    map.MAKE             = v.make         || "";
    map.MODEL            = v.model        || "";
    map.VIN              = v.vin          || "";
    map.MILEAGE          = v.odometer     || "";
    map.ENGINE_SIZE      = v.engine       || "";
    map.SPECIAL_FEATURES = "";
}

// =========================================
//  VEHICLE — CHECKBOXES
// =========================================

function renderVehicleCheckboxTokens(map, payload) {
    const bodyNorm = normalizeBodyStyle(payload.vehicle.bodyStyle);

    for (const token of BODY_STYLES) {
        map[token] = checkbox(token === bodyNorm);
    }

    for (const token of TRUCK_CONFIGS) {
        map[token] = checkbox(false);
    }

    const cyls = parseCylinders(payload.vehicle.engine);
    for (const token of CYLINDER_TOKENS) {
        map[token] = checkbox(token === cyls);
    }

    const trans = parseTransmission(payload.vehicle.engine);
    for (const token of TRANS_TOKENS) {
        map[token] = checkbox(token === trans);
    }

    map.DIESEL = checkbox(false);
    map.TURBO  = checkbox(false);
}

// =========================================
//  CONDITION RATINGS
// =========================================

function renderConditionTokens(map, payload) {
    const cond = payload.condition;
    const comments = cond.comments || {};

    for (const [, group] of Object.entries(CONDITION_GROUPS)) {
        const rating = cond[group.key] ?? cond.overall ?? 1;

        for (let i = 0; i <= 3; i++) {
            map[`${group.prefix}_${i}`] = checkbox(i === rating);
        }

        map[`${group.prefix}_COMMENT`] = comments[group.key] || "";
    }
}

// =========================================
//  LOSS / COVERAGE
// =========================================

function renderLossTokens(map, payload) {
    const lossType = (payload.claim.lossType || "").toUpperCase();

    // Loss type checkboxes — "Theft" or "Other"
    map.LOSS_TYPE_THEFT = checkbox(lossType.includes("THEFT"));
    map.LOSS_TYPE_OTHER = checkbox(lossType && !lossType.includes("THEFT"));

    // Coverage — separate from loss type, uses payload.claim.coverage
    const coverage = (payload.claim.coverage || "").toUpperCase();
    map.COVERAGE_COLLISION     = checkbox(coverage.includes("COLL"));
    map.COVERAGE_COMPREHENSIVE = checkbox(coverage.includes("COMP"));
    map.COVERAGE_LIABILITY     = checkbox(coverage.includes("LIAB"));
    map.COVERAGE_OTHER         = checkbox(!coverage || coverage === "OTHER" || coverage === "UNKNOWN");

    map.LEASED_YES      = checkbox(false);
    map.LEASED_NO       = checkbox(true);
    map.THIRD_PARTY_YES = checkbox(false);
    map.THIRD_PARTY_NO  = checkbox(true);
}

// =========================================
//  OPTIONS (196 two-char codes)
// =========================================

function renderOptionTokens(map, payload) {
    const activeSet = new Set(payload.options || []);

    for (const code of OPTION_CODES) {
        map[code] = checkbox(activeSet.has(code));
    }

    map.OTHER_BC  = checkbox(activeSet.has("OTHER_BC"));
    map.OTHER_BD  = checkbox(activeSet.has("OTHER_BD"));
    map.SAFETY_BC = checkbox(activeSet.has("SAFETY_BC"));
    map.SAFETY_BD = checkbox(activeSet.has("SAFETY_BD"));
}

// =========================================
//  REFURBISHMENT (empty defaults)
// =========================================

function renderRefurbishmentTokens(map) {
    map.RESTORED_AMOUNT = "";

    const refTextTokens = [
        "REF_ENGINE_MILEAGE", "REF_ENGINE_PURCHASE_PRICE",
        "REF_TRANS_MILEAGE", "REF_TRANS_PURCHASE_PRICE",
        "REF_PAINT_DATE", "REF_PAINT_PURCHASE_PRICE",
        "REF_INTERIOR_DATE", "REF_INTERIOR_PURCHASE_PRICE",
        "REF_CARPET_KIT_DATE", "REF_CARPET_KIT_PURCHASE_PRICE",
        "REF_TIRES_COUNT", "REF_TIRES_PURCHASE_PRICE",
        "REF_SPECIAL_WHEELS_DATE", "REF_SPECIAL_WHEELS_PURCHASE_PRICE",
        "REF_CAMPER_SHELL_DATE", "REF_CAMPER_SHELL_PURCHASE_PRICE",
        "REF_OTHER_DATE", "REF_OTHER_DESCRIPTION", "REF_OTHER_PURCHASE_PRICE"
    ];

    for (const token of refTextTokens) {
        map[token] = "";
    }

    const refCheckboxTokens = [
        "REF_PAINT_BASIC", "REF_PAINT_STANDARD", "REF_PAINT_CUSTOM",
        "REF_INTERIOR_VINYL", "REF_INTERIOR_CLOTH", "REF_INTERIOR_LEATHER"
    ];

    for (const token of refCheckboxTokens) {
        map[token] = checkbox(false);
    }
}

// =========================================
//  ADJUSTMENTS (empty defaults)
// =========================================

function renderAdjustmentTokens(map) {
    const adjTokens = [
        "PRE_TAX_ADJ1_DESC", "PRE_TAX_ADJ1_ADD", "PRE_TAX_ADJ1_DEDUCT",
        "PRE_TAX_ADJ2_DESC", "PRE_TAX_ADJ2_ADD", "PRE_TAX_ADJ2_DEDUCT",
        "POST_TAX_ADJ1_DESC", "POST_TAX_ADJ1_ADD", "POST_TAX_ADJ1_DEDUCT",
        "POST_TAX_ADJ2_DESC", "POST_TAX_ADJ2_ADD", "POST_TAX_ADJ2_DEDUCT"
    ];

    for (const token of adjTokens) {
        map[token] = "";
    }
}

// =========================================
//  HELPERS
// =========================================

function extractState(location) {
    if (!location) return "";
    const match = location.match(/\b([A-Z]{2})\b/);
    return match ? match[1] : "";
}

function normalizeBodyStyle(style) {
    if (!style) return "";
    const s = style.toUpperCase().replace(/[^A-Z0-9]/g, "_");

    if (s.includes("CONVERT"))   return "BODY_CONVERTIBLE";
    if (s.includes("HATCH"))     return "BODY_HATCHBACK";
    if (s.includes("PICKUP") || s.includes("TRUCK")) return "BODY_PICKUP";
    if (s.includes("UTIL") || s.includes("SUV"))     return "BODY_UTILITY";
    if (s.includes("VAN"))       return "BODY_VAN";
    if (s.includes("WAGON") || s.includes("ESTATE")) return "BODY_WAGON";
    if (s.includes("2") || s.includes("COUPE"))       return "BODY_2DR";
    if (s.includes("4") || s.includes("SEDAN"))       return "BODY_4DR";

    return "";
}

function parseCylinders(engine) {
    if (!engine) return "";
    const match = String(engine).match(/(\d+)\s*(?:cyl|cylinder)/i);
    if (!match) {
        const vMatch = String(engine).match(/[vViI](\d+)/);
        if (vMatch) return `CYL_${vMatch[1]}`;
        return "";
    }
    return `CYL_${match[1]}`;
}

function parseTransmission(engine) {
    if (!engine) return "";
    const s = String(engine).toUpperCase();

    if (s.includes("AUTO"))  return "TRANS_AUTO";
    if (s.includes("CVT"))   return "TRANS_AUTO";
    if (s.includes("6SPD") || s.includes("6-SPEED") || s.includes("6 SPEED")) return "TRANS_S6";
    if (s.includes("5SPD") || s.includes("5-SPEED") || s.includes("5 SPEED")) return "TRANS_S5";
    if (s.includes("4SPD") || s.includes("4-SPEED") || s.includes("4 SPEED")) return "TRANS_S4";
    if (s.includes("3SPD") || s.includes("3-SPEED") || s.includes("3 SPEED")) return "TRANS_S3";
    if (s.includes("4WD") || s.includes("4X4") || s.includes("AWD"))          return "TRANS_4W";
    if (s.includes("OVERDRIVE") || s.includes("O/D"))                          return "TRANS_OD";

    return "";
}
