/**
 * CALC-001: Design Graph Builder
 * Converts linear footage + corners + gates into FenceNode[] and FenceSection[]
 * Pure function - no side effects, no database calls
 */

import type { FenceDesignInput, DesignGraphResult, FenceNode, FenceSection, Gate } from './types'

/**
 * Build fence graph from user input
 *
 * @param input - User-provided fence parameters
 * @param designId - UUID for the fence design (will be created separately)
 * @returns Graph with nodes, sections, and gates
 *
 * Algorithm:
 * 1. Create end nodes at 0ft and total_linear_feet
 * 2. Distribute corners evenly along the fence line (if not specified)
 * 3. Create gate nodes at specified positions
 * 4. Create sections connecting consecutive nodes
 * 5. Sort everything by position
 */
export function buildDesignGraph(
  input: FenceDesignInput,
  designId: string
): DesignGraphResult {
  const { total_linear_feet, corner_count, gates: gateInputs } = input

  // Validate input
  if (total_linear_feet <= 0) {
    throw new Error('total_linear_feet must be positive')
  }
  if (corner_count < 0) {
    throw new Error('corner_count cannot be negative')
  }

  const nodes: FenceNode[] = []
  const sections: FenceSection[] = []
  const gates: Gate[] = []

  // Track positions of special nodes
  const positions: number[] = []

  // 1. Create end nodes
  positions.push(0)
  positions.push(total_linear_feet)

  // 2. Distribute corners evenly if not specified
  // For Phase 1: Simple even distribution
  if (corner_count > 0) {
    const spacing = total_linear_feet / (corner_count + 1)
    for (let i = 1; i <= corner_count; i++) {
      positions.push(spacing * i)
    }
  }

  // 3. Add gate positions
  // Each gate creates TWO posts: hinge post (left) and latch post (right)
  // Gate width is split evenly: hinge at position - width/2, latch at position + width/2
  gateInputs.forEach((gateInput, index) => {
    // If position not specified, distribute evenly
    const centerPosition = gateInput.position_ft ??
      (total_linear_feet * (index + 1)) / (gateInputs.length + 1)

    const halfWidth = gateInput.width_ft / 2

    // Create hinge post (left side of gate)
    const hingePosition = centerPosition - halfWidth
    positions.push(hingePosition)

    // Create latch post (right side of gate)
    const latchPosition = centerPosition + halfWidth
    positions.push(latchPosition)

    // Create gate record (position is center, but posts are at +/- width/2)
    gates.push({
      id: `gate-${index}`,
      design_id: designId,
      gate_type: 'walk', // Phase 1: walk gates only
      width_ft: gateInput.width_ft,
      position_ft: centerPosition,
      hinge_post_id: '', // Will be set below
      latch_post_id: ''  // Will be set below
    })
  })

  // 4. Sort positions and create nodes
  const sortedPositions = [...new Set(positions)].sort((a, b) => a - b)

  sortedPositions.forEach((position, index) => {
    // Determine initial node type (will be refined by node typer)
    let node_type: FenceNode['node_type'] = 'line_post'

    if (position === 0 || position === total_linear_feet) {
      node_type = 'end_post'
    } else if (positions.filter(p => p === position).length > 1) {
      // Multiple references to same position = corner or gate
      node_type = 'corner_post'
    }

    // Check if this is a gate post (hinge or latch)
    // Gate posts are at position +/- width/2 from gate center
    const isGatePost = gates.some(g => {
      const halfWidth = g.width_ft / 2
      const hingePos = g.position_ft! - halfWidth
      const latchPos = g.position_ft! + halfWidth
      return Math.abs(position - hingePos) < 0.01 || Math.abs(position - latchPos) < 0.01
    })

    if (isGatePost) {
      node_type = 'gate_post'
    }

    nodes.push({
      id: `node-${index}`,
      design_id: designId,
      node_type,
      position_ft: position
    })
  })

  // 5. Create sections connecting consecutive nodes
  // IMPORTANT: Gate posts (hinge and latch) are nodes in the graph.
  // A section between two gate posts of the same gate is the gate opening (skip it).
  // Otherwise, create a fence section.
  for (let i = 0; i < nodes.length - 1; i++) {
    const startNode = nodes[i]
    const endNode = nodes[i + 1]

    // Check if both nodes are posts of the same gate
    const gateSpanning = gates.find(g =>
      (g.hinge_post_id === startNode.id && g.latch_post_id === endNode.id) ||
      (g.latch_post_id === startNode.id && g.hinge_post_id === endNode.id)
    )

    if (gateSpanning) {
      // This is a gate opening, not a fence section - skip it
      continue
    }

    const length_ft = endNode.position_ft - startNode.position_ft

    // Only create section if it has positive length
    if (length_ft > 0.1) {
      sections.push({
        id: `section-${i}`,
        design_id: designId,
        start_node_id: startNode.id,
        end_node_id: endNode.id,
        length_ft,
        sort_order: i
      })
    }
  }

  // Link gate posts to gates
  gates.forEach(gate => {
    const halfWidth = gate.width_ft / 2
    const hingePos = gate.position_ft! - halfWidth
    const latchPos = gate.position_ft! + halfWidth

    // Find hinge post (left side)
    const hingeNode = nodes.find(n => Math.abs(n.position_ft - hingePos) < 0.01)
    if (hingeNode) {
      gate.hinge_post_id = hingeNode.id
    }

    // Find latch post (right side)
    const latchNode = nodes.find(n => Math.abs(n.position_ft - latchPos) < 0.01)
    if (latchNode) {
      gate.latch_post_id = latchNode.id
    }
  })

  return {
    nodes,
    sections,
    gates
  }
}

/**
 * Validate section lengths sum to total
 */
export function validateGraphTotals(
  result: DesignGraphResult,
  expectedTotal: number
): boolean {
  const sectionTotal = result.sections.reduce((sum, s) => sum + s.length_ft, 0)
  const tolerance = 0.1 // Allow 0.1ft variance

  return Math.abs(sectionTotal - expectedTotal) <= tolerance
}
