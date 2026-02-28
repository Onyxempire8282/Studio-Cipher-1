# Claim Cipher -- Product Overview

**Workflow infrastructure for independent auto damage appraisers.**

---

## Summary

Claim Cipher is a vertical SaaS platform built for independent auto damage appraisers -- operators running 5 to 15 inspections per day across multiple firms. The platform unifies routing, mileage billing, total loss documentation, and claim summary generation into a single workflow system.

The product is live, collecting revenue, and built by a solo founder operating as an independent appraiser with direct domain expertise.

**Live at [claimcipherhq.com](https://claimcipherhq.com)**

---

## Problem

Independent auto damage appraisers manage complex daily workflows using fragmented, disconnected tools:

- Route planning in Google Maps (no claim context)
- Mileage tracking in spreadsheets or consumer apps (no firm billing integration)
- Total loss documentation assembled manually from CCC estimates
- The same claim data retyped across multiple documents and portals

No existing product unifies these functions. The competitive set is entirely fragmented: generic route planners, consumer mileage apps, carrier-oriented estimate platforms, and manual spreadsheets. None were designed for independent operators running multi-firm volume.

---

## Solution

Claim Cipher integrates four core workflows into a single platform:

| Module | Function | Status |
|---|---|---|
| Route Cipher | Multi-stop route optimization with Maps handoff | Shipped |
| Mileage Cypher | Firm-specific mileage tracking and reimbursement | Shipped |
| Total Loss Studio | CCC estimate parsing and BCIF auto-generation | Shipped |
| Claim Summary | Structured claim documentation (DOCX export) | Shipped |
| Command Center | Operational dashboard | Shipped (expanding) |
| Dispatch System | Assignment intake and queue management | Planned |

Data entered once flows across modules. Routes generate mileage records. Estimates generate BCIFs and claim summaries. No copy-paste. No rekeying.

---

## Market

**Primary segment:** Independent auto damage appraisers (solo operators and small firms).

**Market characteristics:**
- Underserved by existing software vendors
- High daily transaction volume (5-15 inspections/day)
- Multi-firm relationships create operational complexity
- Strong willingness to pay for tools that save administrative time
- No dominant vertical SaaS player in this niche

**Expansion potential:**
- Small IA firms
- Desk adjusters
- Field inspection companies
- Specialty inspection operators

The platform is not positioned for carrier enterprise deployment.

---

## Business Model

**Current:** $39.99/month flat subscription. All modules included. No tiers, no free tier.

**Revenue mechanics:**
- Self-service signup with Stripe checkout
- Immediate access upon payment
- No manual onboarding or approval gates
- Subscription state enforced via webhook integration

**Near-term targets:**
- Early validation: 25+ active subscribers
- Sustainable benchmark: 100 subscribers
- Growth approach: controlled adoption within defined niche

**Expansion pricing:** The planned Dispatch module will introduce either tiered pricing or add-on pricing to reflect increased operational value.

**Long-term optionality:**
- Premium workflow tiers
- Licensing or white-label opportunities
- Potential acquisition optionality

---

## Technical Architecture

| Layer | Technology |
|---|---|
| Frontend | Vanilla JavaScript, modular pages |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password) |
| Payments | Stripe (hosted checkout, webhooks) |
| Routing | Google Maps API |
| Security | Row Level Security, user-scoped data |
| Hosting | Static hosting with SSL |

**Key architectural decisions:**
- No backend server -- client-driven with Supabase as full backend
- Document generation happens client-side (no server-side processing costs)
- RLS enforced on all business tables
- Stateless frontend -- scalable without application server overhead
- Vite build migration in progress for bundling and environment management

**Scalability posture:** Current architecture supports early-stage adoption (tens to hundreds of users). First bottlenecks at scale would be Google Maps API rate limits and Supabase concurrent query limits. Client-side performance is not a primary concern under normal usage.

---

## Roadmap

**Shipped:** Route optimization, mileage billing, CCC parsing, BCIF generation, claim summaries, auth, billing, command center, production deployment.

**In progress:** Build system migration (Vite), design system hardening, dashboard expansion, infrastructure tightening.

**Planned:** Dispatch system (assignment intake, queue management, photo handling), photo storage architecture, analytics expansion, environment separation.

**Long-term:** Full appraiser operating system (intake through archive), AI-assisted workflows, mobile companion, API layer, white-label deployment.

---

## Competitive Landscape

There are no direct competitors offering a unified independent appraiser workflow system combining routing, mileage billing, CCC-based BCIF automation, and structured claim documentation.

The competitive set is fragmented across:
- Generic route planners
- Consumer mileage tracking apps
- Carrier-oriented estimate platforms (Xactimate, CCC)
- Manual spreadsheets and email workflows

Claim Cipher's differentiation is integration. The moat is domain expertise applied to a workflow that no vendor has unified because no vendor operates in the field.

---

## Founder

Solo builder-operator with direct domain experience as an independent auto damage appraiser.

The platform was built while running real claim volume. Every feature exists because it was needed in the field first. The product reflects operational knowledge, not market research.

Domain knowledge over venture-backed scale.

---

## Contact

**Platform:** [claimcipherhq.com](https://claimcipherhq.com)
**Support:** support@claimcipherhq.com
