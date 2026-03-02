#!/usr/bin/env python3
"""
One-time script: Convert CLAIM_SUMMARY_REDESIGN.docx into a {{TOKEN}}-placeholder template.

Opens the reference DOCX, reads word/document.xml, performs paragraph-level text
concatenation (same strategy as bcifDocxFiller.js), replaces known data values with
{{TOKEN}} placeholders, and saves the result as CLAIM_SUMMARY_TEMPLATE.docx.
"""

import zipfile, re, shutil, os, sys

SRC  = 'claim_cipher_app/forms/summaries/CLAIM_SUMMARY_REDESIGN.docx'
DEST = 'claim_cipher_app/forms/summaries/CLAIM_SUMMARY_TEMPLATE.docx'

# ─── Token replacement map: value-in-template → {{TOKEN}} ────────────────────
# Order matters: longer/more-specific strings first to avoid partial matches.

REPLACEMENTS = [
    # ── LONGEST STRINGS FIRST (contain substrings that appear as separate tokens) ──

    # Loss Description — full paragraph replacement (contains "2022 Honda CR-V EX-L", "Collision", etc.)
    ("The 2022 Honda CR-V EX-L sustained collision damage consistent with a left-side T-bone impact (CCC Position 09). The preliminary estimate prepared by Auto Claims Direct (Workfile ID: 1449b80e) documents repair procedures addressing structural, body panel, restraint system, and cosmetic damage to the left side of the vehicle.",
     "{{LOSS_PARA_1}}"),
    ("Based on current inspection and estimate documentation, the vehicle is repairable within economic guidelines. A supplement may be required following teardown. Estimated repair duration is 11 days.",
     "{{LOSS_PARA_2}}"),

    # Damage Assessment (long descriptions before shorter tokens)
    ("Center pillar and rocker panel: section replacement required. Aperture panel repair with welding.",
     "{{DAMAGE_STRUCTURAL}}"),
    ("Left front door: replacement (recycled). Left rear door outer panel: replacement. Left fender: repair and blend. Left quarter panel: blend repair.",
     "{{DAMAGE_BODY_PANELS}}"),
    ("Left head air bag and left front seat air bag: deployed, replacement required. Left side impact sensor, seat belt and retractor, buckle: replacement. Diagnostic unit: replacement.",
     "{{DAMAGE_RESTRAINTS}}"),
    # Note: &amp; in XML for &
    ("Left front seat back cover and pad: replacement (leather). Headliner: R&I for structural and restraint access.",
     "{{DAMAGE_INTERIOR}}"),

    # Title section
    ("VEHICLE DAMAGE ASSESSMENT",                       "{{TITLE}}"),
    ("Claim Summary Report  |  Repairable Vehicle",     "{{SUBTITLE}}"),

    # Claim Information (value portion only — labels like "Claim #:" stay)
    ("754114-GQ-2",                                     "{{CLAIM_NUMBER}}"),
    ("10/1/2025 12:00 PM",                              "{{DATE_OF_LOSS}}"),
    ("Collision",                                       "{{LOSS_TYPE}}"),
    ("Nationwide General Ins.",                          "{{CARRIER}}"),

    # Insured / Owner
    ("Stacy Brayboy",                                   "{{OWNER_NAME}}"),
    ("(910) 827-1701",                                  "{{OWNER_PHONE}}"),
    ("620 Canal Rd, Pembroke, NC 28372",                 "{{LOSS_LOCATION}}"),
    ("CC-2026-00142",                                   "{{REPORT_ID}}"),

    # Vehicle Information (values only — labels stay in their own paragraphs)
    ("2022 Honda CR-V EX-L",                            "{{VEHICLE}}"),
    ("5J6RW1H80NA011968",                               "{{VIN}}"),
    ("63,350 miles",                                    "{{ODOMETER}}"),
    ("4 Cylinder 1.5L Turbocharged",                    "{{ENGINE}}"),
    ("Automatic",                                       "{{TRANSMISSION}}"),
    ("Silver",                                          "{{EXTERIOR_COLOR}}"),
    ("Good",                                            "{{OVERALL_CONDITION}}"),

    # Repair Cost Summary — labels with detail
    ("Body Labor (45.2 hrs @ $55.00/hr)",               "{{BODY_LABOR_LABEL}}"),
    ("Paint Labor (8.0 hrs @ $55.00/hr)",                "{{PAINT_LABOR_LABEL}}"),
    ("Mechanical Labor (1.0 hrs @ $95.00/hr)",           "{{MECH_LABOR_LABEL}}"),
    ("Paint Supplies (8.0 hrs @ $44.00/hr)",             "{{PAINT_SUPPLIES_LABEL}}"),
    ("Sales Tax (7.0%)",                                 "{{SALES_TAX_LABEL}}"),

    # Cost amounts (order: most specific first to avoid $7 matching inside $7,859.19)
    ("$11,768.44",                                       "{{NET_COST_AMOUNT}}"),
    ("$12,018.44",                                       "{{TOTAL_AMOUNT}}"),
    ("$11,232.19",                                       "{{SUBTOTAL_AMOUNT}}"),
    ("$7,859.19",                                        "{{PARTS_AMOUNT}}"),
    ("$2,486.00",                                        "{{BODY_LABOR_AMOUNT}}"),
    ("$786.25",                                          "{{SALES_TAX_AMOUNT}}"),
    ("$440.00",                                          "{{PAINT_LABOR_AMOUNT}}"),
    ("$352.00",                                          "{{PAINT_SUPPLIES_AMOUNT}}"),
    ("$250.00",                                          "{{DEDUCTIBLE_AMOUNT}}"),
    ("$95.00",                                           "{{MECH_LABOR_AMOUNT}}"),

    # Vehicle Condition — ratings and notes
    # Paint
    ("Minor chips or scratches. No major deterioration.",  "{{COND_PAINT_NOTES}}"),
    # Sheet Metal
    ("Minor dings or typical wear. Panels align properly.", "{{COND_SHEET_METAL_NOTES}}"),
    # Glass
    ("Light wear or minor pitting. No structural cracks.",  "{{COND_GLASS_NOTES}}"),
    # Trim
    ("Normal wear. Minor blemishes only.",                  "{{COND_TRIM_NOTES}}"),
    # Seats
    ("Light wear. No major damage.",                        "{{COND_SEATS_NOTES}}"),
    # Carpet
    ("Light wear consistent with age.",                     "{{COND_CARPET_NOTES}}"),
    # Engine
    ("Operational with no major issues observed.",           "{{COND_ENGINE_NOTES}}"),
    # Transmission
    ("No operational concerns observed.",                    "{{COND_TRANS_NOTES}}"),

    # Prior Damage
    ("No unrelated prior damage was observed during inspection.",
     "{{PRIOR_DAMAGE_TEXT}}"),

    # Recall Notices
    ("NHTSA has issued 2 safety-related recall notices that may apply to this vehicle:",
     "{{RECALL_HEADER}}"),
    ("NHTSA 23V858000",                                  "{{RECALL_1_ID}}"),
    ("Fuel pump inside the fuel tank may fail, causing engine stall while driving. Dealers will replace the fuel pump module free of charge.",
     "{{RECALL_1_DESC}}"),
    ("NHTSA 23V524000",                                  "{{RECALL_2_ID}}"),
    ("Certification label on driver door states incorrect GVWR, GAWR, and tire size information. Dealers will install a corrected label free of charge.",
     "{{RECALL_2_DESC}}"),

    # Appraiser Certification paragraphs
    ("This report was prepared based on physical inspection of the referenced vehicle and review of the associated CCC preliminary estimate documentation. All findings reflect the condition of the vehicle as observed at the time of inspection. Condition ratings are based on industry-standard guidelines relative to vehicle age and mileage.",
     "{{CERT_PARA_1}}"),
    ("This document is intended for use in damage assessment and repair authorization. The information contained herein is submitted in good faith and represents the professional opinion of the undersigned appraiser.",
     "{{CERT_PARA_2}}"),

    # Important Notice
    ("This estimate is preliminary and does not represent a final repair cost. Actual repair costs may change following vehicle teardown and supplemental inspection. Additional hidden or structural damage not visible at the time of initial appraisal may result in supplemental claims. Final authorization and payment remain subject to carrier review and approval of any supplement requests.",
     "{{NOTICE_TEXT}}"),

    # Signature
    ("/s/ Vernon Long",                                  "{{SIGNATURE_TEXT}}"),
    ("February 28, 2026",                                "{{SIGNATURE_DATE}}"),
    ("Vernon Long",                                      "{{APPRAISER_NAME}}"),

    # License Number (in signature block, adjacent cell to Appraiser Name)
    # Note: if the redesign template has a license value here, replace it;
    # otherwise the token is inserted programmatically after template prep.
]

# Condition ratings — these are standalone "Normal" values in condition rows.
# We handle these specially since "Normal" appears in many paragraphs.
# We'll identify them by their paragraph position context.

CONDITION_COMPONENTS = [
    ("Paint",        "COND_PAINT_RATING"),
    ("Sheet Metal",  "COND_SHEET_METAL_RATING"),
    ("Glass",        "COND_GLASS_RATING"),
    ("Trim",         "COND_TRIM_RATING"),
    ("Seats",        "COND_SEATS_RATING"),
    ("Carpet",       "COND_CARPET_RATING"),
    ("Engine",       "COND_ENGINE_RATING"),
    ("Transmission", "COND_TRANS_RATING"),
]


def fill_tokens_in_xml(xml, replacements):
    """
    Paragraph-level token replacement — same strategy as bcifDocxFiller.js.
    For each <w:p>, concatenate all <w:t> text, perform replacements,
    put result into first <w:t>, clear the rest.
    """
    fill_count = 0
    t_pattern = re.compile(r'(<w:t(?=[\s>])[^>]*>)([\s\S]*?)(</w:t>)')

    def replace_para(m):
        nonlocal fill_count
        p_open = m.group(1)
        p_inner = m.group(2)
        p_close = m.group(3)

        t_matches = list(t_pattern.finditer(p_inner))
        if not t_matches:
            return m.group(0)

        full_text = ''.join(tm.group(2) for tm in t_matches)

        replaced = full_text
        for old, new in replacements:
            # Handle XML entity: & → &amp; in the XML
            old_xml = old.replace('&', '&amp;')
            if old_xml in replaced:
                replaced = replaced.replace(old_xml, new)
                fill_count += 1

        if replaced == full_text:
            return m.group(0)

        # Rebuild: first <w:t> gets all text, rest cleared
        new_inner = p_inner
        for i in range(len(t_matches) - 1, -1, -1):
            tm = t_matches[i]
            if i == 0:
                replacement = f'<w:t xml:space="preserve">{replaced}</w:t>'
            else:
                replacement = f'{tm.group(1)}{tm.group(3)}'
            new_inner = new_inner[:tm.start()] + replacement + new_inner[tm.end():]

        return p_open + new_inner + p_close

    para_pattern = re.compile(r'(<w:p\b[^>]*>)([\s\S]*?)(</w:p>)')
    xml = para_pattern.sub(replace_para, xml)
    return xml, fill_count


def tag_condition_ratings(xml):
    """
    Handle the condition rating cells. Each component row has 3 cells in sequence:
    component name | rating value | notes text.
    We need to replace the rating values (e.g. "Normal") with {{COND_XXX_RATING}}.

    Strategy: find each component label paragraph, then the next paragraph with
    just a rating word gets tokenized.
    """
    rating_words = {"Normal", "Below Average", "Above Average", "Exceptional"}
    fill_count = 0

    for comp_label, token_name in CONDITION_COMPONENTS:
        # Find the paragraph containing just the component label
        # Then find the next paragraph with a rating word
        # Pattern: component label in one <w:p>, followed by rating in next <w:p>
        pattern = re.compile(
            r'(<w:t[^>]*>)' + re.escape(comp_label) + r'(</w:t>)'
            r'([\s\S]*?)'  # stuff between
            r'(<w:t[^>]*>)(Normal|Below Average|Above Average|Exceptional)(</w:t>)',
            re.DOTALL
        )
        match = pattern.search(xml)
        if match:
            rating_val = match.group(5)
            # Replace just the rating value
            old = match.group(0)
            new = (match.group(1) + comp_label + match.group(2) +
                   match.group(3) +
                   match.group(4) + '{{' + token_name + '}}' + match.group(6))
            xml = xml.replace(old, new, 1)
            fill_count += 1

    return xml, fill_count


def main():
    if not os.path.exists(SRC):
        print(f"ERROR: Source file not found: {SRC}")
        sys.exit(1)

    # Remove dest if it exists (may be locked)
    if os.path.exists(DEST):
        try:
            os.remove(DEST)
        except OSError:
            pass

    # Read from source
    with zipfile.ZipFile(SRC, 'r') as z:
        xml = z.read('word/document.xml').decode('utf-8')
        other_files = {}
        for name in z.namelist():
            if name != 'word/document.xml':
                other_files[name] = z.read(name)

    # Step 1: General text replacements
    xml, count1 = fill_tokens_in_xml(xml, REPLACEMENTS)
    print(f"General replacements: {count1}")

    # Step 2: Condition ratings (context-aware)
    xml, count2 = tag_condition_ratings(xml)
    print(f"Condition ratings: {count2}")

    total = count1 + count2
    print(f"Total tokens placed: {total}")

    # Verify all expected tokens are present
    expected_tokens = [new for _, new in REPLACEMENTS]
    expected_tokens += ['{{' + tok + '}}' for _, tok in CONDITION_COMPONENTS]
    missing = [t for t in expected_tokens if t not in xml]
    if missing:
        print(f"\nWARNING: {len(missing)} tokens NOT found in output:")
        for t in missing:
            print(f"  {t}")
    else:
        print(f"\nAll {len(expected_tokens)} tokens verified present in output.")

    # Write the modified DOCX
    with zipfile.ZipFile(DEST, 'w', zipfile.ZIP_DEFLATED) as zout:
        for name, data in other_files.items():
            zout.writestr(name, data)
        zout.writestr('word/document.xml', xml.encode('utf-8'))

    print(f"\nTemplate saved to: {DEST}")


if __name__ == '__main__':
    main()
