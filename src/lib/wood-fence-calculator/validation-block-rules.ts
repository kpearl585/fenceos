/**
 * VAL-002: BLOCK Validation Rules
 * Critical rules that prevent impossible states
 */

import type { ValidationRule } from './validation-engine'
import { createValidationError } from './validation-engine'

/**
 * HARDWARE_001: Gates exist but missing hinges
 */
export const validateGateHinges: ValidationRule = (design, bom) => {
  const gateCount = design.gates.length

  if (gateCount === 0) return null

  const hingeLines = bom.lines.filter(
    line => line.description.toLowerCase().includes('hinge')
  )

  const totalHinges = hingeLines.reduce((sum, line) => sum + line.order_quantity, 0)

  if (totalHinges === 0) {
    return createValidationError(
      'HARDWARE_001',
      'BLOCK',
      `${gateCount} gate(s) configured but no gate hinges in BOM. This is a calculation error.`,
      {
        affected_entity_type: 'bom',
        recommended_action: 'Check gate hardware resolver. All walk gates require 2 hinges.'
      }
    )
  }

  // Check minimum hinges (2 per gate)
  const expectedMinHinges = gateCount * 2
  if (totalHinges < expectedMinHinges) {
    return createValidationError(
      'HARDWARE_001',
      'BLOCK',
      `${gateCount} gate(s) require ${expectedMinHinges} hinges, but BOM only has ${totalHinges}.`,
      {
        affected_entity_type: 'bom',
        recommended_action: 'Each walk gate requires 2 hinges minimum.'
      }
    )
  }

  return null
}

/**
 * HARDWARE_002: Gates exist but missing latches
 */
export const validateGateLatches: ValidationRule = (design, bom) => {
  const gateCount = design.gates.length

  if (gateCount === 0) return null

  const latchLines = bom.lines.filter(
    line => line.description.toLowerCase().includes('latch')
  )

  const totalLatches = latchLines.reduce((sum, line) => sum + line.order_quantity, 0)

  if (totalLatches === 0) {
    return createValidationError(
      'HARDWARE_002',
      'BLOCK',
      `${gateCount} gate(s) configured but no gate latches in BOM.`,
      {
        affected_entity_type: 'bom',
        recommended_action: 'Each gate requires 1 latch.'
      }
    )
  }

  if (totalLatches < gateCount) {
    return createValidationError(
      'HARDWARE_002',
      'BLOCK',
      `${gateCount} gate(s) require ${gateCount} latches, but BOM only has ${totalLatches}.`,
      {
        affected_entity_type: 'bom',
        recommended_action: 'Each gate requires 1 latch.'
      }
    )
  }

  return null
}

/**
 * SPACING_001: Wood post spacing exceeds 8ft
 */
export const validateSpacing: ValidationRule = (design, bom) => {
  const maxSpacing = 8

  const invalidSections = design.sections.filter(
    section => section.post_spacing_ft && section.post_spacing_ft > maxSpacing
  )

  if (invalidSections.length > 0) {
    const section = invalidSections[0]
    return createValidationError(
      'SPACING_001',
      'BLOCK',
      `Section has post spacing of ${section.post_spacing_ft?.toFixed(2)}ft, which exceeds maximum ${maxSpacing}ft. Rails will sag.`,
      {
        affected_entity_type: 'section',
        affected_entity_id: section.id,
        recommended_action: 'Add intermediate posts or reduce section length.'
      }
    )
  }

  return null
}

/**
 * CONFIG_001: Nodes missing post config
 */
export const validatePostConfigs: ValidationRule = (design, bom) => {
  const nodesWithoutConfig = design.nodes.filter(node => !node.post_config_id)

  if (nodesWithoutConfig.length > 0) {
    const node = nodesWithoutConfig[0]
    return createValidationError(
      'CONFIG_001',
      'BLOCK',
      `Node ${node.id} (${node.node_type}) missing post_config_id. Cannot calculate materials.`,
      {
        affected_entity_type: 'node',
        affected_entity_id: node.id,
        recommended_action: 'Run node typer to assign post configs.'
      }
    )
  }

  return null
}

/**
 * BOM_001: BOM post count doesn't match graph node count
 */
export const validateBOMPostCount: ValidationRule = (design, bom) => {
  const nodeCount = design.nodes.length

  // Count posts in BOM (excluding insurance)
  const postLines = bom.lines.filter(
    line => line.category === 'post' && !line.description.toLowerCase().includes('insurance')
  )

  const bomPostCount = postLines.reduce((sum, line) => sum + line.raw_quantity, 0)

  // Allow small variance for rounding
  const variance = Math.abs(nodeCount - bomPostCount)

  if (variance > 1) {
    return createValidationError(
      'BOM_001',
      'BLOCK',
      `Design has ${nodeCount} nodes but BOM has ${bomPostCount} posts (variance: ${variance}). Calculation mismatch.`,
      {
        affected_entity_type: 'bom',
        recommended_action: 'Check post calculator. Each node should map to exactly one post.'
      }
    )
  }

  return null
}

/**
 * BOM_002: Rail count doesn't match bay count × rails/bay
 */
export const validateBOMRailCount: ValidationRule = (design, bom) => {
  const totalBays = design.sections.reduce((sum, s) => sum + (s.bay_count || 0), 0)

  // Rails per bay based on height
  let railsPerBay: number
  if (design.height_ft === 4) {
    railsPerBay = 2
  } else if (design.height_ft === 6) {
    railsPerBay = 3
  } else if (design.height_ft === 8) {
    railsPerBay = 4
  } else {
    return null // Can't validate unknown height
  }

  const expectedRails = totalBays * railsPerBay

  // Count rails in BOM
  const railLines = bom.lines.filter(line => line.category === 'rail')
  const bomRailCount = railLines.reduce((sum, line) => sum + line.raw_quantity, 0)

  const variance = Math.abs(expectedRails - bomRailCount)

  if (variance > railsPerBay) {
    // Allow variance of 1 bay worth of rails
    return createValidationError(
      'BOM_002',
      'BLOCK',
      `Design has ${totalBays} bays × ${railsPerBay} rails/bay = ${expectedRails} expected, but BOM has ${bomRailCount} rails (variance: ${variance}).`,
      {
        affected_entity_type: 'bom',
        recommended_action: 'Check rail calculator.'
      }
    )
  }

  return null
}

/**
 * GATE_001: Gates > 6ft without wheel kit
 */
export const validateGateWheelKit: ValidationRule = (design, bom) => {
  const largeGates = design.gates.filter(gate => gate.width_ft > 6)

  if (largeGates.length === 0) return null

  const wheelLines = bom.lines.filter(
    line => line.description.toLowerCase().includes('wheel')
  )

  const totalWheels = wheelLines.reduce((sum, line) => sum + line.order_quantity, 0)

  if (totalWheels < largeGates.length) {
    return createValidationError(
      'GATE_001',
      'BLOCK',
      `${largeGates.length} gate(s) > 6ft wide require wheel kits (prevents sagging), but BOM only has ${totalWheels}.`,
      {
        affected_entity_type: 'bom',
        recommended_action: 'Add gate wheel kit for each gate > 6ft.'
      }
    )
  }

  return null
}

/**
 * CONCRETE_001: Posts exist but no concrete in BOM
 */
export const validateConcreteExists: ValidationRule = (design, bom) => {
  const postCount = design.nodes.length

  if (postCount === 0) return null

  const concreteLines = bom.lines.filter(line => line.category === 'concrete')

  if (concreteLines.length === 0) {
    return createValidationError(
      'CONCRETE_001',
      'BLOCK',
      `Design has ${postCount} posts but no concrete in BOM. Posts require concrete.`,
      {
        affected_entity_type: 'bom',
        recommended_action: 'Run concrete calculator.'
      }
    )
  }

  const totalConcrete = concreteLines.reduce((sum, line) => sum + line.raw_quantity, 0)

  if (totalConcrete === 0) {
    return createValidationError(
      'CONCRETE_001',
      'BLOCK',
      `Design has ${postCount} posts but 0 bags of concrete in BOM.`,
      {
        affected_entity_type: 'bom',
        recommended_action: 'Check concrete calculator.'
      }
    )
  }

  return null
}

/**
 * All BLOCK rules
 */
export const BLOCK_RULES: ValidationRule[] = [
  validateGateHinges,
  validateGateLatches,
  validateSpacing,
  validatePostConfigs,
  validateBOMPostCount,
  validateBOMRailCount,
  validateGateWheelKit,
  validateConcreteExists
]
