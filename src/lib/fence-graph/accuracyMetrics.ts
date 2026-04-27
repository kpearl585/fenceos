import {
  getSiteComplexityLabel,
  type AccuracyBreakdown,
  type AccuracyDriverSummary,
  type AccuracyMetrics,
  type AccuracyPriorityAction,
  type AccuracyWorstMiss,
  type SiteComplexity,
} from "./accuracy-types";
import type { EstimateCloseoutAnalysis } from "./closeout/types";

export interface AccuracyMetricsRow {
  id: string;
  name: string;
  total_lf: number;
  closed_at: string;
  input_json?: {
    fenceType?: string;
    productLineId?: string;
  } | null;
  site_complexity_json?: SiteComplexity | null;
  closeout_analysis_json?: EstimateCloseoutAnalysis | null;
  closeout_actual_waste_pct?: number | null;
  waste_pct?: number | null;
}

interface NormalizedAccuracyRow {
  id: string;
  name: string;
  total_lf: number;
  closed_at: string;
  fenceType: string | null;
  complexityBand: string | null;
  materialVariancePct: number | null;
  laborHoursVariancePct: number | null;
  laborCostVariancePct: number | null;
  totalCostVariancePct: number | null;
  wasteVariancePct: number | null;
  topVarianceDrivers: string[];
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return round1(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function rate(count: number, total: number): number | null {
  if (total === 0) return null;
  return round1((count / total) * 100);
}

function inferFenceType(input?: { fenceType?: string; productLineId?: string } | null): string | null {
  if (typeof input?.fenceType === "string") return input.fenceType;
  const productLineId = input?.productLineId ?? "";
  if (productLineId.startsWith("vinyl")) return "vinyl";
  if (productLineId.startsWith("wood")) return "wood";
  if (productLineId.startsWith("chain_link")) return "chain_link";
  if (productLineId.startsWith("aluminum")) return "aluminum";
  return null;
}

function getComplexityBand(complexity?: SiteComplexity | null): string | null {
  const score = complexity?.overall_score;
  if (typeof score !== "number") return null;
  return getSiteComplexityLabel(score).toLowerCase();
}

function getJobSizeBand(totalLf: number): string {
  if (totalLf < 100) return "small";
  if (totalLf < 200) return "medium";
  if (totalLf < 350) return "large";
  return "very_large";
}

function normalizeRow(row: AccuracyMetricsRow): NormalizedAccuracyRow {
  const analysis = row.closeout_analysis_json ?? null;
  const byCategory = new Map(
    (analysis?.categoryVariances ?? []).map((category) => [category.category, category])
  );
  const topVarianceDrivers = analysis?.learningSummary.topVarianceDrivers ?? [];

  const materialVariancePct = byCategory.get("Materials")?.variancePct ?? null;
  const laborCostVariancePct = byCategory.get("Labor")?.variancePct ?? null;
  const laborHoursVariancePct = analysis?.costVariance.laborHourVariancePct ?? null;
  const totalCostVariancePct = analysis?.costVariance.variancePct ?? null;

  let wasteVariancePct: number | null = null;
  if (
    row.closeout_actual_waste_pct != null &&
    row.waste_pct != null &&
    row.waste_pct > 0
  ) {
    wasteVariancePct = (row.closeout_actual_waste_pct - row.waste_pct) / row.waste_pct;
  }

  return {
    id: row.id,
    name: row.name,
    total_lf: row.total_lf,
    closed_at: row.closed_at,
    fenceType: inferFenceType(row.input_json),
    complexityBand: getComplexityBand(row.site_complexity_json),
    materialVariancePct,
    laborHoursVariancePct,
    laborCostVariancePct,
    totalCostVariancePct,
    wasteVariancePct,
    topVarianceDrivers,
  };
}

function buildBreakdown(rows: NormalizedAccuracyRow[], key: (row: NormalizedAccuracyRow) => string | null): Record<string, AccuracyBreakdown> | null {
  const buckets = new Map<string, NormalizedAccuracyRow[]>();
  for (const row of rows) {
    const bucket = key(row);
    if (!bucket) continue;
    const existing = buckets.get(bucket) ?? [];
    existing.push(row);
    buckets.set(bucket, existing);
  }

  if (buckets.size === 0) return null;

  return Object.fromEntries(
    Array.from(buckets.entries()).map(([bucket, bucketRows]) => {
      const totalCostValues = bucketRows
        .map((row) => row.totalCostVariancePct)
        .filter((value): value is number => value != null)
        .map((value) => value * 100);
      const laborValues = bucketRows
        .map((row) => row.laborHoursVariancePct)
        .filter((value): value is number => value != null)
        .map((value) => value * 100);

      return [
        bucket,
        {
          count: bucketRows.length,
          avg_total_cost_variance_pct: average(totalCostValues),
          avg_abs_total_cost_variance_pct: average(totalCostValues.map((value) => Math.abs(value))),
          avg_labor_hours_variance_pct: average(laborValues),
          within_10_pct_rate: rate(
            totalCostValues.filter((value) => Math.abs(value) <= 10).length,
            totalCostValues.length
          ),
        } satisfies AccuracyBreakdown,
      ];
    })
  );
}

function buildTopDrivers(rows: NormalizedAccuracyRow[]): AccuracyDriverSummary[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const driver of row.topVarianceDrivers.slice(0, 3)) {
      const label = driver.split(":")[0]?.trim() || driver;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => ({ label, count }));
}

function buildWorstMisses(rows: NormalizedAccuracyRow[]): AccuracyWorstMiss[] {
  return rows
    .filter((row) => row.totalCostVariancePct != null)
    .sort((a, b) => Math.abs((b.totalCostVariancePct ?? 0)) - Math.abs((a.totalCostVariancePct ?? 0)))
    .slice(0, 5)
    .map((row) => ({
      id: row.id,
      name: row.name,
      fence_type: row.fenceType,
      complexity_band: row.complexityBand,
      total_lf: row.total_lf,
      total_cost_variance_pct: round1((row.totalCostVariancePct ?? 0) * 100),
      closed_at: row.closed_at,
    }));
}

function buildTrend(rows: NormalizedAccuracyRow[], days: number): AccuracyMetrics["trend_vs_previous_period"] {
  const now = Date.now();
  const currentWindowStart = now - days * 24 * 60 * 60 * 1000;
  const previousWindowStart = now - days * 2 * 24 * 60 * 60 * 1000;

  const current = rows
    .filter((row) => new Date(row.closed_at).getTime() >= currentWindowStart)
    .map((row) => row.totalCostVariancePct)
    .filter((value): value is number => value != null)
    .map((value) => Math.abs(value * 100));
  const previous = rows
    .filter((row) => {
      const time = new Date(row.closed_at).getTime();
      return time >= previousWindowStart && time < currentWindowStart;
    })
    .map((row) => row.totalCostVariancePct)
    .filter((value): value is number => value != null)
    .map((value) => Math.abs(value * 100));

  const currentAvg = average(current);
  const previousAvg = average(previous);
  if (currentAvg == null && previousAvg == null) return null;

  return {
    avg_total_cost_variance_pct: currentAvg,
    delta_pct:
      currentAvg != null && previousAvg != null
        ? round1(currentAvg - previousAvg)
        : null,
  };
}

function buildPriorityActions(args: {
  metrics: Omit<AccuracyMetrics, "priority_actions">;
}): AccuracyPriorityAction[] {
  const actions: AccuracyPriorityAction[] = [];
  const { metrics } = args;

  const complexityEntries = Object.entries(metrics.accuracy_by_complexity_band ?? {});
  const worstComplexity = complexityEntries
    .filter(([, data]) => data.count >= 2 && data.avg_abs_total_cost_variance_pct != null)
    .sort((a, b) => (b[1].avg_abs_total_cost_variance_pct ?? 0) - (a[1].avg_abs_total_cost_variance_pct ?? 0))[0];
  if (worstComplexity && (worstComplexity[1].avg_abs_total_cost_variance_pct ?? 0) >= 10) {
    actions.push({
      id: "complexity-segment-drift",
      title: `Tighten ${worstComplexity[0].replace(/_/g, " ")} site estimating`,
      reason: `${worstComplexity[0]} jobs are drifting by ${worstComplexity[1].avg_abs_total_cost_variance_pct?.toFixed(1)}% on average across ${worstComplexity[1].count} closeouts.`,
      recommendation: "Review labor calibration and scope assumptions for this site-difficulty band first.",
      segmentLabel: worstComplexity[0],
      actionLabel: "Open labor settings",
      href: "/dashboard/settings/estimator#labor",
      confidence: worstComplexity[1].count >= 5 ? "high" : "medium",
      impactScore: (worstComplexity[1].avg_abs_total_cost_variance_pct ?? 0) * worstComplexity[1].count,
    });
  }

  const fenceTypeEntries = Object.entries(metrics.accuracy_by_fence_type ?? {});
  const worstFenceType = fenceTypeEntries
    .filter(([, data]) => data.count >= 2 && data.avg_abs_total_cost_variance_pct != null)
    .sort((a, b) => (b[1].avg_abs_total_cost_variance_pct ?? 0) - (a[1].avg_abs_total_cost_variance_pct ?? 0))[0];
  if (worstFenceType && (worstFenceType[1].avg_abs_total_cost_variance_pct ?? 0) >= 8) {
    actions.push({
      id: "fence-type-drift",
      title: `Recalibrate ${worstFenceType[0].replace(/_/g, " ")} estimating`,
      reason: `${worstFenceType[0].replace(/_/g, " ")} jobs are missing by ${worstFenceType[1].avg_abs_total_cost_variance_pct?.toFixed(1)}% on average across ${worstFenceType[1].count} closeouts.`,
      recommendation: "Inspect recent closed jobs in this fence type for repeated labor, waste, or pricing drift.",
      segmentLabel: worstFenceType[0],
      actionLabel: "Review closed estimates",
      href: "/dashboard/advanced-estimate/saved",
      confidence: worstFenceType[1].count >= 5 ? "high" : "medium",
      impactScore: (worstFenceType[1].avg_abs_total_cost_variance_pct ?? 0) * worstFenceType[1].count,
    });
  }

  const topDriver = metrics.top_variance_drivers[0];
  if (topDriver && topDriver.count >= 2) {
    const driverKey = topDriver.label.toLowerCase();
    const recommendation =
      driverKey.includes("labor")
        ? "Focus on labor calibration, crew pace assumptions, and difficult-site productivity first."
        : driverKey.includes("material")
          ? "Audit supplier pricing freshness and repeated BOM overages first."
          : driverKey.includes("delivery") || driverKey.includes("disposal") || driverKey.includes("regulatory")
            ? "Review hidden job-cost baselines and ensure those costs are captured on every closeout."
            : "Review the repeated misses behind this driver and decide whether the engine needs a tighter default or better closeout discipline.";

    actions.push({
      id: `driver-${driverKey.replace(/\s+/g, "-")}`,
      title: `${topDriver.label} is the biggest repeated miss`,
      reason: `${topDriver.label} shows up in ${topDriver.count} recent closeouts as a top variance driver.`,
      recommendation,
      segmentLabel: topDriver.label,
      actionLabel:
        driverKey.includes("material")
          ? "Sync supplier prices"
          : driverKey.includes("labor")
            ? "Open labor settings"
            : "Review closeout history",
      href:
        driverKey.includes("material")
          ? "/dashboard/materials/price-sync"
          : driverKey.includes("labor")
            ? "/dashboard/settings/estimator#labor"
            : "/dashboard/advanced-estimate/saved",
      confidence: topDriver.count >= 5 ? "high" : "medium",
      impactScore: topDriver.count * 10,
    });
  }

  if (
    metrics.within_10_pct_rate != null &&
    metrics.within_10_pct_rate < 70 &&
    metrics.avg_abs_total_cost_variance_pct != null
  ) {
    actions.push({
      id: "overall-hit-rate",
      title: "Raise overall estimator hit rate",
      reason: `Only ${metrics.within_10_pct_rate.toFixed(0)}% of jobs are landing within 10%, with average absolute drift at ${metrics.avg_abs_total_cost_variance_pct.toFixed(1)}%.`,
      recommendation: "Prioritize the segment and driver recommendations above before expanding estimator scope any further.",
      actionLabel: "Open accuracy review",
      href: "/dashboard/accuracy",
      confidence: metrics.total_closed_jobs >= 10 ? "high" : "medium",
      impactScore: 100 - metrics.within_10_pct_rate,
    });
  }

  const seen = new Set<string>();
  return actions
    .sort((a, b) => b.impactScore - a.impactScore)
    .filter((action) => {
      if (seen.has(action.id)) return false;
      seen.add(action.id);
      return true;
    })
    .slice(0, 3);
}

export function buildAccuracyMetrics(args: {
  rows: AccuracyMetricsRow[];
  periodDays: number;
}): AccuracyMetrics {
  const normalizedRows = args.rows.map(normalizeRow);
  const materialValues = normalizedRows
    .map((row) => row.materialVariancePct)
    .filter((value): value is number => value != null)
    .map((value) => value * 100);
  const laborHourValues = normalizedRows
    .map((row) => row.laborHoursVariancePct)
    .filter((value): value is number => value != null)
    .map((value) => value * 100);
  const laborCostValues = normalizedRows
    .map((row) => row.laborCostVariancePct)
    .filter((value): value is number => value != null)
    .map((value) => value * 100);
  const totalCostValues = normalizedRows
    .map((row) => row.totalCostVariancePct)
    .filter((value): value is number => value != null)
    .map((value) => value * 100);
  const wasteValues = normalizedRows
    .map((row) => row.wasteVariancePct)
    .filter((value): value is number => value != null)
    .map((value) => value * 100);

  const baseMetrics: Omit<AccuracyMetrics, "priority_actions"> = {
    period_days: args.periodDays,
    total_closed_jobs: normalizedRows.length,
    avg_material_variance_pct: average(materialValues),
    avg_labor_hours_variance_pct: average(laborHourValues),
    avg_labor_cost_variance_pct: average(laborCostValues),
    avg_total_cost_variance_pct: average(totalCostValues),
    avg_abs_total_cost_variance_pct: average(totalCostValues.map((value) => Math.abs(value))),
    avg_waste_variance_pct: average(wasteValues),
    within_5_pct_rate: rate(totalCostValues.filter((value) => Math.abs(value) <= 5).length, totalCostValues.length),
    within_10_pct_rate: rate(totalCostValues.filter((value) => Math.abs(value) <= 10).length, totalCostValues.length),
    accuracy_by_fence_type: buildBreakdown(normalizedRows, (row) => row.fenceType),
    accuracy_by_complexity_band: buildBreakdown(normalizedRows, (row) => row.complexityBand),
    accuracy_by_job_size: buildBreakdown(normalizedRows, (row) => getJobSizeBand(row.total_lf)),
    top_variance_drivers: buildTopDrivers(normalizedRows),
    worst_misses: buildWorstMisses(normalizedRows),
    trend_vs_previous_period: buildTrend(normalizedRows, args.periodDays),
  };

  return {
    ...baseMetrics,
    priority_actions: buildPriorityActions({ metrics: baseMetrics }),
  };
}
