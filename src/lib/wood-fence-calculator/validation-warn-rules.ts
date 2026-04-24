/**
 * VAL-003: WARN Validation Rules
 * Best-practice alerts that don't prevent quote generation
 */

import type { ValidationRule } from './validation-engine'
import { createValidationError } from './validation-engine'

/**
 * POST_001: 6ft fence with fewer than 3 rails
 */
export const validateRailCount: ValidationRule = (design, bom) => {
  if (design.height_ft !== 6) return null

  const railLines = bom.lines.filter(line => line.category === 'rail')
  const totalRails = railLines.reduce((sum, line) => sum + line.raw_quantity, 0)

  const totalBays = design.sections.reduce((sum, s) => sum + (s.bay_count || 0), 0)

  if (totalBays === 0) return null

  const railsPerBay = totalRails / totalBays

  if (railsPerBay < 3) {
    return createValidationError(
      'POST_001',
      'WARN',
      `6ft fence should have 3 rails per bay for strength, but BOM shows ${railsPerBay.toFixed(1)} rails/bay.`,
      {
        affected_entity_type: 'bom',
        recommended_action: 'Verify rail calculation. 6ft fences typically use 3 horizontal rails.'
      }
    )
  }

  return null
}

/**
 * GATE_101: Walk gate on 4x4 posts (recommend 6x6)
 */
export const validateGatePostSize: ValidationRule = (design, bom) => {
  // Check if any gates are using 4x4 posts
  const gatesOn4x4 = design.gates.filter(gate => {
    // Find gate posts
    const hingePost = design.nodes.find(n => n.id === gate.hinge_post_id)
    const latchPost = design.nodes.find(n => n.id === gate.latch_post_id)

    return (
      (hingePost && hingePost.post_size === '4x4') ||
      (latchPost && latchPost.post_size === '4x4')
    )
  })

  if (gatesOn4x4.length > 0) {
    return createValidationError(
      'GATE_101',
      'WARN',
      `${gatesOn4x4.length} gate(s) using 4x4 posts. 6x6 posts recommended for gates to prevent sagging.`,
      {
        affected_entity_type: 'gate',
        recommended_action: 'Consider upgrading gate posts to 6x6 for better structural support.'
      }
    )
  }

  return null
}

/**
 * CONCRETE_101: Frost zone >= 3 with shallow depth
 */
export const validateConcreteDepth: ValidationRule = (design, bom) => {
  if (design.frost_zone < 3) return null

  // Frost zone 3+ should have depth >= 36"
  // Zone 3: 36" frost + 6" = 42" depth
  // Zone 4: 48" frost + 6" = 54" depth

  const minDepth = design.frost_zone === 3 ? 42 : 54

  // This is a WARN because the actual depth is in config
  // We're warning if the design is in a high frost zone
  return createValidationError(
    'CONCRETE_101',
    'WARN',
    `Frost zone ${design.frost_zone} requires ${minDepth}" hole depth. Verify concrete calculator is using correct depth.`,
    {
      affected_entity_type: 'design',
      recommended_action: `Ensure all posts are set to ${minDepth}" depth to prevent frost heave.`
    }
  )
}

/**
 * WASTE_101: High waste percentage (> 10%)
 */
export const validateWastePercentage: ValidationRule = (design, bom) => {
  const linesWithWaste = bom.lines.filter(
    line => line.waste_quantity && line.waste_quantity > 0
  )

  const highWasteLines = linesWithWaste.filter(line => {
    const wastePct = ((line.waste_quantity || 0) / line.raw_quantity) * 100
    return wastePct > 10
  })

  if (highWasteLines.length > 0) {
    const line = highWasteLines[0]
    const wastePct = (((line.waste_quantity || 0) / line.raw_quantity) * 100).toFixed(1)

    return createValidationError(
      'WASTE_101',
      'WARN',
      `${line.description} has ${wastePct}% waste factor. Review calculation for accuracy.`,
      {
        affected_entity_type: 'bom_line',
        recommended_action: 'High waste may indicate calculation error or unusual design geometry.'
      }
    )
  }

  return null
}

/**
 * PRICING_101: Placeholder for price/LF validation
 * Future: Check if total cost per linear foot is outside normal range
 */
export const validatePricePerLinearFoot: ValidationRule = (design, bom) => {
  // Placeholder for future implementation
  // Would check: total_cost / total_linear_feet against expected range
  // For now, always pass

  // Example implementation:
  // const costPerFt = totalCost / design.total_linear_feet
  // const expectedMin = 15 // $15/ft minimum
  // const expectedMax = 50 // $50/ft maximum
  //
  // if (costPerFt < expectedMin || costPerFt > expectedMax) {
  //   return createValidationError(
  //     'PRICING_101',
  //     'WARN',
  //     `Cost per linear foot ($${costPerFt.toFixed(2)}/ft) is outside typical range ($${expectedMin}-$${expectedMax}/ft).`,
  //     {
  //       affected_entity_type: 'bom',
  //       recommended_action: 'Review material costs and quantities.'
  //     }
  //   )
  // }

  return null
}

/**
 * SPACING_101: Spacing near minimum (< 6.5ft)
 */
export const validateMinimumSpacing: ValidationRule = (design, bom) => {
  const minComfortableSpacing = 6.5

  const tightSections = design.sections.filter(
    section =>
      section.post_spacing_ft &&
      section.post_spacing_ft < minComfortableSpacing &&
      section.post_spacing_ft >= 6 // Not a BLOCK error
  )

  if (tightSections.length > 0) {
    const section = tightSections[0]
    return createValidationError(
      'SPACING_101',
      'WARN',
      `Section has ${section.post_spacing_ft?.toFixed(2)}ft spacing, which is functional but tight. Consider ${minComfortableSpacing}ft+ for easier installation.`,
      {
        affected_entity_type: 'section',
        affected_entity_id: section.id,
        recommended_action: 'Tight spacing is structurally sound but may increase labor time.'
      }
    )
  }

  return null
}

/**
 * All WARN rules
 */
export const WARN_RULES: ValidationRule[] = [
  validateRailCount,
  validateGatePostSize,
  validateConcreteDepth,
  validateWastePercentage,
  validatePricePerLinearFoot,
  validateMinimumSpacing
]
