#!/usr/bin/env python3
"""
Build BCIF_AUTOMATION_TEMPLATE_v4.docx with table-based layout.

Takes v3 as the base (preserving styles, fonts, headers, footers, images)
and replaces document.xml with a clean table-structured layout where every
{{TOKEN}} lives in its own table cell — no split runs, no flowing text.
"""

import zipfile
from io import BytesIO
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
V3_PATH = SCRIPT_DIR.parent / "claim_cipher_app" / "forms" / "bcif" / "BCIF_AUTOMATION_TEMPLATE_v3.docx"
V4_PATH = SCRIPT_DIR.parent / "claim_cipher_app" / "forms" / "bcif" / "BCIF_AUTOMATION_TEMPLATE_v4.docx"

# ─── XML helpers ───────────────────────────────────────────

NS_DECL = (
    'xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" '
    'xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex" '
    'xmlns:cx1="http://schemas.microsoft.com/office/drawing/2015/9/8/chartex" '
    'xmlns:cx2="http://schemas.microsoft.com/office/drawing/2015/10/21/chartex" '
    'xmlns:cx3="http://schemas.microsoft.com/office/drawing/2016/5/9/chartex" '
    'xmlns:cx4="http://schemas.microsoft.com/office/drawing/2016/5/10/chartex" '
    'xmlns:cx5="http://schemas.microsoft.com/office/drawing/2016/5/11/chartex" '
    'xmlns:cx6="http://schemas.microsoft.com/office/drawing/2016/5/12/chartex" '
    'xmlns:cx7="http://schemas.microsoft.com/office/drawing/2016/5/13/chartex" '
    'xmlns:cx8="http://schemas.microsoft.com/office/drawing/2016/5/14/chartex" '
    'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" '
    'xmlns:aink="http://schemas.microsoft.com/office/drawing/2016/ink" '
    'xmlns:am3d="http://schemas.microsoft.com/office/drawing/2017/model3d" '
    'xmlns:o="urn:schemas-microsoft-com:office:office" '
    'xmlns:oel="http://schemas.microsoft.com/office/2019/extlst" '
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
    'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" '
    'xmlns:v="urn:schemas-microsoft-com:vml" '
    'xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" '
    'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" '
    'xmlns:w10="urn:schemas-microsoft-com:office:word" '
    'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
    'xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" '
    'xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" '
    'xmlns:w16cex="http://schemas.microsoft.com/office/word/2018/wordml/cex" '
    'xmlns:w16cid="http://schemas.microsoft.com/office/word/2016/wordml/cid" '
    'xmlns:w16="http://schemas.microsoft.com/office/word/2018/wordml" '
    'xmlns:w16du="http://schemas.microsoft.com/office/word/2023/wordml/word16du" '
    'xmlns:w16sdtdh="http://schemas.microsoft.com/office/word/2020/wordml/sdtdatahash" '
    'xmlns:w16sdtfl="http://schemas.microsoft.com/office/word/2024/wordml/sdtformatlock" '
    'xmlns:w16se="http://schemas.microsoft.com/office/word/2015/wordml/symex" '
    'xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" '
    'xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" '
    'xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" '
    'xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" '
    'mc:Ignorable="w14 w15 w16se w16cid w16 w16cex w16sdtdh w16sdtfl w16du wp14"'
)

# Font: Arial Narrow, 8pt (16 half-points). Bold labels use <w:b/>
FONT = "Arial Narrow"
SZ = "16"       # 8pt
SZ_TITLE = "22" # 11pt
SZ_SM = "14"    # 7pt for dense checkbox grids


def _esc(text):
    """Escape XML special chars in text content."""
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def run(text, bold=False, sz=SZ, font=FONT):
    """Create a single <w:r> with one <w:t> — guaranteed no split."""
    rpr = f'<w:rPr><w:rFonts w:ascii="{font}" w:hAnsi="{font}"/>{"<w:b/>" if bold else ""}<w:sz w:val="{sz}"/><w:szCs w:val="{sz}"/></w:rPr>'
    # Escape label text but preserve {{TOKEN}} curly braces
    safe = _esc(text).replace("&amp;amp;", "&amp;").replace("{{", "{{").replace("}}", "}}")
    return f'<w:r>{rpr}<w:t xml:space="preserve">{safe}</w:t></w:r>'


def para(content, jc=None, spacing_after="0", spacing_before="0"):
    """Wrap run(s) in a paragraph."""
    jc_xml = f'<w:jc w:val="{jc}"/>' if jc else ''
    return (
        f'<w:p><w:pPr>'
        f'<w:spacing w:before="{spacing_before}" w:after="{spacing_after}" w:line="240" w:lineRule="auto"/>'
        f'{jc_xml}'
        f'</w:pPr>{content}</w:p>'
    )


def cell(content_xml, width=None, shading=None, borders=None, vmerge=None):
    """Wrap paragraph XML in a table cell."""
    tc_pr = '<w:tcPr>'
    if width:
        tc_pr += f'<w:tcW w:w="{width}" w:type="dxa"/>'
    if shading:
        tc_pr += f'<w:shd w:val="clear" w:color="auto" w:fill="{shading}"/>'
    if borders:
        tc_pr += borders
    if vmerge is not None:
        tc_pr += f'<w:vMerge w:val="{vmerge}"/>' if vmerge else '<w:vMerge/>'
    tc_pr += '</w:tcPr>'
    return f'<w:tc>{tc_pr}{content_xml}</w:tc>'


def row(*cells_xml):
    """Build a table row from cells."""
    return f'<w:tr>{"".join(cells_xml)}</w:tr>'


def table(rows_xml, col_widths, borders=True):
    """Build a table with fixed column widths."""
    grid = ''.join(f'<w:gridCol w:w="{w}"/>' for w in col_widths)
    total = sum(col_widths)

    if borders:
        bdr = (
            '<w:tblBorders>'
            '<w:top w:val="single" w:sz="4" w:space="0" w:color="999999"/>'
            '<w:left w:val="single" w:sz="4" w:space="0" w:color="999999"/>'
            '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="999999"/>'
            '<w:right w:val="single" w:sz="4" w:space="0" w:color="999999"/>'
            '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="999999"/>'
            '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="999999"/>'
            '</w:tblBorders>'
        )
    else:
        bdr = (
            '<w:tblBorders>'
            '<w:top w:val="none" w:sz="0" w:space="0" w:color="auto"/>'
            '<w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/>'
            '<w:bottom w:val="none" w:sz="0" w:space="0" w:color="auto"/>'
            '<w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/>'
            '<w:insideH w:val="none" w:sz="0" w:space="0" w:color="auto"/>'
            '<w:insideV w:val="none" w:sz="0" w:space="0" w:color="auto"/>'
            '</w:tblBorders>'
        )

    return (
        f'<w:tbl>'
        f'<w:tblPr>'
        f'<w:tblW w:w="{total}" w:type="dxa"/>'
        f'<w:tblLayout w:type="fixed"/>'
        f'{bdr}'
        f'<w:tblCellMar><w:top w:w="20" w:type="dxa"/><w:left w:w="40" w:type="dxa"/>'
        f'<w:bottom w:w="20" w:type="dxa"/><w:right w:w="40" w:type="dxa"/></w:tblCellMar>'
        f'</w:tblPr>'
        f'<w:tblGrid>{grid}</w:tblGrid>'
        f'{"".join(rows_xml)}'
        f'</w:tbl>'
    )


# ─── Section builders ─────────────────────────────────────

def section_title(text):
    """Dark background section header spanning full width."""
    return para(run(text, bold=True, sz=SZ_TITLE), jc="center", spacing_before="120", spacing_after="60")


def label_value_row(label, token, label_w=2700, value_w=8100):
    """Two-column row: bold label | {{TOKEN}} placeholder."""
    return row(
        cell(para(run(label, bold=True)), width=label_w, shading="F2F2F2"),
        cell(para(run("{{" + token + "}}")), width=value_w),
    )


def header_table(pairs, label_w=2700, value_w=8100):
    """Build a 2-column label/value table."""
    rows = [label_value_row(lbl, tok, label_w, value_w) for lbl, tok in pairs]
    return table(rows, [label_w, value_w])


def checkbox_grid(title, items, cols=4):
    """
    Build a checkbox grid.
    items: list of (token, label) tuples.
    Each cell shows: {{TOKEN}} Label
    The fill script replaces {{TOKEN}} with "X" or "".
    """
    # Calculate column width
    total_w = 10800
    col_w = total_w // cols

    rows_xml = []

    # Title row spanning all columns
    title_cell = cell(
        para(run(title, bold=True, sz=SZ)),
        width=total_w,
        shading="E8E8E8",
    )
    # We need to merge across columns — use gridSpan
    title_cell = title_cell.replace(
        '</w:tcPr>',
        f'<w:gridSpan w:val="{cols}"/></w:tcPr>'
    )
    rows_xml.append(f'<w:tr>{title_cell}</w:tr>')

    # Data rows
    for i in range(0, len(items), cols):
        chunk = items[i:i+cols]
        cells = []
        for token, label in chunk:
            # Format: {{TOKEN}} Label  — the token becomes X or blank
            txt = "{{" + token + "}} " + label
            cells.append(cell(para(run(txt, sz=SZ_SM)), width=col_w))
        # Pad if last row is short
        while len(cells) < cols:
            cells.append(cell(para(run("", sz=SZ_SM)), width=col_w))
        rows_xml.append(row(*cells))

    return table(rows_xml, [col_w] * cols)


def condition_table(groups):
    """
    Build condition rating table.
    groups: list of (label, token_prefix) e.g. ("Paint", "PAINT")
    Columns: Label | 0 | 1 | 2 | 3 | Comments
    """
    label_w = 1800
    rating_w = 600
    comment_w = 10800 - label_w - (rating_w * 4)
    widths = [label_w, rating_w, rating_w, rating_w, rating_w, comment_w]

    rows_xml = []

    # Header row
    headers = ["Condition", "0\nPoor", "1\nFair", "2\nGood", "3\nExcl", "Comments"]
    hcells = []
    for i, h in enumerate(headers):
        hcells.append(cell(
            para(run(h, bold=True, sz=SZ_SM), jc="center"),
            width=widths[i],
            shading="E8E8E8",
        ))
    rows_xml.append(row(*hcells))

    for label, prefix in groups:
        rcells = [
            cell(para(run(label, bold=True, sz=SZ_SM)), width=label_w, shading="F8F8F8"),
        ]
        for i in range(4):
            token = f"{prefix}_{i}"
            rcells.append(cell(
                para(run("{{" + token + "}}", sz=SZ_SM), jc="center"),
                width=rating_w,
            ))
        rcells.append(cell(
            para(run("{{" + prefix + "_COMMENT}}", sz=SZ_SM)),
            width=comment_w,
        ))
        rows_xml.append(row(*rcells))

    return table(rows_xml, widths)


def adjustment_table(prefix_pairs):
    """
    Build adjustment rows.
    prefix_pairs: list of (label, desc_token, add_token, deduct_token)
    """
    desc_w = 4000
    add_w = 2400
    ded_w = 2400
    label_w = 2000
    widths = [label_w, desc_w, add_w, ded_w]

    rows_xml = []
    # Header
    hcells = [
        cell(para(run("", bold=True, sz=SZ_SM)), width=label_w, shading="E8E8E8"),
        cell(para(run("Description", bold=True, sz=SZ_SM), jc="center"), width=desc_w, shading="E8E8E8"),
        cell(para(run("Add (+)", bold=True, sz=SZ_SM), jc="center"), width=add_w, shading="E8E8E8"),
        cell(para(run("Deduct (-)", bold=True, sz=SZ_SM), jc="center"), width=ded_w, shading="E8E8E8"),
    ]
    rows_xml.append(row(*hcells))

    for label, desc_tok, add_tok, ded_tok in prefix_pairs:
        rcells = [
            cell(para(run(label, bold=True, sz=SZ_SM)), width=label_w, shading="F8F8F8"),
            cell(para(run("{{" + desc_tok + "}}", sz=SZ_SM)), width=desc_w),
            cell(para(run("{{" + add_tok + "}}", sz=SZ_SM)), width=add_w),
            cell(para(run("{{" + ded_tok + "}}", sz=SZ_SM)), width=ded_w),
        ]
        rows_xml.append(row(*rcells))

    return table(rows_xml, widths)


def spacer():
    """Empty paragraph for spacing between sections."""
    return '<w:p><w:pPr><w:spacing w:before="60" w:after="60"/></w:pPr></w:p>'


# ─── Build the full document ──────────────────────────────

def build_document_xml():
    parts = []

    # ═══════════════════════════════════════════════════════
    #  PAGE 1: CLAIM INFO + VEHICLE + LOSS/COVERAGE
    # ═══════════════════════════════════════════════════════

    parts.append(section_title("BASE CLAIM INFORMATION FORM"))

    # --- Claim Info ---
    parts.append(header_table([
        ("Office ID:", "OFFICE_ID"),
        ("Adjuster:", "ADJR_NAME"),
        ("Appraiser:", "APPR_NAME"),
        ("Insured Name:", "INSURED_NAME"),
        ("Owner Name:", "OWNER_NAME"),
        ("Owner Phone:", "OWNER_PHONE"),
        ("Claim Number:", "CLAIM_NUMBER"),
        ("Date of Loss:", "DATE_OF_LOSS"),
        ("Loss State:", "LOSS_STATE"),
        ("Loss Zip Code:", "LOSS_ZIP_CODE"),
    ]))

    parts.append(spacer())

    # --- Loss Type & Coverage (side by side in one table) ---
    parts.append(checkbox_grid("Loss Type", [
        ("LOSS_TYPE_THEFT", "Theft"),
        ("LOSS_TYPE_OTHER", "Other"),
    ], cols=2))

    parts.append(spacer())

    parts.append(checkbox_grid("Coverage", [
        ("COVERAGE_COLLISION", "Collision"),
        ("COVERAGE_COMPREHENSIVE", "Comprehensive"),
        ("COVERAGE_LIABILITY", "Liability"),
        ("COVERAGE_OTHER", "Other"),
    ], cols=4))

    parts.append(spacer())

    parts.append(checkbox_grid("Third Party / Leased", [
        ("THIRD_PARTY_YES", "Third Party: Yes"),
        ("THIRD_PARTY_NO", "Third Party: No"),
        ("LEASED_YES", "Leased: Yes"),
        ("LEASED_NO", "Leased: No"),
    ], cols=4))

    parts.append(spacer())

    # --- Vehicle ---
    parts.append(header_table([
        ("Year:", "YEAR"),
        ("Make:", "MAKE"),
        ("Model:", "MODEL"),
        ("VIN:", "VIN"),
        ("Mileage:", "MILEAGE"),
        ("Engine Size:", "ENGINE_SIZE"),
        ("Special Features:", "SPECIAL_FEATURES"),
    ]))

    parts.append(spacer())

    # --- Body Style ---
    parts.append(checkbox_grid("Body Style", [
        ("BODY_2DR", "2-Door"),
        ("BODY_4DR", "4-Door"),
        ("BODY_HATCHBACK", "Hatchback"),
        ("BODY_CONVERTIBLE", "Convertible"),
        ("BODY_WAGON", "Wagon"),
        ("BODY_PICKUP", "Pickup"),
        ("BODY_VAN", "Van"),
        ("BODY_UTILITY", "Utility/SUV"),
    ], cols=4))

    parts.append(spacer())

    # --- Truck Config ---
    parts.append(checkbox_grid("Truck Configuration", [
        ("TRUCK_HALF_TON", "1/2 Ton"),
        ("TRUCK_THREE_QUARTER_TON", "3/4 Ton"),
        ("TRUCK_ONE_TON", "1 Ton"),
        ("TRUCK_SHORT_BED", "Short Bed"),
        ("TRUCK_LONG_BED", "Long Bed"),
        ("TRUCK_CAB_CHASSIS", "Cab & Chassis"),
        ("TRUCK_FLEETSIDE", "Fleetside"),
        ("TRUCK_FENDERSIDE", "Fenderside"),
    ], cols=4))

    parts.append(spacer())

    # --- Cylinders ---
    parts.append(checkbox_grid("Cylinders", [
        ("CYL_3", "3 Cyl"),
        ("CYL_4", "4 Cyl"),
        ("CYL_5", "5 Cyl"),
        ("CYL_6", "6 Cyl"),
        ("CYL_8", "8 Cyl"),
        ("CYL_10", "10 Cyl"),
        ("CYL_12", "12 Cyl"),
        ("TURBO", "Turbo"),
        ("DIESEL", "Diesel"),
    ], cols=5))

    parts.append(spacer())

    # --- Transmission ---
    parts.append(checkbox_grid("Transmission", [
        ("TRANS_AUTO", "Automatic"),
        ("TRANS_OD", "Overdrive"),
        ("TRANS_S3", "3-Speed"),
        ("TRANS_S4", "4-Speed"),
        ("TRANS_S5", "5-Speed"),
        ("TRANS_S6", "6-Speed"),
        ("TRANS_4W", "4WD/AWD"),
        ("TRANS_PO", "Power"),
    ], cols=4))

    # ═══════════════════════════════════════════════════════
    #  PAGE 2: OPTIONS
    # ═══════════════════════════════════════════════════════

    # Page break
    parts.append('<w:p><w:r><w:br w:type="page"/></w:r></w:p>')

    parts.append(section_title("OPTIONS / EQUIPMENT"))

    # --- Power / Convenience ---
    parts.append(checkbox_grid("Power / Convenience", [
        ("PS", "Power Steering"),
        ("PB", "Power Brakes"),
        ("PW", "Power Windows"),
        ("PL", "Power Locks"),
        ("SP", "Power Driver Seat"),
        ("PC", "Power Passenger Seat"),
        ("PA", "Power Antenna"),
        ("PM", "Power Mirrors"),
        ("PT", "Power Trunk/Gate"),
        ("PP", "Power Adj Pedals"),
        ("PD", "Power Sliding Door"),
        ("DP", "Dual Pwr Slide Doors"),
        ("AC", "Air Conditioning"),
        ("DA", "Dual Air Cond"),
        ("CL", "Climate Control"),
        ("RD", "Rear Defogger"),
        ("IW", "Intermittent Wipers"),
        ("TW", "Tilt Wheel"),
        ("TL", "Telescopic Wheel"),
        ("CC", "Cruise Control"),
        ("KE", "Keyless Entry"),
        ("CN", "Console/Storage"),
        ("CO", "Overhead Console"),
        ("EC", "Entertainment Ctr"),
        ("NV", "Navigation System"),
        ("C2", "Communications Sys"),
        ("HU", "Heads-Up Display"),
        ("WT", "Wood Interior/Trim"),
        ("EI", "Electronic Instrum"),
        ("IB", "Onboard Computer"),
        ("MC", "Message Center"),
        ("MM", "Memory Package"),
        ("RJ", "Remote Start"),
        ("HL", "Homelink"),
        ("DE", "Deluxe Equipment"),
    ], cols=4))

    parts.append(spacer())

    # --- Seats ---
    parts.append(checkbox_grid("Seats", [
        ("CS", "Cloth Seats"),
        ("LS", "Leather Seats"),
        ("RL", "Reclining Seats"),
        ("BS", "Bucket Seats"),
        ("SH", "Heated Seats"),
        ("RH", "Rear Heated Seats"),
        ("3S", "3rd Row Seat"),
        ("3P", "Power 3rd Seat"),
        ("R3", "Retractable Seats"),
        ("2P", "12 Passenger"),
        ("5P", "15 Passenger"),
        ("B2", "Captain Chairs (2)"),
        ("B4", "Captain Chairs (4)"),
        ("B6", "Captain Chairs (6)"),
        ("VS", "Ventilated Seats"),
    ], cols=4))

    parts.append(spacer())

    # --- Audio ---
    parts.append(checkbox_grid("Audio / Entertainment", [
        ("AM", "AM Radio"),
        ("FM", "FM Radio"),
        ("ST", "Stereo"),
        ("CA", "Cassette"),
        ("SE", "Search/Seek"),
        ("CD", "CD Player"),
        ("SK", "CD Changer"),
        ("UR", "Premium Radio"),
        ("XM", "Satellite Radio"),
        ("TQ", "Steering Whl Ctrls"),
        ("M3", "Aux Audio Input"),
        ("EQ", "Equalizer"),
    ], cols=4))

    parts.append(spacer())

    # --- Wheels ---
    parts.append(checkbox_grid("Wheels", [
        ("AW", "Aluminum/Alloy"),
        ("CJ", "Chrome Wheels"),
        ("W2", '20" Wheels'),
        ("DC", "Deluxe Whl Covers"),
        ("FC", "Full Whl Covers"),
        ("SA", "Spoke Aluminum"),
        ("SY", "Styled Steel"),
        ("WW", "Wire Wheels"),
        ("WC", "Wire Whl Covers"),
        ("RW", "Rally Wheels"),
        ("KW", "Locking Wheels"),
        ("LC", "Locking Whl Covers"),
    ], cols=4))

    parts.append(spacer())

    # --- Roof ---
    parts.append(checkbox_grid("Roof", [
        ("EG", "Elec Glass Roof"),
        ("ES", "Elec Steel Roof"),
        ("OR", "Skyview Roof"),
        ("SD", "Dual Sunroof"),
        ("MS", "Manual Steel Roof"),
        ("MG", "Manual Glass Roof"),
        ("FR", "Flip Roof"),
        ("TT", "T-Top"),
        ("GT", "Glass T-Top"),
        ("VP", "Power Convert Roof"),
        ("RM", "Detachable Roof"),
        ("VR", "Vinyl Covered Roof"),
        ("RF", "Cabriolet Roof"),
        ("LR", "Landau Roof"),
        ("LP", "Padded Landau Roof"),
        ("PV", "Padded Vinyl Roof"),
        ("HT", "Hard Top"),
    ], cols=4))

    parts.append(spacer())

    # --- Safety ---
    parts.append(checkbox_grid("Safety", [
        ("AG", "Driver Air Bag"),
        ("RG", "Passenger Air Bag"),
        ("XG", "Front Side Air Bags"),
        ("ZG", "Rear Side Air Bags"),
        ("DG", "Head/Curtain Bags"),
        ("TD", "Alarm/Anti-Theft"),
        ("VZ", "Night Vision"),
        ("IC", "Adaptive Cruise"),
        ("PJ", "Parking Sensors"),
        ("PX", "Parking Assist"),
        ("AB", "Anti-Lock Brakes"),
        ("A2", "ABS (alt)"),
        ("DB", "4-Whl Disc Brakes"),
        ("RB", "Roll Bar"),
        ("TX", "Traction Control"),
        ("T1", "Stability Control"),
        ("AL", "Auto Level"),
        ("SAFETY_BC", "Backup Camera"),
        ("SAFETY_BD", "Blind Spot Monitor"),
        ("SV", "Surround View/360"),
        ("LW", "Lane Departure"),
    ], cols=4))

    parts.append(spacer())

    # --- Exterior / Truck ---
    parts.append(checkbox_grid("Exterior / Truck Accessories", [
        ("RR", "Roof/Luggage Rack"),
        ("WG", "Woodgrain"),
        ("WP", "Rear Wndw Wiper"),
        ("2T", "Two-Tone Paint"),
        ("HP", "Three Stage Paint"),
        ("IP", "Clearcoat Paint"),
        ("MP", "Metallic Paint"),
        ("SL", "Rear Spoiler"),
        ("FL", "Fog Lamps"),
        ("TG", "Tinted Glass"),
        ("DT", "Privacy Glass"),
        ("BN", "Body Side Moldings"),
        ("DM", "Dual Mirrors"),
        ("HM", "Heated Mirrors"),
        ("HV", "Headlamp Washers"),
        ("MX", "Signal Integ Mirrors"),
        ("OTHER_BD", "Running Boards"),
        ("UP", "Pwr Retract Boards"),
        ("XE", "Xenon Headlamps"),
        ("AR", "Bed Rails"),
        ("BL", "Bedliner"),
        ("BY", "Spray-On Bedliner"),
        ("CP", "Deluxe Truck Cap"),
        ("GG", "Grille Guard"),
        ("SB", "Rear Step Bumper"),
        ("SS", "Swivel Seats"),
        ("SW", "Rear Slide Window"),
        ("PG", "Power Rear Window"),
        ("TB", "Permanent Tool Box"),
        ("TN", "Soft Tonneau"),
        ("TZ", "Hard Tonneau"),
        ("TP", "Towing Package"),
        ("WD", "Dual Rear Wheels"),
        ("XT", "Aux Fuel Tank"),
        ("OTHER_BC", "Bumper Cushions"),
        ("BG", "Bumper Guards"),
        ("EM", "CA Emissions"),
        ("SG", "Stone Guard"),
        ("WI", "Winch"),
    ], cols=4))

    # ═══════════════════════════════════════════════════════
    #  PAGE 3: CONDITION + REFURBISHMENT + ADJUSTMENTS
    # ═══════════════════════════════════════════════════════

    parts.append('<w:p><w:r><w:br w:type="page"/></w:r></w:p>')

    # Repeat claim number on page 2/3
    parts.append(header_table([
        ("Claim Number:", "CLAIM_NUMBER_P2"),
    ]))

    parts.append(spacer())
    parts.append(section_title("CONDITION RATING"))

    # --- Condition: Exterior ---
    parts.append(condition_table([
        ("Paint", "PAINT"),
        ("Sheet Metal", "SHEET_METAL"),
        ("Glass", "GLASS"),
        ("Trim/Chrome", "TRIM"),
    ]))

    parts.append(spacer())

    # --- Condition: Interior ---
    parts.append(condition_table([
        ("Seats", "SEATS"),
        ("Carpet", "CARPET"),
        ("Dashboard", "DASHBOARD"),
        ("Headliner", "HEADLINER"),
    ]))

    parts.append(spacer())

    # --- Condition: Mechanical ---
    parts.append(condition_table([
        ("Front Tires", "FRONT_TIRES"),
        ("Rear Tires", "REAR_TIRES"),
        ("Engine", "ENGINE"),
        ("Transmission", "TRANSMISSION"),
    ]))

    parts.append(spacer())
    parts.append(section_title("REFURBISHMENT"))

    # Refurbishment — label/value pairs
    parts.append(header_table([
        ("Engine Price:", "REF_ENGINE_PURCHASE_PRICE"),
        ("Engine Mileage:", "REF_ENGINE_MILEAGE"),
        ("Trans Price:", "REF_TRANS_PURCHASE_PRICE"),
        ("Trans Mileage:", "REF_TRANS_MILEAGE"),
        ("Tires Count:", "REF_TIRES_COUNT"),
        ("Tires Price:", "REF_TIRES_PURCHASE_PRICE"),
        ("Spec Wheels Date:", "REF_SPECIAL_WHEELS_DATE"),
        ("Spec Wheels Price:", "REF_SPECIAL_WHEELS_PURCHASE_PRICE"),
        ("Camper Shell Date:", "REF_CAMPER_SHELL_DATE"),
        ("Camper Shell Price:", "REF_CAMPER_SHELL_PURCHASE_PRICE"),
        ("Carpet Kit Date:", "REF_CARPET_KIT_DATE"),
        ("Carpet Kit Price:", "REF_CARPET_KIT_PURCHASE_PRICE"),
        ("Other Desc:", "REF_OTHER_DESCRIPTION"),
        ("Other Price:", "REF_OTHER_PURCHASE_PRICE"),
        ("Other Date:", "REF_OTHER_DATE"),
        ("Restored Amount:", "RESTORED_AMOUNT"),
    ]))

    parts.append(spacer())

    # Refurbishment checkboxes
    parts.append(checkbox_grid("Paint Refurbishment", [
        ("REF_PAINT_BASIC", "Basic"),
        ("REF_PAINT_STANDARD", "Standard"),
        ("REF_PAINT_CUSTOM", "Custom"),
    ], cols=3))

    parts.append(header_table([
        ("Paint Date:", "REF_PAINT_DATE"),
        ("Paint Price:", "REF_PAINT_PURCHASE_PRICE"),
    ]))

    parts.append(spacer())

    parts.append(checkbox_grid("Interior Refurbishment", [
        ("REF_INTERIOR_VINYL", "Vinyl"),
        ("REF_INTERIOR_CLOTH", "Cloth"),
        ("REF_INTERIOR_LEATHER", "Leather"),
    ], cols=3))

    parts.append(header_table([
        ("Interior Date:", "REF_INTERIOR_DATE"),
        ("Interior Price:", "REF_INTERIOR_PURCHASE_PRICE"),
    ]))

    parts.append(spacer())
    parts.append(section_title("ADJUSTMENTS"))

    # Pre-tax adjustments
    parts.append(adjustment_table([
        ("Pre-Tax Adj 1", "PRE_TAX_ADJ1_DESC", "PRE_TAX_ADJ1_ADD", "PRE_TAX_ADJ1_DEDUCT"),
        ("Pre-Tax Adj 2", "PRE_TAX_ADJ2_DESC", "PRE_TAX_ADJ2_ADD", "PRE_TAX_ADJ2_DEDUCT"),
    ]))

    parts.append(spacer())

    parts.append(adjustment_table([
        ("Post-Tax Adj 1", "POST_TAX_ADJ1_DESC", "POST_TAX_ADJ1_ADD", "POST_TAX_ADJ1_DEDUCT"),
        ("Post-Tax Adj 2", "POST_TAX_ADJ2_DESC", "POST_TAX_ADJ2_ADD", "POST_TAX_ADJ2_DEDUCT"),
    ]))

    # ═══════════════════════════════════════════════════════
    #  Assemble full document
    # ═══════════════════════════════════════════════════════

    body = '\n'.join(parts)

    # Section properties — match v3 page size/margins + header/footer refs
    sect_pr = (
        '<w:sectPr>'
        '<w:headerReference w:type="default" r:id="rId7"/>'
        '<w:footerReference w:type="even" r:id="rId8"/>'
        '<w:footerReference w:type="default" r:id="rId9"/>'
        '<w:pgSz w:w="12240" w:h="15840" w:code="1"/>'
        '<w:pgMar w:top="245" w:right="720" w:bottom="245" w:left="720" '
        'w:header="360" w:footer="360" w:gutter="0"/>'
        '<w:cols w:space="720"/>'
        '<w:docGrid w:linePitch="360"/>'
        '</w:sectPr>'
    )

    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        f'<w:document {NS_DECL}>'
        f'<w:body>'
        f'{body}'
        f'{sect_pr}'
        f'</w:body>'
        f'</w:document>'
    )


# ─── Main ─────────────────────────────────────────────────

def main():
    if not V3_PATH.exists():
        print(f"ERROR: v3 template not found at {V3_PATH}")
        return

    new_doc_xml = build_document_xml().encode("utf-8")

    # Validate XML before writing
    from xml.etree import ElementTree as ET
    try:
        ET.fromstring(new_doc_xml)
        print("XML validation: PASS")
    except ET.ParseError as e:
        print(f"XML validation FAILED: {e}")
        return

    # Count tokens
    import re
    tokens = re.findall(r'\{\{([A-Z0-9_]+)\}\}', new_doc_xml.decode('utf-8'))
    print(f"Tokens in v4: {len(tokens)} ({len(set(tokens))} unique)")

    # Build v4 by copying v3 and replacing document.xml
    in_bytes = V3_PATH.read_bytes()
    in_zip = BytesIO(in_bytes)
    out_zip = BytesIO()

    with zipfile.ZipFile(in_zip, "r") as zin:
        with zipfile.ZipFile(out_zip, "w", zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                if item.filename == "word/document.xml":
                    zout.writestr(item, new_doc_xml)
                else:
                    zout.writestr(item, zin.read(item.filename))

    V4_PATH.write_bytes(out_zip.getvalue())
    print(f"Output: {V4_PATH}")
    print(f"Size: {V4_PATH.stat().st_size / 1024:.1f} KB")

    # Verify
    with zipfile.ZipFile(str(V4_PATH), "r") as z:
        xml_check = z.read("word/document.xml")
        ET.fromstring(xml_check)
        print("Output XML re-parse: PASS")

    print("DONE")


if __name__ == "__main__":
    main()
