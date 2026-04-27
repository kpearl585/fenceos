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
        <div className="rounded-xl border border-danger/30 bg-danger/10 p-4">
          <h2 className="font-semibold text-danger">Design Not Found</h2>
          <p className="mt-2 text-sm text-danger/80">Design ID: {design_id}</p>
          <Link href="/dashboard/phase1-estimator" className="mt-2 inline-block text-sm font-medium text-accent-light hover:text-accent">
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
        <div className="rounded-xl border border-warning/30 bg-warning/10 p-4">
          <h2 className="font-semibold text-warning">BOM Not Found</h2>
          <p className="mt-2 text-sm text-warning/80">Estimate may not have completed. Design ID: {design_id}</p>
          <Link href="/dashboard/phase1-estimator" className="mt-2 inline-block text-sm font-medium text-accent-light hover:text-accent">
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
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/dashboard/phase1-estimator" className="text-sm font-medium text-accent-light hover:text-accent">
          ← New Estimate
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-text">Estimate Results</h1>
        <p className="mt-1 text-sm text-muted">Design ID: {design_id.substring(0, 8)}...</p>
      </div>

      {/* Design Summary */}
      <div className="mb-6 rounded-2xl border border-border bg-surface p-6 shadow-card">
        <h2 className="mb-4 text-xl font-semibold text-text">Design Summary</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted">Linear Feet</p>
            <p className="text-2xl font-bold text-text">{design.total_linear_feet}</p>
          </div>
          <div>
            <p className="text-sm text-muted">Height</p>
            <p className="text-2xl font-bold text-text">{design.height_ft} ft</p>
          </div>
          <div>
            <p className="text-sm text-muted">Nodes</p>
            <p className="text-2xl font-bold text-text">{design.total_node_count || 0}</p>
          </div>
          <div>
            <p className="text-sm text-muted">Sections</p>
            <p className="text-2xl font-bold text-text">{design.total_section_count || 0}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted">Frost Zone</p>
            <p className="text-lg font-semibold text-text">Zone {design.frost_zone}</p>
          </div>
          <div>
            <p className="text-sm text-muted">Soil Type</p>
            <p className="text-lg font-semibold capitalize text-text">{design.soil_type}</p>
          </div>
          <div>
            <p className="text-sm text-muted">Fence Type</p>
            <p className="text-lg font-semibold text-text">{design.fence_type_id}</p>
          </div>
        </div>
      </div>

      {/* BOM Summary */}
      <div className="mb-6 rounded-2xl border border-border bg-surface p-6 shadow-card">
        <h2 className="mb-4 text-xl font-semibold text-text">BOM Summary</h2>
        {bomData.summary && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="rounded-xl border border-info/20 bg-info/10 p-4">
              <p className="text-sm font-medium text-info">Posts</p>
              <p className="text-3xl font-bold text-text">{bomData.summary.total_posts || 0}</p>
            </div>
            <div className="rounded-xl border border-accent/20 bg-accent/10 p-4">
              <p className="text-sm font-medium text-accent-light">Rails</p>
              <p className="text-3xl font-bold text-text">{bomData.summary.total_rails || 0}</p>
            </div>
            <div className="rounded-xl border border-fence-500/20 bg-fence-500/10 p-4">
              <p className="text-sm font-medium text-fence-200">Pickets</p>
              <p className="text-3xl font-bold text-text">{bomData.summary.total_pickets || 0}</p>
            </div>
            <div className="rounded-xl border border-warning/20 bg-warning/10 p-4">
              <p className="text-sm font-medium text-warning">Concrete</p>
              <p className="text-3xl font-bold text-text">{bomData.summary.total_concrete_bags || 0}</p>
              <p className="mt-1 text-xs text-warning/80">bags</p>
            </div>
            <div className="rounded-xl border border-border bg-surface-2 p-4">
              <p className="text-sm font-medium text-muted">Gates</p>
              <p className="text-3xl font-bold text-text">{bomData.summary.total_gates || 0}</p>
            </div>
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm">
          <div>
            <p className="text-muted">Total Line Items</p>
            <p className="font-semibold text-text">{bomData.total_line_count}</p>
          </div>
          <div>
            <p className="text-muted">Calculation Time</p>
            <p className="font-semibold text-text">{bomData.calculation_time_ms || 0}ms</p>
          </div>
        </div>
      </div>

      {/* Validation Results */}
      {bomData.validation_errors && bomData.validation_errors.length > 0 && (
        <div className="mb-6 rounded-2xl border border-danger/30 bg-danger/10 p-6">
          <h2 className="mb-4 text-xl font-semibold text-danger">⛔ Validation Errors</h2>
          <ul className="space-y-2">
            {(bomData.validation_errors as any[]).map((err: any, idx: number) => (
              <li key={idx} className="text-sm text-danger/90">
                <span className="font-semibold">{err.rule_id}:</span> {err.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {bomData.validation_warnings && bomData.validation_warnings.length > 0 && (
        <div className="mb-6 rounded-2xl border border-warning/30 bg-warning/10 p-6">
          <h2 className="mb-4 text-xl font-semibold text-warning">⚠️ Warnings</h2>
          <ul className="space-y-2">
            {(bomData.validation_warnings as any[]).map((warn: any, idx: number) => (
              <li key={idx} className="text-sm text-warning/90">
                <span className="font-semibold">{warn.rule_id}:</span> {warn.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* BOM Line Items */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
        <div className="border-b border-border p-6">
          <h2 className="text-xl font-semibold text-text">Bill of Materials</h2>
        </div>
        {bomLinesError || !bomLines || bomLines.length === 0 ? (
          <div className="p-6 text-muted">No BOM line items found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-2">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">Description</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted">Raw</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted">Waste</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted">Insurance</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted">Order Qty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">Calculation Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {bomLines.map((line: any) => (
                  <tr key={line.id} className="hover:bg-surface-2/60">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        line.category === 'post' ? 'bg-info/15 text-info' :
                        line.category === 'rail' ? 'bg-accent/15 text-accent-light' :
                        line.category === 'picket' ? 'bg-fence-500/15 text-fence-200' :
                        line.category === 'concrete' ? 'bg-warning/15 text-warning' :
                        line.category === 'gate' ? 'bg-danger/15 text-danger/90' :
                        'bg-surface-3 text-muted'
                      }`}>
                        {line.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-text">{line.description}</td>
                    <td className="px-6 py-4 text-right font-mono text-sm text-text">{line.raw_quantity}</td>
                    <td className="px-6 py-4 text-right font-mono text-sm text-muted">{line.waste_quantity || 0}</td>
                    <td className="px-6 py-4 text-right font-mono text-sm text-muted">{line.insurance_quantity || 0}</td>
                    <td className="px-6 py-4 text-right font-mono text-sm font-semibold text-text">{line.order_quantity}</td>
                    <td className="max-w-md px-6 py-4 text-xs text-muted">{line.calculation_notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Debug Info */}
      <div className="mt-6 rounded-2xl border border-accent/20 bg-accent/10 p-4 text-xs text-muted">
        <p className="mb-2 font-semibold text-accent-light">✅ Phase 1 API Validation Complete</p>
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
