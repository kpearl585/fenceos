/**
 * Graph Repair: Insert Line Post Nodes
 *
 * CRITICAL FIX: The original graph builder creates sections with bay_count,
 * but doesn't create nodes representing the line posts between special nodes.
 *
 * This function inserts intermediate line post nodes based on optimized spacing,
 * splitting multi-bay sections into per-bay sub-sections.
 */

import type { FenceNode, FenceSection } from './types'

export interface GraphRepairResult {
  nodes: FenceNode[]
  sections: FenceSection[]
}

/**
 * Insert line post nodes for sections with multiple bays
 *
 * For a section with N bays, we need N+1 posts:
 * - Start post (already exists)
 * - N-1 intermediate line posts (NEED TO CREATE)
 * - End post (already exists)
 *
 * Example: 100ft section with 13 bays @ 7.69ft spacing
 * - Before: 2 nodes (start, end), 1 section (100ft, 13 bays)
 * - After: 14 nodes (1 start + 12 line + 1 end), 13 sections (each ~7.69ft, 1 bay)
 *
 * @param sections - Sections with optimized spacing and bay_count
 * @param nodes - Existing nodes (special nodes: end, corner, gate)
 * @returns Updated graph with line post nodes inserted
 */
export function insertLinePostNodes(
  sections: FenceSection[],
  nodes: FenceNode[]
): GraphRepairResult {
  const newNodes = [...nodes]
  const newSections: FenceSection[] = []

  let nextNodeId = nodes.length // Counter for new node IDs

  sections.forEach((section, sectionIndex) => {
    const { bay_count, post_spacing_ft, start_node_id, end_node_id, design_id } = section

    // Validation
    if (!bay_count || !post_spacing_ft) {
      throw new Error(
        `Section ${section.id} missing bay_count or post_spacing_ft. ` +
        `Run spacing optimizer before graph repair.`
      )
    }

    // Find start and end nodes
    const startNode = newNodes.find(n => n.id === start_node_id)
    const endNode = newNodes.find(n => n.id === end_node_id)

    if (!startNode || !endNode) {
      throw new Error(`Section ${section.id} references missing nodes`)
    }

    // Calculate positions for intermediate posts
    const startPosition = startNode.position_ft
    const endPosition = endNode.position_ft

    if (bay_count === 1) {
      // Single bay - no intermediate posts needed
      // Keep section as-is
      newSections.push({
        ...section,
        id: `${section.id}-bay-0`,
        sort_order: newSections.length
      })
    } else {
      // Multiple bays - create intermediate line posts
      const intermediateNodes: FenceNode[] = []

      // Create N-1 intermediate nodes (for N bays)
      for (let i = 1; i < bay_count; i++) {
        const position_ft = startPosition + (post_spacing_ft * i)

        const linePostNode: FenceNode = {
          id: `node-line-${nextNodeId}`,
          design_id,
          node_type: 'line_post', // Will be refined by node typer
          position_ft,
          notes: `Line post ${i} of ${bay_count - 1} for section ${section.id}`
        }

        intermediateNodes.push(linePostNode)
        newNodes.push(linePostNode)
        nextNodeId++
      }

      // Create sub-sections for each bay
      // Bay 0: start_node -> intermediate[0]
      // Bay 1: intermediate[0] -> intermediate[1]
      // ...
      // Bay N-1: intermediate[N-2] -> end_node

      const allNodesInOrder = [
        startNode,
        ...intermediateNodes,
        endNode
      ]

      for (let bayIndex = 0; bayIndex < bay_count; bayIndex++) {
        const bayStartNode = allNodesInOrder[bayIndex]
        const bayEndNode = allNodesInOrder[bayIndex + 1]

        const bayLength = bayEndNode.position_ft - bayStartNode.position_ft

        newSections.push({
          id: `${section.id}-bay-${bayIndex}`,
          design_id,
          start_node_id: bayStartNode.id,
          end_node_id: bayEndNode.id,
          length_ft: bayLength,
          post_spacing_ft: bayLength, // Each sub-section is 1 bay
          bay_count: 1,
          sort_order: newSections.length
        })
      }
    }
  })

  return {
    nodes: newNodes,
    sections: newSections
  }
}

/**
 * Validate that post count matches node count
 */
export function validateGraphIntegrity(nodes: FenceNode[]): {
  valid: boolean
  message: string
} {
  const uniqueNodes = new Set(nodes.map(n => n.id))

  if (uniqueNodes.size !== nodes.length) {
    return {
      valid: false,
      message: `Duplicate node IDs detected: ${nodes.length} nodes, ${uniqueNodes.size} unique`
    }
  }

  // Check for gaps in positions
  const sorted = [...nodes].sort((a, b) => a.position_ft - b.position_ft)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].position_ft <= sorted[i - 1].position_ft) {
      return {
        valid: false,
        message: `Node position error at ${sorted[i].id}: ${sorted[i].position_ft}ft <= ${sorted[i - 1].position_ft}ft`
      }
    }
  }

  return {
    valid: true,
    message: `Graph valid: ${nodes.length} unique nodes with correct position order`
  }
}
