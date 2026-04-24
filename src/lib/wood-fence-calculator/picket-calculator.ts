/**
 * CALC-006: Picket Calculator
 * Calculate pickets for privacy style (no gap)
 * Track waste from defects and design geometry
 */

import type { FenceSection } from './types'

export interface PicketCalculation {
  pickets_per_bay: number
  total_bays: number
  raw_quantity: number
  waste_factor: number
  waste_quantity: number
  order_quantity: number
  calculation_notes: string
}

/**
 * Calculate pickets for fence sections
 *
 * @param sections - Optimized fence sections with bay_count and post_spacing_ft
 * @param style - Picket style ('privacy' for Phase 1)
 * @param picket_width_in - Actual picket width (default: 5.5" for 1x6)
 * @param base_waste_pct - Base waste factor (default: 2% for defects)
 * @returns Picket calculation with waste
 *
 * Privacy style: boards touching, no gap
 * Waste sources:
 * - Base defect rate: 2%
 * - Additional waste can be added based on terrain/corners (future)
 */
export function calculatePickets(
  sections: FenceSection[],
  style: 'privacy' | 'semi_privacy' | 'board_on_board' = 'privacy',
  picket_width_in: number = 5.5, // 1x6 actual width
  base_waste_pct: number = 2 // 2% defect rate
): PicketCalculation {
  // Validate sections
  const invalidSections = sections.filter(s => !s.bay_count || !s.post_spacing_ft)
  if (invalidSections.length > 0) {
    throw new Error('All sections must have bay_count and post_spacing_ft set.')
  }

  // Calculate total bays
  const total_bays = sections.reduce((sum, s) => sum + (s.bay_count || 0), 0)

  // Calculate average spacing
  const total_spacing = sections.reduce(
    (sum, s) => sum + (s.post_spacing_ft || 0) * (s.bay_count || 0),
    0
  )
  const avg_spacing_ft = total_bays > 0 ? total_spacing / total_bays : 0

  // Calculate pickets per bay based on style
  let pickets_per_bay: number

  if (style === 'privacy') {
    // No gap - boards touching
    const bay_width_in = avg_spacing_ft * 12
    pickets_per_bay = Math.ceil(bay_width_in / picket_width_in)
  } else if (style === 'semi_privacy') {
    // 1" gap between boards
    const gap_in = 1
    const bay_width_in = avg_spacing_ft * 12
    pickets_per_bay = Math.ceil(bay_width_in / (picket_width_in + gap_in))
  } else if (style === 'board_on_board') {
    // Front + back, offset
    const gap_in = 1
    const bay_width_in = avg_spacing_ft * 12
    const front_boards = Math.ceil(bay_width_in / (picket_width_in + gap_in))
    pickets_per_bay = front_boards * 2
  } else {
    throw new Error(`Unsupported picket style: ${style}`)
  }

  // Raw quantity
  const raw_quantity = pickets_per_bay * total_bays

  // Waste calculation
  // Phase 1: Base defect rate only
  // Future: Add corner waste, terrain waste
  const waste_factor = base_waste_pct / 100

  const waste_quantity = Math.ceil(raw_quantity * waste_factor)
  const order_quantity = raw_quantity + waste_quantity

  const calculation_notes =
    `${total_bays} bays × ${pickets_per_bay} pickets/bay = ${raw_quantity} pickets. ` +
    `${picket_width_in}" width, ${style} style, avg spacing: ${avg_spacing_ft.toFixed(2)}ft. ` +
    `Waste: ${base_waste_pct}% (defects) = +${waste_quantity} → ${order_quantity} total`

  return {
    pickets_per_bay,
    total_bays,
    raw_quantity,
    waste_factor,
    waste_quantity,
    order_quantity,
    calculation_notes
  }
}

/**
 * Generate BOM line for pickets
 */
export interface PicketBOMLine {
  category: 'picket'
  description: string
  raw_quantity: number
  waste_factor: number
  waste_quantity: number
  order_quantity: number
  calculation_notes: string
}

export function generatePicketBOMLine(
  calculation: PicketCalculation,
  height_ft: number = 6
): PicketBOMLine {
  return {
    category: 'picket',
    description: `1x6x${height_ft}' PT Picket (Dog-Ear)`,
    raw_quantity: calculation.raw_quantity,
    waste_factor: calculation.waste_factor,
    waste_quantity: calculation.waste_quantity,
    order_quantity: calculation.order_quantity,
    calculation_notes: calculation.calculation_notes
  }
}
