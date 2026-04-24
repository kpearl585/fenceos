/**
 * Estimator Service: Orchestrates the complete estimation pipeline
 *
 * This is the main service layer that coordinates:
 * 1. Loading design data from database
 * 2. Running calculation pipeline
 * 3. Persisting BOM results
 * 4. Running validation
 * 5. Returning structured results
 */

import { createClient } from '@/lib/supabase/server'
import {
  optimizeAllSections,
  insertLinePostNodes,
  classifyAndConfigureNodes,
  calculatePosts,
  calculateRails,
  calculatePickets,
  calculateConcrete,
  resolveAllGates,
  assembleBOM,
  generatePostBOMLines,
  generateRailBOMLine,
  generatePicketBOMLine,
  generateConcreteBOMLine,
  generateStandardHardware,
  validateEstimate,
  BLOCK_RULES,
  WARN_RULES,
  type FenceNode,
  type FenceSection,
  type Gate,
  type BOM,
  type FenceDesignForValidation
} from './index'

export interface EstimateResult {
  design_id: string
  design_summary: {
    total_linear_feet: number
    height_ft: number
    fence_type_id: string
    total_nodes: number
    total_sections: number
    total_gates: number
  }
  post_counts: {
    line_4x4: number
    corner_4x4: number
    end_4x4: number
    gate_6x6: number
    total: number
  }
  bom: BOM
  validation: {
    can_proceed: boolean
    errors: Array<{
      rule_id: string
      severity: string
      message: string
    }>
    warnings: Array<{
      rule_id: string
      severity: string
      message: string
    }>
  }
  price_summary: {
    subtotal: number
    tax: number
    total: number
    note: string
  }
  audit_metadata: {
    calculated_at: string
    calculation_time_ms: number
    estimator_version: string
  }
}

export interface EstimatorServiceError {
  code: string
  message: string
  details?: any
}

/**
 * Run complete estimation pipeline for a design
 */
export async function runEstimate(designId: string): Promise<{
  success: boolean
  result?: EstimateResult
  error?: EstimatorServiceError
}> {
  const startTime = Date.now()

  try {
    // 1. Load design data from database
    const loadResult = await loadDesignData(designId)
    if (!loadResult.success) {
      return { success: false, error: loadResult.error }
    }

    const { design, nodes, sections, gates } = loadResult.data!

    // 2. Run spacing optimization
    const optimizedSections = optimizeAllSections(sections)

    // 3. CRITICAL: Insert line post nodes after optimization
    const repairedGraph = insertLinePostNodes(optimizedSections, nodes)

    // 4. Classify and configure nodes
    const typedNodes = classifyAndConfigureNodes(repairedGraph.nodes, repairedGraph.sections)

    // 5. Calculate posts
    const posts = calculatePosts(repairedGraph.sections, typedNodes)

    // 6. Calculate rails
    const rails = calculateRails(repairedGraph.sections, design.height_ft as 4 | 6 | 8)

    // 7. Calculate pickets
    const pickets = calculatePickets(repairedGraph.sections)

    // 8. Calculate concrete
    const concrete = calculateConcrete(typedNodes, design.frost_zone as 1 | 2 | 3 | 4, design.soil_type as 'normal' | 'sandy' | 'clay' | 'rocky')

    // 9. Resolve gate hardware
    const gateHardware = resolveAllGates(gates, design.height_ft as 4 | 6 | 8)

    // 10. Generate BOM lines
    const postLines = generatePostBOMLines(posts)
    const railLine = generateRailBOMLine(rails)
    const picketLine = generatePicketBOMLine(pickets, design.height_ft as 4 | 6 | 8)
    const concreteLine = generateConcreteBOMLine(concrete)
    const hardwareLines = generateStandardHardware(posts.total_posts, pickets.total_bays)

    // 11. Assemble BOM
    const bom = assembleBOM({
      posts: postLines,
      rails: railLine,
      pickets: picketLine,
      concrete: concreteLine,
      gates: gateHardware,
      hardware: hardwareLines
    })

    // 12. Run validation
    const designForValidation: FenceDesignForValidation = {
      id: design.id,
      total_linear_feet: design.total_linear_feet,
      height_ft: design.height_ft as 4 | 6 | 8,
      fence_type_id: design.fence_type_id,
      frost_zone: design.frost_zone as 1 | 2 | 3 | 4,
      soil_type: design.soil_type as 'normal' | 'sandy' | 'clay' | 'rocky',
      nodes: typedNodes,
      sections: repairedGraph.sections,
      gates
    }

    const validation = validateEstimate(designForValidation, bom, [...BLOCK_RULES, ...WARN_RULES])

    // 13. Persist BOM to database
    const persistResult = await persistBOM(design.id, bom)
    if (!persistResult.success) {
      return { success: false, error: persistResult.error }
    }

    // 14. Build response
    const calculationTime = Date.now() - startTime

    const result: EstimateResult = {
      design_id: design.id,
      design_summary: {
        total_linear_feet: design.total_linear_feet,
        height_ft: design.height_ft,
        fence_type_id: design.fence_type_id,
        total_nodes: typedNodes.length,
        total_sections: repairedGraph.sections.length,
        total_gates: gates.length
      },
      post_counts: {
        line_4x4: posts.posts_by_type.line_4x4,
        corner_4x4: posts.posts_by_type.corner_4x4,
        end_4x4: posts.posts_by_type.end_4x4,
        gate_6x6: posts.posts_by_type.gate_6x6,
        total: posts.total_posts
      },
      bom,
      validation: {
        can_proceed: validation.canProceed,
        errors: validation.errors.map(e => ({
          rule_id: e.rule_id,
          severity: e.severity,
          message: e.message
        })),
        warnings: validation.warnings.map(w => ({
          rule_id: w.rule_id,
          severity: w.severity,
          message: w.message
        }))
      },
      price_summary: {
        subtotal: 0,
        tax: 0,
        total: 0,
        note: 'Pricing not yet implemented - Phase 1 focuses on material accuracy'
      },
      audit_metadata: {
        calculated_at: new Date().toISOString(),
        calculation_time_ms: calculationTime,
        estimator_version: 'phase1-wood-privacy-mvp'
      }
    }

    return { success: true, result }

  } catch (error) {
    console.error('Estimator service error:', error)
    return {
      success: false,
      error: {
        code: 'ESTIMATOR_ERROR',
        message: error instanceof Error ? error.message : 'Unknown estimator error',
        details: error
      }
    }
  }
}

/**
 * Load design data from database
 */
async function loadDesignData(designId: string): Promise<{
  success: boolean
  data?: {
    design: {
      id: string
      total_linear_feet: number
      height_ft: number
      fence_type_id: string
      frost_zone: number
      soil_type: string
    }
    nodes: FenceNode[]
    sections: FenceSection[]
    gates: Gate[]
  }
  error?: EstimatorServiceError
}> {
  try {
    const supabase = await createClient()

    // Load design
    const { data: design, error: designError } = await supabase
      .from('fence_designs')
      .select('*')
      .eq('id', designId)
      .single()

    if (designError || !design) {
      return {
        success: false,
        error: {
          code: 'DESIGN_NOT_FOUND',
          message: `Design ${designId} not found`,
          details: designError
        }
      }
    }

    // Load nodes
    const { data: nodes, error: nodesError } = await supabase
      .from('fence_nodes')
      .select('*')
      .eq('design_id', designId)
      .order('position_ft', { ascending: true })

    if (nodesError) {
      return {
        success: false,
        error: {
          code: 'NODES_LOAD_ERROR',
          message: 'Failed to load fence nodes',
          details: nodesError
        }
      }
    }

    // Load sections
    const { data: sections, error: sectionsError } = await supabase
      .from('fence_sections')
      .select('*')
      .eq('design_id', designId)
      .order('sort_order', { ascending: true })

    if (sectionsError) {
      return {
        success: false,
        error: {
          code: 'SECTIONS_LOAD_ERROR',
          message: 'Failed to load fence sections',
          details: sectionsError
        }
      }
    }

    // Load gates
    const { data: gates, error: gatesError } = await supabase
      .from('gates')
      .select('*')
      .eq('design_id', designId)

    if (gatesError) {
      return {
        success: false,
        error: {
          code: 'GATES_LOAD_ERROR',
          message: 'Failed to load gates',
          details: gatesError
        }
      }
    }

    return {
      success: true,
      data: {
        design: {
          id: design.id,
          total_linear_feet: parseFloat(design.total_linear_feet),
          height_ft: design.height_ft,
          fence_type_id: design.fence_type_id,
          frost_zone: design.frost_zone,
          soil_type: design.soil_type
        },
        nodes: nodes || [],
        sections: sections || [],
        gates: gates || []
      }
    }

  } catch (error) {
    console.error('Database load error:', error)
    return {
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Database error loading design data',
        details: error
      }
    }
  }
}

/**
 * Persist BOM to database
 */
async function persistBOM(designId: string, bom: BOM): Promise<{
  success: boolean
  error?: EstimatorServiceError
}> {
  try {
    const supabase = await createClient()

    // Get user's org_id for BOM
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return {
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'User not authenticated',
        }
      }
    }

    const { data: userRecord } = await supabase
      .from('users')
      .select('org_id')
      .eq('auth_id', user.id)
      .single()

    if (!userRecord?.org_id) {
      return {
        success: false,
        error: {
          code: 'ORG_ERROR',
          message: 'User organization not found',
        }
      }
    }

    // 1. Create BOM header (each design gets a new BOM)
    const { data: bomRecord, error: bomError } = await supabase
      .from('boms')
      .insert({
        design_id: designId,
        org_id: userRecord.org_id,
        total_line_count: bom.total_line_count
      })
      .select('id')
      .single()

    if (bomError || !bomRecord) {
      console.error('❌ BOM insert failed:', bomError)
      console.error('Attempted insert:', {
        design_id: designId,
        org_id: userRecord.org_id,
        total_line_count: bom.total_line_count
      })
      return {
        success: false,
        error: {
          code: 'BOM_PERSIST_ERROR',
          message: 'Failed to persist BOM header',
          details: bomError
        }
      }
    }

    const bomId = bomRecord.id

    // 2. Delete existing BOM lines for this BOM
    const { error: deleteError } = await supabase
      .from('bom_lines')
      .delete()
      .eq('bom_id', bomId)

    if (deleteError) {
      console.error('Warning: Failed to delete old BOM lines:', deleteError)
      // Continue anyway - upsert might handle it
    }

    // 3. Insert new BOM lines
    const bomLinesToInsert = bom.lines.map((line, index) => ({
      bom_id: bomId,
      category: line.category,
      description: line.description,
      raw_quantity: line.raw_quantity,
      insurance_quantity: line.insurance_quantity || 0,
      order_quantity: line.order_quantity,
      calculation_notes: line.calculation_notes,
      sort_order: index
    }))

    const { error: linesError } = await supabase
      .from('bom_lines')
      .insert(bomLinesToInsert)

    if (linesError) {
      return {
        success: false,
        error: {
          code: 'BOM_LINES_PERSIST_ERROR',
          message: 'Failed to persist BOM lines',
          details: linesError
        }
      }
    }

    return { success: true }

  } catch (error) {
    console.error('BOM persist error:', error)
    return {
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Database error persisting BOM',
        details: error
      }
    }
  }
}
