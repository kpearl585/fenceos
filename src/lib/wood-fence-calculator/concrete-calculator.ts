/**
 * CALC-007: Concrete Calculator
 * Volumetric concrete calculation with frost zone and soil type adjustments
 */

import type { FenceNode, PostSize, SoilType } from './types'

export interface ConcreteCalculation {
  bags_by_post: Array<{
    node_id: string
    post_size: PostSize
    bags: number
  }>
  total_bags_raw: number
  overage_factor: number
  overage_bags: number
  total_bags_order: number
  calculation_notes: string
}

/**
 * Frost depth lookup by zone
 */
const FROST_DEPTHS: Record<number, number> = {
  1: 18, // Zone 1: 18" frost depth
  2: 30, // Zone 2: 30" frost depth
  3: 36, // Zone 3: 36" frost depth
  4: 48  // Zone 4: 48" frost depth
}

/**
 * Calculate concrete bags for all posts
 *
 * @param nodes - Fence nodes with post_size
 * @param frost_zone - Frost zone (1-4)
 * @param soil_type - Soil type (affects hole diameter)
 * @param overage_pct - Overage percentage (default: 5%)
 * @returns Concrete calculation with per-post and totals
 *
 * Formula:
 * 1. hole_volume = π × (diameter/2)² × depth (cubic inches)
 * 2. post_volume = actual_size² × depth (cubic inches)
 * 3. concrete_volume = (hole_volume - post_volume) / 1728 (cubic feet)
 * 4. bags = ceil(concrete_volume / 0.6) -- 80lb bag = 0.6 cu.ft
 *
 * Hole diameter adjustments:
 * - 4x4 post: 10" normal, 12" sandy
 * - 6x6 post: 12" normal, 14" sandy
 *
 * Depth: frost_depth + 6" (post extends 6" below frost line)
 */
export function calculateConcrete(
  nodes: FenceNode[],
  frost_zone: 1 | 2 | 3 | 4,
  soil_type: SoilType = 'normal',
  overage_pct: number = 5
): ConcreteCalculation {
  const frost_depth_in = FROST_DEPTHS[frost_zone]
  if (!frost_depth_in) {
    throw new Error(`Invalid frost zone: ${frost_zone}. Must be 1-4.`)
  }

  const bags_by_post: Array<{ node_id: string; post_size: PostSize; bags: number }> = []
  let total_bags_raw = 0

  nodes.forEach(node => {
    if (!node.post_size) {
      throw new Error(`Node ${node.id} missing post_size`)
    }

    const bags = calculateConcreteForPost(
      node.post_size,
      frost_depth_in,
      soil_type
    )

    bags_by_post.push({
      node_id: node.id,
      post_size: node.post_size,
      bags
    })

    total_bags_raw += bags
  })

  // Add overage
  const overage_factor = overage_pct / 100
  const overage_bags = Math.ceil(total_bags_raw * overage_factor)
  const total_bags_order = total_bags_raw + overage_bags

  // Count by post size for notes
  const bags_4x4 = bags_by_post.filter(p => p.post_size === '4x4')
  const bags_6x6 = bags_by_post.filter(p => p.post_size === '6x6')

  const total_4x4_bags = bags_4x4.reduce((sum, p) => sum + p.bags, 0)
  const total_6x6_bags = bags_6x6.reduce((sum, p) => sum + p.bags, 0)

  const calculation_notes =
    `Zone ${frost_zone} (${frost_depth_in}" frost + 6" = ${frost_depth_in + 6}" depth), ${soil_type} soil. ` +
    `${bags_4x4.length} × 4x4 posts = ${total_4x4_bags} bags, ` +
    `${bags_6x6.length} × 6x6 posts = ${total_6x6_bags} bags. ` +
    `Subtotal: ${total_bags_raw} bags + ${overage_pct}% overage = ${total_bags_order} bags`

  return {
    bags_by_post,
    total_bags_raw,
    overage_factor,
    overage_bags,
    total_bags_order,
    calculation_notes
  }
}

/**
 * Calculate concrete for a single post using volumetric formula
 */
function calculateConcreteForPost(
  post_size: PostSize,
  frost_depth_in: number,
  soil_type: SoilType
): number {
  // Post actual dimensions
  const actual_size_in = post_size === '4x4' ? 3.5 : 5.5

  // Hole diameter based on post size and soil type
  let hole_diameter_in: number
  if (post_size === '4x4') {
    hole_diameter_in = soil_type === 'sandy' ? 12 : 10
  } else {
    // 6x6
    hole_diameter_in = soil_type === 'sandy' ? 14 : 12
  }

  // Hole depth: frost depth + 6" below frost line
  const hole_depth_in = frost_depth_in + 6

  // Volumetric calculation
  const hole_radius_in = hole_diameter_in / 2
  const hole_volume_cu_in = Math.PI * hole_radius_in * hole_radius_in * hole_depth_in

  const post_volume_cu_in = actual_size_in * actual_size_in * hole_depth_in

  const concrete_volume_cu_in = hole_volume_cu_in - post_volume_cu_in
  const concrete_volume_cu_ft = concrete_volume_cu_in / 1728 // 1728 cu.in = 1 cu.ft

  // 80lb bag = 0.6 cu.ft
  const bags_per_cu_ft = 1 / 0.6
  const bags = Math.ceil(concrete_volume_cu_ft * bags_per_cu_ft)

  return bags
}

/**
 * Generate BOM line for concrete
 */
export interface ConcreteBOMLine {
  category: 'concrete'
  description: string
  raw_quantity: number
  overage_quantity: number
  order_quantity: number
  calculation_notes: string
}

export function generateConcreteBOMLine(
  calculation: ConcreteCalculation
): ConcreteBOMLine {
  return {
    category: 'concrete',
    description: '80lb Concrete Mix (bag)',
    raw_quantity: calculation.total_bags_raw,
    overage_quantity: calculation.overage_bags,
    order_quantity: calculation.total_bags_order,
    calculation_notes: calculation.calculation_notes
  }
}
