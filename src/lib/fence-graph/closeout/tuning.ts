import type { DeepPartial, OrgEstimatorConfig } from "../config/types";
import { mergeResolvedEstimatorConfig } from "../config/resolveEstimatorConfig";
import type { FenceType } from "../bom/index";
import type { CloseoutActuals, EstimateCloseoutAnalysis } from "./types";
import {
  getSiteComplexityBand,
  normalizeSiteComplexity,
} from "../siteComplexity";
import type { SiteComplexity } from "../accuracy-types";

export interface EstimatorTuningRecommendation {
  id: string;
  title: string;
  message: string;
  reason: string;
  severity: "low" | "medium" | "high";
  configArea: string;
  patch: DeepPartial<OrgEstimatorConfig> | null;
  beforeValue?: number;
  afterValue?: number;
  unit?: string;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round3(value: number) {
  return Math.round(value * 1000) / 1000;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function scaleFenceLaborRates(
  currentConfig: OrgEstimatorConfig,
  fenceType: FenceType,
  multiplier: number,
): DeepPartial<OrgEstimatorConfig> {
  const currentRates = currentConfig.labor[fenceType];
  const scaled = Object.fromEntries(
    Object.entries(currentRates).map(([key, value]) => [key, round3(value * multiplier)])
  );

  return {
    labor: {
      [fenceType]: scaled,
    },
  } as DeepPartial<OrgEstimatorConfig>;
}

function buildLaborRecommendation(
  analysis: EstimateCloseoutAnalysis,
  currentConfig: OrgEstimatorConfig,
  fenceType: FenceType,
): EstimatorTuningRecommendation | null {
  const variancePct = analysis.costVariance.laborHourVariancePct;
  if (variancePct == null || Math.abs(variancePct) <= 0.05) return null;

  const boundedDelta = clamp(variancePct * 0.35, -0.12, 0.12);
  if (Math.abs(boundedDelta) < 0.01) return null;

  const multiplier = 1 + boundedDelta;
  const patch = scaleFenceLaborRates(currentConfig, fenceType, multiplier);
  const firstRate = Object.values(currentConfig.labor[fenceType])[0];
  const firstNextRate = Object.values(
    (mergeResolvedEstimatorConfig(currentConfig, patch).labor[fenceType])
  )[0];

  return {
    id: "labor-by-fence-type",
    title: `Tune ${fenceType.replace("_", " ")} labor rates`,
    message:
      variancePct > 0
        ? "Actual labor hours came in above estimate. Increase this fence type's labor rates slightly."
        : "Actual labor hours came in below estimate. Decrease this fence type's labor rates slightly.",
    reason: `Observed labor-hour variance was ${(variancePct * 100).toFixed(1)}%. Applying ${(boundedDelta * 100).toFixed(1)}% as a bounded correction.`,
    severity: Math.abs(variancePct) >= 0.25 ? "high" : Math.abs(variancePct) >= 0.15 ? "medium" : "low",
    configArea: `labor.${fenceType}.*`,
    patch,
    beforeValue: firstRate,
    afterValue: firstNextRate,
    unit: "hrs/unit",
  };
}

function buildAdaptiveLaborRecommendation(
  analysis: EstimateCloseoutAnalysis,
  currentConfig: OrgEstimatorConfig,
  fenceType: FenceType,
  siteComplexity?: SiteComplexity | null,
): EstimatorTuningRecommendation | null {
  const variancePct = analysis.costVariance.laborHourVariancePct;
  if (variancePct == null || Math.abs(variancePct) <= 0.05) return null;

  const normalizedComplexity = normalizeSiteComplexity(siteComplexity);
  if (!normalizedComplexity) return null;

  const band = getSiteComplexityBand(normalizedComplexity.overall_score ?? 0);
  const currentBucket = currentConfig.adaptiveLabor.byFenceType[fenceType][band];
  const boundedDelta = clamp(variancePct * 0.3, -0.08, 0.08);
  if (Math.abs(boundedDelta) < 0.01) return null;

  const nextMultiplier = round3(
    clamp(currentBucket.multiplier * (1 + boundedDelta), 0.8, 1.25)
  );

  return {
    id: `adaptive-labor-${fenceType}-${band}`,
    title: `Tune ${fenceType.replace("_", " ")} labor for ${band.replace("_", " ")} sites`,
    message:
      variancePct > 0
        ? "This closeout suggests this fence type runs slower on this site-complexity band."
        : "This closeout suggests this fence type runs faster on this site-complexity band.",
    reason: `Observed labor-hour variance was ${(variancePct * 100).toFixed(1)}% on a ${band.replace("_", " ")} site. Applying ${(boundedDelta * 100).toFixed(1)}% as a bounded band-specific correction.`,
    severity: Math.abs(variancePct) >= 0.25 ? "high" : Math.abs(variancePct) >= 0.15 ? "medium" : "low",
    configArea: `adaptiveLabor.byFenceType.${fenceType}.${band}.multiplier`,
    patch: {
      adaptiveLabor: {
        byFenceType: {
          [fenceType]: {
            [band]: {
              multiplier: nextMultiplier,
              sampleCount: currentBucket.sampleCount + 1,
            },
          },
        },
      },
    } as DeepPartial<OrgEstimatorConfig>,
    beforeValue: currentBucket.multiplier,
    afterValue: nextMultiplier,
    unit: "x",
  };
}

function buildMaterialRecommendation(
  analysis: EstimateCloseoutAnalysis,
  currentConfig: OrgEstimatorConfig,
): EstimatorTuningRecommendation | null {
  const materials = analysis.categoryVariances.find((item) => item.category === "Materials");
  if (!materials || Math.abs(materials.variancePct) <= 0.05) return null;

  const boundedDelta = clamp(materials.variancePct * 0.25, -0.08, 0.08);
  if (Math.abs(boundedDelta) < 0.01) return null;

  const nextMultiplier = round3(
    clamp(currentConfig.region.materialMultiplier * (1 + boundedDelta), 0.75, 1.5)
  );

  return {
    id: "region-material-multiplier",
    title: "Tune regional material multiplier",
    message:
      materials.variancePct > 0
        ? "Actual material spend came in above estimate. Raise the material multiplier slightly."
        : "Actual material spend came in below estimate. Lower the material multiplier slightly.",
    reason: `Observed material variance was ${(materials.variancePct * 100).toFixed(1)}%. Applying ${(boundedDelta * 100).toFixed(1)}% as a bounded correction.`,
    severity: Math.abs(materials.variancePct) >= 0.25 ? "high" : Math.abs(materials.variancePct) >= 0.15 ? "medium" : "low",
    configArea: "region.materialMultiplier",
    patch: {
      region: {
        materialMultiplier: nextMultiplier,
      },
    },
    beforeValue: currentConfig.region.materialMultiplier,
    afterValue: nextMultiplier,
    unit: "x",
  };
}

function buildDeliveryRecommendation(
  actuals: CloseoutActuals,
  currentConfig: OrgEstimatorConfig,
): EstimatorTuningRecommendation | null {
  if (actuals.actualLogisticsCost == null || actuals.actualLogisticsCost <= 0) return null;

  const nextFee = round2(
    clamp(
      currentConfig.logistics.deliveryFee * 0.7 + actuals.actualLogisticsCost * 0.3,
      0,
      5000
    )
  );

  if (Math.abs(nextFee - currentConfig.logistics.deliveryFee) < 5) return null;

  return {
    id: "delivery-fee",
    title: "Tune delivery fee baseline",
    message: "This job incurred real delivery/logistics cost that the estimate should learn from.",
    reason: `Blending 30% of the observed logistics cost ($${actuals.actualLogisticsCost.toFixed(2)}) into the default delivery fee.`,
    severity: "low",
    configArea: "logistics.deliveryFee",
    patch: {
      logistics: {
        deliveryFee: nextFee,
      },
    },
    beforeValue: currentConfig.logistics.deliveryFee,
    afterValue: nextFee,
    unit: "$",
  };
}

function buildRemovalRecommendation(
  actuals: CloseoutActuals,
  currentConfig: OrgEstimatorConfig,
): EstimatorTuningRecommendation | null {
  if (actuals.actualDisposalCost == null || actuals.actualDisposalCost <= 0) return null;

  const nextDisposal = round2(
    clamp(
      currentConfig.removal.disposalCost * 0.7 + actuals.actualDisposalCost * 0.3,
      0,
      10000
    )
  );

  if (Math.abs(nextDisposal - currentConfig.removal.disposalCost) < 10) return null;

  return {
    id: "removal-disposal-cost",
    title: "Tune tear-out disposal baseline",
    message: "The observed tear-out/disposal cost suggests your removal baseline needs a small correction.",
    reason: `Blending 30% of the observed disposal cost ($${actuals.actualDisposalCost.toFixed(2)}) into the default removal disposal cost.`,
    severity: "medium",
    configArea: "removal.disposalCost",
    patch: {
      removal: {
        disposalCost: nextDisposal,
      },
    },
    beforeValue: currentConfig.removal.disposalCost,
    afterValue: nextDisposal,
    unit: "$",
  };
}

function buildAdvisoryRecommendations(
  analysis: EstimateCloseoutAnalysis,
): EstimatorTuningRecommendation[] {
  return analysis.calibrationSignals
    .filter((signal) => signal.recommendedDirection === "review")
    .slice(0, 3)
    .map((signal) => ({
      id: `advisory-${signal.type}`,
      title: "Manual review recommended",
      message: signal.message,
      reason: `This signal points at ${signal.recommendedConfigArea}, but the current engine does not yet have a safe automatic tuning rule for it.`,
      severity: signal.severity,
      configArea: signal.recommendedConfigArea,
      patch: null,
    }));
}

export function buildEstimatorTuningRecommendations(args: {
  analysis: EstimateCloseoutAnalysis | null;
  actuals: CloseoutActuals | null;
  currentConfig: OrgEstimatorConfig;
  fenceType: FenceType;
  siteComplexity?: SiteComplexity | null;
}): EstimatorTuningRecommendation[] {
  const { analysis, actuals, currentConfig, fenceType, siteComplexity } = args;
  if (!analysis || !actuals) return [];

  const adaptiveLaborRecommendation = buildAdaptiveLaborRecommendation(
    analysis,
    currentConfig,
    fenceType,
    siteComplexity
  );

  const recommendations = [
    adaptiveLaborRecommendation ?? buildLaborRecommendation(analysis, currentConfig, fenceType),
    buildMaterialRecommendation(analysis, currentConfig),
    buildDeliveryRecommendation(actuals, currentConfig),
    buildRemovalRecommendation(actuals, currentConfig),
    ...buildAdvisoryRecommendations(analysis),
  ].filter((item): item is EstimatorTuningRecommendation => Boolean(item));

  const seen = new Set<string>();
  return recommendations.filter((recommendation) => {
    if (seen.has(recommendation.id)) return false;
    seen.add(recommendation.id);
    return true;
  });
}

export function applyEstimatorTuningRecommendations(
  currentConfig: OrgEstimatorConfig,
  recommendations: EstimatorTuningRecommendation[],
): OrgEstimatorConfig {
  return recommendations.reduce((config, recommendation) => {
    if (!recommendation.patch) return config;
    return mergeResolvedEstimatorConfig(config, recommendation.patch);
  }, currentConfig);
}
