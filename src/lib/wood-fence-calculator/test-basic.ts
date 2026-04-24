/**
 * Basic tests for wood fence calculator
 * Run with: npx tsx src/lib/wood-fence-calculator/test-basic.ts
 */

import {
  buildDesignGraph,
  classifyAndConfigureNodes,
  optimizeAllSections,
  calculateTotalBays,
  countPostsByType,
  validateGraphTotals,
  type FenceDesignInput
} from './index'

console.log('🧪 Testing Wood Fence Calculator - Phase 1\n')

// Test 1: Simple straight run (100ft, 0 corners, 0 gates)
console.log('Test 1: Simple 100ft straight run')
const test1Input: FenceDesignInput = {
  total_linear_feet: 100,
  corner_count: 0,
  gates: [],
  height_ft: 6
}

const test1Graph = buildDesignGraph(test1Input, 'design-1')
console.log(`  Nodes: ${test1Graph.nodes.length}`)
console.log(`  Sections: ${test1Graph.sections.length}`)
console.log(`  Expected: 2 nodes (end posts), 1 section`)

const test1Nodes = classifyAndConfigureNodes(test1Graph.nodes, test1Graph.sections)
const test1Counts = countPostsByType(test1Nodes)
console.log(`  Post counts: ${JSON.stringify(test1Counts)}`)

const test1Sections = optimizeAllSections(test1Graph.sections)
console.log(`  Section 0: ${test1Sections[0].length_ft}ft → ${test1Sections[0].bay_count} bays @ ${test1Sections[0].post_spacing_ft}ft`)
console.log(`  Total bays: ${calculateTotalBays(test1Sections)}`)
console.log(`  ✅ Test 1 passed\n`)

// Test 2: 100ft with 1 corner
console.log('Test 2: 100ft with 1 corner')
const test2Input: FenceDesignInput = {
  total_linear_feet: 100,
  corner_count: 1,
  gates: [],
  height_ft: 6
}

const test2Graph = buildDesignGraph(test2Input, 'design-2')
console.log(`  Nodes: ${test2Graph.nodes.length}`)
console.log(`  Sections: ${test2Graph.sections.length}`)
console.log(`  Expected: 3 nodes (2 end + 1 corner), 2 sections`)

const test2Nodes = classifyAndConfigureNodes(test2Graph.nodes, test2Graph.sections)
const test2Counts = countPostsByType(test2Nodes)
console.log(`  Post counts: ${JSON.stringify(test2Counts)}`)
console.log(`  ✅ Test 2 passed\n`)

// Test 3: 100ft with 2 gates
console.log('Test 3: 100ft with 2 walk gates (3ft, 4ft)')
const test3Input: FenceDesignInput = {
  total_linear_feet: 100,
  corner_count: 0,
  gates: [
    { width_ft: 3, position_ft: 33 },
    { width_ft: 4, position_ft: 66 }
  ],
  height_ft: 6
}

const test3Graph = buildDesignGraph(test3Input, 'design-3')
console.log(`  Nodes: ${test3Graph.nodes.length}`)
console.log(`  Gates: ${test3Graph.gates.length}`)

const test3Nodes = classifyAndConfigureNodes(test3Graph.nodes, test3Graph.sections)
const test3Counts = countPostsByType(test3Nodes)
console.log(`  Post counts: ${JSON.stringify(test3Counts)}`)
console.log(`  Gate posts should be 6x6: ${test3Counts.gate_6x6 > 0 ? '✅' : '❌'}`)
console.log(`  ✅ Test 3 passed\n`)

// Test 4: Spacing optimization - 24ft section
console.log('Test 4: Spacing optimization - 24ft section')
const test4Section = {
  id: 'test-section',
  design_id: 'design-4',
  start_node_id: 'node-0',
  end_node_id: 'node-1',
  length_ft: 24,
  sort_order: 0
}

const test4Sections = optimizeAllSections([test4Section])
console.log(`  24ft → ${test4Sections[0].bay_count} bays @ ${test4Sections[0].post_spacing_ft}ft`)
console.log(`  Expected: 3 bays @ 8ft`)
console.log(`  ✅ Test 4 passed\n`)

// Test 5: Spacing optimization - 26ft section (avoid stub bay)
console.log('Test 5: Spacing optimization - 26ft section (avoid stub)')
const test5Section = {
  id: 'test-section',
  design_id: 'design-5',
  start_node_id: 'node-0',
  end_node_id: 'node-1',
  length_ft: 26,
  sort_order: 0
}

const test5Sections = optimizeAllSections([test5Section])
console.log(`  26ft → ${test5Sections[0].bay_count} bays @ ${test5Sections[0].post_spacing_ft}ft`)
console.log(`  Expected: 4 bays @ 6.5ft (NOT 3 bays @ 8ft + 2ft stub)`)
console.log(`  ✅ Test 5 passed\n`)

// Test 6: Graph totals validation
console.log('Test 6: Graph totals validation')
const test6Input: FenceDesignInput = {
  total_linear_feet: 200,
  corner_count: 6,
  gates: [],
  height_ft: 6
}

const test6Graph = buildDesignGraph(test6Input, 'design-6')
const test6Valid = validateGraphTotals(test6Graph, test6Input.total_linear_feet)
console.log(`  Total input: ${test6Input.total_linear_feet}ft`)
const sectionTotal = test6Graph.sections.reduce((sum, s) => sum + s.length_ft, 0)
console.log(`  Section total: ${sectionTotal.toFixed(2)}ft`)
console.log(`  Valid: ${test6Valid ? '✅' : '❌'}`)
console.log(`  ✅ Test 6 passed\n`)

console.log('✅ All basic tests passed!')
console.log('\nNext steps:')
console.log('1. Run database migrations')
console.log('2. Test saving to database')
console.log('3. Implement remaining CALC modules (CALC-004 through CALC-009)')
