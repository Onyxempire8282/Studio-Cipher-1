# Claim Cipher

**Workflow infrastructure for independent auto damage appraisers.**

Routing, mileage billing, total loss documentation, and claim summaries -- one system built from real field volume.

**[claimcipherhq.com](https://claimcipherhq.com)**

---

## What It Does

| Module | Function |
|---|---|
| **Route Cipher** | Multi-stop route optimization with Google Maps handoff |
| **Mileage Cypher** | Firm-specific mileage tracking and reimbursement calculation |
| **Total Loss Studio** | CCC estimate parsing and BCIF auto-generation |
| **Claim Summary** | Structured claim documentation with DOCX export |
| **Command Center** | Operational dashboard and activity tracking |

---

## Stack

- Vanilla JavaScript (modular HTML pages)
- Supabase (PostgreSQL, Auth, Row Level Security)
- Stripe (subscription billing)
- Google Maps API (routing and distance)
- Custom CSS design system

No framework. No backend server. Client-driven with Supabase as the full backend.

---

## Local Development

```
git clone <repo-url>
cd studio_cipher-1
npx serve
```

Requires environment variables for Supabase, Stripe, and Google Maps API. See the full [README](README.md) for configuration details.

---

## Pricing

**$39.99/month** -- all modules included. No tiers, no gating.

---

## Status

- Core modules shipped and live
- Vite migration and infrastructure hardening in progress
- Dispatch system and photo storage architecture planned

See [Roadmap](README.md#roadmap) for details.

---

## Disclaimers

Claim Cipher does not provide legal, insurance, or financial advice. All outputs are provided as-is. Users are responsible for verifying documentation before submission. See [Terms of Service](https://claimcipherhq.com/terms) and [Privacy Policy](https://claimcipherhq.com/privacy).

---

Built by an independent appraiser running real inspection volume.

**[claimcipherhq.com](https://claimcipherhq.com)**
