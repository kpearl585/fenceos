import { describe, expect, it } from "vitest";
import { estimateFence } from "../engine";
import { analyzeEstimateCloseout } from "../closeout/analyzeCloseout";
import {
  applyEstimatorTuningRecommendations,
  buildEstimatorTuningRecommendations,
} from "../closeout/tuning";
import { mergeEstimatorConfig } from "../config/resolveEstimatorConfig";
import type { FenceProjectInput } from "../types";

function makeInput(overrides: Partial<FenceProjectInput> = {}): FenceProjectInput {
  return {
    projectName: "Tuning Test",
    productLineId: "vinyl_privacy_6ft",
    fenceHeight: 6,
    postSize: "5x5",
    soilType: "standard",
    windMode: false,
    runs: [{ id: "r1", linearFeet: 110, startType: "end", endType: "end" }],
    gates: [],
    ...overrides,
  };
}

describe("closeout tuning recommendations", () => {
  it("generates bounded auto-tuning recommendations from labor/material/logistics/removal variance", () => {
    const estimate = estimateFence(makeInput(), {
      laborRatePerHr: 65,
      wastePct: 0.05,
      priceMap: {},
    });
    const config = mergeEstimatorConfig(null);

    const analysis = analyzeEstimateCloseout(estimate, {
      actualMaterialCost: estimate.totalMaterialCost * 1.2,
      actualLaborHours: estimate.totalLaborHrs * 1.25,
      actualLaborCost: estimate.totalLaborCost * 1.22,
      actualLogisticsCost: 160,
      actualDisposalCost: 450,
      actualFinalJobCost: estimate.totalCost * 1.18,
    });

    const recommendations = buildEstimatorTuningRecommendations({
      analysis,
      actuals: {
        actualMaterialCost: estimate.totalMaterialCost * 1.2,
        actualLaborHours: estimate.totalLaborHrs * 1.25,
        actualLaborCost: estimate.totalLaborCost * 1.22,
        actualLogisticsCost: 160,
        actualDisposalCost: 450,
        actualFinalJobCost: estimate.totalCost * 1.18,
      },
      currentConfig: config,
      fenceType: "vinyl",
    });

    expect(recommendations.some((item) => item.id === "labor-by-fence-type")).toBe(true);
    expect(recommendations.some((item) => item.id === "region-material-multiplier")).toBe(true);
    expect(recommendations.some((item) => item.id === "delivery-fee")).toBe(true);
    expect(recommendations.some((item) => item.id === "removal-disposal-cost")).toBe(true);
  });

  it("applies only auto recommendations to the resolved config", () => {
    const estimate = estimateFence(makeInput(), {
      laborRatePerHr: 65,
      wastePct: 0.05,
      priceMap: {},
    });
    const config = mergeEstimatorConfig(null);
    const analysis = analyzeEstimateCloseout(estimate, {
      actualMaterialCost: estimate.totalMaterialCost * 1.2,
      actualLaborHours: estimate.totalLaborHrs * 1.25,
      actualLaborCost: estimate.totalLaborCost * 1.22,
      actualLogisticsCost: 160,
      actualFinalJobCost: estimate.totalCost * 1.18,
      fieldConditions: { rock: true },
    });

    const recommendations = buildEstimatorTuningRecommendations({
      analysis,
      actuals: {
        actualMaterialCost: estimate.totalMaterialCost * 1.2,
        actualLaborHours: estimate.totalLaborHrs * 1.25,
        actualLaborCost: estimate.totalLaborCost * 1.22,
        actualLogisticsCost: 160,
        actualFinalJobCost: estimate.totalCost * 1.18,
        fieldConditions: { rock: true },
      },
      currentConfig: config,
      fenceType: "vinyl",
    });

    const next = applyEstimatorTuningRecommendations(config, recommendations);

    expect(next.labor.vinyl.holeDig).toBeGreaterThan(config.labor.vinyl.holeDig);
    expect(next.region.materialMultiplier).toBeGreaterThan(config.region.materialMultiplier);
    expect(next.logistics.deliveryFee).toBeGreaterThan(config.logistics.deliveryFee);
    expect(next.laborEfficiency.baseMultiplier).toBe(config.laborEfficiency.baseMultiplier);
  });

  it("prefers adaptive labor tuning when site complexity is present", () => {
    const estimate = estimateFence(
      makeInput({
        siteComplexity: {
          access_difficulty: 5,
          obstacles: 4,
          ground_hardness: 4,
          demo_required: false,
          permit_complexity: 2,
        },
      }),
      {
        laborRatePerHr: 65,
        wastePct: 0.05,
        priceMap: {},
      }
    );
    const config = mergeEstimatorConfig(null);
    const analysis = analyzeEstimateCloseout(estimate, {
      actualMaterialCost: estimate.totalMaterialCost,
      actualLaborHours: estimate.totalLaborHrs * 1.18,
      actualLaborCost: estimate.totalLaborCost * 1.18,
      actualFinalJobCost: estimate.totalCost * 1.1,
    });

    const recommendations = buildEstimatorTuningRecommendations({
      analysis,
      actuals: {
        actualMaterialCost: estimate.totalMaterialCost,
        actualLaborHours: estimate.totalLaborHrs * 1.18,
        actualLaborCost: estimate.totalLaborCost * 1.18,
        actualFinalJobCost: estimate.totalCost * 1.1,
      },
      currentConfig: config,
      fenceType: "vinyl",
      siteComplexity: {
        access_difficulty: 5,
        obstacles: 4,
        ground_hardness: 4,
        demo_required: false,
        permit_complexity: 2,
      },
    });

    expect(recommendations.some((item) => item.id.startsWith("adaptive-labor-vinyl-"))).toBe(true);
  });
});
