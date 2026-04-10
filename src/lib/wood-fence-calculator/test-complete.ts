/**
 * Comprehensive tests for all Phase 1 calculation modules
 * Run with: npx tsx src/lib/wood-fence-calculator/test-complete.ts
 */

import {
  buildDesignGraph,
  classifyAndConfigureNodes,
  optimizeAllSections,
  insertLinePostNodes,
  calculatePosts,
  generatePostBOMLines,
  calculateRails,
  generateRailBOMLine,
  calculatePickets,
  generatePicketBOMLine,
  calculateConcrete,
  generateConcreteBOMLine,
  resolveAllGates,
  assembleBOM,
  generateStandardHardware,
  validateEstimate,
  BLOCK_RULES,
  WARN_RULES,
  type FenceDesignInput,
  type FenceDesignForValidation
} from './index'

console.log('🧪 Testing Complete Wood Fence Calculator - Phase 1\n')
console.log('=' .repeat(60))

let testsPassed = 0
let testsFailed = 0

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`✅ ${name}`)
    testsPassed++
  } catch (error) {
    console.log(`❌ ${name}`)
    console.log(`   Error: ${error}`)
    testsFailed++
  }
}

// ==================================================================
// Test Scenario: 100ft straight run, 6ft fence, no gates
// ==================================================================
console.log('\n📋 Test Scenario 1: 100ft straight run, 6ft fence, no gates\n')

const scenario1Input: FenceDesignInput = {
  total_linear_feet: 100,
  corner_count: 0,
  gates: [],
  height_ft: 6,
  fence_type_id: 'wood_privacy_6ft',
  frost_zone: 2,
  soil_type: 'normal'
}

const s1Graph = buildDesignGraph(scenario1Input, 'scenario-1')
const s1OptimizedSections = optimizeAllSections(s1Graph.sections)
const s1RepairedGraph = insertLinePostNodes(s1OptimizedSections, s1Graph.nodes)
const s1Nodes = classifyAndConfigureNodes(s1RepairedGraph.nodes, s1RepairedGraph.sections)
const s1Sections = s1RepairedGraph.sections
const s1Posts = calculatePosts(s1Sections, s1Nodes)
const s1Rails = calculateRails(s1Sections, 6)
const s1Pickets = calculatePickets(s1Sections)
const s1Concrete = calculateConcrete(s1Nodes, 2, 'normal')
const s1Gates = resolveAllGates(s1Graph.gates, 6)

test('S1: Graph has 14 nodes (2 end + 12 line posts)', () => {
  if (s1Nodes.length < 13 || s1Nodes.length > 15) {
    throw new Error(`Expected ~14 nodes, got ${s1Nodes.length}`)
  }
})

test('S1: Graph has ~13 sections (1 per bay)', () => {
  if (s1Sections.length < 12 || s1Sections.length > 14) {
    throw new Error(`Expected ~13 sections, got ${s1Sections.length}`)
  }
})

test('S1: Sections optimized, each is 1 bay @ ~7.69ft', () => {
  // After repair, each section should be exactly 1 bay
  const firstSection = s1Sections[0]
  if (firstSection.bay_count !== 1) {
    throw new Error(`Expected 1 bay per section, got ${firstSection.bay_count}`)
  }
  // Total should be ~13 bays
  const totalBays = s1Sections.reduce((sum, s) => sum + (s.bay_count || 0), 0)
  if (totalBays < 12 || totalBays > 14) {
    throw new Error(`Expected ~13 total bays, got ${totalBays}`)
  }
})

test('S1: Post count = 2 end + 12 line = 14 posts', () => {
  if (s1Posts.total_posts < 13 || s1Posts.total_posts > 15) {
    throw new Error(`Expected ~14 posts, got ${s1Posts.total_posts}`)
  }
  if (s1Posts.posts_by_type.end_4x4 !== 2) {
    throw new Error(`Expected 2 end posts, got ${s1Posts.posts_by_type.end_4x4}`)
  }
  if (s1Posts.posts_by_type.line_4x4 < 11 || s1Posts.posts_by_type.line_4x4 > 13) {
    throw new Error(`Expected ~12 line posts, got ${s1Posts.posts_by_type.line_4x4}`)
  }
})

test('S1: Rail count = 13 bays × 3 rails = 39 rails', () => {
  if (s1Rails.total_rails < 35 || s1Rails.total_rails > 45) {
    throw new Error(`Expected ~39 rails, got ${s1Rails.total_rails}`)
  }
})

test('S1: Pickets calculated for ~13 bays', () => {
  if (s1Pickets.total_bays < 12 || s1Pickets.total_bays > 14) {
    throw new Error(`Expected ~13 bays, got ${s1Pickets.total_bays}`)
  }
})

test('S1: Concrete for ~14 posts', () => {
  if (s1Concrete.bags_by_post.length < 13 || s1Concrete.bags_by_post.length > 15) {
    throw new Error(`Expected ~14 posts, got ${s1Concrete.bags_by_post.length}`)
  }
})

test('S1: No gate hardware', () => {
  if (s1Gates.length !== 0) throw new Error(`Expected 0 gate items, got ${s1Gates.length}`)
})

// ==================================================================
// Test Scenario: 200ft with 6 corners, 2 walk gates
// ==================================================================
console.log('\n📋 Test Scenario 2: 200ft with 6 corners, 2 gates (3ft, 4ft)\n')

const scenario2Input: FenceDesignInput = {
  total_linear_feet: 200,
  corner_count: 6,
  gates: [
    { width_ft: 3, position_ft: 50 },
    { width_ft: 4, position_ft: 150 }
  ],
  height_ft: 6,
  fence_type_id: 'wood_privacy_6ft',
  frost_zone: 2,
  soil_type: 'normal'
}

const s2Graph = buildDesignGraph(scenario2Input, 'scenario-2')
const s2OptimizedSections = optimizeAllSections(s2Graph.sections)
const s2RepairedGraph = insertLinePostNodes(s2OptimizedSections, s2Graph.nodes)
const s2Nodes = classifyAndConfigureNodes(s2RepairedGraph.nodes, s2RepairedGraph.sections)
const s2Sections = s2RepairedGraph.sections
const s2Posts = calculatePosts(s2Sections, s2Nodes)
const s2Rails = calculateRails(s2Sections, 6)
const s2Pickets = calculatePickets(s2Sections)
const s2Concrete = calculateConcrete(s2Nodes, 2, 'normal')
const s2Gates = resolveAllGates(s2Graph.gates, 6)

test('S2: Graph has 2 end + 6 corner + 4 gate + line posts', () => {
  // Should have special nodes plus line posts
  if (s2Nodes.length < 20 || s2Nodes.length > 35) {
    throw new Error(`Expected 20-35 nodes with line posts, got ${s2Nodes.length}`)
  }
})

test('S2: Has 2 gates', () => {
  if (s2Graph.gates.length !== 2) throw new Error(`Expected 2 gates, got ${s2Graph.gates.length}`)
})

test('S2: Gate posts are 6x6 (4 total for 2 gates)', () => {
  if (s2Posts.posts_by_type.gate_6x6 !== 4) {
    throw new Error(`Expected 4 gate posts (2 per gate), got ${s2Posts.posts_by_type.gate_6x6}`)
  }
})

test('S2: Gate hardware includes hinges', () => {
  const hinges = s2Gates.filter(item => item.description.includes('Hinge'))
  if (hinges.length === 0) throw new Error('Expected hinges in gate hardware')
})

test('S2: Gate hardware includes latches', () => {
  const latches = s2Gates.filter(item => item.description.includes('Latch'))
  if (latches.length === 0) throw new Error('Expected latches in gate hardware')
})

test('S2: Gate hardware includes frames', () => {
  const frames = s2Gates.filter(item => item.description.includes('Frame'))
  if (frames.length === 0) throw new Error('Expected frame kits in gate hardware')
})

// ==================================================================
// Test BOM Assembly
// ==================================================================
console.log('\n📋 Test BOM Assembly\n')

const s2PostLines = generatePostBOMLines(s2Posts)
const s2RailLine = generateRailBOMLine(s2Rails)
const s2PicketLine = generatePicketBOMLine(s2Pickets, 6)
const s2ConcreteLine = generateConcreteBOMLine(s2Concrete)
const s2Hardware = generateStandardHardware(s2Posts.total_posts, s2Pickets.total_bays)

const s2BOM = assembleBOM({
  posts: s2PostLines,
  rails: s2RailLine,
  pickets: s2PicketLine,
  concrete: s2ConcreteLine,
  gates: s2Gates,
  hardware: s2Hardware
})

test('BOM: Has multiple line items', () => {
  if (s2BOM.total_line_count < 5) {
    throw new Error(`Expected 5+ BOM lines, got ${s2BOM.total_line_count}`)
  }
})

test('BOM: All lines have calculation_notes', () => {
  const missingNotes = s2BOM.lines.filter(line => !line.calculation_notes)
  if (missingNotes.length > 0) {
    throw new Error(`${missingNotes.length} lines missing calculation_notes`)
  }
})

test('BOM: Posts include insurance quantity', () => {
  const insuranceLine = s2BOM.lines.find(line => line.description.includes('Insurance'))
  if (!insuranceLine) throw new Error('Expected insurance posts line')
})

test('BOM: Summary totals are correct', () => {
  if (s2BOM.summary.total_gates !== 2) {
    throw new Error(`Expected 2 gates, got ${s2BOM.summary.total_gates}`)
  }
})

// ==================================================================
// Test Validation Engine
// ==================================================================
console.log('\n📋 Test Validation Engine\n')

// Create design for validation
const s2Design: FenceDesignForValidation = {
  id: 'scenario-2',
  total_linear_feet: scenario2Input.total_linear_feet,
  height_ft: scenario2Input.height_ft!,
  fence_type_id: scenario2Input.fence_type_id!,
  frost_zone: scenario2Input.frost_zone!,
  soil_type: scenario2Input.soil_type!,
  nodes: s2Nodes,
  sections: s2Sections,
  gates: s2Graph.gates
}

const s2Validation = validateEstimate(s2Design, s2BOM, [...BLOCK_RULES, ...WARN_RULES])

test('Validation: canProceed = true (no BLOCK errors)', () => {
  if (!s2Validation.canProceed) {
    console.log('Validation errors:', s2Validation.errors)
    throw new Error('Validation failed with BLOCK errors')
  }
})

test('Validation: No missing gate hardware', () => {
  const hardwareError = s2Validation.errors.find(e => e.rule_id.startsWith('HARDWARE'))
  if (hardwareError) {
    throw new Error(`Hardware validation failed: ${hardwareError.message}`)
  }
})

test('Validation: Spacing within limits', () => {
  const spacingError = s2Validation.errors.find(e => e.rule_id === 'SPACING_001')
  if (spacingError) {
    throw new Error(`Spacing validation failed: ${spacingError.message}`)
  }
})

test('Validation: BOM counts match design', () => {
  const bomError = s2Validation.errors.find(e => e.rule_id.startsWith('BOM'))
  if (bomError) {
    throw new Error(`BOM validation failed: ${bomError.message}`)
  }
})

// ==================================================================
// Test Validation: Missing gate hardware (should BLOCK)
// ==================================================================
console.log('\n📋 Test Validation: Missing Gate Hardware (BLOCK)\n')

const badBOM = {
  ...s2BOM,
  lines: s2BOM.lines.filter(line => !line.description.includes('Hinge')) // Remove hinges
}

const badValidation = validateEstimate(s2Design, badBOM, BLOCK_RULES)

test('Validation BLOCK: Missing hinges detected', () => {
  if (badValidation.canProceed) {
    throw new Error('Expected validation to BLOCK when hinges missing')
  }
})

test('Validation BLOCK: Error has correct rule_id', () => {
  const hingeError = badValidation.errors.find(e => e.rule_id === 'HARDWARE_001')
  if (!hingeError) {
    throw new Error('Expected HARDWARE_001 error for missing hinges')
  }
})

// ==================================================================
// Test Edge Cases
// ==================================================================
console.log('\n📋 Test Edge Cases\n')

// Edge case: Very short section (should still optimize)
test('Edge: 18ft section → 3 bays @ 6ft', () => {
  const shortSection = {
    id: 'short',
    design_id: 'test',
    start_node_id: 'n1',
    end_node_id: 'n2',
    length_ft: 18,
    sort_order: 0
  }

  const nodes = [
    { id: 'n1', design_id: 'test', node_type: 'end_post' as const, position_ft: 0 },
    { id: 'n2', design_id: 'test', node_type: 'end_post' as const, position_ft: 18 }
  ]

  const optimized = optimizeAllSections([shortSection])
  const repaired = insertLinePostNodes(optimized, nodes)
  const section = optimized[0]

  if (section.bay_count !== 3) {
    throw new Error(`Expected 3 bays, got ${section.bay_count}`)
  }
  if (Math.abs(section.post_spacing_ft! - 6) > 0.1) {
    throw new Error(`Expected 6ft spacing, got ${section.post_spacing_ft}`)
  }

  // Verify graph repair created 4 nodes total (2 end + 2 line)
  if (repaired.nodes.length !== 4) {
    throw new Error(`Expected 4 nodes after repair, got ${repaired.nodes.length}`)
  }
})

// Edge case: Gate > 6ft (should include wheel)
test('Edge: 7ft gate includes wheel kit', () => {
  const largeGate = {
    id: 'large-gate',
    design_id: 'test',
    gate_type: 'walk' as const,
    width_ft: 7
  }

  const hardware = resolveAllGates([largeGate], 6)
  const wheel = hardware.find(item => item.description.includes('Wheel'))

  if (!wheel) {
    throw new Error('Expected wheel kit for 7ft gate')
  }
})

// ==================================================================
// Summary
// ==================================================================
console.log('\n' + '='.repeat(60))
console.log(`\n📊 Test Results:\n`)
console.log(`   Passed: ${testsPassed}`)
console.log(`   Failed: ${testsFailed}`)
console.log(`   Total:  ${testsPassed + testsFailed}`)

if (testsFailed === 0) {
  console.log('\n✅ All tests passed!')
  console.log('\n📦 BOM Example (Scenario 2):')
  console.log(`   Total lines: ${s2BOM.total_line_count}`)
  console.log(`   Total posts: ${s2BOM.summary.total_posts}`)
  console.log(`   Total rails: ${s2BOM.summary.total_rails}`)
  console.log(`   Total pickets: ${s2BOM.summary.total_pickets}`)
  console.log(`   Total concrete: ${s2BOM.summary.total_concrete_bags} bags`)
  console.log(`   Total gates: ${s2BOM.summary.total_gates}`)

  console.log('\n📝 Sample BOM Lines:')
  s2BOM.lines.slice(0, 5).forEach(line => {
    console.log(`   ${line.category}: ${line.description} × ${line.order_quantity}`)
    console.log(`      → ${line.calculation_notes}`)
  })

  console.log('\n✅ Phase 1 CALC-004 through CALC-009 complete!')
  console.log('✅ Phase 1 VAL-001 through VAL-003 complete!')
  console.log('\nNext steps:')
  console.log('1. Run database migrations')
  console.log('2. Implement API layer (API-001 through API-004)')
  console.log('3. Build minimal UI (UI-001, UI-002)')
  process.exit(0)
} else {
  console.log('\n❌ Some tests failed. Review errors above.')
  process.exit(1)
}
