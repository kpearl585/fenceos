# Phase 1 - Database Implementation & Timeline

**Continuation of PHASE1_EXECUTION_PLAN.md**

---

## 2. DATABASE IMPLEMENTATION

### 2.1 Core Tables SQL

```sql
-- ================================================================
-- PHASE 1: CORE SCHEMA
-- ================================================================

-- Job Table
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Customer info
  customer_name TEXT,
  address TEXT,
  zip_code TEXT,
  lat DECIMAL(10, 7),
  lng DECIMAL(10, 7),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' 
    CHECK (status IN ('draft', 'quoted', 'won', 'lost', 'in_progress', 'closed')),
  
  -- Metadata
  notes TEXT,
  lead_source TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_jobs_org_id ON public.jobs(org_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_jobs_status ON public.jobs(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_jobs_created_at ON public.jobs(created_at DESC);

-- RLS
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jobs_org_isolation" ON public.jobs
  FOR ALL
  USING (org_id = get_my_org_id());

-- Trigger for updated_at
CREATE TRIGGER set_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

*[Full SQL continues in separate implementation document - see PHASE1_EXECUTION_PLAN.md section 2.1 for complete schema]*

---

## 8. 4-WEEK BUILD TIMELINE

### Week 1: Foundation (Database + Core Engine Skeleton)

**Goal:** Schema complete, basic calculation pipeline working

#### Day 1-2: Database Setup
**Tasks:** DB-001, DB-002
- [ ] Create all core tables (jobs, fence_designs, nodes, sections, gates, boms, bom_lines)
- [ ] Create configuration tables (fence_types, post_configs, rail_configs, etc.)
- [ ] Seed wood privacy configuration data
- [ ] Verify RLS policies work
- [ ] Test insert/query operations

**Deliverable:** Can create a job, design, and query via SQL

---

#### Day 3-4: Calculation Engine Skeleton
**Tasks:** CALC-001, CALC-002
- [ ] Implement design graph builder (linear feet + corners → nodes + sections)
- [ ] Implement node typer (classify nodes, assign post configs)
- [ ] Write unit tests for graph builder
- [ ] Test: 100ft straight run → 2 end nodes, 1 section
- [ ] Test: 100ft with 1 corner → 3 nodes (2 end, 1 corner), 2 sections

**Deliverable:** Can create fence graph from user input

---

#### Day 5: Section Normalizer + API Foundation
**Tasks:** CALC-003, API-001
- [ ] Implement spacing optimizer (avoid stub bays)
- [ ] Implement job management endpoints (POST /api/jobs, GET /api/jobs/:id)
- [ ] Test: 26ft section → 4 bays @ 6.5ft
- [ ] Test: 24ft section → 3 bays @ 8ft

**Deliverable:** Can create jobs via API, spacing optimizes correctly

---

### Week 2: Wood Calculations (The Core)

**Goal:** Complete wood privacy material calculations

#### Day 6-7: Post & Rail Calculators
**Tasks:** CALC-004, CALC-005
- [ ] Implement post calculator (count by type, handle shared nodes)
- [ ] Implement rail calculator (height-dependent rails, waste from offcuts)
- [ ] Write unit tests for both
- [ ] Test: 3 bays → 4 posts (2 end + 2 interior)
- [ ] Test: 6ft fence → 3 rails/bay

**Deliverable:** Accurate post and rail counts

---

#### Day 8-9: Picket & Concrete Calculators
**Tasks:** CALC-006, CALC-007
- [ ] Implement picket calculator (privacy style, waste factors)
- [ ] Implement concrete calculator (volumetric formula, frost zones)
- [ ] Write unit tests
- [ ] Test: 8ft bay → 18 pickets (96" / 5.5")
- [ ] Test: 4x4 post, zone 2 → 3 bags

**Deliverable:** Complete material calculations for posts, rails, pickets, concrete

---

#### Day 10: Gate Hardware Resolver
**Tasks:** CALC-008
- [ ] Implement gate hardware resolver
- [ ] Generate frame, hinges, latch, pickets for gate fill
- [ ] Test: 3ft walk gate → 2 hinges, 1 latch, 7 pickets
- [ ] Test: 7ft gate → adds wheel kit

**Deliverable:** Complete gate BOM generation

---

### Week 3: BOM Assembly + Validation

**Goal:** Unified BOM with validation system

#### Day 11-12: BOM Assembler
**Tasks:** CALC-009, API-002
- [ ] Implement BOM assembler (aggregate all calculations)
- [ ] Add insurance quantities (+2 posts always)
- [ ] Add calculation_notes to each line
- [ ] Implement design management API (POST /api/jobs/:job_id/design)
- [ ] Test: Full 200ft job generates complete BOM

**Deliverable:** Complete BOM from design graph

---

#### Day 13-14: Validation Engine
**Tasks:** VAL-001, VAL-002, VAL-003
- [ ] Implement validation engine core
- [ ] Implement 8 BLOCK rules
- [ ] Implement 5 WARN rules
- [ ] Test: Missing gate hardware → BLOCK
- [ ] Test: Spacing >8ft → BLOCK
- [ ] Test: Walk gate on 4x4 → WARN

**Deliverable:** Validation catches all error conditions

---

#### Day 15: Estimation API
**Tasks:** API-003, API-004
- [ ] Implement POST /api/designs/:design_id/estimate
- [ ] Execute full calculation pipeline
- [ ] Return BOM + validation + pricing
- [ ] Implement GET /api/designs/:design_id/bom
- [ ] Test: End-to-end API flow

**Deliverable:** Working estimation API

---

### Week 4: UI + Integration + Testing

**Goal:** Working estimator with UI, deployed to beta

#### Day 16-17: Input Form UI
**Tasks:** UI-001
- [ ] Build mobile-first input form
- [ ] Fields: linear feet, corners, height, gates
- [ ] Integrate with job + design APIs
- [ ] Form validation and error handling
- [ ] Loading states during calculation

**Deliverable:** Can create estimates via UI

---

#### Day 18-19: Results Display UI
**Tasks:** UI-002
- [ ] Build BOM results display
- [ ] Group by category (Posts, Rails, Pickets, etc.)
- [ ] Show validation errors/warnings
- [ ] Display pricing summary with Good/Better/Best tiers
- [ ] Print-friendly layout

**Deliverable:** Complete estimate creation flow

---

#### Day 20: Integration Testing
**Tasks:** TEST-003, TEST-004
- [ ] Run 5 integration test scenarios
- [ ] Compare BOM output to hand-calculated ground truth
- [ ] Verify accuracy <5% variance
- [ ] Test edge cases (short runs, many corners, many gates)
- [ ] Performance test (execution <5 seconds)

**Deliverable:** All integration tests pass

---

#### Day 21-22: Beta Deployment
- [ ] Deploy to staging environment
- [ ] Load test with 100 concurrent users
- [ ] Create 3 beta contractor accounts
- [ ] Onboard beta contractors
- [ ] Provide training documentation
- [ ] Set up error monitoring (Sentry)

**Deliverable:** 3 beta contractors can use system

---

#### Day 23-24: Bug Fixes + Polish
- [ ] Address beta feedback
- [ ] Fix any bugs discovered in testing
- [ ] Performance optimizations if needed
- [ ] Documentation updates
- [ ] Prepare for Phase 2 kickoff

**Deliverable:** Stable Phase 1 MVP

---

## 9. DEPENDENCY GRAPH

```
Week 1:
  DB-001 (Core Tables)
    ├─> DB-002 (Config Tables)
    └─> CALC-001 (Graph Builder)
        └─> CALC-002 (Node Typer)
            └─> CALC-003 (Section Normalizer)

Week 2:
  CALC-003
    ├─> CALC-004 (Post Calculator)
    ├─> CALC-005 (Rail Calculator)
    ├─> CALC-006 (Picket Calculator)
    ├─> CALC-007 (Concrete Calculator)
    └─> CALC-008 (Gate Resolver)

Week 3:
  CALC-004..008
    └─> CALC-009 (BOM Assembler)
        └─> VAL-001 (Validation Engine)
            ├─> VAL-002 (BLOCK Rules)
            └─> VAL-003 (WARN Rules)

  API-001 (Job API)
    └─> API-002 (Design API)
        └─> API-003 (Estimate API)
            └─> API-004 (BOM API)

Week 4:
  API-003
    ├─> UI-001 (Input Form)
    └─> UI-002 (Results Display)

  TEST-001 (Unit Tests) ← Continuous throughout Weeks 1-3
  TEST-002 (Validation Tests) ← Week 3
  TEST-003 (Integration Tests) ← Week 4
  TEST-004 (Sample Jobs) ← Week 1-2
```

---

## 10. CRITICAL PATH ITEMS

**Blockers (must complete before next phase):**
1. ✅ Database schema + seed data (Day 1-2)
2. ✅ Design graph builder working (Day 3-4)
3. ✅ All wood calculations complete (Day 6-10)
4. ✅ BOM assembly working (Day 11-12)
5. ✅ Validation engine working (Day 13-14)
6. ✅ Estimation API working (Day 15)
7. ✅ UI working end-to-end (Day 16-19)
8. ✅ Beta deployment live (Day 21-22)

**Risk Mitigation:**
- **Calculation complexity:** Build incrementally, test each module independently
- **Performance:** Benchmark early (Day 15), optimize if >5 seconds
- **Validation false positives:** Track override rate, tune rules in Week 4
- **Beta onboarding:** Prepare training docs by Day 20

---

## 11. SUCCESS METRICS (REVISITED)

### Technical Metrics
- [ ] **Accuracy:** BOM within 5% of hand calculations (measured on TEST-004 sample jobs)
- [ ] **Speed:** Estimate generation <5 seconds (measured on 200ft standard job)
- [ ] **Validation:** 100% detection of test errors (gates without hardware, spacing violations)
- [ ] **Reliability:** Zero calculation exceptions on valid inputs

### User Metrics
- [ ] **3 beta contractors** can create estimates without assistance
- [ ] **Average estimate time** <5 minutes (vs. 45-90 min manual)
- [ ] **Close rate improvement** tracked (baseline + 4 weeks data)

### Quality Metrics
- [ ] **Code coverage:** >80% unit test coverage on calculation modules
- [ ] **Integration tests:** All 5 scenarios pass
- [ ] **Zero critical bugs** at beta launch

---

## 12. POST-PHASE-1 TASKS (OUT OF SCOPE)

**Do NOT build in Phase 1:**
- ❌ Map-based fence line drawing
- ❌ Satellite measurement
- ❌ Photo-based measurement
- ❌ Chain link calculations
- ❌ Vinyl calculations
- ❌ Multi-material jobs
- ❌ Drive gates / double drive gates
- ❌ Customer-facing visual quote
- ❌ Digital signature / payment integration
- ❌ Job costing / calibration loop
- ❌ Supplier price integration
- ❌ Labor rate customization per crew
- ❌ Good/Better/Best material tier logic (Phase 1: just PT Pine vs. Cedar pricing)

**Phase 1 Scope:**
- ✅ Wood privacy only
- ✅ Walk gates only (3ft, 4ft)
- ✅ Simple linear footage input
- ✅ Basic Good/Better/Best (same materials, different margins)
- ✅ Single-material jobs
- ✅ Standard fence layouts

---

## 13. HANDOFF TO PHASE 2

**Completion Checklist:**
- [ ] All tasks DB-001 through UI-002 complete
- [ ] All tests passing (TEST-001 through TEST-004)
- [ ] 3 beta contractors using system
- [ ] Documentation complete
- [ ] Sentry monitoring active
- [ ] Known issues documented in GitHub

**Phase 2 Kickoff:**
- Review Phase 1 learnings
- Validate assumptions (accuracy, speed, user adoption)
- Decide: Proceed to Chain Link module or iterate on Phase 1?

---

## APPENDIX: QUICK REFERENCE

### Key Functions

```typescript
// Graph Building
buildDesignGraph(input: UserInput): { nodes: FenceNode[], sections: FenceSection[] }

// Node Classification
classifyAndConfigureNodes(nodes: FenceNode[], sections: FenceSection[]): FenceNode[]

// Spacing Optimization
optimizeSpacing(section: FenceSection): { post_spacing_ft: number, bay_count: number }

// Material Calculations
calculatePosts(sections: FenceSection[], nodes: FenceNode[]): PostCalculation
calculateRails(section: FenceSection): RailCalculation
calculatePickets(section: FenceSection, style: string): PicketCalculation
calculateConcrete(posts: Post[], frostZone: number, soilType: string): ConcreteCalculation
resolveGateHardware(gate: Gate): BOMLine[]

// BOM Assembly
assembleBOM(calculations: AllCalculations): BOM

// Validation
validateEstimate(design: FenceDesign, bom: BOM): ValidationResult
```

### Key Formulas

**Post Spacing Optimization:**
```typescript
const bayCount = Math.ceil(length_ft / 8)  // Never exceed 8ft
const spacing = length_ft / bayCount       // Redistribute evenly
```

**Concrete Calculation:**
```typescript
const holeVolume = π × (diameter/2)² × depth  // cubic inches
const postVolume = width² × depth              // cubic inches
const concreteVolume = (holeVolume - postVolume) / 1728  // cubic feet
const bags = Math.ceil(concreteVolume / 0.6)  // 80lb bag = 0.6 cu.ft
```

**Picket Count:**
```typescript
const picketsPerBay = Math.ceil((spacing_ft × 12) / picket_width_inches)
const total = picketsPerBay × bay_count × (1 + waste_factor)
```

---

**Document Version:** 1.0  
**Last Updated:** April 10, 2026  
**Next Review:** End of Week 2 (Day 10)

