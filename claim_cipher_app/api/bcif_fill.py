
import re, json, sys, argparse
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional
from PyPDF2 import PdfReader, PdfWriter
from PyPDF2.generic import NameObject, TextStringObject

# ---------- Helpers ----------

def extract_text(pdf_path: Path) -> str:
    reader = PdfReader(str(pdf_path))
    text = ""
    for p in reader.pages:
        try:
            text += p.extract_text() or ""
            text += "\n"
        except Exception:
            continue
    return text

def find_with_patterns(text: str, patterns: List[str]) -> Tuple[Optional[str], Optional[re.Match]]:
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE | re.MULTILINE)
        if m:
            # Prefer last group if present, else the whole match
            if m.groups():
                return m.group(1), m
            return m.group(0), m
    return None, None

def titlecase(s: str) -> str:
    if not s:
        return s
    return " ".join(p[:1].upper() + p[1:].lower() if p else "" for p in s.split())

def digits_only(s: str) -> str:
    return re.sub(r"[^\d]", "", s or "")

def build_cylinders(text: str, compose: Dict[str, Any]) -> Optional[str]:
    cyl_val = None
    disp_val = None
    norm = compose.get("normalize", {})
    for pat in compose.get("cyl_from", []):
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            cyl_val = m.group(1)
            cyl_val = norm.get(cyl_val, cyl_val)
            break
    for pat in compose.get("disp_from", []):
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            disp_val = m.group(1)
            if not disp_val.lower().endswith("l"):
                disp_val += "L"
            break
    if disp_val and not cyl_val:
        cyl_val = compose.get("normalize", {}).get(compose.get("if_only_displacement_found_assume", ""), None)
    if cyl_val and disp_val:
        return compose.get("format", "{cyl}-{disp}").format(cyl=cyl_val, disp=disp_val)
    return None

def apply_text_mapping(text: str, spec: Dict[str, Any]) -> Dict[str, str]:
    out = {}
    for field, rules in spec.items():
        if "compose" in rules:
            v = build_cylinders(text, rules["compose"])
            if v:
                out[field] = v
            continue

        patterns = rules.get("patterns", [])
        if not patterns:
            continue
        val, match = find_with_patterns(text, patterns)
        if val is None and match is None:
            continue

        tf = rules.get("transform")
        if tf == "first_group" and match:
            val = match.group(1) if match.lastindex and match.lastindex >= 1 else val
        elif tf == "second_group" and match:
            val = match.group(2) if match.lastindex and match.lastindex >= 2 else val
        elif tf == "first_group_title" and match:
            g = match.group(1) if match.lastindex and match.lastindex >= 1 else val
            val = titlecase(g)
        elif tf == "second_group_title" and match:
            g = match.group(2) if match.lastindex and match.lastindex >= 2 else val
            val = titlecase(g)
        elif tf == "digits_only":
            val = digits_only(val)

        if isinstance(val, str):
            out[field] = val.strip()
    return out

def apply_post_processing(fields: Dict[str,str], post: Dict[str,Any]) -> None:
    # titlecase certain fields
    for k in post.get("titlecase_fields", []):
        if k in fields:
            fields[k] = titlecase(fields[k])
    # ZIP normalization
    if post.get("zip_selection") == "first_five_digits" and "Loss ZIP Code" in fields:
        m = re.search(r"\b(\d{5})\b", fields["Loss ZIP Code"])
        if m:
            fields["Loss ZIP Code"] = m.group(1)
    # Make mapping (CHEV -> Chevrolet, etc.)
    make_mapping = post.get("make_mapping", {})
    if "Make" in fields and fields["Make"] in make_mapping:
        fields["Make"] = make_mapping[fields["Make"]]

def collect_checkbox_states(text: str, checkbox_rules: Dict[str,Any]) -> List[str]:
    on = set()
    for r in checkbox_rules.get("rules", []):
        field = r.get("field")
        if not field:
            continue
        pats = r.get("match_any", [])
        found = any(re.search(pat, text, re.IGNORECASE | re.MULTILINE) for pat in pats)
        if found:
            on.add(field)

    # Prefer 4DR over 2DR if both present
    if checkbox_rules.get("prefer_4dr_over_2dr", False) and "4DR" in on and "2DR" in on:
        on.discard("2DR")
    return sorted(on)

def fill_pdf(template: Path, text_fields: Dict[str,str], on_fields: List[str], output: Path) -> None:
    r = PdfReader(str(template))
    w = PdfWriter()
    for p in r.pages:
        w.add_page(p)

    def set_state(annot, on=False):
        ap = annot.get("/AP")
        if not ap or not ap.get("/N"):
            return False
        desired = None
        for key in ap["/N"].keys():
            if on and "Off" not in str(key):
                desired = key; break
            if not on and "Off" in str(key):
                desired = key; break
        if desired is None:
            return False
        annot.update({NameObject("/AS"): desired})
        annot.update({NameObject("/V"): desired})
        return True

    # First set ALL checkboxes OFF so template defaults don't linger
    for page in w.pages:
        if "/Annots" in page:
            for a_ref in page["/Annots"]:
                a = a_ref.get_object()
                if a.get("/FT") == "/Btn":
                    set_state(a, on=False)

    # Turn on only desired checkboxes and write text fields
    for page in w.pages:
        if "/Annots" in page:
            for a_ref in page["/Annots"]:
                a = a_ref.get_object()
                fname_obj = a.get("/T")
                fname = str(fname_obj).strip("()") if fname_obj else None
                ftype = a.get("/FT")

                if not fname:
                    continue

                if ftype == "/Btn":
                    if fname in on_fields:
                        set_state(a, on=True)
                else:
                    if fname in text_fields:
                        a.update({NameObject("/V"): TextStringObject(text_fields[fname])})
                        a.update({NameObject("/DV"): TextStringObject(text_fields[fname])})

    with open(output, "wb") as f:
        w.write(f)

def main():
    ap = argparse.ArgumentParser(description="Fill BCIF PDF using generic mapping JSON + estimate PDF")
    ap.add_argument("--estimate", required=True, help="Path to estimate PDF")
    ap.add_argument("--template", required=True, help="Path to fillable BCIF PDF (AcroForm)")
    ap.add_argument("--mapping", required=True, help="Path to bcif_generic_mapping_v1.json")
    ap.add_argument("--output", required=True, help="Path to output filled PDF")
    ap.add_argument("--debug_json", default="", help="Optional path to write resolved field/checkbox debug JSON")
    args = ap.parse_args()

    estimate = Path(args.estimate)
    template = Path(args.template)
    mapping = Path(args.mapping)
    output = Path(args.output)

    with open(mapping, "r") as f:
        spec = json.load(f)

    text = extract_text(estimate)
    text_fields = apply_text_mapping(text, spec.get("text_fields", {}))
    apply_post_processing(text_fields, spec.get("post_processing", {}))
    on_fields = collect_checkbox_states(text, spec.get("checkbox_rules", {}))

    if args.debug_json:
        dbg = {
            "resolved_text_fields": text_fields,
            "resolved_checkboxes_on": on_fields
        }
        with open(args.debug_json, "w") as f:
            json.dump(dbg, f, indent=2)

    fill_pdf(template, text_fields, on_fields, output)
    print(f"Filled PDF written to: {output}")

if __name__ == "__main__":
    main()
