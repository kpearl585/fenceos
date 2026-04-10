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
    setLoading(true)
    setError(null)

    try {
      // Step 1: Create Job
      const jobRes = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName || 'Test Customer',
          customer_email: userEmail,
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
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-semibold">Error</p>
          <p className="text-red-700 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Customer Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Customer Information</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Customer Name
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Test Customer"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Fence Design */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold">Fence Design</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Linear Feet *
            </label>
            <input
              type="number"
              value={totalLinearFeet}
              onChange={(e) => setTotalLinearFeet(Number(e.target.value))}
              min="1"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Corner Count
            </label>
            <input
              type="number"
              value={cornerCount}
              onChange={(e) => setCornerCount(Number(e.target.value))}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Height *
            </label>
            <select
              value={heightFt}
              onChange={(e) => setHeightFt(Number(e.target.value) as 4 | 6 | 8)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={4}>4 feet</option>
              <option value={6}>6 feet</option>
              <option value={8}>8 feet</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Frost Zone *
            </label>
            <select
              value={frostZone}
              onChange={(e) => setFrostZone(Number(e.target.value) as 1 | 2 | 3 | 4)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={1}>Zone 1 (18" frost depth)</option>
              <option value={2}>Zone 2 (30" frost depth)</option>
              <option value={3}>Zone 3 (36" frost depth)</option>
              <option value={4}>Zone 4 (48" frost depth)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Soil Type *
            </label>
            <select
              value={soilType}
              onChange={(e) => setSoilType(e.target.value as 'normal' | 'sandy' | 'clay' | 'rocky')}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Gates</h2>
          <button
            type="button"
            onClick={addGate}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + Add Gate
          </button>
        </div>

        {gates.length === 0 ? (
          <p className="text-gray-500 text-sm">No gates added</p>
        ) : (
          <div className="space-y-3">
            {gates.map((gate, idx) => (
              <div key={idx} className="flex gap-3 items-start">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Width (ft)
                  </label>
                  <input
                    type="number"
                    value={gate.width_ft}
                    onChange={(e) => updateGate(idx, 'width_ft', Number(e.target.value))}
                    min="3"
                    max="12"
                    step="0.5"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Position (ft) - Optional
                  </label>
                  <input
                    type="number"
                    value={gate.position_ft || ''}
                    onChange={(e) => updateGate(idx, 'position_ft', Number(e.target.value))}
                    placeholder="Auto"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeGate(idx)}
                  className="mt-7 px-3 py-2 text-sm text-red-600 hover:text-red-800"
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
          className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Generating Estimate...' : 'Generate Estimate'}
        </button>
      </div>

      {/* Debug Info */}
      {loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <p className="font-semibold">Processing...</p>
          <p className="mt-1">Creating job → design → running estimate → navigating to results</p>
        </div>
      )}
    </form>
  )
}
