/**
 * CALC-009: BOM Assembler
 * Aggregates all calculations into unified BOM
 * Includes insurance quantities and calculation_notes on every line
 */

import type { PostBOMLine } from './post-calculator'
import type { RailBOMLine } from './rail-calculator'
import type { PicketBOMLine } from './picket-calculator'
import type { ConcreteBOMLine } from './concrete-calculator'
import type { GateHardwareBOMLine } from './gate-hardware-resolver'

export interface BOMLine {
  category: 'post' | 'rail' | 'picket' | 'concrete' | 'gate' | 'hardware' | 'accessory'
  description: string
  raw_quantity: number
  waste_quantity?: number
  insurance_quantity?: number
  order_quantity: number
  calculation_notes: string
  sort_order: number
}

export interface BOM {
  total_line_count: number
  lines: BOMLine[]
  summary: {
    total_posts: number
    total_rails: number
    total_pickets: number
    total_concrete_bags: number
    total_gates: number
  }
}

/**
 * Insurance quantity rules
 */
const INSURANCE_RULES = {
  posts: 2, // Always add 2 spare posts
  concrete_pct: 5, // 5% overage on concrete
  pickets_pct: 2, // Already included in waste factor
  rails_pct: 0 // Waste already calculated
}

/**
 * Assemble complete BOM from all calculations
 *
 * @param inputs - All calculation results
 * @returns Unified BOM with all materials
 */
export function assembleBOM(inputs: {
  posts: PostBOMLine[]
  rails: RailBOMLine
  pickets: PicketBOMLine
  concrete: ConcreteBOMLine
  gates: GateHardwareBOMLine[]
  hardware?: Array<{
    category: 'hardware' | 'accessory'
    description: string
    quantity: number
    calculation_notes: string
  }>
}): BOM {
  const lines: BOMLine[] = []
  let sort_order = 0

  // 1. Posts (with insurance)
  const total_raw_posts = inputs.posts.reduce((sum, p) => sum + p.raw_quantity, 0)
  const insurance_posts = INSURANCE_RULES.posts

  inputs.posts.forEach(post => {
    lines.push({
      category: 'post',
      description: post.description,
      raw_quantity: post.raw_quantity,
      insurance_quantity: 0, // Insurance added as separate line below
      order_quantity: post.raw_quantity,
      calculation_notes: post.calculation_notes,
      sort_order: sort_order++
    })
  })

  // Add insurance posts as separate line for clarity
  lines.push({
    category: 'post',
    description: '4x4x8\' PT Post (Insurance/Spare)',
    raw_quantity: 0,
    insurance_quantity: insurance_posts,
    order_quantity: insurance_posts,
    calculation_notes: `${insurance_posts} spare posts (insurance against damage/defects)`,
    sort_order: sort_order++
  })

  // 2. Rails
  lines.push({
    category: 'rail',
    description: inputs.rails.description,
    raw_quantity: inputs.rails.raw_quantity,
    waste_quantity: inputs.rails.waste_quantity,
    order_quantity: inputs.rails.order_quantity,
    calculation_notes: inputs.rails.calculation_notes,
    sort_order: sort_order++
  })

  // 3. Pickets
  lines.push({
    category: 'picket',
    description: inputs.pickets.description,
    raw_quantity: inputs.pickets.raw_quantity,
    waste_quantity: inputs.pickets.waste_quantity,
    order_quantity: inputs.pickets.order_quantity,
    calculation_notes: inputs.pickets.calculation_notes,
    sort_order: sort_order++
  })

  // 4. Concrete
  lines.push({
    category: 'concrete',
    description: inputs.concrete.description,
    raw_quantity: inputs.concrete.raw_quantity,
    insurance_quantity: inputs.concrete.overage_quantity,
    order_quantity: inputs.concrete.order_quantity,
    calculation_notes: inputs.concrete.calculation_notes,
    sort_order: sort_order++
  })

  // 5. Gate hardware
  inputs.gates.forEach(gate => {
    lines.push({
      category: gate.category,
      description: gate.description,
      raw_quantity: gate.quantity,
      order_quantity: gate.quantity,
      calculation_notes: gate.calculation_notes,
      sort_order: sort_order++
    })
  })

  // 6. Additional hardware (post caps, brackets, fasteners)
  if (inputs.hardware) {
    inputs.hardware.forEach(item => {
      lines.push({
        category: item.category,
        description: item.description,
        raw_quantity: item.quantity,
        order_quantity: item.quantity,
        calculation_notes: item.calculation_notes,
        sort_order: sort_order++
      })
    })
  }

  // Calculate summary
  const summary = {
    total_posts: total_raw_posts + insurance_posts,
    total_rails: inputs.rails.order_quantity,
    total_pickets: inputs.pickets.order_quantity,
    total_concrete_bags: inputs.concrete.order_quantity,
    total_gates: inputs.gates.filter(g => g.category === 'gate' && g.description.includes('Frame')).length
  }

  return {
    total_line_count: lines.length,
    lines,
    summary
  }
}

/**
 * Add standard hardware to BOM
 * Post caps, fence brackets, fasteners
 */
export function generateStandardHardware(
  total_posts: number,
  total_bays: number
): Array<{
  category: 'hardware' | 'accessory'
  description: string
  quantity: number
  calculation_notes: string
}> {
  return [
    {
      category: 'accessory',
      description: '4x4 Pyramid Post Cap',
      quantity: total_posts,
      calculation_notes: `1 cap per post × ${total_posts} posts`
    },
    {
      category: 'hardware',
      description: 'Metal Rail Bracket (2-pack)',
      quantity: Math.ceil(total_bays * 6), // 6 brackets per bay (3 rails × 2 sides)
      calculation_notes: `${total_bays} bays × 6 brackets/bay (3 rails × 2 sides)`
    },
    {
      category: 'hardware',
      description: '2.5" Deck Screws (1000ct box)',
      quantity: Math.ceil((total_posts * 20 + total_bays * 10) / 1000), // Rough estimate
      calculation_notes: `Estimated ${total_posts * 20 + total_bays * 10} screws ÷ 1000/box`
    }
  ]
}

/**
 * Sort BOM lines by category priority
 */
export function sortBOMLines(lines: BOMLine[]): BOMLine[] {
  const categoryOrder: Record<string, number> = {
    post: 1,
    rail: 2,
    picket: 3,
    concrete: 4,
    gate: 5,
    hardware: 6,
    accessory: 7
  }

  return [...lines].sort((a, b) => {
    const categoryDiff = (categoryOrder[a.category] || 99) - (categoryOrder[b.category] || 99)
    if (categoryDiff !== 0) return categoryDiff

    return a.sort_order - b.sort_order
  })
}
