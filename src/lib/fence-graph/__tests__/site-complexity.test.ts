import { describe, expect, it } from "vitest";
import { estimateFence } from "../engine";
import type { FenceProjectInput } from "../types";

function baseInput(overrides: Partial<FenceProjectInput> = {}): FenceProjectInput {
  return {
    projectName: "Complexity Test",
    productLineId: "vinyl_privacy_6ft",
    fenceHeight: 6,
    postSize: "5x5",
    soilType: "standard",
    windMode: false,
    runs: [{ id: "r1", linearFeet: 120, startType: "end", endType: "end", slopeDeg: 0 }],
    gates: [],
    ...overrides,
  };
}

describe("site complexity integration", () => {
  it("adds labor for difficult sites without changing the global config", () => {
    const easy = estimateFence(
      baseInput({
        siteComplexity: {
          access_difficulty: 2,
          obstacles: 2,
          ground_hardness: 2,
          demo_required: false,
          permit_complexity: 1,
        },
      }),
      { fenceType: "vinyl", laborRatePerHr: 65, wastePct: 0.05, priceMap: {} }
    );

    const hard = estimateFence(
      baseInput({
        siteComplexity: {
          access_difficulty: 5,
          obstacles: 5,
          ground_hardness: 5,
          demo_required: false,
          permit_complexity: 4,
        },
      }),
      { fenceType: "vinyl", laborRatePerHr: 65, wastePct: 0.05, priceMap: {} }
    );

    expect(hard.totalLaborHrs).toBeGreaterThan(easy.totalLaborHrs);
    expect(hard.laborDrivers.some((driver) => driver.activity === "Site Complexity Adjustment")).toBe(true);
  });

  it("reduces confidence when site complexity and key scope details are missing", () => {
    const lowConfidence = estimateFence(
      baseInput({
        existingFenceRemoval: true,
        runs: [{ id: "r1", linearFeet: 120, startType: "corner", endType: "corner", slopeDeg: 16 }],
      }),
      { fenceType: "vinyl", laborRatePerHr: 65, wastePct: 0.05, priceMap: {} }
    );

    const higherConfidence = estimateFence(
      baseInput({
        existingFenceRemoval: true,
        siteComplexity: {
          access_difficulty: 3,
          obstacles: 3,
          ground_hardness: 3,
          demo_required: true,
          permit_complexity: 2,
        },
        runs: [{
          id: "r1",
          linearFeet: 120,
          startType: "corner",
          endType: "corner",
          cornerAngle: 90,
          slopeDeg: 16,
          slopeMethod: "racked",
        }],
      }),
      { fenceType: "vinyl", laborRatePerHr: 65, wastePct: 0.05, priceMap: {} }
    );

    expect(lowConfidence.overallConfidence).toBeLessThan(higherConfidence.overallConfidence);
    expect(lowConfidence.confidenceNotes?.some((note) => note.includes("No site complexity assessment"))).toBe(true);
  });

  it("uses learned adaptive multipliers for the matching fence-type complexity band", () => {
    const base = estimateFence(
      baseInput({
        siteComplexity: {
          access_difficulty: 5,
          obstacles: 5,
          ground_hardness: 4,
          demo_required: false,
          permit_complexity: 2,
        },
      }),
      { fenceType: "vinyl", laborRatePerHr: 65, wastePct: 0.05, priceMap: {} }
    );

    const learned = estimateFence(
      baseInput({
        siteComplexity: {
          access_difficulty: 5,
          obstacles: 5,
          ground_hardness: 4,
          demo_required: false,
          permit_complexity: 2,
        },
      }),
      {
        fenceType: "vinyl",
        laborRatePerHr: 65,
        wastePct: 0.05,
        priceMap: {},
        estimatorConfig: {
          adaptiveLabor: {
            byFenceType: {
              vinyl: {
                difficult: {
                  multiplier: 1.1,
                  sampleCount: 3,
                },
              },
            },
          },
        },
      }
    );

    expect(learned.totalLaborHrs).toBeGreaterThan(base.totalLaborHrs);
    expect(learned.laborDrivers.some((driver) => driver.activity === "Adaptive Pattern Adjustment")).toBe(true);
  });

  it("adds labor-model review blockers when a difficult site has little learned history", () => {
    const result = estimateFence(
      baseInput({
        siteComplexity: {
          access_difficulty: 5,
          obstacles: 5,
          ground_hardness: 5,
          demo_required: false,
          permit_complexity: 4,
        },
      }),
      { fenceType: "vinyl", laborRatePerHr: 65, wastePct: 0.05, priceMap: {} }
    );

    expect(result.laborModelHealth?.calibrationConfidence).toBe("low");
    expect(
      result.confidenceReviewGates?.some((gate) => gate.id === "labor-calibration-thin-difficult")
    ).toBe(true);
  });
});
