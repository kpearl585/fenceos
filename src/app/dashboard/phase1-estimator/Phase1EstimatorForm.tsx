'use client'

/**
 * Phase 1 Estimator Form - Client Component
 * Submits to Phase 1 API endpoints
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Gate {
  width_ft: number
  position_ft?: number
}

export default function Phase1EstimatorForm({ orgId, userEmail }: { orgId: string; userEmail: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [customerName, setCustomerName] = useState('')
  const [totalLinearFeet, setTotalLinearFeet] = useState(100)
  const [cornerCount, setCornerCount] = useState(0)
  const [gates, setGates] = useState<Gate[]>([])
  const [heightFt, setHeightFt] = useState<4 | 6 | 8>(6)
  const [frostZone, setFrostZone] = useState<1 | 2 | 3 | 4>(2)
  const [soilType, setSoilType] = useState<'normal' | 'sandy' | 'clay' | 'rocky'>('normal')

  const addGate = () => {
    setGates([...gates, { width_ft: 4 }])
  }

  const removeGate = (index: number) => {
    setGates(gates.filter((_, i) => i !== index))
  }

  const updateGate = (index: number, field: keyof Gate, value: number) => {
    const updated = [...gates]
    updated[index] = { ...updated[index], [field]: value }
    setGates(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Prevent duplicate submissions
    if (loading) return

    setLoading(true)
    setError(null)

    // Frontend validation before API call
    if (totalLinearFeet > 10000) {
      setError('Total linear feet cannot exceed 10,000')
      setLoading(false)
      return
    }

    if (cornerCount > 100) {
      setError('Corner count cannot exceed 100')
      setLoading(false)
      return
    }

    if (gates.length > 20) {
      setError('Cannot have more than 20 gates')
      setLoading(false)
      return
    }

    // Validate gate positions
    const invalidGates = gates.filter(g =>
      g.position_ft !== undefined && g.position_ft > totalLinearFeet
    )
    if (invalidGates.length > 0) {
      setError('Gate positions must be within the total linear feet')
      setLoading(false)
      return
    }

    // Validate total gate width
    const totalGateWidth = gates.reduce((sum, g) => sum + g.width_ft, 0)
    if (totalGateWidth >= totalLinearFeet) {
      setError(`Total gate width (${totalGateWidth} ft) must be less than total linear feet (${totalLinearFeet} ft)`)
      setLoading(false)
      return
    }

    try {
      // Step 1: Create Job
      const jobRes = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: customerName || 'Phase 1 Test Job',
          notes: 'Created via Phase 1 Estimator UI'
        })
      })

      if (!jobRes.ok) {
        const err = await jobRes.json()
        throw new Error(err.error || `Job creation failed (${jobRes.status})`)
      }

      const { job } = await jobRes.json()
      console.log('Job created:', job.id)

      // Step 2: Create Design
      const designRes = await fetch(`/api/jobs/${job.id}/design`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total_linear_feet: totalLinearFeet,
          corner_count: cornerCount,
          gates: gates,
          height_ft: heightFt,
          fence_type_id: 'wood_privacy_6ft',
          frost_zone: frostZone,
          soil_type: soilType
        })
      })

      if (!designRes.ok) {
        const err = await designRes.json()
        throw new Error(err.error || `Design creation failed (${designRes.status})`)
      }

      const { design } = await designRes.json()
      console.log('Design created:', design.id)

      // Step 3: Run Estimate
      const estimateRes = await fetch(`/api/designs/${design.id}/estimate`, {
        method: 'POST'
      })

      if (!estimateRes.ok) {
        const err = await estimateRes.json()
        throw new Error(err.error || `Estimate failed (${estimateRes.status})`)
      }

      const { estimate } = await estimateRes.json()
      console.log('Estimate complete:', estimate)

      // Navigate to results
      router.push(`/dashboard/phase1-estimator/${design.id}`)

    } catch (err) {
      console.error('Submission error:', err)

      // User-friendly error messages
      let userMessage = 'An unexpected error occurred. Please try again.'

      if (err instanceof Error) {
        // Parse API error messages
        if (err.message.includes('Job creation failed')) {
          userMessage = 'Failed to create job. Please check your connection and try again.'
        } else if (err.message.includes('Design creation failed')) {
          userMessage = 'Failed to create fence design. Please verify your inputs and try again.'
        } else if (err.message.includes('Estimate failed')) {
          userMessage = 'Failed to generate estimate. The calculation encountered an error.'
        } else if (err.message.includes('Unauthorized')) {
          userMessage = 'Session expired. Please refresh the page and log in again.'
        } else if (err.message.includes('not found')) {
          userMessage = 'Required data not found. Please try creating a new estimate.'
        } else if (err.message.includes('linear feet')) {
          userMessage = err.message // Validation errors are already user-friendly
        } else if (err.message.includes('gate') || err.message.includes('Gate')) {
          userMessage = err.message // Gate validation errors are user-friendly
        } else if (err.message.includes('corner') || err.message.includes('Corner')) {
          userMessage = err.message // Corner validation errors are user-friendly
        } else {
          // Generic fallback for other errors
          userMessage = 'Something went wrong. Please try again or contact support if the problem persists.'
        }
      }

      setError(userMessage)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4">
          <p className="font-semibold text-danger">Error</p>
          <p className="mt-1 text-sm text-danger/85">{error}</p>
        </div>
      )}

      {/* Customer Info */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
        <h2 className="mb-4 text-lg font-semibold text-text">Customer Information</h2>
        <div>
          <label className="mb-1 block text-sm font-medium text-muted">
            Customer Name
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Test Customer"
            className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-text placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
      </div>

      {/* Fence Design */}
      <div className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-card">
        <h2 className="text-lg font-semibold text-text">Fence Design</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-muted">
              Total Linear Feet *
            </label>
            <input
              type="number"
              value={totalLinearFeet}
              onChange={(e) => setTotalLinearFeet(Number(e.target.value))}
              min="1"
              max="10000"
              required
              className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-text placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-muted">
              Corner Count
            </label>
            <input
              type="number"
              value={cornerCount}
              onChange={(e) => setCornerCount(Number(e.target.value))}
              min="0"
              max="100"
              className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-text placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-muted">
              Height *
            </label>
            <select
              value={heightFt}
              onChange={(e) => setHeightFt(Number(e.target.value) as 4 | 6 | 8)}
              required
              className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-text focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            >
              <option value={4}>4 feet</option>
              <option value={6}>6 feet</option>
              <option value={8}>8 feet</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-muted">
              Frost Zone *
            </label>
            <select
              value={frostZone}
              onChange={(e) => setFrostZone(Number(e.target.value) as 1 | 2 | 3 | 4)}
              required
              className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-text focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            >
              <option value={1}>Zone 1 (18" frost depth)</option>
              <option value={2}>Zone 2 (30" frost depth)</option>
              <option value={3}>Zone 3 (36" frost depth)</option>
              <option value={4}>Zone 4 (48" frost depth)</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-muted">
              Soil Type *
            </label>
            <select
              value={soilType}
              onChange={(e) => setSoilType(e.target.value as 'normal' | 'sandy' | 'clay' | 'rocky')}
              required
              className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-text focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            >
              <option value="normal">Normal</option>
              <option value="sandy">Sandy</option>
              <option value="clay">Clay</option>
              <option value="rocky">Rocky</option>
            </select>
          </div>
        </div>
      </div>

      {/* Gates */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-text">Gates</h2>
          <button
            type="button"
            onClick={addGate}
            className="rounded-xl bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground transition hover:bg-accent/90"
          >
            + Add Gate
          </button>
        </div>

        {gates.length === 0 ? (
          <p className="text-sm text-muted">No gates added</p>
        ) : (
          <div className="space-y-3">
            {gates.map((gate, idx) => (
              <div key={idx} className="items-start gap-3 rounded-2xl border border-border bg-surface-2 p-4 sm:flex">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-muted">
                    Width (ft)
                  </label>
                  <input
                    type="number"
                    value={gate.width_ft}
                    onChange={(e) => updateGate(idx, 'width_ft', Number(e.target.value))}
                    min="3"
                    max="12"
                    step="0.5"
                    className="w-full rounded-xl border border-border bg-surface-3 px-3 py-2 text-text focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-muted">
                    Position (ft) - Optional
                  </label>
                  <input
                    type="number"
                    value={gate.position_ft || ''}
                    onChange={(e) => updateGate(idx, 'position_ft', Number(e.target.value))}
                    placeholder="Auto"
                    className="w-full rounded-xl border border-border bg-surface-3 px-3 py-2 text-text placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeGate(idx)}
                  className="mt-3 px-3 py-2 text-sm font-medium text-danger transition hover:text-danger/80 sm:mt-7"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-accent px-6 py-3 font-semibold text-accent-foreground transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:bg-surface-3 disabled:text-muted"
        >
          {loading ? 'Generating Estimate...' : 'Generate Estimate'}
        </button>
      </div>

      {/* Debug Info */}
      {loading && (
        <div className="rounded-2xl border border-info/30 bg-info/10 p-4 text-sm text-info">
          <p className="font-semibold">Processing...</p>
          <p className="mt-1 text-info/80">Creating job → design → running estimate → navigating to results</p>
        </div>
      )}
    </form>
  )
}
