/**
 * API-002: Design Management - Create Design
 * POST /api/jobs/:job_id/design
 *
 * Creates a fence design for a job using the graph builder
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildDesignGraph } from '@/lib/wood-fence-calculator'
import { z } from 'zod'

const CreateDesignSchema = z.object({
  total_linear_feet: z.number().positive('Total linear feet must be positive'),
  corner_count: z.number().int().min(0, 'Corner count cannot be negative'),
  gates: z.array(z.object({
    width_ft: z.number().positive(),
    position_ft: z.number().optional()
  })).default([]),
  height_ft: z.union([z.literal(4), z.literal(6), z.literal(8)]),
  fence_type_id: z.string().default('wood_privacy_6ft'),
  frost_zone: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).default(2),
  soil_type: z.enum(['normal', 'sandy', 'clay', 'rocky']).default('normal')
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ job_id: string }> }
) {
  try {
    const { job_id } = await params

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
      .eq('id', job_id)
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
        job_id: job_id,
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

    const designId = design.id

    // 6. Build graph using graph builder
    const graph = buildDesignGraph(validated, designId)

    // 7. Persist nodes to database
    if (graph.nodes.length > 0) {
      const { error: nodesError } = await supabase
        .from('fence_nodes')
        .insert(graph.nodes.map(node => ({
          id: node.id,
          design_id: designId,
          node_type: node.node_type,
          position_ft: node.position_ft,
          post_config_id: node.post_config_id,
          post_size: node.post_size,
          notes: node.notes
        })))

      if (nodesError) {
        // Rollback: delete design
        await supabase.from('fence_designs').delete().eq('id', designId)
        return NextResponse.json(
          { error: 'Failed to create nodes', details: nodesError },
          { status: 500 }
        )
      }
    }

    // 8. Persist sections to database
    if (graph.sections.length > 0) {
      const { error: sectionsError } = await supabase
        .from('fence_sections')
        .insert(graph.sections.map(section => ({
          id: section.id,
          design_id: designId,
          start_node_id: section.start_node_id,
          end_node_id: section.end_node_id,
          length_ft: section.length_ft,
          post_spacing_ft: section.post_spacing_ft,
          bay_count: section.bay_count,
          sort_order: section.sort_order
        })))

      if (sectionsError) {
        // Rollback: delete design and nodes
        await supabase.from('fence_nodes').delete().eq('design_id', designId)
        await supabase.from('fence_designs').delete().eq('id', designId)
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
          id: gate.id,
          design_id: designId,
          gate_type: gate.gate_type,
          width_ft: gate.width_ft,
          position_ft: gate.position_ft,
          hinge_post_id: gate.hinge_post_id,
          latch_post_id: gate.latch_post_id
        })))

      if (gatesError) {
        // Rollback: delete design, nodes, and sections
        await supabase.from('fence_sections').delete().eq('design_id', designId)
        await supabase.from('fence_nodes').delete().eq('design_id', designId)
        await supabase.from('fence_designs').delete().eq('id', designId)
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
        job_id: design.job_id,
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
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      return NextResponse.json(
        { error: `Validation failed: ${firstError?.message}` },
        { status: 400 }
      )
    }

    console.error('Create design error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
