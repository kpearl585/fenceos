import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ensureProfile } from '@/lib/bootstrap'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await ensureProfile(supabase, user)

  const { data: job, error } = await supabase
    .from('jobs')
    .select('id, material_verification_status, customers(name, address, city, state), job_material_verifications(*), job_line_items(*)')
    .eq('id', id)
    .eq('org_id', profile.org_id)
    .single()

  if (error || !job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(job)
}
