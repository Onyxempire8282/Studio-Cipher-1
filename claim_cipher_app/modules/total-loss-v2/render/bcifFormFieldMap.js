// BCIF token name → Word form field name
// Verified against actual document.xml structure of the CCC BCIF .docx template.
// FORMTEXT fields use names like "Text3", FORMCHECKBOX fields use "Check31", etc.

export const TOKEN_TO_FIELD = {
    // ======== CLAIM HEADER (text fields) ========
    CLAIM_NUMBER:     "Text3",
    INSURED_NAME:     "Text15",
    OWNER_NAME:       "Text7",
    OWNER_PHONE:      "Text8",
    ADJR_NAME:        "Text4",
    APPR_NAME:        "Text5",
    DATE_OF_LOSS:     "Text14",
    OFFICE_ID:        "Text2",
    LOSS_STATE:       "Text10",
    LOSS_ZIP_CODE:    "Text9",

    // ======== VEHICLE (text fields) ========
    YEAR:             "Text16",
    MAKE:             "Text17",
    MODEL:            "Text18",
    VIN:              "Text22",
    MILEAGE:          "Text23",
    ENGINE_SIZE:      "Text19",
    SPECIAL_FEATURES: "Text42",

    // ======== LOSS TYPE (checkboxes) ========
    LOSS_TYPE_OTHER:  "Check4",
    LOSS_TYPE_THEFT:  "Check5",

    // ======== COVERAGE (checkboxes) ========
    COVERAGE_COLLISION:      "Check43",
    COVERAGE_COMPREHENSIVE:  "Check44",
    COVERAGE_LIABILITY:       "Check45",
    COVERAGE_OTHER:          "Check46",

    // ======== THIRD PARTY / LEASED (checkboxes) ========
    THIRD_PARTY_YES:  "Check6",
    THIRD_PARTY_NO:   "Check7",
    LEASED_YES:       "Check8",
    LEASED_NO:        "Check9",

    // ======== BODY STYLE (checkboxes) ========
    BODY_2DR:         "Check11",
    BODY_4DR:         "Check12",
    BODY_HATCHBACK:   "Check13",
    BODY_CONVERTIBLE: "Check14",
    BODY_WAGON:       "Check15",
    BODY_PICKUP:      "Check16",
    BODY_VAN:         "Check17",
    BODY_UTILITY:     "Check25",

    // ======== TRUCK CONFIG (checkboxes) ========
    TRUCK_HALF_TON:           "Check24",
    TRUCK_THREE_QUARTER_TON:  "Check23",
    TRUCK_ONE_TON:            "Check22",
    TRUCK_SHORT_BED:          "Check21",
    TRUCK_LONG_BED:           "Check20",
    TRUCK_CAB_CHASSIS:        "Check19",
    TRUCK_FLEETSIDE:          "Check18",

    // ======== CYLINDERS (checkboxes) ========
    CYL_3:  "Check27",
    CYL_4:  "Check28",
    CYL_5:  "Check29",
    CYL_6:  "Check30",
    CYL_8:  "Check31",
    CYL_10: "Check32",
    CYL_12: "Check33",

    // ======== FUEL (checkboxes) ========
    TURBO:  "Check34",

    // ======== TRANSMISSION (checkboxes) ========
    TRANS_AUTO: "Check36",
    TRANS_S6:   "Check37",
    TRANS_S5:   "Check38",
    TRANS_S4:   "Check39",
    TRANS_S3:   "Check40",
    TRANS_OD:   "Check41",
    TRANS_4W:   "Check42",

    // ======== POWER OPTIONS (checkboxes) ========
    PS: "Check109",
    PB: "Check110",
    PW: "Check111",
    PL: "Check112",
    SP: "Check113",
    PC: "Check114",
    PA: "Check115",
    PM: "Check116",
    PT: "Check117",
    PP: "Check122",
    PD: "Check123",
    DP: "Check124",

    // ======== DECOR / CONVENIENCE (checkboxes) ========
    AC: "Check80",    DA: "Check125",  CL: "Check64",   RD: "Check198",
    IW: "Check65",    TW: "Check66",   TL: "Check67",   CC: "Check68",
    KE: "Check69",    CN: "Check70",   CO: "Check71",   EC: "Check72",
    NV: "Check73",    C2: "Check74",   HU: "Check75",   WT: "Check76",
    EI: "Check77",    IB: "Check78",   MC: "Check79",   MM: "Check199",
    RJ: "Check126",

    // ======== SEATING (checkboxes) ========
    CS: "Check127",  LS: "Check128",  RL: "Check129",  BS: "Check130",
    SH: "Check131",  RH: "Check132",  "3S": "Check118", "3P": "Check133",
    R3: "Check89",   "2P": "Check90",  "5P": "Check91",  B2: "Check92",
    B4: "Check93",   B6: "Check94",

    // ======== RADIO (checkboxes) ========
    AM: "Check95",   FM: "Check96",   ST: "Check97",   CA: "Check98",
    SE: "Check99",   CD: "Check100",  SK: "Check101",  UR: "Check102",
    XM: "Check226",  TQ: "Check104",  M3: "Check105",  EQ: "Check134",

    // ======== WHEELS (checkboxes) ========
    AW: "Check135",  CJ: "Check136",  W2: "Check137",  DC: "Check138",
    FC: "Check139",  SA: "Check140",  SY: "Check141",  WW: "Check142",
    WC: "Check144",  RW: "Check146",  KW: "Check145",  LC: "Check149",

    // ======== ROOF (checkboxes) ========
    EG: "Check148",  ES: "Check162",  OR: "Check159",  SD: "Check150",
    MS: "Check151",  MG: "Check152",  FR: "Check153",  TT: "Check154",
    GT: "Check157",  VP: "Check158",  RM: "Check147",  VR: "Check155",
    RF: "Check163",  LR: "Check160",  LP: "Check161",  PV: "Check223",
    HT: "Check164",

    // ======== SAFETY / BRAKES (checkboxes) ========
    AG: "Check165",  RG: "Check166",  XG: "Check167",  ZG: "Check168",
    DG: "Check170",  TD: "Check172",  VZ: "Check173",  IC: "Check174",
    PJ: "Check175",  PX: "Check176",  AB: "Check177",  A2: "Check178",
    DB: "Check179",  RB: "Check171",  TX: "Check180",  T1: "Check169",
    AL: "Check181",

    // ======== EXTERIOR / PAINT / GLASS (checkboxes) ========
    RR: "Check182",  WG: "Check183",  WP: "Check184",  "2T": "Check185",
    HP: "Check186",  IP: "Check187",  MP: "Check188",  SL: "Check189",
    FL: "Check190",  TG: "Check191",  DT: "Check192",  BN: "Check193",
    DM: "Check194",  HM: "Check195",  HV: "Check196",  MX: "Check202",

    // ======== OTHER (checkboxes) ========
    OTHER_BD: "Check120",  UP: "Check200",  XE: "Check201",  AR: "Check203",
    BL: "Check204",  BY: "Check205",  CP: "Check206",  GG: "Check207",
    SB: "Check208",  SS: "Check209",  SW: "Check119",  PG: "Check210",
    TB: "Check224",  TN: "Check211",  TZ: "Check212",  TP: "Check213",
    WD: "Check214",  XT: "Check217",  OTHER_BC: "Check218", BG: "Check219",
    EM: "Check220",  SG: "Check221",

    // ======== CONDITION RATINGS (checkboxes) ========
    // Scale: 0=Below Average, 1=Normal, 2=Above Average, 3=Exceptional
    SEATS_0: "Check231",        SEATS_1: "Check233",        SEATS_2: "Check234",        SEATS_3: "Check235",
    SEATS_COMMENT: "Text43",

    CARPET_0: "Check232",       CARPET_1: "Check74 Copy 1", CARPET_2: "Check75 Copy 1", CARPET_3: "Check76 Copy 1",
    CARPET_COMMENT: "Text44",

    DASHBOARD_0: "Check77 Copy 1", DASHBOARD_1: "Check78 Copy 1", DASHBOARD_2: "Check79 Copy 1", DASHBOARD_3: "Check80 Copy 1",
    DASHBOARD_COMMENT: "Text45",

    HEADLINER_0: "Check81",     HEADLINER_1: "Check82",     HEADLINER_2: "Check83",     HEADLINER_3: "Check84",
    HEADLINER_COMMENT: "Text46",

    SHEET_METAL_0: "Check85",   SHEET_METAL_1: "Check86",   SHEET_METAL_2: "Check87",   SHEET_METAL_3: "Check88",
    SHEET_METAL_COMMENT: "Text47",

    TRIM_0: "Check94 Copy 1",   TRIM_1: "Check95 Copy 1",   TRIM_2: "Check96 Copy 1",   TRIM_3: "Check97 Copy 1",
    TRIM_COMMENT: "Text48",

    PAINT_0: "Check98 Copy 1",  PAINT_1: "Check99 Copy 1",  PAINT_2: "Check100 Copy 1", PAINT_3: "Check101 Copy 1",
    PAINT_COMMENT: "Text49",

    GLASS_0: "Check102 Copy 1", GLASS_1: "Check103",        GLASS_2: "Check104 Copy 1", GLASS_3: "Check105 Copy 1",
    GLASS_COMMENT: "Text50",

    ENGINE_0: "Check106",       ENGINE_1: "Check107",        ENGINE_2: "Check121",        ENGINE_3: "Check124 Copy 1",
    ENGINE_COMMENT: "Text51",

    TRANSMISSION_0: "Check125 Copy 1", TRANSMISSION_1: "Check134 Copy 1", TRANSMISSION_2: "Check135 Copy 1", TRANSMISSION_3: "Check136 Copy 1",
    TRANSMISSION_COMMENT: "Text52",

    FRONT_TIRES_0: "Check137 Copy 1", FRONT_TIRES_1: "Check138 Copy 1", FRONT_TIRES_2: "Check139 Copy 1", FRONT_TIRES_3: "Check140 Copy 1",
    FRONT_TIRES_COMMENT: "Text53",

    REAR_TIRES_0: "Check141 Copy 1", REAR_TIRES_1: "Check142 Copy 1", REAR_TIRES_2: "Check143",          REAR_TIRES_3: "Check144 Copy 1",
    REAR_TIRES_COMMENT: "Text54",

    // ======== REFURBISHMENT (text + checkboxes) ========
    REF_TRANS_PURCHASE_PRICE: "Text24",    REF_TRANS_MILEAGE: "Text25",
    REF_ENGINE_PURCHASE_PRICE: "Text26",   REF_ENGINE_MILEAGE: "Text27",
    REF_TIRES_PURCHASE_PRICE: "Text28",    REF_TIRES_COUNT: "Text29",
    REF_PAINT_BASIC: "Check237",           REF_PAINT_STANDARD: "Check238",
    REF_PAINT_CUSTOM: "Check236",          REF_PAINT_DATE: "Text69",
    REF_PAINT_PURCHASE_PRICE: "Text70",    REF_INTERIOR_PURCHASE_PRICE: "Text31",
    REF_INTERIOR_DATE: "Text30",           REF_INTERIOR_VINYL: "Check229",
    REF_INTERIOR_CLOTH: "Check228",        REF_INTERIOR_LEATHER: "Check227",
    REF_CAMPER_SHELL_PURCHASE_PRICE: "Text33", REF_CAMPER_SHELL_DATE: "Text32",
    REF_CARPET_KIT_PURCHASE_PRICE: "Text34",   REF_CARPET_KIT_DATE: "Text35",
    REF_SPECIAL_WHEELS_PURCHASE_PRICE: "Text37", REF_SPECIAL_WHEELS_DATE: "Text36",
    REF_OTHER_DESCRIPTION: "Text38",       REF_OTHER_PURCHASE_PRICE: "Text39",
    REF_OTHER_DATE: "Text40",              RESTORED_AMOUNT: "Text41",

    // ======== ADJUSTMENTS (text fields) ========
    PRE_TAX_ADJ1_DESC: "Text55",     PRE_TAX_ADJ1_ADD: "Text60",     PRE_TAX_ADJ1_DEDUCT: "Text61",
    PRE_TAX_ADJ2_DESC: "Text56",     PRE_TAX_ADJ2_ADD: "Text68",     PRE_TAX_ADJ2_DEDUCT: "Text65",
    POST_TAX_ADJ1_DESC: "Text57",    POST_TAX_ADJ1_ADD: "Text63",    POST_TAX_ADJ1_DEDUCT: "Text66",
    POST_TAX_ADJ2_DESC: "Text58",    POST_TAX_ADJ2_ADD: "Text64",    POST_TAX_ADJ2_DEDUCT: "Text67",

    // Page 2 duplicate
    CLAIM_NUMBER_P2: "Text73",
};
