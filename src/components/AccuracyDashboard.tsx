"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type {
  AccuracyBreakdown,
  AccuracyMetrics,
} from "@/lib/fence-graph/accuracy-types";
import { getAccuracyMetrics } from "@/app/dashboard/advanced-estimate/actions";
import { getVarianceLabel, getVarianceColor } from "@/lib/fence-graph/accuracy-types";

const COLOR_CLASSES: Record<string, string> = {
  green: "text-accent-light bg-accent/10 border-accent/30",
  blue: "text-info bg-info/10 border-info/30",
  yellow: "text-warning bg-warning/10 border-warning/30",
  orange: "text-warning bg-warning/15 border-warning/30",
  red: "text-danger bg-danger/10 border-danger/30",
};

function fmtPct(value: number | null) {
  if (value == null) return "N/A";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function VarianceBadge({ variance }: { variance: number | null }) {
  if (variance === null) return <span className="text-muted">N/A</span>;
  const label = getVarianceLabel(variance);
  const color = getVarianceColor(variance);
  return (
    <span className={`px-2 py-1 rounded text-sm font-medium border ${COLOR_CLASSES[color]}`}>
      {fmtPct(variance)} ({label})
    </span>
  );
}

function BreakdownSection({
  title,
  breakdown,
}: {
  title: string;
  breakdown: Record<string, AccuracyBreakdown> | null;
}) {
  if (!breakdown || Object.keys(breakdown).length === 0) return null;

  return (
    <div className="bg-surface-2 rounded-lg border border-border p-6">
      <h3 className="font-semibold text-text mb-4">{title}</h3>
      <div className="space-y-3">
        {Object.entries(breakdown).map(([label, data]) => {
          const variance = data.avg_total_cost_variance_pct;
          const color = variance == null ? "blue" : getVarianceColor(variance);
          return (
            <div key={label} className="flex items-center justify-between gap-4 py-2 border-b border-border last:border-0">
              <div>
                <div className="font-medium text-text">
                  {label.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}
                </div>
                <div className="text-sm text-muted">
                  {data.count} jobs · abs drift {data.avg_abs_total_cost_variance_pct?.toFixed(1) ?? "N/A"}% · within 10% {data.within_10_pct_rate?.toFixed(0) ?? "N/A"}%
                </div>
              </div>
              <span className={`px-3 py-1 rounded text-sm font-medium border ${COLOR_CLASSES[color]}`}>
                {fmtPct(variance)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AccuracyDashboard() {
  const [metrics, setMetrics] = useState<AccuracyMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<30 | 90 | 365>(90);

  useEffect(() => {
    async function loadMetrics() {
      setLoading(true);
      const data = await getAccuracyMetrics(period);
      setMetrics(data);
      setLoading(false);
    }

    void loadMetrics();
  }, [period]);

  if (loading) {
    return (
      <div className="p-8 bg-surface-2 rounded-lg border border-border">
        <div className="flex items-center justify-center">
          <div className="text-muted">Loading accuracy metrics...</div>
        </div>
      </div>
    );
  }

  if (!metrics || metrics.total_closed_jobs === 0) {
    return (
      <div className="p-8 bg-surface-2 rounded-lg border border-border">
        <h2 className="text-xl font-bold font-display text-text mb-4">Accuracy Benchmarking</h2>
        <div className="text-center py-8">
          <p className="text-text mb-2">No closed jobs yet</p>
          <p className="text-sm text-muted">
            Close out completed jobs to see where the estimator is tight and where it still drifts.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display text-text">Accuracy Benchmarking</h2>
          <p className="text-sm text-muted mt-1">
            Last {period} days · {metrics.total_closed_jobs} closed jobs
          </p>
        </div>
        <div className="flex gap-2">
          {[30, 90, 365].map((days) => (
            <button
              key={days}
              onClick={() => setPeriod(days as 30 | 90 | 365)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors duration-150 ${
                period === days
                  ? "bg-accent text-white accent-glow"
                  : "bg-surface-3 text-muted hover:bg-surface-2 hover:text-text border border-border"
              }`}
            >
              {days === 365 ? "Last Year" : `Last ${days} Days`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-2 rounded-lg border border-border p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Avg Total Variance</p>
          <p className="mt-2 text-2xl font-display font-bold text-text">{fmtPct(metrics.avg_total_cost_variance_pct)}</p>
          <p className="text-xs text-muted mt-1">Signed drift: over vs under estimate</p>
        </div>
        <div className="bg-surface-2 rounded-lg border border-border p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Avg Absolute Drift</p>
          <p className="mt-2 text-2xl font-display font-bold text-text">{fmtPct(metrics.avg_abs_total_cost_variance_pct)}</p>
          <p className="text-xs text-muted mt-1">How far off the model is, regardless of direction</p>
        </div>
        <div className="bg-surface-2 rounded-lg border border-border p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Within 5%</p>
          <p className="mt-2 text-2xl font-display font-bold text-text">{metrics.within_5_pct_rate?.toFixed(0) ?? "N/A"}%</p>
          <p className="text-xs text-muted mt-1">Jobs landing inside a tight accuracy band</p>
        </div>
        <div className="bg-surface-2 rounded-lg border border-border p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Within 10%</p>
          <p className="mt-2 text-2xl font-display font-bold text-text">{metrics.within_10_pct_rate?.toFixed(0) ?? "N/A"}%</p>
          <p className="text-xs text-muted mt-1">Jobs landing inside a usable accuracy band</p>
        </div>
      </div>

      <div className="bg-surface-2 rounded-lg border border-border p-6">
        <h3 className="font-semibold text-text mb-4">Core Variance Benchmarks</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <div>
            <div className="text-sm font-medium text-muted mb-2">Material Variance</div>
            <VarianceBadge variance={metrics.avg_material_variance_pct} />
          </div>
          <div>
            <div className="text-sm font-medium text-muted mb-2">Labor Hours Variance</div>
            <VarianceBadge variance={metrics.avg_labor_hours_variance_pct} />
          </div>
          <div>
            <div className="text-sm font-medium text-muted mb-2">Labor Cost Variance</div>
            <VarianceBadge variance={metrics.avg_labor_cost_variance_pct} />
          </div>
          <div>
            <div className="text-sm font-medium text-muted mb-2">Total Cost Variance</div>
            <VarianceBadge variance={metrics.avg_total_cost_variance_pct} />
          </div>
          <div>
            <div className="text-sm font-medium text-muted mb-2">Waste Variance</div>
            <VarianceBadge variance={metrics.avg_waste_variance_pct} />
          </div>
        </div>
        {metrics.trend_vs_previous_period && (
          <p className="text-sm text-muted mt-4">
            Trend vs previous {period} days:{" "}
            <span className={metrics.trend_vs_previous_period.delta_pct != null && metrics.trend_vs_previous_period.delta_pct <= 0 ? "text-accent-light" : "text-warning"}>
              {metrics.trend_vs_previous_period.delta_pct == null
                ? "not enough prior data"
                : `${metrics.trend_vs_previous_period.delta_pct > 0 ? "+" : ""}${metrics.trend_vs_previous_period.delta_pct.toFixed(1)} pts in absolute drift`}
            </span>
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <BreakdownSection title="By Fence Type" breakdown={metrics.accuracy_by_fence_type} />
        <BreakdownSection title="By Site Complexity" breakdown={metrics.accuracy_by_complexity_band} />
        <BreakdownSection title="By Job Size" breakdown={metrics.accuracy_by_job_size} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-surface-2 rounded-lg border border-border p-6">
          <h3 className="font-semibold text-text mb-4">Highest-Value Next Fixes</h3>
          {metrics.priority_actions.length === 0 ? (
            <p className="text-sm text-muted">
              Not enough closed-job pattern data yet to rank the next estimator fix.
            </p>
          ) : (
            <div className="space-y-4">
              {metrics.priority_actions.map((action, index) => (
                <div key={action.id} className="rounded-lg border border-border bg-surface p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted">Priority {index + 1}</p>
                      <p className="text-sm font-semibold text-text mt-1">{action.title}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-semibold uppercase tracking-wide border ${
                      action.confidence === "high"
                        ? "text-accent-light bg-accent/10 border-accent/30"
                        : action.confidence === "medium"
                          ? "text-warning bg-warning/10 border-warning/30"
                          : "text-info bg-info/10 border-info/30"
                    }`}>
                      {action.confidence} confidence
                    </span>
                  </div>
                  <p className="text-sm text-muted mt-2">{action.reason}</p>
                  <p className="text-sm text-text mt-2">{action.recommendation}</p>
                  {action.href && action.actionLabel && (
                    <div className="mt-3">
                      <Link
                        href={action.href}
                        className="inline-flex items-center rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent-light hover:bg-accent/15 transition-colors duration-150"
                      >
                        {action.actionLabel} →
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-surface-2 rounded-lg border border-border p-6">
          <h3 className="font-semibold text-text mb-4">Top Variance Drivers</h3>
          {metrics.top_variance_drivers.length === 0 ? (
            <p className="text-sm text-muted">No structured variance drivers yet. Complete more closeouts with full actuals.</p>
          ) : (
            <div className="space-y-3">
              {metrics.top_variance_drivers.map((driver) => (
                <div key={driver.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-text font-medium">{driver.label}</span>
                  <span className="text-sm text-muted">{driver.count} jobs</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-surface-2 rounded-lg border border-border p-6">
          <h3 className="font-semibold text-text mb-4">Worst Misses</h3>
          {metrics.worst_misses.length === 0 ? (
            <p className="text-sm text-muted">No completed closeouts with total-cost variance yet.</p>
          ) : (
            <div className="space-y-3">
              {metrics.worst_misses.map((job) => {
                const color = getVarianceColor(job.total_cost_variance_pct);
                return (
                  <div key={job.id} className="py-2 border-b border-border last:border-0">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-text">{job.name}</p>
                        <p className="text-xs text-muted">
                          {(job.fence_type ?? "unknown").replace(/_/g, " ")} · {job.complexity_band ?? "unscored"} · {job.total_lf} LF
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-sm font-medium border ${COLOR_CLASSES[color]}`}>
                        {fmtPct(job.total_cost_variance_pct)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
