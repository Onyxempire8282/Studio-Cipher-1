# Pre-Launch Manual Checklist

Complete these IN ORDER before connecting Vercel.

---

## Phase 1 — Supabase Production Setup

- [ ] Set `SUPABASE_URL` to production project URL in GitHub Secrets
- [ ] Set `SUPABASE_ANON_KEY` (ENV_SUPABASE_ANON_KEY) in GitHub Secrets
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY` in Supabase edge function secrets
- [ ] Deploy all edge functions:
  - `supabase functions deploy create-checkout-session`
  - `supabase functions deploy billing-status`
  - `supabase functions deploy create-portal-session`
  - `supabase functions deploy stripe-webhook`
- [ ] Set edge function environment variables in Supabase Dashboard → Edge Functions → Secrets:
  - `STRIPE_SECRET_KEY` (live mode)
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PRICE_BASIC` (live price ID)
  - `STRIPE_PRICE_PRO` (live price ID)
  - `STRIPE_PRICE_PRO_SETUP` (if applicable)
  - `APP_URL` (your production URL)
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Verify RLS policies are active on all user tables:
  - `profiles` — user_id filter on SELECT, INSERT, UPDATE
  - `routes` — user_id filter on all operations
  - `mileage_logs` — user_id filter, INSERT only (immutable)
  - `user_firms` — user_id filter on all CRUD operations
  - `dispatch_claims` — user_id filter, pro-tier gated
  - `billing_events` — no client RLS (service role only)
- [ ] Test auth flow with a real account on production Supabase

---

## Phase 2 — Stripe Production Setup

- [ ] Switch from test mode to live mode in Stripe dashboard
- [ ] Set `STRIPE_SECRET_KEY` (live) in Supabase edge function secrets
- [ ] Create products and prices in Stripe:
  - Basic plan → copy price ID to `STRIPE_PRICE_BASIC`
  - Pro plan → copy price ID to `STRIPE_PRICE_PRO`
- [ ] Create webhook endpoint pointing to Supabase edge function URL:
  - URL: `https://<SUPABASE_PROJECT_REF>.supabase.co/functions/v1/stripe-webhook`
  - Events to listen for:
    - `checkout.session.completed`
    - `customer.subscription.created`
    - `customer.subscription.updated`
    - `customer.subscription.deleted`
    - `invoice.payment_succeeded`
    - `invoice.payment_failed`
- [ ] Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET` in Supabase edge function secrets
- [ ] Test a real checkout flow end to end (use a Stripe test card if still in test mode)

---

## Phase 3 — Google Maps Production Setup

- [ ] Restrict API key to production domain in Google Cloud Console:
  - Go to APIs & Services → Credentials → Edit key
  - Add HTTP referrer restriction: `https://your-domain.com/*`
- [ ] Update `GOOGLE_MAPS_API_KEY_RESTRICTED` in GitHub Secrets
- [ ] Enable required APIs: Maps JavaScript API, Directions API, Geocoding API, Places API
- [ ] Test Maps loading on deployed app

---

## Phase 4 — Vercel Connection

- [ ] Connect GitHub repo to Vercel
- [ ] Set all environment variables in Vercel dashboard:
  - `ENV_SUPABASE_URL`
  - `ENV_SUPABASE_ANON_KEY`
  - `GOOGLE_MAPS_API_KEY_RESTRICTED`
- [ ] Set build output directory to `claim_cipher_app/`
- [ ] Verify deployment preview works before going live

---

## Phase 5 — Domain Connection

- [ ] Add custom domain in Vercel dashboard
- [ ] Update DNS records at domain registrar
- [ ] Wait for SSL certificate provisioning
- [ ] Test full app on custom domain
- [ ] Update `APP_URL` in Supabase edge function environment variables to custom domain
- [ ] Update allowed redirect URLs in Supabase Auth settings:
  - `https://your-domain.com/**`
  - `https://your-domain.com/claim_cipher_app/command-center.html`
  - `https://your-domain.com/claim_cipher_app/login-cypher.html`

---

## Phase 6 — Post-Launch Verification (10-minute smoke test)

- [ ] Marketing page loads and CTA links to login
- [ ] Login with real credentials works
- [ ] New user signup works (check email confirmation)
- [ ] Billing guard redirects unpaid users to billing-required.html
- [ ] Stripe checkout completes and unlocks app access
- [ ] billing-success.html polls and redirects to command center
- [ ] Route cipher loads Google Map and optimizes a route
- [ ] Mileage cipher calculates, round trip toggle works, copy works
- [ ] My Routes shows saved routes, close/export functions work
- [ ] Total Loss Studio parses a CCC PDF and generates BCIF
- [ ] Logout clears session and redirects to login
- [ ] Navigating to a protected page while logged out redirects with session_expired message
