# FenceEstimatePro — Battle Plan 2026

**The ambition:** Make FenceEstimatePro the operating system every fence contractor in North America uses to run their business — from the first customer photo to the final paid invoice.

**The timeframe:** 12 months to category leadership.  
**The team:** One founder. AI leverage. No investors. No permission needed.  
**Date:** April 19, 2026  
**Status:** Live document. Update weekly.

---

## 1. The Strategic Thesis

The fence contractor software market is fragmented into three buckets, and **no one has unified them at quality**:

| Bucket | Players | Gap |
|--------|---------|-----|
| Demo/visualization | RealityFence, FenceVisualizer | Nothing flows forward |
| Estimating | Visual Fence Pro, Dirtface | Old-school UI, no AR, weak sales experience |
| Business management | Fence Cloud, TRUE, mySalesman | No AR, clunky estimating, outdated |

FenceEstimatePro's opportunity: **be the only platform that covers the contractor's entire workflow from customer inquiry to paid job — with AI and AR baked in from day one.** Not "we do AR too." Not "we also have scheduling." One coherent product where every piece flows from the last.

The unfair advantage of a solo founder with Claude in 2026: **AI-native features that would take a 10-person startup six months to build, one person can ship in a week.** This is the moment to press that advantage before AI-native competitors emerge.

**The positioning statement:**

> **FenceEstimatePro is the operating system for fence companies. From first photo to final payment, it runs the business.**

Not a tool. Not a feature set. An operating system.

---

## 2. The Product Vision (12 Months Out)

By April 2027, a fence contractor's day runs on FenceEstimatePro:

**Morning (office):**
- Homeowner texts a photo of their yard to a number the contractor owns
- AI automatically generates an estimate with AR preview link
- Contractor reviews, taps "Send" — proposal lands in homeowner's text in under 60 seconds
- Dashboard shows: 4 leads today, 2 estimates closed yesterday, crew 1 is 30 minutes out from job site, $4,200 in deposits cleared overnight

**Sales call (on site):**
- Contractor opens the AR view, customer sees the fence on their property
- Customer taps between wood privacy / vinyl / aluminum, sees price update live
- Customer signs on the phone, pays deposit via Apple Pay
- Job auto-schedules into the crew calendar, material order placed with supplier, crew notified

**Afternoon (crews):**
- Foreman opens the job on their phone: customer info, materials list, AR photo of the planned fence, GPS directions
- Foreman snaps before/after photos, marks progress, homeowner gets real-time update with photos
- Job completes, final invoice auto-sends, homeowner reviews on Google, contractor gets paid

**Evening (office):**
- Dashboard shows the day's margin, which crews are ahead, which estimates are stalling
- AI assistant surfaces: "3 quotes older than 7 days — suggested follow-ups drafted"
- Contractor approves, emails send, tomorrow is set up

**Every piece of this is technically possible with today's stack (Next.js, Supabase, Stripe, Claude API, model-viewer). The question is execution sequence.**

---

## 3. The Revenue Strategy

### 3.1 Current baseline (to change fast)

| Metric | Today | Gap |
|--------|-------|-----|
| Pricing | $49/month single tier | Dramatically underpriced |
| Revenue streams | SaaS subscription only | Should have 4+ |
| Positioning | "Fence estimating software" | Should be "contractor OS" |

### 3.2 New pricing tiers (launch in Week 8)

**Free — "Starter"**
- 1 estimate per month
- Watermarked PDF
- No AR, no custom branding
- **Purpose:** Lead magnet. Contractors try the AI photo → estimate, get hooked, upgrade.

**$99/month — "Pro"**
- Unlimited estimates
- AR-to-Estimate
- Custom branding on proposals
- Deposit collection (Stripe)
- Single user
- **Target:** Solo contractors, 1–5 jobs/week

**$299/month — "Business"**
- Everything in Pro
- Up to 5 team members (sales, crews, office)
- AI photo estimator (unlimited)
- AI chat widget on quotes
- Crew mobile app
- Supplier price sync
- Advanced reporting + margin analytics
- **Target:** Established companies, 10–30 jobs/month

**$799/month — "Enterprise"**
- Everything in Business
- Unlimited users
- Multi-location
- API access
- White-label option
- Dedicated onboarding
- **Target:** Multi-crew operations, 50+ jobs/month

### 3.3 Revenue streams beyond SaaS

Stack these on top of subscription — each one is a % take of transactions already flowing through the platform:

| Stream | Mechanism | Target take | Timing |
|--------|-----------|-------------|--------|
| **Payment processing** | 2.9% + $0.30 base + **0.5% FenceEstimatePro margin** on every deposit/invoice | 0.5% of processed volume | Phase 2 |
| **Financing marketplace** | Partner with fence-specific financing lender, earn 1–3% referral on approved loans | 2% of financed volume | Phase 3 |
| **Materials procurement** | Contractor orders materials through platform from approved suppliers, 2–5% rebate from supplier | 3% of materials volume | Phase 3 |
| **Lead generation** | Homeowners visiting public AR demo become qualified leads, sold to contractors $50–150/lead | $75 avg per lead | Phase 3 |
| **Premium AR models** | Custom 3D model of contractor's actual products (for a $500 setup fee + $49/month) | One-time + recurring | Phase 3 |

**Math that matters:** A contractor at $299/month doing $40K/month in deposits = $299 SaaS + $200 payment take + $800 materials rebate = **$1,299/month per Business customer when all streams are live.** That's ~4× the headline SaaS number.

### 3.4 The "get to $1M ARR" math

Target end of Year 1 (April 2027):
- 300 Pro ($99) = $29,700/mo
- 150 Business ($299) = $44,850/mo
- 10 Enterprise ($799) = $7,990/mo
- Ancillary revenue (payments, materials): ~$10,000/mo
- **Total MRR: ~$92,540**
- **ARR: ~$1.1M**

460 paying customers. Entirely achievable with the right product and sequence.

---

## 4. The 12-Month Roadmap — Three Phases

### PHASE 1: FOUNDATION (Weeks 1–8, ending June 14, 2026)

**Theme:** Ship the features that make FenceEstimatePro undeniably better than any single competitor, and raise pricing.

#### Sprint 1 (Weeks 1–2): AR-to-Estimate Core
- Ship AR Quote feature on quote portal (wood privacy 6ft only)
- Ship `ARModelViewer` React wrapper + model-viewer integration
- Ship 3 database migrations for AR tables
- Ship AR session telemetry
- **Success metric:** 5 real customers test AR on actual quotes

#### Sprint 2 (Weeks 3–4): AI Photo Estimator (The Category Killer)
This is the feature that changes the game.

**What it does:** Contractor (or homeowner) uploads a photo of a yard or property line → Claude API identifies the fence run, estimates linear feet, counts gates and corners, suggests fence type → generates a full estimate in under 30 seconds.

**Why it wins:** No competitor has this. Visual Fence Pro, Fence Cloud, RealityFence — none of them use vision AI. It collapses a 20-minute site visit into a 30-second photo upload.

**Technical approach:**
- Claude API with vision (Sonnet 4.6)
- Custom system prompt trained on fence estimating logic
- Structured JSON output → feeds existing estimate engine
- Confidence scoring — low confidence triggers "please review" flag

**Shipping:**
- Week 3: Prototype with 20 sample yard photos, measure accuracy
- Week 4: Production integration, feature-flag rollout to existing customers

#### Sprint 3 (Weeks 5–6): Homeowner Experience Revolution
Currently, the quote portal is minimal. Make it the best quote experience in the industry.

**Ship:**
- Interactive 3D preview on every quote (non-AR, works on desktop)
- Material swap (customer can toggle wood / vinyl / aluminum and see price update live)
- Height swap (4ft / 6ft / 8ft)
- Embedded AI chat (answers "why is this priced this way?", "can you do it in 3 weeks?", "do I need a permit?")
- One-tap Apple Pay / Google Pay deposit
- SMS confirmation flow (no email friction)

**Why it matters:** Most fence quotes are static PDFs. Making the quote an experience turns the homeowner from passive reader to active buyer. Close rates should measurably improve.

#### Sprint 4 (Weeks 7–8): Pricing Restructure + Marketing Launch
- Migrate existing customers to new pricing (grandfather current at old rate for 6 months, then convert)
- Launch new pricing publicly with landing page refresh
- Launch "AR Quote" marketing campaign (landing page, demo video, YouTube, LinkedIn)
- Submit to Product Hunt
- Open public beta waitlist for "AI Photo Estimator"

**Phase 1 success metrics:**
- 50 Business tier customers ($14,950 MRR from this tier alone)
- AR Quote feature used on 30% of quotes
- AI Photo Estimator beta waitlist: 500 contractors
- One mid-tier industry press mention (Fence Industry Magazine, Fencepost, etc.)

---

### PHASE 2: DOMINATION (Weeks 9–20, ending September 6, 2026)

**Theme:** Build the features that make it impossible to leave the platform — and launch the revenue stacks.

#### Sprint 5 (Weeks 9–10): Crew Mobile App
Progressive web app (no app store friction) for foremen and crews:
- Today's jobs with GPS directions
- Materials checklist with photo verification
- Before/after photo upload
- Clock in / clock out
- Real-time job status to office dashboard
- Customer gets SMS with crew photos as job progresses

**Why it matters:** Competitors either ignore crews (RealityFence) or have clunky foreman UIs (Fence Cloud). A great crew app creates platform lock-in — the office can't switch because the crews are productive on it.

#### Sprint 6 (Weeks 11–12): Embedded Payments + Financing
- Launch FenceEstimatePro Payments (Stripe Connect under the hood, branded experience)
- Add 0.5% platform margin on top of Stripe fees — disclosed, competitive
- Launch "Finance this fence" button on every quote over $3,000
- Partner with a fence-specific lender (Wisetack, GreenSky, Sunlight — pick one)
- Contractor gets paid instantly from financing, homeowner pays monthly

**Revenue impact:** With even 20% of quotes financed, this adds $3,000–8,000 MRR within 90 days of launch at Phase 1 customer volumes.

#### Sprint 7 (Weeks 13–14): Expand AR Catalog + Advanced AR
- Add 6 more fence type models (vinyl privacy, chain-link 4ft, aluminum picket, split-rail 2 and 3 rail, wrought iron)
- Gate models (walk 3ft/4ft, drive single/double)
- Multi-panel placement (Phase 2 AR — step-by-step "place one, walk, place another")
- AR screenshot auto-attaches to proposal PDF
- Contractor can record a short AR walkthrough video to send with quote

#### Sprint 8 (Weeks 15–16): The Contractor Dashboard That Addicts
Build the dashboard contractors check every morning. This is how you get retention.

**Features:**
- Revenue today / this week / this month with MoM comparison
- Close rate by estimator, by fence type, by price band
- Pipeline velocity (days from estimate sent to accepted, to paid)
- Margin by job type with target vs actual
- "Alerts" feed — stalled quotes, jobs running over budget, customers needing follow-up
- AI-drafted follow-up emails for stalled quotes (one-click send)

**Why it matters:** This becomes the contractor's business intelligence. Switching costs increase dramatically once they rely on the dashboard to run their company.

#### Sprint 9 (Weeks 17–18): Ecosystem Integrations
- QuickBooks sync (one-way initially: FenceEstimatePro → QuickBooks)
- Google Calendar / iCal sync for jobs
- Zapier integration (50+ automations)
- Twilio-owned business phone number per contractor (homeowner text number from Section 2)

#### Sprint 10 (Weeks 19–20): Growth Engine Launch
- Referral program (contractor earns 1 month free per referred sign-up)
- Public AR demo on homepage — anyone can try it on their own phone, becomes a lead
- "AR-to-Estimate" link every contractor can post on social media
- SEO content engine (25 articles shipped this sprint — "How to estimate a wood privacy fence," "Fence contractor pricing guide," etc.)
- YouTube channel launch (weekly Feature Friday + customer story videos)

**Phase 2 success metrics:**
- 200 total paying customers
- MRR: $40,000+
- AI Photo Estimator GA with 30% adoption in Business tier
- Financing volume: $100K+/month processed
- Waiting list: 1,000+

---

### PHASE 3: MOAT BUILDING (Weeks 21–52, ending April 2027)

**Theme:** Build the things competitors cannot copy in a year.

#### Network Effects Data Layer (Weeks 21–26)
Every estimate in the system is data. When you have 500 contractors, you have market intelligence no one else has.

- **FenceEstimatePro Benchmarks:** Anonymous, aggregated close rates, pricing, margin by zip code. Contractors see how they compare to peers in their market. This is addictive.
- **Material Price Intelligence:** When 500 contractors are syncing supplier prices, you know the real market price for 2×4×8 pressure-treated pine in any region. Surface this as a feature.
- **Seasonality forecasts:** "Based on 2,000 similar contractors, expect a 40% drop in quotes in November. Here are 3 recommended actions."

#### The Marketplace (Weeks 27–32)
Materials procurement with supplier integration:
- Contractor orders materials through FenceEstimatePro
- Platform routes to the best-priced supplier in the region
- Automatic delivery scheduling tied to job start date
- 2–5% rebate from suppliers built into the platform

**Revenue impact:** A contractor doing $40K/month in materials = $1,200–2,000/month to FenceEstimatePro per customer. With 200 customers using it, that's $240K–400K/month in marketplace revenue alone.

#### The Homeowner Product (Weeks 33–40)
Expand from contractor tool to two-sided platform:
- Homeowners land on FenceEstimatePro directly (SEO for "how much does a fence cost")
- AI generates rough estimate from their photo
- Platform routes qualified homeowner to local contractors (lead gen, $75–150/lead)
- Homeowner portal for tracking their project
- Reviews and ratings of contractors — the Carfax-for-fences play

**This is the network effect flywheel:**
1. More contractors → more AR demos → more homeowner traffic
2. More homeowner traffic → more leads for contractors → more contractors want to join
3. More contractor data → better benchmarks → better product → more retention

#### Enterprise Expansion (Weeks 41–52)
- Multi-location for fence franchises (AC Fencing, Long Fence, etc.)
- API and webhook platform for integrations
- White-label deployment for regional players
- Dedicated customer success manager (first operational hire, funded by revenue)
- Partner program for fence industry consultants

**Phase 3 success metrics (by April 2027):**
- 460+ paying customers
- $1.1M ARR
- $3M+ processed through platform/month
- Public beta of homeowner product
- Ready for Series A or continued bootstrap to $5M ARR

---

## 5. Marketing & Distribution

You are solo. Marketing runs on two things: **content velocity** and **product-led virality.**

### 5.1 Content Engine (Start this week)

**SEO Strategy — "How much does X cost?"**
Fence contractor search volume is enormous and commercially underserved. Target:
- "How much does a wood privacy fence cost"
- "How much does chain link fence cost per foot"
- "Do I need a permit for a fence"
- "Best fence for dogs"
- "How long does a fence last"

Each article ships with:
- Interactive fence calculator (lead capture)
- AR demo link (viral potential)
- "Find a local fence contractor" CTA (lead gen)

**Target: 2 articles/week, 100 by end of year.** With AI, a solo founder can realistically produce this volume with editorial oversight.

**YouTube — "Fence Contractor University"**
- Weekly "Feature Friday" (5 min demo of a new FenceEstimatePro feature)
- Bi-weekly customer story (contractor talks about their business)
- Monthly "Industry Report" (benchmarks, trends, AI adoption)

Start with crappy videos shot on a phone. Iterate to quality. Consistency beats perfection.

**LinkedIn Thought Leadership**
- Daily post from founder account
- Weekly long-form article
- Topics: running a fence business, AI in construction, contractor profitability, AR demos

**Reddit / Forum Engagement**
- r/fencing, r/Contractor, Fence Industry Network forums
- Rule: always add value, never pitch directly. Pitch happens in the profile/bio.

### 5.2 Product-Led Growth

Every product feature has a viral hook built in:

| Feature | Viral hook |
|---------|-----------|
| AR Quote | "See your fence in AR" — shareable link |
| AI Photo Estimator | Free tier — anyone can upload a photo, get estimate |
| Quote portal | Homeowner sees "Powered by FenceEstimatePro" |
| Crew mobile app | Customers get SMS with "Crew check-in via FenceEstimatePro" |
| Reviews | Homeowner reviews contractor on FenceEstimatePro, SEO boost |

Every quote sent, every AR session viewed, every job completed — branded. Thousands of homeowners per month see the brand at their highest-intent moment.

### 5.3 Outbound Sales

Until content compounds (6+ months), direct outbound is the fastest path:
- **Target list:** Fence contractors in top 100 US metros, 1–20 employees
- **Source:** Google Maps + ZoomInfo (or equivalent) + fence industry association directories
- **Cadence:** 50 cold emails/day, personalized with AI ("I noticed you do wood privacy in [city], our AR quote feature is built exactly for contractors doing that style...")
- **Goal:** 15-minute demo call, 20% show-up rate, 30% close rate → 3 new customers/week from outbound

### 5.4 Industry Presence

- **FenceTech 2027 (February 2027):** Booth presence, demo AR live, capture emails
- **Regional trade shows** (state fence associations): Speak on panels about AI/AR
- **Industry publications:** Pitch op-eds and case studies to Fence Industry Magazine, Fencepost, Contractors Home Delivered

---

## 6. The Moat — Why Competitors Can't Catch Up

By end of Year 1, FenceEstimatePro has:

1. **AI features that required Claude API to build** — RealityFence doesn't have this, Fence Cloud can't build it without an AI team
2. **Two-sided marketplace data** — hundreds of contractors' pricing, close rates, margins — unreplicable without customers
3. **Deep payments integration** — switching cost is zero for a tool, non-zero for a payments platform
4. **Mobile crew workflows** — foreman muscle memory is the hardest to dislodge
5. **Homeowner brand** — when homeowners know FenceEstimatePro, new contractors need to be on the platform to appear in searches
6. **SEO authority** — 100+ articles by EOY, authoritative on "fence cost" keywords
7. **The AI Photo Estimator specifically** — the unique feature that no competitor has announced and that every contractor will want

Even if Catalyst launches a great AR tool in Spring 2026, they won't have any of the above. They'll have AR tied to their product catalog. FenceEstimatePro runs the contractor's entire business.

---

## 7. What to Do TODAY (April 19, 2026)

Before you close the laptop tonight:

### Today (Sunday) — 2 hours
- [ ] Read this document fully
- [ ] Sign up for Claude API if not already (you'll need the key for Sprint 2)
- [ ] Download the [CC0 Wooden Fence model](https://sketchfab.com/3d-models/cc0-woode-fence-39c5f9ac62a64259aa3478040339fa2a) — the GLB + USDZ, save to local `/ar-assets/raw/`
- [ ] Create a customer call list: pull 10 existing customers you can call this week
- [ ] Pick **3 customers** you'll call Monday to validate the "AR-to-Estimate" framing

### Monday (April 20) — Day 1 of Sprint 1
- [ ] Call 3 customers (15 min each): "If customers could see the fence in AR from your estimate, and the AR photo auto-attached to the proposal, would that help you close?"
- [ ] Record answers. If 2/3 are enthusiastic → greenlight Sprint 1 full send
- [ ] Create Phase 1 migration file: `supabase/migrations/[timestamp]_ar_foundation.sql` with the 3 tables from the research doc
- [ ] Create the two new storage buckets (`ar-assets` public, `ar-screenshots` RLS)
- [ ] Upload the CC0 wooden fence GLB + USDZ to `ar-assets` bucket

### Tuesday (April 21)
- [ ] Install `@google/model-viewer` in package.json
- [ ] Create `src/types/model-viewer.d.ts` with the JSX type declaration
- [ ] Create `src/components/ar/ARModelViewer.tsx` (~30 lines, `'use client'` wrapper)
- [ ] Create `src/components/ar/ARViewerButton.tsx` (device detection + launch)

### Wednesday–Friday (April 22–24)
- [ ] Wire `ARViewerButton` into `/quote/[token]/page.tsx`
- [ ] Build `GET /api/ar/assets` and `POST /api/ar/sessions` endpoints
- [ ] Test on physical iPhone (Quick Look) and physical Android (Scene Viewer)
- [ ] Fix issues

### Saturday–Sunday (April 25–26)
- [ ] Deploy AR Quote to production (feature-flagged to 3 pilot customers)
- [ ] Send the week's launch email: "3 customers are about to get the first AR Quote in the fence industry"
- [ ] Record the first 90-second demo video for YouTube/LinkedIn
- [ ] Write the FenceEstimatePro AR launch landing page draft (don't publish yet)

**Week 1 deliverable:** AR Quote live for 3 pilot customers. Video recorded. Landing page drafted. Sprint 2 (AI Photo Estimator) ready to start Monday.

---

## 8. Metrics Dashboard (Build This Week 2)

Track these weekly. Print them. Check every Monday morning.

**Product metrics:**
- Quotes sent (baseline + AR-enabled)
- AR sessions initiated / completed / screenshots taken
- Quote → acceptance rate (with AR vs without)
- Time from quote sent to accepted

**Business metrics:**
- MRR
- New signups / churn / net new
- Cash in bank
- Cost per customer acquired
- Revenue per customer (SaaS + ancillary streams)

**Leading indicators:**
- Cold email reply rate
- Demo booked rate
- Demo → customer conversion rate
- Referral signups
- YouTube channel subs (when launched)
- Organic search traffic (when content launches)

### Kill criteria

Every major initiative needs a kill date.

- **AR Quote:** If < 15% of quotes use AR by end of Sprint 2, reduce to maintenance mode
- **AI Photo Estimator:** If accuracy < 70% on test set by end of Sprint 2, pivot approach
- **Crew mobile app:** If < 20% of Business tier customers activate by end of Sprint 6, deprioritize
- **Financing:** If < 10% of eligible quotes use financing by Week 16, drop partner, consider alternatives

You don't have investors, so you don't have runway pressure — but you do have time pressure. Every week spent on a dead feature is a week not building the winner.

---

## 9. Operational Reality for a Solo Founder

Honest operational guidance:

**Use AI aggressively:**
- Claude writes code (you review + guide)
- Claude writes marketing copy (you edit)
- Claude drafts follow-up emails, sales scripts, blog posts
- Claude does first-pass customer support
- Claude analyzes customer feedback and surfaces patterns

**Use services, not custom builds:**
- Resend for email, not custom SMTP
- Stripe Connect for payments, not PCI compliance
- Supabase for database, not self-hosted Postgres
- Vercel for hosting, not custom infrastructure
- Crisp or Intercom for chat, not custom

**Don't hire until you have $500K ARR minimum.** Every dollar not spent on salary is a dollar you keep. The first hire should be Customer Success / Support (frees you to build and sell). Expect to spend 12–18 months solo.

**Commit to a weekly rhythm:**
- **Monday:** Review metrics, customer calls, plan week
- **Tuesday–Thursday:** Build (4–6 hours deep work daily)
- **Friday:** Marketing (video, blog, LinkedIn, outreach)
- **Saturday:** Catch up, ship, learn
- **Sunday:** Rest or strategic thinking, not tactical

**Avoid these traps:**
- Perfecting features before customers see them
- Adding features before a customer asked
- Building for contractors you haven't talked to
- Competing on features RealityFence/Catalyst define
- Waiting for the "perfect" launch

Launch ugly. Iterate public. Let customers drive priorities.

---

## 10. The North Star

Every Monday morning, ask: **"Did we move closer to making FenceEstimatePro the software every fence contractor in North America uses to run their business?"**

If yes → this week's work was good. If no → change course this week.

The answer in Year 1 should be yes ~40 weeks out of 52. Not every week. Some weeks are maintenance, recovery, or experimentation. But the trajectory is what matters.

---

## Appendix A: Why This Plan Wins

**Against RealityFence:** They sell a demo. You sell a business operating system. When Catalyst or someone else builds a better AR demo, RealityFence dies. You survive because you own the workflow.

**Against Fence Cloud / TRUE:** They built for 2015. You're building for 2026. AI-native, AR-native, mobile-first. They can't retrofit these without a ground-up rebuild — which is a 2-year project even with a full team.

**Against Catalyst/Oldcastle:** They're tied to Oldcastle's product catalog. You're supplier-agnostic. When a contractor has Home Depot, Lowe's, and a local supplier they use, Catalyst fails. You work with all of them.

**Against future AI-native competitors:** You get there first. By the time they launch, you have network data, brand authority, SEO, customer lock-in, and a marketplace. They compete with your past self. They lose.

---

## Appendix B: Emergency Procedures

**If a competitor announces something big:**
- Ship your counter-feature within 2 weeks
- Don't panic-build — respond strategically
- Use their launch as a marketing moment ("Here's why our approach is different")

**If a customer cancels:**
- Call them within 24 hours
- Find out the exact reason
- Offer to fix or refund
- Document the reason — patterns across 5+ cancellations drive product changes

**If you hit a build blocker:**
- Use the advisor and sub-agents aggressively
- Post in relevant Discord/subreddit
- Reach out to Vercel / Supabase support
- Don't spin for more than a day — ask for help

**If you run out of money:**
- Unlikely at $49–$299/month SaaS with < $500/month infra — but:
- Drop marketing spend, not product investment
- Move to monthly hosting/services vs annual
- Raise prices before reducing team (you're solo, no team to cut)
- Last resort: founder-friendly debt or revenue-based financing (Pipe, Capchase)

---

*Live document. Update weekly. Print the page-1 thesis and tape it to your wall.*  
*The opportunity closes as soon as someone else builds this. Move fast.*

**— FenceEstimatePro Battle Plan 2026**
