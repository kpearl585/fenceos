/**
 * Advanced Estimator - Debug Dashboard
 * Internal-only monitoring for observability
 */

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function AdvancedEstimateDebugPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Get user's org_id
  const { data: userRecord } = await supabase
    .from('users')
    .select('org_id')
    .eq('auth_id', user.id)
    .single()

  if (!userRecord?.org_id) {
    return <div className="p-8 text-danger">User organization not found</div>
  }

  // Fetch recent events (last 50)
  const { data: recentEvents } = await supabase
    .from('estimator_events')
    .select('*')
    .eq('org_id', userRecord.org_id)
    .order('created_at', { ascending: false })
    .limit(50)

  // Fetch usage summary
  const { data: usageSummary } = await supabase
    .from('estimator_usage_summary')
    .select('*')
    .eq('org_id', userRecord.org_id)

  // Fetch error summary
  const { data: errorSummary } = await supabase
    .from('estimator_error_summary')
    .select('*')
    .eq('org_id', userRecord.org_id)
    .limit(20)

  // Fetch feedback (last 20 unresolved)
  const { data: feedbackList } = await supabase
    .from('estimator_feedback')
    .select('*')
    .eq('org_id', userRecord.org_id)
    .is('resolved_at', null)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 text-text">
      {/* Header */}
      <div className="mb-6">
        <Link href="/dashboard/advanced-estimate" className="text-accent-light hover:underline text-sm">
          ← Back to Advanced Estimator
        </Link>
        <h1 className="text-3xl font-bold text-text mt-2">Advanced Estimator Debug Dashboard</h1>
        <p className="text-muted mt-1">Observability &amp; feedback monitoring</p>
      </div>

      {/* Usage Summary */}
      <div className="bg-surface rounded-lg border border-border shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Usage Summary (Last 30 Days)</h2>
        {!usageSummary || usageSummary.length === 0 ? (
          <p className="text-muted">No usage data yet</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {usageSummary.map((summary: any) => (
              <div key={summary.event_type} className={`p-4 rounded-lg ${
                summary.event_type === 'completed' ? 'bg-accent/10 border border-accent/20' :
                summary.event_type === 'failed' ? 'bg-danger/10 border border-danger/20' :
                'bg-info/10 border border-info/20'
              }`}>
                <p className={`text-sm font-medium ${
                  summary.event_type === 'completed' ? 'text-accent-light' :
                  summary.event_type === 'failed' ? 'text-danger' :
                  'text-info'
                }`}>
                  {summary.event_type.toUpperCase()}
                </p>
                <p className="text-3xl font-bold mt-1 text-text">
                  {summary.event_count}
                </p>
                {summary.avg_duration_ms && (
                  <p className="text-xs text-muted mt-1">
                    Avg: {Math.round(summary.avg_duration_ms)}ms
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unresolved Feedback */}
      {feedbackList && feedbackList.length > 0 && (
        <div className="bg-surface rounded-lg border border-border shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Unresolved Feedback ({feedbackList.length})</h2>
          <div className="space-y-3">
            {feedbackList.map((feedback: any) => (
              <div key={feedback.id} className={`p-4 rounded-lg border ${
                feedback.feedback_type === 'issue' ? 'bg-danger/10 border-danger/30' :
                feedback.feedback_type === 'suggestion' ? 'bg-info/10 border-info/30' :
                'bg-surface-2 border-border'
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${
                    feedback.feedback_type === 'issue' ? 'bg-danger/20 text-danger' :
                    feedback.feedback_type === 'suggestion' ? 'bg-info/20 text-info' :
                    'bg-surface-3 text-text'
                  }`}>
                    {feedback.feedback_type}
                  </span>
                  <span className="text-xs text-muted">
                    {new Date(feedback.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-text">{feedback.message}</p>
                {feedback.page_url && (
                  <p className="text-xs text-muted mt-1 truncate">
                    From: {feedback.page_url}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Summary */}
      {errorSummary && errorSummary.length > 0 && (
        <div className="bg-surface rounded-lg border border-border shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Recent Errors (Last 7 Days)</h2>
          <div className="space-y-2">
            {errorSummary.map((error: any, idx: number) => (
              <div key={idx} className="p-3 bg-danger/10 border border-danger/30 rounded">
                <div className="flex justify-between items-start mb-1">
                  <p className="text-sm font-semibold text-danger">
                    {error.error_message}
                  </p>
                  <span className="text-xs text-danger bg-danger/20 px-2 py-1 rounded">
                    {error.occurrence_count}x
                  </span>
                </div>
                <p className="text-xs text-muted">
                  First: {new Date(error.first_occurred).toLocaleString()} |
                  Last: {new Date(error.last_occurred).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Events Log */}
      <div className="bg-surface rounded-lg border border-border shadow overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-semibold">Recent Events (Last 50)</h2>
        </div>
        {!recentEvents || recentEvents.length === 0 ? (
          <div className="p-6 text-muted">No events yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-2">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Event</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Result</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentEvents.map((event: any) => (
                  <tr key={event.id} className="hover:bg-surface-2">
                    <td className="px-4 py-3 text-xs text-text whitespace-nowrap">
                      {new Date(event.created_at).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${
                        event.event_type === 'completed' ? 'bg-accent/15 text-accent-light' :
                        event.event_type === 'failed' ? 'bg-danger/15 text-danger' :
                        'bg-info/15 text-info'
                      }`}>
                        {event.event_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {event.error_message ? (
                        <span className="text-danger">{event.error_message.substring(0, 80)}...</span>
                      ) : event.result_summary ? (
                        <span className="text-accent-light">
                          Cost: ${event.result_summary.total_cost?.toFixed(0)},
                          LF: {event.result_summary.total_lf}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-text text-right font-mono">
                      {event.duration_ms ? `${event.duration_ms}ms` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="mt-6 bg-surface rounded-lg border border-border p-4 text-xs text-muted">
        <p className="font-semibold mb-2">🔍 Observability Active</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Usage events tracked automatically</li>
          <li>Errors captured in Sentry + database</li>
          <li>User feedback collected via button on results page</li>
          <li>Performance metrics (duration) tracked</li>
        </ul>
      </div>
    </div>
  )
}
