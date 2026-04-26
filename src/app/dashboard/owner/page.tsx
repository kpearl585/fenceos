import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { redirect } from "next/navigation";
import { canAccess } from "@/lib/roles";
import ExportCSV from "@/components/dashboard/ExportCSV";
import UpgradeGate from "@/components/dashboard/UpgradeGate";
import { getPlanLimits } from "@/lib/planLimits";
import { getOrgMarginTargets } from "@/lib/marginTargets";

/* ── Types ── */
interface SummaryData {
  total_quoted_revenue: number;
  total_accepted_revenue: number;
  total_active_job_revenue: number;
  total_completed_revenue: number;
  total_estimated_gross_profit: number;
  total_actual_gross_profit: number;
  avg_margin_pct: number;
  jobs_below_target_margin_count: number;
  margin_delta_from_change_orders: number;
}

interface RiskJob {
  job_id: string;
  job_title: string;
  customer_name: string | null;
  status: string;
  total_price: number;
  total_cost: number;
  gross_profit: number;
  gross_margin_pct: number;
  original_estimated_margin_pct: number;
  target_margin_pct: number;
  margin_delta_from_change_orders: number;
  margin_erosion_pct: number;
  is_below_target: boolean;
}

/* ── Formatters ── */
function fmt(v: number | string | null) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(v) || 0);
}

function fmtPct(v: number | string | null) {
  return `${(Number(v || 0) * 100).toFixed(1)}%`;
}

function marginColor(pct: number, target: number): string {
  if (pct >= target) return "text-accent-light";
  if (pct >= target * 0.85) return "text-warning";
  return "text-danger";
}

function marginBg(pct: number, target: number): string {
  if (pct >= target) return "bg-accent/10 border-accent/30";
  if (pct >= target * 0.85) return "bg-warning/10 border-warning/30";
  return "bg-danger/10 border-danger/30";
}

function statusBadge(status: string): string {
  switch (status) {
    case "active":
      return "bg-info/15 text-info";
    case "complete":
      return "bg-accent/15 text-accent-light";
    case "scheduled":
      return "bg-surface-3 text-text";
    default:
      return "bg-surface-3 text-muted";
  }
}

/* ── Page Component ── */
export default async function OwnerDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);

  // Server-side role guard — strict owner-only
  if (!canAccess(profile.role, "owner")) {
    redirect("/dashboard");
  }

  // Plan gate — P&L dashboard requires Pro or above
  const adminForPlan = createAdminClient();
  const { data: orgForPlan } = await adminForPlan.from("organizations").select("plan").eq("id", profile.org_id).single();
  if (!getPlanLimits(orgForPlan?.plan).pnlDashboard) {
    return <UpgradeGate feature="Owner P&L Dashboard" requiredPlan="Pro" trigger="feature_pipeline" description="Full financial overview across all jobs and estimates — revenue, gross profit, margin tracking, and jobs at risk. Available on Pro and Business." />;
  }

  // (original role guard — now handled above, this block intentionally removed)
  if (false) {
    redirect("/dashboard");
  }

  // Single query: summary view
  const { data: summaryRows, error: summaryErr } = await supabase
    .from("owner_margin_summary_view")
    .select("*")
    .eq("org_id", profile.org_id);

  // Single query: risk jobs view
  const { data: riskRows, error: riskErr } = await supabase
    .from("owner_jobs_risk_view")
    .select("*")
    .eq("org_id", profile.org_id)
    .order("margin_erosion_pct", { ascending: false });

  const hasError = summaryErr || riskErr;

  const summary: SummaryData = (summaryRows?.[0] as SummaryData) ?? {
    total_quoted_revenue: 0,
    total_accepted_revenue: 0,
    total_active_job_revenue: 0,
    total_completed_revenue: 0,
    total_estimated_gross_profit: 0,
    total_actual_gross_profit: 0,
    avg_margin_pct: 0,
    jobs_below_target_margin_count: 0,
    margin_delta_from_change_orders: 0,
  };

  const atRiskJobs: RiskJob[] = (riskRows as RiskJob[]) ?? [];
  const totalRevenue =
    Number(summary.total_active_job_revenue) +
    Number(summary.total_completed_revenue);
  const totalProfit = Number(summary.total_actual_gross_profit);
  const avgMargin = Number(summary.avg_margin_pct);
  const belowCount = Number(summary.jobs_below_target_margin_count);
  const coDelta = Number(summary.margin_delta_from_change_orders);
  // Use the org's configured target (editable in Settings) rather than a
  // hardcoded 35%. Falls back to 0.35 only if the org_settings row is
  // missing — consistent with /dashboard/page.tsx since 21574d2.
  const { target: TARGET } = await getOrgMarginTargets(profile.org_id);

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Owner P&amp;L Dashboard</h1>
          <p className="text-sm text-muted mt-0.5">
            Financial overview across all jobs and estimates. Owner access only.
          </p>
        </div>
        <ExportCSV data={atRiskJobs} />
      </div>

      {/* Error state */}
      {hasError && (
        <div className="bg-danger/10 border-2 border-danger/30 rounded-xl p-4 mb-6">
          <p className="text-sm font-semibold text-danger">
            Failed to load financial data. Please refresh or contact support.
          </p>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Revenue */}
        <div className="bg-surface rounded-xl shadow-sm border border-border p-5">
          <p className="text-xs text-muted uppercase tracking-wider font-medium">
            Total Revenue
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-text mt-2">
            {fmt(totalRevenue)}
          </p>
          <p className="text-xs text-muted mt-1">
            Active + Completed
          </p>
        </div>

        {/* Total Gross Profit */}
        <div className="bg-surface rounded-xl shadow-sm border border-border p-5">
          <p className="text-xs text-muted uppercase tracking-wider font-medium">
            Gross Profit
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-text mt-2">
            {fmt(totalProfit)}
          </p>
          <p className="text-xs text-muted mt-1">
            CO Impact: {coDelta >= 0 ? "+" : ""}{fmt(coDelta)}
          </p>
        </div>

        {/* Average Margin */}
        <div className={`rounded-xl shadow-sm border-2 p-5 ${marginBg(avgMargin, TARGET)}`}>
          <p className="text-xs text-muted uppercase tracking-wider font-medium">
            Avg Margin
          </p>
          <p className={`text-2xl sm:text-3xl font-bold mt-2 ${marginColor(avgMargin, TARGET)}`}>
            {fmtPct(avgMargin)}
          </p>
          <p className="text-xs text-muted mt-1">
            Target: {fmtPct(TARGET)}
          </p>
        </div>

        {/* Jobs Below Target */}
        <div className={`rounded-xl shadow-sm border-2 p-5 ${
          belowCount > 0
            ? "bg-danger/10 border-danger/30"
            : "bg-accent/10 border-accent/30"
        }`}>
          <p className="text-xs text-muted uppercase tracking-wider font-medium">
            Below Target
          </p>
          <p className={`text-2xl sm:text-3xl font-bold mt-2 ${
            belowCount > 0 ? "text-danger" : "text-accent-light"
          }`}>
            {belowCount}
          </p>
          <p className="text-xs text-muted mt-1">
            {belowCount === 0 ? "All margins healthy" : `job${belowCount !== 1 ? "s" : ""} at risk`}
          </p>
        </div>
      </div>

      {/* ── Pipeline Breakdown ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-surface rounded-xl border border-border p-4">
          <p className="text-xs text-muted uppercase tracking-wider">Quoted</p>
          <p className="text-lg font-bold text-text mt-1">
            {fmt(summary.total_quoted_revenue)}
          </p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4">
          <p className="text-xs text-muted uppercase tracking-wider">Accepted</p>
          <p className="text-lg font-bold text-text mt-1">
            {fmt(summary.total_accepted_revenue)}
          </p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4">
          <p className="text-xs text-muted uppercase tracking-wider">Active Jobs</p>
          <p className="text-lg font-bold text-text mt-1">
            {fmt(summary.total_active_job_revenue)}
          </p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4">
          <p className="text-xs text-muted uppercase tracking-wider">Completed</p>
          <p className="text-lg font-bold text-text mt-1">
            {fmt(summary.total_completed_revenue)}
          </p>
        </div>
      </div>

      {/* ── Risk Alert Banner ── */}
      {belowCount > 0 && (
        <div className="bg-danger/10 border-2 border-danger/30 rounded-xl p-4 mb-6">
          <p className="text-sm font-semibold text-danger">
            {belowCount} job{belowCount !== 1 ? "s are" : " is"} below target margin.
          </p>
          {atRiskJobs.filter((j) => j.is_below_target).length > 0 && (
            <ul className="mt-2 space-y-1">
              {atRiskJobs
                .filter((j) => j.is_below_target)
                .slice(0, 5)
                .map((j) => (
                  <li key={j.job_id} className="text-sm text-danger">
                    <span className="font-medium">{j.job_title}</span>
                    {j.customer_name && <span className="text-danger/75"> — {j.customer_name}</span>}
                    <span className="ml-2 text-danger font-semibold">{fmtPct(j.gross_margin_pct)}</span>
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Jobs at Risk Table ── */}
      {atRiskJobs.length > 0 ? (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="font-semibold text-text">
              All Jobs — Margin Risk View ({atRiskJobs.length})
            </h2>
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-muted text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Customer</th>
                  <th className="px-4 py-2 font-medium text-right">Contract</th>
                  <th className="px-4 py-2 font-medium text-right">Profit</th>
                  <th className="px-4 py-2 font-medium text-right">Margin</th>
                  <th className="px-4 py-2 font-medium text-right">Erosion</th>
                  <th className="px-4 py-2 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {atRiskJobs.map((j) => {
                  const margin = Number(j.gross_margin_pct);
                  const erosion = Number(j.margin_erosion_pct);
                  const target = Number(j.target_margin_pct) || TARGET;
                  return (
                    <tr key={j.job_id} className="hover:bg-surface-2/80 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-text">{j.customer_name || "—"}</p>
                        <p className="text-xs text-muted">{j.job_title}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {fmt(j.total_price)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {fmt(j.gross_profit)}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${marginColor(margin, target)}`}>
                        {fmtPct(margin)}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${
                        erosion > 0.10 ? "text-danger" : erosion > 0 ? "text-warning" : "text-muted"
                      }`}>
                        {erosion > 0 ? `−${fmtPct(erosion)}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusBadge(j.status)}`}>
                          {j.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile stacked cards */}
          <div className="sm:hidden divide-y divide-border">
            {atRiskJobs.map((j) => {
              const margin = Number(j.gross_margin_pct);
              const erosion = Number(j.margin_erosion_pct);
              const target = Number(j.target_margin_pct) || TARGET;
              return (
                <div key={j.job_id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-text text-sm">
                        {j.customer_name || "—"}
                      </p>
                      <p className="text-xs text-muted">{j.job_title}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusBadge(j.status)}`}>
                      {j.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted">Contract</p>
                      <p className="font-medium">{fmt(j.total_price)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Profit</p>
                      <p className="font-medium">{fmt(j.gross_profit)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Margin</p>
                      <p className={`font-bold ${marginColor(margin, target)}`}>
                        {fmtPct(margin)}
                      </p>
                    </div>
                  </div>
                  {erosion > 0 && (
                    <p className={`text-xs mt-2 ${
                      erosion > 0.10 ? "text-danger" : "text-warning"
                    }`}>
                      Margin erosion: −{fmtPct(erosion)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Empty state — no jobs */
        <div className="bg-surface rounded-xl border border-border p-8 text-center">
          <p className="text-muted text-sm">
            No jobs to display yet. Convert estimates to jobs to see margin tracking here.
          </p>
        </div>
      )}
    </>
  );
}
