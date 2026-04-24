"use client";
import { useEffect, useState } from "react";
import type { AccuracyMetrics } from "@/lib/fence-graph/accuracy-types";
import { getAccuracyMetrics } from "@/app/dashboard/advanced-estimate/actions";
import { getVarianceLabel, getVarianceColor } from "@/lib/fence-graph/accuracy-types";

export function AccuracyDashboard() {
  const [metrics, setMetrics] = useState<AccuracyMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<30 | 90 | 365>(30);

  useEffect(() => {
    loadMetrics();
  }, [period]);

  const loadMetrics = async () => {
    setLoading(true);
    const data = await getAccuracyMetrics(period);
    setMetrics(data);
    setLoading(false);
  };

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
        <h2 className="text-xl font-bold font-display text-text mb-4">Estimation Accuracy</h2>
        <div className="text-center py-8">
          <p className="text-text mb-2">No closed jobs yet</p>
          <p className="text-sm text-muted">
            Close out completed jobs to see accuracy metrics and improve future estimates
          </p>
        </div>
      </div>
    );
  }

  // getVarianceColor returns "green" | "blue" | "yellow" | "orange" | "red" — keys preserved,
  // values remapped to single-accent dark tokens per style guide.
  const colorClasses: Record<string, string> = {
    green: "text-accent-light bg-accent/10 border-accent/30",
    blue: "text-info bg-info/10 border-info/30",
    yellow: "text-warning bg-warning/10 border-warning/30",
    orange: "text-warning bg-warning/15 border-warning/30",
    red: "text-danger bg-danger/10 border-danger/30",
  };

  const VarianceBadge = ({ variance }: { variance: number | null }) => {
    if (variance === null) return <span className="text-muted">N/A</span>;
    const label = getVarianceLabel(variance);
    const color = getVarianceColor(variance);
    return (
      <span className={`px-2 py-1 rounded text-sm font-medium border ${colorClasses[color]}`}>
        {variance > 0 ? "+" : ""}{variance.toFixed(1)}% ({label})
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold font-display text-text">Estimation Accuracy</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod(30)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors duration-150 ${
              period === 30
                ? "bg-accent text-white accent-glow"
                : "bg-surface-3 text-muted hover:bg-surface-2 hover:text-text border border-border"
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setPeriod(90)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors duration-150 ${
              period === 90
                ? "bg-accent text-white accent-glow"
                : "bg-surface-3 text-muted hover:bg-surface-2 hover:text-text border border-border"
            }`}
          >
            Last 90 Days
          </button>
          <button
            onClick={() => setPeriod(365)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors duration-150 ${
              period === 365
                ? "bg-accent text-white accent-glow"
                : "bg-surface-3 text-muted hover:bg-surface-2 hover:text-text border border-border"
            }`}
          >
            Last Year
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="bg-surface-2 rounded-lg border border-border p-6">
        <div className="mb-4">
          <div className="text-sm text-muted">
            Last {period} Days ({metrics.total_closed_jobs} closed jobs)
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {/* Material Variance */}
          <div>
            <div className="text-sm font-medium text-muted mb-2">Material Variance</div>
            <VarianceBadge variance={metrics.avg_material_variance_pct} />
          </div>

          {/* Labor Hours Variance */}
          <div>
            <div className="text-sm font-medium text-muted mb-2">Labor Hours Variance</div>
            <VarianceBadge variance={metrics.avg_labor_hours_variance_pct} />
          </div>

          {/* Labor Cost Variance */}
          <div>
            <div className="text-sm font-medium text-muted mb-2">Labor Cost Variance</div>
            <VarianceBadge variance={metrics.avg_labor_cost_variance_pct} />
          </div>

          {/* Total Cost Variance */}
          <div>
            <div className="text-sm font-medium text-muted mb-2">Total Cost Variance</div>
            <VarianceBadge variance={metrics.avg_total_cost_variance_pct} />
          </div>

          {/* Waste Variance */}
          <div>
            <div className="text-sm font-medium text-muted mb-2">Waste Variance</div>
            <VarianceBadge variance={metrics.avg_waste_variance_pct} />
          </div>
        </div>
      </div>

      {/* Accuracy by Fence Type */}
      {metrics.accuracy_by_fence_type && Object.keys(metrics.accuracy_by_fence_type).length > 0 && (
        <div className="bg-surface-2 rounded-lg border border-border p-6">
          <h3 className="font-semibold text-text mb-4">Accuracy by Fence Type</h3>
          <div className="space-y-3">
            {Object.entries(metrics.accuracy_by_fence_type).map(([fenceType, data]) => {
              const label = getVarianceLabel(data.avg_variance_pct);
              const color = getVarianceColor(data.avg_variance_pct);
              return (
                <div key={fenceType} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <div className="font-medium text-text">
                      {fenceType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </div>
                    <div className="text-sm text-muted">{data.count} jobs</div>
                  </div>
                  <span className={`px-3 py-1 rounded text-sm font-medium border ${colorClasses[color]}`}>
                    {data.avg_variance_pct > 0 ? "+" : ""}
                    {data.avg_variance_pct.toFixed(1)}% ({label})
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Insights */}
      <div className="bg-accent/10 rounded-lg border border-accent/30 p-6">
        <h3 className="font-semibold text-text mb-3">Key Insights</h3>
        <div className="space-y-2 text-sm text-text">
          {metrics.avg_material_variance_pct !== null && Math.abs(metrics.avg_material_variance_pct) > 10 && (
            <div>
              • Material estimates are {metrics.avg_material_variance_pct > 0 ? "over" : "under"} by {Math.abs(metrics.avg_material_variance_pct).toFixed(1)}%.
              {metrics.avg_material_variance_pct > 0
                ? " Consider reducing waste percentage or reviewing material counts."
                : " Consider increasing waste percentage or checking for missed items."}
            </div>
          )}
          {metrics.avg_labor_hours_variance_pct !== null && Math.abs(metrics.avg_labor_hours_variance_pct) > 10 && (
            <div>
              • Labor estimates are {metrics.avg_labor_hours_variance_pct > 0 ? "under" : "over"} by {Math.abs(metrics.avg_labor_hours_variance_pct).toFixed(1)}%.
              {metrics.avg_labor_hours_variance_pct > 0
                ? " Jobs are taking longer than estimated. Review timeline calculations."
                : " Jobs are faster than estimated. Timeline model may be conservative."}
            </div>
          )}
          {metrics.avg_total_cost_variance_pct !== null && Math.abs(metrics.avg_total_cost_variance_pct) <= 5 && (
            <div className="text-accent-light font-medium">
              Excellent overall accuracy. Total cost variance is within &plusmn;5%.
            </div>
          )}
          {metrics.total_closed_jobs < 10 && (
            <div className="text-muted italic">
              Close more jobs to see more accurate trends and insights.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
