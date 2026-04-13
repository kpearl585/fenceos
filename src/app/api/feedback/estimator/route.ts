/**
 * Estimator Feedback API
 * POST /api/feedback/estimator
 *
 * Captures user feedback for all estimators
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const FeedbackSchema = z.object({
  feedback_type: z.enum(['issue', 'suggestion', 'question']),
  message: z.string().min(1).max(2000),
  design_id: z.string().uuid().optional(),
  page_url: z.string().url().optional()
})

export async function POST(request: NextRequest) {
  try {
    // 1. Verify authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Parse and validate input
    const body = await request.json()
    const validated = FeedbackSchema.parse(body)

    // 3. Submit feedback via database function
    const { data, error } = await supabase.rpc('submit_estimator_feedback', {
      p_feedback_type: validated.feedback_type,
      p_message: validated.message,
      p_design_id: validated.design_id || null,
      p_page_url: validated.page_url || null
    })

    if (error) {
      console.error('Feedback submission error:', error)
      return NextResponse.json(
        { error: 'Failed to submit feedback' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      feedback_id: data
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid feedback data', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Feedback API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
