# Claim Cipher -- Technical Partner Reference

**Confidential -- for authorized collaborators only.**

---

## Overview

Claim Cipher is a vertical SaaS workflow system for independent auto damage appraisers. It combines routing, mileage billing, total loss document automation, and claim summary generation into a single platform.

This document provides the technical and operational context needed for development collaboration, integration work, or infrastructure partnership.

**Production URL:** [claimcipherhq.com](https://claimcipherhq.com)

---

## System Architecture

### Stack

| Component | Technology | Notes |
|---|---|---|
| Frontend | Vanilla JS, modular HTML pages | Vite migration in progress |
| CSS | Hand-written, custom design system | v2 industrial amber theme |
| Database | Supabase (PostgreSQL) | RLS on all tables |
| Auth | Supabase Auth | Email/password |
| Payments | Stripe | Hosted checkout, webhook sync |
| Routing | Google Maps API | Distance Matrix + Maps JS |
| Hosting | Static hosting | SSL via provider |
| Documents | Client-side generation | PDF and DOCX output |

### Data Flow

```
User Input
    |
    v
Client Application (Vanilla JS)
    |
    +---> Supabase (auth, data persistence, subscription state)
    +---> Google Maps API (routing, distance calculations)
    +---> Stripe (billing, subscription management)
    +---> Client-side generators (BCIF PDF, claim summary DOCX)
    |
    v
User Downloads / Stored Records
```

There is no middleware layer. All client-to-database communication uses the Supabase JS client directly. Selective logic may move to Supabase Edge Functions as complexity increases (Dispatch, automation).

### Database Schema

| Table | Scope | Relationships |
|---|---|---|
| `users` | Auth-managed | -- |
| `subscriptions` | Stripe-synced | `user_id` |
| `firms` | User-linked | `user_id` |
| `routes` | User-linked | `user_id` |
| `mileage_logs` | Per-claim entries | `user_id`, `firm_id` |
| `claim_records` | Optional structured saves | `user_id` |
| `activity_log` | Usage tracking | `user_id` |

Row Level Security is enforced on all business tables. Every query is scoped to the authenticated user.

No automated migration files are currently bundled. Schema must be manually replicated for independent instances.

### Security Model

- Supabase anon keys used client-side (intended usage pattern)
- Google Maps API key domain-restricted
- No service-role keys exposed in frontend
- RLS policies restrict all tables to authenticated user
- Single-role access model (authenticated subscriber)
- Subscription state enforced via Stripe webhook sync

---

## Module Reference

### Route Cipher

**Purpose:** Multi-stop route optimization for field inspection days.

**Input:** Manual address entry, saved home base location.
**Output:** Optimized stop sequence, distance/time calculations, Maps navigation handoff.
**Data:** Routes saved to Supabase (user-scoped). Temporary calculations in-memory. UI caching in LocalStorage.
**Dependencies:** Google Maps API (Distance Matrix, Maps JavaScript).

### Mileage Cypher

**Purpose:** Firm-specific mileage tracking and reimbursement calculation.

**Input:** Route-derived mileage, manual entry, firm selection, round-trip toggle.
**Output:** Per-claim mileage log, reimbursement calculation, CSV export.
**Data:** Mileage logs and firm rates in Supabase (user-scoped).
**Dependencies:** Google Maps API, Supabase.

### Total Loss Studio

**Purpose:** Rule-based CCC estimate parsing and BCIF auto-generation.

**Input:** CCC estimate PDF (consistent structured format required).
**Output:** Auto-filled BCIF form, checkbox population, downloadable PDF.
**Parsing:** Deterministic field extraction -- claim number, VIN, year, make, model, mileage, customer name, vehicle type, engine type. Keyword-based checkbox matching for vehicle options.
**Data:** Parsing occurs in-session. Documents downloaded by user. Optional structured data saved to Supabase.
**Dependencies:** Client-side PDF parsing, document generation engine.

**Important:** This is rule-based parsing, not AI-driven. Outputs are deterministic given consistent input format.

### Claim Summary Generator

**Purpose:** Structured claim documentation combining parsed data with user narrative.

**Input:** Parsed CCC data, user-entered damage narrative, loss classification.
**Output:** Structured claim summary, DOCX download.
**Data:** Generated on demand, not stored unless user saves structured data.
**Dependencies:** Shared parsing engine with Total Loss Studio.

### Command Center

**Purpose:** Operational dashboard.

**Current:** Activity logs, file counts, route history.
**Planned:** Revenue per firm, weekly/monthly volume, mileage totals, operational metrics.

---

## Development Setup

### Prerequisites

- Git
- Modern browser (Chrome recommended)
- Local HTTP server (`npx serve` or `python -m http.server`)
- No build step required (pre-Vite)

### Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous API key |
| `GOOGLE_MAPS_API_KEY` | Yes | Routing and distance (Distance Matrix + Maps JS enabled) |
| `STRIPE_PUBLISHABLE_KEY` | Yes | Billing (test mode for development) |

Keys are referenced in script configuration files. Structured `.env` support planned with Vite migration.

### Stripe Webhook

- Test-mode account required
- Local webhook testing: `stripe listen` CLI or ngrok tunnel
- Webhook must update subscription status in Supabase
- Without webhook sync, subscription gating will not function

### Common Issues

- RLS blocks queries if policies are misconfigured
- Google Maps requires both Distance Matrix and Maps JavaScript APIs enabled
- Script load order dependencies across modular JS files
- Must use HTTP server, not `file://` protocol

---

## Roadmap (Development Priority)

### Active Work

- Vite build system migration (bundling, env vars, production builds)
- CSS consolidation (v2 design system hardening)
- Command Center dashboard expansion
- Script modularization
- RLS policy tightening

### Next Phase

- **Dispatch System:** Assignment intake, queue management, status tracking (assigned / inspected / uploaded / paid), photo handling, email ingestion
- **Photo Storage:** Claim-linked storage architecture, bucket design, cost modeling
- **Analytics:** Revenue per firm, volume metrics, mileage aggregation
- **Environment Separation:** Dev / staging / prod split, migration files, schema exports

### Future Direction

- Full appraiser operating system (intake through archive)
- AI-assisted workflows (estimate drafting, damage description, photo classification)
- Mobile companion
- API layer for external integrations
- White-label deployment capability

---

## Business Context

| Item | Detail |
|---|---|
| Pricing | $39.99/month, flat rate, all modules |
| Target market | Independent auto damage appraisers |
| Current scale | Early-stage adoption |
| Revenue model | Standalone subscription |
| Expansion | Dispatch add-on, potential tiered pricing |
| Competitors | None unified; fragmented across generic tools |

---

## Contact

**Platform:** [claimcipherhq.com](https://claimcipherhq.com)
**Support:** support@claimcipherhq.com

---

*This document is confidential and intended for authorized development and business partners only.*
