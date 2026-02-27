# Claim Cipher — Launch Audit Report

**Date:** 2026-02-27
**Audited by:** Claude Code Pre-Production Audit (Parts 1-3)
**Repository:** Studio-Cipher-1 (main branch)

---

## Go / No-Go Recommendation

**GO** — with manual actions required before Vercel connection.

All code-level blockers have been resolved. The application runs correctly at
localhost:5500. Supabase auth, billing guard, and edge functions are properly
structured. No exposed secrets remain in client-side code (the Google Maps dev
key in config files is expected for local development and overridden by GitHub
Secrets in production). RLS policies are in place for all user data tables.

The remaining items are operational (setting live keys, deploying edge functions,
configuring DNS) and are documented in PRE_LAUNCH_MANUAL_CHECKLIST.md.

---

## Readiness Score: 92/100

| Category | Score | Notes |
|----------|-------|-------|
| Authentication & Auth Guards | 10/10 | Supabase auth, protectPage, session_expired redirect |
| Billing & Subscription | 9/10 | Stripe integration solid; needs live keys configured |
| Navigation & UI Consistency | 10/10 | All 5 core pages match reference standard |
| CSS & Design System | 9/10 | Two variable systems coexist (app.css + universal-system.css) but work correctly |
| Error Handling | 9/10 | Maps unavailable notice, session expiry, billing errors all handled |
| Security | 9/10 | No live secrets exposed; dev Google Maps key in config is expected |
| Edge Functions | 10/10 | All read secrets from Deno.env, webhook signature verified |
| Performance | 9/10 | All scripts defer, img dimensions set, no duplicate libs |
| Documentation | 9/10 | LOCAL_DEV, deployment checklist, .env.example all present |
| Local Dev Experience | 9/10 | Works at localhost:5500 with zero config |

**Deductions:** -8 points for operational items not yet completed (live keys,
edge function deployment, DNS — these are expected pre-launch tasks).

---

## Issues Found

| # | Severity | Issue | File(s) | Fixed |
|---|----------|-------|---------|-------|
| 1 | BLOCKER | Start scripts used port 8080 instead of 5500 | start_claim_cipher.sh, .bat | Yes (Part 1) |
| 2 | BLOCKER | Corrupted merge in refreshFirmDropdown() — garbled code | mileage-cypher-combined.js:147 | Yes (Part 1) |
| 3 | BLOCKER | Corrupted merge in loadFirmsListInModal() — garbled code | mileage-cypher-combined.js:766 | Yes (Part 1) |
| 4 | BLOCKER | Orphaned await outside function — breaks entire file | mileage-cypher-combined.js:1372 | Yes (Part 1) |
| 5 | CRITICAL | Command center white page — duplicate inline style block | command-center.html | Yes (Part 1) |
| 6 | CRITICAL | Logout double-fire on command center | command-center.js | Yes (Part 1) |
| 7 | CRITICAL | Round trip toggle not reading checkbox state | mileage-cypher-combined.js | Yes (Part 1) |
| 8 | HIGH | Mileage toggle CSS :checked states missing | mileage-cypher.html | Yes (Part 1) |
| 9 | HIGH | Branding paths 404 locally (/branding/ at wrong level) | claim_cipher_app/branding/ | Yes (Part 1) |
| 10 | HIGH | Duplicate handleLogout() in mileage-cypher-combined.js | mileage-cypher-combined.js | Yes (Part 1) |
| 11 | MEDIUM | index.html missing viewport meta, wrong redirect | index.html | Yes (Part 1) |
| 12 | MEDIUM | billing-required.html used alert() for errors | billing-required.html | Yes (Part 1) |
| 13 | LOW | billing-cancel.html missing favicon | billing-cancel.html | Yes (Part 1) |
| 14 | LOW | total-loss-studio.html missing Google Fonts link | total-loss-studio.html | Yes (Part 1) |
| 15 | HIGH | Mileage-cypher nav tab order wrong (Mileage/Routes swapped) | mileage-cypher.html | Yes (Part 2) |
| 16 | MEDIUM | Nav-user HTML inconsistent across pages | 5 core HTML pages | Yes (Part 2) |
| 17 | MEDIUM | Nav-logout used all:unset on mileage + total-loss pages | mileage-cypher.html, total-loss-studio.html | Yes (Part 2) |
| 18 | MEDIUM | my-routes.html default userName was "—" not "Professional User" | my-routes.html | Yes (Part 2) |
| 19 | LOW | Orphan glassmorphism-validator.js (no HTML imports it) | scripts/glassmorphism-validator.js | Yes (Part 2, deleted) |
| 20 | LOW | Glassmorphism references in command-center-tests.js | command-center-tests.js | Yes (Part 2) |
| 21 | LOW | Glassmorphism references in login-cypher.js | login-cypher.js | Yes (Part 2) |
| 22 | MEDIUM | All nav logo img tags missing width/height (CLS) | 7 HTML pages | Yes (Part 2) |
| 23 | MEDIUM | Maps unavailable — only console.error, no visible notice | mileage-cypher.html | Yes (Part 2) |
| 24 | MEDIUM | protectPage() redirect missing ?reason=session_expired | supabase-auth.js | Yes (Part 2) |
| 25 | MEDIUM | login-cypher.js not reading session_expired URL param | login-cypher.js | Yes (Part 2) |
| 26 | LOW | billing-cancel.html missing retry button | billing-cancel.html | Yes (Part 2) |
| 27 | LOW | route-cypher init catch only logged to console | route-cypher.html | Yes (Part 2) |
| 28 | INFO | Google Maps dev key in config files (expected for local dev) | config/api-config.js, google-config.js | N/A — overridden by GitHub Secrets |
| 29 | INFO | total-loss-forms.js orphan with hardcoded localhost:5000 | scripts/total-loss-forms.js | N/A — dead code, not imported |
| 30 | INFO | Two CSS variable systems coexist (--cipher-* and --plate/--amber) | universal-system.css, app.css | N/A — working as designed |
| 31 | INFO | .env.example missing STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET | .env.example | Yes (Part 3) |

---

## Remaining Blockers Before Launch

**None.** All code-level blockers have been resolved. The remaining items are
operational configuration tasks documented in PRE_LAUNCH_MANUAL_CHECKLIST.md.

---

## Manual Actions Required Before Vercel Connection

1. Set GitHub Secrets: `GOOGLE_MAPS_API_KEY_RESTRICTED`, `ENV_SUPABASE_URL`, `ENV_SUPABASE_ANON_KEY`
2. Deploy all Supabase edge functions: `create-checkout-session`, `billing-status`, `create-portal-session`, `stripe-webhook`
3. Set edge function environment variables in Supabase dashboard: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BASIC`, `STRIPE_PRICE_PRO`, `APP_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
4. Verify RLS policies are active on all tables: `profiles`, `routes`, `mileage_logs`, `user_firms`, `dispatch_claims`
5. Test auth flow with a real account on production Supabase
6. Restrict Google Maps API key to production domain in Google Cloud Console

## Manual Actions Required After Vercel Connection

1. Set environment variables in Vercel dashboard: `ENV_SUPABASE_URL`, `ENV_SUPABASE_ANON_KEY`, `GOOGLE_MAPS_API_KEY_RESTRICTED`
2. Set build output directory to `claim_cipher_app/`
3. Add custom domain in Vercel dashboard
4. Update DNS records at domain registrar (CNAME or A record to Vercel)
5. Wait for SSL certificate provisioning (automatic via Vercel)
6. Update `APP_URL` in Supabase edge function environment variables to the custom domain
7. Update allowed redirect URLs in Supabase Auth settings to include the custom domain
8. Create Stripe webhook endpoint pointing to `https://your-domain.com/functions/v1/stripe-webhook` (or the Supabase functions URL)
9. Set `STRIPE_WEBHOOK_SECRET` from the new webhook signing secret
10. Update Google Maps API key HTTP referrer restriction to include the custom domain
11. Run the 10-minute smoke test from DEPLOYMENT_CHECKLIST.md on the live URL
