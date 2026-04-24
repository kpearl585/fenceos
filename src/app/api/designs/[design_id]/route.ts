/**
 * API-002: Design Management - Get Design
 * GET /api/designs/:design_id
 *
 * Retrieves a design with its graph data
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ design_id: string }> }
) {
  try {
    const { design_id } = await params

    // 1. Verify authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Load design (RLS ensures org isolation)
    const { data: design, error: designError } = await supabase
      .from('fence_designs')
      .select('*')
      .eq('id', design_id)
      .single()

    if (designError || !design) {
      return NextResponse.json(
        { error: 'Design not found' },
        { status: 404 }
      )
    }

    // 3. Load nodes
    const { data: nodes } = await supabase
      .from('fence_nodes')
      .select('*')
      .eq('design_id', design_id)
      .order('position_ft', { ascending: true })

    // 4. Load sections
    const { data: sections } = await supabase
      .from('fence_sections')
      .select('*')
      .eq('design_id', design_id)
      .order('sort_order', { ascending: true })

    // 5. Load gates
    const { data: gates } = await supabase
      .from('gates')
      .select('*')
      .eq('design_id', design_id)

    return NextResponse.json({
      success: true,
      design: {
        id: design.id,
        job_id: design.job_id,
        total_linear_feet: parseFloat(design.total_linear_feet),
        height_ft: design.height_ft,
        fence_type_id: design.fence_type_id,
        frost_zone: design.frost_zone,
        soil_type: design.soil_type,
        created_at: design.created_at,
        updated_at: design.updated_at
      },
      graph: {
        nodes: nodes || [],
        sections: sections || [],
        gates: gates || []
      }
    })

  } catch (error) {
    console.error('Get design error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
