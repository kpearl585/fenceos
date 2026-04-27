import type {
  FenceEstimateResult,
  LaborModelHealth,
} from "./types";

export interface MarginRiskAssessment {
  status: "safe" | "watch" | "risky" | "blocked";
  grossMarginPct: number;
  targetMarginPct: number;
  recommendedTargetMarginPct: number;
  recommendedMarkupPct: number;
  reasons: string[];
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

export function grossMarginPctFromMarkup(markupPct: number): number {
  const safeMarkup = Math.max(0, markupPct);
  const salePriceFactor = 1 + safeMarkup / 100;
  if (salePriceFactor <= 0) return 0;
  return round1(((salePriceFactor - 1) / salePriceFactor) * 100);
}

export function markupPctForTargetMargin(targetMarginPct: number): number {
  const target = Math.min(0.95, Math.max(0, targetMarginPct / 100));
  if (target <= 0) return 0;
  return round1((target / (1 - target)) * 100);
}

function laborBufferPct(laborHealth?: LaborModelHealth): number {
  if (!laborHealth) return 2;
  if (laborHealth.calibrationConfidence === "low") return 5;
  if (laborHealth.calibrationConfidence === "medium") return 3;
  return 1;
}

export function assessEstimateMarginRisk(args: {
  result: FenceEstimateResult;
  markupPct: number;
  targetMarginPct: number;
}): MarginRiskAssessment {
  const { result, markupPct, targetMarginPct } = args;
  const grossMarginPct = grossMarginPctFromMarkup(markupPct);
  const reasons: string[] = [];

  let recommendedTargetMarginPct = targetMarginPct;
  const laborBuffer = laborBufferPct(result.laborModelHealth);
  recommendedTargetMarginPct += laborBuffer;

  if (result.laborModelHealth?.calibrationConfidence === "low") {
    reasons.push("Labor calibration is still thin for this job pattern.");
  } else if (result.laborModelHealth?.calibrationConfidence === "medium") {
    reasons.push("Labor calibration is improving, but history is still limited for this job pattern.");
  }

  if ((result.graph.siteConfig.siteComplexity?.overall_score ?? 0) >= 4) {
    recommendedTargetMarginPct += 2;
    reasons.push("High-complexity site conditions justify extra margin buffer.");
  }

  if ((result.pricingHealth?.freshCoveragePct ?? 1) < 0.95) {
    recommendedTargetMarginPct += 2;
    reasons.push("Not all material spend is backed by fresh supplier pricing.");
  }

  if (result.overallConfidence < 0.85) {
    recommendedTargetMarginPct += 2;
    reasons.push("Overall estimator confidence is below the top-trust range.");
  }

  recommendedTargetMarginPct = round1(Math.min(60, Math.max(targetMarginPct, recommendedTargetMarginPct)));
  const recommendedMarkupPct = markupPctForTargetMargin(recommendedTargetMarginPct);
  const hardFloorPct = round1(Math.max(18, targetMarginPct - 10));

  if (grossMarginPct < hardFloorPct) {
    reasons.unshift(`Gross margin ${grossMarginPct}% is below the hard safety floor of ${hardFloorPct}%.`);
    return {
      status: "blocked",
      grossMarginPct,
      targetMarginPct,
      recommendedTargetMarginPct,
      recommendedMarkupPct,
      reasons,
    };
  }

  if (grossMarginPct < targetMarginPct) {
    reasons.unshift(`Gross margin ${grossMarginPct}% is below your target margin of ${targetMarginPct}%.`);
    return {
      status: "risky",
      grossMarginPct,
      targetMarginPct,
      recommendedTargetMarginPct,
      recommendedMarkupPct,
      reasons,
    };
  }

  if (grossMarginPct < recommendedTargetMarginPct) {
    reasons.unshift(`Gross margin ${grossMarginPct}% is above target but below the recommended buffer of ${recommendedTargetMarginPct}%.`);
    return {
      status: "watch",
      grossMarginPct,
      targetMarginPct,
      recommendedTargetMarginPct,
      recommendedMarkupPct,
      reasons,
    };
  }

  return {
    status: "safe",
    grossMarginPct,
    targetMarginPct,
    recommendedTargetMarginPct,
    recommendedMarkupPct,
    reasons: reasons.length > 0 ? reasons : ["Margin buffer is healthy for the current confidence and site conditions."],
  };
}
