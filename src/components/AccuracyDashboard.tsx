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
      <div className="p-8 bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-center">
          <div className="text-gray-500">Loading accuracy metrics...</div>
        </div>
      </div>
    );
  }

  if (!metrics || metrics.total_closed_jobs === 0) {
    return (
      <div className="p-8 bg-white rounded-lg border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Estimation Accuracy</h2>
        <div className="text-center py-8">
          <p className="text-gray-600 mb-2">No closed jobs yet</p>
          <p className="text-sm text-gray-500">
            Close out completed jobs to see accuracy metrics and improve future estimates
          </p>
        </div>
      </div>
    );
  }

  const colorClasses: Record<string, string> = {
    green: "text-green-600 bg-green-50 border-green-200",
    blue: "text-blue-600 bg-blue-50 border-blue-200",
    yellow: "text-yellow-600 bg-yellow-50 border-yellow-200",
    orange: "text-orange-600 bg-orange-50 border-orange-200",
    red: "text-red-600 bg-red-50 border-red-200",
  };

  const VarianceBadge = ({ variance }: { variance: number | null }) => {
    if (variance === null) return <span className="text-gray-400">N/A</span>;
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
        <h2 className="text-xl font-bold text-gray-900">Estimation Accuracy</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod(30)}
            className={`px-3 py-1 rounded text-sm font-medium ${
              period === 30
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setPeriod(90)}
            className={`px-3 py-1 rounded text-sm font-medium ${
              period === 90
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Last 90 Days
          </button>
          <button
            onClick={() => setPeriod(365)}
            className={`px-3 py-1 rounded text-sm font-medium ${
              period === 365
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Last Year
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="mb-4">
          <div className="text-sm text-gray-600">
            Last {period} Days ({metrics.total_closed_jobs} closed jobs)
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {/* Material Variance */}
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Material Variance</div>
            <VarianceBadge variance={metrics.avg_material_variance_pct} />
          </div>

          {/* Labor Hours Variance */}
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Labor Hours Variance</div>
            <VarianceBadge variance={metrics.avg_labor_hours_variance_pct} />
          </div>

          {/* Labor Cost Variance */}
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Labor Cost Variance</div>
            <VarianceBadge variance={metrics.avg_labor_cost_variance_pct} />
          </div>

          {/* Total Cost Variance */}
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Total Cost Variance</div>
            <VarianceBadge variance={metrics.avg_total_cost_variance_pct} />
          </div>

          {/* Waste Variance */}
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Waste Variance</div>
            <VarianceBadge variance={metrics.avg_waste_variance_pct} />
          </div>
        </div>
      </div>

      {/* Accuracy by Fence Type */}
      {metrics.accuracy_by_fence_type && Object.keys(metrics.accuracy_by_fence_type).length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Accuracy by Fence Type</h3>
          <div className="space-y-3">
            {Object.entries(metrics.accuracy_by_fence_type).map(([fenceType, data]) => {
              const label = getVarianceLabel(data.avg_variance_pct);
              const color = getVarianceColor(data.avg_variance_pct);
              return (
                <div key={fenceType} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <div className="font-medium text-gray-900">
                      {fenceType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </div>
                    <div className="text-sm text-gray-500">{data.count} jobs</div>
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
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-3">💡 Key Insights</h3>
        <div className="space-y-2 text-sm text-gray-700">
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
            <div className="text-green-700 font-medium">
              ✅ Excellent overall accuracy! Total cost variance is within ±5%.
            </div>
          )}
          {metrics.total_closed_jobs < 10 && (
            <div className="text-gray-600 italic">
              Close more jobs to see more accurate trends and insights.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
