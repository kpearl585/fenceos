# Validation Rules & Runtime Flow

## 5. VALIDATION RULE MATRIX

### 5.1 BLOCK Rules (Prevents Quote Generation)

| Rule ID | Condition | Message | Recommended Action |
|---------|-----------|---------|-------------------|
| **HARDWARE_001** | `gate_count > 0 AND gate_hinges == 0` | "2 gates configured but no gate hinges in BOM. Calculation error." | Add hinges to gate config |
| **HARDWARE_002** | `gate_count > 0 AND gate_latches == 0` | "2 gates configured but no latches in BOM." | Add latches to gate config |
| **HARDWARE_003** | `chain_link AND terminal_posts > 0 AND tension_bars == 0` | "Chain link has 6 terminal posts but 0 tension bars. Cannot install without tension system." | Add tension hardware |
| **HARDWARE_004** | `chain_link AND terminal_posts > 0 AND tension_bands < (height_ft - 1) * terminal_posts` | "Chain link 6' fence needs 5 tension bands per terminal. BOM has 12 but needs 25." | Recalculate tension bands |
| **HARDWARE_005** | `chain_link AND line_posts > 0 AND loop_caps == 0` | "Chain link has 18 line posts but 0 loop caps. Top rail cannot be installed." | Add loop caps |
| **HARDWARE_006** | `vinyl AND gate_posts > 0 AND aluminum_inserts < gate_posts` | "Vinyl gate posts require aluminum inserts. 2 gate posts but 0 inserts." | Add aluminum inserts |
| **SPACING_001** | `wood AND post_spacing_ft > 8` | "Post spacing 9.2ft exceeds max 8ft. Rails will sag." | Reduce spacing or add posts |
| **SPACING_002** | `vinyl AND post_spacing_ft != panel_width_ft` | "Vinyl panels are 6ft but posts spaced at 7.5ft. Panels won't fit." | Adjust spacing to match panel width |
| **SPACING_003** | `post_spacing_ft < 4` | "Post spacing 3.2ft is unusually close. Verify design." | Check measurement |
| **GATE_001** | `double_drive AND no drop_rod` | "Double drive gate missing drop rod. One leaf cannot be secured." | Add drop rod |
| **GATE_002** | `pool_code AND NOT self_closing` | "Pool code requires self-closing gate hardware. Current config is standard." | Upgrade to self-closing hinges |
| **GATE_003** | `pool_code AND latch_height < 54` | "Pool code requires latch ≥54 inches from ground. Current: 48in." | Reposition latch or upgrade hardware |
| **GATE_004** | `double_drive AND post_size < '6x6'` | "Double drive gate requires 6x6 minimum posts. Current: 4x4." | Upgrade gate posts |
| **CONCRETE_001** | `post_count > 0 AND concrete_bags == 0` | "24 posts configured but 0 concrete bags. Posts cannot be set." | Recalculate concrete |
| **BOM_001** | `bom_post_count != graph_node_count` | "BOM has 26 posts but design graph has 24 nodes. Mismatch." | Rebuild BOM from graph |
| **BOM_002** | `total_rails != total_bays * rails_per_bay` | "Design has 20 bays × 3 rails = 60 rails. BOM shows 54." | Recalculate rails |
| **SKU_001** | `ANY line has sku == 'MANUAL_RESOLVE_REQUIRED'` | "3 BOM lines could not be resolved to supplier SKUs. Manual resolution required." | Review unresolved SKUs |
| **PRICING_001** | `total_material_cost == 0` | "Material cost is $0. BOM likely incomplete." | Regenerate BOM with pricing |

---

### 5.2 WARN Rules (Shows Alert, Allows Quote)

| Rule ID | Condition | Message | Recommended Action |
|---------|-----------|---------|-------------------|
| **POST_001** | `walk_gate AND post_size == '4x4'` | "Walk gate on 4x4 posts. 6x6 recommended for stability." | Consider upgrading posts |
| **POST_002** | `wood AND height >= 6 AND rails < 3` | "6ft wood fence with only 2 rails. 3 rails recommended." | Add middle rail |
| **GATE_101** | `gate_width_ft > 6 AND no_wheel_kit` | "Gate is 8ft wide without wheel kit. Will likely sag and drag." | Add wheel kit |
| **GATE_102** | `single_drive AND width_ft > 10` | "12ft single drive gate. Double drive recommended for gates >10ft." | Consider double drive |
| **CONCRETE_101** | `frost_zone >= 3 AND depth < 36` | "Frost zone 3 requires min 36in depth. Current: 30in. Posts may heave in winter." | Increase depth to 36in |
| **CONCRETE_102** | `concrete_per_post < 1.5` | "Averaging 1.2 bags per post. May not provide adequate stability." | Review hole dimensions |
| **CONCRETE_103** | `sandy_soil AND hole_diameter < 12` | "Sandy soil with 10in holes. 12in diameter recommended for stability." | Increase hole diameter |
| **WASTE_101** | `picket_waste_factor > 0.15` | "Picket waste is 17%. Unusually high — verify design complexity." | Review corner/terrain calculations |
| **PRICE_101** | `price_per_lf < avg_price_per_lf * 0.5` | "Price $18/ft is 55% below your average of $40/ft. Verify pricing." | Check for calculation error |
| **PRICE_102** | `price_per_lf > avg_price_per_lf * 1.5` | "Price $68/ft is 70% above your average of $40/ft." | Verify justified (terrain, gates, etc.) |
| **PRICE_103** | `material_cost / total_price > 0.60` | "Material is 64% of total price. Unusually high." | Check margin calculation |
| **CALIBRATION_101** | `job_count > 20 AND concrete_variance > 0.12` | "Over 20 jobs, your concrete estimates have been 15% low. Recommend adjusting default." | Increase concrete per post |
| **CALIBRATION_102** | `job_count > 20 AND labor_variance > 0.15` | "Labor estimates are 18% low on average. Crews taking longer than estimated." | Adjust production rates |
| **STOCK_101** | `supplier_item.in_stock == false` | "Cedar 4x4x8 posts are out of stock at primary supplier." | Check alternate suppliers |
| **PRICING_101** | `price_last_updated > 30_days` | "Cedar pricing hasn't been updated in 45 days. Verify current prices." | Re-sync supplier catalog |

---

### 5.3 Validation Execution Order

```typescript
function validateEstimate(design: FenceDesign, bom: BOM): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  
  // LAYER 1: Input Validation (before calculation)
  errors.push(...validateInputs(design))
  if (errors.length > 0) return { errors, warnings, canProceed: false }
  
  // LAYER 2: Calculation Verification (after BOM generation)
  errors.push(...validateCalculations(design, bom))
  warnings.push(...detectAnomalies(design, bom))
  
  // LAYER 3: Impossible State Detection
  errors.push(...detectImpossibleStates(bom))
  
  // LAYER 4: Cross-Validation (BOM vs Design)
  errors.push(...crossValidate(design, bom))
  
  // LAYER 5: Pricing & Anomaly Detection
  warnings.push(...detectPricingAnomalies(bom))
  warnings.push(...detectCalibrationDrift(bom))
  
  // LAYER 6: Stock & Freshness Checks
  warnings.push(...checkStockAvailability(bom))
  warnings.push(...checkPriceFreshness(bom))
  
  return {
    errors,
    warnings,
    canProceed: errors.length === 0,
    blockers: errors.length,
    alerts: warnings.length
  }
}
```

---

## 6. ESTIMATOR RUNTIME FLOW

### 6.1 End-to-End Execution Sequence

```
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 1: User Input Collection                                      │
├─────────────────────────────────────────────────────────────────────┤
│ Required:                                                           │
│  • Total linear feet OR drawn fence line (lat/lng points)          │
│  • Fence type (wood, vinyl, chain link, aluminum, steel, composite)│
│  • Height                                                           │
│  • Gate count + types (walk, drive, double drive)                  │
│                                                                     │
│ Optional:                                                           │
│  • Terrain (flat, slight, moderate, steep)                         │
│  • Soil type (normal, clay, sandy, rocky)                          │
│  • Corner count + angles                                           │
│  • Per-section material assignments (mixed jobs)                   │
│  • Stain/finish preferences                                        │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 2: Design Graph Creation                                      │
├─────────────────────────────────────────────────────────────────────┤
│ Module: Design Graph Builder                                       │
│                                                                     │
│ Actions:                                                            │
│  1. Create FenceNode[] from drawn points or auto-generate          │
│  2. Calculate distances between consecutive nodes                  │
│  3. Derive elevation from terrain data (topographic API)           │
│  4. Create FenceSection[] connecting nodes                         │
│  5. Calculate corner angles from geometry                          │
│                                                                     │
│ Output:                                                             │
│  • FenceDesign with nodes[], sections[], total_linear_feet         │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 3: Node Typing                                                │
├─────────────────────────────────────────────────────────────────────┤
│ Module: Node Typer                                                 │
│                                                                     │
│ Actions:                                                            │
│  1. Classify each node: line_post, corner_post, end_post, gate_post│
│  2. Assign PostConfig per node type                                │
│  3. Tag gate posts for gate resolver                               │
│                                                                     │
│ Output:                                                             │
│  • Each FenceNode has node_type + PostConfig                       │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 4: Section Normalization                                      │
├─────────────────────────────────────────────────────────────────────┤
│ Module: Section Normalizer                                         │
│                                                                     │
│ Actions:                                                            │
│  1. Optimize post spacing per section (avoid stub bays)            │
│  2. Calculate bay_count per section                                │
│  3. Validate spacing within fence type constraints                 │
│  4. Flag sections that need custom panels (vinyl/aluminum)         │
│                                                                     │
│ Output:                                                             │
│  • Each FenceSection has post_spacing_ft + bay_count               │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 5: Per-Section Material Calculation                           │
├─────────────────────────────────────────────────────────────────────┤
│ Modules: Fence-Type-Specific Modules (wood, vinyl, chain_link...)  │
│                                                                     │
│ Actions (per section):                                              │
│  1. Calculate posts (count + type)                                 │
│  2. Calculate rails/panels                                         │
│  3. Calculate pickets/fabric (if applicable)                       │
│  4. Calculate hardware kits                                        │
│  5. Apply waste factors from Waste Engine                          │
│                                                                     │
│ Output:                                                             │
│  • Raw BOM lines per section (not yet aggregated)                  │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 6: Gate Resolution                                            │
├─────────────────────────────────────────────────────────────────────┤
│ Module: Gate Resolver                                              │
│                                                                     │
│ Actions (per gate):                                                 │
│  1. Traverse gate requirement tree (type × width × hardware level) │
│  2. Generate frame BOM line                                        │
│  3. Generate hinge BOM lines (count depends on width)              │
│  4. Generate latch BOM line                                        │
│  5. Add conditional hardware: wheel, drop rod, cane bolt, anti-sag │
│  6. Validate pool code compliance if required                      │
│                                                                     │
│ Output:                                                             │
│  • Complete gate BOM lines (impossible to forget hinges/latch)     │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 7: Concrete Calculation                                       │
├─────────────────────────────────────────────────────────────────────┤
│ Module: Concrete Engine                                            │
│                                                                     │
│ Actions (per post):                                                 │
│  1. Get ConcreteRule for (post_type × frost_zone × soil_type)      │
│  2. Calculate hole volume: πr²h                                    │
│  3. Subtract post displacement                                     │
│  4. Convert to 80lb bags (0.6 cu.ft. per bag)                      │
│  5. Sum all posts + 5% overage                                     │
│                                                                     │
│ Output:                                                             │
│  • Concrete BOM line with per-post breakdown in notes              │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 8: BOM Assembly                                               │
├─────────────────────────────────────────────────────────────────────┤
│ Module: BOM Assembler                                              │
│                                                                     │
│ Actions:                                                            │
│  1. Aggregate all section BOM lines by SKU template                │
│  2. Add insurance quantities (extra posts, etc.)                   │
│  3. Sequence lines by category (posts → rails → panels → gates...) │
│  4. Generate calculation_notes for each line                       │
│  5. Calculate raw totals (before pricing)                          │
│                                                                     │
│ Output:                                                             │
│  • Unified BOM with BOMLine[] (SKUs not yet resolved)              │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 9: Validation Pass                                            │
├─────────────────────────────────────────────────────────────────────┤
│ Module: Validation Engine                                          │
│                                                                     │
│ Actions:                                                            │
│  1. Run all BLOCK rules                                            │
│  2. If any BLOCK errors → STOP, show errors, prevent quote         │
│  3. Run all WARN rules                                             │
│  4. Collect warnings for user review                               │
│  5. Log validation results to audit trail                          │
│                                                                     │
│ Output:                                                             │
│  • ValidationResult { errors[], warnings[], canProceed }           │
│  • If canProceed = false → user must fix blockers                  │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 10: SKU Resolution                                            │
├─────────────────────────────────────────────────────────────────────┤
│ Module: SKU Resolver                                               │
│                                                                     │
│ Actions (per BOM line):                                             │
│  1. Parse sku_template → search params                             │
│  2. Search SupplierCatalog for matches                             │
│  3. Filter: in_stock = true, fence_type compatible                 │
│  4. Prefer: user's primary supplier, then lowest price             │
│  5. If no match → flag for manual resolution                       │
│  6. Attach resolved: sku, unit_price, supplier_id                  │
│                                                                     │
│ Output:                                                             │
│  • BOM with all lines priced (or flagged if unresolved)            │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 11: Pricing Summary                                           │
├─────────────────────────────────────────────────────────────────────┤
│ Module: Pricing Engine                                             │
│                                                                     │
│ Actions:                                                            │
│  1. Calculate labor hours from calibrated production rates         │
│  2. Calculate labor cost (hours × hourly_rate)                     │
│  3. Calculate overhead (material + labor) × overhead_pct           │
│  4. Calculate subtotal                                             │
│  5. Generate Good/Better/Best tiers at different margins           │
│  6. Calculate price-per-foot                                       │
│                                                                     │
│ Output:                                                             │
│  • PricingSummary with 3 tiers + breakdown                         │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 12: Quote-Ready Output                                        │
├─────────────────────────────────────────────────────────────────────┤
│ Customer-Facing:                                                    │
│  • Branded PDF with property diagram                               │
│  • Good/Better/Best pricing cards                                  │
│  • Material photos and descriptions                                │
│  • Scope inclusions/exclusions                                     │
│  • Digital signature + deposit payment link                        │
│  • Financing option ("Or $189/month")                              │
│                                                                     │
│ Internal Documents:                                                 │
│  • Full BOM with SKUs ready for supplier PO                        │
│  • Crew work order with task breakdown                             │
│  • Job P&L projection                                              │
│  • Calculation audit trail                                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 6.2 Override Points

Users can override calculated values at these stages:

| Stage | Override Type | Use Case |
|-------|---------------|----------|
| **Step 4** | Override post spacing | Contractor knows specific spacing needed |
| **Step 5** | Override waste factor | Experienced crew has lower waste |
| **Step 7** | Override concrete bags | Rocky soil requires foam fill instead |
| **Step 10** | Override SKU | Prefer specific brand/supplier |
| **Step 11** | Override labor hours | Job has special circumstances |
| **Step 11** | Override margin | Strategic pricing for key customer |

**Important:** All overrides are logged with:
- Original calculated value
- New override value
- User who made override
- Timestamp
- Optional reason

**Warning System:**
```typescript
if (override_value differs from calculated by >15%) {
  showWarning(`Override detected: concrete changed from 82 to 70 bags. 
               This reduces per-post average from 2.85 to 2.43. 
               Are you sure?`)
}
```

---

### 6.3 Dependency Order

**Sequential (must wait):**
1. Graph Builder → Node Typer (need nodes before typing them)
2. Node Typer → Section Normalizer (need typed nodes to optimize spacing)
3. Section Normalizer → Material Calculation (need spacing to calculate quantities)
4. Material Calculation → BOM Assembly (need all parts before aggregating)
5. BOM Assembly → Validation (need complete BOM to validate)
6. Validation → SKU Resolution (only resolve if validation passes)
7. SKU Resolution → Pricing (need prices to calculate totals)

**Parallel (can run concurrently):**
- Per-section material calculations (wood section 1, vinyl section 2 — independent)
- Gate resolution (each gate independent)
- Concrete per post (independent calculations)
- Waste calculation per category (rails separate from pickets)

---

### 6.4 Audit Trail

Every estimate execution creates an audit record:

```typescript
AuditLog {
  estimate_id: UUID
  timestamp: timestamp
  
  execution_time_ms: {
    graph_build: 120,
    node_type: 35,
    normalize: 28,
    material_calc: 450,
    waste_engine: 67,
    concrete_calc: 89,
    gate_resolve: 145,
    bom_assembly: 210,
    validation: 88,
    sku_resolution: 567,
    pricing: 42,
    total: 1841  // 1.8 seconds
  },
  
  validation_results: {
    errors: [],
    warnings: [
      { rule: 'PRICE_101', message: '...' }
    ]
  },
  
  overrides: [
    {
      field: 'concrete_bags',
      original: 82,
      override: 70,
      user: 'mike@company.com',
      reason: 'Rocky soil — using foam fill'
    }
  ],
  
  calculation_version: '2.3.1',
  catalog_version: 'supplier_abc_2026-04-05'
}
```

---

