/**
 * Phase 1 Estimator - Results Screen
 * Display estimate and BOM from deployed API
 */

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import Phase1FeedbackButton from "@/components/Phase1FeedbackButton"

export default async function Phase1ResultsPage({
  params
}: {
  params: Promise<{ design_id: string }>
}) {
  const { design_id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Fetch design
  const { data: design, error: designError } = await supabase
    .from('fence_designs')
    .select('*')
    .eq('id', design_id)
    .single()

  if (designError || !design) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <h2 className="text-red-800 font-semibold">Design Not Found</h2>
          <p className="text-red-700 mt-2">Design ID: {design_id}</p>
          <Link href="/dashboard/phase1-estimator" className="text-blue-600 underline mt-2 inline-block">
            ← Back to Estimator
          </Link>
        </div>
      </div>
    )
  }

  // Fetch BOM
  const { data: bomData, error: bomError } = await supabase
    .from('boms')
    .select('*')
    .eq('design_id', design_id)
    .single()

  if (bomError || !bomData) {
    return (
      <div className="p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
          <h2 className="text-yellow-800 font-semibold">BOM Not Found</h2>
          <p className="text-yellow-700 mt-2">Estimate may not have completed. Design ID: {design_id}</p>
          <Link href="/dashboard/phase1-estimator" className="text-blue-600 underline mt-2 inline-block">
            ← Back to Estimator
          </Link>
        </div>
      </div>
    )
  }

  // Fetch BOM lines
  const { data: bomLines, error: bomLinesError } = await supabase
    .from('bom_lines')
    .select('*')
    .eq('bom_id', bomData.id)
    .order('sort_order')

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/dashboard/phase1-estimator" className="text-blue-600 hover:underline text-sm">
          ← New Estimate
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-2">Estimate Results</h1>
        <p className="text-gray-600 mt-1">Design ID: {design_id.substring(0, 8)}...</p>
      </div>

      {/* Design Summary */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Design Summary</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Linear Feet</p>
            <p className="text-2xl font-bold text-gray-900">{design.total_linear_feet}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Height</p>
            <p className="text-2xl font-bold text-gray-900">{design.height_ft} ft</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Nodes</p>
            <p className="text-2xl font-bold text-gray-900">{design.total_node_count || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Sections</p>
            <p className="text-2xl font-bold text-gray-900">{design.total_section_count || 0}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t">
          <div>
            <p className="text-sm text-gray-600">Frost Zone</p>
            <p className="text-lg font-semibold text-gray-900">Zone {design.frost_zone}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Soil Type</p>
            <p className="text-lg font-semibold text-gray-900 capitalize">{design.soil_type}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Fence Type</p>
            <p className="text-lg font-semibold text-gray-900">{design.fence_type_id}</p>
          </div>
        </div>
      </div>

      {/* BOM Summary */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">BOM Summary</h2>
        {bomData.summary && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-600 font-medium">Posts</p>
              <p className="text-3xl font-bold text-blue-900">{bomData.summary.total_posts || 0}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-600 font-medium">Rails</p>
              <p className="text-3xl font-bold text-green-900">{bomData.summary.total_rails || 0}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm text-purple-600 font-medium">Pickets</p>
              <p className="text-3xl font-bold text-purple-900">{bomData.summary.total_pickets || 0}</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <p className="text-sm text-orange-600 font-medium">Concrete</p>
              <p className="text-3xl font-bold text-orange-900">{bomData.summary.total_concrete_bags || 0}</p>
              <p className="text-xs text-orange-600 mt-1">bags</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 font-medium">Gates</p>
              <p className="text-3xl font-bold text-gray-900">{bomData.summary.total_gates || 0}</p>
            </div>
          </div>
        )}
        <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Total Line Items</p>
            <p className="font-semibold text-gray-900">{bomData.total_line_count}</p>
          </div>
          <div>
            <p className="text-gray-600">Calculation Time</p>
            <p className="font-semibold text-gray-900">{bomData.calculation_time_ms || 0}ms</p>
          </div>
        </div>
      </div>

      {/* Validation Results */}
      {bomData.validation_errors && bomData.validation_errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-red-900 mb-4">⛔ Validation Errors</h2>
          <ul className="space-y-2">
            {(bomData.validation_errors as any[]).map((err: any, idx: number) => (
              <li key={idx} className="text-red-800">
                <span className="font-semibold">{err.rule_id}:</span> {err.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {bomData.validation_warnings && bomData.validation_warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-yellow-900 mb-4">⚠️ Warnings</h2>
          <ul className="space-y-2">
            {(bomData.validation_warnings as any[]).map((warn: any, idx: number) => (
              <li key={idx} className="text-yellow-800 text-sm">
                <span className="font-semibold">{warn.rule_id}:</span> {warn.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* BOM Line Items */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Bill of Materials</h2>
        </div>
        {bomLinesError || !bomLines || bomLines.length === 0 ? (
          <div className="p-6 text-gray-500">No BOM line items found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Raw</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Waste</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Insurance</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Order Qty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Calculation Notes</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bomLines.map((line: any) => (
                  <tr key={line.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${
                        line.category === 'post' ? 'bg-blue-100 text-blue-800' :
                        line.category === 'rail' ? 'bg-green-100 text-green-800' :
                        line.category === 'picket' ? 'bg-purple-100 text-purple-800' :
                        line.category === 'concrete' ? 'bg-orange-100 text-orange-800' :
                        line.category === 'gate' ? 'bg-pink-100 text-pink-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {line.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{line.description}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right font-mono">{line.raw_quantity}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-right font-mono">{line.waste_quantity || 0}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-right font-mono">{line.insurance_quantity || 0}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right font-semibold font-mono">{line.order_quantity}</td>
                    <td className="px-6 py-4 text-xs text-gray-500 max-w-md">{line.calculation_notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Debug Info */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4 text-xs text-gray-600">
        <p className="font-semibold mb-2">✅ Phase 1 API Validation Complete</p>
        <p>This page rendered using:</p>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>Database query to fence_designs table (RLS protected)</li>
          <li>Database query to boms table (RLS protected)</li>
          <li>Database query to bom_lines table</li>
          <li>No client-side calculations - all data from deployed Phase 1 backend</li>
        </ul>
      </div>

      {/* Feedback Button */}
      <Phase1FeedbackButton designId={design_id} />
    </div>
  )
}
