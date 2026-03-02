'use client'

import { useEffect, useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { employeeConfirmMaterials } from '../verifyActions'

type MaterialItem = {
  id: string
  name: string
  sku: string | null
  required_qty: number
  verified: boolean
}

type JobData = {
  id: string
  material_verification_status: string
  customers: { name: string; address: string | null; city: string | null; state: string | null }[] | null
  job_material_verifications: MaterialItem[]
  job_line_items: { id: string; name: string; qty: number; sku: string | null; type: string }[]
}

export default function VerifyMaterialsPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.id as string
  const [job, setJob] = useState<JobData | null>(null)
  const [loading, setLoading] = useState(true)
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    fetch(`/api/jobs/${jobId}/verify-data`)
      .then(r => r.json())
      .then(data => {
        setJob(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [jobId])

  function toggleItem(id: string) {
    setChecked(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const materials: { id: string; name: string; qty: number; sku: string | null }[] = job
    ? [
        ...job.job_material_verifications.map(v => ({ id: `v-${v.id}`, name: v.name, qty: v.required_qty, sku: v.sku })),
        ...job.job_line_items
          .filter(li => li.type === 'material' && !job.job_material_verifications.find(v => v.sku && v.sku === li.sku))
          .map(li => ({ id: `li-${li.id}`, name: li.name, qty: li.qty, sku: li.sku })),
      ]
    : []

  const allChecked = materials.length > 0 && materials.every(m => checked[m.id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!allChecked) return
    startTransition(async () => {
      const result = await employeeConfirmMaterials(jobId)
      if ('error' in result && result.error) {
        alert(`Error: ${result.error}`)
      } else {
        setSubmitted(true)
        setTimeout(() => router.push(`/dashboard/jobs/${jobId}`), 2000)
      }
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fence-600" />
      </div>
    )
  }

  const customer = job?.customers?.[0]
  const address = [customer?.address, customer?.city, customer?.state].filter(Boolean).join(', ')
  const jobName = customer?.name || 'Job'
  const verifyStatus = job?.material_verification_status

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center">
        <div className="text-5xl mb-4"></div>
        <h2 className="text-xl font-bold text-fence-900 mb-2">Materials Confirmed</h2>
        <p className="text-gray-500 text-sm">Foreman has been notified. Redirecting…</p>
      </div>
    )
  }

  if (verifyStatus === 'foreman_approved') {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center">
        <div className="text-5xl mb-4"></div>
        <h2 className="text-xl font-bold text-fence-900 mb-2">Already Approved</h2>
        <p className="text-gray-500 text-sm mb-4">Materials have been verified and foreman-approved for this job.</p>
        <Link href={`/dashboard/jobs/${jobId}`} className="text-fence-600 hover:underline text-sm">← Back to Job</Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href={`/dashboard/jobs/${jobId}`} className="text-sm text-fence-600 hover:text-fence-800 font-medium">
          ← Back to Job
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-fence-900">Materials Verification</h1>
        <p className="text-gray-500 mt-1">{jobName} — {address || 'No address on file'}</p>
      </div>

      {verifyStatus === 'employee_confirmed' && (
        <div className="mb-4 p-3.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm font-medium">
           You have already submitted this verification. Waiting for foreman approval.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-fence-900">Materials Checklist ({materials.length} items)</h2>
            <p className="text-xs text-gray-500 mt-0.5">Check each item to confirm it is loaded and ready.</p>
          </div>
          {materials.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-400">No materials found for this job.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {materials.map(m => (
                <label key={m.id} className="flex items-center gap-4 px-5 py-3 cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={!!checked[m.id]}
                    onChange={() => toggleItem(m.id)}
                    className="w-5 h-5 rounded accent-fence-600"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900">
                      {m.qty}× {m.name}
                    </span>
                    {m.sku && <span className="ml-2 text-xs text-gray-400">({m.sku})</span>}
                    <span className="ml-2 text-xs text-gray-400">— confirm loaded</span>
                  </div>
                  {checked[m.id] && <span className="text-green-500 text-sm"></span>}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Any missing items, substitutions, or notes for the foreman…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-fence-500"
          />
        </div>

        <button
          type="submit"
          disabled={!allChecked || isPending || verifyStatus === 'employee_confirmed'}
          className="w-full bg-fence-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-fence-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? 'Submitting…' : verifyStatus === 'employee_confirmed' ? 'Already Submitted' : 'All Materials Loaded — Submit for Foreman Approval'}
        </button>
        {!allChecked && materials.length > 0 && (
          <p className="text-xs text-amber-600 text-center mt-2">Check all items before submitting.</p>
        )}
      </form>
    </div>
  )
}
