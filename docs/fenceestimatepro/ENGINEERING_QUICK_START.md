# Phase 1 Wood Privacy MVP - Engineering Quick Start

**Read this first if you're implementing Phase 1**

---

## TL;DR - What We're Building

A working wood privacy fence estimator that:
- Takes linear feet + corners + gates as input
- Generates install-accurate BOM with zero forgotten hardware
- Validates impossible states before quote generation
- Completes in <5 seconds

**Scope:** Wood privacy only. Walk gates only. Single-material jobs. No map drawing.

---

## Day 1 - Get Started

### 1. Read These Docs (in order)
1. **PHASE1_EXECUTION_PLAN.md** - Full task breakdown (Section 1)
2. **PHASE1_DATABASE_AND_TIMELINE.md** - Schema + timeline
3. This file - Quick start

### 2. Set Up Environment
```bash
# Clone repo
cd /Users/pearllabs/Documents/GitHub/fenceos

# Install dependencies (already done, but verify)
pnpm install

# Set up local Supabase (or use existing)
# Connection string should be in .env.local

# Verify Supabase connection
npm run db:status
```

### 3. Run Database Migrations
```bash
# Apply Phase 1 schema
npm run db:migrate:phase1

# Verify tables exist
npm run db:verify

# Seed wood privacy config data
npm run db:seed:wood
```

### 4. Your First Task: DB-001
**Goal:** Create core tables and verify they work

**Files to create:**
- `supabase/migrations/20260410_phase1_core_schema.sql`
- `supabase/migrations/20260410_phase1_config_schema.sql`
- `supabase/migrations/seeds/wood_privacy_config.sql`

**Copy SQL from:** `PHASE1_DATABASE_AND_TIMELINE.md` Section 2.1, 2.2, 2.3

**Test it:**
```sql
-- Insert a test job
INSERT INTO jobs (org_id, address) 
VALUES ('YOUR_ORG_ID', '123 Test St');

-- Verify RLS works
SELECT * FROM jobs;  -- Should only see your org's jobs

-- Create a test design
INSERT INTO fence_designs (job_id, total_linear_feet, fence_type_id)
VALUES ('JOB_ID_FROM_ABOVE', 100, 'wood_privacy_6ft');

-- Verify config data loaded
SELECT * FROM fence_types WHERE id = 'wood_privacy_6ft';
SELECT * FROM post_configs WHERE fence_type_id = 'wood_privacy_6ft';
```

**Success criteria:**
- [ ] All 7 core tables exist
- [ ] All 8 config tables exist
- [ ] Wood privacy fence type seeded
- [ ] Post configs seeded (4x4, 6x6)
- [ ] Can insert and query via SQL

---

## Week 1 Overview

**Days 1-2:** Database (you just did this)  
**Days 3-4:** Graph builder (CALC-001, CALC-002)  
**Day 5:** Spacing optimizer + Job API (CALC-003, API-001)

---

## Core Calculation Flow (What You're Building)

```
User Input (100ft, 2 corners, 1 gate)
   ↓
buildDesignGraph()
   → FenceNode[] (4 nodes: 2 end, 1 corner, 2 gate)
   → FenceSection[] (3 sections connecting nodes)
   ↓
classifyAndConfigureNodes()
   → Assign node_type to each node
   → Assign PostConfig (4x4 or 6x6)
   ↓
optimizeSpacing() per section
   → Calculate ideal post_spacing_ft
   → Calculate bay_count
   ↓
calculatePosts()
   → Count: 12 line, 2 corner, 2 end, 2 gate = 18 total
   ↓
calculateRails()
   → 6ft fence → 3 rails/bay
   → 15 bays → 45 rails
   ↓
calculatePickets()
   → 8ft bay → 18 pickets
   → 15 bays → 270 pickets (+ 5% waste = 284)
   ↓
calculateConcrete()
   → 16x 4x4 posts @ 3 bags = 48 bags
   → 2x 6x6 posts @ 4 bags = 8 bags
   → Total: 56 bags + 5% = 59 bags
   ↓
resolveGateHardware()
   → 1x 3ft gate → frame, 2 hinges, 1 latch, 7 pickets
   ↓
assembleBOM()
   → Aggregate all calculations
   → Add insurance quantities (+2 posts)
   → Generate calculation_notes
   ↓
validateEstimate()
   → Run BLOCK rules (gates have hardware? spacing valid?)
   → Run WARN rules (gate on 4x4? recommend 6x6)
   → Return validation result
   ↓
IF validation.canProceed:
   → Save BOM to database
   → Calculate pricing
   → Return quote-ready output
ELSE:
   → Return errors to user
```

---

## Key Implementation Patterns

### 1. Pure Functions > Side Effects
```typescript
// GOOD: Pure function, testable
function calculatePosts(
  sections: FenceSection[], 
  nodes: FenceNode[]
): PostCalculation {
  // ... calculation logic
  return {
    posts_by_type: {...},
    total_posts: 18
  }
}

// BAD: Side effects, hard to test
function calculatePosts(designId: UUID): void {
  const sections = fetchSections(designId)  // DB call
  const posts = /* calculate */
  savePosts(posts)  // DB call
}
```

### 2. Calculation Notes Are Critical
```typescript
// Every BOM line needs traceability
{
  category: 'post',
  description: '4x4x8\' PT Post',
  order_quantity: 18,
  calculation_notes: '12 line + 2 corner + 2 end + 2 insurance = 18'
}
```

### 3. Validation Returns Errors, Doesn't Throw
```typescript
// GOOD: Validation returns structured errors
function validateGateHardware(design, bom): ValidationError | null {
  if (gateCount > 0 && hinges === 0) {
    return {
      rule_id: 'HARDWARE_001',
      message: 'Gates configured but no hinges in BOM',
      severity: 'BLOCK'
    }
  }
  return null
}

// BAD: Throws exceptions (breaks pipeline)
function validateGateHardware(design, bom): void {
  if (gateCount > 0 && hinges === 0) {
    throw new Error('Missing hinges')  // Stops execution
  }
}
```

### 4. Shared Nodes Counted Once
```typescript
// Calculate unique nodes across all sections
const allNodeIds = sections.flatMap(s => [s.start_node_id, s.end_node_id])
const uniqueNodeIds = new Set(allNodeIds)
const totalPosts = uniqueNodeIds.size

// Don't do this (double-counts corners):
const totalPosts = sections.reduce((sum, s) => sum + s.bay_count + 1, 0)
```

---

## Testing Strategy

### Unit Tests (Continuous)
Write tests as you build each module.

```typescript
// Example: Post calculator test
describe('calculatePosts', () => {
  test('straight 24ft run produces 4 posts', () => {
    const sections = [{ length_ft: 24, bay_count: 3 }]
    const nodes = [
      { node_type: 'end_post' },
      { node_type: 'line_post' },
      { node_type: 'line_post' },
      { node_type: 'end_post' }
    ]
    
    const result = calculatePosts(sections, nodes)
    
    expect(result.total_posts).toBe(4)
    expect(result.posts_by_type.end_4x4).toBe(2)
    expect(result.posts_by_type.line_4x4).toBe(2)
  })
})
```

### Integration Tests (Week 4)
Full pipeline tests with known ground truth.

```typescript
// Example: End-to-end test
test('200ft job with 6 corners and 2 gates', async () => {
  // Create job
  const job = await createJob({ address: 'Test St' })
  
  // Create design
  const design = await createDesign({
    job_id: job.id,
    total_linear_feet: 200,
    corner_count: 6,
    gates: [
      { width_ft: 3, position_ft: 50 },
      { width_ft: 4, position_ft: 150 }
    ]
  })
  
  // Run estimation
  const result = await runEstimate(design.id)
  
  // Verify BOM accuracy (compare to hand calculation)
  expect(result.bom.total_posts).toBeCloseTo(HAND_CALCULATED_POSTS, 1)
  expect(result.bom.total_rails).toBeCloseTo(HAND_CALCULATED_RAILS, 1)
  
  // Verify validation
  expect(result.validation.canProceed).toBe(true)
  expect(result.validation.errors).toHaveLength(0)
})
```

---

## Common Pitfalls

### ❌ Don't Do This

**1. Calculating materials per section then summing**
```typescript
// WRONG: Double-counts shared posts at corners
const totalPosts = sections.reduce((sum, section) => {
  return sum + section.bay_count + 1  // +1 for end post
}, 0)
```
**Fix:** Count unique nodes globally, not per section.

---

**2. Hardcoding "2 bags per post"**
```typescript
// WRONG: Ignores frost depth, post size, hole diameter
const concreteBags = postCount * 2
```
**Fix:** Use volumetric formula per post with frost zone adjustment.

---

**3. Assuming 5% waste everywhere**
```typescript
// WRONG: Same waste for all materials
const pickets = rawCount * 1.05
const rails = rawCount * 1.05
```
**Fix:** Calculate waste from actual cuts and geometry.

---

**4. Forgetting insurance quantities**
```typescript
// WRONG: Exact count, no buffer
orderQuantity = rawQuantity
```
**Fix:** Always add +2 posts, +5% concrete, etc.

---

**5. Validation that throws exceptions**
```typescript
// WRONG: Breaks entire pipeline
if (invalid) throw new Error('Invalid')
```
**Fix:** Return structured errors, let caller decide how to handle.

---

## Performance Targets

**Calculation Speed:**
- Graph building: <100ms
- Material calculations: <500ms
- BOM assembly: <200ms
- Validation: <200ms
- **Total: <2 seconds** (target <5 seconds)

**Database Queries:**
- Fetch design + nodes + sections: <50ms (use JOIN)
- Save BOM + lines: <100ms (batch insert)

**Optimizations:**
- Cache post configs in memory (small data, read-heavy)
- Batch insert BOM lines (not one-at-a-time)
- Use database transactions for consistency

---

## When You Get Stuck

### Calculation Questions
- **Post count wrong?** → Check for shared node double-counting
- **Spacing weird?** → Review spacing optimizer logic (26ft → 4 bays @ 6.5ft)
- **Concrete too high/low?** → Verify frost depth lookup and volumetric formula
- **Gate hardware missing?** → Check gate resolver, ensure all items added to BOM

### Database Questions
- **RLS blocking queries?** → Verify `get_my_org_id()` function exists and works
- **Foreign key errors?** → Check insert order (config tables before core tables)
- **Slow queries?** → Add indexes on `org_id`, `job_id`, `design_id`, `bom_id`

### API Questions
- **Validation blocking valid estimates?** → Review BLOCK rules, may need to tune thresholds
- **BOM missing items?** → Check BOM assembler aggregation logic
- **Execution too slow?** → Profile each module, optimize bottleneck

### UI Questions
- **Form not submitting?** → Check API response format matches UI expectations
- **BOM not displaying?** → Verify category grouping logic
- **Mobile layout broken?** → Test at 320px width, ensure responsive design

---

## Daily Standup Template

**What I completed:**
- Task IDs (e.g., DB-001, CALC-002)
- Tests written
- Blockers resolved

**What I'm working on today:**
- Task IDs
- Expected completion time

**Blockers:**
- Technical issues
- Questions for team
- Dependencies waiting

**Metrics:**
- Test coverage: X%
- Tasks complete: X/Y
- On track for week N goal? Yes/No

---

## Phase 1 Completion Checklist

**Week 1:**
- [ ] DB-001: Core tables created
- [ ] DB-002: Config tables + seed data
- [ ] CALC-001: Graph builder working
- [ ] CALC-002: Node typer working
- [ ] CALC-003: Spacing optimizer working
- [ ] API-001: Job API working

**Week 2:**
- [ ] CALC-004: Post calculator working
- [ ] CALC-005: Rail calculator working
- [ ] CALC-006: Picket calculator working
- [ ] CALC-007: Concrete calculator working
- [ ] CALC-008: Gate resolver working

**Week 3:**
- [ ] CALC-009: BOM assembler working
- [ ] VAL-001: Validation engine working
- [ ] VAL-002: BLOCK rules implemented
- [ ] VAL-003: WARN rules implemented
- [ ] API-002: Design API working
- [ ] API-003: Estimation API working
- [ ] API-004: BOM API working

**Week 4:**
- [ ] UI-001: Input form working
- [ ] UI-002: Results display working
- [ ] TEST-001: Unit tests pass (>80% coverage)
- [ ] TEST-002: Validation tests pass
- [ ] TEST-003: Integration tests pass (all 5 scenarios)
- [ ] TEST-004: Sample jobs match hand calculations
- [ ] Beta deployment live
- [ ] 3 beta contractors onboarded

---

## Resources

**Spec Documents:**
- `ADVANCED_ESTIMATOR_SPEC.md` - Data model + architecture
- `FENCE_TYPE_MODULES.md` - Wood calculation formulas
- `VALIDATION_AND_FLOW.md` - Validation rules + runtime flow
- `MVP_BUILD_ORDER.md` - Phase breakdown
- `PHASE1_EXECUTION_PLAN.md` - Task details
- `PHASE1_DATABASE_AND_TIMELINE.md` - Schema + timeline

**Reference Materials:**
- `docs/fenceestimatepro/context/material-engine-bible.txt` - Industry formulas
- `docs/fenceestimatepro/context/deep-analysis.txt` - Pain points
- `docs/fenceestimatepro/context/pain-to-feature-map.txt` - Feature mapping

---

**Questions?** Check spec docs first, then ask in #fenceos-dev Slack channel.

**Ready to build?** Start with DB-001 in `PHASE1_EXECUTION_PLAN.md` Section 1.1.

**Let's ship Phase 1.** 🚀

