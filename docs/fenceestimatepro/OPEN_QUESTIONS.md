# Open Questions & Assumptions

## 8. OPEN QUESTIONS / ASSUMPTIONS

### 8.1 Technical Assumptions

#### Database Performance
**Assumption:** Postgres can handle graph queries for designs with 100+ nodes without performance degradation.

**Risk:** Complex designs (large commercial jobs) may have 200-500 nodes. Graph traversal could be slow.

**Validation Needed:**
- Load test with 500-node graph
- Measure query time for BOM generation
- If >5 seconds: Consider caching or pre-computation

**Mitigation:** Add `bay_count` and `post_count` as cached fields on `fence_section` to avoid recalculating.

---

#### SKU Resolution Accuracy
**Assumption:** Template-based SKU matching achieves >90% match rate.

**Risk:** Supplier catalogs are inconsistent (same product, different descriptions).

**Validation Needed:**
- Test with 3 real supplier catalogs (Master Halco, Merchants Metals, local supplier)
- Measure: What % of BOM lines resolve automatically?
- Target: >95%

**Mitigation:** Build fuzzy matching (Levenshtein distance) for near-matches. Flag low-confidence matches for manual review.

---

#### Calculation Speed
**Assumption:** Full BOM generation completes in <5 seconds for standard residential job.

**Risk:** Complex validation rules + SKU resolution queries could compound to >10 seconds.

**Validation Needed:**
- Benchmark each module's execution time
- Identify slow paths
- Target breakdown:
  - Graph build: <500ms
  - Material calculation: <1s
  - Validation: <500ms
  - SKU resolution: <2s
  - Pricing: <500ms
  - **Total:** <5s

**Mitigation:** Parallelize independent calculations (per-section material calcs, per-gate resolution).

---

#### Waste Factor Accuracy
**Assumption:** Dynamic waste calculation (from geometry) is more accurate than static 5-10% factors.

**Risk:** May over-complicate for minimal accuracy gain. Industry defaults may be "good enough."

**Validation Needed:**
- Compare calculated waste vs. actuals on first 20 jobs
- If calculated waste < actuals: Too aggressive
- If calculated waste > actuals by >3%: Too conservative

**Mitigation:** Start with conservative waste (industry defaults + 2%), tune down as calibration data accumulates.

---

### 8.2 Business Logic Questions

#### Concrete: Frost Depth Data Source
**Question:** Where do we get authoritative frost depth by zip code?

**Options:**
1. NOAA frost depth database (free, public, authoritative)
2. Hardcode frost zones 1-4 by state
3. User input (least reliable)

**Recommendation:** Use NOAA data, fallback to state-level zones if zip lookup fails.

**Data Source:** https://www.weather.gov/source/zhu/ZHU_Training_Page/freezing_rain_stuff/Freeze_Depth_WM.pdf

---

#### Post Spacing: Adjustability Tolerance
**Question:** For wood fences, what's the acceptable range for post spacing optimization?

**Current Logic:** Redistribute evenly within `[6ft, 8ft]` to avoid stub bays.

**Example:** 26ft run
- Bad: 3 bays @ 8ft + 1 stub @ 2ft (4 posts)
- Good: 4 bays @ 6.5ft (5 posts)

**Question:** Is 6.5ft spacing acceptable, or should we enforce minimum 7ft?

**Industry Research:**
- Structural: 6ft spacing is structurally sound for 6ft fence
- Aesthetic: Some contractors prefer 7-8ft for "standard look"

**Recommendation:** Allow 6-8ft range, flag warnings for <7ft, BLOCK for <6ft.

---

#### Gate Post Sizing: When to Force 6x6?
**Question:** At what gate width does 4x4 become inadequate?

**Current Logic:**
- Walk gates ≤4ft: 4x4 acceptable, 6x6 recommended (WARN)
- Walk gates >4ft: 6x6 required (BLOCK)
- Drive gates: Always 6x6 minimum (BLOCK if 4x4)

**Industry Research:**
- 3-4ft walk gates on 4x4: Common, some sag over time
- 5ft+ walk gates on 4x4: High failure rate
- Drive gates on 4x4: Always fails

**Recommendation:** Keep current logic. Consider adding "heavy-duty" option for walk gates that upgrades to 6x6.

---

#### Vinyl Manufacturer Lock-In: Catalog Management
**Question:** How do we handle manufacturer-specific catalogs?

**Options:**
1. **Separate tables:** `vinyl_certainteed_items`, `vinyl_bufftech_items`, etc.
   - Pro: Clean separation
   - Con: Schema explosion (10+ manufacturers)

2. **Manufacturer field filter:** Single `supplier_items` table with `manufacturer` field
   - Pro: Single schema
   - Con: Complex queries

3. **Hybrid:** `fence_type_id` includes manufacturer: `vinyl_privacy_certainteed_6ft`
   - Pro: Type system enforces manufacturer match
   - Con: Combinatorial explosion (6 heights × 5 colors × 10 manufacturers = 300 fence types)

**Recommendation:** Option 2 (manufacturer field filter). SKU resolution adds `AND manufacturer = user_selected_manufacturer` to query.

---

#### Chain Link: Terminal Post Detection
**Question:** How do we automatically detect which posts are terminals vs. line posts?

**Current Logic:**
- Terminal = end post, corner post, gate post
- Line = all others at 10ft intervals

**Edge Case:** Tee junction (3-way intersection) — is this a terminal?

**Answer:** Yes. Any post with ≠2 linear connections is a terminal.

```typescript
function isTerminalPost(node: FenceNode): boolean {
  const connections = getConnectedEdges(node)
  return connections.length !== 2 || !isLinear(connections)
}
```

---

### 8.3 Validation Rules: Severity Tuning

#### Question: What's the right threshold for price anomaly warnings?

**Current Logic:**
- WARN if price/LF > 150% of average
- WARN if price/LF < 50% of average

**Question:** Are these thresholds too tight or too loose?

**Scenarios:**
- Difficult terrain job: +70% is justified
- Bulk discount job: -30% is justified
- Calculation error: ±100% is clearly wrong

**Recommendation:**
- WARN: ±50% (current)
- Add context check: If job has `terrain = steep` or `gates > 3`, increase threshold to ±70%
- User can always override with explanation

---

#### Question: Should BLOCK rules ever be overrideable?

**Philosophy Conflict:**
- **Safety-first:** BLOCK rules are non-negotiable (prevents impossible installs)
- **User freedom:** Expert users may have valid reasons to override

**Examples:**
- `HARDWARE_001` (gates without hinges): Should NEVER be overrideable
- `SPACING_001` (wood spacing >8ft): Rarely valid, but custom heavy-duty rails exist

**Recommendation:**
- **Type 1 BLOCK (Impossible States):** Not overrideable (gates without hinges, chain link without tension bands)
- **Type 2 BLOCK (Best Practices):** Overrideable with warning + required explanation (spacing >8ft with heavy rails)

---

### 8.4 Integration Questions

#### Supplier Catalog Updates
**Question:** How often should supplier catalogs sync?

**Options:**
1. Real-time API (ideal, rarely available)
2. Daily automated import (CSV/Excel)
3. Weekly manual review
4. On-demand user refresh

**Recommendation:** Daily automated import + on-demand refresh button. Flag quotes >7 days old with "Pricing may be stale."

---

#### Pricing Freshness Threshold
**Question:** At what age do we warn that pricing is stale?

**Current Logic:** WARN if `price_last_updated > 30 days`

**Consideration:** Lumber prices swing monthly, vinyl is stable for quarters.

**Recommendation:**
- Material-specific thresholds:
  - Wood/lumber: 14 days
  - Vinyl/aluminum: 60 days
  - Hardware/fasteners: 90 days
  - Concrete: 120 days

---

#### Tax Calculation
**Question:** Do we calculate sales tax in the estimate?

**Options:**
1. Include tax in quote (requires zip → tax rate lookup)
2. Show "plus tax" disclaimer
3. User configures tax rate per region

**Recommendation:** Option 3. User sets `default_tax_rate` in company settings. Quote shows subtotal + estimated tax. Actual tax calculated at payment.

---

### 8.5 Data Model Open Questions

#### Shared Nodes: Double-Counting Posts
**Question:** How do we handle posts shared between sections?

**Scenario:** Corner post connects 2 sections (90° turn).

**Problem:** Naive calculation counts it twice (once per section).

**Solution:** Graph-based approach — posts are nodes, counted once globally. Sections reference nodes but don't "own" them.

**Implementation:**
```typescript
// WRONG: Count posts per section, then sum
const totalPosts = sections.reduce((sum, s) => sum + s.post_count, 0)  // Double counts corners!

// CORRECT: Count unique nodes
const totalPosts = new Set(sections.flatMap(s => [s.start_node_id, s.end_node_id])).size
```

---

#### Multi-Height Fences
**Question:** Can a single fence have different heights per section?

**Example:** 6ft privacy in backyard, 4ft picket in front yard.

**Answer:** Yes. `height_ft` is a property of `FenceSection`, not `FenceDesign`.

**Implication:** BOM must aggregate posts of different lengths:
- 4ft section needs 7ft posts (4ft above ground + 3ft below)
- 6ft section needs 9ft posts (6ft above + 3ft below)

**Validation:** Warn if adjacent sections have >2ft height difference (aesthetic/structural concern).

---

#### Gate Positioning: Offset from Expected Location
**Question:** Do gate posts disrupt normal post spacing?

**Scenario:** 30ft run with 8ft spacing = posts at 0', 8', 16', 24', 30'. But gate is at 20'-24' (4ft gate).

**Problem:** Gate posts at 20' and 24' don't align with expected grid.

**Solution:** Gate posts are "insertion points" that override spacing logic.

**Implementation:**
```typescript
function calculatePostsWithGates(section: FenceSection): Post[] {
  // Step 1: Place gate posts first (fixed positions)
  const posts = placeGatePosts(section.gates)
  
  // Step 2: Fill remaining spans with optimized spacing
  const spans = getSpansBetweenGates(posts)
  spans.forEach(span => {
    posts.push(...optimizeSpacing(span))
  })
  
  return posts.sort((a, b) => a.position_ft - b.position_ft)
}
```

---

### 8.6 UX/UI Open Questions

#### Estimate Editing: Inline vs. Wizard
**Question:** Should users build estimates via multi-step wizard or single-page form?

**Options:**
1. **Wizard:** Step 1 (measurement) → Step 2 (material) → Step 3 (gates) → Step 4 (review)
   - Pro: Guides new users, prevents overwhelm
   - Con: Slower for experienced users (3-4 page loads)

2. **Single Page:** All inputs on one screen, live BOM preview
   - Pro: Fast for experienced users
   - Con: Overwhelming for new users (30+ fields)

3. **Hybrid:** Collapsible sections (measurement, material, gates, pricing) on single page
   - Pro: Best of both (fast for experts, structured for beginners)
   - Con: Complex UI implementation

**Recommendation:** Hybrid (collapsible sections). Default: all collapsed except "Measurement." As user fills sections, auto-expand next.

---

#### BOM Display: Grouped vs. Flat
**Question:** How should BOM be displayed to user?

**Options:**
1. **Flat list:** All 40 line items in sequence
2. **Grouped by category:** Posts (4 items), Rails (2 items), Panels (1 item), etc.
3. **Grouped by section:** Section 1 (wood), Section 2 (vinyl)

**Recommendation:** Option 2 (grouped by category) for internal BOM. Option 3 (grouped by section) for multi-material jobs.

---

#### Override Warnings: Severity
**Question:** When user overrides a calculated value, how aggressively do we warn?

**Current Logic:** Show warning if override differs by >15%.

**Question:** Should we BLOCK dangerous overrides?

**Example:** User changes concrete from 82 bags to 10 bags.

**Recommendation:**
- 15-30% difference: Yellow warning, allow
- 30-50% difference: Orange warning, require confirmation
- >50% difference: Red warning, require explanation text

---

### 8.7 Assumptions Requiring Validation

| Assumption | Risk Level | Validation Method |
|------------|------------|-------------------|
| Graph-based calculation is fast enough (<5s) | Medium | Benchmark with 500-node graph |
| SKU templates match >90% of catalog items | High | Test with 3 real supplier catalogs |
| Dynamic waste is more accurate than static 5-10% | Low | Compare to first 20 job actuals |
| Contractors will manually enter linear footage (no map drawing required for MVP) | Medium | User interviews with 5 beta contractors |
| Good/Better/Best pricing increases close rate | Medium | A/B test with 50 quotes (GBB vs. single price) |
| Validation false positive rate <5% | High | Track override rate in first 100 estimates |
| NOAA frost depth data is accurate for local conditions | Low | Compare to local building codes |
| Vinyl manufacturer lock-in is acceptable to users | Medium | User interviews |
| Job costing feedback loop drives usage (sticky feature) | High | Measure retention after 20 closeouts vs. no closeouts |
| Mobile-first is essential (not just nice-to-have) | High | Usage analytics: desktop vs. mobile sessions |

---

### 8.8 Research Questions for Beta

**Questions to answer during Phase 1 beta (first 4 weeks):**

1. **Accuracy:** How close are calculated BOMs to contractor's hand calculations?
   - Target: <5% variance
   - Measure: Side-by-side comparison on 20 estimates

2. **Speed:** How long does estimate generation take (perceived)?
   - Target: <5 minutes from start to quote sent
   - Measure: Time tracking in app

3. **Error Rate:** How often does validation catch real errors vs. false positives?
   - Target: >80% true positives
   - Measure: Track override reason codes

4. **Close Rate:** Does Good/Better/Best improve conversions?
   - Target: +10-20% close rate
   - Measure: Baseline close rate (30 days) → GBB close rate (30 days)

5. **Forgotten Items:** How many estimates have missing hardware before validation?
   - Target: Validation catches 100% of test errors
   - Measure: Seeded error test (deliberately omit gate hardware, see if validation catches)

6. **Price Freshness:** How often are supplier prices out of date?
   - Target: <10% of quotes flagged as stale
   - Measure: Track pricing freshness warnings

7. **Mixed Materials:** What % of jobs are multi-material?
   - Hypothesis: 30% of residential jobs
   - Measure: Beta contractor job distribution

8. **Mobile Usage:** What % of estimates are created on mobile vs. desktop?
   - Hypothesis: 60% mobile (field), 40% desktop (office)
   - Measure: Device analytics

---

### 8.9 Decisions Deferred to Post-MVP

**Not solving in Phase 1-4:**

1. **Lead management / CRM:** Focusing on calculation engine first, not full pipeline
2. **Customer-facing configurator:** Tier 3 feature (requires stable calculator)
3. **Photo-based measurement:** Tier 2 feature (satellite is faster path)
4. **Financing integration:** Tier 3 feature (requires payment system)
5. **Crew scheduling / dispatch:** Outside scope (calculation engine only)
6. **Warranty tracking:** Nice-to-have, not core to estimating
7. **Regional pricing intelligence:** Requires network effect (100+ users)
8. **AI-powered input (voice/text):** Tier 3 feature (UX sugar, not core)

---

### 8.10 Key Architectural Decisions

**Decisions made, documented for future reference:**

1. **Graph-based design:** Nodes = posts, edges = fence runs
   - **Why:** Handles complex topologies (corners, tee junctions, shared posts)
   - **Alternative considered:** Section-based only (simpler but can't handle shared nodes)

2. **Modular calculation services:** 10 discrete modules, not monolithic function
   - **Why:** Testability, maintainability, parallel execution
   - **Alternative considered:** Single `generateBOM()` function (faster to build, nightmare to debug)

3. **Fence-type-specific modules:** Separate logic per fence type
   - **Why:** Wood ≠ vinyl ≠ chain link — forcing shared logic creates complexity
   - **Alternative considered:** Generic material calculator with config (tried, failed — too many edge cases)

4. **Validation-first architecture:** BLOCK before generation, not after
   - **Why:** Prevent impossible states from entering BOM
   - **Alternative considered:** Warnings only (less safe but more flexible)

5. **Template-based SKU resolution:** Map templates to catalog via search
   - **Why:** Supplier catalogs are inconsistent — can't hard-code SKUs
   - **Alternative considered:** Hard-coded SKU mapping per supplier (breaks when catalog changes)

6. **Calibration via EWMA:** Weight recent jobs higher than old jobs
   - **Why:** Contractor processes improve over time — old data less relevant
   - **Alternative considered:** Simple average (too slow to adapt to changes)

---

## Summary

This spec converts three research documents into a buildable system. Every calculation is traceable. Every validation rule has a purpose. Every fence type has explicit logic.

**Start with Phase 1 (wood privacy).** Prove the engine works. Get user feedback. Then layer complexity.

**The moat is the calibration loop.** After 50 jobs, this system knows the contractor's actual waste, labor rates, and concrete usage. Switching means losing that intelligence.

**Build for install-realism.** Every fastener, every bag of concrete, every tension band. If a crew would notice it missing, it's in the BOM.

---

**Next Steps for Engineering:**
1. Review data model (Section 2)
2. Implement Phase 1 modules (Section 3)
3. Build wood privacy calculation (Section 4.1)
4. Deploy to 3-5 beta contractors
5. Measure accuracy, speed, error rate
6. Iterate based on feedback
7. Proceed to Phase 2 (chain link)

