/**
 * API-001: Job Management - Create
 * POST /api/jobs
 *
 * Creates a new job for a customer
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const CreateJobSchema = z.object({
  customer_id: z.string().uuid().optional(),
  title: z.string().optional(),
  notes: z.string().optional()
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

    // 2. Get user's org_id
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

    // 3. Parse and validate input
    const body = await request.json()
    const validated = CreateJobSchema.parse(body)

    // 4. Create job using workaround function (bypasses PostgREST cache issue)
    const { data: job, error: jobError } = await supabase
      .rpc('create_job_workaround', {
        p_title: validated.title || 'New Job',
        p_notes: validated.notes,
        p_customer_id: validated.customer_id
      })

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Failed to create job', details: jobError },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      job
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      return NextResponse.json(
        { error: `Validation failed: ${firstError?.message}` },
        { status: 400 }
      )
    }

    console.error('Create job error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
