/**
 * CALC-008: Gate Hardware Resolver
 * Generate complete hardware BOM for walk gates
 * Ensures no missing hardware - impossible by design
 */

import type { Gate } from './types'

export interface GateHardwareBOMLine {
  category: 'gate' | 'hardware'
  description: string
  quantity: number
  calculation_notes: string
  gate_id: string
}

/**
 * Resolve complete hardware package for a gate
 *
 * @param gate - Gate specification
 * @returns Complete BOM lines for gate hardware
 *
 * Walk gate hardware:
 * - Metal gate frame kit (1)
 * - Heavy-duty hinges (2)
 * - Gate latch (1)
 * - Gate wheel kit (1, if width > 6ft)
 * - Pickets for gate fill (calculated from width)
 */
export function resolveGateHardware(
  gate: Gate,
  fence_height_ft: number = 6
): GateHardwareBOMLine[] {
  const lines: GateHardwareBOMLine[] = []

  // Validate gate type
  if (gate.gate_type !== 'walk') {
    throw new Error(`Phase 1 only supports walk gates. Got: ${gate.gate_type}`)
  }

  // 1. Gate frame kit
  lines.push({
    category: 'gate',
    description: `${gate.width_ft}ft Metal Gate Frame Kit`,
    quantity: 1,
    calculation_notes: `Frame for ${gate.width_ft}ft walk gate`,
    gate_id: gate.id
  })

  // 2. Gate hinges (always 2 for walk gates)
  lines.push({
    category: 'hardware',
    description: '12" Heavy-Duty T-Hinge',
    quantity: 2,
    calculation_notes: `2 hinges for ${gate.width_ft}ft gate`,
    gate_id: gate.id
  })

  // 3. Gate latch
  lines.push({
    category: 'hardware',
    description: 'Gravity Gate Latch',
    quantity: 1,
    calculation_notes: `Latch for ${gate.width_ft}ft gate`,
    gate_id: gate.id
  })

  // 4. Gate wheel (required for gates > 6ft)
  if (gate.width_ft > 6) {
    lines.push({
      category: 'hardware',
      description: 'Adjustable Gate Wheel',
      quantity: 1,
      calculation_notes: `Wheel required for ${gate.width_ft}ft gate (prevents sagging)`,
      gate_id: gate.id
    })
  }

  // 5. Pickets for gate fill
  const pickets_for_gate = calculateGatePickets(gate.width_ft, fence_height_ft)
  lines.push({
    category: 'gate',
    description: `1x6x${fence_height_ft}' PT Picket (Gate Fill)`,
    quantity: pickets_for_gate.quantity,
    calculation_notes: pickets_for_gate.notes,
    gate_id: gate.id
  })

  return lines
}

/**
 * Calculate pickets needed for gate fill
 */
function calculateGatePickets(
  gate_width_ft: number,
  fence_height_ft: number
): { quantity: number; notes: string } {
  // 1x6 actual width = 5.5"
  const picket_width_in = 5.5

  // Gate opening width in inches
  const gate_width_in = gate_width_ft * 12

  // Privacy style - boards touching
  const quantity = Math.ceil(gate_width_in / picket_width_in)

  const notes = `${gate_width_ft}ft gate ÷ 5.5" picket width = ${quantity} pickets`

  return { quantity, notes }
}

/**
 * Resolve hardware for all gates
 */
export function resolveAllGates(
  gates: Gate[],
  fence_height_ft: number = 6
): GateHardwareBOMLine[] {
  const allLines: GateHardwareBOMLine[] = []

  gates.forEach(gate => {
    const gateLines = resolveGateHardware(gate, fence_height_ft)
    allLines.push(...gateLines)
  })

  return allLines
}

/**
 * Aggregate gate hardware by description
 * Combines multiple gates into summary lines
 */
export function aggregateGateHardware(
  lines: GateHardwareBOMLine[]
): Array<{
  category: 'gate' | 'hardware'
  description: string
  quantity: number
  calculation_notes: string
}> {
  const aggregated = new Map<string, {
    category: 'gate' | 'hardware'
    quantity: number
    notes: string[]
  }>()

  lines.forEach(line => {
    const key = `${line.category}:${line.description}`

    if (aggregated.has(key)) {
      const existing = aggregated.get(key)!
      existing.quantity += line.quantity
      existing.notes.push(line.calculation_notes)
    } else {
      aggregated.set(key, {
        category: line.category,
        quantity: line.quantity,
        notes: [line.calculation_notes]
      })
    }
  })

  // Convert to array
  const result: Array<{
    category: 'gate' | 'hardware'
    description: string
    quantity: number
    calculation_notes: string
  }> = []

  aggregated.forEach((value, key) => {
    const [category, description] = key.split(':')

    result.push({
      category: category as 'gate' | 'hardware',
      description,
      quantity: value.quantity,
      calculation_notes: value.notes.join('; ')
    })
  })

  return result
}
