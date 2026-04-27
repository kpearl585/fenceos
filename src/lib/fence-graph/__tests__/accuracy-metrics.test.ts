import { describe, expect, it } from "vitest";
import { buildAccuracyMetrics, type AccuracyMetricsRow } from "../accuracyMetrics";

const rows: AccuracyMetricsRow[] = [
  {
    id: "1",
    name: "Vinyl Easy",
    total_lf: 90,
    closed_at: new Date().toISOString(),
    input_json: { fenceType: "vinyl" },
    site_complexity_json: { access_difficulty: 1, obstacles: 1, ground_hardness: 1, demo_required: false, permit_complexity: 1, overall_score: 1.2 },
    waste_pct: 0.05,
    closeout_actual_waste_pct: 0.055,
    closeout_analysis_json: {
      costVariance: {
        estimatedRawCost: 1000,
        actualFinalJobCost: 1080,
        varianceAmount: 80,
        variancePct: 0.08,
        estimatedLaborHours: 10,
        actualLaborHours: 11,
        laborHourVariance: 1,
        laborHourVariancePct: 0.1,
        dataCompleteness: "complete",
      },
      categoryVariances: [
        { category: "Materials", estimated: 500, actual: 540, varianceAmount: 40, variancePct: 0.08, status: "over" },
        { category: "Labor", estimated: 500, actual: 540, varianceAmount: 40, variancePct: 0.08, status: "over" },
      ],
      calibrationSignals: [],
      learningSummary: {
        topVarianceDrivers: ["Materials: $40 over (8%)", "Labor: $40 over (8%)"],
        whatWentRight: [],
        whatToReviewNextTime: [],
      },
    },
  },
  {
    id: "2",
    name: "Wood Hard",
    total_lf: 240,
    closed_at: new Date().toISOString(),
    input_json: { fenceType: "wood" },
    site_complexity_json: { access_difficulty: 5, obstacles: 5, ground_hardness: 4, demo_required: true, permit_complexity: 3, overall_score: 4.4 },
    waste_pct: 0.05,
    closeout_actual_waste_pct: 0.07,
    closeout_analysis_json: {
      costVariance: {
        estimatedRawCost: 3000,
        actualFinalJobCost: 2700,
        varianceAmount: -300,
        variancePct: -0.1,
        estimatedLaborHours: 30,
        actualLaborHours: 27,
        laborHourVariance: -3,
        laborHourVariancePct: -0.1,
        dataCompleteness: "complete",
      },
      categoryVariances: [
        { category: "Materials", estimated: 1800, actual: 1650, varianceAmount: -150, variancePct: -0.0833, status: "under" },
        { category: "Labor", estimated: 1200, actual: 1050, varianceAmount: -150, variancePct: -0.125, status: "under" },
      ],
      calibrationSignals: [],
      learningSummary: {
        topVarianceDrivers: ["Labor: $150 under (13%)"],
        whatWentRight: [],
        whatToReviewNextTime: [],
      },
    },
  },
];

describe("buildAccuracyMetrics", () => {
  it("builds segmented benchmarking metrics from closeout analysis rows", () => {
    const metrics = buildAccuracyMetrics({ rows, periodDays: 90 });

    expect(metrics.total_closed_jobs).toBe(2);
    expect(metrics.avg_total_cost_variance_pct).toBe(-1);
    expect(metrics.avg_abs_total_cost_variance_pct).toBe(9);
    expect(metrics.within_10_pct_rate).toBe(100);
    expect(metrics.accuracy_by_fence_type?.vinyl.count).toBe(1);
    expect(metrics.accuracy_by_complexity_band?.easy.count).toBe(1);
    expect(metrics.accuracy_by_job_size?.small.count).toBe(1);
    expect(metrics.top_variance_drivers[0]?.label).toBe("Labor");
    expect(metrics.worst_misses[0]?.name).toBe("Wood Hard");
    expect(metrics.priority_actions[0]?.title).toMatch(/tighten|recalibrate|biggest repeated miss/i);
    expect(metrics.priority_actions[0]?.href).toBeTruthy();
    expect(metrics.priority_actions[0]?.actionLabel).toBeTruthy();
  });
});
