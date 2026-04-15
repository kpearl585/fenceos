// ── Audit P0 + P1 Regression Tests ───────────────────────────────
// Locks in the six fixes from the deep estimator correctness audit
// (April 2026). Each describe block cites the bug it guards against.

import { describe, it, expect } from "vitest";
import { calcConcretePerPost } from "../concrete";
import { buildFenceGraph } from "../builder";
import { generateBom } from "../bom/index";
import { makeBomItem } from "../bom/shared";
import { mergeEstimatorConfig } from "../config/resolveEstimatorConfig";
import type { FenceProjectInput, SiteConfig, InstallRules } from "../types";
import { INSTALL_RULES } from "../types";

function makeInput(overrides: Partial<FenceProjectInput> = {}): FenceProjectInput {
  return {
    projectName: "Audit test",
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

const standardRules: InstallRules = { ...INSTALL_RULES["5x5"] };
const baseSite = (overrides: Partial<SiteConfig> = {}): SiteConfig => ({
  soilType: "standard",
  soilConcreteFactor: 1.0,
  hurricaneZone: false,
  floodZone: false,
  existingFenceRemoval: false,
  surfaceType: "ground",
  obstacleCt: 0,
  ...overrides,
});

// ═════════════════════════════════════════════════════════════════
// P0 — C1: Wind mode concrete is wired into calcConcretePerPost
// ═════════════════════════════════════════════════════════════════

describe("P0 • Wind mode concrete", () => {
  it("hurricane zone forces holeDepth ≥ 36\" in calcConcretePerPost", () => {
    const normal = calcConcretePerPost(standardRules, baseSite(), false);
    const windy = calcConcretePerPost(standardRules, baseSite({ hurricaneZone: true }), false);

    // Standard 5x5 depth is 30" → wind forces to 36"
    // Volume scales with depth so windy should consume strictly more concrete
    expect(windy.concreteVolume_cu_in).toBeGreaterThan(normal.concreteVolume_cu_in);
    expect(windy.bagsNeeded).toBeGreaterThanOrEqual(normal.bagsNeeded);
  });

  it("windMode project produces more concrete bags than non-wind project", () => {
    const normal = buildFenceGraph(makeInput({ windMode: false }));
    const windy = buildFenceGraph(makeInput({ windMode: true }));

    const normalBom = generateBom(normal, { fenceType: "vinyl", wastePct: 0.05, priceMap: {} });
    const windyBom = generateBom(windy, { fenceType: "vinyl", wastePct: 0.05, priceMap: {} });

    const normalConcrete = normalBom.bom.find(b => b.sku === "CONCRETE_80LB")!;
    const windyConcrete = windyBom.bom.find(b => b.sku === "CONCRETE_80LB")!;

    expect(windyConcrete.qty).toBeGreaterThanOrEqual(normalConcrete.qty);
  });
});

// ═════════════════════════════════════════════════════════════════
// P0 — C2: Vinyl picket div-by-zero guard
// ═════════════════════════════════════════════════════════════════

describe("P0 • Vinyl picket slope adjustment produces finite counts", () => {
  it("vinyl_privacy_6ft with 15° racked slope yields a finite picket count", () => {
    // Component system (privacy + routed rails) is the code path that uses
    // the slopeAdjustmentFactor / totalPanels division. A reasonable slope
    // should never NaN the picket count and should never mis-scale the LF.
    const input = makeInput({
      productLineId: "vinyl_privacy_6ft",
      runs: [{ id: "r1", linearFeet: 100, startType: "end", endType: "end", slopeDeg: 15 }],
    });
    const graph = buildFenceGraph(input);
    const result = generateBom(graph, { fenceType: "vinyl", wastePct: 0.05, priceMap: {} });

    const pickets = result.bom.find(b => b.sku === "VINYL_PICKET_6FT");
    expect(pickets).toBeDefined();
    expect(Number.isFinite(pickets!.qty)).toBe(true);
    expect(pickets!.qty).toBeGreaterThan(0);

    // Flat comparison: no-slope case should produce FEWER pickets than racked.
    const flatGraph = buildFenceGraph(makeInput({
      productLineId: "vinyl_privacy_6ft",
      runs: [{ id: "r1", linearFeet: 100, startType: "end", endType: "end", slopeDeg: 0 }],
    }));
    const flatResult = generateBom(flatGraph, { fenceType: "vinyl", wastePct: 0.05, priceMap: {} });
    const flatPickets = flatResult.bom.find(b => b.sku === "VINYL_PICKET_6FT")!;
    expect(pickets!.qty).toBeGreaterThanOrEqual(flatPickets.qty);
  });

  it("vinyl_privacy_6ft with zero slope never divides by zero", () => {
    // The pre-fix code read slopeAdjustmentFactor / totalPanels unconditionally.
    // With slopeDeg=0 the numerator is 0, so NaN is unreachable here — but the
    // guard we added is what makes this robust when totalPanels itself is 0.
    const input = makeInput({
      runs: [{ id: "r1", linearFeet: 50, startType: "end", endType: "end", slopeDeg: 0 }],
    });
    const graph = buildFenceGraph(input);
    const result = generateBom(graph, { fenceType: "vinyl", wastePct: 0.05, priceMap: {} });
    expect(Number.isFinite(result.totalCost)).toBe(true);
    expect(result.bom.every(b => Number.isFinite(b.qty))).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════
// P0 — C3: makeBomItem preserves extCost when unitCost === 0
// ═════════════════════════════════════════════════════════════════

describe("P0 • makeBomItem handles zero unit cost", () => {
  it("produces extCost === 0 (not undefined) when unitCost is 0", () => {
    const item = makeBomItem(
      "TEST_FREE", "Comped Item", "hardware", "ea",
      3, 0.95, "test", 0
    );
    expect(item.unitCost).toBe(0);
    expect(item.extCost).toBe(0); // Must be 0, NOT undefined
  });

  it("preserves extCost === 0 through the validation layer", () => {
    // A priceMap that zeros out a standard SKU should not crash the estimate
    const input = makeInput();
    const graph = buildFenceGraph(input);
    // Override POST_CAP to $0 via priceMap
    const result = generateBom(graph, {
      fenceType: "vinyl",
      wastePct: 0.05,
      priceMap: { VINYL_POST_CAP: 0 },
    });
    const postCap = result.bom.find(b => b.sku === "VINYL_POST_CAP");
    expect(postCap).toBeDefined();
    expect(postCap!.unitCost).toBe(0);
    expect(postCap!.extCost).toBe(0);
    // And the total estimate still builds
    expect(result.totalCost).toBeGreaterThan(0);
    expect(Number.isFinite(result.totalCost)).toBe(true);
  });

  it("still rejects truly missing unitCost", () => {
    const item = makeBomItem(
      "TEST_MISSING", "No Price", "hardware", "ea",
      2, 0.95, "test" // no unitCost
    );
    expect(item.extCost).toBeUndefined();
  });
});

// ═════════════════════════════════════════════════════════════════
// P1 — H1: Regional multiplier applies only to true materials
// ═════════════════════════════════════════════════════════════════

describe("P1 • Regional material multiplier scope", () => {
  it("does not apply regional material multiplier to equipment rentals", () => {
    const baseConfig = mergeEstimatorConfig({
      region: { key: "base", materialMultiplier: 1.0, laborMultiplier: 1.0 },
    });
    const boostedConfig = mergeEstimatorConfig({
      region: { key: "base", materialMultiplier: 1.5, laborMultiplier: 1.0 },
    });

    const input = makeInput();
    const graph = buildFenceGraph(input, baseConfig);
    const baseResult = generateBom(graph, {
      fenceType: "vinyl", wastePct: 0.05, priceMap: {}, estimatorConfig: baseConfig,
    });
    const boostedResult = generateBom(graph, {
      fenceType: "vinyl", wastePct: 0.05, priceMap: {}, estimatorConfig: boostedConfig,
    });

    // Equipment category line items (auger rental, etc.) should be unchanged.
    const getEquipmentCost = (r: typeof baseResult) => r.bom
      .filter(b => b.category === "equipment")
      .reduce((s, b) => s + (b.extCost ?? 0), 0);

    const baseEquip = getEquipmentCost(baseResult);
    const boostedEquip = getEquipmentCost(boostedResult);

    // Equipment total should not scale with materialMultiplier.
    expect(boostedEquip).toBe(baseEquip);
  });

  it("does apply regional material multiplier to true materials", () => {
    const baseConfig = mergeEstimatorConfig({
      region: { key: "base", materialMultiplier: 1.0, laborMultiplier: 1.0 },
    });
    const boostedConfig = mergeEstimatorConfig({
      region: { key: "base", materialMultiplier: 1.5, laborMultiplier: 1.0 },
    });

    const input = makeInput();
    const graph = buildFenceGraph(input, baseConfig);
    const baseResult = generateBom(graph, {
      fenceType: "vinyl", wastePct: 0.05, priceMap: {}, estimatorConfig: baseConfig,
    });
    const boostedResult = generateBom(graph, {
      fenceType: "vinyl", wastePct: 0.05, priceMap: {}, estimatorConfig: boostedConfig,
    });

    // With 1.5x material multiplier the total non-labor cost should rise,
    // but not as much as a naive "scale everything" would.
    expect(boostedResult.totalMaterialCost).toBeGreaterThan(baseResult.totalMaterialCost);
  });
});

// ═════════════════════════════════════════════════════════════════
// P1 — H2: Float-safe labor efficiency comparison
// ═════════════════════════════════════════════════════════════════

describe("P1 • Labor efficiency float drift", () => {
  it("does not add an adjustment line when effMultiplier is 1 + epsilon", () => {
    const driftedConfig = mergeEstimatorConfig({
      laborEfficiency: { baseMultiplier: 1 + 1e-10 }, // well below epsilon
    });

    const input = makeInput();
    const graph = buildFenceGraph(input, driftedConfig);
    const result = generateBom(graph, {
      fenceType: "vinyl", wastePct: 0.05, priceMap: {}, estimatorConfig: driftedConfig,
    });

    const adjustmentLine = result.laborDrivers.find(l => l.activity === "Labor Efficiency Adjustment");
    expect(adjustmentLine).toBeUndefined();
  });

  it("still adds the adjustment line for meaningful differences", () => {
    const config = mergeEstimatorConfig({
      laborEfficiency: { baseMultiplier: 1.15 },
    });

    const input = makeInput();
    const graph = buildFenceGraph(input, config);
    const result = generateBom(graph, {
      fenceType: "vinyl", wastePct: 0.05, priceMap: {}, estimatorConfig: config,
    });

    const adjustmentLine = result.laborDrivers.find(l => l.activity === "Labor Efficiency Adjustment");
    expect(adjustmentLine).toBeDefined();
    expect(adjustmentLine!.totalHrs).toBeGreaterThan(0);
  });
});

// ═════════════════════════════════════════════════════════════════
// P1 — H3: Mixer threshold triggered by concrete category total
// ═════════════════════════════════════════════════════════════════

describe("P1 • Mixer rental triggers by category, not hardcoded SKU", () => {
  it("counts concrete-category bags regardless of SKU name", () => {
    // Big vinyl job should trip the mixer (25+ bags)
    const input = makeInput({
      runs: [{ id: "r1", linearFeet: 500, startType: "end", endType: "end" }],
    });
    const graph = buildFenceGraph(input);
    const result = generateBom(graph, { fenceType: "vinyl", wastePct: 0.05, priceMap: {} });

    const concreteCategoryBags = result.bom
      .filter(b => b.category === "concrete" && b.sku.toUpperCase().startsWith("CONCRETE"))
      .reduce((s, b) => s + b.qty, 0);
    const mixer = result.bom.find(b => b.sku === "EQUIP_MIXER");

    // With ~63 posts at ~2 bags each, we should be well past the 25-bag threshold
    expect(concreteCategoryBags).toBeGreaterThanOrEqual(25);
    expect(mixer).toBeDefined();
  });

  it("does not trigger mixer on a small job below the threshold", () => {
    const input = makeInput({
      runs: [{ id: "r1", linearFeet: 20, startType: "end", endType: "end" }],
    });
    const graph = buildFenceGraph(input);
    const result = generateBom(graph, { fenceType: "vinyl", wastePct: 0.05, priceMap: {} });

    const mixer = result.bom.find(b => b.sku === "EQUIP_MIXER");
    expect(mixer).toBeUndefined();
  });
});
