import type { CloseoutData } from "../accuracy-types";
import type { FenceEstimateResult } from "../types";
import { analyzeEstimateCloseout } from "./analyzeCloseout";
import type { CloseoutActuals, EstimateCloseoutAnalysis } from "./types";

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function compactStringList(values?: string[]): string[] | undefined {
  const compacted = values
    ?.map((value) => value.trim())
    .filter((value) => value.length > 0);

  return compacted && compacted.length > 0 ? compacted : undefined;
}

export function normalizeCloseoutActuals(closeoutData: CloseoutData): CloseoutActuals {
  const fieldConditions = closeoutData.fieldConditions
    ? {
        rock: Boolean(closeoutData.fieldConditions.rock),
        roots: Boolean(closeoutData.fieldConditions.roots),
        standingWater: Boolean(closeoutData.fieldConditions.standingWater),
        accessIssues: Boolean(closeoutData.fieldConditions.accessIssues),
        utilityConflict: Boolean(closeoutData.fieldConditions.utilityConflict),
        weatherDelay: Boolean(closeoutData.fieldConditions.weatherDelay),
      }
    : undefined;

  return {
    actualWastePct: asFiniteNumber(closeoutData.actualWastePct),
    notes: asNonEmptyString(closeoutData.notes),
    actualMaterialCost: asFiniteNumber(closeoutData.actualMaterialCost),
    actualLaborHours: asFiniteNumber(closeoutData.actualLaborHours),
    actualLaborCost: asFiniteNumber(closeoutData.actualLaborCost),
    actualEquipmentCost: asFiniteNumber(closeoutData.actualEquipmentCost),
    actualLogisticsCost: asFiniteNumber(closeoutData.actualLogisticsCost),
    actualDisposalCost: asFiniteNumber(closeoutData.actualDisposalCost),
    actualRegulatoryCost: asFiniteNumber(closeoutData.actualRegulatoryCost),
    actualFinalJobCost: asFiniteNumber(closeoutData.actualTotalCost),
    actualConcreteBags: asFiniteNumber(closeoutData.actualConcreteBags),
    actualPostsUsed: asFiniteNumber(closeoutData.actualPostsUsed),
    actualPanelsOrPicketsUsed: asFiniteNumber(closeoutData.actualPanelsOrPicketsUsed),
    hiddenCostNotes: compactStringList(closeoutData.hiddenCostNotes),
    fieldConditions:
      fieldConditions && Object.values(fieldConditions).some(Boolean)
        ? fieldConditions
        : undefined,
    crewSize: asFiniteNumber(closeoutData.crewSize),
    weatherConditions: closeoutData.weatherConditions,
  };
}

export function buildFenceGraphCloseoutPersistence(
  estimate: FenceEstimateResult,
  closeoutData: CloseoutData,
  closedAt: string,
): {
  actuals: CloseoutActuals;
  analysis: EstimateCloseoutAnalysis;
  update: Record<string, unknown>;
} {
  const actuals = normalizeCloseoutActuals(closeoutData);
  const analysis = analyzeEstimateCloseout(estimate, actuals);

  return {
    actuals,
    analysis,
    update: {
      status: "closed",
      closed_at: closedAt,
      closeout_actual_waste_pct:
        actuals.actualWastePct != null ? actuals.actualWastePct / 100 : null,
      closeout_actual_labor_hours: actuals.actualLaborHours ?? null,
      closeout_crew_size: actuals.crewSize ?? null,
      closeout_weather_conditions: actuals.weatherConditions ?? null,
      closeout_actual_material_cost: actuals.actualMaterialCost ?? null,
      closeout_actual_labor_cost: actuals.actualLaborCost ?? null,
      closeout_actual_total_cost: actuals.actualFinalJobCost ?? null,
      closeout_notes: actuals.notes ?? null,
      closeout_actuals_json: actuals as unknown as Record<string, unknown>,
      closeout_analysis_json: analysis as unknown as Record<string, unknown>,
    },
  };
}
