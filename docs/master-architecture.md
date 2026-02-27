FenceOS Master Architecture
Version: 1.0  Status: Active  Owner: Founder
1. Product Mission
FenceOS exists to protect gross margin for fence contractors from estimate to completion.
FenceOS is NOT:
* A full construction ERP
* Accounting software
* A CRM replacement
* Scheduling marketplace software
* Marketing automation
FenceOS IS:
* Margin enforcement
* Execution discipline
* Cash flow acceleration
* Owner profit visibility
2. Core Product Philosophy
2.1 Complex Internals, Simple Output
Internally:
* Full SKU-driven material breakdown
* Waste factor application
* Labor cost calculation
* Margin calculation
* Snapshot enforcement
* Change order delta engine
Externally:
* Clean quote
* Simple contract
* Clear total
* Minimal friction
Customers never see internal cost structure or margin.
2.2 Opinionated Over Configurable
FenceOS enforces:
* Margin guard before quote
* Snapshot pricing at quote
* Immutable contract after signature
* Margin recalculation on change orders
* Deposit capture before scheduling
FenceOS does not allow margin-undermining workflows.
2.3 Mobile-First Field Discipline
Foreman workflows must:
* Work on phone in sunlight
* Require minimal typing
* Use large tap targets
* Enforce material verification
* Enforce checklist completion before job completion
3. Technical Stack (Locked)
Frontend:
* Next.js (App Router)
* TypeScript
* Tailwind CSS
* Mobile-first responsive design
Backend:
* Supabase (Postgres + Auth + RLS + Storage)
Hosting:
* Vercel (frontend)
* Supabase Cloud (backend)
Payments:
* Stripe (Checkout + Webhooks)
No alternate stacks without formal redesign decision.
4. Revenue Lifecycle
State machine:
draft  → quoted  → accepted  → deposit_paid  → converted  → active  → complete
Rules:
* Each state progression is immutable.
* No backward transitions allowed.
* All transitions validated server-side.
5. System Modules
5.1 Estimate Engine (Margin Core)
Purpose:  Prevent unprofitable quotes.
Principles:
* Deterministic SKU calculations
* Waste factor applied
* Labor formula enforced
* Snapshot pricing at quote
* Margin guard threshold
* Gross margin preview before send
Customer-facing output:
* Linear footage
* Gate lines
* Clean total
* No cost breakdown
* No margin display
5.2 Legal Snapshot System
On status = quoted:
* Snapshot legal terms
* Snapshot payment terms
* Store version
* Generate accept_token
On status = accepted:
* Capture signature
* Capture IP address
* Capture timestamp
* Generate SHA256 contract hash
* Lock estimate immutably
PDF always renders snapshot fields.
5.3 Stripe Deposit System
On acceptance:
* Create Stripe Checkout session
* Deposit = configurable (default 50%)
* Store PaymentIntent ID
* Confirm payment via webhook only
* Update status → deposit_paid
Client redirect is not trusted.
5.4 Job Conversion System
On convert:
* Create immutable job record
* Copy estimate line items
* Copy totals
* Lock estimate permanently
Estimates are pricing entities.  Jobs are operational entities.
5.5 Foreman Execution Layer
* Material verification required before start
* Checklist must be completed before job completion
* Photo uploads tied to job
* Status transitions controlled server-side
5.6 Change Order Engine
* Snapshot pricing at change order
* Calculate margin delta
* Compare to original margin
* Require owner approval if below threshold
* Update job totals immutably
All changes logged.
5.7 Owner Margin Dashboard
Must display:
* Total quoted revenue
* Total accepted revenue
* Active job revenue
* Estimated vs actual margin
* Margin erosion %
* Change order impact
* Jobs below target margin
No vanity charts.
6. Data Integrity Rules
1. No recalculation after signature.
2. Legal terms never re-rendered live after quote.
3. Accepted contracts cannot be edited.
4. Double conversion to job is blocked.
5. All financial transitions server-validated.
6. Payment confirmation via Stripe webhook only.
7. All org data protected by RLS.
7. Multi-Tenant Model
Every table includes:
* org_id
RLS enforcement:
Owner:
* Full org access
Sales:
* Access to created/assigned estimates
* Limited job visibility
Foreman:
* Assigned jobs only
* No financial margin visibility
Crew:
* Read-only checklist access
Frontend role checks are insufficient.  RLS is authoritative.
8. White-Label System
Each org controls:
* Logo
* Primary color
* Accent color
* Footer note
* Legal terms
All PDFs and emails render using org branding.
FenceOS branding remains minimal.
9. Pricing Strategy Alignment
FenceOS pricing tiers:
Core:
* Margin guard
Pro:
* Execution control + change order engine
Elite:
* Owner profit intelligence
Revenue model aligns with profit impact.
10. Feature Creep Guardrail
Before building any feature:
Ask:
1. Does this protect margin?
2. Does this enforce discipline?
3. Does this accelerate cash flow?
4. Does this improve owner visibility?
If not, it does not get built.
11. Long-Term Vision
FenceOS becomes:
Estimate Discipline  → Legal Integrity  → Cash Flow Enforcement  → Field Accountability  → Margin Intelligence
FenceOS is profit infrastructure for fence contractors.
END OF DOCUMENT
