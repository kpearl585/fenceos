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
import * as Sentry from '@sentry/nextjs'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ design_id: string }> }
) {
  const startTime = Date.now()

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
      .select('id, total_linear_feet, height_ft')
      .eq('id', design_id)
      .single()

    if (designError || !design) {
      return NextResponse.json(
        { error: 'Design not found' },
        { status: 404 }
      )
    }

    // Add Sentry context
    Sentry.setContext('phase1_estimator', {
      design_id,
      total_linear_feet: design.total_linear_feet,
      height_ft: design.height_ft
    })
    Sentry.setUser({ id: user.id })

    // 3. Run estimation pipeline
    const estimateResult = await runEstimate(design_id)

    if (!estimateResult.success) {
      const error = estimateResult.error!
      const duration = Date.now() - startTime

      // Track failed event
      try {
        await supabase.rpc('track_phase1_event', {
          p_event_type: 'failed',
          p_design_id: design_id,
          p_error_message: error.message,
          p_duration_ms: duration,
          p_user_agent: request.headers.get('user-agent')
        })
      } catch (err) {
        console.error('Failed to track error event:', err)
      }

      // Capture in Sentry (validation blocks are warnings, others are errors)
      Sentry.captureException(new Error(error.message), {
        tags: { phase: 'phase1_estimator', step: 'estimation', error_code: error.code },
        level: error.code === 'VALIDATION_BLOCK' ? 'warning' : 'error',
        extra: { details: error.details }
      })

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

    const duration = Date.now() - startTime

    // Track completed event
    try {
      await supabase.rpc('track_phase1_event', {
        p_event_type: 'completed',
        p_design_id: design_id,
        p_result_summary: {
          total_posts: estimateResult.result?.bom?.summary?.total_posts || 0,
          total_rails: estimateResult.result?.bom?.summary?.total_rails || 0,
          total_pickets: estimateResult.result?.bom?.summary?.total_pickets || 0,
          line_count: estimateResult.result?.bom?.total_line_count || 0
        },
        p_duration_ms: duration,
        p_user_agent: request.headers.get('user-agent')
      })
    } catch (err) {
      console.error('Failed to track success event:', err)
    }

    // 4. Return successful estimate
    return NextResponse.json({
      success: true,
      estimate: estimateResult.result
    })

  } catch (error) {
    const duration = Date.now() - startTime

    // Capture in Sentry
    Sentry.captureException(error, {
      tags: { phase: 'phase1_estimator', step: 'estimation' },
      level: 'error'
    })

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
