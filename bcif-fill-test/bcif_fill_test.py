#!/usr/bin/env python3
"""
BCIF Form Fill End-to-End Test
==============================
Self-contained script: CCC Estimate PDF → parsed data → token map → filled BCIF .docx

Usage:
    python bcif_fill_test.py                         # processes all PDFs in input/
    python bcif_fill_test.py path/to/estimate.pdf    # processes a specific PDF
    python bcif_fill_test.py --verify                # verify last output + open HTML report
    python bcif_fill_test.py --verify path/to/filled.docx  # verify a specific .docx

Dependencies:
    pip install pdfplumber

Template:
    Uses ../claim_cipher_app/forms/bcif/BCIF_AUTOMATION_TEMPLATE_v3.docx
"""

import os
import re
import sys
import zipfile
from io import BytesIO
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    print("ERROR: pdfplumber not installed. Run: pip install pdfplumber")
    sys.exit(1)

# ─────────────────────────────────────────────────────────
#  PATHS
# ─────────────────────────────────────────────────────────

SCRIPT_DIR = Path(__file__).parent
INPUT_DIR = SCRIPT_DIR / "input"
OUTPUT_DIR = SCRIPT_DIR / "output"
TEMPLATE_PATH = SCRIPT_DIR.parent / "claim_cipher_app" / "forms" / "bcif" / "BCIF_AUTOMATION_TEMPLATE_v3.docx"

INPUT_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

# No TOKEN_TO_FIELD map needed — the template uses {{TOKEN}} text placeholders directly.

# ─────────────────────────────────────────────────────────
#  1. PDF TEXT EXTRACTION
# ─────────────────────────────────────────────────────────

def extract_text(pdf_path: str) -> str:
    """Extract all text from a PDF using pdfplumber."""
    pages = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                pages.append(text)
    return "\n".join(pages)


# ─────────────────────────────────────────────────────────
#  2. CCC ESTIMATE PARSER (ported from cccParser.js)
# ─────────────────────────────────────────────────────────

def normalize_ws(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n").replace("\t", " ")
    text = text.replace("\u00A0", " ")
    return re.sub(r" {2,}", " ", text)


def extract_field(text, pattern):
    m = re.search(pattern, text, re.IGNORECASE)
    return m.group(1).strip() if m else ""


def extract_field_same_line(text, anchor_pattern):
    m = re.search(anchor_pattern, text, re.IGNORECASE)
    if not m:
        return ""
    after = text[m.end():]
    same_line = re.match(r"[^\n]*\S[^\n]*", after)
    if same_line:
        return same_line.group(0).strip()
    next_line = re.search(r"\n[ \t]*(\S[^\n]*)", after)
    if next_line:
        candidate = next_line.group(1).strip()
        if re.match(r"^[A-Za-z].*[#:]", candidate):
            return ""
        return candidate
    return ""


def extract_vin(text):
    m = re.search(r"VIN\s*:\s*([A-HJ-NPR-Z0-9]{17})", text, re.IGNORECASE)
    return m.group(1).upper() if m else ""


def extract_mileage(text):
    m = re.search(r"Odometer\s*:\s*([\d,]+)", text, re.IGNORECASE)
    return m.group(1).replace(",", "") if m else ""


def extract_vehicle_desc_line(text):
    m = re.search(r"VEHICLE\s*\n\s*(\d{4}\s+[A-Z].+)", text, re.IGNORECASE)
    if m:
        return m.group(1).strip()
    m = re.search(r"(\d{4}\s+[A-Z]{2,}\s+\S+\s+\S+\s+\S+\s+\S+\s+\S+[^\n]+)", text)
    return m.group(1).strip() if m else ""


def extract_owner(text):
    m = re.search(r"Owner\s*:\s*([A-Z][A-Za-z',.\- ]+)", text)
    return m.group(1).strip() if m else ""


def extract_insured(text):
    m = re.search(r"Insured\s*:\s*([A-Z][A-Za-z',.\- ]+)", text)
    return m.group(1).strip() if m else ""


def extract_carrier(text):
    header = text.split("Preliminary Estimate")[0] if "Preliminary Estimate" in text else text
    for line in header.split("\n"):
        line = line.strip()
        if re.search(r"INSURANCE|MUTUAL|INDEMNITY|CASUALTY|ASSURANCE", line, re.IGNORECASE):
            return line
    return ""


def extract_location(text):
    idx = re.search(r"Inspection\s+Location\s*:", text, re.IGNORECASE)
    if not idx:
        return ""
    window = text[idx.end():idx.end() + 400]
    lines = [l.strip() for l in window.split("\n") if l.strip()]
    for line in lines:
        if re.match(r"^\d+\s+[A-Za-z]", line):
            return line
        if re.match(r"^[A-Za-z]+,?\s+[A-Z]{2}\s+\d{5}", line):
            return line
    return ""


def extract_condition(text):
    m = re.search(r"Condition\s*:\s*(Excellent|Good|Fair|Poor)", text, re.IGNORECASE)
    return m.group(1).capitalize() if m else ""


def extract_estimate_total(text):
    for pattern in [
        r"Total\s+Cost\s+of\s+Repairs\s*[\s:]*\$?\s*([\d,]+\.?\d*)",
        r"Net\s+Cost\s+of\s+Repairs\s*[\s:]*\$?\s*([\d,]+\.?\d*)",
        r"Subtotal\s*[\s:]*\$?\s*([\d,]+\.?\d*)",
    ]:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            return float(m.group(1).replace(",", ""))
    return 0.0


def extract_options(text):
    """Extract feature/option lines from the equipment section."""
    options = []
    m = re.search(
        r"TRANSMISSION[\s\S]*?(?=Line\s+Oper|FRONT\s+BUMPER|Subtotal|ALTERNATE\s+PARTS)",
        text, re.IGNORECASE
    )
    if not m:
        return options
    headers = {
        "TRANSMISSION", "POWER", "SEATS", "WHEELS", "PAINT",
        "SAFETY", "DECOR", "CONVENIENCE", "RADIO", "OTHER",
        "ROOF", "TRUCK", "EXTERIOR", "INTERIOR", "BRAKES",
        "OPTIONS", "EQUIPMENT", "FEATURES",
    }
    for line in m.group(0).split("\n"):
        line = line.strip()
        if line.upper() in headers:
            continue
        if len(line) < 3:
            continue
        if re.match(r"^\d", line):
            continue
        options.append(line)
    return options


def parse_ccc_text(raw_text: str) -> dict:
    """Parse a CCC Preliminary Estimate from raw text."""
    text = normalize_ws(raw_text)
    desc = extract_vehicle_desc_line(text)
    year_m = re.match(r"^(\d{4})\b", desc) if desc else None
    make_m = re.match(r"^\d{4}\s+(\S+)", desc) if desc else None
    model_m = re.match(r"^\d{4}\s+\S+\s+(\S+)", desc) if desc else None

    return {
        "ownerName": extract_owner(text),
        "insuredName": extract_insured(text),
        "carrierName": extract_carrier(text),
        "claimNumber": extract_field_same_line(text, r"claim\s*#\s*:?"),
        "policyNumber": extract_field_same_line(text, r"policy\s*#\s*:?"),
        "dateOfLoss": extract_field(text, r"date\s+of\s+loss\s*:?\s*(.+)"),
        "inspectionLocation": extract_location(text),
        "year": year_m.group(1) if year_m else "",
        "make": make_m.group(1) if make_m else "",
        "model": model_m.group(1) if model_m else "",
        "vin": extract_vin(text),
        "mileage": extract_mileage(text),
        "conditionRating": extract_condition(text),
        "lossType": extract_field(text, r"type\s+of\s+loss\s*:?\s*(.+)"),
        "estimateTotal": extract_estimate_total(text),
        "options": extract_options(text),
    }


# ─────────────────────────────────────────────────────────
#  3. OPTIONS → TOKEN MAPPER (ported from bcifPayloadBuilder.js)
# ─────────────────────────────────────────────────────────

OPTION_RULES = [
    ("PS", [r"power\s*steering"]),
    ("PB", [r"power\s*brakes?"]),
    ("PW", [r"power\s*windows?"]),
    ("PL", [r"power\s*locks?"]),
    ("SP", [r"power\s*(driver|drv)\s*seat"]),
    ("PC", [r"power\s*(passenger|pass)\s*seat"]),
    ("PA", [r"power\s*antenna"]),
    ("PM", [r"power\s*mirrors?"]),
    ("PT", [r"power\s*(trunk|gate|liftgate|hatch)"]),
    ("PP", [r"power\s*adjustable\s*pedals?"]),
    ("PD", [r"power\s*sliding\s*door"]),
    ("DP", [r"dual\s*power\s*sliding\s*doors?"]),
    ("AC", [r"\bair\s*conditioning\b", r"\bac\b"]),
    ("DA", [r"dual\s*air\s*conditioning", r"dual\s*a/c"]),
    ("CL", [r"climate\s*control"]),
    ("RD", [r"rear\s*defogger", r"rear\s*defroster"]),
    ("IW", [r"intermittent\s*wipers?"]),
    ("TW", [r"tilt\s*wheel"]),
    ("TL", [r"telescopic\s*wheel"]),
    ("CC", [r"cruise\s*control"]),
    ("KE", [r"keyless\s*entry"]),
    ("CN", [r"console[/\s]*storage"]),
    ("CO", [r"overhead\s*console"]),
    ("EC", [r"entertainment\s*center"]),
    ("NV", [r"navigation\s*system", r"\bnav\b"]),
    ("C2", [r"communications?\s*system", r"telematics"]),
    ("HU", [r"heads?\s*up\s*display", r"hud"]),
    ("WT", [r"wood\s*(interior|trim)"]),
    ("EI", [r"electronic\s*instrumentation"]),
    ("IB", [r"on\s*board\s*computer", r"onboard\s*computer"]),
    ("MC", [r"message\s*center"]),
    ("MM", [r"memory\s*(package|seat|settings)"]),
    ("RJ", [r"remote\s*start"]),
    ("SAFETY_BC", [r"backup\s*camera", r"back[-\s]*up\s*camera", r"rearview\s*camera"]),
    ("SV", [r"surround\s*view", r"360\s*camera"]),
    ("HL", [r"home\s*link", r"homelink"]),
    ("CS", [r"cloth\s*seats?"]),
    ("LS", [r"leather\s*seats?"]),
    ("RL", [r"reclining\s*seats?"]),
    ("BS", [r"bucket\s*seats?"]),
    ("SH", [r"heated\s*seats?"]),
    ("RH", [r"rear\s*heated\s*seats?"]),
    ("3S", [r"3rd\s*row\s*seat", r"third\s*row\s*seat"]),
    ("3P", [r"power\s*third\s*seat", r"power\s*3rd\s*seat"]),
    ("R3", [r"retractable\s*seats?"]),
    ("2P", [r"12\s*passenger"]),
    ("5P", [r"15\s*passenger"]),
    ("B2", [r"captain\s*chairs?\s*\(?2\)?"]),
    ("B4", [r"captain\s*chairs?\s*\(?4\)?"]),
    ("B6", [r"captain\s*chairs?\s*\(?6\)?"]),
    ("VS", [r"ventilated\s*seats?"]),
    ("AM", [r"\bam\s*radio\b"]),
    ("FM", [r"\bfm\s*radio\b"]),
    ("ST", [r"stereo"]),
    ("CA", [r"cassette"]),
    ("SE", [r"search[/]?seek"]),
    ("CD", [r"cd\s*player"]),
    ("SK", [r"cd\s*changer", r"cd\s*stacker"]),
    ("UR", [r"premium\s*radio"]),
    ("XM", [r"satellite\s*radio", r"\bxm\b"]),
    ("TQ", [r"steering\s*wheel\s*touch\s*controls?"]),
    ("M3", [r"aux(iliary)?\s*audio", r"aux\s*input"]),
    ("EQ", [r"equalizer"]),
    ("AW", [r"aluminum|alloy\s*wheels?"]),
    ("CJ", [r"chrome\s*wheels?"]),
    ("W2", [r"20.*wheels?", r"20\s*inch\s*wheels?"]),
    ("DC", [r"deluxe\s*wheel\s*covers?"]),
    ("FC", [r"full\s*wheel\s*covers?"]),
    ("SA", [r"spoke\s*aluminum\s*wheels?"]),
    ("SY", [r"styled\s*steel\s*wheels?"]),
    ("WW", [r"wire\s*wheels?"]),
    ("WC", [r"wire\s*wheel\s*covers?"]),
    ("RW", [r"rally\s*wheels?"]),
    ("KW", [r"locking\s*wheels?"]),
    ("LC", [r"locking\s*wheel\s*covers?"]),
    ("EG", [r"electric\s*glass\s*roof"]),
    ("ES", [r"electric\s*steel\s*roof"]),
    ("OR", [r"skyview\s*roof"]),
    ("SD", [r"dual\s*(power\s*)?sunroof"]),
    ("MS", [r"manual\s*steel\s*roof"]),
    ("MG", [r"manual\s*glass\s*roof"]),
    ("FR", [r"flip\s*roof"]),
    ("TT", [r"t-?top"]),
    ("GT", [r"glass\s*t-?top"]),
    ("VP", [r"power\s*convertible\s*roof"]),
    ("RM", [r"detachable\s*roof"]),
    ("VR", [r"vinyl\s*covered\s*roof"]),
    ("RF", [r"cabriolet\s*roof"]),
    ("LR", [r"landau\s*roof"]),
    ("LP", [r"padded\s*landau\s*roof"]),
    ("PV", [r"padded\s*vinyl\s*roof"]),
    ("HT", [r"hard\s*top"]),
    ("AG", [r"driver.*air\s*bag"]),
    ("RG", [r"passenger\s*air\s*bag"]),
    ("XG", [r"front\s*side\s*impact\s*air\s*bags?"]),
    ("ZG", [r"rear\s*side\s*impact\s*air\s*bags?"]),
    ("DG", [r"head[/]?curtain\s*air\s*bags?", r"curtain\s*air\s*bags?"]),
    ("TD", [r"alarm", r"anti[-\s]*theft"]),
    ("VZ", [r"night\s*vision"]),
    ("IC", [r"intelligent\s*cruise", r"adaptive\s*cruise"]),
    ("PJ", [r"parking\s*sensors?"]),
    ("AB", [r"anti[-\s]*lock\s*brakes?", r"\babs\b"]),
    ("DB", [r"4[-\s]*wheel\s*disc\s*brakes?"]),
    ("RB", [r"roll\s*bar"]),
    ("TX", [r"traction\s*control"]),
    ("T1", [r"stability\s*control"]),
    ("AL", [r"auto\s*level"]),
    ("SAFETY_BD", [r"blind\s*spot"]),
    ("LW", [r"lane\s*departure"]),
    ("RR", [r"roof\s*rack", r"luggage\s*rack"]),
    ("WG", [r"woodgrain"]),
    ("WP", [r"rear\s*window\s*wiper"]),
    ("2T", [r"two[-\s]*tone\s*paint"]),
    ("HP", [r"three\s*stage\s*paint"]),
    ("IP", [r"clearcoat\s*paint", r"clear\s*coat"]),
    ("MP", [r"metallic\s*paint"]),
    ("SL", [r"rear\s*spoiler"]),
    ("FL", [r"fog\s*lamps?"]),
    ("TG", [r"tinted\s*glass"]),
    ("DT", [r"privacy\s*glass", r"dark\s*tint"]),
    ("BN", [r"body\s*side\s*moldings?"]),
    ("DM", [r"dual\s*mirrors?"]),
    ("HM", [r"heated\s*mirrors?"]),
    ("HV", [r"headlamp\s*washers?"]),
    ("MX", [r"signal\s*integrated\s*mirrors?"]),
    ("OTHER_BD", [r"running\s*boards?", r"side\s*steps?"]),
    ("UP", [r"power\s*retractable\s*running\s*boards?"]),
    ("XE", [r"xenon\s*headlamps?"]),
    ("AR", [r"bed\s*rails?"]),
    ("BL", [r"bedliner"]),
    ("BY", [r"spray[-\s]*on\s*bedliner"]),
    ("CP", [r"deluxe\s*truck\s*cap"]),
    ("GG", [r"grill[e]?\s*guard"]),
    ("SB", [r"rear\s*step\s*bumper"]),
    ("SS", [r"swivel\s*seats?"]),
    ("SW", [r"rear\s*sliding\s*window"]),
    ("PG", [r"power\s*rear\s*window"]),
    ("TB", [r"permanent\s*tool\s*box"]),
    ("TN", [r"soft\s*tonneau"]),
    ("TZ", [r"hard\s*tonneau"]),
    ("TP", [r"trailering\s*package", r"towing\s*package"]),
    ("WD", [r"dual\s*rear\s*wheels?", r"dually"]),
    ("XT", [r"auxiliary\s*fuel\s*tank"]),
    ("OTHER_BC", [r"bumper\s*cushions?"]),
    ("BG", [r"bumper\s*guards?"]),
    ("EM", [r"california\s*emissions"]),
    ("SG", [r"stone\s*guard"]),
    ("WI", [r"winch"]),
    ("DE", [r"deluxe\s*equipment"]),
]


def map_options_to_tokens(raw_options: list) -> list:
    """Map raw option strings to BCIF 2-char tokens."""
    tokens = set()
    for option in raw_options:
        text = str(option or "").strip()
        if not text:
            continue
        for token, patterns in OPTION_RULES:
            if any(re.search(p, text, re.IGNORECASE) for p in patterns):
                tokens.add(token)
    return list(tokens)


# ─────────────────────────────────────────────────────────
#  4. TOKEN MAP BUILDER
# ─────────────────────────────────────────────────────────

def condition_rating_to_int(rating_str: str) -> int:
    """Map condition string to 0-3 scale."""
    r = (rating_str or "").lower()
    if "excellent" in r or "exceptional" in r:
        return 3
    if "good" in r or "above" in r:
        return 2
    if "fair" in r or "normal" in r:
        return 1
    if "poor" in r or "below" in r:
        return 0
    return 1  # default Normal


def extract_state(location: str) -> str:
    m = re.search(r"\b([A-Z]{2})\b", location or "")
    return m.group(1) if m else ""


def normalize_body(desc: str) -> str:
    """Infer body style from vehicle description line."""
    d = desc.upper()
    if "CONVERT" in d:
        return "BODY_CONVERTIBLE"
    if "HATCH" in d:
        return "BODY_HATCHBACK"
    if "PICKUP" in d or "TRUCK" in d:
        return "BODY_PICKUP"
    if "UTIL" in d or "SUV" in d:
        return "BODY_UTILITY"
    if "VAN" in d:
        return "BODY_VAN"
    if "WAGON" in d:
        return "BODY_WAGON"
    if "2DR" in d or "2 DR" in d or "COUPE" in d:
        return "BODY_2DR"
    if "4DR" in d or "4 DR" in d or "SEDAN" in d:
        return "BODY_4DR"
    return ""


def build_token_map(parsed: dict) -> dict:
    """Build the flat BCIF token map from parsed CCC estimate data."""
    m = {}

    # Claim text fields
    m["CLAIM_NUMBER"] = parsed.get("claimNumber", "")
    m["CLAIM_NUMBER_P2"] = parsed.get("claimNumber", "")
    m["INSURED_NAME"] = parsed.get("insuredName", "") or parsed.get("carrierName", "")
    m["OWNER_NAME"] = parsed.get("ownerName", "") or parsed.get("carrierName", "")
    m["OWNER_PHONE"] = ""
    m["ADJR_NAME"] = ""
    m["APPR_NAME"] = ""
    m["DATE_OF_LOSS"] = parsed.get("dateOfLoss", "")
    m["OFFICE_ID"] = ""
    m["LOSS_STATE"] = extract_state(parsed.get("inspectionLocation", ""))
    m["LOSS_ZIP_CODE"] = ""

    # Vehicle text fields
    m["YEAR"] = str(parsed.get("year", ""))
    m["MAKE"] = parsed.get("make", "")
    m["MODEL"] = parsed.get("model", "")
    m["VIN"] = parsed.get("vin", "")
    m["MILEAGE"] = parsed.get("mileage", "")
    m["ENGINE_SIZE"] = ""
    m["SPECIAL_FEATURES"] = ""

    # Loss type
    lt = (parsed.get("lossType", "") or "").upper()
    m["LOSS_TYPE_THEFT"] = "X" if "THEFT" in lt else ""
    m["LOSS_TYPE_OTHER"] = "X" if (lt and "THEFT" not in lt) else ""

    # Coverage — default to OTHER since CCC estimates don't usually specify coverage
    m["COVERAGE_COLLISION"] = ""
    m["COVERAGE_COMPREHENSIVE"] = ""
    m["COVERAGE_LIABILITY"] = ""
    m["COVERAGE_OTHER"] = "X"

    # Leased / Third party defaults
    m["LEASED_YES"] = ""
    m["LEASED_NO"] = "X"
    m["THIRD_PARTY_YES"] = ""
    m["THIRD_PARTY_NO"] = "X"

    # Body style
    desc = extract_vehicle_desc_line(normalize_ws(
        extract_text.__doc__ or ""  # dummy — we'll use the raw text later
    )) if False else ""
    body_styles = ["BODY_2DR", "BODY_4DR", "BODY_CONVERTIBLE", "BODY_HATCHBACK",
                   "BODY_PICKUP", "BODY_UTILITY", "BODY_VAN", "BODY_WAGON"]
    body = normalize_body(f"{parsed.get('year','')} {parsed.get('make','')} {parsed.get('model','')}")
    for bs in body_styles:
        m[bs] = "X" if bs == body else ""

    # Truck config — empty defaults
    for tc in ["TRUCK_HALF_TON", "TRUCK_THREE_QUARTER_TON", "TRUCK_ONE_TON",
               "TRUCK_SHORT_BED", "TRUCK_LONG_BED", "TRUCK_CAB_CHASSIS", "TRUCK_FLEETSIDE"]:
        m[tc] = ""

    # Cylinders — empty defaults
    for c in ["CYL_3", "CYL_4", "CYL_5", "CYL_6", "CYL_8", "CYL_10", "CYL_12"]:
        m[c] = ""

    # Transmission — empty defaults
    for t in ["TRANS_AUTO", "TRANS_OD", "TRANS_S3", "TRANS_S4", "TRANS_S5", "TRANS_S6", "TRANS_4W"]:
        m[t] = ""
    m["DIESEL"] = ""
    m["TURBO"] = ""

    # Condition ratings — apply overall rating to all categories
    rating = condition_rating_to_int(parsed.get("conditionRating", ""))
    cond_groups = [
        "PAINT", "SHEET_METAL", "GLASS", "TRIM", "SEATS", "CARPET",
        "DASHBOARD", "HEADLINER", "FRONT_TIRES", "REAR_TIRES", "ENGINE", "TRANSMISSION"
    ]
    for prefix in cond_groups:
        for i in range(4):
            m[f"{prefix}_{i}"] = "X" if i == rating else ""
        m[f"{prefix}_COMMENT"] = ""

    # Options
    option_tokens = set(map_options_to_tokens(parsed.get("options", [])))
    all_option_codes = [
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
    ]
    for code in all_option_codes:
        m[code] = "X" if code in option_tokens else ""
    # Multi-char option tokens
    m["OTHER_BC"] = "X" if "OTHER_BC" in option_tokens else ""
    m["OTHER_BD"] = "X" if "OTHER_BD" in option_tokens else ""
    m["SAFETY_BC"] = "X" if "SAFETY_BC" in option_tokens else ""
    m["SAFETY_BD"] = "X" if "SAFETY_BD" in option_tokens else ""

    # Refurbishment — empty defaults
    ref_text = [
        "REF_ENGINE_MILEAGE", "REF_ENGINE_PURCHASE_PRICE",
        "REF_TRANS_MILEAGE", "REF_TRANS_PURCHASE_PRICE",
        "REF_PAINT_DATE", "REF_PAINT_PURCHASE_PRICE",
        "REF_INTERIOR_DATE", "REF_INTERIOR_PURCHASE_PRICE",
        "REF_CARPET_KIT_DATE", "REF_CARPET_KIT_PURCHASE_PRICE",
        "REF_TIRES_COUNT", "REF_TIRES_PURCHASE_PRICE",
        "REF_SPECIAL_WHEELS_DATE", "REF_SPECIAL_WHEELS_PURCHASE_PRICE",
        "REF_CAMPER_SHELL_DATE", "REF_CAMPER_SHELL_PURCHASE_PRICE",
        "REF_OTHER_DATE", "REF_OTHER_DESCRIPTION", "REF_OTHER_PURCHASE_PRICE",
        "RESTORED_AMOUNT",
    ]
    for t in ref_text:
        m[t] = ""
    ref_chk = [
        "REF_PAINT_BASIC", "REF_PAINT_STANDARD", "REF_PAINT_CUSTOM",
        "REF_INTERIOR_VINYL", "REF_INTERIOR_CLOTH", "REF_INTERIOR_LEATHER",
    ]
    for t in ref_chk:
        m[t] = ""

    # Adjustments — empty defaults
    adj = [
        "PRE_TAX_ADJ1_DESC", "PRE_TAX_ADJ1_ADD", "PRE_TAX_ADJ1_DEDUCT",
        "PRE_TAX_ADJ2_DESC", "PRE_TAX_ADJ2_ADD", "PRE_TAX_ADJ2_DEDUCT",
        "POST_TAX_ADJ1_DESC", "POST_TAX_ADJ1_ADD", "POST_TAX_ADJ1_DEDUCT",
        "POST_TAX_ADJ2_DESC", "POST_TAX_ADJ2_ADD", "POST_TAX_ADJ2_DEDUCT",
    ]
    for t in adj:
        m[t] = ""

    return m


# ─────────────────────────────────────────────────────────
#  5. DOCX {{TOKEN}} FILLER (handles split-run problem)
# ─────────────────────────────────────────────────────────
#
# The BCIF_AUTOMATION_TEMPLATE_v3.docx uses {{TOKEN}} text placeholders
# embedded in the document body. Word splits these across multiple
# <w:r> (run) elements, e.g.:
#   Run 1: <w:t>{{</w:t>
#   Run 2: <w:t>CLAIM_NUMBER</w:t>
#   Run 3: <w:t>}}</w:t>
#
# Strategy:
# 1. For each <w:p> paragraph, extract all <w:t> text across runs
# 2. Concatenate to form the full paragraph text
# 3. If the text contains {{TOKEN}}, do replacement
# 4. Put the replaced text into the FIRST run's <w:t>, clear the rest

def xml_escape(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )


def fill_tokens_in_xml(xml: str, token_map: dict) -> tuple:
    """
    Replace all {{TOKEN}} placeholders in the document XML.

    Handles Word's split-run problem by merging text across runs
    within each paragraph, performing replacements, then writing
    the result back into the first run and clearing subsequent runs.

    Returns (modified_xml, fill_count) where fill_count is the number
    of tokens that were successfully replaced.
    """
    fill_count = 0

    # Process each paragraph
    para_pattern = re.compile(r'(<w:p\b[^>]*>)(.*?)(</w:p>)', re.DOTALL)

    def process_paragraph(para_match):
        nonlocal fill_count
        p_open = para_match.group(1)
        p_inner = para_match.group(2)
        p_close = para_match.group(3)

        # Extract all <w:t> elements with their positions relative to p_inner
        # We need to find runs (<w:r>) and their <w:t> children
        t_pattern = re.compile(r'(<w:t[^>]*>)(.*?)(</w:t>)', re.DOTALL)
        t_matches = list(t_pattern.finditer(p_inner))

        if not t_matches:
            return para_match.group(0)

        # Concatenate all <w:t> text content
        full_text = "".join(m.group(2) for m in t_matches)

        # Check if this paragraph has any {{TOKEN}} placeholders
        if "{{" not in full_text:
            return para_match.group(0)

        # Perform replacements
        replaced_text = full_text
        for token_name, value in token_map.items():
            placeholder = "{{" + token_name + "}}"
            if placeholder in replaced_text:
                replaced_text = replaced_text.replace(placeholder, xml_escape(str(value)))
                fill_count += 1

        # If nothing changed, return as-is
        if replaced_text == full_text:
            return para_match.group(0)

        # Put ALL replaced text into the FIRST <w:t>, clear the rest.
        # We rebuild p_inner by replacing each <w:t>...</w:t> occurrence.
        new_inner = p_inner
        # Process in reverse order to maintain string positions
        for i, tm in reversed(list(enumerate(t_matches))):
            start = tm.start()
            end = tm.end()
            if i == 0:
                # First <w:t>: put the full replaced text, ensure xml:space="preserve"
                replacement = f'<w:t xml:space="preserve">{replaced_text}</w:t>'
            else:
                # Subsequent <w:t>s: clear their content
                replacement = f'{tm.group(1)}{tm.group(3)}'
            new_inner = new_inner[:start] + replacement + new_inner[end:]

        return p_open + new_inner + p_close

    xml = para_pattern.sub(process_paragraph, xml)
    return xml, fill_count


def fill_form(template_path: str, token_map: dict, output_path: str):
    """Fill the BCIF .docx template with {{TOKEN}} replacement and save."""
    in_zip = BytesIO(Path(template_path).read_bytes())
    out_zip = BytesIO()
    total_filled = 0

    with zipfile.ZipFile(in_zip, "r") as zin:
        with zipfile.ZipFile(out_zip, "w", zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                data = zin.read(item.filename)
                if item.filename == "word/document.xml":
                    xml = data.decode("utf-8")
                    xml, count = fill_tokens_in_xml(xml, token_map)
                    total_filled += count
                    data = xml.encode("utf-8")
                zout.writestr(item, data)

    Path(output_path).write_bytes(out_zip.getvalue())
    return total_filled


# ─────────────────────────────────────────────────────────
#  MAIN
# ─────────────────────────────────────────────────────────

def process_pdf(pdf_path: str):
    """Full pipeline: PDF → parse → token map → filled DOCX."""
    print(f"\n{'='*60}")
    print(f"  Processing: {os.path.basename(pdf_path)}")
    print(f"{'='*60}")

    # 1. Extract text
    raw_text = extract_text(pdf_path)
    print(f"  Extracted {len(raw_text)} chars from PDF")

    if not raw_text.strip():
        print("  ERROR: No text extracted from PDF")
        return

    # 2. Parse
    parsed = parse_ccc_text(raw_text)
    print(f"  Claim #:  {parsed.get('claimNumber', '(none)')}")
    print(f"  VIN:      {parsed.get('vin', '(none)')}")
    print(f"  Vehicle:  {parsed.get('year', '')} {parsed.get('make', '')} {parsed.get('model', '')}")
    print(f"  Mileage:  {parsed.get('mileage', '(none)')}")
    print(f"  Loss:     {parsed.get('lossType', '(none)')}")
    print(f"  Options:  {len(parsed.get('options', []))} raw lines extracted")

    # 3. Build token map
    token_map = build_token_map(parsed)
    active = {k: v for k, v in token_map.items() if v and v != ""}
    print(f"  Token map: {len(token_map)} total, {len(active)} active")

    # Show active option tokens
    option_active = [k for k in active if len(k) <= 2 or k.startswith("OTHER_") or k.startswith("SAFETY_")]
    option_active = [k for k in option_active if k not in (
        "LOSS_TYPE_OTHER", "LOSS_TYPE_THEFT",
    ) and not k.startswith("COVERAGE_") and not k.startswith("LEASED_")
        and not k.startswith("THIRD_") and not k.startswith("BODY_")
        and not k.startswith("TRUCK_") and not k.startswith("CYL_")
        and not k.startswith("TRANS_")]
    if option_active:
        print(f"  Options matched: {', '.join(sorted(option_active))}")

    # 4. Fill form
    if not TEMPLATE_PATH.exists():
        print(f"  ERROR: Template not found: {TEMPLATE_PATH}")
        return

    claim_num = parsed.get("claimNumber", "").replace("/", "-").replace("\\", "-") or "UNKNOWN"
    output_name = f"BCIF_{claim_num}.docx"
    output_path = OUTPUT_DIR / output_name

    filled_count = fill_form(str(TEMPLATE_PATH), token_map, str(output_path))
    size_kb = output_path.stat().st_size / 1024
    print(f"  Tokens filled: {filled_count}")
    print(f"  OUTPUT: {output_path} ({size_kb:.1f} KB)")
    print(f"  SUCCESS")


# ─────────────────────────────────────────────────────────
#  6. VERIFY & HTML REPORT
# ─────────────────────────────────────────────────────────

# Organized token groups for the HTML report — matches the BCIF form layout
TOKEN_SECTIONS = [
    ("Claim Info", [
        "CLAIM_NUMBER", "CLAIM_NUMBER_P2", "OFFICE_ID", "ADJR_NAME", "APPR_NAME",
        "INSURED_NAME", "OWNER_NAME", "OWNER_PHONE", "DATE_OF_LOSS",
        "LOSS_STATE", "LOSS_ZIP_CODE",
    ]),
    ("Loss Type", [
        "LOSS_TYPE_THEFT", "LOSS_TYPE_OTHER",
    ]),
    ("Coverage", [
        "COVERAGE_COLLISION", "COVERAGE_COMPREHENSIVE",
        "COVERAGE_LIABILITY", "COVERAGE_OTHER",
    ]),
    ("Third Party / Leased", [
        "THIRD_PARTY_YES", "THIRD_PARTY_NO", "LEASED_YES", "LEASED_NO",
    ]),
    ("Vehicle", [
        "YEAR", "MAKE", "MODEL", "VIN", "MILEAGE", "ENGINE_SIZE", "SPECIAL_FEATURES",
    ]),
    ("Body Style", [
        "BODY_2DR", "BODY_4DR", "BODY_HATCHBACK", "BODY_CONVERTIBLE",
        "BODY_WAGON", "BODY_PICKUP", "BODY_VAN", "BODY_UTILITY",
    ]),
    ("Truck Config", [
        "TRUCK_HALF_TON", "TRUCK_THREE_QUARTER_TON", "TRUCK_ONE_TON",
        "TRUCK_SHORT_BED", "TRUCK_LONG_BED", "TRUCK_CAB_CHASSIS", "TRUCK_FLEETSIDE",
    ]),
    ("Engine / Trans", [
        "CYL_3", "CYL_4", "CYL_5", "CYL_6", "CYL_8", "CYL_10", "CYL_12",
        "TURBO", "DIESEL",
        "TRANS_AUTO", "TRANS_OD", "TRANS_S3", "TRANS_S4", "TRANS_S5", "TRANS_S6", "TRANS_4W",
    ]),
    ("Condition — Exterior", [
        "PAINT_0", "PAINT_1", "PAINT_2", "PAINT_3", "PAINT_COMMENT",
        "SHEET_METAL_0", "SHEET_METAL_1", "SHEET_METAL_2", "SHEET_METAL_3", "SHEET_METAL_COMMENT",
        "GLASS_0", "GLASS_1", "GLASS_2", "GLASS_3", "GLASS_COMMENT",
        "TRIM_0", "TRIM_1", "TRIM_2", "TRIM_3", "TRIM_COMMENT",
    ]),
    ("Condition — Interior", [
        "SEATS_0", "SEATS_1", "SEATS_2", "SEATS_3", "SEATS_COMMENT",
        "CARPET_0", "CARPET_1", "CARPET_2", "CARPET_3", "CARPET_COMMENT",
        "DASHBOARD_0", "DASHBOARD_1", "DASHBOARD_2", "DASHBOARD_3", "DASHBOARD_COMMENT",
        "HEADLINER_0", "HEADLINER_1", "HEADLINER_2", "HEADLINER_3", "HEADLINER_COMMENT",
    ]),
    ("Condition — Mechanical", [
        "FRONT_TIRES_0", "FRONT_TIRES_1", "FRONT_TIRES_2", "FRONT_TIRES_3", "FRONT_TIRES_COMMENT",
        "REAR_TIRES_0", "REAR_TIRES_1", "REAR_TIRES_2", "REAR_TIRES_3", "REAR_TIRES_COMMENT",
        "ENGINE_0", "ENGINE_1", "ENGINE_2", "ENGINE_3", "ENGINE_COMMENT",
        "TRANSMISSION_0", "TRANSMISSION_1", "TRANSMISSION_2", "TRANSMISSION_3", "TRANSMISSION_COMMENT",
    ]),
    ("Power / Convenience", [
        "PS", "PB", "PW", "PL", "SP", "PC", "PA", "PM", "PT", "PP", "PD", "DP",
        "AC", "DA", "CL", "RD", "IW", "TW", "TL", "CC", "KE", "CN", "CO",
        "EC", "NV", "C2", "HU", "WT", "EI", "IB", "MC", "MM", "RJ",
    ]),
    ("Seats", [
        "CS", "LS", "RL", "BS", "SH", "RH", "3S", "3P",
        "R3", "2P", "5P", "B2", "B4", "B6",
    ]),
    ("Audio / Entertainment", [
        "AM", "FM", "ST", "CA", "SE", "CD", "SK", "UR", "XM", "TQ", "M3", "EQ",
    ]),
    ("Wheels", [
        "AW", "CJ", "W2", "DC", "FC", "SA", "SY", "WW", "WC", "RW", "KW", "LC",
    ]),
    ("Roof", [
        "EG", "ES", "OR", "SD", "MS", "MG", "FR", "TT", "GT", "VP",
        "RM", "VR", "RF", "LR", "LP", "PV", "HT",
    ]),
    ("Safety", [
        "AG", "RG", "XG", "ZG", "DG", "TD", "VZ", "IC", "PJ", "PX",
        "AB", "A2", "DB", "RB", "TX", "T1", "AL",
        "SAFETY_BC", "SAFETY_BD",
    ]),
    ("Exterior / Truck", [
        "RR", "WG", "WP", "2T", "HP", "IP", "MP", "SL", "FL", "TG", "DT",
        "BN", "DM", "HM", "HV", "MX", "OTHER_BD", "UP", "XE",
        "AR", "BL", "BY", "CP", "GG", "SB", "SS", "SW", "PG", "TB",
        "TN", "TZ", "TP", "WD", "XT", "OTHER_BC", "BG", "EM", "SG",
    ]),
    ("Refurbishment", [
        "REF_ENGINE_PURCHASE_PRICE", "REF_ENGINE_MILEAGE",
        "REF_TRANS_PURCHASE_PRICE", "REF_TRANS_MILEAGE",
        "REF_PAINT_BASIC", "REF_PAINT_STANDARD", "REF_PAINT_CUSTOM",
        "REF_PAINT_DATE", "REF_PAINT_PURCHASE_PRICE",
        "REF_INTERIOR_VINYL", "REF_INTERIOR_CLOTH", "REF_INTERIOR_LEATHER",
        "REF_INTERIOR_DATE", "REF_INTERIOR_PURCHASE_PRICE",
        "REF_TIRES_COUNT", "REF_TIRES_PURCHASE_PRICE",
        "REF_SPECIAL_WHEELS_DATE", "REF_SPECIAL_WHEELS_PURCHASE_PRICE",
        "REF_CAMPER_SHELL_DATE", "REF_CAMPER_SHELL_PURCHASE_PRICE",
        "REF_CARPET_KIT_DATE", "REF_CARPET_KIT_PURCHASE_PRICE",
        "REF_OTHER_DESCRIPTION", "REF_OTHER_PURCHASE_PRICE", "REF_OTHER_DATE",
        "RESTORED_AMOUNT",
    ]),
    ("Adjustments", [
        "PRE_TAX_ADJ1_DESC", "PRE_TAX_ADJ1_ADD", "PRE_TAX_ADJ1_DEDUCT",
        "PRE_TAX_ADJ2_DESC", "PRE_TAX_ADJ2_ADD", "PRE_TAX_ADJ2_DEDUCT",
        "POST_TAX_ADJ1_DESC", "POST_TAX_ADJ1_ADD", "POST_TAX_ADJ1_DEDUCT",
        "POST_TAX_ADJ2_DESC", "POST_TAX_ADJ2_ADD", "POST_TAX_ADJ2_DEDUCT",
    ]),
]


def verify_docx(docx_path: str) -> dict:
    """
    Read a filled .docx and extract what was filled vs what's still a placeholder.
    Returns {token_name: value_or_None} for every token found.
    """
    with zipfile.ZipFile(docx_path, "r") as zf:
        xml = zf.read("word/document.xml").decode("utf-8")

    # Strip XML tags to get the plain text
    text = re.sub(r'<[^>]+>', '', xml)

    # Find remaining {{TOKEN}} placeholders (unfilled)
    unfilled = set(re.findall(r'\{\{([A-Z0-9_]+)\}\}', text))

    # Try to extract filled values by looking at the XML more carefully.
    # We look at each paragraph's merged text for known token values.
    # Since filled tokens no longer have {{ }}, we return the token map
    # that was used — but we can detect unfilled vs filled.
    return unfilled


def generate_html_report(docx_path: str, token_map: dict = None) -> str:
    """
    Generate an HTML report showing all token slots with fill status.

    Color coding:
      - Green:  filled with a value
      - Red:    still has {{TOKEN}} placeholder (unfilled)
      - Gray:   intentionally blank (empty string in token map)
      - Yellow: token exists in template but not in our map (unknown)

    Returns the path to the generated HTML file.
    """
    unfilled = verify_docx(docx_path)
    docx_name = os.path.basename(docx_path)

    # If no token_map provided, try to figure out status from the docx alone
    # Build a combined set of all tokens we know about
    all_known = set()
    for _, tokens in TOKEN_SECTIONS:
        all_known.update(tokens)

    # Count stats
    filled_count = 0
    empty_count = 0
    unfilled_count = len(unfilled)
    unknown_count = 0

    rows_html = []
    for section_name, tokens in TOKEN_SECTIONS:
        # Section header
        rows_html.append(
            f'<tr class="section-header"><td colspan="3">{section_name}</td></tr>'
        )
        for token in tokens:
            if token in unfilled:
                # Still a placeholder in the doc
                css = "unfilled"
                display_val = "(unfilled)"
                unfilled_count  # already counted
            elif token_map and token in token_map:
                val = token_map[token]
                if val and val.strip():
                    css = "filled"
                    display_val = val if val != "X" else "&#10003;"  # checkmark for X
                    filled_count += 1
                else:
                    css = "blank"
                    display_val = "(blank)"
                    empty_count += 1
            else:
                css = "blank"
                display_val = "(blank)"
                empty_count += 1

            rows_html.append(
                f'<tr class="{css}">'
                f'<td class="token">{token}</td>'
                f'<td class="value">{display_val}</td>'
                f'<td class="status-dot"></td>'
                f'</tr>'
            )

    # Catch any unfilled tokens NOT in our section list
    extra_unfilled = unfilled - all_known
    if extra_unfilled:
        rows_html.append(
            '<tr class="section-header"><td colspan="3">Unknown Tokens (in template but not mapped)</td></tr>'
        )
        for token in sorted(extra_unfilled):
            unknown_count += 1
            rows_html.append(
                f'<tr class="unfilled">'
                f'<td class="token">{token}</td>'
                f'<td class="value">(unfilled)</td>'
                f'<td class="status-dot"></td>'
                f'</tr>'
            )

    total = filled_count + empty_count + unfilled_count + unknown_count
    table_rows = "\n".join(rows_html)

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>BCIF Fill Report — {docx_name}</title>
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    background: #1a1a2e; color: #e0e0e0;
    padding: 24px; line-height: 1.5;
  }}
  h1 {{ color: #fff; font-size: 22px; margin-bottom: 4px; }}
  .subtitle {{ color: #888; font-size: 13px; margin-bottom: 20px; }}
  .stats {{
    display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap;
  }}
  .stat {{
    background: #16213e; border-radius: 8px; padding: 12px 20px;
    min-width: 120px; text-align: center;
  }}
  .stat .num {{ font-size: 28px; font-weight: 700; }}
  .stat .label {{ font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888; }}
  .stat.filled .num {{ color: #4ade80; }}
  .stat.blank .num  {{ color: #6b7280; }}
  .stat.unfilled .num {{ color: #f87171; }}

  table {{ width: 100%; border-collapse: collapse; font-size: 13px; }}
  th {{
    text-align: left; padding: 8px 12px;
    background: #16213e; color: #94a3b8;
    font-weight: 600; text-transform: uppercase; font-size: 11px;
    letter-spacing: 0.5px; position: sticky; top: 0; z-index: 10;
  }}
  td {{ padding: 5px 12px; border-bottom: 1px solid #1e293b; }}
  .section-header td {{
    background: #0f172a; color: #60a5fa; font-weight: 700;
    font-size: 13px; padding: 10px 12px; letter-spacing: 0.3px;
    border-bottom: 2px solid #1e3a5f;
  }}
  .token {{ font-family: 'Cascadia Code', 'Fira Code', monospace; font-size: 12px; }}
  .value {{ max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }}

  .status-dot {{ width: 12px; text-align: center; }}
  .filled .status-dot::after  {{ content: ''; display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #4ade80; }}
  .blank .status-dot::after   {{ content: ''; display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #4b5563; }}
  .unfilled .status-dot::after {{ content: ''; display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #f87171; }}

  .filled .value {{ color: #4ade80; }}
  .blank .value  {{ color: #4b5563; }}
  .unfilled .value {{ color: #f87171; }}
  .filled .token {{ color: #e0e0e0; }}
  .blank .token  {{ color: #6b7280; }}
  .unfilled .token {{ color: #fca5a5; }}

  tr:hover {{ background: #1e293b; }}
  .section-header:hover {{ background: #0f172a; }}

  .legend {{
    display: flex; gap: 20px; margin-bottom: 16px; font-size: 12px; color: #888;
  }}
  .legend span {{ display: flex; align-items: center; gap: 6px; }}
  .legend .dot {{
    display: inline-block; width: 10px; height: 10px; border-radius: 50%;
  }}
  .legend .dot.green {{ background: #4ade80; }}
  .legend .dot.gray  {{ background: #4b5563; }}
  .legend .dot.red   {{ background: #f87171; }}

  .filter-bar {{
    margin-bottom: 16px; display: flex; gap: 8px; flex-wrap: wrap;
  }}
  .filter-bar button {{
    background: #16213e; color: #94a3b8; border: 1px solid #1e3a5f;
    border-radius: 6px; padding: 6px 14px; font-size: 12px; cursor: pointer;
  }}
  .filter-bar button:hover {{ background: #1e3a5f; color: #fff; }}
  .filter-bar button.active {{ background: #1e3a5f; color: #60a5fa; border-color: #3b82f6; }}
</style>
</head>
<body>

<h1>BCIF Fill Report</h1>
<div class="subtitle">{docx_name}</div>

<div class="stats">
  <div class="stat filled"><div class="num">{filled_count}</div><div class="label">Filled</div></div>
  <div class="stat blank"><div class="num">{empty_count}</div><div class="label">Blank</div></div>
  <div class="stat unfilled"><div class="num">{unfilled_count}</div><div class="label">Unfilled</div></div>
</div>

<div class="legend">
  <span><span class="dot green"></span> Filled with value</span>
  <span><span class="dot gray"></span> Intentionally blank</span>
  <span><span class="dot red"></span> Placeholder still in doc</span>
</div>

<div class="filter-bar">
  <button class="active" onclick="filterRows('all')">All</button>
  <button onclick="filterRows('filled')">Filled Only</button>
  <button onclick="filterRows('unfilled')">Unfilled Only</button>
  <button onclick="filterRows('blank')">Blank Only</button>
</div>

<table>
<thead>
  <tr><th>Token</th><th>Value</th><th></th></tr>
</thead>
<tbody>
{table_rows}
</tbody>
</table>

<script>
function filterRows(mode) {{
  document.querySelectorAll('.filter-bar button').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  document.querySelectorAll('tbody tr').forEach(row => {{
    if (row.classList.contains('section-header')) {{ row.style.display = ''; return; }}
    if (mode === 'all') {{ row.style.display = ''; return; }}
    row.style.display = row.classList.contains(mode) ? '' : 'none';
  }});
}}
</script>
</body>
</html>"""

    report_path = OUTPUT_DIR / docx_name.replace(".docx", "_REPORT.html")
    report_path.write_text(html, encoding="utf-8")
    return str(report_path)


def run_verify(docx_path: str = None, token_map: dict = None):
    """Run verify mode: generate HTML report and open in browser."""
    if not docx_path:
        # Find the most recent .docx in output/
        docx_files = sorted(OUTPUT_DIR.glob("*.docx"), key=lambda p: p.stat().st_mtime, reverse=True)
        if not docx_files:
            print("No .docx files found in output/. Run a fill test first.")
            sys.exit(1)
        docx_path = str(docx_files[0])

    print(f"Verifying: {docx_path}")
    report_path = generate_html_report(docx_path, token_map)
    print(f"Report:    {report_path}")

    # Open in default browser
    import webbrowser
    webbrowser.open(Path(report_path).as_uri())
    print("Opened in browser.")


# ─────────────────────────────────────────────────────────
#  MAIN
# ─────────────────────────────────────────────────────────

def main():
    # Check for --verify flag
    if "--verify" in sys.argv:
        remaining = [a for a in sys.argv[1:] if a != "--verify"]
        docx_file = remaining[0] if remaining else None
        run_verify(docx_file)
        return

    print("BCIF Form Fill Test")
    print(f"Template: {TEMPLATE_PATH}")
    print(f"Template exists: {TEMPLATE_PATH.exists()}")

    if not TEMPLATE_PATH.exists():
        print("\nERROR: BCIF template not found!")
        print(f"Expected at: {TEMPLATE_PATH}")
        sys.exit(1)

    # Determine input files
    if len(sys.argv) > 1:
        pdf_files = [Path(p) for p in sys.argv[1:] if p.lower().endswith(".pdf")]
    else:
        pdf_files = sorted(INPUT_DIR.glob("*.pdf"))

    if not pdf_files:
        print(f"\nNo PDF files found.")
        print(f"Drop CCC Preliminary Estimate PDFs into: {INPUT_DIR}/")
        print(f"Or pass a path: python {sys.argv[0]} path/to/estimate.pdf")
        sys.exit(0)

    print(f"\nFound {len(pdf_files)} PDF(s) to process")

    last_token_map = None
    last_output = None

    for pdf_path in pdf_files:
        try:
            process_pdf(str(pdf_path))
        except Exception as e:
            print(f"\n  ERROR processing {pdf_path.name}: {e}")
            import traceback
            traceback.print_exc()

    print(f"\n{'='*60}")
    print(f"  Done. Check {OUTPUT_DIR}/ for filled forms.")
    print(f"  Run with --verify to generate an HTML report.")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
