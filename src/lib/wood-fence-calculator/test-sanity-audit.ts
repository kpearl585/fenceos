/**
 * SANITY AUDIT: Wood Privacy MVP Estimator
 * Critical validation that outputs are install-realistic
 * Run with: npx tsx src/lib/wood-fence-calculator/test-sanity-audit.ts
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

interface TestScenario {
  name: string
  input: FenceDesignInput
  expectedMinPosts?: number
  expectedMaxPosts?: number
  expectedMinRails?: number
  expectedMaxRails?: number
}

const scenarios: TestScenario[] = [
  {
    name: 'Scenario 1: 100ft straight, no gates',
    input: {
      total_linear_feet: 100,
      corner_count: 0,
      gates: [],
      height_ft: 6,
      fence_type_id: 'wood_privacy_6ft',
      frost_zone: 2,
      soil_type: 'normal'
    },
    expectedMinPosts: 13, // 100ft / 8ft max = 12.5 bays = 13 bays @ 7.69ft = 14 posts
    expectedMaxPosts: 14,
    expectedMinRails: 36, // 13 bays × 3 rails = 39
    expectedMaxRails: 42
  },
  {
    name: 'Scenario 2: 100ft straight, 1 walk gate (4ft)',
    input: {
      total_linear_feet: 100,
      corner_count: 0,
      gates: [{ width_ft: 4, position_ft: 50 }],
      height_ft: 6,
      fence_type_id: 'wood_privacy_6ft',
      frost_zone: 2,
      soil_type: 'normal'
    },
    expectedMinPosts: 13, // Similar to above but 2 gate posts (6x6)
    expectedMaxPosts: 15
  },
  {
    name: 'Scenario 3: 150ft rectangle, 4 corners, 1 gate',
    input: {
      total_linear_feet: 150,
      corner_count: 4,
      gates: [{ width_ft: 3, position_ft: 75 }],
      height_ft: 6,
      fence_type_id: 'wood_privacy_6ft',
      frost_zone: 2,
      soil_type: 'normal'
    },
    expectedMinPosts: 20, // 4 corners + 2 ends + 2 gate + line posts
    expectedMaxPosts: 25
  },
  {
    name: 'Scenario 4: 200ft irregular, 6 corners, 2 gates',
    input: {
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
    },
    expectedMinPosts: 26, // 6 corners + 2 ends + 4 gate + line posts between
    expectedMaxPosts: 32
  },
  {
    name: 'Scenario 5: 200ft straight, no corners, 2 gates',
    input: {
      total_linear_feet: 200,
      corner_count: 0,
      gates: [
        { width_ft: 3, position_ft: 66 },
        { width_ft: 4, position_ft: 133 }
      ],
      height_ft: 6,
      fence_type_id: 'wood_privacy_6ft',
      frost_zone: 2,
      soil_type: 'normal'
    },
    expectedMinPosts: 28, // 193ft fence + 7ft gates = 200ft
    expectedMaxPosts: 30  // 2 end + 4 gate (2 per gate) + ~23 line = 29 posts
  },
  {
    name: 'Scenario 6: 80ft small backyard, 2 corners, 1 gate',
    input: {
      total_linear_feet: 80,
      corner_count: 2,
      gates: [{ width_ft: 3, position_ft: 40 }],
      height_ft: 6,
      fence_type_id: 'wood_privacy_6ft',
      frost_zone: 2,
      soil_type: 'normal'
    },
    expectedMinPosts: 12,
    expectedMaxPosts: 15
  },
  {
    name: 'Scenario 7: 250ft multi-corner perimeter',
    input: {
      total_linear_feet: 250,
      corner_count: 8,
      gates: [],
      height_ft: 6,
      fence_type_id: 'wood_privacy_6ft',
      frost_zone: 2,
      soil_type: 'normal'
    },
    expectedMinPosts: 32, // 250ft / 8ft = 31 bays + corners
    expectedMaxPosts: 40
  },
  {
    name: 'Scenario 8: 100ft straight, 4ft height',
    input: {
      total_linear_feet: 100,
      corner_count: 0,
      gates: [],
      height_ft: 4,
      fence_type_id: 'wood_privacy_4ft',
      frost_zone: 2,
      soil_type: 'normal'
    },
    expectedMinPosts: 13,
    expectedMaxPosts: 14,
    expectedMinRails: 24, // 4ft fence = 2 rails/bay
    expectedMaxRails: 28
  },
  {
    name: 'Scenario 9: Edge case - 24ft section (perfect fit)',
    input: {
      total_linear_feet: 24,
      corner_count: 0,
      gates: [],
      height_ft: 6,
      fence_type_id: 'wood_privacy_6ft',
      frost_zone: 2,
      soil_type: 'normal'
    },
    expectedMinPosts: 4, // 24ft / 8ft = 3 bays = 4 posts
    expectedMaxPosts: 4,
    expectedMinRails: 9, // 3 bays × 3 rails = 9
    expectedMaxRails: 9
  },
  {
    name: 'Scenario 10: Edge case - 26ft section (stub avoidance)',
    input: {
      total_linear_feet: 26,
      corner_count: 0,
      gates: [],
      height_ft: 6,
      fence_type_id: 'wood_privacy_6ft',
      frost_zone: 2,
      soil_type: 'normal'
    },
    expectedMinPosts: 5, // 26ft → 4 bays @ 6.5ft = 5 posts
    expectedMaxPosts: 5,
    expectedMinRails: 12, // 4 bays × 3 rails = 12
    expectedMaxRails: 12
  }
]

console.log('=' .repeat(80))
console.log('WOOD PRIVACY MVP ESTIMATOR - SANITY AUDIT')
console.log('=' .repeat(80))
console.log('')

let totalTests = 0
let passedTests = 0
let failedTests = 0
const failures: string[] = []

scenarios.forEach((scenario, index) => {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`${scenario.name}`)
  console.log('='.repeat(80))

  const { input } = scenario

  console.log('\n📥 INPUT:')
  console.log(`  Linear feet: ${input.total_linear_feet}ft`)
  console.log(`  Corners: ${input.corner_count}`)
  console.log(`  Gates: ${input.gates.length} (${input.gates.map(g => g.width_ft + 'ft').join(', ')})`)
  console.log(`  Height: ${input.height_ft}ft`)

  // Run calculation with graph repair
  const graph = buildDesignGraph(input, `scenario-${index + 1}`)
  const optimizedSections = optimizeAllSections(graph.sections)

  // CRITICAL FIX: Insert line post nodes after spacing optimization
  const repairedGraph = insertLinePostNodes(optimizedSections, graph.nodes)

  const typedNodes = classifyAndConfigureNodes(repairedGraph.nodes, repairedGraph.sections)
  const posts = calculatePosts(repairedGraph.sections, typedNodes)
  const rails = calculateRails(repairedGraph.sections, input.height_ft!)
  const pickets = calculatePickets(repairedGraph.sections)
  const concrete = calculateConcrete(typedNodes, input.frost_zone!, input.soil_type)
  const gates = resolveAllGates(graph.gates, input.height_ft!)

  const postLines = generatePostBOMLines(posts)
  const railLine = generateRailBOMLine(rails)
  const picketLine = generatePicketBOMLine(pickets, input.height_ft!)
  const concreteLine = generateConcreteBOMLine(concrete)
  const hardware = generateStandardHardware(posts.total_posts, pickets.total_bays)

  const bom = assembleBOM({
    posts: postLines,
    rails: railLine,
    pickets: picketLine,
    concrete: concreteLine,
    gates,
    hardware
  })

  console.log('\n📊 GRAPH:')
  console.log(`  Nodes: ${typedNodes.length}`)
  typedNodes.forEach((node, i) => {
    console.log(`    [${i}] ${node.node_type} @ ${node.position_ft}ft (${node.post_size || '4x4'})`)
  })

  console.log('\n📏 SECTIONS:')
  optimizedSections.forEach((section, i) => {
    console.log(`    [${i}] ${section.length_ft}ft → ${section.bay_count} bays @ ${section.post_spacing_ft?.toFixed(2)}ft`)
  })

  console.log('\n🏗️  MATERIALS:')
  console.log(`  Posts by type:`)
  console.log(`    Line (4x4): ${posts.posts_by_type.line_4x4}`)
  console.log(`    Corner (4x4): ${posts.posts_by_type.corner_4x4}`)
  console.log(`    End (4x4): ${posts.posts_by_type.end_4x4}`)
  console.log(`    Gate (6x6): ${posts.posts_by_type.gate_6x6}`)
  console.log(`    TOTAL POSTS: ${posts.total_posts}`)

  console.log(`  Rails: ${rails.total_rails} (${rails.rails_per_bay} per bay)`)
  console.log(`  Pickets: ${pickets.order_quantity} (${pickets.raw_quantity} + ${pickets.waste_quantity} waste)`)
  console.log(`  Concrete: ${concrete.total_bags_order} bags (${concrete.total_bags_raw} + ${concrete.overage_bags} overage)`)
  console.log(`  Gate hardware items: ${gates.length}`)

  console.log('\n📦 BOM:')
  console.log(`  Total BOM lines: ${bom.total_line_count}`)
  console.log(`  Summary:`)
  console.log(`    Posts: ${bom.summary.total_posts}`)
  console.log(`    Rails: ${bom.summary.total_rails}`)
  console.log(`    Pickets: ${bom.summary.total_pickets}`)
  console.log(`    Concrete: ${bom.summary.total_concrete_bags} bags`)
  console.log(`    Gates: ${bom.summary.total_gates}`)

  // Run validations
  const design: FenceDesignForValidation = {
    id: `scenario-${index + 1}`,
    total_linear_feet: input.total_linear_feet,
    height_ft: input.height_ft!,
    fence_type_id: input.fence_type_id!,
    frost_zone: input.frost_zone!,
    soil_type: input.soil_type!,
    nodes: typedNodes,
    sections: repairedGraph.sections,
    gates: graph.gates
  }

  const validation = validateEstimate(design, bom, [...BLOCK_RULES, ...WARN_RULES])

  console.log('\n✅ VALIDATION:')
  console.log(`  Can proceed: ${validation.canProceed ? 'YES' : 'NO'}`)
  console.log(`  Errors (BLOCK): ${validation.errors.length}`)
  console.log(`  Warnings: ${validation.warnings.length}`)

  if (validation.errors.length > 0) {
    validation.errors.forEach(err => {
      console.log(`    ❌ ${err.rule_id}: ${err.message}`)
    })
  }

  if (validation.warnings.length > 0) {
    validation.warnings.forEach(warn => {
      console.log(`    ⚠️  ${warn.rule_id}: ${warn.message}`)
    })
  }

  // Assertions
  console.log('\n🧪 ASSERTIONS:')
  let scenarioPass = true

  // Post count assertions
  if (scenario.expectedMinPosts && posts.total_posts < scenario.expectedMinPosts) {
    console.log(`  ❌ FAIL: Total posts ${posts.total_posts} < expected minimum ${scenario.expectedMinPosts}`)
    failures.push(`${scenario.name}: Posts ${posts.total_posts} < ${scenario.expectedMinPosts}`)
    scenarioPass = false
    failedTests++
  } else if (scenario.expectedMaxPosts && posts.total_posts > scenario.expectedMaxPosts) {
    console.log(`  ❌ FAIL: Total posts ${posts.total_posts} > expected maximum ${scenario.expectedMaxPosts}`)
    failures.push(`${scenario.name}: Posts ${posts.total_posts} > ${scenario.expectedMaxPosts}`)
    scenarioPass = false
    failedTests++
  } else if (scenario.expectedMinPosts || scenario.expectedMaxPosts) {
    console.log(`  ✅ PASS: Posts ${posts.total_posts} within expected range [${scenario.expectedMinPosts || '?'}-${scenario.expectedMaxPosts || '?'}]`)
    passedTests++
  }
  totalTests++

  // Rail count assertions
  if (scenario.expectedMinRails && rails.total_rails < scenario.expectedMinRails) {
    console.log(`  ❌ FAIL: Total rails ${rails.total_rails} < expected minimum ${scenario.expectedMinRails}`)
    failures.push(`${scenario.name}: Rails ${rails.total_rails} < ${scenario.expectedMinRails}`)
    scenarioPass = false
    failedTests++
  } else if (scenario.expectedMaxRails && rails.total_rails > scenario.expectedMaxRails) {
    console.log(`  ❌ FAIL: Total rails ${rails.total_rails} > expected maximum ${scenario.expectedMaxRails}`)
    failures.push(`${scenario.name}: Rails ${rails.total_rails} > ${scenario.expectedMaxRails}`)
    scenarioPass = false
    failedTests++
  } else if (scenario.expectedMinRails || scenario.expectedMaxRails) {
    console.log(`  ✅ PASS: Rails ${rails.total_rails} within expected range [${scenario.expectedMinRails || '?'}-${scenario.expectedMaxRails || '?'}]`)
    passedTests++
  }
  totalTests++

  // Sanity checks
  if (input.height_ft === 6 && rails.rails_per_bay !== 3) {
    console.log(`  ❌ FAIL: 6ft fence should have 3 rails/bay, got ${rails.rails_per_bay}`)
    failures.push(`${scenario.name}: Wrong rails/bay for 6ft fence`)
    scenarioPass = false
    failedTests++
  } else if (input.height_ft === 4 && rails.rails_per_bay !== 2) {
    console.log(`  ❌ FAIL: 4ft fence should have 2 rails/bay, got ${rails.rails_per_bay}`)
    failures.push(`${scenario.name}: Wrong rails/bay for 4ft fence`)
    scenarioPass = false
    failedTests++
  } else {
    console.log(`  ✅ PASS: Rails per bay correct for ${input.height_ft}ft fence`)
    passedTests++
  }
  totalTests++

  if (scenarioPass) {
    console.log('\n✅ SCENARIO PASSED')
  } else {
    console.log('\n❌ SCENARIO FAILED')
  }
})

// Final summary
console.log('\n' + '='.repeat(80))
console.log('AUDIT SUMMARY')
console.log('='.repeat(80))
console.log(`\nTotal assertions: ${totalTests}`)
console.log(`Passed: ${passedTests} ✅`)
console.log(`Failed: ${failedTests} ❌`)

if (failures.length > 0) {
  console.log('\n❌ FAILURES:')
  failures.forEach(f => console.log(`  - ${f}`))
}

console.log('\n' + '='.repeat(80))
if (failedTests === 0) {
  console.log('✅ GO: Phase 1 engine is safe to expose via API')
  console.log('='.repeat(80))
  process.exit(0)
} else {
  console.log('🛑 NO-GO: Fix calculation bugs before API implementation')
  console.log('='.repeat(80))
  process.exit(1)
}
