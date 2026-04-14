# Phase 1 Wood Privacy MVP - Full Execution Task Plan

**Version:** 1.0  
**Date:** April 10, 2026  
**Timeline:** 4 weeks  
**Goal:** Working wood privacy fence estimator with BOM generation

---

## EXECUTION OVERVIEW

### Success Criteria
- [ ] Generate accurate BOM for 200ft wood privacy, 6 corners, 2 walk gates
- [ ] Post count within 2% of hand calculation
- [ ] Concrete calculation within 5% of hand calculation
- [ ] Validation catches missing gate hardware (100% detection)
- [ ] Estimate generation <5 seconds
- [ ] 3 beta contractors can use system without bugs

### Non-Goals (Phase 1)
- ❌ Map-based drawing
- ❌ Satellite measurement
- ❌ Multi-material jobs
- ❌ Chain link, vinyl, aluminum
- ❌ Drive gates
- ❌ Customer-facing visual quote
- ❌ Job costing/calibration

---

## 1. TASK BREAKDOWN

### 1.1 DATABASE / SCHEMA TASKS

#### DB-001: Create Core Tables
**Title:** Implement core database schema  
**Complexity:** L (Large)

**Description:**
Create Postgres tables for Job, FenceDesign, FenceNode, FenceSection, Gate, BOM, BOMLine with proper relationships and indexes.

**Inputs:**
- Canonical data model from spec
- Supabase project connection

**Outputs:**
- SQL migration file `20260410_phase1_core_schema.sql`
- All tables created with RLS policies
- Indexes on foreign keys and query paths

**Dependencies:** None (foundation task)

**Acceptance Criteria:**
- [ ] All 7 core tables exist
- [ ] Foreign key constraints work
- [ ] RLS policies enforce org_id isolation
- [ ] Can insert/query sample data
- [ ] Indexes on: `org_id`, `job_id`, `design_id`, `bom_id`

**Implementation Notes:**
- Use UUID primary keys
- Add `created_at`, `updated_at` timestamps to all tables
- Add `deleted_at` for soft deletes (Job, FenceDesign)

---

#### DB-002: Create Configuration Tables
**Title:** Implement fence-type configuration tables  
**Complexity:** M (Medium)

**Description:**
Create tables for FenceType, PostConfig, RailConfig, PanelConfig, GateConfig, HardwareKit, HardwareItem, ConcreteRule.

**Inputs:**
- Configuration entity definitions from spec
- Wood privacy configuration data

**Outputs:**
- SQL migration file `20260410_phase1_config_schema.sql`
- Seed data file `seeds/wood_privacy_config.sql`

**Dependencies:** DB-001

**Acceptance Criteria:**
- [ ] All 8 config tables exist
- [ ] Wood privacy fence type seeded
- [ ] 4x4 and 6x6 post configs seeded
- [ ] 2x4 rail config seeded
- [ ] 1x6 picket panel config seeded
- [ ] Walk gate config seeded
- [ ] Hardware kits seeded (brackets, nails, caps)
- [ ] Concrete rules seeded (zones 1-4, normal soil)

**Seed Data Required:**
```sql
-- FenceType: wood_privacy_6ft
-- PostConfig: 4x4_line, 4x4_corner, 4x4_end, 6x6_gate
-- RailConfig: 2x4_wood (2-rail @4ft, 3-rail @6ft)
-- PanelConfig: 1x6_dogear_privacy
-- GateConfig: walk_3ft, walk_4ft
-- HardwareKit: fence_brackets, post_caps, fasteners
-- ConcreteRule: 4x4 (zones 1-4), 6x6 (zones 1-4)
```

---

### 1.2 CALCULATION ENGINE TASKS

#### CALC-001: Design Graph Builder
**Title:** Implement graph builder from user input  
**Complexity:** M

**Description:**
Convert linear footage + corner count into FenceNode[] and FenceSection[].

**Function Signature:**
```typescript
function buildDesignGraph(input: {
  total_linear_feet: number
  corner_count: number
  gate_positions: Array<{ position_ft: number, width_ft: number }>
}): {
  nodes: FenceNode[]
  sections: FenceSection[]
}
```

**Inputs:**
- Total linear feet
- Corner count
- Gate positions (position along fence, width)

**Outputs:**
- FenceNode[] with sequential positions
- FenceSection[] connecting consecutive nodes
- Each section has `length_ft` calculated

**Dependencies:** DB-001

**Acceptance Criteria:**
- [ ] Straight 100ft run → 1 section, 2 end nodes
- [ ] 100ft with 1 corner → 2 sections, 1 corner node, 2 end nodes
- [ ] 100ft with 2 gates → gate nodes at correct positions
- [ ] Node positions are sequential (0ft → total_linear_feet)
- [ ] Section lengths sum to total_linear_feet ±0.1ft

**Implementation Notes:**
- For Phase 1, distribute corners evenly if not specified
- Gate positions create nodes that split sections
- Auto-assign node types based on topology

---

#### CALC-002: Node Typer
**Title:** Classify nodes and assign post configs  
**Complexity:** S

**Description:**
Classify each FenceNode as line_post, corner_post, end_post, or gate_post and assign appropriate PostConfig.

**Function Signature:**
```typescript
function classifyAndConfigureNodes(
  nodes: FenceNode[], 
  sections: FenceSection[]
): FenceNode[] // with node_type and post_config_id populated
```

**Inputs:**
- FenceNode[] from graph builder
- FenceSection[] topology

**Outputs:**
- Each node has `node_type` assigned
- Each node has `post_config_id` assigned

**Dependencies:** CALC-001

**Acceptance Criteria:**
- [ ] Nodes with 1 connection → end_post
- [ ] Nodes with 2 linear connections → line_post
- [ ] Nodes with 2 non-linear connections → corner_post
- [ ] Nodes marked as gate → gate_post (6x6)
- [ ] All other posts → 4x4 config
- [ ] Gate posts → 6x6 config

---

#### CALC-003: Section Normalizer (Spacing Optimizer)
**Title:** Optimize post spacing per section  
**Complexity:** M

**Description:**
Calculate optimal post spacing within [6ft, 8ft] to avoid stub bays.

**Function Signature:**
```typescript
function optimizeSpacing(section: FenceSection): {
  post_spacing_ft: number
  bay_count: number
}
```

**Inputs:**
- FenceSection with `length_ft`
- Max spacing = 8ft

**Outputs:**
- `post_spacing_ft` (optimized)
- `bay_count`

**Dependencies:** CALC-001

**Acceptance Criteria:**
- [ ] 24ft section → 3 bays @ 8ft (not 3@8 + stub)
- [ ] 26ft section → 4 bays @ 6.5ft (even distribution)
- [ ] 50ft section → 7 bays @ 7.14ft
- [ ] Spacing always between 6-8ft
- [ ] BLOCK if spacing would be <6ft
- [ ] BLOCK if spacing would be >8ft

**Algorithm:**
```typescript
const maxSpacing = 8
const bayCount = Math.ceil(length_ft / maxSpacing)
const spacing = length_ft / bayCount
if (spacing < 6) throw ValidationError('Section too short for min spacing')
if (spacing > 8) throw ValidationError('Section too long - add intermediate post')
```

---

#### CALC-004: Wood Post Calculator
**Title:** Calculate posts per section  
**Complexity:** S

**Description:**
Count posts per section, handling shared nodes at corners.

**Function Signature:**
```typescript
function calculatePosts(
  sections: FenceSection[],
  nodes: FenceNode[]
): PostCalculation
```

**Inputs:**
- FenceSection[] with bay_count
- FenceNode[] with node_type

**Outputs:**
```typescript
{
  posts_by_type: {
    line_4x4: number
    corner_4x4: number
    end_4x4: number
    gate_6x6: number
  }
  total_posts: number
  shared_nodes: UUID[]  // Nodes counted only once
}
```

**Dependencies:** CALC-002, CALC-003

**Acceptance Criteria:**
- [ ] 3 bays → 4 posts per run (includes both ends)
- [ ] Corner nodes counted once, not twice
- [ ] Gate posts separate from line posts
- [ ] Total = sum of unique nodes across all sections

---

#### CALC-005: Wood Rail Calculator
**Title:** Calculate rails per section  
**Complexity:** S

**Description:**
Calculate rail quantity based on height and bay count.

**Function Signature:**
```typescript
function calculateRails(section: FenceSection): RailCalculation
```

**Inputs:**
- FenceSection with `height_ft`, `bay_count`

**Outputs:**
```typescript
{
  rails_per_bay: number  // 2 for 4ft, 3 for 6ft
  total_rails: number
  rail_length_ft: number  // 8 or 10
  waste_factor: number
}
```

**Dependencies:** CALC-003

**Acceptance Criteria:**
- [ ] 4ft fence → 2 rails/bay
- [ ] 6ft fence → 3 rails/bay
- [ ] 10 bays @ 6ft → 30 total rails
- [ ] Spacing 6-7ft → use 8ft rails
- [ ] Spacing 7-8ft → use 10ft rails (if available)
- [ ] Waste calculated from (rail_length - spacing)

---

#### CALC-006: Wood Picket Calculator
**Title:** Calculate pickets per section  
**Complexity:** M

**Description:**
Calculate picket quantity with waste from cuts and defects.

**Function Signature:**
```typescript
function calculatePickets(
  section: FenceSection,
  style: 'privacy' | 'semi_privacy' | 'board_on_board'
): PicketCalculation
```

**Inputs:**
- FenceSection with `bay_count`, `post_spacing_ft`
- Style (privacy for Phase 1)

**Outputs:**
```typescript
{
  pickets_per_bay: number
  raw_quantity: number
  waste_factor: number
  order_quantity: number
}
```

**Dependencies:** CALC-003

**Acceptance Criteria:**
- [ ] 8ft bay (96") / 5.5" picket = 18 pickets/bay (privacy)
- [ ] 6.5ft bay → 15 pickets/bay
- [ ] Base waste = 2% (defect rate)
- [ ] Waste increased by corners (if non-90°)
- [ ] Order quantity = raw × (1 + waste_factor)

**Waste Calculation:**
```typescript
let waste = 0.02  // 2% base
// Corner waste (Phase 1: assume 90° only, skip this)
// Defect waste already in base
return waste
```

---

#### CALC-007: Concrete Calculator
**Title:** Calculate concrete bags per post  
**Complexity:** M

**Description:**
Volumetric concrete calculation per post with frost zone adjustment.

**Function Signature:**
```typescript
function calculateConcrete(
  posts: Post[],
  frostZone: number,
  soilType: 'normal' | 'sandy' | 'clay' | 'rocky'
): ConcreteCalculation
```

**Inputs:**
- Post[] with types
- Frost zone (1-4)
- Soil type

**Outputs:**
```typescript
{
  bags_per_post: Array<{ post_id: UUID, bags: number }>
  total_bags: number  // with 5% overage
  calculation_notes: string
}
```

**Dependencies:** CALC-004

**Acceptance Criteria:**
- [ ] 4x4 post, zone 2, normal soil → 3 bags
- [ ] 6x6 post, zone 2, normal soil → 4 bags
- [ ] Zone 3 (36" depth) → more bags than zone 2 (30")
- [ ] Sandy soil → +2" diameter → +0.5 bags/post
- [ ] Total includes 5% overage

**Formula:**
```typescript
const holeDiameter = postSize === '6x6' ? 12 : 10  // inches
const holeDepth = getFrostDepth(zone) + 6  // +6" below frost
const holeVolume = Math.PI * (holeDiameter/2)² * holeDepth / 1728  // cu.ft
const postVolume = (actualSize)² * holeDepth / 1728
const concreteVolume = holeVolume - postVolume
const bags = Math.ceil(concreteVolume / 0.6)  // 80lb = 0.6 cu.ft
```

**Frost Depths:**
- Zone 1: 18"
- Zone 2: 30"
- Zone 3: 36"
- Zone 4: 48"

---

#### CALC-008: Gate Hardware Resolver
**Title:** Generate complete gate BOM  
**Complexity:** M

**Description:**
Resolve all gate hardware from gate configuration.

**Function Signature:**
```typescript
function resolveGateHardware(gate: Gate): BOMLine[]
```

**Inputs:**
- Gate with `gate_type`, `width_ft`, `height_ft`

**Outputs:**
- BOMLine[] with frame, hinges, latch, wheel (if needed)

**Dependencies:** DB-002

**Acceptance Criteria:**
- [ ] Walk 3ft gate → metal frame kit, 2 hinges, 1 latch
- [ ] Walk 4ft gate → metal frame kit, 2 hinges, 1 latch
- [ ] Gate >6ft → add wheel kit
- [ ] Pickets calculated for gate fill (width / 5.5")
- [ ] All BOM lines have category, description, quantity

**Gate BOM Structure:**
```typescript
[
  { category: 'gate', description: '3ft metal gate frame kit', qty: 1 },
  { category: 'hardware', description: 'Heavy-duty T-hinge', qty: 2 },
  { category: 'hardware', description: 'Gravity latch', qty: 1 },
  { category: 'picket', description: '1x6x6 dog-ear (gate fill)', qty: 7 }
]
```

---

#### CALC-009: BOM Assembler
**Title:** Aggregate all calculations into unified BOM  
**Complexity:** L

**Description:**
Combine posts, rails, pickets, concrete, gates, hardware into single BOM with aggregation and insurance quantities.

**Function Signature:**
```typescript
function assembleBOM(calculations: {
  posts: PostCalculation
  rails: RailCalculation
  pickets: PicketCalculation
  concrete: ConcreteCalculation
  gates: BOMLine[]
  hardware: BOMLine[]
}): BOM
```

**Inputs:**
- All calculation outputs

**Outputs:**
- BOM with BOMLine[] sorted by category
- Each line has: category, description, raw_qty, insurance_qty, order_qty, calculation_notes

**Dependencies:** CALC-004 through CALC-008

**Acceptance Criteria:**
- [ ] Posts aggregated by type (4x4 line, 4x4 corner, 6x6 gate)
- [ ] Insurance: +2 posts always
- [ ] Rails aggregated by length
- [ ] Pickets: single line with total
- [ ] Concrete: single line with total bags
- [ ] Gates: all hardware included
- [ ] Hardware: fence brackets (12/bay), nails (box), post caps (1/post)
- [ ] calculation_notes shows breakdown: "20 line + 2 corner + 2 end + 2 insurance = 26"

**Aggregation Logic:**
```typescript
// Group posts by config
const posts_4x4 = filter(posts, size='4x4')
const posts_6x6 = filter(posts, size='6x6')

bomLines.push({
  category: 'post',
  description: '4x4x8\' PT Post',
  raw_quantity: posts_4x4.length,
  insurance_quantity: 2,
  order_quantity: posts_4x4.length + 2,
  calculation_notes: `${line_count} line + ${corner_count} corner + ${end_count} end + 2 insurance`
})
```

---

### 1.3 VALIDATION SYSTEM TASKS

#### VAL-001: Validation Engine Core
**Title:** Build validation execution framework  
**Complexity:** M

**Description:**
Create validation engine that runs BLOCK and WARN rules, collects errors/warnings, determines if estimate can proceed.

**Function Signature:**
```typescript
function validateEstimate(
  design: FenceDesign,
  bom: BOM
): ValidationResult
```

**Inputs:**
- FenceDesign (complete graph)
- BOM (generated)

**Outputs:**
```typescript
{
  errors: ValidationError[]     // BLOCK severity
  warnings: ValidationWarning[] // WARN severity
  canProceed: boolean           // false if any errors
  blockers: number
  alerts: number
}
```

**Dependencies:** CALC-009

**Acceptance Criteria:**
- [ ] Runs all BLOCK rules first
- [ ] If BLOCK errors exist, returns immediately with canProceed=false
- [ ] Runs WARN rules if no BLOCK errors
- [ ] Each error/warning has: rule_id, message, severity, field
- [ ] Execution order documented

---

#### VAL-002: BLOCK Rules Implementation
**Title:** Implement critical validation rules  
**Complexity:** M

**Description:**
Implement 8 Phase 1 BLOCK rules that prevent impossible states.

**Rules to Implement:**
1. `HARDWARE_001`: Gates without hinges
2. `HARDWARE_002`: Gates without latches
3. `SPACING_001`: Wood spacing >8ft
4. `GATE_004`: Drive gate on 4x4 posts (N/A Phase 1 - walk only)
5. `CONCRETE_001`: Posts but no concrete
6. `BOM_001`: BOM post count ≠ graph node count
7. `BOM_002`: Rail count ≠ bay count × rails/bay
8. `PRICING_001`: Material cost = $0

**Inputs:**
- FenceDesign
- BOM

**Outputs:**
- ValidationError[] with rule violations

**Dependencies:** VAL-001

**Acceptance Criteria:**
- [ ] Each rule is a pure function: `(design, bom) => ValidationError | null`
- [ ] Rule violations return: `{ rule_id, message, severity: 'BLOCK', field }`
- [ ] Test cases for each rule (pass and fail scenarios)

**Example Implementation:**
```typescript
function validateGateHinges(design: FenceDesign, bom: BOM): ValidationError | null {
  const gateCount = design.gates.length
  const hingeLines = bom.lines.filter(l => l.description.includes('hinge'))
  const totalHinges = sum(hingeLines.map(l => l.order_quantity))
  
  if (gateCount > 0 && totalHinges === 0) {
    return {
      rule_id: 'HARDWARE_001',
      message: `${gateCount} gates configured but no gate hinges in BOM. Calculation error.`,
      severity: 'BLOCK',
      field: 'gates'
    }
  }
  
  return null
}
```

---

#### VAL-003: WARN Rules Implementation
**Title:** Implement warning validation rules  
**Complexity:** S

**Description:**
Implement 5 Phase 1 WARN rules for best-practice alerts.

**Rules to Implement:**
1. `POST_001`: Walk gate on 4x4 posts (recommend 6x6)
2. `POST_002`: 6ft fence with <3 rails
3. `GATE_101`: Gate >6ft without wheel kit
4. `CONCRETE_101`: Frost zone ≥3 with depth <36"
5. `CONCRETE_102`: Concrete <1.5 bags/post average

**Inputs:**
- FenceDesign
- BOM

**Outputs:**
- ValidationWarning[]

**Dependencies:** VAL-001

**Acceptance Criteria:**
- [ ] Each rule returns: `{ rule_id, message, severity: 'WARN', recommendation }`
- [ ] Warnings don't prevent quote generation
- [ ] Warnings shown to user for review

---

### 1.4 API LAYER TASKS

#### API-001: Job Management Endpoints
**Title:** Create job CRUD endpoints  
**Complexity:** S

**Inputs:**
- None (foundation)

**Outputs:**
```typescript
POST   /api/jobs              // Create new job
GET    /api/jobs/:id          // Get job details
PATCH  /api/jobs/:id          // Update job metadata
DELETE /api/jobs/:id          // Soft delete job
```

**Dependencies:** DB-001

**Acceptance Criteria:**
- [ ] All endpoints enforce org_id via RLS
- [ ] POST returns job_id
- [ ] GET returns job with nested design if exists
- [ ] PATCH only updates allowed fields (address, notes, status)
- [ ] DELETE sets deleted_at timestamp

---

#### API-002: Design Management Endpoints
**Title:** Create design CRUD endpoints  
**Complexity:** M

**Inputs:**
- Job ID

**Outputs:**
```typescript
POST   /api/jobs/:job_id/design       // Create/update design
GET    /api/designs/:design_id        // Get design with nodes/sections
```

**Dependencies:** DB-001, CALC-001

**Acceptance Criteria:**
- [ ] POST accepts: `{ total_linear_feet, corner_count, height_ft, gates: [] }`
- [ ] POST calls design graph builder
- [ ] POST saves nodes + sections to DB
- [ ] GET returns complete graph (nodes, sections, gates)
- [ ] Returns design_id for estimation

---

#### API-003: Estimate Generation Endpoint
**Title:** Run estimation calculation  
**Complexity:** L

**Inputs:**
- Design ID

**Outputs:**
```typescript
POST /api/designs/:design_id/estimate
→ {
  bom: BOM
  validation: ValidationResult
  pricing: PricingSummary
  execution_time_ms: number
}
```

**Dependencies:** CALC-001 through CALC-009, VAL-001

**Acceptance Criteria:**
- [ ] Executes full calculation pipeline
- [ ] Returns validation errors if BLOCK rules fail
- [ ] Returns BOM if validation passes
- [ ] Execution time <5 seconds for standard job
- [ ] Locks BOM after generation (prevents recalc)
- [ ] Creates audit log

**Execution Flow:**
```typescript
1. Load design from DB
2. Run node typer
3. Run section normalizer
4. Run material calculations (posts, rails, pickets, concrete, gates)
5. Assemble BOM
6. Run validation
7. If validation.canProceed:
     - Save BOM to DB
     - Calculate pricing
     - Return complete result
   Else:
     - Return validation errors only
```

---

#### API-004: BOM Retrieval Endpoint
**Title:** Get BOM for design  
**Complexity:** S

**Inputs:**
- Design ID

**Outputs:**
```typescript
GET /api/designs/:design_id/bom
→ BOM with BOMLine[]
```

**Dependencies:** API-003

**Acceptance Criteria:**
- [ ] Returns most recent BOM for design
- [ ] Returns 404 if no BOM exists
- [ ] Returns locked BOMs (no recalculation)
- [ ] Includes calculation_notes per line

---

### 1.5 UI LAYER TASKS (MINIMAL)

#### UI-001: Estimate Input Form
**Title:** Create mobile-first input form  
**Complexity:** M

**Description:**
Single-page form for entering job parameters.

**Form Fields:**
- Total Linear Feet (number input)
- Corner Count (number input, default 0)
- Fence Height (select: 4ft, 6ft)
- Gate Count (number input, default 0)
- Gate Widths (array of selects: 3ft, 4ft per gate)
- Material (select: PT Pine, Cedar) - pricing only
- Frost Zone (auto from zip, override select 1-4)

**Outputs:**
- Calls API-002 to create design
- Calls API-003 to run estimation
- Shows loading state during calculation

**Dependencies:** API-002, API-003

**Acceptance Criteria:**
- [ ] Works on mobile (320px width)
- [ ] All fields have labels and validation
- [ ] Submit button disabled while loading
- [ ] Error messages shown inline
- [ ] Redirects to results on success

---

#### UI-002: BOM Results Display
**Title:** Display BOM and pricing  
**Complexity:** M

**Description:**
Show BOM grouped by category with pricing summary.

**Display Sections:**
1. **Validation Status**
   - Errors (red, BLOCK)
   - Warnings (yellow, alert)

2. **BOM Table**
   - Grouped by category (Posts, Rails, Pickets, Concrete, Gates, Hardware)
   - Columns: Description, Quantity, Unit Price, Extended Price
   - Show calculation_notes on hover/expand

3. **Pricing Summary**
   - Material Cost
   - Labor Cost (placeholder for Phase 1)
   - Subtotal
   - Good/Better/Best tiers (simple cards)

**Dependencies:** API-003, API-004

**Acceptance Criteria:**
- [ ] Mobile-responsive table
- [ ] Categories collapsible
- [ ] Pricing tiers displayed as cards
- [ ] Print-friendly layout
- [ ] Copy BOM to clipboard button

---

### 1.6 TESTING TASKS

#### TEST-001: Unit Tests - Calculations
**Title:** Write calculation unit tests  
**Complexity:** M

**Test Coverage:**
- `calculatePosts()`: straight run, corners, gates, shared nodes
- `calculateRails()`: 4ft fence (2-rail), 6ft fence (3-rail)
- `calculatePickets()`: privacy style, waste factors
- `calculateConcrete()`: zones 1-4, 4x4 vs 6x6, soil types
- `resolveGateHardware()`: 3ft gate, 4ft gate, >6ft gate with wheel

**Dependencies:** CALC-004 through CALC-008

**Acceptance Criteria:**
- [ ] 100% coverage of calculation functions
- [ ] Edge cases tested (0 corners, 10 corners, 0 gates, 5 gates)
- [ ] Rounding tested (24.7ft → how many posts?)
- [ ] All tests pass

**Sample Test Cases:**
```typescript
describe('calculatePosts', () => {
  test('straight 24ft run, no gates', () => {
    // 24ft / 8ft max = 3 bays = 4 posts (2 ends + 2 interior)
    const result = calculatePosts(...)
    expect(result.total_posts).toBe(4)
    expect(result.posts_by_type.end_4x4).toBe(2)
    expect(result.posts_by_type.line_4x4).toBe(2)
  })
  
  test('26ft run optimizes to 4 bays @ 6.5ft', () => {
    const result = calculatePosts(...)
    expect(result.post_spacing_ft).toBe(6.5)
    expect(result.bay_count).toBe(4)
    expect(result.total_posts).toBe(5)
  })
})
```

---

#### TEST-002: Unit Tests - Validation
**Title:** Write validation rule tests  
**Complexity:** S

**Test Coverage:**
- Each BLOCK rule with pass/fail scenarios
- Each WARN rule with pass/fail scenarios
- Validation engine execution order

**Dependencies:** VAL-002, VAL-003

**Acceptance Criteria:**
- [ ] Each rule has 2+ test cases
- [ ] BLOCK rules prevent proceeding
- [ ] WARN rules allow proceeding
- [ ] Error messages are clear

---

#### TEST-003: Integration Tests - Full Pipeline
**Title:** End-to-end estimation tests  
**Complexity:** M

**Test Scenarios:**
1. **Simple Straight Run**
   - 100ft, 0 corners, 0 gates, 6ft height
   - Expected: 13 posts, 39 rails, ~230 pickets, 39 bags concrete

2. **Multi-Corner Job**
   - 200ft, 6 corners, 0 gates, 6ft height
   - Expected: Shared corner nodes, correct post count

3. **Job with Gates**
   - 150ft, 2 corners, 2 walk gates (3ft, 4ft), 6ft height
   - Expected: 4 gate posts (6x6), gate hardware complete

4. **Edge Case: Very Short Run**
   - 18ft, 0 corners, 0 gates, 6ft height
   - Expected: 3 bays @ 6ft spacing

5. **Edge Case: Spacing Validation**
   - 5ft run → should BLOCK (spacing would be <6ft)

**Dependencies:** API-003

**Acceptance Criteria:**
- [ ] All 5 scenarios generate valid BOMs
- [ ] BOM accuracy within 5% of hand calculation
- [ ] Execution time <5 seconds
- [ ] Validation catches impossible states

---

#### TEST-004: Sample Job Data
**Title:** Create realistic test jobs  
**Complexity:** S

**Description:**
Hand-calculate BOMs for 3 jobs to use as ground truth.

**Jobs:**
1. **Residential Backyard** - 180ft, 4 corners (90°), 1 walk gate (4ft), 6ft PT pine
2. **Side Yard Simple** - 60ft straight run, 0 corners, 0 gates, 6ft cedar
3. **Complex Layout** - 240ft, 8 corners, 2 walk gates (3ft, 4ft), 6ft PT pine

**Outputs:**
- Hand-calculated BOMs (Excel spreadsheet)
- SQL seed data for test database
- Expected results for assertions

**Dependencies:** None

**Acceptance Criteria:**
- [ ] Hand calculations match industry standards
- [ ] SQL inserts create jobs in test DB
- [ ] Used in TEST-003

---

