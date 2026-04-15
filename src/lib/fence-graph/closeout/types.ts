// ── Closeout Intelligence Types ──────────────────────────────────
// Structured input/output for estimate vs actuals analysis.

// ── Closeout Input (what the contractor enters after the job) ────

export interface FieldConditions {
  rock?: boolean;
  roots?: boolean;
  standingWater?: boolean;
  accessIssues?: boolean;
  utilityConflict?: boolean;
  weatherDelay?: boolean;
}

export interface CloseoutActuals {
  // Cost actuals (all optional — partial closeouts are valid)
  actualMaterialCost?: number;
  actualLaborHours?: number;
  actualLaborCost?: number;
  actualEquipmentCost?: number;
  actualLogisticsCost?: number;
  actualDisposalCost?: number;
  actualRegulatoryCost?: number;
  actualFinalJobCost?: number;

  // Quantity actuals
  actualConcreteBags?: number;
  actualPostsUsed?: number;
  actualPanelsOrPicketsUsed?: number;

  // Field notes
  hiddenCostNotes?: string[];
  fieldConditions?: FieldConditions;

  // Existing fields (backward compat with existing CloseoutData)
  actualWastePct?: number;    // 0-100
  crewSize?: number;
  weatherConditions?: "clear" | "rain" | "heat" | "cold" | "mixed";
  notes?: string;
}

// ── Closeout Analysis Output ─────────────────────────────────────

export type VarianceStatus = "under" | "over" | "on_target";

export interface CategoryVariance {
  category: string;
  estimated: number;
  actual: number;
  varianceAmount: number;
  variancePct: number;          // decimal: 0.15 = 15% over
  status: VarianceStatus;
}

export interface CostVarianceSummary {
  estimatedRawCost: number;
  actualFinalJobCost: number;
  varianceAmount: number;
  variancePct: number;

  estimatedLaborHours: number;
  actualLaborHours: number | null;
  laborHourVariance: number | null;
  laborHourVariancePct: number | null;

  /**
   * How complete the closeout data was at time of analysis.
   *   "complete" — explicit `actualFinalJobCost`, OR both material + labor provided
   *   "partial"  — at least one category present but total could not be derived
   *   "none"     — no actuals were provided; variance falls back to the estimate
   * UI should warn the contractor when this is "partial" or "none" so they don't
   * mistake an empty/partial analysis for a clean "on target" result.
   */
  dataCompleteness?: "complete" | "partial" | "none";
}

export type CalibrationSignalType =
  | "labor_underestimate"
  | "labor_overestimate"
  | "concrete_underestimate"
  | "concrete_overestimate"
  | "material_underestimate"
  | "material_overestimate"
  | "equipment_missing"
  | "equipment_overestimate"
  | "delivery_missing"
  | "removal_underestimated"
  | "regulatory_missing"
  | "regulatory_underestimate"
  | "field_condition_rock"
  | "field_condition_roots"
  | "field_condition_water"
  | "field_condition_access"
  | "field_condition_utility"
  | "field_condition_weather"
  | "waste_underestimate"
  | "waste_overestimate";

export type CalibrationSeverity = "low" | "medium" | "high";

export interface CalibrationSignal {
  type: CalibrationSignalType;
  severity: CalibrationSeverity;
  message: string;
  recommendedConfigArea: string;  // maps to OrgEstimatorConfig path
  recommendedDirection: "increase" | "decrease" | "review";
}

export interface ContractorLearningSummary {
  topVarianceDrivers: string[];       // ranked by impact
  whatWentRight: string[];
  whatToReviewNextTime: string[];
}

export interface EstimateCloseoutAnalysis {
  costVariance: CostVarianceSummary;
  categoryVariances: CategoryVariance[];
  calibrationSignals: CalibrationSignal[];
  learningSummary: ContractorLearningSummary;
}
