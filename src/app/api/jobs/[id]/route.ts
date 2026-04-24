/**
 * API-001: Job Management - Get/Update
 * GET /api/jobs/:id
 * PATCH /api/jobs/:id
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const UpdateJobSchema = z.object({
  customer_name: z.string().min(1).optional(),
  customer_email: z.string().email().optional(),
  customer_phone: z.string().optional(),
  site_address: z.string().optional(),
  site_city: z.string().optional(),
  site_state: z.string().optional(),
  site_zip: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['draft', 'quoted', 'approved', 'in_progress', 'completed', 'cancelled']).optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // 2. Load job (RLS ensures org isolation)
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single()

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      job
    })

  } catch (error) {
    console.error('Get job error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // 2. Parse and validate input
    const body = await request.json()
    const validated = UpdateJobSchema.parse(body)

    // 3. Update job (RLS ensures org isolation)
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .update({
        ...validated,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Failed to update job', details: jobError },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      job
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      return NextResponse.json(
        { error: `Validation failed: ${firstError?.message}` },
        { status: 400 }
      )
    }

    console.error('Update job error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
