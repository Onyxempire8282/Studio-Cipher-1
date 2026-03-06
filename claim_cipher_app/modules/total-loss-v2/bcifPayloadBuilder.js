const MASTER_TOKENS = [
    "CLAIM_NUMBER","INSURED_NAME","OWNER_NAME","OWNER_PHONE","ADJR_NAME","APPR_NAME","DATE_OF_LOSS","OFFICE_ID","LOSS_STATE","LOSS_ZIP_CODE",
    "YEAR","MAKE","MODEL","VIN","MILEAGE","ENGINE_SIZE","SPECIAL_FEATURES",
    "BODY_2DR","BODY_4DR","BODY_CONVERTIBLE","BODY_HATCHBACK","BODY_PICKUP","BODY_UTILITY","BODY_VAN","BODY_WAGON",
    "TRUCK_CAB_CHASSIS","TRUCK_FENDERSIDE","TRUCK_FLEETSIDE","TRUCK_HALF_TON","TRUCK_LONG_BED","TRUCK_ONE_TON","TRUCK_SHORT_BED","TRUCK_THREE_QUARTER_TON",
    "CYL_3","CYL_4","CYL_5","CYL_6","CYL_8","CYL_10","CYL_12",
    "TRANS_AUTO","TRANS_OD","TRANS_PO","TRANS_S3","TRANS_S4","TRANS_S5","TRANS_S6","TRANS_4W",
    "DIESEL","TURBO",
    "PAINT_0","PAINT_1","PAINT_2","PAINT_3","PAINT_COMMENT",
    "SHEET_METAL_0","SHEET_METAL_1","SHEET_METAL_2","SHEET_METAL_3","SHEET_METAL_COMMENT",
    "GLASS_0","GLASS_1","GLASS_2","GLASS_3","GLASS_COMMENT",
    "TRIM_0","TRIM_1","TRIM_2","TRIM_3","TRIM_COMMENT",
    "SEATS_0","SEATS_1","SEATS_2","SEATS_3","SEATS_COMMENT",
    "CARPET_0","CARPET_1","CARPET_2","CARPET_3","CARPET_COMMENT",
    "DASHBOARD_0","DASHBOARD_1","DASHBOARD_2","DASHBOARD_3","DASHBOARD_COMMENT",
    "HEADLINER_0","HEADLINER_1","HEADLINER_2","HEADLINER_3","HEADLINER_COMMENT",
    "FRONT_TIRES_0","FRONT_TIRES_1","FRONT_TIRES_2","FRONT_TIRES_3","FRONT_TIRES_COMMENT",
    "REAR_TIRES_0","REAR_TIRES_1","REAR_TIRES_2","REAR_TIRES_3","REAR_TIRES_COMMENT",
    "ENGINE_0","ENGINE_1","ENGINE_2","ENGINE_3","ENGINE_COMMENT",
    "TRANSMISSION_0","TRANSMISSION_1","TRANSMISSION_2","TRANSMISSION_3","TRANSMISSION_COMMENT",
    "COVERAGE_COLLISION","COVERAGE_COMPREHENSIVE","COVERAGE_LIABILITY","COVERAGE_OTHER",
    "LOSS_TYPE_THEFT","LOSS_TYPE_OTHER",
    "LEASED_YES","LEASED_NO",
    "THIRD_PARTY_YES","THIRD_PARTY_NO",
    "OTHER_BC","OTHER_BD","SAFETY_BC","SAFETY_BD",
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
    "ZG",
    "RESTORED_AMOUNT",
    "REF_ENGINE_MILEAGE","REF_ENGINE_PURCHASE_PRICE",
    "REF_TRANS_MILEAGE","REF_TRANS_PURCHASE_PRICE",
    "REF_PAINT_DATE","REF_PAINT_PURCHASE_PRICE",
    "REF_INTERIOR_DATE","REF_INTERIOR_PURCHASE_PRICE",
    "REF_CARPET_KIT_DATE","REF_CARPET_KIT_PURCHASE_PRICE",
    "REF_TIRES_COUNT","REF_TIRES_PURCHASE_PRICE",
    "REF_SPECIAL_WHEELS_DATE","REF_SPECIAL_WHEELS_PURCHASE_PRICE",
    "REF_CAMPER_SHELL_DATE","REF_CAMPER_SHELL_PURCHASE_PRICE",
    "REF_OTHER_DATE","REF_OTHER_DESCRIPTION","REF_OTHER_PURCHASE_PRICE",
    "REF_PAINT_BASIC","REF_PAINT_STANDARD","REF_PAINT_CUSTOM",
    "REF_INTERIOR_VINYL","REF_INTERIOR_CLOTH","REF_INTERIOR_LEATHER",
    "PRE_TAX_ADJ1_DESC","PRE_TAX_ADJ1_ADD","PRE_TAX_ADJ1_DEDUCT",
    "PRE_TAX_ADJ2_DESC","PRE_TAX_ADJ2_ADD","PRE_TAX_ADJ2_DEDUCT",
    "POST_TAX_ADJ1_DESC","POST_TAX_ADJ1_ADD","POST_TAX_ADJ1_DEDUCT",
    "POST_TAX_ADJ2_DESC","POST_TAX_ADJ2_ADD","POST_TAX_ADJ2_DEDUCT"
];

function initTokenMap() {
    const map = {};
    for (const token of MASTER_TOKENS) {
        map[token] = "";
    }
    return map;
}

function normalizeText(value) {
    return String(value || "").trim();
}

function setText(map, token, value) {
    if (token in map) {
        map[token] = normalizeText(value);
    }
}

function setCheck(map, token) {
    if (token in map) {
        map[token] = "\u2611"; // ☑
    }
}

function applyRating(map, prefix, rating) {
    const val = Number(rating);
    if (!Number.isFinite(val)) return;
    const clamped = Math.max(0, Math.min(3, Math.round(val)));
    const token = `${prefix}_${clamped}`;
    setCheck(map, token);
}

function validateTokenIntegrity(tokenMap) {
    for (const token of MASTER_TOKENS) {
        if (!(token in tokenMap)) {
            console.error("[TLS] Missing token in payload:", token);
        }
    }
}

export const TOKEN_META = {
    // Power / Convenience — Power Options
    "PS":         { label: "Power Steering",                   category: "Power / Convenience" },
    "PB":         { label: "Power Brakes",                     category: "Power / Convenience" },
    "PW":         { label: "Power Windows",                    category: "Power / Convenience" },
    "PL":         { label: "Power Locks",                      category: "Power / Convenience" },
    "SP":         { label: "Power Driver Seat",                category: "Power / Convenience" },
    "PC":         { label: "Power Passenger Seat",             category: "Power / Convenience" },
    "PA":         { label: "Power Antenna",                    category: "Power / Convenience" },
    "PM":         { label: "Power Mirrors",                    category: "Power / Convenience" },
    "PT":         { label: "Power Trunk / Liftgate",           category: "Power / Convenience" },
    "PP":         { label: "Power Adjustable Pedals",          category: "Power / Convenience" },
    "PD":         { label: "Power Sliding Door",               category: "Power / Convenience" },
    "DP":         { label: "Dual Power Sliding Doors",         category: "Power / Convenience" },
    // Power / Convenience — Decor / Convenience
    "AC":         { label: "Air Conditioning",                 category: "Power / Convenience" },
    "DA":         { label: "Dual Air Conditioning",            category: "Power / Convenience" },
    "CL":         { label: "Climate Control",                  category: "Power / Convenience" },
    "RD":         { label: "Rear Defogger",                    category: "Power / Convenience" },
    "IW":         { label: "Intermittent Wipers",              category: "Power / Convenience" },
    "TW":         { label: "Tilt Wheel",                       category: "Power / Convenience" },
    "TL":         { label: "Telescopic Wheel",                 category: "Power / Convenience" },
    "CC":         { label: "Cruise Control",                   category: "Power / Convenience" },
    "KE":         { label: "Keyless Entry",                    category: "Power / Convenience" },
    "CN":         { label: "Console Storage",                  category: "Power / Convenience" },
    "CO":         { label: "Overhead Console",                 category: "Power / Convenience" },
    "EC":         { label: "Entertainment Center",             category: "Power / Convenience" },
    "NV":         { label: "Navigation System",                category: "Power / Convenience" },
    "C2":         { label: "Communications System",            category: "Power / Convenience" },
    "HU":         { label: "Heads Up Display",                 category: "Power / Convenience" },
    "WT":         { label: "Wood Interior Trim",               category: "Power / Convenience" },
    "EI":         { label: "Electronic Instrumentation",       category: "Power / Convenience" },
    "IB":         { label: "On Board Computer",                category: "Power / Convenience" },
    "MC":         { label: "Message Center",                   category: "Power / Convenience" },
    "MM":         { label: "Memory Package",                   category: "Power / Convenience" },
    "RJ":         { label: "Remote Starter",                   category: "Power / Convenience" },
    "SV":         { label: "Surround View Camera",             category: "Power / Convenience" },
    "DS":         { label: "Dual Screen",                      category: "Power / Convenience" },
    "HL":         { label: "HomeLink",                         category: "Power / Convenience" },
    // Power / Convenience — Transmission
    "TRANS_AUTO": { label: "Automatic Transmission",           category: "Power / Convenience" },
    "TRANS_OD":   { label: "Overdrive",                        category: "Power / Convenience" },
    "TRANS_PO":   { label: "Power Overdrive",                  category: "Power / Convenience" },
    "TRANS_S3":   { label: "3-Speed Transmission",             category: "Power / Convenience" },
    "TRANS_S4":   { label: "4-Speed Transmission",             category: "Power / Convenience" },
    "TRANS_S5":   { label: "5-Speed Transmission",             category: "Power / Convenience" },
    "TRANS_S6":   { label: "6-Speed Transmission",             category: "Power / Convenience" },
    "TRANS_4W":   { label: "4-Wheel Drive",                    category: "Power / Convenience" },
    // Seats
    "CS":         { label: "Cloth Seats",                      category: "Seats" },
    "LS":         { label: "Leather Seats",                    category: "Seats" },
    "RL":         { label: "Reclining Seats",                  category: "Seats" },
    "BS":         { label: "Bucket Seats",                     category: "Seats" },
    "SH":         { label: "Heated Seats",                     category: "Seats" },
    "RH":         { label: "Rear Heated Seats",                category: "Seats" },
    "3S":         { label: "Third Row Seat",                   category: "Seats" },
    "3P":         { label: "Power Third Row Seat",             category: "Seats" },
    "R3":         { label: "Retractable Seats",                category: "Seats" },
    "2P":         { label: "12 Passenger",                     category: "Seats" },
    "5P":         { label: "15 Passenger",                     category: "Seats" },
    "B2":         { label: "Captain Chairs (2)",               category: "Seats" },
    "B4":         { label: "Captain Chairs (4)",               category: "Seats" },
    "B6":         { label: "Captain Chairs (6)",               category: "Seats" },
    "VS":         { label: "Ventilated Seats",                 category: "Seats" },
    "SS":         { label: "Swivel Seats",                     category: "Seats" },
    // Audio / Entertainment
    "AM":         { label: "AM Radio",                         category: "Audio / Entertainment" },
    "FM":         { label: "FM Radio",                         category: "Audio / Entertainment" },
    "ST":         { label: "Stereo",                           category: "Audio / Entertainment" },
    "CA":         { label: "Cassette",                         category: "Audio / Entertainment" },
    "SE":         { label: "Search / Seek",                    category: "Audio / Entertainment" },
    "CD":         { label: "CD Player",                        category: "Audio / Entertainment" },
    "SK":         { label: "CD Changer",                       category: "Audio / Entertainment" },
    "UR":         { label: "Premium Radio",                    category: "Audio / Entertainment" },
    "XM":         { label: "Satellite Radio",                  category: "Audio / Entertainment" },
    "TQ":         { label: "Steering Wheel Audio Controls",    category: "Audio / Entertainment" },
    "M3":         { label: "Auxiliary Audio Input",            category: "Audio / Entertainment" },
    "EQ":         { label: "Equalizer",                        category: "Audio / Entertainment" },
    // Wheels
    "AW":         { label: "Aluminum / Alloy Wheels",          category: "Wheels" },
    "CJ":         { label: "Chrome Wheels",                    category: "Wheels" },
    "W2":         { label: "20\" or Larger Wheels",            category: "Wheels" },
    "DC":         { label: "Deluxe Wheel Covers",              category: "Wheels" },
    "FC":         { label: "Full Wheel Covers",                category: "Wheels" },
    "SA":         { label: "Spoke Aluminum Wheels",            category: "Wheels" },
    "SY":         { label: "Styled Steel Wheels",              category: "Wheels" },
    "WW":         { label: "Wire Wheels",                      category: "Wheels" },
    "WC":         { label: "Wire Wheel Covers",                category: "Wheels" },
    "RW":         { label: "Rally Wheels",                     category: "Wheels" },
    "KW":         { label: "Locking Wheels",                   category: "Wheels" },
    "LC":         { label: "Locking Wheel Covers",             category: "Wheels" },
    // Roof
    "EG":         { label: "Electric Glass Roof",              category: "Roof" },
    "ES":         { label: "Electric Steel Roof",              category: "Roof" },
    "OR":         { label: "Skyview Roof",                     category: "Roof" },
    "SD":         { label: "Dual Power Sunroof",               category: "Roof" },
    "MS":         { label: "Manual Steel Roof",                category: "Roof" },
    "MG":         { label: "Manual Glass Roof",                category: "Roof" },
    "FR":         { label: "Flip Roof",                        category: "Roof" },
    "TT":         { label: "T-Top",                            category: "Roof" },
    "GT":         { label: "Glass T-Top",                      category: "Roof" },
    "VP":         { label: "Power Convertible Roof",           category: "Roof" },
    "RM":         { label: "Detachable Roof",                  category: "Roof" },
    "VR":         { label: "Vinyl Covered Roof",               category: "Roof" },
    "RF":         { label: "Cabriolet Roof",                   category: "Roof" },
    "LR":         { label: "Landau Roof",                      category: "Roof" },
    "LP":         { label: "Padded Landau Roof",               category: "Roof" },
    "PV":         { label: "Padded Vinyl Roof",                category: "Roof" },
    "HT":         { label: "Hard Top",                         category: "Roof" },
    // Safety
    "AG":         { label: "Driver Air Bag",                   category: "Safety" },
    "RG":         { label: "Passenger Air Bag",                category: "Safety" },
    "XG":         { label: "Front Side Impact Air Bags",       category: "Safety" },
    "ZG":         { label: "Rear Side Impact Air Bags",        category: "Safety" },
    "DG":         { label: "Head / Curtain Air Bags",          category: "Safety" },
    "TD":         { label: "Anti-Theft Alarm",                 category: "Safety" },
    "VZ":         { label: "Night Vision",                     category: "Safety" },
    "IC":         { label: "Adaptive Cruise Control",          category: "Safety" },
    "PJ":         { label: "Parking Sensors",                  category: "Safety" },
    "PX":         { label: "Parking Sensors (Equipped)",       category: "Safety" },
    "AB":         { label: "Anti-Lock Brakes (4-Wheel)",       category: "Safety" },
    "A2":         { label: "Anti-Lock Brakes (2-Wheel)",       category: "Safety" },
    "DB":         { label: "4-Wheel Disc Brakes",              category: "Safety" },
    "RB":         { label: "Roll Bar",                         category: "Safety" },
    "TX":         { label: "Traction Control",                 category: "Safety" },
    "T1":         { label: "Stability Control",                category: "Safety" },
    "AL":         { label: "Auto Leveling",                    category: "Safety" },
    "SAFETY_BC":  { label: "Backup Camera",                    category: "Safety" },
    "SAFETY_BD":  { label: "Blind Spot Monitor",               category: "Safety" },
    "LW":         { label: "Lane Departure Warning",           category: "Safety" },
    // Exterior / Truck Accessories — Exterior / Paint / Glass
    "RR":         { label: "Roof Rack",                        category: "Exterior / Truck Accessories" },
    "WG":         { label: "Woodgrain",                        category: "Exterior / Truck Accessories" },
    "WP":         { label: "Rear Window Wiper",                category: "Exterior / Truck Accessories" },
    "2T":         { label: "Two Tone Paint",                   category: "Exterior / Truck Accessories" },
    "HP":         { label: "Three Stage Paint",                category: "Exterior / Truck Accessories" },
    "IP":         { label: "Clearcoat Paint",                  category: "Exterior / Truck Accessories" },
    "MP":         { label: "Metallic Paint",                   category: "Exterior / Truck Accessories" },
    "SL":         { label: "Rear Spoiler",                     category: "Exterior / Truck Accessories" },
    "FL":         { label: "Fog Lamps",                        category: "Exterior / Truck Accessories" },
    "TG":         { label: "Tinted Glass",                     category: "Exterior / Truck Accessories" },
    "DT":         { label: "Privacy Glass",                    category: "Exterior / Truck Accessories" },
    "BN":         { label: "Body Side Moldings",               category: "Exterior / Truck Accessories" },
    "DM":         { label: "Dual Mirrors",                     category: "Exterior / Truck Accessories" },
    "HM":         { label: "Heated Mirrors",                   category: "Exterior / Truck Accessories" },
    "HV":         { label: "Headlamp Washers",                 category: "Exterior / Truck Accessories" },
    "MX":         { label: "Signal Integrated Mirrors",        category: "Exterior / Truck Accessories" },
    // Exterior / Truck Accessories — Truck / Other
    "OTHER_BD":   { label: "Running Boards",                   category: "Exterior / Truck Accessories" },
    "UP":         { label: "Power Retractable Running Boards", category: "Exterior / Truck Accessories" },
    "XE":         { label: "Xenon Headlamps",                  category: "Exterior / Truck Accessories" },
    "AR":         { label: "Bed Rails",                        category: "Exterior / Truck Accessories" },
    "BL":         { label: "Bedliner",                         category: "Exterior / Truck Accessories" },
    "BY":         { label: "Spray-On Bedliner",                category: "Exterior / Truck Accessories" },
    "CP":         { label: "Deluxe Truck Cap",                 category: "Exterior / Truck Accessories" },
    "GG":         { label: "Grille Guard",                     category: "Exterior / Truck Accessories" },
    "SB":         { label: "Rear Step Bumper",                 category: "Exterior / Truck Accessories" },
    "SW":         { label: "Rear Sliding Window",              category: "Exterior / Truck Accessories" },
    "PG":         { label: "Power Rear Window",                category: "Exterior / Truck Accessories" },
    "TB":         { label: "Permanent Tool Box",               category: "Exterior / Truck Accessories" },
    "TN":         { label: "Soft Tonneau Cover",               category: "Exterior / Truck Accessories" },
    "TZ":         { label: "Hard Tonneau Cover",               category: "Exterior / Truck Accessories" },
    "TP":         { label: "Trailering Package",               category: "Exterior / Truck Accessories" },
    "WD":         { label: "Dual Rear Wheels",                 category: "Exterior / Truck Accessories" },
    "XT":         { label: "Auxiliary Fuel Tank",              category: "Exterior / Truck Accessories" },
    "OTHER_BC":   { label: "Bumper Cushions",                  category: "Exterior / Truck Accessories" },
    "BG":         { label: "Bumper Guards",                    category: "Exterior / Truck Accessories" },
    "EM":         { label: "California Emissions",             category: "Exterior / Truck Accessories" },
    "SG":         { label: "Stone Guard",                      category: "Exterior / Truck Accessories" },
    "WI":         { label: "Winch",                            category: "Exterior / Truck Accessories" },
};

export function mapEstimateOptionsToBCIF(rawOptions = []) {
    if (!Array.isArray(rawOptions)) return [];

    const tokens = new Set();

    const rules = [
        // POWER OPTIONS
        { token: "PS", patterns: [/power\s*steering/i] },
        { token: "PB", patterns: [/power\s*brakes?/i] },
        { token: "PW", patterns: [/power\s*windows?/i] },
        { token: "PL", patterns: [/power\s*locks?/i] },
        { token: "SP", patterns: [/power\s*(driver|drv)\s*seat/i] },
        { token: "PC", patterns: [/power\s*(passenger|pass)\s*seat/i] },
        { token: "PA", patterns: [/power\s*antenna/i] },
        { token: "PM", patterns: [/power\s*mirrors?/i] },
        { token: "PT", patterns: [/power\s*(trunk|gate|liftgate|hatch)/i] },
        { token: "PP", patterns: [/power\s*adjustable\s*pedals?/i] },
        { token: "PD", patterns: [/power\s*sliding\s*door/i] },
        { token: "DP", patterns: [/dual\s*power\s*sliding\s*doors?/i] },
        // DECOR / CONVENIENCE
        { token: "AC", patterns: [/\bair\s*conditioning\b/i, /\bac\b/i] },
        { token: "DA", patterns: [/dual\s*air\s*conditioning/i, /dual\s*a\/c/i] },
        { token: "CL", patterns: [/climate\s*control/i] },
        { token: "RD", patterns: [/rear\s*defogger/i, /rear\s*defroster/i] },
        { token: "IW", patterns: [/intermittent\s*wipers?/i] },
        { token: "TW", patterns: [/tilt\s*wheel/i] },
        { token: "TL", patterns: [/telescopic\s*wheel/i] },
        { token: "CC", patterns: [/cruise\s*control/i] },
        { token: "KE", patterns: [/keyless\s*entry/i] },
        { token: "CN", patterns: [/console\/?storage/i, /console\s*storage/i] },
        { token: "CO", patterns: [/overhead\s*console/i] },
        { token: "EC", patterns: [/entertainment\s*center/i] },
        { token: "NV", patterns: [/navigation\s*system/i, /\bnav\b/i] },
        { token: "C2", patterns: [/communications?\s*system/i, /telematics/i] },
        { token: "HU", patterns: [/heads?\s*up\s*display/i, /hud/i] },
        { token: "WT", patterns: [/wood\s*(interior|trim)/i] },
        { token: "EI", patterns: [/electronic\s*instrumentation/i] },
        { token: "IB", patterns: [/on\s*board\s*computer/i, /onboard\s*computer/i] },
        { token: "MC", patterns: [/message\s*center/i] },
        { token: "MM", patterns: [/memory\s*(package|seat|settings)/i] },
        { token: "RJ", patterns: [/remote\s*starter/i, /remote\s*start/i] },
        { token: "SAFETY_BC", patterns: [/backup\s*camera/i, /back[-\s]*up\s*camera/i, /rearview\s*camera/i] },
        { token: "SV", patterns: [/surround\s*view/i, /360\s*camera/i] },
        { token: "DS", patterns: [/dual\s*screen/i] },
        { token: "HL", patterns: [/home\s*link/i, /homelink/i] },
        // SEATING
        { token: "CS", patterns: [/cloth\s*seats?/i] },
        { token: "LS", patterns: [/leather\s*seats?/i] },
        { token: "RL", patterns: [/reclining\s*seats?/i, /lounge\s*seats?/i] },
        { token: "BS", patterns: [/bucket\s*seats?/i] },
        { token: "SH", patterns: [/heated\s*seats?/i] },
        { token: "RH", patterns: [/rear\s*heated\s*seats?/i] },
        { token: "3S", patterns: [/3rd\s*row\s*seat/i, /third\s*row\s*seat/i] },
        { token: "3P", patterns: [/power\s*third\s*seat/i, /power\s*3rd\s*seat/i] },
        { token: "R3", patterns: [/retractable\s*seats?/i] },
        { token: "2P", patterns: [/12\s*passenger/i] },
        { token: "5P", patterns: [/15\s*passenger/i] },
        { token: "B2", patterns: [/captain\s*chairs?\s*\(2\)/i, /captain\s*chairs?\s*2/i] },
        { token: "B4", patterns: [/captain\s*chairs?\s*\(4\)/i, /captain\s*chairs?\s*4/i] },
        { token: "B6", patterns: [/captain\s*chairs?\s*\(6\)/i, /captain\s*chairs?\s*6/i] },
        { token: "VS", patterns: [/ventilated\s*seats?/i] },
        // RADIO
        { token: "AM", patterns: [/\bam\s*radio\b/i] },
        { token: "FM", patterns: [/\bfm\s*radio\b/i] },
        { token: "ST", patterns: [/stereo/i] },
        { token: "CA", patterns: [/cassette/i] },
        { token: "SE", patterns: [/search\/?seek/i] },
        { token: "CD", patterns: [/cd\s*player/i] },
        { token: "SK", patterns: [/cd\s*changer/i, /cd\s*stacker/i] },
        { token: "UR", patterns: [/premium\s*radio/i] },
        { token: "XM", patterns: [/satellite\s*radio/i, /\bxm\b/i] },
        { token: "TQ", patterns: [/steering\s*wheel\s*touch\s*controls?/i] },
        { token: "M3", patterns: [/aux(iliary)?\s*audio/i, /aux\s*input/i] },
        { token: "EQ", patterns: [/equalizer/i] },
        // WHEELS
        { token: "AW", patterns: [/aluminum|alloy\s*wheels?/i] },
        { token: "CJ", patterns: [/chrome\s*wheels?/i] },
        { token: "W2", patterns: [/20[\"”]\s*or\s*larger\s*wheels?/i, /20\s*inch\s*wheels?/i] },
        { token: "DC", patterns: [/deluxe\s*wheel\s*covers?/i] },
        { token: "FC", patterns: [/full\s*wheel\s*covers?/i] },
        { token: "SA", patterns: [/spoke\s*aluminum\s*wheels?/i] },
        { token: "SY", patterns: [/styled\s*steel\s*wheels?/i] },
        { token: "WW", patterns: [/wire\s*wheels?/i] },
        { token: "WC", patterns: [/wire\s*wheel\s*covers?/i] },
        { token: "RW", patterns: [/rally\s*wheels?/i] },
        { token: "KW", patterns: [/locking\s*wheels?/i] },
        { token: "LC", patterns: [/locking\s*wheel\s*covers?/i] },
        // ROOF
        { token: "EG", patterns: [/electric\s*glass\s*(sun)?roof/i, /\bsunroof\b/i] },
        { token: "ES", patterns: [/electric\s*steel\s*roof/i] },
        { token: "OR", patterns: [/skyview\s*roof/i] },
        { token: "SD", patterns: [/dual\s*power\s*sunroof/i, /dual\s*sunroof/i] },
        { token: "MS", patterns: [/manual\s*steel\s*roof/i] },
        { token: "MG", patterns: [/manual\s*glass\s*roof/i] },
        { token: "FR", patterns: [/flip\s*roof/i] },
        { token: "TT", patterns: [/t-?top/i] },
        { token: "GT", patterns: [/glass\s*t-?top/i] },
        { token: "VP", patterns: [/power\s*convertible\s*roof/i] },
        { token: "RM", patterns: [/detachable\s*roof/i] },
        { token: "VR", patterns: [/vinyl\s*covered\s*roof/i] },
        { token: "RF", patterns: [/cabriolet\s*roof/i] },
        { token: "LR", patterns: [/landau\s*roof/i] },
        { token: "LP", patterns: [/padded\s*landau\s*roof/i] },
        { token: "PV", patterns: [/padded\s*vinyl\s*roof/i] },
        { token: "HT", patterns: [/hard\s*top/i] },
        // SAFETY / BRAKES
        { token: "AG", patterns: [/driver[‘’]?s?\s*side\s*air\s*bag/i, /driver\s*air\s*bag/i] },
        { token: "RG", patterns: [/passenger\s*air\s*bag/i] },
        { token: "XG", patterns: [/front\s*side\s*impact\s*air\s*bags?/i] },
        { token: "ZG", patterns: [/rear\s*side\s*impact\s*air\s*bags?/i] },
        { token: "DG", patterns: [/head\/?curtain\s*air\s*bags?/i, /curtain\s*air\s*bags?/i] },
        { token: "TD", patterns: [/alarm/i, /anti[-\s]*theft/i] },
        { token: "VZ", patterns: [/night\s*vision/i] },
        { token: "IC", patterns: [/intelligent\s*cruise/i, /adaptive\s*cruise/i] },
        { token: "PJ", patterns: [/parking\s*sensors?/i] },
        { token: "PX", patterns: [/parking\s*sensors?.*equip/i] },
        { token: "AB", patterns: [/anti[-\s]*lock\s*brakes?.*4/i, /\babs\b/i] },
        { token: "A2", patterns: [/anti[-\s]*lock\s*brakes?.*2/i] },
        { token: "DB", patterns: [/4[-\s]*wheel\s*disc\s*brakes?/i] },
        { token: "RB", patterns: [/roll\s*bar/i] },
        { token: "TX", patterns: [/traction\s*control/i] },
        { token: "T1", patterns: [/stability\s*control/i] },
        { token: "AL", patterns: [/auto\s*level/i, /auto\s*leveling/i] },
        { token: "SAFETY_BD", patterns: [/blind\s*spot/i, /blind\s*spot\s*monitor/i] },
        { token: "LW", patterns: [/lane\s*departure\s*warning/i, /lane\s*departure/i] },
        // EXTERIOR / PAINT / GLASS
        { token: "RR", patterns: [/roof\s*rack/i, /luggage\s*rack/i] },
        { token: "WG", patterns: [/woodgrain/i] },
        { token: "WP", patterns: [/rear\s*window\s*wiper/i] },
        { token: "2T", patterns: [/two\s*tone\s*paint/i, /two-tone\s*paint/i] },
        { token: "HP", patterns: [/three\s*stage\s*paint/i] },
        { token: "IP", patterns: [/clearcoat\s*paint/i, /clear\s*coat/i] },
        { token: "MP", patterns: [/metallic\s*paint/i] },
        { token: "SL", patterns: [/rear\s*spoiler/i] },
        { token: "FL", patterns: [/fog\s*lamps?/i] },
        { token: "TG", patterns: [/tinted\s*glass/i] },
        { token: "DT", patterns: [/privacy\s*glass/i, /dark\s*tint/i] },
        { token: "BN", patterns: [/body\s*side\s*moldings?/i] },
        { token: "DM", patterns: [/dual\s*mirrors?/i] },
        { token: "HM", patterns: [/heated\s*mirrors?/i] },
        { token: "HV", patterns: [/headlamp\s*washers?/i] },
        { token: "MX", patterns: [/signal\s*integrated\s*mirrors?/i] },
        // OTHER
        { token: "OTHER_BD", patterns: [/running\s*boards?/i, /side\s*steps?/i] },
        { token: "UP", patterns: [/power\s*retractable\s*running\s*boards?/i] },
        { token: "XE", patterns: [/xenon\s*headlamps?/i, /l\.?e\.?d\.?\s*headlamps?/i, /led\s*headlamps?/i] },
        { token: "AR", patterns: [/bed\s*rails?/i] },
        { token: "BL", patterns: [/bedliner/i] },
        { token: "BY", patterns: [/spray[-\s]*on\s*bedliner/i] },
        { token: "CP", patterns: [/deluxe\s*truck\s*cap/i] },
        { token: "GG", patterns: [/grill\s*guard/i, /grille\s*guard/i] },
        { token: "SB", patterns: [/rear\s*step\s*bumper/i] },
        { token: "SS", patterns: [/swivel\s*seats?/i] },
        { token: "SW", patterns: [/rear\s*sliding\s*window/i] },
        { token: "PG", patterns: [/power\s*rear\s*window/i] },
        { token: "TB", patterns: [/permanent\s*tool\s*box/i] },
        { token: "TN", patterns: [/soft\s*tonneau\s*cover/i] },
        { token: "TZ", patterns: [/hard\s*tonneau\s*cover/i] },
        { token: "TP", patterns: [/trailering\s*package/i, /towing\s*package/i] },
        { token: "WD", patterns: [/dual\s*rear\s*wheels?/i, /dually/i] },
        { token: "XT", patterns: [/auxiliary\s*fuel\s*tank/i] },
        { token: "OTHER_BC", patterns: [/bumper\s*cushions?/i] },
        { token: "BG", patterns: [/bumper\s*guards?/i] },
        { token: "EM", patterns: [/california\s*emissions/i] },
        { token: "SG", patterns: [/stone\s*guard/i] },
        { token: "WI", patterns: [/winch/i] },
        { token: "DE", patterns: [/deluxe\s*equipment/i] },
        // TRANSMISSION (from template tokens)
        { token: "TRANS_AUTO", patterns: [/automatic\s*transmission/i] },
        { token: "TRANS_OD", patterns: [/overdrive/i] },
        { token: "TRANS_PO", patterns: [/power\s*overdrive/i] },
        { token: "TRANS_S3", patterns: [/3\s*speed\s*transmission/i, /3\s*speed\s*auto/i] },
        { token: "TRANS_S4", patterns: [/4\s*speed\s*transmission/i, /4\s*speed\s*auto/i] },
        { token: "TRANS_S5", patterns: [/5\s*speed\s*transmission/i, /5\s*speed\s*auto/i] },
        { token: "TRANS_S6", patterns: [/6\s*speed\s*transmission/i, /6\s*speed\s*auto/i] },
        { token: "TRANS_4W", patterns: [/4\s*wheel\s*drive/i, /\b4wd\b/i] }
    ];

    // Legitimate vehicle options that have no BCIF checkbox — skip silently
    const knownSkip = [
        /heated\s*steering\s*wheel/i,
        /hands[-\s]*free/i,
        /bluetooth/i,
        /push\s*button\s*start/i,
        /smart\s*key/i,
        /auto[-\s]*dimming/i,
        /rain[-\s]*sensing/i,
        /ambient\s*light/i,
        /puddle\s*lamps?/i,
        /wireless\s*charg/i,
    ];

    for (const option of rawOptions) {
        const text = String(option || "").trim();
        if (!text) continue;

        let matched = false;
        for (const rule of rules) {
            if (rule.patterns.some(regex => regex.test(text))) {
                tokens.add(rule.token);
                matched = true;
            }
        }

        if (!matched) {
            const isKnown = knownSkip.some(rx => rx.test(text));
            if (!isKnown) {
                console.warn("Unmapped option:", option);
            }
        }
    }

    return Array.from(tokens);
}

export function buildBCIFPayload(parsedEstimate) {
    const tokenMap = initTokenMap();
    const est = parsedEstimate || {};

    const isTruthy = value => {
        if (value === true || value === 1) return true;
        const text = String(value || "").trim().toLowerCase();
        return ["true", "yes", "y", "1"].includes(text);
    };

    setText(tokenMap, "CLAIM_NUMBER", est.claimNumber);
    setText(tokenMap, "VIN", est.vin);
    setText(tokenMap, "YEAR", est.year);
    setText(tokenMap, "MAKE", est.make);
    setText(tokenMap, "MODEL", est.model);
    setText(tokenMap, "DATE_OF_LOSS", est.dateOfLoss);
    setText(tokenMap, "INSURED_NAME", est.insuredName);
    setText(tokenMap, "OWNER_NAME", est.ownerName);
    setText(tokenMap, "OWNER_PHONE", est.ownerPhone);
    setText(tokenMap, "LOSS_STATE", est.lossState);
    setText(tokenMap, "LOSS_ZIP_CODE", est.lossZipCode);

    const coverage = normalizeText(est.coverage || est.coverageType || "").toLowerCase();
    if (coverage.includes("collision")) setCheck(tokenMap, "COVERAGE_COLLISION");
    else if (coverage.includes("comprehensive")) setCheck(tokenMap, "COVERAGE_COMPREHENSIVE");
    else if (coverage.includes("liability")) setCheck(tokenMap, "COVERAGE_LIABILITY");
    else setCheck(tokenMap, "COVERAGE_OTHER");

    const lossType = normalizeText(est.lossType).toLowerCase();
    if (lossType.includes("theft")) setCheck(tokenMap, "LOSS_TYPE_THEFT");
    else if (lossType) setCheck(tokenMap, "LOSS_TYPE_OTHER");

    const leasedRaw = normalizeText(est.leased);
    if (!leasedRaw) {
        setCheck(tokenMap, "LEASED_NO");
    } else if (isTruthy(leasedRaw)) {
        setCheck(tokenMap, "LEASED_YES");
    } else {
        setCheck(tokenMap, "LEASED_NO");
    }

    const thirdPartyRaw = normalizeText(est.thirdParty);
    if (!thirdPartyRaw) {
        setCheck(tokenMap, "THIRD_PARTY_NO");
    } else if (isTruthy(thirdPartyRaw)) {
        setCheck(tokenMap, "THIRD_PARTY_YES");
    } else {
        setCheck(tokenMap, "THIRD_PARTY_NO");
    }

    const body = normalizeText(est.bodyStyle).toLowerCase();
    if (body.includes("2dr") || body.includes("2 door")) setCheck(tokenMap, "BODY_2DR");
    if (body.includes("4dr") || body.includes("4 door")) setCheck(tokenMap, "BODY_4DR");
    if (body.includes("hatch")) setCheck(tokenMap, "BODY_HATCHBACK");
    if (body.includes("convertible")) setCheck(tokenMap, "BODY_CONVERTIBLE");
    if (body.includes("wagon")) setCheck(tokenMap, "BODY_WAGON");
    if (body.includes("pickup") || body.includes("truck")) setCheck(tokenMap, "BODY_PICKUP");
    if (body.includes("van")) setCheck(tokenMap, "BODY_VAN");
    if (body.includes("utility") || body.includes("suv")) setCheck(tokenMap, "BODY_UTILITY");

    const truck = normalizeText(est.truckConfig || "").toLowerCase();
    if (truck.includes("half")) setCheck(tokenMap, "TRUCK_HALF_TON");
    if (truck.includes("three") || truck.includes("3/4")) setCheck(tokenMap, "TRUCK_THREE_QUARTER_TON");
    if (truck.includes("one") || truck.includes("1 ton")) setCheck(tokenMap, "TRUCK_ONE_TON");
    if (truck.includes("short")) setCheck(tokenMap, "TRUCK_SHORT_BED");
    if (truck.includes("long")) setCheck(tokenMap, "TRUCK_LONG_BED");

    setText(tokenMap, "ENGINE_SIZE", est.engineSize);

    const cyl = Number(est.cylinders);
    if (cyl === 3) setCheck(tokenMap, "CYL_3");
    if (cyl === 4) setCheck(tokenMap, "CYL_4");
    if (cyl === 5) setCheck(tokenMap, "CYL_5");
    if (cyl === 6) setCheck(tokenMap, "CYL_6");
    if (cyl === 8) setCheck(tokenMap, "CYL_8");
    if (cyl === 10) setCheck(tokenMap, "CYL_10");
    if (cyl === 12) setCheck(tokenMap, "CYL_12");

    const fuel = normalizeText(est.fuelType || est.engineType || "");
    if (isTruthy(est.diesel) || /diesel/i.test(fuel)) setCheck(tokenMap, "DIESEL");
    if (isTruthy(est.turbo) || /turbo/i.test(fuel)) setCheck(tokenMap, "TURBO");

    const trans = normalizeText(est.transmission).toLowerCase();
    if (/(?:\b4wd\b|\b4x4\b|four\s*wheel|4-wheel|\bawd\b|all\s*wheel)/i.test(trans)) {
        setCheck(tokenMap, "TRANS_4W");
    } else if (/(?:\b3\s*speed\b|\b3-speed\b|\b3\s*spd\b|\b3spd\b)/i.test(trans)) {
        setCheck(tokenMap, "TRANS_S3");
    } else if (/(?:\b4\s*speed\b|\b4-speed\b|\b4\s*spd\b|\b4spd\b)/i.test(trans)) {
        setCheck(tokenMap, "TRANS_S4");
    } else if (/(?:\b5\s*speed\b|\b5-speed\b|\b5\s*spd\b|\b5spd\b)/i.test(trans)) {
        setCheck(tokenMap, "TRANS_S5");
    } else if (/(?:\b6\s*speed\b|\b6-speed\b|\b6\s*spd\b|\b6spd\b)/i.test(trans)) {
        setCheck(tokenMap, "TRANS_S6");
    } else if (/power\s*overdrive/i.test(trans)) {
        setCheck(tokenMap, "TRANS_PO");
    } else if (/\boverdrive\b/i.test(trans)) {
        setCheck(tokenMap, "TRANS_OD");
    } else if (/(?:\bauto\b|\bautomatic\b)/i.test(trans)) {
        setCheck(tokenMap, "TRANS_AUTO");
    }

    const mileage = normalizeText(est.mileage);
    setText(tokenMap, "MILEAGE", mileage ? mileage : "UNK");

    const optionTokens = mapEstimateOptionsToBCIF(est.features || []);
    for (const code of optionTokens) {
        if (!(code in tokenMap)) {
            console.warn("[TLS] Option token not in MASTER_TOKENS:", code);
            continue;
        }
        setCheck(tokenMap, code);
    }

    const ratings = est.conditionRatings || {};
    applyRating(tokenMap, "PAINT", ratings.paint);
    applyRating(tokenMap, "SHEET_METAL", ratings.sheetMetal);
    applyRating(tokenMap, "GLASS", ratings.glass);
    applyRating(tokenMap, "TRIM", ratings.trim);
    applyRating(tokenMap, "SEATS", ratings.seats);
    applyRating(tokenMap, "CARPET", ratings.carpet);
    applyRating(tokenMap, "DASHBOARD", ratings.dashboard);
    applyRating(tokenMap, "HEADLINER", ratings.headliner);
    applyRating(tokenMap, "FRONT_TIRES", ratings.frontTires);
    applyRating(tokenMap, "REAR_TIRES", ratings.rearTires);
    applyRating(tokenMap, "ENGINE", ratings.engine);
    applyRating(tokenMap, "TRANSMISSION", ratings.transmission);

    const comments = est.conditionComments || {};
    setText(tokenMap, "PAINT_COMMENT", comments.paint);
    setText(tokenMap, "SHEET_METAL_COMMENT", comments.sheetMetal);
    setText(tokenMap, "GLASS_COMMENT", comments.glass);
    setText(tokenMap, "TRIM_COMMENT", comments.trim);
    setText(tokenMap, "SEATS_COMMENT", comments.seats);
    setText(tokenMap, "CARPET_COMMENT", comments.carpet);
    setText(tokenMap, "DASHBOARD_COMMENT", comments.dashboard);
    setText(tokenMap, "HEADLINER_COMMENT", comments.headliner);
    setText(tokenMap, "FRONT_TIRES_COMMENT", comments.frontTires);
    setText(tokenMap, "REAR_TIRES_COMMENT", comments.rearTires);
    setText(tokenMap, "ENGINE_COMMENT", comments.engine);
    setText(tokenMap, "TRANSMISSION_COMMENT", comments.transmission);

    const ref = est.refurbishment || {};
    setText(tokenMap, "REF_ENGINE_PURCHASE_PRICE", ref.enginePurchasePrice);
    setText(tokenMap, "REF_ENGINE_MILEAGE", ref.engineMileage);
    if (ref.paintType === "basic") setCheck(tokenMap, "REF_PAINT_BASIC");
    if (ref.paintType === "standard") setCheck(tokenMap, "REF_PAINT_STANDARD");
    if (ref.paintType === "custom") setCheck(tokenMap, "REF_PAINT_CUSTOM");
    setText(tokenMap, "REF_TIRES_COUNT", ref.tiresCount);
    setText(tokenMap, "REF_SPECIAL_WHEELS_PURCHASE_PRICE", ref.specialWheelsPurchasePrice);

    const adj = est.adjustments || {};
    setText(tokenMap, "PRE_TAX_ADJ1_DESC", adj.preTaxAdj1Desc);
    setText(tokenMap, "PRE_TAX_ADJ1_ADD", adj.preTaxAdj1Add);
    setText(tokenMap, "PRE_TAX_ADJ1_DEDUCT", adj.preTaxAdj1Deduct);
    setText(tokenMap, "POST_TAX_ADJ1_DESC", adj.postTaxAdj1Desc);
    setText(tokenMap, "POST_TAX_ADJ1_ADD", adj.postTaxAdj1Add);
    setText(tokenMap, "POST_TAX_ADJ1_DEDUCT", adj.postTaxAdj1Deduct);

    if (typeof process !== "undefined" && process?.env?.NODE_ENV !== "production") {
        validateTokenIntegrity(tokenMap);
    }

    return tokenMap;
}
