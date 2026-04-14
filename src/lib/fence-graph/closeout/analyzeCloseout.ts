// ── Closeout Intelligence Engine ─────────────────────────────────
// Compares estimate vs actuals, identifies variance drivers,
// and generates calibration signals for org config tuning.

import type { FenceEstimateResult, CommercialSummary } from "../types";
import type {
  CloseoutActuals,
  EstimateCloseoutAnalysis,
  CostVarianceSummary,
  CategoryVariance,
  CalibrationSignal,
  CalibrationSignalType,
  CalibrationSeverity,
  ContractorLearningSummary,
  VarianceStatus,
} from "./types";

// ── Thresholds ───────────────────────────────────────────────────
const ON_TARGET_THRESHOLD = 0.05;  // ±5% = on_target
const MEDIUM_THRESHOLD = 0.15;     // ±15% = medium severity
const HIGH_THRESHOLD = 0.25;       // ±25% = high severity

// ── Public API ───────────────────────────────────────────────────

/**
 * Analyze an estimate vs actual closeout data.
 * Returns structured variance, calibration signals, and learning summary.
 */
export function analyzeEstimateCloseout(
  estimate: FenceEstimateResult,
  actuals: CloseoutActuals
): EstimateCloseoutAnalysis {
  const cs = estimate.commercialSummary;

  const costVariance = buildCostVariance(estimate, actuals, cs);
  const categoryVariances = buildCategoryVariances(estimate, actuals, cs);
  const calibrationSignals = buildCalibrationSignals(estimate, actuals, categoryVariances);
  const learningSummary = buildLearningSummary(categoryVariances, calibrationSignals);

  return {
    costVariance,
    categoryVariances,
    calibrationSignals,
    learningSummary,
  };
}

// ── Cost Variance Summary ────────────────────────────────────────

function buildCostVariance(
  estimate: FenceEstimateResult,
  actuals: CloseoutActuals,
  cs?: CommercialSummary
): CostVarianceSummary {
  const estimatedRaw = cs?.rawEstimatedCost ?? estimate.totalCost;

  // Derive actual total: explicit > sum of categories > fallback
  const actualTotal = actuals.actualFinalJobCost ?? deriveActualTotal(actuals) ?? estimatedRaw;

  const varianceAmount = actualTotal - estimatedRaw;
  const variancePct = safeVariancePct(actualTotal, estimatedRaw);

  const estimatedLaborHrs = estimate.totalLaborHrs;
  const actualLaborHrs = actuals.actualLaborHours ?? null;

  return {
    estimatedRawCost: estimatedRaw,
    actualFinalJobCost: actualTotal,
    varianceAmount: Math.round(varianceAmount),
    variancePct: round4(variancePct),
    estimatedLaborHours: estimatedLaborHrs,
    actualLaborHours: actualLaborHrs,
    laborHourVariance: actualLaborHrs !== null
      ? round1(actualLaborHrs - estimatedLaborHrs)
      : null,
    laborHourVariancePct: actualLaborHrs !== null
      ? round4(safeVariancePct(actualLaborHrs, estimatedLaborHrs))
      : null,
  };
}

function deriveActualTotal(actuals: CloseoutActuals): number | null {
  const parts = [
    actuals.actualMaterialCost,
    actuals.actualLaborCost,
    actuals.actualEquipmentCost,
    actuals.actualLogisticsCost,
    actuals.actualDisposalCost,
    actuals.actualRegulatoryCost,
  ];
  const available = parts.filter((v): v is number => v !== undefined && v !== null);
  if (available.length === 0) return null;
  return available.reduce((s, v) => s + v, 0);
}

// ── Category Variance Breakdown ──────────────────────────────────

function buildCategoryVariances(
  estimate: FenceEstimateResult,
  actuals: CloseoutActuals,
  cs?: CommercialSummary
): CategoryVariance[] {
  const categories: { category: string; estimated: number; actual?: number }[] = [
    { category: "Materials", estimated: cs?.materialCostSubtotal ?? estimate.totalMaterialCost, actual: actuals.actualMaterialCost },
    { category: "Labor", estimated: cs?.laborCostSubtotal ?? estimate.totalLaborCost, actual: actuals.actualLaborCost },
    { category: "Equipment", estimated: cs?.equipmentCostSubtotal ?? 0, actual: actuals.actualEquipmentCost },
    { category: "Logistics", estimated: cs?.logisticsCostSubtotal ?? 0, actual: actuals.actualLogisticsCost },
    { category: "Disposal", estimated: cs?.disposalCostSubtotal ?? 0, actual: actuals.actualDisposalCost },
    { category: "Regulatory", estimated: cs?.regulatoryCostSubtotal ?? 0, actual: actuals.actualRegulatoryCost },
  ];

  return categories
    .filter(c => c.actual !== undefined && c.actual !== null)
    .map(c => {
      const actual = c.actual!;
      const varianceAmount = actual - c.estimated;
      const variancePct = safeVariancePct(actual, c.estimated);
      return {
        category: c.category,
        estimated: Math.round(c.estimated),
        actual: Math.round(actual),
        varianceAmount: Math.round(varianceAmount),
        variancePct: round4(variancePct),
        status: classifyVariance(variancePct),
      };
    });
}

// ── Calibration Signals ──────────────────────────────────────────

function buildCalibrationSignals(
  estimate: FenceEstimateResult,
  actuals: CloseoutActuals,
  categoryVariances: CategoryVariance[]
): CalibrationSignal[] {
  const signals: CalibrationSignal[] = [];

  // ── Category-based signals ──
  for (const cv of categoryVariances) {
    if (cv.status === "on_target") continue;

    const severity = severityFromPct(Math.abs(cv.variancePct));
    const direction = cv.status === "over" ? "increase" : "decrease";
    const pctLabel = `${Math.abs(Math.round(cv.variancePct * 100))}%`;

    switch (cv.category) {
      case "Labor":
        signals.push({
          type: cv.status === "over" ? "labor_underestimate" : "labor_overestimate",
          severity,
          message: `Labor cost was ${pctLabel} ${cv.status === "over" ? "over" : "under"} estimate ($${cv.varianceAmount > 0 ? "+" : ""}${cv.varianceAmount})`,
          recommendedConfigArea: "labor / laborEfficiency.baseMultiplier",
          recommendedDirection: direction,
        });
        break;
      case "Materials":
        signals.push({
          type: cv.status === "over" ? "material_underestimate" : "material_overestimate",
          severity,
          message: `Material cost was ${pctLabel} ${cv.status === "over" ? "over" : "under"} estimate ($${cv.varianceAmount > 0 ? "+" : ""}${cv.varianceAmount})`,
          recommendedConfigArea: "material / region.materialMultiplier",
          recommendedDirection: direction,
        });
        break;
      case "Equipment":
        if (cv.estimated === 0 && cv.actual > 0) {
          signals.push({
            type: "equipment_missing",
            severity: "medium",
            message: `Equipment cost of $${cv.actual} was incurred but not estimated`,
            recommendedConfigArea: "equipment",
            recommendedDirection: "review",
          });
        } else {
          signals.push({
            type: cv.status === "over" ? "equipment_missing" : "equipment_overestimate",
            severity,
            message: `Equipment cost was ${pctLabel} ${cv.status === "over" ? "over" : "under"} estimate`,
            recommendedConfigArea: "equipment",
            recommendedDirection: direction,
          });
        }
        break;
      case "Logistics":
        if (cv.estimated === 0 && cv.actual > 0) {
          signals.push({
            type: "delivery_missing",
            severity: "low",
            message: `Delivery/logistics cost of $${cv.actual} was incurred but not estimated`,
            recommendedConfigArea: "logistics.deliveryFee",
            recommendedDirection: "review",
          });
        }
        break;
      case "Disposal":
        if (cv.status === "over") {
          signals.push({
            type: "removal_underestimated",
            severity,
            message: `Disposal cost was ${pctLabel} over estimate ($${cv.varianceAmount > 0 ? "+" : ""}${cv.varianceAmount})`,
            recommendedConfigArea: "removal.disposalCost",
            recommendedDirection: "increase",
          });
        }
        break;
    }
  }

  // ── Labor hour signals ──
  if (actuals.actualLaborHours !== undefined) {
    const estHrs = estimate.totalLaborHrs;
    const actHrs = actuals.actualLaborHours;
    const hrsPct = safeVariancePct(actHrs, estHrs);

    if (Math.abs(hrsPct) > ON_TARGET_THRESHOLD) {
      signals.push({
        type: hrsPct > 0 ? "labor_underestimate" : "labor_overestimate",
        severity: severityFromPct(Math.abs(hrsPct)),
        message: `Labor hours: estimated ${estHrs}h, actual ${actHrs}h (${hrsPct > 0 ? "+" : ""}${Math.round(hrsPct * 100)}%)`,
        recommendedConfigArea: "labor / overhead",
        recommendedDirection: hrsPct > 0 ? "increase" : "decrease",
      });
    }
  }

  // ── Concrete quantity signals ──
  if (actuals.actualConcreteBags !== undefined) {
    const estBags = estimate.bom.find(b => b.sku === "CONCRETE_80LB")?.qty ?? 0;
    if (estBags > 0) {
      const bagsPct = safeVariancePct(actuals.actualConcreteBags, estBags);
      if (Math.abs(bagsPct) > ON_TARGET_THRESHOLD) {
        signals.push({
          type: bagsPct > 0 ? "concrete_underestimate" : "waste_overestimate",
          severity: severityFromPct(Math.abs(bagsPct)),
          message: `Concrete: estimated ${estBags} bags, actual ${actuals.actualConcreteBags} bags (${bagsPct > 0 ? "+" : ""}${Math.round(bagsPct * 100)}%)`,
          recommendedConfigArea: "concrete.bagYieldCuFt",
          recommendedDirection: bagsPct > 0 ? "review" : "review",
        });
      }
    }
  }

  // ── Field condition signals ──
  const fc = actuals.fieldConditions;
  if (fc) {
    if (fc.rock) {
      signals.push({
        type: "field_condition_rock",
        severity: "high",
        message: "Rock encountered during installation — increases digging time and may require equipment upgrades",
        recommendedConfigArea: "laborEfficiency.baseMultiplier / concrete.floridaDepthIn",
        recommendedDirection: "review",
      });
    }
    if (fc.roots) {
      signals.push({
        type: "field_condition_roots",
        severity: "medium",
        message: "Root systems encountered — slows post hole digging and may require rerouting",
        recommendedConfigArea: "laborEfficiency.baseMultiplier",
        recommendedDirection: "increase",
      });
    }
    if (fc.standingWater) {
      signals.push({
        type: "field_condition_water",
        severity: "medium",
        message: "Standing water or high water table — affects concrete curing and may require additional drainage",
        recommendedConfigArea: "concrete / overhead.fixed.setupHrs",
        recommendedDirection: "review",
      });
    }
    if (fc.accessIssues) {
      signals.push({
        type: "field_condition_access",
        severity: "medium",
        message: "Difficult site access — materials carried by hand, limited equipment placement",
        recommendedConfigArea: "laborEfficiency.baseMultiplier / overhead.fixed.setupHrs",
        recommendedDirection: "increase",
      });
    }
    if (fc.utilityConflict) {
      signals.push({
        type: "field_condition_utility",
        severity: "high",
        message: "Utility conflict encountered — required rerouting or hand digging near lines",
        recommendedConfigArea: "overhead.fixed.layoutHrs / laborEfficiency.baseMultiplier",
        recommendedDirection: "review",
      });
    }
    if (fc.weatherDelay) {
      signals.push({
        type: "field_condition_weather",
        severity: "low",
        message: "Weather caused schedule delay — additional setup/breakdown on extra days",
        recommendedConfigArea: "overhead.perDay.cleanupHrs / production.hoursPerDay",
        recommendedDirection: "review",
      });
    }
  }

  return signals;
}

// ── Learning Summary ─────────────────────────────────────────────

function buildLearningSummary(
  categoryVariances: CategoryVariance[],
  signals: CalibrationSignal[]
): ContractorLearningSummary {
  // Top variance drivers: sorted by absolute variance amount, descending
  const sorted = [...categoryVariances]
    .filter(cv => cv.status !== "on_target")
    .sort((a, b) => Math.abs(b.varianceAmount) - Math.abs(a.varianceAmount));

  const topVarianceDrivers = sorted.slice(0, 3).map(cv => {
    const dir = cv.varianceAmount > 0 ? "over" : "under";
    return `${cv.category}: $${Math.abs(cv.varianceAmount)} ${dir} (${Math.abs(Math.round(cv.variancePct * 100))}%)`;
  });

  // What went right: on-target categories
  const whatWentRight = categoryVariances
    .filter(cv => cv.status === "on_target")
    .map(cv => `${cv.category} was within ±5% of estimate`);

  if (whatWentRight.length === 0 && categoryVariances.length > 0) {
    // Find the closest category
    const closest = [...categoryVariances].sort(
      (a, b) => Math.abs(a.variancePct) - Math.abs(b.variancePct)
    )[0];
    if (closest) {
      whatWentRight.push(`${closest.category} was closest to estimate (${Math.abs(Math.round(closest.variancePct * 100))}% variance)`);
    }
  }

  // What to review: high-severity signals
  const whatToReviewNextTime = signals
    .filter(s => s.severity === "high" || s.severity === "medium")
    .slice(0, 5)
    .map(s => s.message);

  return {
    topVarianceDrivers,
    whatWentRight,
    whatToReviewNextTime,
  };
}

// ── Utility Functions ────────────────────────────────────────────

function safeVariancePct(actual: number, estimated: number): number {
  if (estimated === 0) return actual === 0 ? 0 : 1; // 100% variance if estimated 0 but actual non-zero
  return (actual - estimated) / estimated;
}

function classifyVariance(pct: number): VarianceStatus {
  if (Math.abs(pct) <= ON_TARGET_THRESHOLD) return "on_target";
  return pct > 0 ? "over" : "under";
}

function severityFromPct(absPct: number): CalibrationSeverity {
  if (absPct >= HIGH_THRESHOLD) return "high";
  if (absPct >= MEDIUM_THRESHOLD) return "medium";
  return "low";
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
