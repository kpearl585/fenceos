import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { inferFenceTypeFromProductLineId } from "@/lib/fence-graph/estimateInput";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata = { title: "Analytics — FenceEstimatePro" };

function fmt(n: number) {
  return "$" + Math.round(n).toLocaleString("en-US");
}
function pct(n: number) {
  return Math.round(n) + "%";
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color ?? "text-fence-900"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const profile = await ensureProfile(supabase, user);
  const admin = createAdminClient();
  if (profile.role !== "owner" && profile.role !== "sales") redirect("/dashboard");

  const orgId = profile.org_id;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch all estimates + jobs in parallel
  const [estimatesRes, jobsRes, fenceGraphsRes] = await Promise.all([
    admin.from("estimates").select("id, status, total, fence_type, linear_feet, created_at, margin_pct").eq("org_id", orgId).order("created_at", { ascending: false }),
    admin.from("jobs").select("id, status, total_price, created_at, paid_at, completed_at").eq("org_id", orgId).order("created_at", { ascending: false }),
    admin.from("fence_graphs").select("id, status, total_lf, total_cost, input_json, closed_at, closeout_actual_waste_pct, created_at").eq("org_id", orgId).order("created_at", { ascending: false }),
  ]);

  const estimates = estimatesRes.data ?? [];
  const jobs = jobsRes.data ?? [];
  const fenceGraphs = fenceGraphsRes.data ?? [];

  // ── Core estimate metrics ──────────────────────────────────────
  const totalEstimates = estimates.length;
  const sentEstimates = estimates.filter((e) => ["quoted", "accepted", "deposit_paid", "converted", "rejected", "expired"].includes(e.status));
  const acceptedEstimates = estimates.filter((e) => ["accepted", "deposit_paid", "converted"].includes(e.status));
  const winRate = sentEstimates.length > 0
    ? Math.round((acceptedEstimates.length / sentEstimates.length) * 100)
    : 0;

  const totalEstimateValue = estimates.reduce((s, e) => s + (e.total ?? 0), 0);
  const avgEstimateValue = totalEstimates > 0 ? totalEstimateValue / totalEstimates : 0;
  const avgMargin = estimates.filter(e => e.margin_pct).reduce((s, e) => s + (e.margin_pct ?? 0), 0) / (estimates.filter(e => e.margin_pct).length || 1);

  // ── 30-day pipeline ────────────────────────────────────────────
  const recent = estimates.filter(e => e.created_at >= thirtyDaysAgo);
  const recentValue = recent.reduce((s, e) => s + (e.total ?? 0), 0);

  // ── Job metrics ────────────────────────────────────────────────
  const completedJobs = jobs.filter(j => j.status === "complete");
  const activeJobs = jobs.filter(j => j.status === "active");
  const totalRevenue = completedJobs.reduce((s, j) => s + (j.total_price ?? 0), 0);
  const avgJobValue = completedJobs.length > 0 ? totalRevenue / completedJobs.length : 0;

  // ── By fence type breakdown ────────────────────────────────────
  const byType: Record<string, { count: number; value: number; won: number }> = {};
  for (const e of estimates) {
    const t = e.fence_type ?? "unknown";
    if (!byType[t]) byType[t] = { count: 0, value: 0, won: 0 };
    byType[t].count++;
    byType[t].value += e.total ?? 0;
    if (["accepted", "deposit_paid", "converted"].includes(e.status)) byType[t].won++;
  }

  // ── FenceGraph usage ───────────────────────────────────────────
  const closedGraphs = fenceGraphs.filter(g => g.status === "closed");
  const avgActualWaste = closedGraphs.length > 0
    ? closedGraphs.reduce((s, g) => s + (g.closeout_actual_waste_pct ?? 0), 0) / closedGraphs.length
    : null;

  // ── Monthly revenue trend (last 6 months) ─────────────────────
  const monthlyRevenue: Record<string, number> = {};
  for (const j of completedJobs) {
    const revenueDate = j.paid_at ?? j.completed_at ?? j.created_at;
    const d = new Date(revenueDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyRevenue[key] = (monthlyRevenue[key] ?? 0) + (j.total_price ?? 0);
  }
  const monthKeys = Object.keys(monthlyRevenue).sort().slice(-6);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-fence-950">Analytics</h1>
            <p className="text-gray-500 text-sm mt-1">Business performance · All time unless noted</p>
          </div>
          <Link href="/dashboard" className="text-sm text-fence-600 hover:underline">Back to Dashboard</Link>
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <StatCard label="Win Rate" value={`${winRate}%`} sub={`${acceptedEstimates.length} of ${sentEstimates.length} sent`} color={winRate >= 40 ? "text-green-700" : winRate >= 25 ? "text-amber-600" : "text-red-600"} />
          <StatCard label="Avg Estimate" value={fmt(avgEstimateValue)} sub={`${totalEstimates} total estimates`} />
          <StatCard label="Avg Margin" value={pct(avgMargin)} sub="Across all estimates" color={avgMargin >= 30 ? "text-green-700" : "text-amber-600"} />
          <StatCard label="Total Revenue" value={fmt(totalRevenue)} sub={`${completedJobs.length} completed jobs`} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard label="Active Jobs" value={String(activeJobs.length)} sub="In progress right now" />
          <StatCard label="Avg Job Value" value={fmt(avgJobValue)} sub="Completed jobs" />
          <StatCard label="30-Day Pipeline" value={fmt(recentValue)} sub={`${recent.length} new estimates`} />
          <StatCard label="FenceGraph Jobs" value={String(closedGraphs.length)} sub={avgActualWaste != null ? `Avg waste: ${(avgActualWaste * 100).toFixed(1)}%` : "Calibration building..."} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* By fence type */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-fence-900 mb-4">Estimates by Fence Type</h2>
            <div className="space-y-3">
              {Object.entries(byType)
                .sort(([,a], [,b]) => b.value - a.value)
                .map(([type, data]) => {
                  const typeWinRate = data.count > 0 ? Math.round((data.won / data.count) * 100) : 0;
                  return (
                    <div key={type} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-800 capitalize">{type.replace("_", " ")}</p>
                        <p className="text-xs text-gray-400">{data.count} estimates · {typeWinRate}% win rate</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-fence-900">{fmt(data.value)}</p>
                        <p className="text-xs text-gray-400">{fmt(data.value / (data.count || 1))} avg</p>
                      </div>
                    </div>
                  );
                })}
              {Object.keys(byType).length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No estimates yet</p>
              )}
            </div>
          </div>

          {/* Revenue trend */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-fence-900 mb-4">Monthly Revenue (Last 6 Months)</h2>
            {monthKeys.length > 0 ? (
              <div className="space-y-3">
                {monthKeys.map(key => {
                  const val = monthlyRevenue[key] ?? 0;
                  const maxVal = Math.max(...monthKeys.map(k => monthlyRevenue[k] ?? 0));
                  const barWidth = maxVal > 0 ? Math.round((val / maxVal) * 100) : 0;
                  const [year, month] = key.split("-");
                  const label = new Date(Number(year), Number(month) - 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-16 flex-shrink-0">{label}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className="bg-fence-600 h-2 rounded-full transition-all" style={{ width: `${barWidth}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-gray-700 w-20 text-right">{fmt(val)}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-24">
                <p className="text-sm text-gray-400">Complete jobs to see revenue trend</p>
              </div>
            )}
          </div>
        </div>

        {/* Estimate pipeline */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="font-semibold text-fence-900 mb-4">Estimate Pipeline</h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {[
              { label: "Draft", statuses: ["draft"], color: "bg-gray-200 text-gray-700" },
              { label: "Sent", statuses: ["quoted", "rejected", "expired"], color: "bg-blue-100 text-blue-700" },
              { label: "Accepted", statuses: ["accepted", "deposit_paid", "converted"], color: "bg-green-100 text-green-700" },
              { label: "Jobs", statuses: [], jobCount: jobs.length, color: "bg-fence-100 text-fence-700" },
              { label: "Completed", statuses: [], jobCount: completedJobs.length, color: "bg-fence-900 text-white" },
            ].map(stage => {
              const count = stage.jobCount ?? estimates.filter(e => stage.statuses.includes(e.status)).length;
              return (
                <div key={stage.label} className={`rounded-xl p-4 text-center ${stage.color}`}>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs font-semibold mt-1">{stage.label}</p>
                </div>
              );
            })}
          </div>
          {totalEstimates > 0 && (
            <div className="mt-4 flex items-center gap-2">
              <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden flex">
                {[
                  { pct: Math.round((estimates.filter(e => e.status === "draft").length / totalEstimates) * 100), color: "bg-gray-400" },
                  { pct: Math.round((sentEstimates.length / totalEstimates) * 100), color: "bg-blue-400" },
                  { pct: Math.round((acceptedEstimates.length / totalEstimates) * 100), color: "bg-green-500" },
                ].map((seg, i) => (
                  <div key={i} className={`h-full ${seg.color}`} style={{ width: `${seg.pct}%` }} />
                ))}
              </div>
              <span className="text-xs text-gray-500">{winRate}% close rate</span>
            </div>
          )}
        </div>

        {/* Recent AI extractions */}
        {fenceGraphs.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-fence-900">FenceGraph Advanced Estimates</h2>
              <Link href="/dashboard/advanced-estimate/saved" className="text-xs text-fence-600 font-semibold hover:underline">View all →</Link>
            </div>
            <div className="divide-y divide-gray-50">
              {fenceGraphs.slice(0, 5).map(g => {
                const input = g.input_json as { fenceType?: string } | null;
                const fenceType = input?.fenceType ?? inferFenceTypeFromProductLineId((g.input_json as { productLineId?: string } | null)?.productLineId) ?? "Unknown";
                return (
                  <div key={g.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-800 capitalize">{fenceType.replace("_", " ")} · {g.total_lf ?? "—"} LF</p>
                      <p className="text-xs text-gray-400">{new Date(g.created_at).toLocaleDateString()} · {g.status}</p>
                    </div>
                    <p className="text-sm font-bold text-fence-900">{g.total_cost ? fmt(g.total_cost) : "—"}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
