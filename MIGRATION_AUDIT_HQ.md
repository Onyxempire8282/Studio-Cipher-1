# MIGRATION_AUDIT_HQ.md — Claim Cipher Architecture Audit

Generated: 2026-03-14

---

## 1. Complete File Inventory

Excludes: `node_modules/`, `.git/`, `dist/`, `.vercel/`, `__pycache__/`, `.venv/`, `.claude/`

### Root

| File | Purpose |
|------|---------|
| `.env.example` | Environment variable template |
| `.gitignore` | Git ignore rules |
| `404.html` | Custom 404 page |
| `BCIF_FORMATTING_FIX_PROMPT.md` | Dev notes — BCIF formatting |
| `CLAIM_CIPHER_DESIGN_CODEX.txt` | Design codex / source of truth |
| `DEPLOYMENT_CHECKLIST.md` | Deployment checklist |
| `LAUNCH_AUDIT.md` | Pre-launch audit notes |
| `LOCAL_DEV.md` | Local development guide |
| `PRE_LAUNCH_MANUAL_CHECKLIST.md` | Manual QA checklist |
| `README.md` | Project README |
| `prepare_summary_template.py` | Script to build summary DOCX template |
| `sitemap.xml` | SEO sitemap |
| `start_claim_cipher.bat` | Windows startup script |
| `start_claim_cipher.sh` | Unix startup script |
| `switch-config.js` | Config switcher utility |
| `test_estimate_tmp.txt` | Temp test estimate text |
| `vercel.json` | Root Vercel config (rewrites) |

### `.github/`

| File | Purpose |
|------|---------|
| `workflows/deploy-pages.yml` | GitHub Actions — GitHub Pages deploy |

### `api/`

| File | Purpose |
|------|---------|
| `subscribe.js` | Vercel serverless — email subscribe endpoint |

### `bcif-fill-test/`

| File | Purpose |
|------|---------|
| `BCIF_AUTOMATION_TEMPLATE_v3.docx` | BCIF template (v3) |
| `bcif_fill_test.py` | Python BCIF fill test harness |
| `build_v4_template.py` | Script to build v4 template |
| `input/JSHINGLETON 15 HONDA CIVIC EST.pdf` | Test input estimate |
| `input/SBRAYBOY 22 HONDA CRV EST.pdf` | Test input estimate |
| `output/BCIF_10382231.docx` | Test output |
| `output/BCIF_10382231.json` | Test output JSON |
| `output/BCIF_754114-GQ-2.docx` | Test output |
| `output/BCIF_754114-GQ-2.json` | Test output JSON |
| `output/BCIF_SYNTHETIC_TEST.docx` | Synthetic test output |

### `brand/` and `branding/`

| File | Purpose |
|------|---------|
| `brand/brand-readme.md` | Brand guidelines |
| `branding/icons/apple-touch-icon.png` | App icon |
| `branding/icons/favicon.ico` | Favicon |
| `branding/logo/claimcipher-full.png` | Full logo |
| `branding/logo/claimcipher-mark.png` | Logo mark |
| `branding/logo/claimcipher-wordmark.png` | Wordmark logo |
| `branding/README.md` | Branding readme |
| `branding/social/og-image.png` | Open Graph image |

### `claim_cipher_app/` — Core Application

#### HTML Pages

| File | Purpose |
|------|---------|
| `index.html` | Landing / demo page |
| `login-cypher.html` | Login page |
| `command-center.html` | Main dashboard |
| `total-loss-studio.html` | Total Loss Studio |
| `settings.html` | User settings |
| `mileage-cypher.html` | Mileage tracker |
| `my-routes.html` | Route history |
| `route-cypher.html` | Route planner |
| `welcome-cipher.html` | Welcome / onboarding |
| `reset-password.html` | Password reset |
| `billing-required.html` | Billing gate |
| `billing-success.html` | Billing success |
| `billing-cancel.html` | Billing cancel |

#### CSS

| File | Purpose |
|------|---------|
| `css/app.css` | Global app styles |
| `css/dashboard.css` | Dashboard styles |
| `css/login.css` | Login page styles |
| `css/mileage-cipher.css` | Mileage page styles |
| `css/my-routes.css` | Routes page styles |
| `css/route-cipher.css` | Route cipher styles |
| `css/settings.css` | Settings page styles |
| `css/welcome-cipher.css` | Welcome page styles |
| `styles/login-layout.css` | Login layout override |

#### Scripts (client-side JS)

| File | Purpose |
|------|---------|
| `scripts/auth-system.js` | Auth guards, session timeout |
| `scripts/billing.js` | Stripe billing integration |
| `scripts/billing-guard.js` | Billing status gatekeeper |
| `scripts/ccc-pdf-extractor.js` | PDF text extraction (pdf.js) |
| `scripts/cipher-content.js` | Content rendering helpers |
| `scripts/cipher-core.js` | Core app bootstrap, nav, profile |
| `scripts/cipher-security.js` | Security utilities |
| `scripts/claim-cipher-system-qa.js` | QA / diagnostic tool |
| `scripts/command-center.js` | Dashboard controller |
| `scripts/command-center-security.js` | Dashboard security layer |
| `scripts/command-center-tests.js` | Dashboard test suite |
| `scripts/demo-data.js` | Demo mode synthetic data |
| `scripts/distance-cache.js` | Google Maps distance cache |
| `scripts/enhanced-navigation.js` | SPA-style nav transitions |
| `scripts/firm-store.js` | Firm directory CRUD |
| `scripts/google-config.js` | Google Maps API key |
| `scripts/google-config.example.js` | Google config template |
| `scripts/jobs-studio.js` | Claims/jobs management UI |
| `scripts/mileage-cypher-combined.js` | Mileage tracker logic |
| `scripts/my-routes.js` | Route history controller |
| `scripts/reset-password.js` | Password reset flow |
| `scripts/route-cipher.js` | Route planning engine |
| `scripts/route-cypher.js` | Route cypher controller |
| `scripts/route-service.js` | Route CRUD service (Supabase) |
| `scripts/session-manager.js` | Client session state mgmt |
| `scripts/settings-manager.js` | Settings UI controller |
| `scripts/settings-page.js` | Settings page init |
| `scripts/settings-service.js` | Settings CRUD service (Supabase) |
| `scripts/supabase-auth.js` | Supabase auth wrapper (signIn/signUp/signOut/getSession) |
| `scripts/supabase-config.js` | Supabase URL + anon key config |
| `scripts/total-loss-field-mapping.js` | TLS field mapping |
| `scripts/total-loss-forms.js` | TLS form handling |
| `scripts/total-loss-security.js` | TLS security guards |
| `scripts/visual-consistency-validator.js` | Visual QA validator |
| `scripts/welcome-cipher.js` | Welcome page logic |
| `scripts/bcif-professional-mapper.js` | BCIF field mapping utilities |

#### Config

| File | Purpose |
|------|---------|
| `config/api-config.js` | API config (dev) |
| `config/api-config-production.js` | API config (prod) |
| `config/api-config-secure.js` | API config (secure variant) |
| `config/api-config-template.js` | API config template |
| `config/bcif-mapping.json` | BCIF field → form field mapping |
| `config/env.js` | Environment config |
| `config/github-pages-env.js` | GH Pages env override |

#### Modules — Total Loss v2

| File | Purpose |
|------|---------|
| `modules/total-loss-v2/index.js` | TLS v2 entry point |
| `modules/total-loss-v2/total-loss-studio.js` | TLS orchestrator |
| `modules/total-loss-v2/total-loss-v2.css` | TLS styles |
| `modules/total-loss-v2/bcifPayload.js` | BCIF payload (legacy?) |
| `modules/total-loss-v2/bcifPayloadBuilder.js` | BCIF token map builder |
| `modules/total-loss-v2/ratingMap.js` | Condition rating map |
| `modules/total-loss-v2/summaryEngine.js` | Summary generation engine |
| `modules/total-loss-v2/engines/cccParser.js` | CCC estimate text parser |
| `modules/total-loss-v2/engines/conditionEngine.js` | Vehicle condition logic |
| `modules/total-loss-v2/engines/coverageEngine.js` | Coverage type logic |
| `modules/total-loss-v2/engines/lossEngine.js` | Loss type / POI logic |
| `modules/total-loss-v2/engines/optionsEngine.js` | Vehicle options engine |
| `modules/total-loss-v2/render/bcifDocxFiller.js` | BCIF DOCX token filler |
| `modules/total-loss-v2/render/bcifFormFieldMap.js` | BCIF form field map |
| `modules/total-loss-v2/render/bcifPdfGenerator.js` | BCIF PDF generator |
| `modules/total-loss-v2/render/bcifRenderer.js` | BCIF render orchestrator |
| `modules/total-loss-v2/render/claimSummaryDocx.js` | Claim Summary DOCX generator |
| `modules/total-loss-v2/ui/processingView.js` | Processing spinner view |
| `modules/total-loss-v2/ui/summaryBuilderView.js` | Summary builder UI |
| `modules/total-loss-v2/ui/summaryView.js` | Summary display view |
| `modules/total-loss-v2/utils/demoWatermark.js` | Demo watermark injector |

#### API (Python — local BCIF fill server)

| File | Purpose |
|------|---------|
| `api/bcif_api.py` | Flask API entry point |
| `api/bcif_fill.py` | BCIF fill logic (basic) |
| `api/bcif_fill_enhanced.py` | BCIF fill logic (enhanced) |
| `api/bcif_docx_fill.py` | BCIF DOCX fill logic |
| `api/bcif_merge_and_fill.py` | BCIF merge + fill pipeline |
| `api/requirements.txt` | Python dependencies |
| `api/start_api.py` | API startup script |

#### Forms / Templates

| File | Purpose |
|------|---------|
| `forms/bcif/BCIF_AUTOMATION_TEMPLATE_v3.docx` | BCIF template v3 |
| `forms/bcif/BCIF_AUTOMATION_TEMPLATE_v4.docx` | BCIF template v4 |
| `forms/bcif/asset-index.json` | BCIF asset index |
| `forms/bcif/README.md` | BCIF forms readme |
| `forms/summaries/CLAIM_SUMMARY_TEMPLATE.docx` | Claim Summary template |
| `forms/summaries/CLAIM_SUMMARY_REDESIGN.docx` | Claim Summary redesign |
| `forms/summaries/README.md` | Summaries readme |
| `forms/CCC Fillable.xml` | CCC fillable XML form |
| `forms/Fillable_CCC_BCIF.pdf` | Fillable BCIF PDF |
| `forms/JALSTON 25 CHEVY EQUINOX EST.pdf` | Test estimate |

#### Shared UI Components

| File | Purpose |
|------|---------|
| `shared/cipher-help.css` | Help modal styles |
| `shared/cipher-help.js` | Help modal logic |
| `shared/cipher-workflows.js` | Workflow helpers |
| `shared/email-capture-modal.js` | Email capture popup |
| `shared/modal-utils.js` | Modal utility functions |

#### SQL / Migrations (app-level)

| File | Purpose |
|------|---------|
| `ADD_NEW_FIELDS_TO_SUPABASE.sql` | Ad-hoc field additions |
| `GET_USER_UUID.sql` | User UUID lookup |
| `SETUP_USER_909673ed.sql` | User setup script |
| `SUPABASE_DEPLOYMENT.sql` | Deployment SQL |
| `migrations/001_routes_and_mileage_logs.sql` | Routes + mileage tables |
| `migrations/002_add_stop_count_to_routes.sql` | Add stop_count column |

#### Other

| File | Purpose |
|------|---------|
| `src/components/auth/LoginCypher.jsx` | React login component (unused?) |
| `test/cccParser.test.js` | CCC parser test suite |
| `test/package.json` | Test dependencies |
| `test/fixtures/.gitkeep` | Test fixtures placeholder |
| `test_filled_bcif.pdf` | Filled BCIF test output |
| `assets/logo.png` | App logo |
| `assets/textures/Metal055B_1K-JPG_Color.jpg` | UI texture |
| `package.json` | NPM package config |
| `package-lock.json` | NPM lock file |
| `vercel.json` | App-level Vercel config |

### `docs/`

| File | Purpose |
|------|---------|
| `CCC_PARSER_SYSTEM_PROMPT.md` | CCC parser design doc |
| `README-investor.md` | Investor-facing README |
| `README-partner.md` | Partner-facing README |
| `README-public.md` | Public-facing README |

### `marketing/`

| File | Purpose |
|------|---------|
| `index.html` | Marketing landing page |
| `main.js` | Marketing page JS |
| `styles.css` | Marketing page CSS |
| `vercel.json` | Marketing Vercel config |
| `assets/logo.png` | Logo |
| `assets/mileage-cipher-preview.mp4` | Preview video |
| `assets/mileage-cipher-preview.png` | Preview image |
| `assets/route-cipher-preview.mp4` | Preview video |
| `assets/route-cipher-preview.png` | Preview image |
| `assets/total-loss-preview.mp4` | Preview video |
| `assets/total-loss-preview.png` | Preview image |

### `public/branding/`

Duplicate of `branding/` — icons, logos, OG image for public serving.

### `supabase/`

| File | Purpose |
|------|---------|
| `config.toml` | Supabase CLI config |
| `.temp/project-ref` | Project ref: `aviwltfqlunxxvkajpyt` |
| `functions/_shared/cors.ts` | CORS headers helper |
| `functions/_shared/stripe.ts` | Stripe client init |
| `functions/_shared/supabase.ts` | Supabase admin client + auth helper |
| `functions/billing-status/index.ts` | Edge fn: check billing status |
| `functions/create-checkout-session/index.ts` | Edge fn: Stripe checkout |
| `functions/create-portal-session/index.ts` | Edge fn: Stripe portal |
| `functions/stripe-webhook/index.ts` | Edge fn: Stripe webhook handler |

#### Supabase Migrations

| File | Purpose |
|------|---------|
| `migrations/20260222000100_billing_profiles.sql` | profiles, billing_events, dispatch_claims tables |
| `migrations/20260224000200_user_firms.sql` | user_firms table |
| `migrations/20260300000001_profiles_settings_columns.sql` | Add settings columns to profiles |
| `migrations/20260302000001_profiles_rls_user_id.sql` | RLS policy fix for profiles |
| `migrations/20260305000001_routes_delete_active.sql` | Allow deleting active routes |
| `migrations/20260307000001_session_tracking.sql` | Session tracking table |
| `migrations/20260313000001_firm_directory.sql` | firm_directory table |

---

## 2. Supabase Tables Referenced

Every unique table name found via `.from('table')` calls across all source files:

| Table | Files Using It |
|-------|---------------|
| `profiles` | `supabase-auth.js`, `cipher-core.js`, `command-center.js`, `my-routes.js`, `settings-service.js`, `billing-guard.js`, `billing-status/index.ts`, `create-checkout-session/index.ts`, `create-portal-session/index.ts`, `stripe-webhook/index.ts` |
| `routes` | `route-service.js`, `command-center.js` |
| `mileage_logs` | `route-service.js`, `command-center.js` |
| `user_firms` | `firm-store.js`, `settings-service.js`, `command-center.js` |
| `claims` | `jobs-studio.js` |
| `billing_events` | `stripe-webhook/index.ts` |

### Tables Defined in Migrations but NOT Referenced in App Code

| Table | Defined In | Notes |
|-------|-----------|-------|
| `dispatch_claims` | `20260222000100_billing_profiles.sql` | Placeholder for future Dispatch module — no app code calls it |
| `firm_directory` | `20260313000001_firm_directory.sql` | Read-only directory — may be used via demo data only |
| `session_tracking` | `20260307000001_session_tracking.sql` | Defined but no `.from('session_tracking')` found in JS |

---

## 3. Supabase Edge Functions

### Deployed Functions (in `supabase/functions/`)

| Function | File | Purpose |
|----------|------|---------|
| `billing-status` | `billing-status/index.ts` | Returns user's billing tier from `profiles` |
| `create-checkout-session` | `create-checkout-session/index.ts` | Creates Stripe Checkout session |
| `create-portal-session` | `create-portal-session/index.ts` | Creates Stripe Customer Portal session |
| `stripe-webhook` | `stripe-webhook/index.ts` | Handles Stripe webhook events, updates `profiles` + `billing_events` |

### Shared Modules (in `supabase/functions/_shared/`)

| File | Exports |
|------|---------|
| `cors.ts` | CORS response headers |
| `stripe.ts` | Stripe client instance |
| `supabase.ts` | `createAdminClient()`, `getAuthUser(req)` |

### Client-Side Invocation Points

| Caller | Edge Function Called | Method |
|--------|---------------------|--------|
| `billing-required.html:521` | `create-checkout-session` | `fetch(baseUrl + "/functions/v1/...")` |
| `billing-success.html:489` | `billing-status` | `fetch(baseUrl + "/functions/v1/...")` |
| `scripts/billing.js:46` | Generic invoker | `fetch(baseUrl + "/functions/v1/${name}")` |
| `scripts/billing.js:93` | `billing-status` | `fetch(baseUrl + "/functions/v1/billing-status")` |

---

## 4. Auth-Related Calls

### Primary Auth Module: `scripts/supabase-auth.js`

| Method | Line | Supabase API Used |
|--------|------|-------------------|
| `signIn()` | 43 | `client.auth.signInWithPassword()` |
| `signUp()` | 199 | `client.auth.signUp()` |
| `signOut()` | 241 | `client.auth.signOut()` |
| `getSession()` | 281 | `client.auth.getSession()` |
| Profile bootstrap | 115 | `.from('profiles').select()` after sign-in |
| Profile upsert | 148 | `.from('profiles').upsert()` on first sign-up |
| Session validation | 462 | `client.auth.getUser()` |
| Forced sign-out (inactive) | 471, 489 | `client.auth.signOut()` |

### Exported API (via `window.SupabaseAuth`)

```
signIn, signInWithSessionCheck, signUp, signOut, getSession
```

### Other Files Calling Auth Methods

| File | Calls | Notes |
|------|-------|-------|
| `auth-system.js:40,60` | `window.SupabaseAuth.signOut()` | Session timeout handler |
| `billing-guard.js:27` | `client.auth.getUser()` | Gate billing page |
| `billing.js:28` | `client.auth.getSession()` | Get token for edge fn calls |
| `cipher-core.js:217` | `window.SupabaseAuth.signOut()` | Logout from nav |
| `cipher-core.js:271` | `sb.auth.getUser()` | Profile loading |
| `cipher-security.js:58` | `window.SupabaseAuth.signOut()` | Security-forced logout |
| `command-center.js:145` | `window.SupabaseAuth.signOut()` | Dashboard logout |
| `command-center.js:318,497` | `sb.auth.getUser()` | Dashboard user context |
| `command-center-security.js:183,200` | `window.SupabaseAuth.signOut()` | Security logout |
| `firm-store.js:45` | `c.auth.getSession()` | Get user for firm queries |
| `jobs-studio.js:1700` | `this.supabase.auth.getUser()` | Claims ownership check |
| `mileage-cypher-combined.js:1239` | `window.SupabaseAuth.signOut()` | Page logout |
| `my-routes.js:76` | `window.SupabaseAuth.getSession()` | Route history user context |
| `reset-password.js:35` | `client.auth.getSession()` | Password reset flow |
| `route-service.js:38` | `client.auth.getUser()` | Route CRUD ownership |
| `settings-service.js:14` | `sb.auth.getUser()` | Settings user context |
| `settings-service.js:176` | `sb.auth.signOut()` | Account deletion logout |
| `supabase/functions/_shared/supabase.ts:21` | `admin.auth.getUser(token)` | Edge fn auth validation |

---

## 5. Cipher Dispatch / CD Project References

### Supabase Project

- **Project ref:** `aviwltfqlunxxvkajpyt`
- **URL:** `https://aviwltfqlunxxvkajpyt.supabase.co`
- **No reference to `qrouuoycvxxxutkxkxpp`** found anywhere in the codebase.

### "Cipher Dispatch" References

| File | Line | Context |
|------|------|---------|
| `CLAIM_CIPHER_DESIGN_CODEX.txt:5` | `"source of truth when building Cipher Dispatch or any..."` | Design doc — mentions CD as future module |
| `route-cypher.html:82` | `"Drop claims here from Cipher Dispatch"` | UI placeholder text |
| `scripts/route-cipher.js:3306` | Error: `"Make sure you are dragging claim data from Cipher Dispatch."` | Drag-drop error message |
| `scripts/route-cipher.js:3314` | Error: `"Please drag claims from Cipher Dispatch, not links or text."` | Drag-drop validation |
| `scripts/route-cipher.js:3329` | Error: `"Please ensure claims are properly formatted from Cipher Dispatch."` | JSON parse error |
| `scripts/route-cipher.js:3414` | HTML: `"Drop claims here from Cipher Dispatch"` | Dynamic HTML template |

### "Dispatch" in Schema / Docs

| File | Context |
|------|---------|
| `migrations/20260222000100_billing_profiles.sql` | `dispatch_enabled BOOLEAN` column on `profiles`; `dispatch_claims` table created |
| `LAUNCH_AUDIT.md:94` | Lists `dispatch_claims` in RLS verification checklist |
| `PRE_LAUNCH_MANUAL_CHECKLIST.md:31` | Lists `dispatch_claims` as pro-tier gated |
| `docs/README-investor.md` | Dispatch listed as "Planned" module |
| `docs/README-partner.md` | Dispatch described in roadmap |
| `docs/README-public.md` | Dispatch mentioned in planned features |
| `README.md:210` | Dispatch in roadmap section |

### Summary

- **Cipher Dispatch is referenced as a planned/future module** — not yet implemented in app code
- The `dispatch_claims` table exists in migrations but has **zero reads/writes** from JS
- The `dispatch_enabled` boolean exists on `profiles` but is **never checked** in client code
- Route Cipher UI has placeholder drag-drop text referencing Cipher Dispatch as a data source
- **No cross-project reference** to `qrouuoycvxxxutkxkxpp` (Cipher Dispatch Supabase project) exists in this repo

---

## Appendix: Supabase Config

```
Project Ref:  aviwltfqlunxxvkajpyt
Project URL:  https://aviwltfqlunxxvkajpyt.supabase.co
Anon Key:     eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...(truncated)
Config File:  claim_cipher_app/scripts/supabase-config.js
```
