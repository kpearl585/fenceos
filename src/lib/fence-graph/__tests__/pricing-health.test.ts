import { describe, expect, it } from "vitest";
import { estimateFence, type MaterialPriceMeta } from "../engine";
import type { FenceProjectInput } from "../types";

function baseInput(overrides: Partial<FenceProjectInput> = {}): FenceProjectInput {
  return {
    projectName: "Pricing Health Test",
    productLineId: "vinyl_privacy_6ft",
    fenceHeight: 6,
    postSize: "5x5",
    soilType: "standard",
    windMode: false,
    runs: [{ id: "r1", linearFeet: 96, startType: "end", endType: "end", slopeDeg: 0 }],
    gates: [],
    ...overrides,
  };
}

const fullVinylPriceMap: Record<string, number> = {
  VINYL_POST_5X5: 34,
  VINYL_POST_CAP: 5,
  POST_SLEEVE_5X5: 16,
  VINYL_PICKET_6FT: 7.5,
  VINYL_U_CHANNEL_8FT: 14,
  VINYL_RAIL_8FT: 18,
  CONCRETE_80LB: 7,
  GRAVEL_40LB: 5,
};

function buildMeta(updatedAt: string): Record<string, MaterialPriceMeta> {
  return Object.fromEntries(
    Object.keys(fullVinylPriceMap).map((sku) => [sku, { updatedAt }])
  );
}

describe("pricing health hardening", () => {
  it("blocks sendable quotes when the estimate is still relying on fallback pricing", () => {
    const result = estimateFence(baseInput(), {
      fenceType: "vinyl",
      laborRatePerHr: 65,
      wastePct: 0.05,
      priceMap: fullVinylPriceMap,
    });

    expect(result.pricingHealth?.freshCoveragePct).toBe(0);
    expect(
      result.confidenceReviewGates?.some((gate) => gate.id === "pricing-fresh-coverage")
    ).toBe(true);
  });

  it("clears pricing blockers when material spend is backed by fresh supplier pricing", () => {
    const result = estimateFence(baseInput(), {
      fenceType: "vinyl",
      laborRatePerHr: 65,
      wastePct: 0.05,
      priceMap: fullVinylPriceMap,
      priceMeta: buildMeta(new Date().toISOString()),
    });

    expect(result.pricingHealth?.freshCoveragePct).toBeGreaterThan(0.95);
    expect(
      result.confidenceReviewGates?.some((gate) => gate.id === "pricing-fresh-coverage")
    ).toBe(false);
    expect(
      result.confidenceReviewGates?.some((gate) => gate.id === "pricing-stale-cost-share")
    ).toBe(false);
  });

  it("blocks sendable quotes when supplier prices are stale", () => {
    const oldDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
    const result = estimateFence(baseInput(), {
      fenceType: "vinyl",
      laborRatePerHr: 65,
      wastePct: 0.05,
      priceMap: fullVinylPriceMap,
      priceMeta: buildMeta(oldDate),
    });

    expect(result.pricingHealth?.staleCoveragePct).toBeGreaterThan(0.2);
    expect(
      result.confidenceReviewGates?.some((gate) => gate.id === "pricing-stale-cost-share")
    ).toBe(true);
  });
});
