/**
 * Phase 1 Estimator - Input Screen
 * Minimal UI to test deployed Phase 1 API
 */

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Phase1EstimatorForm from "./Phase1EstimatorForm"

export default async function Phase1EstimatorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Get user's org_id
  const { data: userRecord } = await supabase
    .from('users')
    .select('org_id, email')
    .eq('auth_id', user.id)
    .single()

  if (!userRecord?.org_id) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <h2 className="text-red-800 font-semibold">Setup Required</h2>
          <p className="text-red-700 mt-2">Your account is not linked to an organization. Please contact support.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Phase 1 Estimator</h1>
        <p className="text-gray-600 mt-2">Wood Privacy Fence - Graph-based BOM Calculator</p>
      </div>

      <Phase1EstimatorForm orgId={userRecord.org_id} userEmail={userRecord.email} />
    </div>
  )
}
