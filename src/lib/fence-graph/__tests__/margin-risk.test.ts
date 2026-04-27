import { describe, expect, it } from "vitest";
import { estimateFence } from "../engine";
import { assessEstimateMarginRisk, grossMarginPctFromMarkup } from "../risk";
import type { FenceProjectInput } from "../types";

function baseInput(overrides: Partial<FenceProjectInput> = {}): FenceProjectInput {
  return {
    projectName: "Margin Risk Test",
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

describe("margin risk hardening", () => {
  it("converts markup into gross margin correctly", () => {
    expect(grossMarginPctFromMarkup(35)).toBe(25.9);
    expect(grossMarginPctFromMarkup(100)).toBe(50);
  });

  it("blocks when margin falls below the hard safety floor", () => {
    const result = estimateFence(
      baseInput({
        siteComplexity: {
          access_difficulty: 5,
          obstacles: 5,
          ground_hardness: 4,
          demo_required: false,
          permit_complexity: 3,
        },
      }),
      { fenceType: "vinyl", laborRatePerHr: 65, wastePct: 0.05, priceMap: {} }
    );

    const risk = assessEstimateMarginRisk({
      result,
      markupPct: 15,
      targetMarginPct: 35,
    });

    expect(risk.status).toBe("blocked");
    expect(risk.reasons[0]).toMatch(/hard safety floor/i);
  });

  it("surfaces risky status when markup clears the floor but misses target", () => {
    const result = estimateFence(baseInput(), {
      fenceType: "vinyl",
      laborRatePerHr: 65,
      wastePct: 0.05,
      priceMap: {},
    });

    const risk = assessEstimateMarginRisk({
      result,
      markupPct: 35,
      targetMarginPct: 35,
    });

    expect(risk.status).toBe("risky");
    expect(risk.recommendedMarkupPct).toBeGreaterThan(35);
  });
});
