'use server'

// Requires Supabase migration:
// ALTER TABLE jobs ADD COLUMN IF NOT EXISTS material_verification_status text DEFAULT 'pending'
//   CHECK (material_verification_status IN ('pending', 'employee_confirmed', 'foreman_approved', 'rejected'));

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { ensureProfile } from '@/lib/bootstrap'
import { sendEmail } from '@/lib/email/index'
import { revalidatePath } from 'next/cache'

async function getMaterialVerificationContext(jobId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }

  const profile = await ensureProfile(supabase, user)
  const admin = createAdminClient()

  const { data: job, error } = await admin
    .from('jobs')
    .select('id, org_id, assigned_foreman_id')
    .eq('id', jobId)
    .eq('org_id', profile.org_id)
    .single()

  if (error || !job) {
    return { error: 'Job not found or access denied' as const }
  }

  return { profile, job, admin }
}

export async function requestMaterialVerification(
  jobId: string,
  jobName: string,
  jobAddress: string,
  foremanEmail: string,
  employeeEmail?: string
) {
  const ctx = await getMaterialVerificationContext(jobId)
  if ('error' in ctx) return { error: ctx.error }
  if (!['owner', 'sales', 'foreman'].includes(ctx.profile.role)) {
    return { error: 'Access denied' }
  }

  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/jobs/${jobId}/verify-materials`
  const targetEmail = employeeEmail || foremanEmail

  await sendEmail({
    to: targetEmail,
    subject: `Materials Check Required — ${jobName}`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:2rem">
      <h2 style="color:#2D6A4F">Materials Verification Required</h2>
      <p>Before starting <strong>${jobName}</strong> at ${jobAddress}, please confirm all materials are loaded and ready.</p>
      <a href="${verifyUrl}" style="display:inline-block;background:#2D6A4F;color:#fff;padding:0.875rem 1.75rem;border-radius:6px;text-decoration:none;font-weight:600;margin-top:1rem">Verify Materials →</a>
      <p style="color:#6b7280;font-size:0.85rem;margin-top:2rem">FenceEstimatePro — Job Management</p>
    </div>`
  })

  await ctx.admin
    .from('jobs')
    .update({ material_verification_status: 'pending' })
    .eq('id', jobId)
    .eq('org_id', ctx.profile.org_id)

  revalidatePath(`/dashboard/jobs/${jobId}`)
  return { success: true }
}

export async function approveMaterialVerification(jobId: string) {
  const ctx = await getMaterialVerificationContext(jobId)
  if ('error' in ctx) return { error: ctx.error }
  if (ctx.profile.role !== 'owner' && ctx.profile.role !== 'foreman') {
    return { error: 'Access denied' }
  }
  if (ctx.profile.role === 'foreman' && ctx.job.assigned_foreman_id !== ctx.profile.id) {
    return { error: 'You can only approve materials for jobs assigned to you' }
  }

  const { error } = await ctx.admin
    .from('jobs')
    .update({ material_verification_status: 'foreman_approved' })
    .eq('id', jobId)
    .eq('org_id', ctx.profile.org_id)
  if (error) return { error: error.message }
  revalidatePath(`/dashboard/jobs/${jobId}`)
  return { success: true }
}

export async function employeeConfirmMaterials(jobId: string) {
  const ctx = await getMaterialVerificationContext(jobId)
  if ('error' in ctx) return { error: ctx.error }
  if (ctx.profile.role !== 'owner' && ctx.profile.role !== 'foreman') {
    return { error: 'Access denied' }
  }
  if (ctx.profile.role === 'foreman' && ctx.job.assigned_foreman_id !== ctx.profile.id) {
    return { error: 'You can only verify materials for jobs assigned to you' }
  }

  const { error } = await ctx.admin
    .from('jobs')
    .update({ material_verification_status: 'employee_confirmed' })
    .eq('id', jobId)
    .eq('org_id', ctx.profile.org_id)
  if (error) return { error: error.message }
  revalidatePath(`/dashboard/jobs/${jobId}`)
  return { success: true }
}

export async function rejectMaterialVerification(jobId: string) {
  const ctx = await getMaterialVerificationContext(jobId)
  if ('error' in ctx) return { error: ctx.error }
  if (ctx.profile.role !== 'owner' && ctx.profile.role !== 'foreman') {
    return { error: 'Access denied' }
  }
  if (ctx.profile.role === 'foreman' && ctx.job.assigned_foreman_id !== ctx.profile.id) {
    return { error: 'You can only reject materials for jobs assigned to you' }
  }

  const { error } = await ctx.admin
    .from('jobs')
    .update({ material_verification_status: 'rejected' })
    .eq('id', jobId)
    .eq('org_id', ctx.profile.org_id)
  if (error) return { error: error.message }
  revalidatePath(`/dashboard/jobs/${jobId}`)
  return { success: true }
}
