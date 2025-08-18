import re, json, sys, argparse, time
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from PyPDF2 import PdfReader, PdfWriter
from PyPDF2.generic import NameObject, TextStringObject

# ----------------- Merge helpers -----------------

def uniq(seq):
    out, seen = [], set()
    for x in seq:
        if x not in seen:
            out.append(x); seen.add(x)
    return out

def merge_text_fields(base: Dict[str, Any], patch: Dict[str, Any]) -> Dict[str, Any]:
    out = dict(base or {})
    for k, v in (patch or {}).items():
        if k not in out:
            out[k] = v
            continue
        # Merge patterns list; keep transforms/compose preferring patch
        b = out[k] or {}
        merged = dict(b)
        if "patterns" in b or "patterns" in v:
            merged_patterns = uniq((b.get("patterns") or []) + (v.get("patterns") or []))
            merged["patterns"] = merged_patterns
        if "compose" in v:
            merged["compose"] = v["compose"]
        if "transform" in v:
            merged["transform"] = v["transform"]
        out[k] = merged
    return out

def index_rules_by_field(rules: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    out = {}
    for r in rules or []:
        f = r.get("field")
        if not f: 
            # Allow anonymous rules but they can't be merged; keep by repr
            f = "__anon__:" + json.dumps(r, sort_keys=True)
        if f not in out:
            out[f] = dict(r)
        else:
            # Merge match_any
            a = out[f].get("match_any") or []
            b = r.get("match_any") or []
            out[f]["match_any"] = uniq(a + b)
            # Carry over any other flags/keys from patch
            for kk, vv in r.items():
                if kk not in ("field","match_any"):
                    out[f][kk] = vv
    return out

def merge_checkbox_rules(base: Dict[str, Any], patch: Dict[str, Any]) -> Dict[str, Any]:
    out = dict(base or {})
    # prefer_4dr_over_2dr
    if "prefer_4dr_over_2dr" in (patch or {}):
        out["prefer_4dr_over_2dr"] = patch["prefer_4dr_over_2dr"]
    # merge rules by field key
    base_idx = index_rules_by_field((base or {}).get("rules") or [])
    patch_idx = index_rules_by_field((patch or {}).get("rules") or [])
    # Overlay patch on base
    base_idx.update(patch_idx)
    out["rules"] = list(base_idx.values())
    return out

def merge_post_processing(base: Dict[str, Any], patch: Dict[str, Any]) -> Dict[str, Any]:
    out = dict(base or {})
    # simple dict overwrite for known keys; union arrays
    if "doors_priority" in patch:
        out["doors_priority"] = patch["doors_priority"]
    if "cylinder_format" in patch:
        out["cylinder_format"] = patch["cylinder_format"]
    if "zip_selection" in patch:
        out["zip_selection"] = patch["zip_selection"]
    # titlecase_fields union
    tc = uniq((base or {}).get("titlecase_fields", []) + (patch or {}).get("titlecase_fields", []))
    if tc:
        out["titlecase_fields"] = tc
    return out

def merge_meta(base: Dict[str, Any], patch: Dict[str, Any]) -> Dict[str, Any]:
    out = dict(base or {})
    # Notes union
    notes = uniq((base or {}).get("notes", []) + (patch or {}).get("notes", []))
    if notes:
        out["notes"] = notes
    # Prefer patch pdf_template if present
    if "pdf_template" in patch:
        out["pdf_template"] = patch["pdf_template"]
    # Update name & timestamp to reflect merge
    out["name"] = patch.get("name", base.get("name", "bcif_merged"))
    out["merged_at"] = time.strftime("%Y-%m-%d %H:%M:%S")
    return out

def deep_merge_mappings(base: Dict[str, Any], patch: Dict[str, Any]) -> Dict[str, Any]:
    merged = {}
    merged["meta"] = merge_meta(base.get("meta", {}), patch.get("meta", {}))
    merged["text_fields"] = merge_text_fields(base.get("text_fields", {}), patch.get("text_fields", {}))
    merged["checkbox_rules"] = merge_checkbox_rules(base.get("checkbox_rules", {}), patch.get("checkbox_rules", {}))
    merged["post_processing"] = merge_post_processing(base.get("post_processing", {}), patch.get("post_processing", {}))
    return merged

# ----------------- Parsing helpers -----------------

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

def apply_text_mapping(text: str, spec: Dict[str, Any], post: Dict[str, Any]) -> Dict[str, str]:
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
    # post-processing
    for k in (post or {}).get("titlecase_fields", []):
        if k in out:
            out[k] = titlecase(out[k])
    if (post or {}).get("zip_selection") == "first_five_digits" and "Loss ZIP Code" in out:
        m = re.search(r"\b(\d{5})\b", out["Loss ZIP Code"])
        if m:
            out["Loss ZIP Code"] = m.group(1)
    return out

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

# ----------------- PDF filler -----------------

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

    # Turn ALL checkboxes OFF (neutralize template defaults)
    for page in w.pages:
        if "/Annots" in page:
            for a_ref in page["/Annots"]:
                a = a_ref.get_object()
                if a.get("/FT") == "/Btn":
                    set_state(a, on=False)

    # Turn ON desired checkboxes and write text fields
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

# ----------------- CLI -----------------

def main():
    ap = argparse.ArgumentParser(description="Merge mapping JSONs and fill BCIF using merged spec")
    ap.add_argument("--base", required=True, help="Path to YOUR existing mapping JSON")
    ap.add_argument("--patch", required=True, help="Path to my mapping JSON (e.g., bcif_generic_mapping_v1.json)")
    ap.add_argument("--write_merged", required=True, help="Path to write merged mapping JSON")
    ap.add_argument("--estimate", required=True, help="Path to estimate PDF")
    ap.add_argument("--template", required=True, help="Path to fillable BCIF (AcroForm)")
    ap.add_argument("--output", required=True, help="Path to output filled PDF")
    ap.add_argument("--debug_json", default="", help="Optional path to write resolved fields/checkboxes")
    ap.add_argument("--merge_only", action="store_true", help="Only write merged JSON; do not fill")
    args = ap.parse_args()

    with open(args.base, "r") as f:
        base = json.load(f)
    with open(args.patch, "r") as f:
        patch = json.load(f)

    merged = deep_merge_mappings(base, patch)
    with open(args.write_merged, "w") as f:
        json.dump(merged, f, indent=2)

    if args.merge_only:
        print(f"Merged mapping written to: {args.write_merged}")
        sys.exit(0)

    text = extract_text(Path(args.estimate))
    text_fields = apply_text_mapping(text, merged.get("text_fields", {}), merged.get("post_processing", {}))
    on_fields = collect_checkbox_states(text, merged.get("checkbox_rules", {}))

    if args.debug_json:
        dbg = {"resolved_text_fields": text_fields, "resolved_checkboxes_on": on_fields}
        with open(args.debug_json, "w") as f:
            json.dump(dbg, f, indent=2)

    fill_pdf(Path(args.template), text_fields, on_fields, Path(args.output))
    print(f"Filled PDF written to: {args.output}")

if __name__ == "__main__":
    main()