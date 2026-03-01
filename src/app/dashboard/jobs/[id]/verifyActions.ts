'use server'

// Requires Supabase migration:
// ALTER TABLE jobs ADD COLUMN IF NOT EXISTS material_verification_status text DEFAULT 'pending'
//   CHECK (material_verification_status IN ('pending', 'employee_confirmed', 'foreman_approved', 'rejected'));

import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/index'
import { revalidatePath } from 'next/cache'

export async function requestMaterialVerification(
  jobId: string,
  jobName: string,
  jobAddress: string,
  foremanEmail: string,
  employeeEmail?: string
) {
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

  revalidatePath(`/dashboard/jobs/${jobId}`)
  return { success: true }
}

export async function approveMaterialVerification(jobId: string) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('jobs')
    .update({ material_verification_status: 'foreman_approved' })
    .eq('id', jobId)
  if (error) return { error: error.message }
  revalidatePath(`/dashboard/jobs/${jobId}`)
  return { success: true }
}

export async function employeeConfirmMaterials(jobId: string) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('jobs')
    .update({ material_verification_status: 'employee_confirmed' })
    .eq('id', jobId)
  if (error) return { error: error.message }
  revalidatePath(`/dashboard/jobs/${jobId}`)
  return { success: true }
}

export async function rejectMaterialVerification(jobId: string) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('jobs')
    .update({ material_verification_status: 'rejected' })
    .eq('id', jobId)
  if (error) return { error: error.message }
  revalidatePath(`/dashboard/jobs/${jobId}`)
  return { success: true }
}
