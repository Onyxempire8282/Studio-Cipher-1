#!/usr/bin/env python3
"""
BCIF DOCX filling endpoint for Total Loss V2.

The BCIF_AUTOMATION_TEMPLATE_v3.docx uses {{TOKEN}} text placeholders
embedded directly in the document body (NOT legacy Word form fields).
Word splits tokens across multiple XML <w:r> runs, so we merge text
within each paragraph before doing replacement.
"""

import re
import zipfile
from io import BytesIO
from pathlib import Path

from flask import request, jsonify, send_file

from bcif_api import app

TEMPLATE_PATH = Path(__file__).parent.parent / "forms" / "bcif" / "BCIF_AUTOMATION_TEMPLATE_v3.docx"


def _xml_escape(text: str) -> str:
    """Escape XML special characters."""
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )


def _fill_tokens_in_xml(xml: str, token_map: dict) -> tuple:
    """
    Replace all {{TOKEN}} placeholders in the document XML.

    Handles Word's split-run problem by merging <w:t> text across runs
    within each paragraph, performing replacements, then writing the
    result back into the first run's <w:t> and clearing subsequent runs.

    Returns (modified_xml, fill_count).
    """
    fill_count = 0
    para_pattern = re.compile(r'(<w:p\b[^>]*>)(.*?)(</w:p>)', re.DOTALL)

    def process_paragraph(para_match):
        nonlocal fill_count
        p_open = para_match.group(1)
        p_inner = para_match.group(2)
        p_close = para_match.group(3)

        t_pattern = re.compile(r'(<w:t[^>]*>)(.*?)(</w:t>)', re.DOTALL)
        t_matches = list(t_pattern.finditer(p_inner))
        if not t_matches:
            return para_match.group(0)

        full_text = "".join(m.group(2) for m in t_matches)
        if "{{" not in full_text:
            return para_match.group(0)

        replaced_text = full_text
        for token_name, value in token_map.items():
            placeholder = "{{" + token_name + "}}"
            if placeholder in replaced_text:
                replaced_text = replaced_text.replace(placeholder, _xml_escape(str(value)))
                fill_count += 1

        if replaced_text == full_text:
            return para_match.group(0)

        new_inner = p_inner
        for i, tm in reversed(list(enumerate(t_matches))):
            start = tm.start()
            end = tm.end()
            if i == 0:
                replacement = f'<w:t xml:space="preserve">{replaced_text}</w:t>'
            else:
                replacement = f'{tm.group(1)}{tm.group(3)}'
            new_inner = new_inner[:start] + replacement + new_inner[end:]

        return p_open + new_inner + p_close

    xml = para_pattern.sub(process_paragraph, xml)
    return xml, fill_count


def fill_docx_form(template_bytes: bytes, token_map: dict) -> bytes:
    """
    Fill a BCIF .docx template using {{TOKEN}} replacement.

    Args:
        template_bytes: Raw bytes of the .docx template file
        token_map: Dict of BCIF token names → values

    Returns:
        Filled .docx as bytes
    """
    normalized = {}
    for key, value in token_map.items():
        if key.startswith("_"):
            continue
        normalized[str(key)] = "" if value is None else str(value)

    in_zip = BytesIO(template_bytes)
    out_zip = BytesIO()

    with zipfile.ZipFile(in_zip, "r") as zin:
        with zipfile.ZipFile(out_zip, "w", zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                data = zin.read(item.filename)
                if item.filename == "word/document.xml":
                    xml = data.decode("utf-8")
                    xml, count = _fill_tokens_in_xml(xml, normalized)
                    data = xml.encode("utf-8")
                zout.writestr(item, data)

    return out_zip.getvalue()


@app.route("/fill-bcif-docx", methods=["POST"])
def fill_bcif_docx():
    """
    Fill BCIF Word template using a JSON token map.

    Accepts the flat token map from renderBCIFPayload() and returns the
    filled .docx with {{TOKEN}} placeholders replaced.
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Missing JSON payload"}), 400

    token_map = data.get("tokens", data)
    if not isinstance(token_map, dict):
        return jsonify({"error": "Token map must be an object"}), 400

    if not TEMPLATE_PATH.exists():
        return jsonify({"error": f"Template not found: {TEMPLATE_PATH}"}), 500

    try:
        template_bytes = TEMPLATE_PATH.read_bytes()
        filled_bytes = fill_docx_form(template_bytes, token_map)

        output_stream = BytesIO(filled_bytes)
        output_stream.seek(0)

        claim_num = str(token_map.get("CLAIM_NUMBER", "FILLED") or "FILLED")
        filename = f"BCIF_{claim_num}.docx"

        return send_file(
            output_stream,
            as_attachment=True,
            download_name=filename,
            mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )

    except Exception as e:
        print(f"[fill-bcif-docx] Error: {e}")
        return jsonify({"error": f"Form filling failed: {str(e)}"}), 500
