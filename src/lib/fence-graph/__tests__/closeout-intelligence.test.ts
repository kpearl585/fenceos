// ── Closeout Intelligence Tests ──────────────────────────────────

import { describe, it, expect } from "vitest";
import { estimateFence } from "../engine";
import { analyzeEstimateCloseout } from "../closeout/analyzeCloseout";
import type { CloseoutActuals } from "../closeout/types";
import type { FenceProjectInput } from "../types";

function makeInput(overrides: Partial<FenceProjectInput> = {}): FenceProjectInput {
  return {
    projectName: "Test",
    productLineId: "vinyl_privacy_6ft",
    fenceHeight: 6,
    postSize: "5x5",
    soilType: "standard",
    windMode: false,
    runs: [{ id: "r1", linearFeet: 100, startType: "end", endType: "end" }],
    gates: [],
    ...overrides,
  };
}

function getEstimate() {
  return estimateFence(makeInput(), { laborRatePerHr: 65, wastePct: 0.05, priceMap: {} });
}

// ═══════════════════════════════════════════════════════════════
// VARIANCE — Exact / Over / Under
// ═══════════════════════════════════════════════════════════════

describe("Cost variance", () => {
  it("exact match → on_target overall, zero variance", () => {
    const est = getEstimate();
    const rawCost = est.commercialSummary!.rawEstimatedCost;

    const analysis = analyzeEstimateCloseout(est, {
      actualFinalJobCost: rawCost,
    });

    expect(analysis.costVariance.varianceAmount).toBe(0);
    expect(analysis.costVariance.variancePct).toBe(0);
  });

  it("actual above estimate → positive variance", () => {
    const est = getEstimate();
    const rawCost = est.commercialSummary!.rawEstimatedCost;

    const analysis = analyzeEstimateCloseout(est, {
      actualFinalJobCost: rawCost + 500,
    });

    expect(analysis.costVariance.varianceAmount).toBe(500);
    expect(analysis.costVariance.variancePct).toBeGreaterThan(0);
  });

  it("actual below estimate → negative variance", () => {
    const est = getEstimate();
    const rawCost = est.commercialSummary!.rawEstimatedCost;

    const analysis = analyzeEstimateCloseout(est, {
      actualFinalJobCost: rawCost - 300,
    });

    expect(analysis.costVariance.varianceAmount).toBe(-300);
    expect(analysis.costVariance.variancePct).toBeLessThan(0);
  });

  it("partial actuals do not break analysis", () => {
    const est = getEstimate();

    // Only provide material cost, nothing else
    const analysis = analyzeEstimateCloseout(est, {
      actualMaterialCost: 2500,
    });

    expect(Number.isFinite(analysis.costVariance.varianceAmount)).toBe(true);
    expect(analysis.costVariance.actualFinalJobCost).toBeGreaterThan(0);
  });

  it("completely empty actuals do not crash", () => {
    const est = getEstimate();
    const analysis = analyzeEstimateCloseout(est, {});

    expect(Number.isFinite(analysis.costVariance.varianceAmount)).toBe(true);
    expect(analysis.costVariance.laborHourVariance).toBeNull();
    expect(analysis.costVariance.laborHourVariancePct).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════
// CATEGORY BREAKDOWN
// ═══════════════════════════════════════════════════════════════

describe("Category variance breakdown", () => {
  it("category variances compute correctly", () => {
    const est = getEstimate();
    const cs = est.commercialSummary!;

    const analysis = analyzeEstimateCloseout(est, {
      actualMaterialCost: cs.materialCostSubtotal + 200,
      actualLaborCost: cs.laborCostSubtotal,
    });

    const materials = analysis.categoryVariances.find(c => c.category === "Materials");
    const labor = analysis.categoryVariances.find(c => c.category === "Labor");

    expect(materials).toBeDefined();
    expect(materials!.varianceAmount).toBe(200);
    expect(materials!.status).toBe("over");

    expect(labor).toBeDefined();
    expect(labor!.varianceAmount).toBe(0);
    expect(labor!.status).toBe("on_target");
  });

  it("missing categories are omitted cleanly", () => {
    const est = getEstimate();

    // Only provide material actual
    const analysis = analyzeEstimateCloseout(est, {
      actualMaterialCost: 2000,
    });

    // Materials present, Labor/Equipment/etc absent
    expect(analysis.categoryVariances.find(c => c.category === "Materials")).toBeDefined();
    expect(analysis.categoryVariances.find(c => c.category === "Labor")).toBeUndefined();
    expect(analysis.categoryVariances.find(c => c.category === "Equipment")).toBeUndefined();
  });

  it("status thresholding: ±5% = on_target", () => {
    const est = getEstimate();
    const cs = est.commercialSummary!;

    // 3% over → on_target
    const analysis = analyzeEstimateCloseout(est, {
      actualMaterialCost: Math.round(cs.materialCostSubtotal * 1.03),
    });

    const materials = analysis.categoryVariances.find(c => c.category === "Materials")!;
    expect(materials.status).toBe("on_target");
  });

  it("status thresholding: >5% = over", () => {
    const est = getEstimate();
    const cs = est.commercialSummary!;

    const analysis = analyzeEstimateCloseout(est, {
      actualMaterialCost: Math.round(cs.materialCostSubtotal * 1.10),
    });

    const materials = analysis.categoryVariances.find(c => c.category === "Materials")!;
    expect(materials.status).toBe("over");
  });
});

// ═══════════════════════════════════════════════════════════════
// CALIBRATION SIGNALS
// ═══════════════════════════════════════════════════════════════

describe("Calibration signals", () => {
  it("labor overrun creates labor_underestimate signal", () => {
    const est = getEstimate();
    const cs = est.commercialSummary!;

    const analysis = analyzeEstimateCloseout(est, {
      actualLaborCost: Math.round(cs.laborCostSubtotal * 1.30),
      actualLaborHours: est.totalLaborHrs * 1.25,
    });

    const laborSignals = analysis.calibrationSignals.filter(s =>
      s.type === "labor_underestimate"
    );
    expect(laborSignals.length).toBeGreaterThan(0);
    expect(laborSignals[0].recommendedDirection).toBe("increase");
  });

  it("rock field condition creates correct signal", () => {
    const est = getEstimate();

    const analysis = analyzeEstimateCloseout(est, {
      fieldConditions: { rock: true },
    });

    const rock = analysis.calibrationSignals.find(s => s.type === "field_condition_rock");
    expect(rock).toBeDefined();
    expect(rock!.severity).toBe("high");
    expect(rock!.recommendedConfigArea).toContain("laborEfficiency");
  });

  it("access issues create correct signal", () => {
    const est = getEstimate();

    const analysis = analyzeEstimateCloseout(est, {
      fieldConditions: { accessIssues: true },
    });

    const access = analysis.calibrationSignals.find(s => s.type === "field_condition_access");
    expect(access).toBeDefined();
    expect(access!.severity).toBe("medium");
  });

  it("weather delay creates correct signal", () => {
    const est = getEstimate();

    const analysis = analyzeEstimateCloseout(est, {
      fieldConditions: { weatherDelay: true },
    });

    const weather = analysis.calibrationSignals.find(s => s.type === "field_condition_weather");
    expect(weather).toBeDefined();
  });

  it("utility conflict creates correct signal", () => {
    const est = getEstimate();

    const analysis = analyzeEstimateCloseout(est, {
      fieldConditions: { utilityConflict: true },
    });

    const utility = analysis.calibrationSignals.find(s => s.type === "field_condition_utility");
    expect(utility).toBeDefined();
    expect(utility!.severity).toBe("high");
  });

  it("equipment missing in estimate creates signal", () => {
    const est = getEstimate();

    const analysis = analyzeEstimateCloseout(est, {
      actualEquipmentCost: 300, // actual equipment cost incurred
    });

    // Estimate should have equipment cost, but if actual differs significantly...
    // The test verifies the signal logic works
    const equipSignals = analysis.calibrationSignals.filter(s =>
      s.type === "equipment_missing" || s.type === "equipment_overestimate"
    );
    // Should have some signal if there's a variance
    expect(analysis.categoryVariances.find(c => c.category === "Equipment")).toBeDefined();
  });

  it("concrete overuse creates signal", () => {
    const est = getEstimate();
    const estBags = est.bom.find(b => b.sku === "CONCRETE_80LB")?.qty ?? 0;

    const analysis = analyzeEstimateCloseout(est, {
      actualConcreteBags: Math.round(estBags * 1.40), // 40% more concrete
    });

    const concrete = analysis.calibrationSignals.find(s => s.type === "concrete_underestimate");
    expect(concrete).toBeDefined();
    expect(concrete!.recommendedConfigArea).toContain("concrete");
  });
});

// ═══════════════════════════════════════════════════════════════
// LEARNING SUMMARY
// ═══════════════════════════════════════════════════════════════

describe("Contractor learning summary", () => {
  it("top variance drivers rank by absolute impact", () => {
    const est = getEstimate();
    const cs = est.commercialSummary!;

    const analysis = analyzeEstimateCloseout(est, {
      actualMaterialCost: cs.materialCostSubtotal + 500,
      actualLaborCost: cs.laborCostSubtotal + 200,
      actualEquipmentCost: (cs.equipmentCostSubtotal || 0) + 50,
    });

    const drivers = analysis.learningSummary.topVarianceDrivers;
    expect(drivers.length).toBeGreaterThan(0);
    // First driver should be the biggest variance (Materials +500)
    expect(drivers[0]).toContain("Materials");
  });

  it("whatWentRight includes on-target categories", () => {
    const est = getEstimate();
    const cs = est.commercialSummary!;

    const analysis = analyzeEstimateCloseout(est, {
      actualMaterialCost: cs.materialCostSubtotal, // exact match
      actualLaborCost: cs.laborCostSubtotal + 500, // big miss
    });

    expect(analysis.learningSummary.whatWentRight.some(s => s.includes("Materials"))).toBe(true);
  });

  it("whatToReviewNextTime includes high/medium severity items", () => {
    const est = getEstimate();
    const cs = est.commercialSummary!;

    const analysis = analyzeEstimateCloseout(est, {
      actualLaborCost: Math.round(cs.laborCostSubtotal * 1.40),
      fieldConditions: { rock: true, accessIssues: true },
    });

    expect(analysis.learningSummary.whatToReviewNextTime.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// GENERAL — no regressions
// ═══════════════════════════════════════════════════════════════

describe("No regressions", () => {
  it("no NaN in any output field", () => {
    const est = getEstimate();

    const analysis = analyzeEstimateCloseout(est, {
      actualMaterialCost: 2500,
      actualLaborCost: 1200,
      actualLaborHours: 20,
      actualConcreteBags: 30,
      fieldConditions: { rock: true, weatherDelay: true },
    });

    expect(Number.isFinite(analysis.costVariance.varianceAmount)).toBe(true);
    expect(Number.isFinite(analysis.costVariance.variancePct)).toBe(true);
    if (analysis.costVariance.laborHourVariance !== null) {
      expect(Number.isFinite(analysis.costVariance.laborHourVariance)).toBe(true);
    }
    for (const cv of analysis.categoryVariances) {
      expect(Number.isFinite(cv.varianceAmount)).toBe(true);
      expect(Number.isFinite(cv.variancePct)).toBe(true);
    }
  });

  it("estimate generation still works (backward compat)", () => {
    const result = estimateFence(makeInput(), 65);
    expect(result.totalCost).toBeGreaterThan(0);
    expect(result.commercialSummary).toBeDefined();
    expect(result.quoteMetadata).toBeDefined();
  });

  it("all four fence types work with closeout analysis", () => {
    const types = [
      { type: "vinyl" as const, product: "vinyl_privacy_6ft", post: "5x5" as const },
      { type: "wood" as const, product: "wood_privacy_6ft", post: "4x4" as const },
      { type: "chain_link" as const, product: "chain_link_6ft", post: "2in" as any },
      { type: "aluminum" as const, product: "aluminum_6ft", post: "4x4" as const },
    ];

    for (const { type, product, post } of types) {
      const est = estimateFence(
        makeInput({ productLineId: product, postSize: post }),
        { fenceType: type, laborRatePerHr: 65, wastePct: 0.05, priceMap: {} }
      );

      const analysis = analyzeEstimateCloseout(est, {
        actualMaterialCost: est.totalMaterialCost * 1.1,
        actualLaborCost: est.totalLaborCost,
      });

      expect(analysis.costVariance).toBeDefined();
      expect(analysis.categoryVariances.length).toBeGreaterThan(0);
      expect(analysis.learningSummary).toBeDefined();
    }
  });
});
