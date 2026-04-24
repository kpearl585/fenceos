/**
 * CALC-005: Rail Calculator
 * Calculate rails based on height and bay count
 * Track waste from offcuts
 */

import type { FenceSection } from './types'

export interface RailCalculation {
  total_rails: number
  rails_per_bay: number
  rail_length_ft: number
  raw_quantity: number
  waste_factor: number
  waste_quantity: number
  calculation_notes: string
}

/**
 * Calculate rails for fence sections
 *
 * @param sections - Optimized fence sections with bay_count
 * @param height_ft - Fence height (4, 6, or 8)
 * @returns Rail calculation with waste
 *
 * Rules:
 * - 4ft fence → 2 rails/bay
 * - 6ft fence → 3 rails/bay
 * - 8ft fence → 4 rails/bay
 *
 * Rail lengths: prefer 8ft, use 10ft if spacing > 7.5ft
 * Waste calculated from: (rail_length - actual_spacing) × total_rails
 */
export function calculateRails(
  sections: FenceSection[],
  height_ft: 4 | 6 | 8
): RailCalculation {
  // Validate sections have bay_count
  const invalidSections = sections.filter(s => !s.bay_count || !s.post_spacing_ft)
  if (invalidSections.length > 0) {
    throw new Error('All sections must have bay_count and post_spacing_ft set. Run spacing optimizer first.')
  }

  // Rails per bay based on height
  let rails_per_bay: number
  if (height_ft === 4) {
    rails_per_bay = 2
  } else if (height_ft === 6) {
    rails_per_bay = 3
  } else if (height_ft === 8) {
    rails_per_bay = 4
  } else {
    throw new Error(`Invalid height: ${height_ft}. Must be 4, 6, or 8.`)
  }

  // Calculate total bays
  const total_bays = sections.reduce((sum, s) => sum + (s.bay_count || 0), 0)

  // Total rails needed
  const total_rails = total_bays * rails_per_bay

  // Determine optimal rail length
  // Use average spacing across all sections
  const avg_spacing = sections.reduce((sum, s) => sum + (s.post_spacing_ft || 0), 0) / sections.length

  // Available rail lengths: 8ft, 10ft, 12ft, 16ft
  // For Phase 1: Use 8ft if spacing <= 7.5ft, 10ft if spacing > 7.5ft
  const rail_length_ft = avg_spacing <= 7.5 ? 8 : 10

  // Calculate waste
  // Waste per rail = rail_length - avg_spacing
  const waste_per_rail_ft = Math.max(0, rail_length_ft - avg_spacing)
  const total_waste_ft = waste_per_rail_ft * total_rails
  const total_rail_material_ft = rail_length_ft * total_rails
  const waste_factor = total_rail_material_ft > 0 ? total_waste_ft / total_rail_material_ft : 0

  const raw_quantity = total_rails
  const waste_quantity = Math.ceil(total_rails * waste_factor)

  const calculation_notes =
    `${total_bays} bays × ${rails_per_bay} rails/bay = ${total_rails} rails (${rail_length_ft}ft lengths). ` +
    `Avg spacing: ${avg_spacing.toFixed(2)}ft, waste: ${(waste_factor * 100).toFixed(1)}%`

  return {
    total_rails,
    rails_per_bay,
    rail_length_ft,
    raw_quantity,
    waste_factor,
    waste_quantity,
    calculation_notes
  }
}

/**
 * Generate BOM line for rails
 */
export interface RailBOMLine {
  category: 'rail'
  description: string
  raw_quantity: number
  waste_factor: number
  waste_quantity: number
  order_quantity: number
  calculation_notes: string
}

export function generateRailBOMLine(
  calculation: RailCalculation
): RailBOMLine {
  return {
    category: 'rail',
    description: `2x4x${calculation.rail_length_ft}' PT Rail`,
    raw_quantity: calculation.raw_quantity,
    waste_factor: calculation.waste_factor,
    waste_quantity: calculation.waste_quantity,
    order_quantity: calculation.raw_quantity + calculation.waste_quantity,
    calculation_notes: calculation.calculation_notes
  }
}
