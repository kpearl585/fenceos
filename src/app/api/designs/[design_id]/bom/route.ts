/**
 * API-004: BOM Retrieval
 * GET /api/designs/:design_id/bom
 *
 * Retrieves the Bill of Materials for a design
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

    // 2. Verify design exists (RLS ensures org isolation)
    const { data: design, error: designError } = await supabase
      .from('fence_designs')
      .select('id, total_linear_feet, height_ft, fence_type_id')
      .eq('id', design_id)
      .single()

    if (designError || !design) {
      return NextResponse.json(
        { error: 'Design not found' },
        { status: 404 }
      )
    }

    // 3. Load BOM header
    const { data: bom, error: bomError } = await supabase
      .from('boms')
      .select('*')
      .eq('design_id', design_id)
      .single()

    if (bomError || !bom) {
      return NextResponse.json(
        {
          error: 'BOM not found',
          message: 'Run estimate first to generate BOM'
        },
        { status: 404 }
      )
    }

    // 4. Load BOM lines
    const { data: lines, error: linesError } = await supabase
      .from('bom_lines')
      .select('*')
      .eq('bom_id', bom.id)
      .order('sort_order', { ascending: true })

    if (linesError) {
      return NextResponse.json(
        { error: 'Failed to load BOM lines', details: linesError },
        { status: 500 }
      )
    }

    // 5. Return BOM with all details
    return NextResponse.json({
      success: true,
      design_summary: {
        id: design.id,
        total_linear_feet: parseFloat(design.total_linear_feet),
        height_ft: design.height_ft,
        fence_type_id: design.fence_type_id
      },
      bom: {
        id: bom.id,
        design_id: bom.design_id,
        total_line_count: bom.total_line_count,
        summary: bom.summary,
        created_at: bom.created_at,
        updated_at: bom.updated_at
      },
      lines: lines || []
    })

  } catch (error) {
    console.error('Get BOM error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
