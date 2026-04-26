// ── Accuracy Tracking Types ──────────────────────────────────────────
// Phase 1: Feedback loop for estimate accuracy improvement
// Created: April 9, 2026

export interface SiteComplexity {
  access_difficulty: number;      // 1-5: 1=easy truck access, 5=tight backyard
  obstacles: number;               // 1-5: 1=clear, 5=dense trees/rocks/utilities
  ground_hardness: number;         // 1-5: 1=soft soil, 5=rocky/concrete
  demo_required: boolean | "partial"; // true/false/"partial"
  permit_complexity: number;       // 1-5: 1=none, 5=multiple permits/HOA
  overall_score?: number;          // weighted average (auto-calculated)
}

export interface CloseoutData {
  // Existing (already in system)
  actualWastePct: number;          // 0-100
  notes?: string;

  // Phase 1 additions
  actualLaborHours?: number;       // total hours logged by crew
  crewSize?: number;               // 2-person, 3-person, etc.
  weatherConditions?: "clear" | "rain" | "heat" | "cold" | "mixed";

  actualMaterialCost?: number;     // from invoices/receipts
  actualLaborCost?: number;        // actual hours × labor rate
  actualTotalCost?: number;        // materials + labor + misc
  actualEquipmentCost?: number;
  actualLogisticsCost?: number;
  actualDisposalCost?: number;
  actualRegulatoryCost?: number;

  actualConcreteBags?: number;
  actualPostsUsed?: number;
  actualPanelsOrPicketsUsed?: number;

  hiddenCostNotes?: string[];
  fieldConditions?: {
    rock?: boolean;
    roots?: boolean;
    standingWater?: boolean;
    accessIssues?: boolean;
    utilityConflict?: boolean;
    weatherDelay?: boolean;
  };
}

export interface EstimateWithAccuracy {
  id: string;
  name: string;
  org_id: string;

  // Estimate data
  input_json: unknown;
  result_json: unknown;
  labor_rate: number;
  waste_pct: number;
  total_lf: number;
  total_cost: number;
  estimated_labor_hours: number | null;

  // Status
  status: "draft" | "closed";
  created_at: string;
  closed_at: string | null;

  // Site complexity (captured at estimate creation)
  site_complexity_json: SiteComplexity | null;

  // Closeout actuals (captured at job completion)
  closeout_actual_waste_pct: number | null;
  closeout_actual_labor_hours: number | null;
  closeout_crew_size: number | null;
  closeout_weather_conditions: string | null;
  closeout_actual_material_cost: number | null;
  closeout_actual_labor_cost: number | null;
  closeout_actual_total_cost: number | null;
  closeout_notes: string | null;
}

export interface AccuracyMetrics {
  period_days: number;
  total_closed_jobs: number;

  // Variance percentages (positive = over estimate, negative = under)
  avg_material_variance_pct: number | null;
  avg_labor_hours_variance_pct: number | null;
  avg_labor_cost_variance_pct: number | null;
  avg_total_cost_variance_pct: number | null;
  avg_abs_total_cost_variance_pct: number | null;
  avg_waste_variance_pct: number | null;
  within_5_pct_rate: number | null;
  within_10_pct_rate: number | null;

  // Breakdown by fence type
  accuracy_by_fence_type: Record<string, AccuracyBreakdown> | null;
  accuracy_by_complexity_band: Record<string, AccuracyBreakdown> | null;
  accuracy_by_job_size: Record<string, AccuracyBreakdown> | null;
  top_variance_drivers: AccuracyDriverSummary[];
  worst_misses: AccuracyWorstMiss[];
  priority_actions: AccuracyPriorityAction[];
  trend_vs_previous_period: {
    avg_total_cost_variance_pct: number | null;
    delta_pct: number | null;
  } | null;
}

export interface AccuracyBreakdown {
  count: number;
  avg_total_cost_variance_pct: number | null;
  avg_abs_total_cost_variance_pct: number | null;
  avg_labor_hours_variance_pct: number | null;
  within_10_pct_rate: number | null;
}

export interface AccuracyDriverSummary {
  label: string;
  count: number;
}

export interface AccuracyWorstMiss {
  id: string;
  name: string;
  fence_type: string | null;
  complexity_band: string | null;
  total_lf: number;
  total_cost_variance_pct: number;
  closed_at: string;
}

export interface AccuracyPriorityAction {
  id: string;
  title: string;
  reason: string;
  recommendation: string;
  segmentLabel?: string | null;
  actionLabel?: string | null;
  href?: string | null;
  confidence: "low" | "medium" | "high";
  impactScore: number;
}

// ── Complexity Scoring Helpers ───────────────────────────────────────

export function calculateOverallComplexity(complexity: Omit<SiteComplexity, "overall_score">): number {
  // Weighted formula:
  // - Access: 30% (getting materials to site is critical)
  // - Obstacles: 25% (trees/rocks slow down work significantly)
  // - Ground: 20% (affects post hole digging time)
  // - Demo: 15% (old fence removal)
  // - Permits: 10% (delays, but doesn't affect install difficulty)

  const demoScore = complexity.demo_required === "partial" ? 2.5 :
                    complexity.demo_required === true ? 5 : 1;

  const score = (
    complexity.access_difficulty * 0.30 +
    complexity.obstacles * 0.25 +
    complexity.ground_hardness * 0.20 +
    demoScore * 0.15 +
    complexity.permit_complexity * 0.10
  );

  return Math.round(score * 10) / 10; // round to 1 decimal
}

export function getSiteComplexityLabel(score: number): string {
  if (score <= 1.5) return "Easy";
  if (score <= 2.5) return "Standard";
  if (score <= 3.5) return "Moderate";
  if (score <= 4.5) return "Difficult";
  return "Very Difficult";
}

export function getSiteComplexityColor(score: number): string {
  if (score <= 1.5) return "green";
  if (score <= 2.5) return "blue";
  if (score <= 3.5) return "yellow";
  if (score <= 4.5) return "orange";
  return "red";
}

// ── Variance Helpers ──────────────────────────────────────────────────

export function getVarianceLabel(variancePct: number): string {
  const abs = Math.abs(variancePct);
  if (abs <= 5) return "Excellent";
  if (abs <= 10) return "Good";
  if (abs <= 15) return "Acceptable";
  if (abs <= 25) return "Needs Attention";
  return "Poor";
}

export function getVarianceColor(variancePct: number): string {
  const abs = Math.abs(variancePct);
  if (abs <= 5) return "green";
  if (abs <= 10) return "blue";
  if (abs <= 15) return "yellow";
  if (abs <= 25) return "orange";
  return "red";
}
