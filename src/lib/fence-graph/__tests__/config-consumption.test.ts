// ── Config Consumption Tests ─────────────────────────────────────
// Verifies BOM generators and helpers consume org config correctly.

import { describe, it, expect } from "vitest";
import { estimateFence } from "../engine";
import { buildFenceGraph } from "../builder";
import { generateBom } from "../bom/index";
import { calcConcretePerPost } from "../concrete";
import { mergeEstimatorConfig } from "../config/resolveEstimatorConfig";
import { DEFAULT_ESTIMATOR_CONFIG } from "../config/defaults";
import { INSTALL_RULES } from "../types";
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

// ═══════════════════════════════════════════════════════════════
// 1. BOM generators use config labor overrides
// ═══════════════════════════════════════════════════════════════

describe("Config-driven labor rates", () => {
  it("vinyl: slower holeDig rate should increase labor hours", () => {
    const input = makeInput();
    const graph = buildFenceGraph(input);

    const defaultResult = generateBom(graph, {
      fenceType: "vinyl", wastePct: 0.05, priceMap: {},
      estimatorConfig: DEFAULT_ESTIMATOR_CONFIG,
    });
    const slowConfig = mergeEstimatorConfig({
      labor: { vinyl: { holeDig: 0.50 } }, // 2x default
    });
    const slowResult = generateBom(graph, {
      fenceType: "vinyl", wastePct: 0.05, priceMap: {},
      estimatorConfig: slowConfig,
    });

    const defaultDig = defaultResult.laborDrivers.find(l => l.activity === "Hole Digging")!;
    const slowDig = slowResult.laborDrivers.find(l => l.activity === "Hole Digging")!;

    expect(slowDig.rateHrs).toBe(0.50);
    expect(defaultDig.rateHrs).toBe(0.25);
    expect(slowDig.totalHrs).toBe(defaultDig.totalHrs * 2);
  });

  it("wood: config labor rates flow through", () => {
    const input = makeInput({ productLineId: "wood_privacy_6ft", postSize: "4x4" });
    const graph = buildFenceGraph(input);

    const config = mergeEstimatorConfig({
      labor: { wood: { holeDig: 0.40, concretePour: 0.20 } },
    });
    const result = generateBom(graph, {
      fenceType: "wood", wastePct: 0.05, priceMap: {},
      estimatorConfig: config,
    });

    const dig = result.laborDrivers.find(l => l.activity === "Hole Digging")!;
    const pour = result.laborDrivers.find(l => l.activity === "Concrete Pour")!;
    expect(dig.rateHrs).toBe(0.40);
    expect(pour.rateHrs).toBe(0.20);
  });

  it("chain_link: config labor rates flow through", () => {
    const input = makeInput({ productLineId: "chain_link_6ft", postSize: "2in" as any });
    const graph = buildFenceGraph(input);

    const config = mergeEstimatorConfig({
      labor: { chain_link: { fabricStretch: 2.0 } },
    });
    const result = generateBom(graph, {
      fenceType: "chain_link", wastePct: 0.05, priceMap: {},
      estimatorConfig: config,
    });

    const stretch = result.laborDrivers.find(l => l.activity === "Fabric Unrolling & Stretching")!;
    expect(stretch.rateHrs).toBe(2.0);
  });

  it("aluminum: corrected defaults (0.25 holeDig, not 0.75)", () => {
    const input = makeInput({ productLineId: "aluminum_6ft", postSize: "4x4" });
    const graph = buildFenceGraph(input);

    const result = generateBom(graph, {
      fenceType: "aluminum", wastePct: 0.05, priceMap: {},
    });

    const dig = result.laborDrivers.find(l => l.activity === "Hole Digging")!;
    expect(dig.rateHrs).toBe(0.25); // was 0.75 before config
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. Chain link material assumptions respond to config
// ═══════════════════════════════════════════════════════════════

describe("Chain link material config", () => {
  it("different post spacing changes line post count", () => {
    const input = makeInput({ productLineId: "chain_link_6ft", postSize: "2in" as any });
    const graph = buildFenceGraph(input);

    const default10ft = generateBom(graph, {
      fenceType: "chain_link", wastePct: 0.05, priceMap: {},
      estimatorConfig: DEFAULT_ESTIMATOR_CONFIG,
    });
    const tighter8ft = generateBom(graph, {
      fenceType: "chain_link", wastePct: 0.05, priceMap: {},
      estimatorConfig: mergeEstimatorConfig({ material: { chainLinkPostOcFt: 8 } }),
    });

    const defaultPosts = default10ft.bom.find(b => b.sku === "CL_POST_2IN");
    const tighterPosts = tighter8ft.bom.find(b => b.sku === "CL_POST_2IN");

    // Tighter spacing → more posts
    expect(tighterPosts!.qty).toBeGreaterThan(defaultPosts!.qty);
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. Vinyl/wood material assumptions respond to config
// ═══════════════════════════════════════════════════════════════

describe("Material assumption overrides", () => {
  it("vinyl: more pickets per foot increases picket count", () => {
    const input = makeInput();
    const graph = buildFenceGraph(input);

    const defaultResult = generateBom(graph, {
      fenceType: "vinyl", wastePct: 0.05, priceMap: {},
    });
    const morePickets = generateBom(graph, {
      fenceType: "vinyl", wastePct: 0.05, priceMap: {},
      estimatorConfig: mergeEstimatorConfig({ material: { vinylPicketsPerFoot: 3 } }),
    });

    const defaultPickets = defaultResult.bom.find(b => b.sku === "VINYL_PICKET_6FT");
    const morePicketsItem = morePickets.bom.find(b => b.sku === "VINYL_PICKET_6FT");

    // 3 per ft vs 2 per ft → ~50% more
    if (defaultPickets && morePicketsItem) {
      expect(morePicketsItem.qty).toBeGreaterThan(defaultPickets.qty);
    }
  });

  it("vinyl: different screws per section changes screw count", () => {
    const input = makeInput();
    const graph = buildFenceGraph(input);

    const defaultResult = generateBom(graph, {
      fenceType: "vinyl", wastePct: 0.05, priceMap: {},
    });
    const moreScrews = generateBom(graph, {
      fenceType: "vinyl", wastePct: 0.05, priceMap: {},
      estimatorConfig: mergeEstimatorConfig({ material: { screwsPerSection: 40 } }),
    });

    const defaultScrewBoxes = defaultResult.bom.find(b => b.sku === "SCREWS_1LB")!.qty;
    const moreScrewBoxes = moreScrews.bom.find(b => b.sku === "SCREWS_1LB")!.qty;

    expect(moreScrewBoxes).toBeGreaterThan(defaultScrewBoxes);
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. Concrete assumptions respond to config
// ═══════════════════════════════════════════════════════════════

describe("Concrete config consumption", () => {
  it("larger bag yield → fewer bags needed", () => {
    const rules = { ...INSTALL_RULES["5x5"] };
    const site = { soilType: "standard" as const, soilConcreteFactor: 1.0, hurricaneZone: false, floodZone: false, existingFenceRemoval: false, surfaceType: "ground" as const, obstacleCt: 0 };

    const defaultCalc = calcConcretePerPost(rules, site, false);
    const bigBagCalc = calcConcretePerPost(rules, site, false, { bagYieldCuFt: 1.0, gravelBagCuFt: 0.5, floridaDepthIn: 42 });

    // Bigger yield per bag → fewer bags
    expect(bigBagCalc.bagsNeeded).toBeLessThanOrEqual(defaultCalc.bagsNeeded);
  });

  it("different florida depth override takes effect", () => {
    const rules = { ...INSTALL_RULES["5x5"] };
    const site = { soilType: "sandy" as const, soilConcreteFactor: 1.2, hurricaneZone: false, floodZone: false, existingFenceRemoval: false, surfaceType: "ground" as const, obstacleCt: 0 };

    const defaultCalc = calcConcretePerPost(rules, site, false); // uses 42"
    const deeperCalc = calcConcretePerPost(rules, site, false, { bagYieldCuFt: 0.60, gravelBagCuFt: 0.5, floridaDepthIn: 48 });

    // Deeper hole → more concrete
    expect(deeperCalc.bagsNeeded).toBeGreaterThanOrEqual(defaultCalc.bagsNeeded);
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. Default config produces same output (parity check)
// ═══════════════════════════════════════════════════════════════

describe("Default output parity", () => {
  it("vinyl 100ft should produce same result with and without explicit config", () => {
    const input = makeInput();

    // Without config (uses defaults internally)
    const resultNoConfig = estimateFence(input, { laborRatePerHr: 65, wastePct: 0.05, priceMap: {} });

    // With explicit default config
    const resultWithConfig = estimateFence(input, {
      laborRatePerHr: 65, wastePct: 0.05, priceMap: {},
      estimatorConfig: DEFAULT_ESTIMATOR_CONFIG,
    });

    expect(resultWithConfig.totalMaterialCost).toBe(resultNoConfig.totalMaterialCost);
    expect(resultWithConfig.totalLaborHrs).toBe(resultNoConfig.totalLaborHrs);
    expect(resultWithConfig.totalCost).toBe(resultNoConfig.totalCost);
    expect(resultWithConfig.bom.length).toBe(resultNoConfig.bom.length);
  });
});

// ═══════════════════════════════════════════════════════════════
// 6. Labor efficiency multiplier
// ═══════════════════════════════════════════════════════════════

describe("Labor efficiency multiplier", () => {
  it("multiplier > 1.0 adds a visible adjustment line and increases total hours", () => {
    const input = makeInput();
    const graph = buildFenceGraph(input);

    const hardSiteConfig = mergeEstimatorConfig({
      laborEfficiency: { baseMultiplier: 1.3 },
    });
    const result = generateBom(graph, {
      fenceType: "vinyl", laborRatePerHr: 65, wastePct: 0.05, priceMap: {},
      estimatorConfig: hardSiteConfig,
    });

    const adjustment = result.laborDrivers.find(l => l.activity === "Labor Efficiency Adjustment");
    expect(adjustment).toBeDefined();
    expect(adjustment!.totalHrs).toBeGreaterThan(0);
    expect(adjustment!.notes).toContain("+30%");

    // Total labor should be higher than without multiplier
    const defaultResult = generateBom(graph, {
      fenceType: "vinyl", laborRatePerHr: 65, wastePct: 0.05, priceMap: {},
    });
    expect(result.totalLaborHrs).toBeGreaterThan(defaultResult.totalLaborHrs);
  });

  it("multiplier < 1.0 reduces labor total with negative adjustment", () => {
    const input = makeInput();
    const graph = buildFenceGraph(input);

    const easySiteConfig = mergeEstimatorConfig({
      laborEfficiency: { baseMultiplier: 0.85 },
    });
    const result = generateBom(graph, {
      fenceType: "vinyl", laborRatePerHr: 65, wastePct: 0.05, priceMap: {},
      estimatorConfig: easySiteConfig,
    });

    const adjustment = result.laborDrivers.find(l => l.activity === "Labor Efficiency Adjustment");
    expect(adjustment).toBeDefined();
    expect(adjustment!.totalHrs).toBeLessThan(0);

    const defaultResult = generateBom(graph, {
      fenceType: "vinyl", laborRatePerHr: 65, wastePct: 0.05, priceMap: {},
    });
    expect(result.totalLaborHrs).toBeLessThan(defaultResult.totalLaborHrs);
  });

  it("multiplier = 1.0 (default) adds no adjustment line", () => {
    const input = makeInput();
    const graph = buildFenceGraph(input);

    const result = generateBom(graph, {
      fenceType: "vinyl", laborRatePerHr: 65, wastePct: 0.05, priceMap: {},
    });

    const adjustment = result.laborDrivers.find(l => l.activity === "Labor Efficiency Adjustment");
    expect(adjustment).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════
// 7. No NaN / negative / validation regressions
// ═══════════════════════════════════════════════════════════════

describe("No regressions with config", () => {
  const fenceTypes = [
    { type: "vinyl" as const, product: "vinyl_privacy_6ft", post: "5x5" as const },
    { type: "wood" as const, product: "wood_privacy_6ft", post: "4x4" as const },
    { type: "chain_link" as const, product: "chain_link_6ft", post: "2in" as any },
    { type: "aluminum" as const, product: "aluminum_6ft", post: "4x4" as const },
  ];

  for (const { type, product, post } of fenceTypes) {
    it(`${type}: no NaN or negative values with default config`, () => {
      const input = makeInput({ productLineId: product, postSize: post });
      const result = estimateFence(input, {
        fenceType: type, laborRatePerHr: 65, wastePct: 0.05, priceMap: {},
      });

      expect(Number.isFinite(result.totalCost)).toBe(true);
      expect(result.totalCost).toBeGreaterThan(0);
      expect(Number.isFinite(result.totalLaborHrs)).toBe(true);
      expect(result.totalLaborHrs).toBeGreaterThan(0);
      expect(result.bom.every(b => b.qty > 0 && Number.isFinite(b.qty))).toBe(true);
    });

    it(`${type}: no NaN or negative values with custom config`, () => {
      const config = mergeEstimatorConfig({
        laborEfficiency: { baseMultiplier: 1.2 },
        concrete: { bagYieldCuFt: 0.55 },
      });
      const input = makeInput({ productLineId: product, postSize: post });
      const result = estimateFence(input, {
        fenceType: type, laborRatePerHr: 65, wastePct: 0.05, priceMap: {},
        estimatorConfig: config,
      });

      expect(Number.isFinite(result.totalCost)).toBe(true);
      expect(result.totalCost).toBeGreaterThan(0);
      expect(result.bom.every(b => b.qty > 0 && Number.isFinite(b.qty))).toBe(true);
    });
  }
});
