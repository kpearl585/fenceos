/**
 * CALC-004: Post Calculator
 * Count posts by type, handle shared nodes, generate BOM lines
 * Pure function - no database calls
 */

import type { FenceNode, FenceSection } from './types'

export interface PostCalculation {
  posts_by_type: {
    line_4x4: number
    corner_4x4: number
    end_4x4: number
    gate_6x6: number
  }
  total_posts: number
  nodes_by_type: {
    line_4x4: string[]
    corner_4x4: string[]
    end_4x4: string[]
    gate_6x6: string[]
  }
  shared_nodes: string[] // Node IDs counted once (corners between sections)
}

/**
 * Calculate posts from fence graph
 * Handles shared nodes correctly - corners counted once, not twice
 *
 * @param sections - Fence sections (for identifying shared nodes)
 * @param nodes - Classified nodes with post_size and node_type
 * @returns Post counts by type and node IDs for traceability
 */
export function calculatePosts(
  sections: FenceSection[],
  nodes: FenceNode[]
): PostCalculation {
  // Build map of node connections to identify shared nodes
  const nodeConnections = new Map<string, number>()

  sections.forEach(section => {
    nodeConnections.set(
      section.start_node_id,
      (nodeConnections.get(section.start_node_id) || 0) + 1
    )
    nodeConnections.set(
      section.end_node_id,
      (nodeConnections.get(section.end_node_id) || 0) + 1
    )
  })

  // Identify shared nodes (connected to 2+ sections)
  const shared_nodes: string[] = []
  nodeConnections.forEach((count, nodeId) => {
    if (count >= 2) {
      shared_nodes.push(nodeId)
    }
  })

  // Count unique posts by type
  const posts_by_type = {
    line_4x4: 0,
    corner_4x4: 0,
    end_4x4: 0,
    gate_6x6: 0
  }

  const nodes_by_type = {
    line_4x4: [] as string[],
    corner_4x4: [] as string[],
    end_4x4: [] as string[],
    gate_6x6: [] as string[]
  }

  // Count each node exactly once
  const counted = new Set<string>()

  nodes.forEach(node => {
    if (counted.has(node.id)) return
    counted.add(node.id)

    // Classify by type and size
    if (node.post_size === '6x6') {
      posts_by_type.gate_6x6++
      nodes_by_type.gate_6x6.push(node.id)
    } else if (node.node_type === 'line_post') {
      posts_by_type.line_4x4++
      nodes_by_type.line_4x4.push(node.id)
    } else if (node.node_type === 'corner_post' || node.node_type === 'tee_post') {
      posts_by_type.corner_4x4++
      nodes_by_type.corner_4x4.push(node.id)
    } else if (node.node_type === 'end_post') {
      posts_by_type.end_4x4++
      nodes_by_type.end_4x4.push(node.id)
    }
  })

  const total_posts =
    posts_by_type.line_4x4 +
    posts_by_type.corner_4x4 +
    posts_by_type.end_4x4 +
    posts_by_type.gate_6x6

  return {
    posts_by_type,
    total_posts,
    nodes_by_type,
    shared_nodes
  }
}

/**
 * Generate BOM lines for posts
 * Includes calculation_notes for traceability
 * Insurance/spare posts added separately in BOM assembler
 */
export interface PostBOMLine {
  category: 'post'
  description: string
  raw_quantity: number
  calculation_notes: string
  node_ids: string[] // For traceability
}

export function generatePostBOMLines(
  calculation: PostCalculation
): PostBOMLine[] {
  const lines: PostBOMLine[] = []

  // 4x4 Line Posts
  if (calculation.posts_by_type.line_4x4 > 0) {
    lines.push({
      category: 'post',
      description: '4x4x8\' PT Line Post',
      raw_quantity: calculation.posts_by_type.line_4x4,
      calculation_notes: `${calculation.posts_by_type.line_4x4} line posts`,
      node_ids: calculation.nodes_by_type.line_4x4
    })
  }

  // 4x4 Corner Posts
  if (calculation.posts_by_type.corner_4x4 > 0) {
    lines.push({
      category: 'post',
      description: '4x4x8\' PT Corner Post',
      raw_quantity: calculation.posts_by_type.corner_4x4,
      calculation_notes: `${calculation.posts_by_type.corner_4x4} corner posts`,
      node_ids: calculation.nodes_by_type.corner_4x4
    })
  }

  // 4x4 End Posts
  if (calculation.posts_by_type.end_4x4 > 0) {
    lines.push({
      category: 'post',
      description: '4x4x8\' PT End Post',
      raw_quantity: calculation.posts_by_type.end_4x4,
      calculation_notes: `${calculation.posts_by_type.end_4x4} end posts`,
      node_ids: calculation.nodes_by_type.end_4x4
    })
  }

  // 6x6 Gate Posts
  if (calculation.posts_by_type.gate_6x6 > 0) {
    lines.push({
      category: 'post',
      description: '6x6x8\' PT Gate Post',
      raw_quantity: calculation.posts_by_type.gate_6x6,
      calculation_notes: `${calculation.posts_by_type.gate_6x6} gate posts (6x6 for structural support)`,
      node_ids: calculation.nodes_by_type.gate_6x6
    })
  }

  return lines
}
