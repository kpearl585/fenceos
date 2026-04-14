# Advanced Fence Estimator — Build-Ready Implementation Specification

**Version:** 1.0  
**Date:** April 10, 2026  
**Audience:** Engineering Team  
**Purpose:** Translate research into executable technical plan

---

## 1. EXECUTIVE SUMMARY

### Mission
Build a rules-driven, graph-based fence estimation engine that generates install-trustworthy BOMs, validates common jobsite failures before they happen, and produces quote-ready pricing output with zero manual calculation.

### Core Principle
**Every BOM line is traceable to a calculation rule.** No guesses. No "standard" waste factors. No forgotten hardware.

### Technical Approach
- **Graph-based design representation**: Nodes = posts, edges = fence runs
- **Modular calculation services**: Not one giant function — 10+ discrete engines
- **Fence-type-specific rule modules**: Wood ≠ vinyl ≠ chain link — separate logic
- **Validation-first architecture**: Block impossible states at generation time
- **Calibration loop**: System learns from actuals, improves over time

### Success Metrics
- **Material accuracy**: <3% variance estimated vs. actual after 20 jobs
- **Zero forgotten items**: Gate hardware, concrete, fasteners — impossible to miss
- **Quote generation time**: <5 minutes for standard residential job
- **Close rate improvement**: +15-25% via Good/Better/Best + visual quotes
- **Margin protection**: Eliminate 5-10% margin erosion from stale/wrong pricing

### What Makes This Different
99% of estimating tools treat fencing like "linear footage × price." This system models the actual physics: geometry, terrain, material properties, assembly constraints, and jobsite reality.

---

## 2. CANONICAL DATA MODEL

### 2.1 Core Entities

#### Job
```typescript
Job {
  id: UUID
  org_id: UUID                    // RLS isolation
  customer_id: UUID
  status: enum [draft, quoted, won, lost, in_progress, closed]
  created_at: timestamp
  updated_at: timestamp
  
  // Lead source
  lead_source: enum [phone, text, email, facebook, website, angi, referral]
  lead_score: decimal             // 0-100, calculated
  
  // Location
  address: string
  lat: decimal
  lng: decimal
  zip_code: string
  frost_zone: integer             // 1-4, derived from zip
  wind_zone: enum [standard, high, hurricane]
  
  // Metadata
  site_photos: string[]           // URLs
  notes: text
  
  relationships:
    - has_many: FenceDesign
    - has_many: Quote
}
```

#### FenceDesign
```typescript
FenceDesign {
  id: UUID
  job_id: UUID
  version: integer                // Enables revision tracking
  is_active: boolean
  created_at: timestamp
  
  // Design parameters
  total_linear_feet: decimal      // Sum of all runs
  terrain_profile: enum [flat, slight, moderate, steep]
  soil_type: enum [normal, clay, sandy, rocky]
  existing_fence: boolean
  
  // Calculated values
  total_post_count: integer
  total_bay_count: integer
  total_gate_count: integer
  complexity_score: decimal       // 1.0-5.0
  
  relationships:
    - has_many: FenceSection
    - has_many: FenceNode
    - has_many: Gate
    - has_one: BOM
}
```

#### FenceNode
```typescript
FenceNode {
  id: UUID
  design_id: UUID
  sequence: integer
  
  // Position
  lat: decimal
  lng: decimal
  elevation_ft: decimal
  
  // Node type determines post config
  node_type: enum [
    line_post,        // Standard mid-run
    corner_post,      // Corner junction
    end_post,         // Free-standing terminus
    gate_post,        // Gate mounting point
    tee_junction      // 3-way intersection
  ]
  
  // Corner metadata
  corner_angle_degrees: decimal   // null if not corner
  
  // Gate metadata  
  gate_id: UUID                   // null if not gate post
  
  relationships:
    - belongs_to: FenceDesign
    - has_many: FenceSection (as start_node OR end_node)
}
```

#### FenceSection
```typescript
FenceSection {
  id: UUID
  design_id: UUID
  sequence: integer
  
  // Topology
  start_node_id: UUID
  end_node_id: UUID
  length_ft: decimal              // Actual measured distance
  
  // Material specification
  fence_type_id: string           // FK → FenceType
  height_ft: decimal
  style: string                   // e.g., "dog_ear", "board_on_board"
  color: string                   // vinyl/aluminum
  manufacturer: string            // Required for vinyl/aluminum
  
  // Terrain
  terrain_grade_pct: decimal      // -20 to +20
  slope_method: enum [racked, stepped, stepped_with_fill, flat]
  
  // Calculated spacing
  post_spacing_ft: decimal        // Optimized per-run
  bay_count: integer
  
  // Overrides
  override_post_spacing: decimal  // null = use calculated
  override_waste_factor: decimal  // null = use calculated
  
  relationships:
    - belongs_to: FenceDesign
    - references: FenceType
    - generates: BOMLine[] (via calculation)
}
```

### 2.2 Configuration Entities

#### FenceType
```typescript
FenceType {
  id: string                      // e.g., "wood_privacy_6ft"
  category: enum [wood, vinyl, chain_link, aluminum, steel, composite]
  name: string
  description: text
  
  // Physical constraints
  available_heights_ft: decimal[]
  default_height_ft: decimal
  default_post_spacing_ft: decimal
  max_post_spacing_ft: decimal
  min_post_spacing_ft: decimal
  spacing_adjustable: boolean     // true=wood, false=vinyl
  
  // Terrain handling
  slope_rackable: boolean
  max_rack_angle_degrees: decimal
  stepped_capable: boolean
  
  // Material system
  requires_manufacturer_match: boolean  // vinyl/aluminum lock-in
  is_pre_assembled: boolean       // panels vs. pickets
  
  // Default configs
  default_post_config_id: UUID
  default_rail_config_id: UUID
  default_panel_config_id: UUID
  
  relationships:
    - has_many: PostConfig (per node_type)
    - has_one: RailConfig
    - has_one: PanelConfig
    - has_many: GateConfig (per gate_type)
    - has_many: HardwareKit
    - has_many: ConcreteRule
}
```

#### PostConfig
```typescript
PostConfig {
  id: UUID
  fence_type_id: string
  node_type: enum [line_post, corner_post, end_post, gate_post]
  
  // Material
  material: string                // "PT_pine", "cedar", "steel_tube", "vinyl_pvc"
  nominal_size: string            // "4x4", "6x6", "2-3/8_OD"
  actual_width_inches: decimal    // 3.5 for 4x4
  actual_depth_inches: decimal
  is_round: boolean               // Steel pipe posts
  length_ft: decimal
  
  // Installation
  requires_reinforcement: boolean // Aluminum insert for vinyl
  reinforcement_sku_template: string
  
  // Concrete
  hole_diameter_inches: integer
  min_depth_inches: integer
  concrete_bags_80lb_default: integer
  
  // SKU
  sku_template: string            // "POST_{material}_{size}_{length}"
  
  // Pricing
  unit_price_default: decimal
}
```

#### RailConfig
```typescript
RailConfig {
  id: UUID
  fence_type_id: string
  
  // Material
  material: string
  nominal_size: string            // "2x4"
  actual_width_inches: decimal
  actual_depth_inches: decimal
  
  // Quantity logic
  rails_per_bay_by_height: jsonb  // {4: 2, 5: 2, 6: 3, 8: 3}
  available_lengths_ft: decimal[] // [8, 10, 12, 16]
  
  // Assembly
  attachment_method: enum [toe_nail, bracket, sleeve, integrated_panel]
  is_continuous: boolean          // Chain link top rail = true
  
  // SKU
  sku_template: string
  unit_price_default: decimal
}
```

#### PanelConfig
```typescript
PanelConfig {
  id: UUID
  fence_type_id: string
  
  // Panel type
  panel_type: enum [
    individual_pickets,     // Wood privacy
    pre_assembled_panel,    // Vinyl/composite
    fabric_roll,            // Chain link
    welded_section          // Aluminum/steel
  ]
  
  // Dimensions
  width_inches: decimal           // null if field-adjustable
  height_inches: decimal
  picket_width_inches: decimal    // For individual pickets
  gap_inches: decimal             // 0 = privacy, >0 = semi-privacy
  
  // Configuration
  is_field_adjustable: boolean    // Can width be cut?
  is_field_assembled: boolean     // Assembled on-site?
  roll_length_ft: decimal         // Chain link rolls
  
  // Waste
  waste_factor_default: decimal   // Base waste (before terrain/cuts)
  
  // SKU
  sku_template: string
  unit_price_default: decimal
}
```

#### GateConfig
```typescript
GateConfig {
  id: UUID
  fence_type_id: string
  
  // Gate specification
  gate_type: enum [walk, single_drive, double_drive, sliding, cantilever]
  width_ft: decimal
  height_ft: decimal
  
  // Frame
  frame_type: enum [
    wood_site_built,        // Built on-site from lumber
    metal_frame_kit,        // Pre-fab frame + fill
    factory_assembled       // Complete gate unit
  ]
  
  // Hardware requirements
  hinge_count: integer
  hinge_type: enum [t_hinge, strap_hinge, weld_on, self_closing]
  latch_type: enum [gravity, thumb, fork, magna, center_drop]
  
  // Special requirements
  self_closing_required: boolean  // Pool code
  self_latching_required: boolean
  drop_rod_required: boolean      // Double drive
  wheel_required: boolean         // Wide/heavy gates
  cane_bolt_required: boolean
  anti_sag_required: boolean
  
  // Post requirements
  requires_oversized_posts: boolean
  min_post_size: string           // "6x6"
  
  // SKU templates
  frame_sku_template: string
  hinge_sku_template: string
  latch_sku_template: string
  hardware_kit_id: UUID           // Optional pre-packaged kit
  
  // Pricing
  base_price: decimal
}
```

#### HardwareKit
```typescript
HardwareKit {
  id: UUID
  fence_type_id: string
  
  // Kit scope
  kit_type: enum [
    per_bay,          // Fence brackets for wood
    per_post,         // Post caps
    per_gate,         // Complete gate hardware
    per_terminal,     // Chain link terminal assembly
    per_line_post     // Chain link line post hardware
  ]
  
  // Items in kit
  items: HardwareItem[]
  
  // Metadata
  name: string
  description: text
}
```

#### HardwareItem
```typescript
HardwareItem {
  id: UUID
  kit_id: UUID
  
  // Item specification
  description: string
  sku_template: string
  category: enum [
    fastener,         // Nails, screws
    bracket,          // Fence brackets, rail sleeves
    cap,              // Post caps
    tie,              // Tie wires (chain link)
    band,             // Tension bands (chain link)
    bar,              // Tension bars
    hinge,
    latch,
    misc
  ]
  
  // Quantity calculation
  quantity_formula: string        // "fence_height_ft - 1" or "2" or "bay_count * 12"
  unit: enum [each, box, roll, lb]
  pack_size: integer              // Buy in packs of X
  
  // Pricing
  unit_price: decimal
  
  relationships:
    - belongs_to: HardwareKit
}
```

#### ConcreteRule
```typescript
ConcreteRule {
  id: UUID
  post_config_id: UUID
  
  // Environmental conditions
  frost_zone: integer             // 1-4
  soil_type: enum [normal, sandy, clay, rocky]
  
  // Hole specifications
  hole_diameter_inches: integer
  hole_depth_inches: integer
  
  // Concrete quantity
  bags_80lb: integer
  bags_50lb: integer
  use_fast_set: boolean           // High water table
  
  // Adjustments
  diameter_adjustment_sandy: integer  // +2" for sandy
  depth_adjustment_frost: integer     // +6" per zone
  
  relationships:
    - belongs_to: PostConfig
}
```

#### Gate
```typescript
Gate {
  id: UUID
  design_id: UUID
  
  // Gate specification
  gate_config_id: UUID
  gate_type: enum [walk, single_drive, double_drive, sliding, cantilever]
  width_ft: decimal
  height_ft: decimal
  
  // Position
  start_node_id: UUID             // Left gate post
  end_node_id: UUID               // Right gate post
  
  // Configuration
  hardware_level: enum [standard, heavy_duty, premium, automated]
  swing_direction: enum [inward, outward, bidirectional]
  
  // Special requirements
  pool_code_compliant: boolean
  ada_compliant: boolean
  automated: boolean
  automation_type: enum [none, solar, wired, battery]
  
  // Overrides
  override_frame_sku: string
  override_hinge_sku: string
  override_latch_sku: string
  
  relationships:
    - belongs_to: FenceDesign
    - references: GateConfig
    - generates: BOMLine[] (via gate resolver)
}
```

### 2.3 Output Entities

#### BOM
```typescript
BOM {
  id: UUID
  design_id: UUID
  version: integer
  generated_at: timestamp
  
  // Status
  is_current: boolean
  is_locked: boolean              // Prevent recalc after quote sent
  locked_at: timestamp
  
  // Totals
  total_material_cost: decimal
  total_labor_cost: decimal
  total_price: decimal
  
  // Metadata
  calculation_engine_version: string
  calculation_warnings: jsonb[]
  calculation_errors: jsonb[]
  
  relationships:
    - belongs_to: FenceDesign
    - has_many: BOMLine
}
```

#### BOMLine
```typescript
BOMLine {
  id: UUID
  bom_id: UUID
  sequence: integer
  
  // Item identification
  category: enum [post, rail, panel, picket, concrete, gate, hardware, fastener, accessory, labor]
  description: string
  sku: string                     // Resolved from supplier catalog
  supplier_id: UUID
  
  // Quantity calculation
  raw_quantity: decimal           // Before waste
  waste_factor: decimal           // Applied waste %
  insurance_quantity: decimal     // Always add 2 posts, etc.
  order_quantity: decimal         // Final qty to purchase
  
  // Pricing
  unit: enum [each, linear_ft, roll, bag, box, lb, crew_hour]
  unit_price: decimal
  extended_price: decimal
  
  // Traceability
  source_section_id: UUID         // Which section generated this?
  source_gate_id: UUID            // Which gate?
  calculation_notes: text         // "20 line + 2 corner + 2 end + 2 insurance"
  
  // Pack optimization
  pack_size: integer              // Sold in packs of X
  packs_required: integer         // Ceil(order_qty / pack_size)
  actual_purchase_qty: integer    // packs × pack_size
  
  relationships:
    - belongs_to: BOM
    - references: SupplierItem
}
```

#### SupplierItem
```typescript
SupplierItem {
  id: UUID
  supplier_id: UUID
  
  // Identification
  sku: string                     // Supplier's part number
  manufacturer_sku: string        // Manufacturer part number
  description: string
  category: enum [post, rail, panel, picket, concrete, gate, hardware, fastener, accessory]
  
  // Compatibility
  fence_type_compatibility: string[]
  material: string
  dimensions: string
  
  // Packaging
  unit: enum [each, linear_ft, roll, bag, box, lb]
  pack_size: integer
  min_order_qty: integer
  
  // Pricing
  unit_price: decimal
  price_tier_2_qty: integer       // Volume discount tiers
  price_tier_2: decimal
  last_price_update: timestamp
  price_valid_until: timestamp
  
  // Availability
  in_stock: boolean
  lead_time_days: integer
  regional_availability: string[] // ["northeast", "midwest"]
  
  relationships:
    - belongs_to: Supplier
}
```

---

## 3. CALCULATION ENGINE ARCHITECTURE

### 3.1 Core Modules

#### Module 1: Design Graph Builder
**Responsibility:** Convert user input into computational graph (nodes + edges)

**Inputs:**
- Drawn fence line OR linear footage + corner count
- Property boundaries (lat/lng points)
- Gate positions and widths

**Outputs:**
- `FenceNode[]` with typed nodes (line/corner/end/gate)
- `FenceSection[]` connecting nodes
- Total linear footage (sum of all edges)
- Corner angles calculated from geometry

**Key Logic:**
```typescript
function buildDesignGraph(input: UserInput): FenceDesign {
  // 1. Create nodes from drawn points or auto-generate from LF
  const nodes = createNodes(input.fence_line_points)
  
  // 2. Type each node based on position
  nodes.forEach(node => {
    node.node_type = classifyNode(node, nodes)
    if (isCorner(node)) {
      node.corner_angle = calculateAngle(prevNode, node, nextNode)
    }
  })
  
  // 3. Create sections between consecutive nodes
  const sections = createSections(nodes)
  
  // 4. Calculate terrain for each section
  sections.forEach(section => {
    section.terrain_grade_pct = calculateGrade(
      section.start_node.elevation,
      section.end_node.elevation,
      section.length_ft
    )
  })
  
  return { nodes, sections }
}
```

**Dependencies:** None (entry point)

---

#### Module 2: Node Typer
**Responsibility:** Classify each node and determine correct post configuration

**Inputs:**
- `FenceNode[]` with positions
- Graph topology

**Outputs:**
- Each node assigned `node_type`
- Each node assigned `PostConfig`

**Key Logic:**
```typescript
function classifyNode(node: FenceNode, allNodes: FenceNode[]): NodeType {
  const connectedEdges = getConnectedEdges(node, allNodes)
  
  if (connectedEdges.length === 1) return 'end_post'
  if (connectedEdges.length === 2 && isLinear(connectedEdges)) return 'line_post'
  if (connectedEdges.length === 2 && !isLinear(connectedEdges)) return 'corner_post'
  if (connectedEdges.length === 3) return 'tee_junction'
  if (node.has_gate) return 'gate_post'
  
  throw new Error(`Invalid node with ${connectedEdges.length} connections`)
}
```

**Dependencies:** Design Graph Builder

---

#### Module 3: Section Normalizer
**Responsibility:** Optimize post spacing per section, calculate bay count

**Inputs:**
- `FenceSection[]` with length and fence_type
- `FenceType` spacing constraints

**Outputs:**
- Optimized `post_spacing_ft` per section
- `bay_count` per section

**Key Logic:**
```typescript
function optimizeSpacing(section: FenceSection, fenceType: FenceType): void {
  const maxSpacing = fenceType.max_post_spacing_ft
  const minSpacing = fenceType.min_post_spacing_ft
  
  // Calculate ideal bay count to avoid short stub bays
  const idealBays = Math.ceil(section.length_ft / maxSpacing)
  const optimizedSpacing = section.length_ft / idealBays
  
  // Validate within constraints
  if (optimizedSpacing < minSpacing) {
    throw new ValidationError(`Spacing ${optimizedSpacing}ft below min ${minSpacing}ft`)
  }
  
  section.post_spacing_ft = optimizedSpacing
  section.bay_count = idealBays
}

// Example: 26ft run with 8ft max spacing
// Bad: 3 bays @ 8ft + 1 stub @ 2ft (4 posts)
// Good: 4 bays @ 6.5ft (5 posts) — evenly distributed
```

**Dependencies:** Design Graph Builder, Node Typer

---

#### Module 4: Waste Engine
**Responsibility:** Calculate actual waste factors from design geometry

**Inputs:**
- `FenceSection[]` with spacing, terrain, corners
- `FenceType` with base waste defaults

**Outputs:**
- `waste_factor` per BOM category (rails, pickets, concrete)

**Key Logic:**
```typescript
function calculateWaste(section: FenceSection): WasteFactors {
  let railWaste = 0
  let picketWaste = 0.02  // 2% defect base
  
  // Rail waste from cut offcuts
  const offcutPerRail = railLength - section.post_spacing_ft
  railWaste += (offcutPerRail * totalRails) / (railLength * totalRails)
  
  // Picket waste from corners
  section.corners.forEach(corner => {
    if (corner.angle !== 90) {
      const angleOffset = picketWidth * Math.tan(Math.abs(90 - corner.angle))
      picketWaste += (angleOffset / picketWidth) / totalPickets
    }
  })
  
  // Terrain waste (stepped sections)
  if (section.slope_method === 'stepped_with_fill') {
    picketWaste += 0.05  // 5% additional for fill pieces
  }
  
  // Complexity waste
  if (section.bay_count > 20) picketWaste += 0.03  // Large jobs have more waste
  
  return {
    rail_waste: Math.round(railWaste * 1000) / 1000,  // Round to 0.1%
    picket_waste: Math.round(picketWaste * 1000) / 1000
  }
}
```

**Dependencies:** Section Normalizer

---

#### Module 5: Concrete Engine
**Responsibility:** Calculate concrete per post using volumetric formulas

**Inputs:**
- `FenceNode[]` with typed posts
- `PostConfig[]` with hole dimensions
- `ConcreteRule[]` with frost/soil adjustments
- Job location (frost_zone, soil_type)

**Outputs:**
- Concrete `BOMLine` with per-post breakdown

**Key Logic:**
```typescript
function calculateConcrete(
  node: FenceNode,
  postConfig: PostConfig,
  frostZone: number,
  soilType: SoilType
): number {
  // Get applicable rule
  const rule = ConcreteRule.find({
    post_config_id: postConfig.id,
    frost_zone: frostZone,
    soil_type: soilType
  })
  
  // Calculate hole volume
  const holeDiameter = rule.hole_diameter_inches
  const holeDepth = rule.hole_depth_inches
  const holeRadius = holeDiameter / 2
  const holeVolumeCubicInches = Math.PI * Math.pow(holeRadius, 2) * holeDepth
  
  // Subtract post displacement
  const postVolumeCubicInches = 
    postConfig.actual_width_inches * 
    postConfig.actual_depth_inches * 
    holeDepth
  
  const concreteVolumeCubicInches = holeVolumeCubicInches - postVolumeCubicInches
  const concreteVolumeCubicFeet = concreteVolumeCubicInches / 1728
  
  // Convert to bags (80lb bag = 0.6 cubic feet)
  const bags = Math.ceil(concreteVolumeCubicFeet / 0.6)
  
  return bags
}

// Total = sum(all nodes) × 1.05 (5% overage)
```

**Dependencies:** Node Typer

---

#### Module 6: Gate Resolver
**Responsibility:** Generate complete gate BOM with all hardware

**Inputs:**
- `Gate[]` with specifications
- `GateConfig[]` with hardware requirements

**Outputs:**
- Complete gate `BOMLine[]` (frame, hinges, latch, accessories)

**Key Logic:**
```typescript
function resolveGate(gate: Gate, config: GateConfig): BOMLine[] {
  const lines: BOMLine[] = []
  
  // Frame
  if (config.frame_type === 'factory_assembled') {
    lines.push({
      category: 'gate',
      description: `${gate.width_ft}' ${config.gate_type} gate (pre-assembled)`,
      sku: resolveSKU(config.frame_sku_template, gate),
      quantity: 1
    })
  } else if (config.frame_type === 'metal_frame_kit') {
    lines.push({
      category: 'gate',
      description: `${gate.width_ft}' gate frame kit`,
      sku: resolveSKU(config.frame_sku_template, gate),
      quantity: 1
    })
  }
  
  // Hinges
  lines.push({
    category: 'hardware',
    description: `${config.hinge_type} hinge`,
    sku: resolveSKU(config.hinge_sku_template, gate),
    quantity: config.hinge_count
  })
  
  // Latch
  lines.push({
    category: 'hardware',
    description: `${config.latch_type} latch`,
    sku: resolveSKU(config.latch_sku_template, gate),
    quantity: 1
  })
  
  // Conditional hardware
  if (config.drop_rod_required) {
    lines.push({ description: 'Drop rod', sku: 'DROP_ROD_STD', quantity: 1 })
  }
  
  if (config.wheel_required || gate.width_ft > 6) {
    lines.push({ description: 'Gate wheel kit', sku: 'GATE_WHEEL', quantity: 1 })
  }
  
  if (config.cane_bolt_required) {
    lines.push({ description: 'Cane bolt', sku: 'CANE_BOLT_18', quantity: gate.gate_type === 'double_drive' ? 2 : 1 })
  }
  
  if (gate.pool_code_compliant && !config.self_closing_required) {
    throw new ValidationError('Pool code requires self-closing hinges')
  }
  
  return lines
}
```

**Dependencies:** Design Graph Builder

---

#### Module 7: SKU Resolver
**Responsibility:** Map BOM line templates to actual supplier SKUs

**Inputs:**
- BOM line with `sku_template` (e.g., "POST_4X4X8_PT")
- `SupplierCatalog[]`
- Preferred supplier

**Outputs:**
- Resolved `sku`, `unit_price`, `supplier_id`

**Key Logic:**
```typescript
function resolveSKU(
  template: string,
  catalog: SupplierCatalog,
  preferredSupplier?: string
): SupplierItem | null {
  // Parse template: "POST_4X4X8_PT" → {category: post, size: 4x4x8, material: PT}
  const parsed = parseTemplate(template)
  
  // Search catalog
  const matches = catalog.items.filter(item =>
    item.category === parsed.category &&
    item.dimensions.includes(parsed.size) &&
    item.material === parsed.material &&
    item.in_stock === true
  )
  
  if (matches.length === 0) {
    return null  // Flag for manual resolution
  }
  
  if (matches.length === 1) {
    return matches[0]
  }
  
  // Multiple matches: prefer supplier, then lowest price
  if (preferredSupplier) {
    const preferred = matches.find(m => m.supplier_id === preferredSupplier)
    if (preferred) return preferred
  }
  
  return matches.sort((a, b) => a.unit_price - b.unit_price)[0]
}
```

**Dependencies:** None (operates on BOM after generation)

---

#### Module 8: BOM Assembler
**Responsibility:** Aggregate all calculations into unified BOM

**Inputs:**
- Posts from Node Typer
- Rails/panels from fence-type modules
- Concrete from Concrete Engine
- Gates from Gate Resolver
- Hardware from fence-type modules

**Outputs:**
- Complete `BOM` with `BOMLine[]`

**Key Logic:**
```typescript
function assembleBOM(design: FenceDesign, calculations: AllCalculations): BOM {
  const lines: BOMLine[] = []
  
  // Posts (aggregated by type)
  const postsByConfig = groupBy(calculations.posts, 'post_config_id')
  postsByConfig.forEach((posts, configId) => {
    lines.push({
      category: 'post',
      description: posts[0].description,
      raw_quantity: posts.length,
      insurance_quantity: 2,  // Always add 2 extra posts
      order_quantity: posts.length + 2,
      calculation_notes: `${posts.filter(p => p.node_type === 'line_post').length} line + ` +
                         `${posts.filter(p => p.node_type === 'corner_post').length} corner + ` +
                         `${posts.filter(p => p.node_type === 'end_post').length} end + ` +
                         `${posts.filter(p => p.node_type === 'gate_post').length} gate + 2 insurance`
    })
  })
  
  // Rails, panels, concrete, gates, hardware...
  // (similar aggregation logic)
  
  // Resolve SKUs for all lines
  lines.forEach(line => {
    const resolved = resolveSKU(line.sku_template, catalog)
    if (!resolved) {
      line.sku = 'MANUAL_RESOLVE_REQUIRED'
      line.unit_price = 0
    } else {
      line.sku = resolved.sku
      line.unit_price = resolved.unit_price
      line.supplier_id = resolved.supplier_id
    }
    line.extended_price = line.order_quantity * line.unit_price
  })
  
  return {
    design_id: design.id,
    lines,
    total_material_cost: sum(lines.map(l => l.extended_price))
  }
}
```

**Dependencies:** All calculation modules

---

#### Module 9: Validation Engine
**Responsibility:** Detect impossible states and common errors BEFORE BOM generation

**Inputs:**
- `FenceDesign` (complete graph)
- `BOM` (generated)

**Outputs:**
- `ValidationError[]` (BLOCK severity — prevents quote)
- `ValidationWarning[]` (WARN severity — shows alert)

**Key Logic:** (See Section 5 for full validation matrix)

**Dependencies:** BOM Assembler

---

#### Module 10: Pricing Engine
**Responsibility:** Calculate labor, overhead, margin, and final pricing tiers

**Inputs:**
- `BOM` with material costs
- Labor rates and production data
- Company overhead %
- Target margin %

**Outputs:**
- Labor cost breakdown
- Good/Better/Best pricing tiers
- Price-per-foot

**Key Logic:**
```typescript
function calculatePricing(bom: BOM, design: FenceDesign, rates: LaborRates): PricingOutput {
  // Labor calculation
  const laborHours = calculateLaborHours(design, rates)
  const laborCost = laborHours * rates.hourly_rate
  
  // Overhead
  const overhead = (bom.total_material_cost + laborCost) * rates.overhead_pct
  
  // Subtotal
  const subtotal = bom.total_material_cost + laborCost + overhead
  
  // Good/Better/Best tiers
  const tiers = {
    good: subtotal / (1 - 0.15),      // 15% margin
    better: subtotal / (1 - 0.22),    // 22% margin
    best: subtotal / (1 - 0.30)       // 30% margin
  }
  
  return {
    material_cost: bom.total_material_cost,
    labor_cost: laborCost,
    overhead,
    subtotal,
    tiers,
    price_per_lf: tiers.better / design.total_linear_feet
  }
}
```

**Dependencies:** BOM Assembler

---

## ADDITIONAL SPECIFICATION DOCUMENTS

This specification is split across multiple focused documents:

### Core Specification (This Document)
- Executive Summary
- Canonical Data Model (entities, relationships, field specs)
- Calculation Engine Architecture (10 core modules)

### Fence-Type Calculation Modules
**Document:** [`FENCE_TYPE_MODULES.md`](./FENCE_TYPE_MODULES.md)
- Wood Privacy (posts, bays, rails, pickets, concrete, gates, hardware)
- Chain Link (terminal vs. line posts, fabric, top rail, hardware trees)
- Vinyl (panel-width locking, manufacturer constraints, aluminum inserts)
- Aluminum Ornamental (pool code, section-based)
- Steel/Wrought Iron (finishing, weight considerations)
- Composite (Trex field-assembled, SimTek pre-cast)

### Validation Rules & Runtime Flow
**Document:** [`VALIDATION_AND_FLOW.md`](./VALIDATION_AND_FLOW.md)
- Complete validation matrix (BLOCK rules, WARN rules)
- 12-step runtime execution flow
- Override points and audit trail
- Dependency order (sequential vs. parallel)

### MVP Build Order
**Document:** [`MVP_BUILD_ORDER.md`](./MVP_BUILD_ORDER.md)
- Phase 1: Wood Privacy MVP (weeks 1-4)
- Phase 2: Chain Link Module (weeks 5-6)
- Phase 3: Vinyl + Mixed Materials (weeks 7-9)
- Phase 4: Remaining Types + Calibration (weeks 10-12)
- Decision gates and success metrics
- Technical risk mitigation

### Open Questions & Assumptions
**Document:** [`OPEN_QUESTIONS.md`](./OPEN_QUESTIONS.md)
- Technical assumptions requiring validation
- Business logic questions (frost depth, post sizing, spacing)
- Validation severity tuning
- Integration questions (catalog sync, tax calculation)
- UX/UI decisions (wizard vs. single-page, BOM display)
- Beta research questions
- Key architectural decisions

---

## HOW TO USE THIS SPECIFICATION

### For Product Managers
1. Start with Executive Summary (Section 1)
2. Review MVP Build Order for phasing
3. Reference Open Questions for product decisions

### For Engineers
1. Study Canonical Data Model (Section 2)
2. Review Calculation Engine Architecture (Section 3)
3. Dive into fence-type modules for implementation details
4. Use Validation & Flow for integration understanding

### For QA/Testing
1. Review Validation Matrix for test case generation
2. Use fence-type modules to understand expected outputs
3. Reference MVP phases for regression test scoping

### For Designers
1. Review Runtime Flow for UX touchpoints
2. Check Open Questions for UI decision context
3. Reference MVP phases for feature prioritization

---

## KEY PRINCIPLES

1. **Every BOM line is traceable** — No guesses, no "standard" factors without justification
2. **Impossible states are blocked** — Validation prevents gates without hinges, chain link without tension bands
3. **Fence types are different** — Wood ≠ vinyl ≠ chain link. Separate logic, not forced abstractions.
4. **Calibration creates moat** — After 50 jobs, system knows contractor's actual waste, labor rates, concrete usage
5. **Mobile-first** — 60% of estimates created on-site, not in office
6. **Build for install-reality** — If a crew would notice it missing, it's in the BOM

---

## GLOSSARY

**Bay** — Space between two posts (typically 6-8ft for wood, 10ft for chain link, fixed width for vinyl/aluminum)

**BOM** — Bill of Materials. Complete list of every item needed for installation.

**Graph-based design** — Fence represented as nodes (posts) and edges (runs). Enables complex topology handling.

**Post types:**
- **Line post** — Standard mid-run post
- **Corner post** — Post at angle junction
- **End post** — Free-standing terminus
- **Gate post** — Post mounting gate hardware
- **Terminal post** — (Chain link) End, corner, or gate post requiring tension hardware

**SKU** — Stock Keeping Unit. Supplier's part number for a specific product.

**Waste factor** — Percentage of extra material ordered beyond calculated quantity to account for cuts, defects, errors.

**EWMA** — Exponentially Weighted Moving Average. Calibration method that weights recent jobs higher than old jobs.

**Frost depth** — Minimum depth posts must be set to prevent frost heave. Varies by climate zone (18"-60").

**Stub bay** — Short final bay when run doesn't divide evenly (e.g., 26ft with 8ft spacing = 3 bays + 2ft stub). Avoided via spacing optimization.

**Pool code** — Building code requirements for pool enclosures: self-closing gates, latch ≥54" high, picket spacing <4", gate opens outward.

---

