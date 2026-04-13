/**
 * API-002: Design Management - Create Design
 * POST /api/jobs/:id/design
 *
 * Creates a fence design for a job using the graph builder
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildDesignGraph } from '@/lib/wood-fence-calculator'
import { z } from 'zod'
import * as Sentry from '@sentry/nextjs'

const CreateDesignSchema = z.object({
  total_linear_feet: z.number()
    .positive('Total linear feet must be positive')
    .max(10000, 'Total linear feet cannot exceed 10,000'),
  corner_count: z.number()
    .int()
    .min(0, 'Corner count cannot be negative')
    .max(100, 'Corner count cannot exceed 100'),
  gates: z.array(z.object({
    width_ft: z.number()
      .min(3, 'Gate width must be at least 3 feet')
      .max(12, 'Gate width cannot exceed 12 feet'),
    position_ft: z.number().optional()
  }))
  .max(20, 'Cannot have more than 20 gates')
  .default([]),
  height_ft: z.union([z.literal(4), z.literal(6), z.literal(8)]),
  fence_type_id: z.string().default('wood_privacy_6ft'),
  frost_zone: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).default(2),
  soil_type: z.enum(['normal', 'sandy', 'clay', 'rocky']).default('normal')
})
.refine((data) => {
  // Validate gate positions are within fence length
  const invalidPositions = data.gates.filter(g =>
    g.position_ft !== undefined && g.position_ft > data.total_linear_feet
  )
  return invalidPositions.length === 0
}, {
  message: 'Gate positions must be within the total linear feet'
})
.refine((data) => {
  // Validate total gate width doesn't exceed fence length
  const totalGateWidth = data.gates.reduce((sum, g) => sum + g.width_ft, 0)
  return totalGateWidth < data.total_linear_feet
}, {
  message: 'Total gate width must be less than total linear feet'
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  let designId: string | null = null

  try {
    const { id } = await params

    // 1. Verify authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Verify job exists and user has access (via RLS)
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id')
      .eq('id', id)
      .single()

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // 3. Parse and validate input
    const body = await request.json()
    const validated = CreateDesignSchema.parse(body)

    // Add Sentry context for better debugging
    Sentry.setContext('phase1_estimator', {
      total_linear_feet: validated.total_linear_feet,
      corner_count: validated.corner_count,
      gate_count: validated.gates.length,
      height_ft: validated.height_ft,
      frost_zone: validated.frost_zone,
      soil_type: validated.soil_type
    })
    Sentry.setUser({ id: user.id })

    // 4. Get user's org_id
    const { data: userRecord } = await supabase
      .from('users')
      .select('org_id')
      .eq('auth_id', user.id)
      .single()

    if (!userRecord?.org_id) {
      return NextResponse.json(
        { error: 'User organization not found' },
        { status: 400 }
      )
    }

    // 5. Create design record
    const { data: design, error: designError } = await supabase
      .from('fence_designs')
      .insert({
        org_id: userRecord.org_id,
        total_linear_feet: validated.total_linear_feet,
        fence_type_id: validated.fence_type_id,
        height_ft: validated.height_ft,
        frost_zone: validated.frost_zone,
        soil_type: validated.soil_type
      })
      .select()
      .single()

    if (designError || !design) {
      return NextResponse.json(
        { error: 'Failed to create design', details: designError },
        { status: 500 }
      )
    }

    designId = design.id

    // Track "started" event
    try {
      await supabase.rpc('track_phase1_event', {
        p_event_type: 'started',
        p_design_id: designId,
        p_input_params: {
          total_linear_feet: validated.total_linear_feet,
          corner_count: validated.corner_count,
          gate_count: validated.gates.length,
          height_ft: validated.height_ft,
          frost_zone: validated.frost_zone,
          soil_type: validated.soil_type
        },
        p_user_agent: request.headers.get('user-agent')
      })
    } catch (err) {
      // Don't fail request if tracking fails
      console.error('Failed to track event:', err)
    }

    // 6. Build graph using graph builder
    const graph = buildDesignGraph(validated, designId!)

    // 7. Persist nodes to database and build ID mapping
    const nodeIdMap = new Map<string, string>() // old string ID → new UUID

    if (graph.nodes.length > 0) {
      const { data: insertedNodes, error: nodesError } = await supabase
        .from('fence_nodes')
        .insert(graph.nodes.map(node => ({
          design_id: designId!,
          node_type: node.node_type,
          position_ft: node.position_ft,
          post_config_id: node.post_config_id || null,
          post_size: node.post_size || null,
          notes: node.notes || null
        })))
        .select('id')

      if (nodesError || !insertedNodes) {
        console.error('❌ Nodes insert failed:', nodesError)
        console.error('Attempted insert:', graph.nodes.map(n => ({
          design_id: designId!,
          node_type: n.node_type,
          position_ft: n.position_ft
        })))
        // Rollback: delete design
        await supabase.from('fence_designs').delete().eq('id', designId!)
        return NextResponse.json(
          { error: 'Failed to create nodes', details: nodesError },
          { status: 500 }
        )
      }

      // Map old string IDs to new UUIDs (preserve order)
      graph.nodes.forEach((node, index) => {
        nodeIdMap.set(node.id, insertedNodes[index].id)
      })
    }

    // 8. Persist sections to database
    if (graph.sections.length > 0) {
      const { error: sectionsError } = await supabase
        .from('fence_sections')
        .insert(graph.sections.map(section => ({
          design_id: designId!,
          start_node_id: nodeIdMap.get(section.start_node_id)!,
          end_node_id: nodeIdMap.get(section.end_node_id)!,
          length_ft: section.length_ft,
          post_spacing_ft: section.post_spacing_ft || null,
          bay_count: section.bay_count || null,
          sort_order: section.sort_order || 0
        })))

      if (sectionsError) {
        // Rollback: delete design and nodes
        await supabase.from('fence_nodes').delete().eq('design_id', designId!)
        await supabase.from('fence_designs').delete().eq('id', designId!)
        return NextResponse.json(
          { error: 'Failed to create sections', details: sectionsError },
          { status: 500 }
        )
      }
    }

    // 9. Persist gates to database
    if (graph.gates.length > 0) {
      const { error: gatesError } = await supabase
        .from('gates')
        .insert(graph.gates.map(gate => ({
          design_id: designId!,
          gate_type: gate.gate_type,
          width_ft: gate.width_ft,
          position_ft: gate.position_ft || null,
          hinge_post_id: gate.hinge_post_id ? nodeIdMap.get(gate.hinge_post_id)! : null,
          latch_post_id: gate.latch_post_id ? nodeIdMap.get(gate.latch_post_id)! : null
        })))

      if (gatesError) {
        // Rollback: delete design, nodes, and sections
        await supabase.from('fence_sections').delete().eq('design_id', designId!)
        await supabase.from('fence_nodes').delete().eq('design_id', designId!)
        await supabase.from('fence_designs').delete().eq('id', designId!)
        return NextResponse.json(
          { error: 'Failed to create gates', details: gatesError },
          { status: 500 }
        )
      }
    }

    // 10. Return created design with graph summary
    return NextResponse.json({
      success: true,
      design: {
        id: design.id,
        total_linear_feet: design.total_linear_feet,
        height_ft: design.height_ft,
        fence_type_id: design.fence_type_id,
        frost_zone: design.frost_zone,
        soil_type: design.soil_type,
        created_at: design.created_at
      },
      graph_summary: {
        nodes: graph.nodes.length,
        sections: graph.sections.length,
        gates: graph.gates.length
      }
    }, { status: 201 })

  } catch (error) {
    const duration = Date.now() - startTime

    // Track failed event
    if (designId) {
      try {
        const supabase = await createClient()
        await supabase.rpc('track_phase1_event', {
          p_event_type: 'failed',
          p_design_id: designId,
          p_error_message: error instanceof Error ? error.message : 'Unknown error',
          p_duration_ms: duration,
          p_user_agent: request.headers.get('user-agent')
        })
      } catch (err) {
        console.error('Failed to track error event:', err)
      }
    }

    // Capture error in Sentry
    Sentry.captureException(error, {
      tags: { phase: 'phase1_estimator', step: 'design_creation' },
      level: error instanceof z.ZodError ? 'warning' : 'error'
    })

    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      const userMessage = firstError?.message || 'Invalid input'

      // Log validation errors for debugging
      console.error('Design validation failed:', error.issues.map(i => ({
        path: i.path.join('.'),
        message: i.message
      })))

      return NextResponse.json(
        { error: userMessage },
        { status: 400 }
      )
    }

    // Handle graph builder errors
    if (error instanceof Error && error.message.includes('must be positive')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    console.error('Create design error:', error)
    return NextResponse.json(
      { error: 'Failed to create fence design. Please try again.' },
      { status: 500 }
    )
  }
}
