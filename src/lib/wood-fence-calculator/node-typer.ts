/**
 * CALC-002: Node Typer
 * Classifies each FenceNode as line_post, corner_post, end_post, or gate_post
 * Assigns appropriate PostConfig based on node type
 * Pure function - refines node classification based on topology
 */

import type { FenceNode, FenceSection, PostSize } from './types'

/**
 * Classify and configure nodes based on graph topology
 *
 * @param nodes - Nodes from graph builder
 * @param sections - Sections connecting nodes
 * @returns Updated nodes with node_type and post_config_id assigned
 *
 * Rules:
 * - Nodes with 1 connection → end_post
 * - Nodes with 2 linear connections → line_post
 * - Nodes with 2+ non-linear connections → corner_post
 * - Nodes marked as gate_post stay as gate_post
 * - Gate posts get 6x6 size, all others get 4x4
 */
export function classifyAndConfigureNodes(
  nodes: FenceNode[],
  sections: FenceSection[]
): FenceNode[] {
  return nodes.map(node => {
    // Build connection map
    const connections = sections.filter(
      s => s.start_node_id === node.id || s.end_node_id === node.id
    )

    const connectionCount = connections.length

    // Preserve gate_post classification
    if (node.node_type === 'gate_post') {
      return {
        ...node,
        post_size: '6x6',
        post_config_id: '6x6_gate_wood'
      }
    }

    // Classify based on connection count
    let node_type: FenceNode['node_type'] = 'line_post'
    let post_size: PostSize = '4x4'

    if (connectionCount === 1) {
      // Terminal node
      node_type = 'end_post'
    } else if (connectionCount === 2) {
      // Check if connections are linear (straight run) or corner
      const angle = calculateAngleBetweenSections(node, sections, nodes)

      if (angle !== null && (angle < 170 || angle > 190)) {
        // Non-linear connection = corner
        node_type = 'corner_post'
      } else {
        // Linear connection = line post
        node_type = 'line_post'
      }
    } else if (connectionCount > 2) {
      // Tee junction or complex corner
      node_type = 'tee_post'
    }

    // Assign post config based on type
    const post_config_id = getPostConfigId(node_type, post_size)

    return {
      ...node,
      node_type,
      post_size,
      post_config_id
    }
  })
}

/**
 * Calculate angle between two sections meeting at a node
 * Returns angle in degrees (0-360) or null if cannot determine
 *
 * For Phase 1: Since we only have linear position_ft (not x/y coordinates),
 * we determine if sections are collinear by checking if they share the same
 * "direction" along the fence line. If both sections extend in the same
 * direction (increasing or decreasing position), it's a line post (180°).
 * Otherwise, it's a corner (90°).
 */
function calculateAngleBetweenSections(
  node: FenceNode,
  sections: FenceSection[],
  allNodes: FenceNode[]
): number | null {
  const connectedSections = sections.filter(
    s => s.start_node_id === node.id || s.end_node_id === node.id
  )

  if (connectedSections.length !== 2) {
    return null
  }

  // Get the adjacent node positions for each section
  const section1 = connectedSections[0]
  const section2 = connectedSections[1]

  // Find the other node in each section (not the current node)
  const getOtherNodePosition = (section: FenceSection): number | null => {
    const otherNodeId = section.start_node_id === node.id
      ? section.end_node_id
      : section.start_node_id

    const otherNode = allNodes.find(n => n.id === otherNodeId)
    return otherNode ? otherNode.position_ft : null
  }

  const pos1 = getOtherNodePosition(section1)
  const pos2 = getOtherNodePosition(section2)

  if (pos1 === null || pos2 === null) {
    return null
  }

  // Check if the three positions are collinear (all increasing or all decreasing)
  // If node is between pos1 and pos2, it's a line post
  const currentPos = node.position_ft
  const isCollinear =
    (pos1 < currentPos && currentPos < pos2) ||
    (pos2 < currentPos && currentPos < pos1)

  if (isCollinear) {
    // Straight line - return 180 degrees
    return 180
  }

  // Not collinear - assume 90 degree corner for Phase 1
  return 90
}

/**
 * Get post config ID based on node type and post size
 */
function getPostConfigId(node_type: FenceNode['node_type'], post_size: PostSize): string {
  if (post_size === '6x6') {
    return '6x6_gate_wood'
  }

  // 4x4 posts
  switch (node_type) {
    case 'line_post':
      return '4x4_line_wood'
    case 'corner_post':
      return '4x4_corner_wood'
    case 'end_post':
      return '4x4_end_wood'
    case 'tee_post':
      return '4x4_corner_wood' // Treat tee as corner for Phase 1
    default:
      return '4x4_line_wood'
  }
}

/**
 * Count posts by type for summary
 */
export function countPostsByType(nodes: FenceNode[]): {
  line_4x4: number
  corner_4x4: number
  end_4x4: number
  gate_6x6: number
  total: number
} {
  const counts = {
    line_4x4: 0,
    corner_4x4: 0,
    end_4x4: 0,
    gate_6x6: 0,
    total: 0
  }

  nodes.forEach(node => {
    if (node.post_size === '6x6') {
      counts.gate_6x6++
    } else if (node.node_type === 'line_post') {
      counts.line_4x4++
    } else if (node.node_type === 'corner_post' || node.node_type === 'tee_post') {
      counts.corner_4x4++
    } else if (node.node_type === 'end_post') {
      counts.end_4x4++
    }

    counts.total++
  })

  return counts
}
