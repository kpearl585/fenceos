/**
 * API-003: Estimate Engine Endpoint
 * POST /api/designs/:design_id/estimate
 *
 * Runs the complete estimation pipeline for a design and returns:
 * - Material counts
 * - BOM with calculation notes
 * - Validation results
 * - Price summary (placeholder)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runEstimate } from '@/lib/wood-fence-calculator/estimator-service'

export async function POST(
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

    // 2. Verify design exists and user has access (via RLS)
    const { data: design, error: designError } = await supabase
      .from('fence_designs')
      .select('id')
      .eq('id', design_id)
      .single()

    if (designError || !design) {
      return NextResponse.json(
        { error: 'Design not found' },
        { status: 404 }
      )
    }

    // 3. Run estimation pipeline
    const estimateResult = await runEstimate(design_id)

    if (!estimateResult.success) {
      const error = estimateResult.error!

      // Map error codes to HTTP status codes
      const statusCode =
        error.code === 'DESIGN_NOT_FOUND' ? 404 :
        error.code === 'VALIDATION_BLOCK' ? 422 :
        500

      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          details: error.details
        },
        { status: statusCode }
      )
    }

    // 4. Return successful estimate
    return NextResponse.json({
      success: true,
      estimate: estimateResult.result
    })

  } catch (error) {
    console.error('Estimate endpoint error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
