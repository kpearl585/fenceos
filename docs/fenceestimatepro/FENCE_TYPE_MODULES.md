# Fence-Type-Specific Calculation Modules

## 4. FENCE TYPE CALCULATION MODULES

Each fence type has unique calculation logic. These modules are called by the BOM Assembler based on `fence_type_id`.

---

### 4.1 Wood Privacy Module

**Post Counting Logic:**
```typescript
function calculateWoodPosts(section: FenceSection): PostCalculation {
  // Step 1: Optimize spacing to avoid stub bays
  const maxSpacing = 8  // Never exceed 8' — rails sag
  const bayCount = Math.ceil(section.length_ft / maxSpacing)
  const optimizedSpacing = section.length_ft / bayCount
  
  // Step 2: Posts per run = bays + 1 (include both ends)
  const postsThisRun = bayCount + 1
  
  // Step 3: Post type per position
  const posts = []
  for (let i = 0; i < postsThisRun; i++) {
    const node = section.nodes[i]
    const postSize = node.node_type === 'gate_post' ? '6x6' : '4x4'
    posts.push({
      node_id: node.id,
      post_config: getPostConfig('wood_privacy', node.node_type, postSize)
    })
  }
  
  return { posts, bayCount, spacing: optimizedSpacing }
}
```

**Bay/Rail Logic:**
```typescript
function calculateWoodRails(section: FenceSection): RailCalculation {
  const railsPerBay = section.height_ft >= 6 ? 3 : 2
  const totalRails = section.bay_count * railsPerBay
  
  // Optimize rail length selection
  const railLength = selectOptimalRailLength(section.post_spacing_ft, [8, 10, 12, 16])
  
  // Calculate waste
  const offcutPerRail = railLength - section.post_spacing_ft
  const totalOffcut = offcutPerRail * totalRails
  const waste = totalOffcut / (railLength * totalRails)
  
  return {
    rail_count: totalRails,
    rail_length_ft: railLength,
    waste_factor: waste
  }
}

function selectOptimalRailLength(spacing: number, available: number[]): number {
  // Prefer length just above spacing to minimize waste
  const viable = available.filter(len => len >= spacing)
  return viable[0] || available[available.length - 1]
}
```

**Picket Logic:**
```typescript
function calculateWoodPickets(section: FenceSection): PicketCalculation {
  const picketWidth = 5.5  // Actual width of 1x6
  const style = section.style
  
  let picketsPerBay = 0
  
  if (style === 'privacy') {
    // No gap — boards touching
    picketsPerBay = Math.ceil((section.post_spacing_ft * 12) / picketWidth)
  } else if (style === 'semi_privacy') {
    // 1" gap between boards
    picketsPerBay = Math.ceil((section.post_spacing_ft * 12) / (picketWidth + 1))
  } else if (style === 'board_on_board') {
    // Front + back, offset to cover gaps
    const frontBoards = Math.ceil((section.post_spacing_ft * 12) / (picketWidth + 1))
    picketsPerBay = frontBoards * 2
  }
  
  const rawTotal = picketsPerBay * section.bay_count
  
  // Calculate waste from design
  let wasteF actor = 0.02  // 2% defect base
  wasteFactor += calculateCornerWaste(section.corners)
  wasteFactor += calculateTerrainWaste(section.slope_method)
  
  return {
    pickets_per_bay: picketsPerBay,
    raw_quantity: rawTotal,
    waste_factor: wasteFactor,
    order_quantity: Math.ceil(rawTotal * (1 + wasteFactor))
  }
}
```

**Concrete Logic:**
```typescript
function calculateWoodConcrete(posts: Post[], frostZone: number, soilType: string): ConcreteResult {
  const bags = posts.map(post => {
    const holeDiameter = post.size === '6x6' ? 12 : 10
    const holeDepth = getFrostDepth(frostZone) + 6  // Add 6" below frost
    
    const holeVolume = Math.PI * Math.pow(holeDiameter / 2, 2) * holeDepth / 1728  // cu.ft.
    const postSize = post.size === '6x6' ? 5.5 : 3.5
    const postVolume = (postSize * postSize * holeDepth) / 1728
    
    const concreteVolume = holeVolume - postVolume
    return Math.ceil(concreteVolume / 0.6)  // 80lb bag = 0.6 cu.ft.
  })
  
  const totalBags = Math.ceil(sum(bags) * 1.05)  // 5% overage
  
  return {
    bags_per_post: bags,
    total_bags: totalBags,
    calculation_note: `Frost depth: ${getFrostDepth(frostZone)}" (zone ${frostZone})`
  }
}

function getFrostDepth(zone: number): number {
  const depths = { 1: 18, 2: 30, 3: 36, 4: 48 }
  return depths[zone] || 30
}
```

**Gate Logic:**
```typescript
function calculateWoodGate(gate: Gate): GateBOM {
  const lines = []
  
  // Frame (if metal frame kit, otherwise site-built from lumber)
  if (gate.gate_type === 'walk') {
    lines.push({
      description: `${gate.width_ft}' metal gate frame kit`,
      sku_template: 'GATE_FRAME_METAL_{width}',
      quantity: 1
    })
  }
  
  // Hinges
  const hingeCount = gate.width_ft <= 4 ? 2 : 3
  lines.push({
    description: 'Heavy-duty T-hinge',
    sku_template: 'HINGE_T_HEAVY',
    quantity: hingeCount
  })
  
  // Latch
  lines.push({
    description: 'Gravity latch',
    sku_template: 'LATCH_GRAVITY_WOOD',
    quantity: 1
  })
  
  // Pickets for gate fill
  const gatePickets = Math.ceil((gate.width_ft * 12) / 5.5)
  lines.push({
    description: '1x6x6\' dog-ear picket (gate fill)',
    sku_template: 'PICKET_1X6X6_DOGEAR',
    quantity: gatePickets
  })
  
  // Wheel kit if wide
  if (gate.width_ft > 6) {
    lines.push({
      description: 'Gate wheel kit',
      sku_template: 'GATE_WHEEL',
      quantity: 1
    })
  }
  
  return { lines }
}
```

**Hardware:**
- Fasteners: 2 nails per picket per rail (18 pickets × 3 rails × 2 = 108 nails/bay)
- Fence brackets: 2 per rail connection (3 rails × 2 ends × 2 brackets = 12/bay)
- Post caps: 1 per post

**Special Rules:**
- Never exceed 8' post spacing (rails will sag)
- 6'+ fence requires 3 rails minimum
- Gate posts must be 6x6 minimum
- ACQ-rated fasteners required for pressure-treated lumber

---

### 4.2 Chain Link Module

**Post Counting Logic:**
```typescript
function calculateChainLinkPosts(section: FenceSection): PostCalculation {
  // Chain link uses 10' standard spacing
  const linePostSpacing = 10
  const linePostCount = Math.floor(section.length_ft / linePostSpacing) - 1
  
  // Terminal posts at each end
  const terminalCount = 2
  
  return {
    line_posts: linePostCount,
    terminal_posts: terminalCount,
    total_posts: linePostCount + terminalCount,
    spacing: linePostSpacing
  }
}
```

**Fabric Logic:**
```typescript
function calculateChainLinkFabric(section: FenceSection): FabricCalculation {
  // Fabric sold in 50' rolls
  const fabricNeeded = section.length_ft + (section.terminal_count * 1)  // +1ft per terminal for tension
  const rolls = Math.ceil(fabricNeeded / 50)
  
  return {
    linear_feet_needed: fabricNeeded,
    rolls_required: rolls,
    sku_template: `FABRIC_CL_{gauge}_{height}_GALV`
  }
}
```

**Top Rail Logic:**
```typescript
function calculateTopRail(section: FenceSection): TopRailCalculation {
  // Continuous rail across entire run
  const railNeeded = section.length_ft * 1.05  // 5% for overlaps/adjustments
  
  // Rails sold in 21' lengths
  const railCount = Math.ceil(railNeeded / 21)
  
  return {
    rail_count: railCount,
    linear_feet: railNeeded,
    sku_template: 'RAIL_TOP_CL_{diameter}_21FT'
  }
}
```

**Hardware Logic (The Complex Part):**
```typescript
function calculateChainLinkHardware(section: FenceSection): HardwareBOM {
  const lines = []
  
  // PER TERMINAL POST (ends, corners, gates)
  section.terminal_posts.forEach(post => {
    // Tension bar (threaded through fabric end)
    lines.push({ description: 'Tension bar', quantity: 1 })
    
    // Tension bands (height-dependent)
    const tensionBands = section.height_ft - 1  // 4' fence = 3 bands, 6' = 5 bands
    lines.push({ description: 'Tension band', quantity: tensionBands })
    
    // Brace band (holds rail end fitting)
    lines.push({ description: 'Brace band', quantity: 1 })
    
    // Rail end cup
    lines.push({ description: 'Rail end cup', quantity: 1 })
    
    // Carriage bolts (one per band + brace)
    lines.push({ description: '5/16" × 1-1/4" carriage bolt', quantity: tensionBands + 1 })
  })
  
  // PER LINE POST
  section.line_posts.forEach(post => {
    // Loop cap (rail slides through)
    lines.push({ description: 'Loop cap', quantity: 1 })
    
    // Tie wires (vertical fabric attachment)
    const tieWires = Math.ceil(section.height_ft * 12 / 12)  // 1 per 12" height
    lines.push({ description: 'Tie wire', quantity: tieWires })
  })
  
  // TOP RAIL TIES (horizontal fabric attachment)
  const railTies = Math.ceil(section.length_ft / 2)  // 1 tie per 24" of rail
  lines.push({ description: 'Rail tie wire', quantity: railTies })
  
  // RAIL SLEEVES (joints between rail sections)
  const railJoints = section.top_rail_count - 1
  lines.push({ description: 'Rail sleeve', quantity: railJoints })
  
  return { lines: aggregateHardware(lines) }
}
```

**Gate Logic:**
```typescript
function calculateChainLinkGate(gate: Gate): GateBOM {
  const lines = []
  
  // Pre-fabricated frame
  lines.push({
    description: `${gate.width_ft}' chain link gate (pre-fab)`,
    sku_template: 'GATE_CL_{width}_{height}_GALV',
    quantity: 1
  })
  
  // Hinges (male/female system)
  lines.push({
    description: 'Chain link gate hinge (male)',
    quantity: 2
  })
  lines.push({
    description: 'Chain link gate hinge (female)',
    quantity: 2
  })
  
  // Fork latch
  lines.push({
    description: 'Fork latch',
    quantity: 1
  })
  
  return { lines }
}
```

**Concrete:**
- Terminal posts: 2-3/8" OD post in 10" hole, 36" deep = 3 bags
- Line posts: 1-5/8" OD post in 8" hole, 30" deep = 2 bags

**Special Rules:**
- Line post spacing always 10' OC (not adjustable)
- Tension hardware is height-dependent (`height_ft - 1` bands per terminal)
- Missing ANY hardware component makes installation impossible

---

### 4.3 Vinyl Privacy Module

**Post Counting Logic:**
```typescript
function calculateVinylPosts(section: FenceSection): PostCalculation {
  // CRITICAL: Vinyl panel width is fixed (6' or 8' depending on manufacturer)
  const panelWidth = section.manufacturer_panel_width_ft
  
  // Post spacing MUST match panel width exactly
  const panelCount = Math.floor(section.length_ft / panelWidth)
  const remainder = section.length_ft - (panelCount * panelWidth)
  
  // If remainder > 0, need custom-width panel
  const customPanelNeeded = remainder > 0
  
  const postCount = panelCount + 1 + (customPanelNeeded ? 1 : 0)
  
  return {
    post_count: postCount,
    panel_count: panelCount,
    custom_panel_width_ft: customPanelNeeded ? remainder : null,
    spacing_ft: panelWidth,  // Not adjustable!
    validation: panelWidth === section.post_spacing_ft ? 'OK' : 'ERROR'
  }
}
```

**Panel Logic:**
```typescript
function calculateVinylPanels(section: FenceSection): PanelCalculation {
  // Panels are pre-assembled units — no field cutting
  const standardPanels = section.panel_count
  const customPanels = section.custom_panel_needed ? 1 : 0
  
  return {
    standard_panels: {
      sku_template: 'PANEL_VINYL_{manufacturer}_{width}_{height}_{color}',
      quantity: standardPanels
    },
    custom_panels: customPanels > 0 ? {
      sku_template: 'PANEL_VINYL_{manufacturer}_CUSTOM_{height}_{color}',
      quantity: 1,
      custom_width_ft: section.custom_panel_width_ft,
      note: 'Requires manufacturer quote for custom width'
    } : null
  }
}
```

**Bracket/Hardware Logic:**
```typescript
function calculateVinylHardware(section: FenceSection): HardwareBOM {
  const lines = []
  
  // Panel brackets (snap into routed post slots)
  const railsPerPanel = 2  // Standard 2-rail privacy panel
  const bracketsPerPanel = railsPerPanel * 2 * 2  // 2 rails × 2 ends × 2 brackets = 8
  
  lines.push({
    description: 'Vinyl panel bracket',
    quantity: section.panel_count * bracketsPerPanel
  })
  
  // Stainless screws (2 per bracket)
  lines.push({
    description: '#8 × 1" stainless steel screw',
    quantity: section.panel_count * bracketsPerPanel * 2
  })
  
  // Aluminum inserts (REQUIRED for gate posts, recommended for corners/ends)
  const gatePostCount = section.nodes.filter(n => n.node_type === 'gate_post').length
  const cornerPostCount = section.nodes.filter(n => n.node_type === 'corner_post').length
  
  lines.push({
    description: 'Aluminum post insert (5" × 5")',
    quantity: gatePostCount + cornerPostCount
  })
  
  // Post caps
  lines.push({
    description: 'Vinyl post cap (5" × 5")',
    quantity: section.post_count
  })
  
  return { lines }
}
```

**Gate Logic:**
```typescript
function calculateVinylGate(gate: Gate): GateBOM {
  // Vinyl gates are factory-assembled only
  const lines = []
  
  lines.push({
    description: `${gate.width_ft}' vinyl gate (factory-assembled)`,
    sku_template: 'GATE_VINYL_{manufacturer}_{width}_{height}_{color}',
    quantity: 1,
    note: 'Must match fence panel manufacturer'
  })
  
  // Aluminum insert for BOTH gate posts (mandatory)
  lines.push({
    description: 'Heavy-duty aluminum gate post insert',
    sku_template: 'INSERT_AL_GATE_HEAVY',
    quantity: 2
  })
  
  // Hinges (manufacturer-specific)
  lines.push({
    description: `${gate.manufacturer} gate hinge`,
    quantity: gate.width_ft <= 4 ? 2 : 3
  })
  
  // Latch
  lines.push({
    description: `${gate.manufacturer} gate latch`,
    quantity: 1
  })
  
  return { lines }
}
```

**Concrete:**
- 5"×5" vinyl post in 12" hole, 36" deep = 4 bags (heavier due to insert)

**Special Rules:**
- **Spacing is NOT adjustable** — must match manufacturer panel width exactly
- **Manufacturer lock-in** — all components (posts, panels, gates, brackets) must be same brand
- **Aluminum inserts required** for gate posts (structural), recommended for corner/end posts
- **No field cutting** — panels arrive pre-assembled, custom widths require factory order

---

### 4.4 Aluminum Ornamental Module

**Post/Panel Logic:**
```typescript
function calculateAluminumSections(section: FenceSection): AluminumCalculation {
  // Similar to vinyl — section-based system
  const sectionWidth = 6  // Standard 6' or 8' sections
  const sectionCount = Math.floor(section.length_ft / sectionWidth)
  const customNeeded = (section.length_ft % sectionWidth) > 0
  
  return {
    standard_sections: sectionCount,
    custom_section_width: customNeeded ? (section.length_ft % sectionWidth) : null,
    post_count: sectionCount + 1 + (customNeeded ? 1 : 0)
  }
}
```

**Bracket Logic:**
```typescript
function calculateAluminumBrackets(section: FenceSection): BracketCalculation {
  const railsPerSection = section.height_ft <= 4 ? 2 : 3
  const bracketsPerSection = railsPerSection * 2 * 2  // 2 rails × 2 ends × 2 brackets
  
  return {
    bracket_count: section.section_count * bracketsPerSection,
    self_tapping_screws: section.section_count * bracketsPerSection * 2
  }
}
```

**Gate Logic:**
```typescript
function calculateAluminumGate(gate: Gate): GateBOM {
  const lines = []
  
  // Factory-assembled gate
  lines.push({
    description: `${gate.width_ft}' × ${gate.height_ft}' aluminum gate`,
    sku_template: 'GATE_AL_{style}_{width}_{height}_{color}',
    quantity: 1
  })
  
  // Self-closing hinges (pool code)
  if (gate.pool_code_compliant) {
    lines.push({
      description: 'Self-closing aluminum hinge',
      quantity: 2
    })
  } else {
    lines.push({
      description: 'Standard aluminum hinge',
      quantity: 2
    })
  }
  
  // Magna-latch (pool code compliant)
  if (gate.pool_code_compliant) {
    lines.push({
      description: 'Magna-latch (pool code)',
      quantity: 1
    })
  } else {
    lines.push({
      description: 'Standard aluminum latch',
      quantity: 1
    })
  }
  
  return { lines }
}
```

**Concrete:**
- 2"×2" aluminum post in 10" hole, 30" deep = 2-3 bags

**Special Rules:**
- Pool code: picket spacing must be <4", self-closing hinges, magna-latch ≥54" high
- ADA gates: 36" clear opening, ≤5 lbs force, lever hardware
- Powder coat finish (no field finishing required)

---

### 4.5 Steel/Wrought Iron Module

Similar to aluminum but with critical differences:

**Post Configuration:**
```typescript
function calculateSteelPosts(section: FenceSection): SteelCalculation {
  // Steel is heavier — requires larger posts and deeper embedment
  const postSize = section.height_ft <= 5 ? '2x2' : '3x3'
  const embedmentDepth = 42  // Always deep for weight
  
  return {
    post_config: `STEEL_TUBE_${postSize}_${section.height_ft + 3}FT`,
    concrete_bags_per_post: 4,  // Heavier than aluminum
    embedment_depth_inches: embedmentDepth
  }
}
```

**Finishing Requirement:**
```typescript
function steelFinishingRequired(section: FenceSection): FinishingBOM {
  // ALL steel must be finished or it rusts
  const finish = section.finish_type || 'powder_coat_factory'
  
  if (finish === 'field_finish') {
    // Field finishing = primer + 2 coats enamel
    const squareFeet = section.length_ft * section.height_ft * 1.3  // Posts/rails overhead
    const primerGallons = Math.ceil(squareFeet / 350)
    const paintGallons = Math.ceil(squareFeet / 350) * 2
    
    return {
      primer: { gallons: primerGallons },
      enamel: { gallons: paintGallons },
      warranty_years: 3-5
    }
  }
  
  // Factory: hot-dipped galvanized + powder coat (15-25 yr warranty)
  return { finish: 'factory', warranty_years: 20 }
}
```

**Gate Support:**
```typescript
function calculateSteelGate(gate: Gate): GateBOM {
  const lines = []
  
  // Wide gates need wheel support (steel is heavy)
  if (gate.width_ft > 6) {
    lines.push({
      description: 'Heavy-duty gate wheel',
      required: true,
      note: 'Steel gates >6ft will sag without wheel support'
    })
  }
  
  // Automated gates
  if (gate.automated) {
    lines.push({
      description: 'Gate operator motor',
      sku_template: 'MOTOR_GATE_{swing_type}',
      price_range: [500, 2000]
    })
    lines.push({ description: 'Photo eyes (pair)', quantity: 1 })
    lines.push({ description: 'Keypad entry', quantity: 1 })
    lines.push({ description: 'Battery backup', quantity: 1 })
  }
  
  return { lines }
}
```

---

### 4.6 Composite Module (Trex, SimTek)

**Trex Seclusions (Field-Assembled):**
```typescript
function calculateTrexSeclusions(section: FenceSection): TrexCalculation {
  // 8' wide panels, field-assembled
  const panelWidth = 8
  const panelCount = Math.ceil(section.length_ft / panelWidth)
  
  // 12 boards per 6' panel
  const boardsPerPanel = 12
  
  return {
    posts: {
      sku: 'TREX_POST_5X5_GALV_SLEEVE',
      quantity: panelCount + 1,
      note: 'Galvanized steel core with composite sleeve'
    },
    boards: {
      sku: 'TREX_BOARD_6FT',
      quantity: panelCount * boardsPerPanel
    },
    rails: {
      sku: 'TREX_RAIL_CHANNEL_8FT',
      quantity: panelCount * 2
    },
    brackets: {
      sku: 'TREX_BRACKET',
      quantity: panelCount * 4
    },
    caps: {
      sku: 'TREX_POST_CAP_5X5',
      quantity: panelCount + 1
    }
  }
}
```

**SimTek (Pre-Cast Panels):**
```typescript
function calculateSimTek(section: FenceSection): SimTekCalculation {
  // 6' wide pre-cast stone panels
  const panelWidth = 6
  const panelCount = Math.floor(section.length_ft / panelWidth)
  
  return {
    posts: {
      sku: 'SIMTEK_POST_5X5_STONE',
      quantity: panelCount + 1,
      note: 'Steel core with polymer stone shell'
    },
    panels: {
      sku: `SIMTEK_PANEL_6X${section.height_ft}_STONE`,
      quantity: panelCount,
      weight_per_panel_lbs: 90,
      install_note: 'Two-person minimum per panel'
    },
    concrete: {
      bags_per_post: 4,
      note: '5x5 steel in 12" hole'
    }
  }
}
```

---

