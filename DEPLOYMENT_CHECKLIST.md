# Deployment Checklist — Claim Cipher

Use this checklist before every production deployment.

---

## 1. Environment Variables & GitHub Secrets

All secrets must be set under **Settings → Secrets and variables → Actions** in the GitHub repo before deploying.

| Secret Name | Where to find it |
|---|---|
| `SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API → anon / public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API → service_role *(keep private)* |
| `GOOGLE_MAPS_API_KEY` | Google Cloud Console → APIs & Services → Credentials |
| `STRIPE_PRICE_BASIC` | Stripe Dashboard → Products → Basic plan → Price ID |
| `STRIPE_PRICE_PRO` | Stripe Dashboard → Products → Pro plan → Price ID |
| `APP_URL` | Your GitHub Pages URL, e.g. `https://yourusername.github.io/studio_cipher-1` |

> **Tip:** Verify secrets are set by navigating to the Actions tab and checking that the most recent workflow run can read them without errors.

---

## 2. Pre-deploy Checks

- [ ] All feature branches merged and reviewed
- [ ] `git status` is clean on `main`
- [ ] `.env` is **not** committed (check `.gitignore`)
- [ ] `claim_cipher_app/config/github-pages-env.js` has correct production values (no localhost references)
- [ ] Supabase RLS policies reviewed for any new tables or columns
- [ ] Stripe webhook endpoint is active and pointing to the correct URL
- [ ] Google Maps API key is restricted to the production domain

---

## 3. 10-Minute Smoke Test Sequence

Run through this sequence in order on the live deployment after every push.

### Marketing
- [ ] `https://<APP_URL>/marketing/index-v2.html` loads with no console errors
- [ ] "Start Running Volume →" CTA navigates to `/claim_cipher_app/login-cypher.html`
- [ ] Footer "Sign In" link navigates to `/claim_cipher_app/login-cypher.html`

### Login
- [ ] `/claim_cipher_app/login-cypher.html` loads correctly
- [ ] Sign in with a test account — redirects to Command Center

### Billing
- [ ] `/claim_cipher_app/billing-required.html` shows correct plan options
- [ ] Stripe checkout opens when clicking a plan (do **not** complete payment in smoke test unless using test mode)
- [ ] `/claim_cipher_app/billing-success.html` displays confirmation content

### Route Cipher
- [ ] `/claim_cipher_app/route-cypher.html` loads the Google Map
- [ ] Add 2–3 stops, run optimization — route displays correctly
- [ ] Copy output button copies to clipboard without errors

### Mileage Cipher
- [ ] `/claim_cipher_app/mileage-cypher.html` loads with correct dark-grid background (no metal texture)
- [ ] Nav bar visible and functional
- [ ] Select a firm, enter mileage — billing formula updates
- [ ] Round-trip toggle and auto-calculate toggle both respond to clicks
- [ ] Copy button copies calculation output

### Total Loss Studio
- [ ] `/claim_cipher_app/total-loss-studio.html` loads without errors
- [ ] Upload or enter a test VIN — calculation runs

### Logout
- [ ] Click Logout from any page — redirects to login without double-confirm dialog
- [ ] Attempting to navigate back to a protected page redirects to login

---

## 4. Rollback Steps

If a deployment causes a regression:

### Tag the last known-good commit
```bash
git tag v0.9.x <commit-sha>
git push origin v0.9.x
```

### Revert to that commit on main
```bash
git revert HEAD          # creates a revert commit (safe, non-destructive)
git push origin main
```

Or, if multiple commits need rolling back:
```bash
git revert <bad-commit-sha>..<HEAD>   # reverts a range
git push origin main
```

GitHub Pages redeploys automatically on push to `main`. Allow 1–2 minutes for the CDN to propagate.

---

## 5. Post-deploy

- [ ] Verify GitHub Pages deployment status in **Settings → Pages**
- [ ] Run smoke test sequence above on the live URL
- [ ] Tag the release: `git tag v1.x.x && git push origin v1.x.x`
- [ ] Update any relevant Supabase Edge Function environment variables if the `APP_URL` changed
