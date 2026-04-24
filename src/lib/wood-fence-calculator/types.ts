/**
 * Wood Fence Calculator - Type Definitions
 * Phase 1: Wood Privacy MVP
 */

export type NodeType = 'end_post' | 'line_post' | 'corner_post' | 'gate_post' | 'tee_post'
export type PostSize = '4x4' | '6x6'
export type SoilType = 'normal' | 'sandy' | 'clay' | 'rocky'

/**
 * FenceNode - Represents a post in the fence graph
 */
export interface FenceNode {
  id: string
  design_id: string
  node_type: NodeType
  position_ft: number
  post_config_id?: string
  post_size?: PostSize
  notes?: string
}

/**
 * FenceSection - Represents a run between two nodes
 */
export interface FenceSection {
  id: string
  design_id: string
  start_node_id: string
  end_node_id: string
  length_ft: number
  post_spacing_ft?: number
  bay_count?: number
  sort_order: number
}

/**
 * Gate - Represents a gate in the fence
 */
export interface Gate {
  id: string
  design_id: string
  gate_type: 'walk' | 'drive_single' | 'drive_double'
  width_ft: number
  position_ft?: number
  gate_config_id?: string
  hinge_post_id?: string
  latch_post_id?: string
}

/**
 * User Input - What the contractor provides
 */
export interface FenceDesignInput {
  total_linear_feet: number
  corner_count: number
  gates: Array<{
    width_ft: number
    position_ft?: number
  }>
  height_ft?: 4 | 6 | 8
  fence_type_id?: string
  frost_zone?: 1 | 2 | 3 | 4
  soil_type?: SoilType
}

/**
 * Graph Build Result - Output from buildDesignGraph
 */
export interface DesignGraphResult {
  nodes: FenceNode[]
  sections: FenceSection[]
  gates: Gate[]
}

/**
 * Spacing Optimization Result - Output from optimizeSpacing
 */
export interface SpacingResult {
  post_spacing_ft: number
  bay_count: number
}

// Note: PostCalculation type is defined in post-calculator.ts
