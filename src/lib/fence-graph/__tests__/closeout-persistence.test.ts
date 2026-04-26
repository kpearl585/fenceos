import { describe, expect, it } from "vitest";
import { estimateFence } from "../engine";
import { buildFenceGraphCloseoutPersistence, normalizeCloseoutActuals } from "../closeout/persistence";
import type { FenceProjectInput } from "../types";

function makeInput(overrides: Partial<FenceProjectInput> = {}): FenceProjectInput {
  return {
    projectName: "Persistence Test",
    productLineId: "vinyl_privacy_6ft",
    fenceHeight: 6,
    postSize: "5x5",
    soilType: "standard",
    windMode: false,
    runs: [{ id: "r1", linearFeet: 120, startType: "end", endType: "end" }],
    gates: [],
    ...overrides,
  };
}

function getEstimate() {
  return estimateFence(makeInput(), { laborRatePerHr: 65, wastePct: 0.05, priceMap: {} });
}

describe("closeout persistence helpers", () => {
  it("normalizes optional closeout fields into analysis actuals", () => {
    const actuals = normalizeCloseoutActuals({
      actualWastePct: 9,
      notes: "  Tight rear access  ",
      actualMaterialCost: 3250,
      actualLaborHours: 18.5,
      actualLaborCost: 1200,
      actualTotalCost: 4700,
      actualEquipmentCost: 100,
      actualConcreteBags: 14,
      hiddenCostNotes: [" extra tear-out ", "", "hand carry"],
      fieldConditions: {
        rock: true,
        accessIssues: true,
      },
    });

    expect(actuals.actualFinalJobCost).toBe(4700);
    expect(actuals.hiddenCostNotes).toEqual(["extra tear-out", "hand carry"]);
    expect(actuals.notes).toBe("Tight rear access");
    expect(actuals.fieldConditions?.rock).toBe(true);
    expect(actuals.fieldConditions?.accessIssues).toBe(true);
  });

  it("builds fence_graph closeout update payload with scalar columns and json snapshots", () => {
    const estimate = getEstimate();
    const closedAt = "2026-04-25T12:00:00.000Z";

    const { analysis, update } = buildFenceGraphCloseoutPersistence(
      estimate,
      {
        actualWastePct: 8,
        notes: "Needed extra root cutting",
        actualMaterialCost: estimate.totalMaterialCost + 150,
        actualLaborHours: estimate.totalLaborHrs + 2,
        actualLaborCost: estimate.totalLaborCost + 180,
        actualTotalCost: estimate.totalCost + 400,
        actualEquipmentCost: 90,
        actualLogisticsCost: 40,
        actualConcreteBags: 16,
        hiddenCostNotes: ["extra tear-out"],
        fieldConditions: { roots: true },
      },
      closedAt,
    );

    expect(update.closed_at).toBe(closedAt);
    expect(update.closeout_actual_waste_pct).toBe(0.08);
    expect(update.closeout_actual_material_cost).toBe(estimate.totalMaterialCost + 150);
    expect(update.closeout_actual_labor_hours).toBe(estimate.totalLaborHrs + 2);
    expect(update.closeout_actuals_json).toBeDefined();
    expect(update.closeout_analysis_json).toBeDefined();
    expect(analysis.learningSummary.whatToReviewNextTime.length).toBeGreaterThan(0);
  });
});
