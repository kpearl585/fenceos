# MVP Build Priority & Phase Plan

## 7. MVP BUILD ORDER

### Philosophy

**Build for learning, not for perfection.**

Start with the fence type that:
1. Has highest market share (45% = wood privacy)
2. Has simplest calculation model (no manufacturer lock-in)
3. Provides fastest path to user feedback
4. De-risks core technical assumptions (graph-based calculation works)

Then layer complexity: chain link hardware, vinyl manufacturer constraints, mixed materials.

---

## PHASE 1: Wood Privacy Estimator MVP
**Timeline:** Weeks 1-4  
**Goal:** Prove the calculation engine works end-to-end

### What Gets Built

#### Database Schema
- `fence_type` (wood_privacy only)
- `fence_design`, `fence_node`, `fence_section`
- `post_config`, `rail_config`, `panel_config` (wood-specific)
- `gate`, `gate_config`
- `hardware_kit`, `hardware_item`
- `concrete_rule`
- `bom`, `bom_line`
- `supplier_item` (basic catalog)

#### Calculation Modules
- **Design Graph Builder** (full implementation)
- **Node Typer** (4 node types: line, corner, end, gate)
- **Section Normalizer** (post spacing optimizer)
- **Waste Engine** (basic: cut waste + defect rate)
- **Concrete Engine** (volumetric formula)
- **Gate Resolver** (walk gates only)
- **BOM Assembler** (aggregation + insurance quantities)
- **Validation Engine** (10 critical BLOCK rules)
- **Pricing Engine** (Good/Better/Best tiers)

#### Fence Type: Wood Privacy
- **Posts:** 4x4 line, 4x4 corner/end, 6x6 gate
- **Rails:** 2x4 (2-rail for 4', 3-rail for 6')
- **Pickets:** 1x6 dog-ear (privacy style only)
- **Gates:** Walk gates 3-4ft (metal frame kit)
- **Hardware:** Fence brackets, nails, post caps
- **Concrete:** Frost zones 1-4, normal soil only

#### User Interface
- Simple linear footage input (no map drawing yet)
- Height selector (4', 6')
- Corner count input
- Gate count + width selector
- Material override: PT pine vs. cedar
- "Generate Estimate" button

#### Output
- **BOM:** Text list with quantities + prices
- **Pricing:** Good/Better/Best cards (simple HTML)
- **Quote:** Basic PDF with pricing breakdown

### What Gets Skipped (Intentionally)
- ❌ Map-based fence line drawing
- ❌ Satellite measurement
- ❌ Terrain/elevation data
- ❌ Multi-material jobs
- ❌ Chain link, vinyl, aluminum
- ❌ Drive gates, double drive
- ❌ Customer-facing visual quote
- ❌ Digital signature/payment
- ❌ Job costing / calibration loop

### Why This Order

1. **Proves core engine:** Graph-based calculation with real fence math
2. **Validates data model:** Schema works for actual BOM generation
3. **Tests rule system:** Validation catches missing hardware
4. **Gets user feedback fast:** Working estimator in 4 weeks
5. **De-risks biggest technical assumption:** "Can we actually calculate this correctly?"

### Success Metrics

- [ ] Generate accurate BOM for 200ft wood privacy, 6 corners, 2 walk gates
- [ ] Validation catches missing gate hardware (BLOCK error)
- [ ] Post count matches hand calculation
- [ ] Concrete calculation within 5% of hand calculation
- [ ] Pricing tiers generate correctly
- [ ] Estimate generation <5 seconds

### User Value Unlocked

**For contractors:**
- Eliminate post-count errors
- Never forget gate hardware again
- Concrete calculation from volumetric formula (not "2 bags per post" guess)
- Good/Better/Best pricing in one click

**Impact:** A contractor doing 150 wood privacy jobs/year saves 30-60 min per estimate = 75-150 hours/year = $11K-$22K in recovered time.

---

## PHASE 2: Chain Link Module
**Timeline:** Weeks 5-6  
**Goal:** Prove system handles complex hardware trees

### What Gets Built

#### Calculation Module: Chain Link
- **Post logic:** Terminal vs. line post differentiation
- **Fabric rolls:** Calculate rolls from linear feet
- **Top rail:** Continuous rail with sleeves
- **Hardware resolver:** THE TEST — can we correctly calculate:
  - Tension bars (1 per terminal)
  - Tension bands (height-dependent: `height_ft - 1`)
  - Brace bands (1 per terminal)
  - Loop caps (1 per line post)
  - Tie wires (height-dependent + rail ties)
  - Rail sleeves (joint count)

#### Fence Type: Chain Link
- **Residential 4'** (galvanized 11.5-gauge)
- **Commercial 6'** (galvanized 9-gauge)
- **Walk gates** (3-4ft pre-fab frames)

#### Validation Rules (Chain Link-Specific)
- `HARDWARE_003`: Terminal posts without tension bars
- `HARDWARE_004`: Incorrect tension band count
- `HARDWARE_005`: Line posts without loop caps

### Why This Order

1. **Stress-tests hardware resolver:** Chain link has 10+ hardware components per terminal post
2. **Validates validation system:** Missing ONE component makes install impossible
3. **Proves modularity:** Add new fence type without breaking wood module
4. **High market share:** 20% of residential, 40% of commercial

### Success Metrics

- [ ] 200ft chain link with 2 terminals + 18 line posts generates complete hardware list
- [ ] Tension band count = `(terminal_count) × (height_ft - 1)`
- [ ] Validation catches missing loop caps
- [ ] BOM includes all 10+ hardware categories

### User Value Unlocked

**The #1 pain point for chain link:** Forgetting hardware components.

A single missing tension bar or brace band = $75 supplier trip + 2 hours crew downtime = $200 per forgotten item.

Contractors forget hardware on ~15% of chain link jobs.

**Impact:** 50 chain link jobs/year × 15% error rate × $200 = $1,500/year in prevented waste.

---

## PHASE 3: Vinyl + Mixed-Material Support
**Timeline:** Weeks 7-9  
**Goal:** Handle manufacturer constraints + multi-material jobs

### What Gets Built

#### Calculation Module: Vinyl
- **Panel-width locking:** Post spacing MUST equal panel width
- **Manufacturer lock-in:** All SKUs filtered to single manufacturer
- **Custom panel detection:** Remainder footage triggers custom panel
- **Aluminum insert requirements:** Gate posts (mandatory), corners (recommended)

#### Fence Type: Vinyl
- **Privacy 6'** (white, tan, gray)
- **Semi-privacy** (lattice-top)
- **Manufacturers:** CertainTeed, Bufftech (2 catalogs)

#### Multi-Material Job Support
- **Per-section material assignment:** Section 1 = wood, Section 2 = vinyl
- **BOM aggregation across types**
- **Validation across materials:** Gate post size consistency, etc.

#### Validation Rules (Vinyl-Specific)
- `SPACING_002`: Post spacing ≠ panel width
- `HARDWARE_006`: Gate posts without aluminum inserts

### Why This Order

1. **Real-world necessity:** 30% of residential jobs have mixed materials (wood fence + vinyl gate, etc.)
2. **Manufacturer constraints:** Validates SKU resolution handles brand lock-in
3. **Complexity layer:** Non-adjustable spacing is a new constraint type

### Success Metrics

- [ ] Mixed job: 100ft wood + 50ft vinyl generates separate BOM sections
- [ ] Vinyl section with 94ft run calculates: 15 panels (6ft each) + 1 custom (4ft)
- [ ] Validation BLOCKS when vinyl spacing doesn't match panel width
- [ ] SKU resolver filters to single manufacturer (no mixing CertainTeed + Bufftech)

### User Value Unlocked

**Mixed-material jobs currently require:**
- 2 separate estimates (wood + vinyl)
- Manual aggregation
- High error rate from switching contexts

**Impact:** Cuts estimate time for mixed jobs from 45 min to 10 min = 35 min saved × 30 jobs/year = 17.5 hours = $2,600/year.

---

## PHASE 4: Remaining Fence Types + Calibration Hooks
**Timeline:** Weeks 10-12  
**Goal:** Complete coverage + learning loop

### What Gets Built

#### Fence Types
- **Aluminum ornamental** (pool code support)
- **Steel/wrought iron** (finishing requirements)
- **Composite** (Trex, SimTek)

#### Job Costing & Calibration System
- **Closeout form:** Actual material used, actual labor hours
- **Variance calculation:** Estimated vs. actual per category
- **Calibration engine:** EWMA-based adjustment of:
  - Waste factors
  - Concrete per post
  - Production rates (LF/day)
- **Feedback dashboard:** "Your concrete estimates are 12% low" with one-click fix

#### Enhanced Validation
- **Pool code rules:** Self-closing gates, latch height, picket spacing
- **ADA compliance:** Gate width, force, hardware type
- **Code database:** Frost depth by zip code, wind zones, height restrictions

### Why This Order

1. **Completes market coverage:** Now handles 95%+ of residential jobs
2. **Builds the moat:** Calibration creates switching cost (data is proprietary)
3. **Industry-first feature:** No competitor has feedback loop from actuals

### Success Metrics

- [ ] All 6 fence types generate accurate BOMs
- [ ] Pool code validation catches non-compliant gates
- [ ] After 20 closeouts, system calibrates waste factors
- [ ] "Your waste is 7.2%, not 5%" recommendation with one-click apply

### User Value Unlocked

**The feedback loop is the killer feature.**

After 50 jobs, the system KNOWS:
- This contractor's cedar waste = 7.2% (not industry 5%)
- Their vinyl crew installs at 65 LF/day (not standard 80)
- Their concrete usage = 2.3 bags/post (not default 2)

**Impact:** Closes the 8-15% margin gap between estimated and actual.

On $5M revenue at 25% gross margin, closing a 10% variance gap = $125K/year in recovered margin.

---

## CRITICAL PATH DEPENDENCIES

```
Phase 1 (Wood MVP)
    ↓
Phase 2 (Chain Link) ← Depends on: hardware resolver, validation system
    ↓
Phase 3 (Vinyl + Mixed) ← Depends on: SKU resolver, multi-material BOM assembly
    ↓
Phase 4 (Remaining + Calibration) ← Depends on: all calculation modules working
```

**Cannot skip phases.** Each builds on validated learnings from prior phase.

---

## DECISION GATES

### After Phase 1 (Week 4)
**Go/No-Go Decision:** Does the graph-based calculation engine work?

**Success = Proceed to Phase 2 if:**
- [ ] BOM accuracy within 3% of hand calculations
- [ ] Validation catches 100% of test errors (missing hardware, spacing violations)
- [ ] 3 beta contractors can generate estimates without bugs

**Failure = Pivot if:**
- Calculation complexity exceeds expected (>10 seconds to generate BOM)
- Data model doesn't support real-world fence layouts
- Validation system has false positives

### After Phase 2 (Week 6)
**Go/No-Go Decision:** Can we handle fence-type complexity?

**Success = Proceed to Phase 3 if:**
- [ ] Chain link hardware resolver generates complete BOMs
- [ ] No hardware components forgotten on test jobs
- [ ] Modular fence-type system works (wood + chain link coexist cleanly)

### After Phase 3 (Week 9)
**Go/No-Go Decision:** Are we ready for production?

**Success = Proceed to Phase 4 if:**
- [ ] Mixed-material jobs generate correct BOMs
- [ ] 10 beta contractors using system for real estimates
- [ ] Close rate improvement measurable (baseline + 4 weeks data)

---

## ANTI-PATTERNS TO AVOID

### ❌ Don't Build These (Common Traps)

1. **"Let's add all 6 fence types in Phase 1"**
   - Why not: Delays user feedback by 8+ weeks, compounds bugs
   - Reality: Wood alone proves the engine works

2. **"Let's build the map drawing UI first"**
   - Why not: Complex UI work before validating calculation engine
   - Reality: Simple linear footage input is enough for MVP

3. **"Let's perfect the calibration system before launch"**
   - Why not: No data to calibrate until contractors use it
   - Reality: Calibration is Phase 4 because it needs real job data

4. **"Let's build customer self-service configurator first"**
   - Why not: Builds the wrong thing — contractors need estimator first
   - Reality: Configurator is Tier 3 (long-term moat)

5. **"Let's integrate with all 10 suppliers in Phase 1"**
   - Why not: Complexity explosion, API dependencies
   - Reality: Manual price entry + 1 CSV import is enough for MVP

---

## TECHNICAL RISK MITIGATION

### Risk 1: Calculation Complexity
**Risk:** BOM generation takes >10 seconds, feels slow

**Mitigation:**
- Phase 1: Measure calculation time per module
- Target: <2 seconds for standard 200ft job
- If >5 seconds: Optimize hot paths (likely waste engine or SKU resolution)

### Risk 2: Validation False Positives
**Risk:** Validation blocks valid estimates

**Mitigation:**
- Phase 1: Build override system from day 1
- Log all validation blocks
- Review weekly: "Why was this blocked? Should it have been?"
- Tune rules based on real data

### Risk 3: SKU Resolution Failures
**Risk:** Too many "MANUAL_RESOLVE_REQUIRED" flags

**Mitigation:**
- Phase 1: Test with 1 real supplier catalog (50-100 SKUs)
- Measure match rate (target: >95%)
- If <90%: Improve template matching logic

### Risk 4: Data Model Inflexibility
**Risk:** Schema doesn't support real-world fence layouts

**Mitigation:**
- Phase 1: Test with 10 real contractor estimates (hand-provided)
- Attempt to model each in the system
- If any cannot be modeled: Schema is wrong, redesign

---

## SUCCESS DEFINITION

### Phase 1 Success = ✅
- 5 beta contractors can generate wood privacy estimates
- BOM accuracy within 5% of hand calculations
- No critical validation false positives
- Estimate generation <5 seconds

### Phase 2 Success = ✅
- Same 5 contractors can now quote chain link
- Hardware resolver generates complete BOMs (zero forgotten items)
- Validation catches hardware omissions

### Phase 3 Success = ✅
- Mixed-material jobs work correctly
- Vinyl manufacturer lock-in works
- Custom panel detection works

### Phase 4 Success = ✅
- All 6 fence types supported
- Calibration system shows measurable accuracy improvement after 20 jobs
- Pool code validation working

### Production Ready = ✅
- 20+ contractors using daily
- Close rate improvement measurable (+10-20%)
- Estimate generation time <5 min (vs. 45-90 min manual)
- Material accuracy <3% variance

---

