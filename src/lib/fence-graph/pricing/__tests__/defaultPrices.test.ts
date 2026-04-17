import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRICES_BASE,
  getPriceMap,
  mergePrices,
  getPrice,
} from "../defaultPrices";

/**
 * Locks in the fallback-precedence contract surfaced in the 2026-04-17
 * estimator UX audit:
 *
 *   1. org custom price (from materials table)
 *   2. built-in default price (this module)
 *   3. only then zero / undefined if the SKU is genuinely unknown
 *
 * The engine relies on mergePrices() to do this layering before running
 * a BOM. If the precedence regresses, first-run estimates go back to
 * showing $0 totals — the exact trap the audit flagged.
 */

describe("default prices fallback precedence", () => {
  it("returns the built-in default when the user hasn't set a price", () => {
    // Empty user price map: every SKU should resolve to a non-zero value
    // close to the DEFAULT (getPriceMap rounds to nearest $0.25). Checking
    // presence + reasonable proximity — not bit-exact — because the
    // rounding behavior is intentional for "realistic pricing."
    const merged = mergePrices({}, "base");
    for (const sku of Object.keys(DEFAULT_PRICES_BASE)) {
      const base = DEFAULT_PRICES_BASE[sku];
      expect(merged[sku], `SKU ${sku} must be present in merged map`).toBeGreaterThan(0);
      expect(
        Math.abs(merged[sku] - base),
        `SKU ${sku} rounded value should be within 25¢ of its base`,
      ).toBeLessThanOrEqual(0.25);
    }
  });

  it("org custom price overrides the built-in default", () => {
    // User set a wildly different price for vinyl 6ft panel — must win.
    const userPrices = { VINYL_PANEL_6FT: 999.99 };
    const merged = mergePrices(userPrices, "base");
    expect(merged.VINYL_PANEL_6FT).toBe(999.99);
    // Other SKUs should still inherit defaults unchanged.
    expect(merged.VINYL_PANEL_8FT).toBe(DEFAULT_PRICES_BASE.VINYL_PANEL_8FT);
  });

  it("getPrice() prefers the user price, falls back to default, then undefined", () => {
    // Known SKU, user hasn't set it → default.
    expect(getPrice("VINYL_POST_5X5", {}, "base")).toBe(
      DEFAULT_PRICES_BASE.VINYL_POST_5X5,
    );

    // Known SKU, user overrode it → user wins.
    expect(getPrice("VINYL_POST_5X5", { VINYL_POST_5X5: 50 }, "base")).toBe(50);

    // Genuinely unknown SKU → undefined (tells the engine it lacks data).
    expect(getPrice("DOES_NOT_EXIST_SKU", {}, "base")).toBeUndefined();
  });

  it("regional multipliers adjust defaults while preserving user overrides", () => {
    // West region is +28%; users still override.
    const westMap = getPriceMap("west");
    expect(westMap.VINYL_PANEL_6FT).toBeGreaterThan(
      DEFAULT_PRICES_BASE.VINYL_PANEL_6FT,
    );

    const userPrices = { VINYL_PANEL_6FT: 100 };
    const merged = mergePrices(userPrices, "west");
    expect(merged.VINYL_PANEL_6FT).toBe(100);
  });

  it("first-run user (empty prices) gets non-zero totals for every core SKU", () => {
    // Audit guard: the reason the $0 bug existed was that SOMEONE had
    // changed the flow so defaults didn't layer in. Keep this test as
    // a canary — if it fails, the estimator has regressed to the
    // first-estimate-trap state.
    const merged = mergePrices({}, "base");
    const coreSkus = [
      "VINYL_POST_5X5", "VINYL_PANEL_6FT",
      "WOOD_POST_4X4_8", "WOOD_PICKET_6FT",
      "CL_POST_2IN", "CL_FABRIC_6FT",
      "ALUMINUM_POST_4IN",
    ];
    for (const sku of coreSkus) {
      expect(merged[sku], `SKU ${sku} must have a non-zero default`).toBeGreaterThan(0);
    }
  });
});
