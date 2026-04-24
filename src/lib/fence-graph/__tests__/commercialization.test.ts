// ── Commercialization Layer Tests ────────────────────────────────
// Tests for min job charge, regional pricing, regulatory costs, profitability.

import { describe, it, expect } from "vitest";
import { estimateFence } from "../engine";
import { buildFenceGraph } from "../builder";
import { generateBom } from "../bom/index";
import { mergeEstimatorConfig } from "../config/resolveEstimatorConfig";
import { DEFAULT_ESTIMATOR_CONFIG } from "../config/defaults";
import type { FenceProjectInput, CommercialSummary } from "../types";

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

function smallInput(overrides: Partial<FenceProjectInput> = {}): FenceProjectInput {
  return makeInput({
    runs: [{ id: "r1", linearFeet: 15, startType: "end", endType: "end" }],
    ...overrides,
  });
}

// ═══════════════════════════════════════════════════════════════
// MINIMUM JOB CHARGE
// ═══════════════════════════════════════════════════════════════

describe("Minimum job charge", () => {
  it("estimate below minimum gets visible adjustment", () => {
    const config = mergeEstimatorConfig({
      pricing: { minimumJobCharge: 5000 },
    });
    const result = estimateFence(smallInput(), {
      laborRatePerHr: 65, wastePct: 0.05, priceMap: {},
      estimatorConfig: config,
    });

    const cs = result.commercialSummary!;
    expect(cs).toBeDefined();
    expect(cs.rawEstimatedCost).toBeLessThan(5000);
    expect(cs.commercialAdjustmentsSubtotal).toBeGreaterThan(0);
    expect(cs.finalQuotedTotal).toBe(5000);
    expect(result.totalCost).toBe(5000);

    // Audit trail should mention minimum
    expect(result.auditTrail.some(l => l.includes("Minimum job charge"))).toBe(true);
  });

  it("estimate above minimum gets no adjustment", () => {
    const config = mergeEstimatorConfig({
      pricing: { minimumJobCharge: 500 },
    });
    const result = estimateFence(makeInput(), {
      laborRatePerHr: 65, wastePct: 0.05, priceMap: {},
      estimatorConfig: config,
    });

    const cs = result.commercialSummary!;
    expect(cs.commercialAdjustmentsSubtotal).toBe(0);
    expect(cs.finalQuotedTotal).toBe(cs.rawEstimatedCost);
  });

  it("raw calculated total is preserved separately from final quoted total", () => {
    const config = mergeEstimatorConfig({
      pricing: { minimumJobCharge: 10000 },
    });
    const result = estimateFence(smallInput(), {
      laborRatePerHr: 65, wastePct: 0.05, priceMap: {},
      estimatorConfig: config,
    });

    const cs = result.commercialSummary!;
    // Raw cost should be the actual calculated cost
    expect(cs.rawEstimatedCost).toBeGreaterThan(0);
    expect(cs.rawEstimatedCost).toBeLessThan(10000);
    // Final should be the minimum
    expect(cs.finalQuotedTotal).toBe(10000);
    // Adjustment should bridge the gap
    expect(cs.commercialAdjustmentsSubtotal).toBe(10000 - cs.rawEstimatedCost);
  });

  it("disabled minimum (0) produces no adjustment", () => {
    const result = estimateFence(smallInput(), {
      laborRatePerHr: 65, wastePct: 0.05, priceMap: {},
    });
    const cs = result.commercialSummary!;
    expect(cs.commercialAdjustmentsSubtotal).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// REGIONAL PRICING
// ═══════════════════════════════════════════════════════════════

describe("Regional pricing", () => {
  it("base region preserves current output", () => {
    const baseResult = estimateFence(makeInput(), {
      laborRatePerHr: 65, wastePct: 0.05, priceMap: {},
    });
    const explicitBaseResult = estimateFence(makeInput(), {
      laborRatePerHr: 65, wastePct: 0.05, priceMap: {},
      estimatorConfig: mergeEstimatorConfig({ region: { key: "base", laborMultiplier: 1.0, materialMultiplier: 1.0 } }),
    });

    expect(baseResult.totalMaterialCost).toBe(explicitBaseResult.totalMaterialCost);
    expect(baseResult.totalLaborCost).toBe(explicitBaseResult.totalLaborCost);
  });

  it("non-base region key changes material pricing", () => {
    const baseResult = estimateFence(makeInput(), {
      laborRatePerHr: 65, wastePct: 0.05, priceMap: {},
    });
    const floridaResult = estimateFence(makeInput(), {
      laborRatePerHr: 65, wastePct: 0.05, priceMap: {},
      estimatorConfig: mergeEstimatorConfig({ region: { key: "florida" } }),
    });

    // Florida multiplier is 1.08 → material costs should be higher
    // (BOM generators now pass region key to mergePrices)
    expect(floridaResult.totalMaterialCost).toBeGreaterThan(baseResult.totalMaterialCost);
  });

  it("laborMultiplier affects labor cost but NOT hours", () => {
    const baseResult = estimateFence(makeInput(), {
      laborRatePerHr: 65, wastePct: 0.05, priceMap: {},
    });
    const expensiveLabor = estimateFence(makeInput(), {
      laborRatePerHr: 65, wastePct: 0.05, priceMap: {},
      estimatorConfig: mergeEstimatorConfig({ region: { laborMultiplier: 1.25 } }),
    });

    // Hours should be the same
    expect(expensiveLabor.totalLaborHrs).toBe(baseResult.totalLaborHrs);
    // Cost should be higher
    expect(expensiveLabor.totalLaborCost).toBeGreaterThan(baseResult.totalLaborCost);
    // Audit should mention the adjustment
    expect(expensiveLabor.auditTrail.some(l => l.includes("Regional labor"))).toBe(true);
  });

  it("materialMultiplier affects material cost but NOT quantities", () => {
    const baseResult = estimateFence(makeInput(), {
      laborRatePerHr: 65, wastePct: 0.05, priceMap: {},
    });
    const expensiveMat = estimateFence(makeInput(), {
      laborRatePerHr: 65, wastePct: 0.05, priceMap: {},
      estimatorConfig: mergeEstimatorConfig({ region: { materialMultiplier: 1.15 } }),
    });

    // BOM quantities should be identical
    const baseQtys = baseResult.bom.map(b => ({ sku: b.sku, qty: b.qty }));
    const expQtys = expensiveMat.bom.map(b => ({ sku: b.sku, qty: b.qty }));
    expect(expQtys).toEqual(baseQtys);

    // Material cost should be higher
    expect(expensiveMat.totalMaterialCost).toBeGreaterThan(baseResult.totalMaterialCost);
  });
});

// ═══════════════════════════════════════════════════════════════
// REGULATORY COSTS
// ═══════════════════════════════════════════════════════════════

describe("Regulatory costs", () => {
  it("provided permit/inspection/engineering/survey costs appear as BOM items", () => {
    const result = estimateFence(
      makeInput({
        permitCost: 150,
        inspectionCost: 75,
        engineeringCost: 350,
        surveyCost: 500,
      }),
      { laborRatePerHr: 65, wastePct: 0.05, priceMap: {} }
    );

    const permit = result.bom.find(b => b.sku === "REG_PERMIT");
    const inspection = result.bom.find(b => b.sku === "REG_INSPECTION");
    const engineering = result.bom.find(b => b.sku === "REG_ENGINEERING");
    const survey = result.bom.find(b => b.sku === "REG_SURVEY");

    expect(permit).toBeDefined();
    expect(permit!.extCost).toBe(150);
    expect(inspection).toBeDefined();
    expect(inspection!.extCost).toBe(75);
    expect(engineering).toBeDefined();
    expect(engineering!.extCost).toBe(350);
    expect(survey).toBeDefined();
    expect(survey!.extCost).toBe(500);

    // Regulatory subtotal in commercial summary
    expect(result.commercialSummary!.regulatoryCostSubtotal).toBe(150 + 75 + 350 + 500);
  });

  it("omitted regulatory fields produce no new BOM lines", () => {
    const result = estimateFence(makeInput(), {
      laborRatePerHr: 65, wastePct: 0.05, priceMap: {},
    });

    expect(result.bom.find(b => b.category === "regulatory")).toBeUndefined();
    expect(result.commercialSummary!.regulatoryCostSubtotal).toBe(0);
  });

  it("zero-value regulatory fields produce no new BOM lines", () => {
    const result = estimateFence(
      makeInput({ permitCost: 0, inspectionCost: 0 }),
      { laborRatePerHr: 65, wastePct: 0.05, priceMap: {} }
    );

    expect(result.bom.find(b => b.category === "regulatory")).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════
// PROFITABILITY SUMMARY
// ═══════════════════════════════════════════════════════════════

describe("Profitability summary", () => {
  it("subtotals sum correctly into rawEstimatedCost", () => {
    const result = estimateFence(makeInput(), {
      laborRatePerHr: 65, wastePct: 0.05, priceMap: {},
    });

    const cs = result.commercialSummary!;
    const subtotalSum = cs.materialCostSubtotal
      + cs.laborCostSubtotal
      + cs.equipmentCostSubtotal
      + cs.logisticsCostSubtotal
      + cs.disposalCostSubtotal
      + cs.regulatoryCostSubtotal;

    expect(cs.rawEstimatedCost).toBe(Math.round(subtotalSum));
  });

  it("markup scenario totals are within rounding tolerance", () => {
    const result = estimateFence(makeInput(), {
      laborRatePerHr: 65, wastePct: 0.05, priceMap: {},
    });

    const cs = result.commercialSummary!;
    // Allow +-1 rounding difference since rawEstimatedCost is pre-rounded
    expect(Math.abs(cs.quotedAt20Pct - Math.round(cs.rawEstimatedCost * 1.20))).toBeLessThanOrEqual(1);
    expect(Math.abs(cs.quotedAt30Pct - Math.round(cs.rawEstimatedCost * 1.30))).toBeLessThanOrEqual(1);
    expect(Math.abs(cs.quotedAt40Pct - Math.round(cs.rawEstimatedCost * 1.40))).toBeLessThanOrEqual(1);
    // Verify they're in the right ballpark
    expect(cs.quotedAt20Pct).toBeGreaterThan(cs.rawEstimatedCost);
    expect(cs.quotedAt30Pct).toBeGreaterThan(cs.quotedAt20Pct);
    expect(cs.quotedAt40Pct).toBeGreaterThan(cs.quotedAt30Pct);
  });

  it("gross profit calculations are correct", () => {
    const result = estimateFence(makeInput(), {
      laborRatePerHr: 65, wastePct: 0.05, priceMap: {},
    });

    const cs = result.commercialSummary!;
    expect(cs.grossProfitAt20Pct).toBe(cs.quotedAt20Pct - cs.rawEstimatedCost);
    expect(cs.grossProfitAt30Pct).toBe(cs.quotedAt30Pct - cs.rawEstimatedCost);
    expect(cs.grossProfitAt40Pct).toBe(cs.quotedAt40Pct - cs.rawEstimatedCost);
  });

  it("commercialSummary is always present", () => {
    const result = estimateFence(makeInput(), 65);
    expect(result.commercialSummary).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════
// GENERAL REGRESSIONS
// ═══════════════════════════════════════════════════════════════

describe("No regressions with commercialization", () => {
  const fenceTypes = [
    { type: "vinyl" as const, product: "vinyl_privacy_6ft", post: "5x5" as const },
    { type: "wood" as const, product: "wood_privacy_6ft", post: "4x4" as const },
    { type: "chain_link" as const, product: "chain_link_6ft", post: "2in" as any },
    { type: "aluminum" as const, product: "aluminum_6ft", post: "4x4" as const },
  ];

  for (const { type, product, post } of fenceTypes) {
    it(`${type}: no NaN or negative values`, () => {
      const result = estimateFence(
        makeInput({ productLineId: product, postSize: post }),
        { fenceType: type, laborRatePerHr: 65, wastePct: 0.05, priceMap: {} }
      );

      expect(Number.isFinite(result.totalCost)).toBe(true);
      expect(result.totalCost).toBeGreaterThan(0);
      expect(result.commercialSummary).toBeDefined();
      expect(Number.isFinite(result.commercialSummary!.rawEstimatedCost)).toBe(true);
    });
  }

  it("backward compat: old-style call without config works", () => {
    const result = estimateFence(makeInput(), 65);
    expect(result.totalCost).toBeGreaterThan(0);
    expect(result.commercialSummary).toBeDefined();
  });

  it("backward compat: no regulatory costs, no min charge → same total as raw", () => {
    const result = estimateFence(makeInput(), {
      laborRatePerHr: 65, wastePct: 0.05, priceMap: {},
    });
    const cs = result.commercialSummary!;
    expect(cs.commercialAdjustmentsSubtotal).toBe(0);
    expect(cs.finalQuotedTotal).toBe(cs.rawEstimatedCost);
  });
});
