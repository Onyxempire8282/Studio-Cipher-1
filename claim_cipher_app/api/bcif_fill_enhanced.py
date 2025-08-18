import re, json, sys, argparse, time
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional

# Try newer pypdf first, fallback to PyPDF2
try:
    from pypdf import PdfReader, PdfWriter
    from pypdf.generic import NameObject, TextStringObject
    print("Using pypdf (newer version)")
except ImportError:
    try:
        from PyPDF2 import PdfReader, PdfWriter
        from PyPDF2.generic import NameObject, TextStringObject
        print("Using PyPDF2 (legacy version)")
    except ImportError:
        print("ERROR: Neither pypdf nor PyPDF2 is available")
        sys.exit(1)

# ---------- Enhanced Extraction Helpers ----------

def uniq(seq):
    out, seen = [], set()
    for x in seq:
        if x not in seen:
            out.append(x); seen.add(x)
    return out

def extract_text(pdf_path: Path) -> str:
    text = ""
    r = PdfReader(str(pdf_path))
    for p in r.pages:
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
            if m.groups():
                return m.group(1), m
            return m.group(0), m
    return None, None

def titlecase(s: str) -> str:
    if not s:
        return s
    return " ".join(w[:1].upper() + w[1:].lower() if w else "" for w in s.split())

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
            if not str(disp_val).lower().endswith("l"):
                disp_val = f"{disp_val}L"
            break
    # If only displacement was found, assume default cyl if provided
    if disp_val and not cyl_val:
        default_cyl = compose.get("if_only_displacement_found_assume") or compose.get("normalize", {}).get("if_only_displacement_found_assume")
        if default_cyl:
            cyl_val = default_cyl
    if cyl_val and disp_val:
        return compose.get("format", "{cyl}-{disp}").format(cyl=cyl_val, disp=disp_val)
    return None

def apply_text_mapping(text: str, spec: Dict[str, Any]) -> Dict[str, str]:
    out = {}
    for field, rules in (spec or {}).items():
        if "compose" in rules:
            v = build_cylinders(text, rules["compose"])
            if v:
                out[field] = v
            continue
        pats = rules.get("patterns", [])
        if not pats:
            continue
        val, match = find_with_patterns(text, pats)
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
    for r in (checkbox_rules or {}).get("rules", []):
        field = r.get("field")
        if not field:
            continue
        pats = r.get("match_any", [])
        if any(re.search(pat, text, re.IGNORECASE | re.MULTILINE) for pat in pats):
            on.add(field)
    if (checkbox_rules or {}).get("prefer_4dr_over_2dr") and "4DR" in on and "2DR" in on:
        on.discard("2DR")
    return sorted(on)

def fill_pdf(template: Path, text_fields: Dict[str,str], on_fields: List[str], output: Path, flatten: bool = True) -> None:
    try:
        # Try the standard approach first
        r = PdfReader(str(template))
        w = PdfWriter()
        for p in r.pages:
            w.add_page(p)

        def set_state(annot, on=False):
            try:
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
            except Exception as e:
                print(f"Warning: Could not set checkbox state: {e}")
                return False

        # First set ALL checkboxes OFF so template defaults don't linger
        for page in w.pages:
            if "/Annots" in page:
                for a_ref in page["/Annots"]:
                    try:
                        a = a_ref.get_object()
                        if a.get("/FT") == "/Btn":
                            set_state(a, on=False)
                    except Exception as e:
                        print(f"Warning: Could not process checkbox: {e}")
                        continue

        # Turn on only desired checkboxes and write text fields
        for page in w.pages:
            if "/Annots" in page:
                for a_ref in page["/Annots"]:
                    try:
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
                                try:
                                    a.update({NameObject("/V"): TextStringObject(text_fields[fname])})
                                    a.update({NameObject("/DV"): TextStringObject(text_fields[fname])})
                                except Exception as e:
                                    print(f"Warning: Could not set text field {fname}: {e}")
                    except Exception as e:
                        print(f"Warning: Could not process field: {e}")
                        continue

        # Try to write the PDF
        try:
            with open(output, "wb") as f:
                w.write(f)
            print(f"SUCCESS: Successfully wrote filled PDF to {output}")
        except Exception as write_error:
            print(f"ERROR: PDF write failed: {write_error}")
            raise write_error
            
    except Exception as e:
        print(f"ERROR: PDF filling completely failed: {e}")
        print("INFO: Creating fallback summary PDF instead...")
        
        # Fallback: Create a summary PDF with the extracted data
        create_fallback_summary_pdf(text_fields, on_fields, output)

def create_fallback_summary_pdf(text_fields: Dict[str,str], on_fields: List[str], output: Path) -> None:
    """Create a summary PDF when the template filling fails"""
    try:
        # Try to use reportlab for better PDF creation if available
        try:
            from reportlab.pdfgen import canvas
            from reportlab.lib.pagesizes import letter
            
            c = canvas.Canvas(str(output), pagesize=letter)
            width, height = letter
            
            # Title
            c.setFont("Helvetica-Bold", 16)
            c.drawString(50, height - 50, "CCC BCIF Form - Extracted Data")
            
            # Text fields
            c.setFont("Helvetica-Bold", 12)
            c.drawString(50, height - 100, "Extracted Information:")
            
            c.setFont("Helvetica", 10)
            y_pos = height - 130
            
            for field, value in text_fields.items():
                if y_pos < 100:  # Start new page if needed
                    c.showPage()
                    y_pos = height - 50
                
                line = f"{field}: {value}"
                if len(line) > 80:  # Wrap long lines
                    line = line[:77] + "..."
                
                c.drawString(50, y_pos, line)
                y_pos -= 15
            
            # Checkbox fields
            if on_fields:
                if y_pos < 150:
                    c.showPage()
                    y_pos = height - 50
                
                c.setFont("Helvetica-Bold", 12)
                c.drawString(50, y_pos - 20, "Selected Options:")
                y_pos -= 50
                
                c.setFont("Helvetica", 10)
                for option in on_fields:
                    if y_pos < 50:
                        c.showPage()
                        y_pos = height - 50
                    
                    c.drawString(50, y_pos, f"CHECKED: {option}")
                    y_pos -= 15
            
            c.save()
            print(f"SUCCESS: Created fallback summary PDF: {output}")
            
        except ImportError:
            print("INFO: ReportLab not available, creating text summary...")
            # Last resort: create a text file
            with open(output.with_suffix('.txt'), "w") as f:
                f.write("CCC BCIF Extraction Results\n")
                f.write("=" * 30 + "\n\n")
                f.write("Text Fields:\n")
                for field, value in text_fields.items():
                    f.write(f"{field}: {value}\n")
                f.write(f"\nSelected Options:\n")
                for option in on_fields:
                    f.write(f"CHECKED: {option}\n")
            print(f"SUCCESS: Created text summary: {output.with_suffix('.txt')}")
    
    except Exception as fallback_error:
        print(f"ERROR: Even fallback PDF creation failed: {fallback_error}")

def main():
    ap = argparse.ArgumentParser(description="Fill BCIF PDF using enhanced mapping JSON + estimate PDF")
    ap.add_argument("--estimate", required=True, help="Path to estimate PDF")
    ap.add_argument("--template", required=True, help="Path to fillable BCIF PDF (AcroForm)")
    ap.add_argument("--mapping", required=True, help="Path to mapping JSON")
    ap.add_argument("--output", required=True, help="Path to output filled PDF")
    ap.add_argument("--debug_json", default="", help="Optional path to write resolved field/checkbox debug JSON")
    ap.add_argument("--flatten", action="store_true", help="Flatten the output PDF")
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

    fill_pdf(template, text_fields, on_fields, output, flatten=args.flatten)
    print(f"Enhanced BCIF processing complete: {output}")

if __name__ == "__main__":
    main()