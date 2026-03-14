# VENDORS_AUDIT_HQ.md — Vendors Table Audit

Generated: 2026-03-14

---

## Result: No `vendors` table exists in this codebase

A full search of all `.js`, `.ts`, `.jsx`, `.tsx`, `.html`, `.sql`, `.json`, `.md`, `.txt`, `.py`, `.toml`, and `.yml` files found:

- **0 files** call `.from('vendors')`
- **0 migrations** create or reference a `vendors` table
- **0 columns** read from or written to a `vendors` table
- **0 RLS policies** reference `vendors`

### What was found

The word "vendor" appears only in prose — never in code or schema:

| File | Line | Context |
|------|------|---------|
| `CLAIM_CIPHER_DESIGN_CODEX.txt:1535` | `"SECTION 9 — FIRMS/VENDORS JAVASCRIPT (COMPLETE)"` | Section header in design doc — the implementation uses `user_firms`, not `vendors` |
| `docs/README-investor.md:52` | `"Underserved by existing software vendors"` | Market analysis prose |
| `docs/README-investor.md:137` | `"...no vendor has unified because no vendor operates in the field"` | Competitive analysis prose |

### What is used instead

The concept of "firms" (insurance carriers, body shops, third-party vendors) is handled by:

| Table | Purpose |
|-------|---------|
| `user_firms` | User-specific firm records — CRUD via `firm-store.js` and `settings-service.js` |
| `firm_directory` | Read-only firm directory (migration `20260313000001`) — no active `.from()` calls in JS |

### Columns on `user_firms` (the actual firm table in use)

Referenced in `firm-store.js` and `settings-service.js`:

| Column | Read | Write | Used For |
|--------|------|-------|----------|
| `id` | Yes | No | Primary key, record identification |
| `user_id` | Yes | Yes | Row-level ownership (RLS filter) |
| `firm_name` | Yes | Yes | Display name in settings and route planner |
| `firm_type` | Yes | Yes | Category (carrier, shop, etc.) |
| `address` | Yes | Yes | Firm location — used in route/mileage calculations |
| `phone` | Yes | Yes | Contact display |
| `email` | Yes | Yes | Contact display |
| `website` | Yes | Yes | Contact display |
| `notes` | Yes | Yes | User notes |
| `created_at` | Yes | No | Sort order / audit |

---

## Summary

If a `vendors` table is needed, it does not exist yet and would need to be created. The closest equivalent is `user_firms`, which stores per-user firm/vendor records and is actively used in the settings page, firm store, and command center.
