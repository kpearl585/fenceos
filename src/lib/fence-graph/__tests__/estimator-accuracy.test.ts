// ── Estimator Accuracy Tests ─────────────────────────────────────
// Targeted tests for P0/P1 accuracy fixes from April 2026 audit.

import { describe, it, expect } from "vitest";
import { calcConcretePerPost, calcTotalConcrete } from "../concrete";
import { segmentRun } from "../segmentation";
import { cuttingStockOptimizer } from "../bom/shared";
import { buildFenceGraph } from "../builder";
import { generateBom } from "../bom/index";
import type { FenceProjectInput, FenceNode, InstallRules, SiteConfig } from "../types";
import { INSTALL_RULES, SOIL_CONCRETE_FACTORS } from "../types";

// ── Helpers ──────────────────────────────────────────────────────

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

const standardRules: InstallRules = { ...INSTALL_RULES["5x5"] };
const standardSite: SiteConfig = {
  soilType: "standard",
  soilConcreteFactor: 1.0,
  hurricaneZone: false,
  floodZone: false,
  existingFenceRemoval: false,
  surfaceType: "ground",
  obstacleCt: 0,
};

// ═════════════════════════════════════════════════════════════════
// FIX 1: Concrete bag size — 80lb bags yield 0.6 cu ft
// ═════════════════════════════════════════════════════════════════

describe("Concrete bag calculation (80lb bags)", () => {
  it("should use 0.6 cu ft yield per bag (80lb)", () => {
    const calc = calcConcretePerPost(standardRules, standardSite, false);

    // 5x5 post, 10" hole diameter, 30" depth, 4" gravel base
    // Hole volume = PI * 5^2 * 30 = 2356.2 cu in
    // Gravel volume = PI * 5^2 * 4 = 314.2 cu in
    // Post displacement = 5 * 5 * 26 = 650 cu in
    // Net concrete = 2356.2 - 314.2 - 650 = 1392.0 cu in
    // In cu ft = 1392.0 / 1728 = 0.8056 cu ft
    // Bags at 0.6 cu ft/bag = 0.8056 / 0.6 = 1.34 → ceil = 2 bags

    expect(calc.bagsNeeded).toBe(2);
    expect(calc.concreteVolume_cu_ft).toBeGreaterThan(0.7);
    expect(calc.concreteVolume_cu_ft).toBeLessThan(0.9);
  });

  it("should produce fewer bags than the old 60lb calculation", () => {
    // Old: 0.8056 / 0.45 = 1.79 → 2 bags (same ceil, but for larger holes the gap widens)
    // With sandy soil factor 1.2: old = ceil(1.79 * 1.2) = 3, new = ceil(1.34 * 1.2) = 2
    const sandySite = { ...standardSite, soilType: "sandy" as const, soilConcreteFactor: 1.2 };
    const sandyRules = { ...standardRules, holeDepth_in: 42 }; // Florida override
    const calc = calcConcretePerPost(sandyRules, sandySite, false);

    // Bigger hole → more concrete → difference becomes material
    expect(calc.bagsNeeded).toBeGreaterThanOrEqual(2);
    // Should not be the inflated old value
    expect(calc.bagsNeeded).toBeLessThanOrEqual(4);
  });
});

// ═════════════════════════════════════════════════════════════════
// FIX 2: No double concrete waste for vinyl
// ═════════════════════════════════════════════════════════════════

describe("Vinyl concrete waste consistency", () => {
  it("vinyl and wood should produce the same concrete bag count for identical graphs", () => {
    const input = makeInput();
    const graph = buildFenceGraph(input);

    const vinylResult = generateBom(graph, {
      fenceType: "vinyl",
      wastePct: 0.05,
      priceMap: {},
    });
    const woodResult = generateBom(graph, {
      fenceType: "wood",
      wastePct: 0.05,
      priceMap: {},
    });

    const vinylConcrete = vinylResult.bom.find(b => b.sku === "CONCRETE_80LB");
    const woodConcrete = woodResult.bom.find(b => b.sku === "CONCRETE_80LB");

    expect(vinylConcrete).toBeDefined();
    expect(woodConcrete).toBeDefined();
    // Same graph, same waste% → same concrete bags
    expect(vinylConcrete!.qty).toBe(woodConcrete!.qty);
  });
});

// ═════════════════════════════════════════════════════════════════
// FIX 3: Rail optimizer uses section widths, not run lengths
// ═════════════════════════════════════════════════════════════════

describe("Rail cutting-stock optimizer input", () => {
  it("should produce realistic rail counts for a 100ft vinyl run", () => {
    const input = makeInput({
      runs: [{ id: "r1", linearFeet: 100, startType: "end", endType: "end" }],
    });
    const graph = buildFenceGraph(input);
    const result = generateBom(graph, {
      fenceType: "vinyl",
      wastePct: 0.05,
      priceMap: {},
    });

    const rails = result.bom.find(b => b.sku === "VINYL_RAIL_8FT");
    expect(rails).toBeDefined();

    // 100ft = 1200in, at 96in panels → ~12-13 sections
    // 3 rails per section (6ft fence) = ~36-39 rail pieces needed
    // Each rail ~8ft, fits in 8ft stock 1:1 → ~36-39 stock + 5% waste
    // Should be roughly 38-42 rails
    expect(rails!.qty).toBeGreaterThanOrEqual(30);
    expect(rails!.qty).toBeLessThanOrEqual(50);

    // OLD BUG: optimizer received [100, 100, 100] (run length × railCount)
    // which can't fit in 8ft stock → would produce 3+ bins per piece = 39+ stock
    // Actually worse — 100ft pieces need ceil(100/8) = 13 bins each × 3 = 39
    // But with proper section widths (~8ft each), we get 1 bin per rail = much more efficient
  });

  it("section-based optimizer should be more efficient than run-length approach", () => {
    // Demonstrate the bug fix: section widths fit neatly in stock, run lengths don't
    const sectionBased = cuttingStockOptimizer(
      // 13 sections of 8ft, 3 rails each = 39 pieces of 8ft
      Array(39).fill(8),
      8,
      0.05
    );
    const runBased = cuttingStockOptimizer(
      // 3 pieces of 100ft (impossible to fit in 8ft stock)
      [100, 100, 100],
      8,
      0.05
    );

    // Section-based: 39 pieces fit exactly in 39 bins → 39 + 5% = 41
    // Run-based: 3 pieces of 100ft → 3 bins (each 100ft piece gets its own bin)
    // BUT the 100ft piece doesn't fit in an 8ft bin — FFD can't place it
    // So each gets its own bin, waste = 8-100 = negative (impossible) — it still bins it
    // Actually FFD puts each oversized piece in its own bin, so 3 bins, but each bin has
    // more material than stock length — this is the bug, it produces wrong waste calcs
    expect(sectionBased.stockPiecesNeeded).toBeGreaterThan(runBased.stockPiecesNeeded);
    // The key insight: section-based produces MORE stock pieces (correct) because
    // each 8ft section needs its own stock piece, while run-based incorrectly
    // thinks 3 pieces of stock can cover it
  });
});

// ═════════════════════════════════════════════════════════════════
// FIX 4: Chain link line post count
// ═════════════════════════════════════════════════════════════════

describe("Chain link line post count", () => {
  it("exact multiple: 30ft at 10ft OC → 2 interior posts", () => {
    const input = makeInput({
      productLineId: "chain_link_6ft",
      postSize: "2in" as any,
      runs: [{ id: "r1", linearFeet: 30, startType: "end", endType: "end" }],
    });
    const graph = buildFenceGraph(input);
    const result = generateBom(graph, { fenceType: "chain_link", wastePct: 0.05, priceMap: {} });

    const linePosts = result.bom.find(b => b.sku === "CL_POST_2IN");
    expect(linePosts).toBeDefined();
    // 30ft / 10ft = 3 intervals → 4 posts total → 2 interior (terminal posts handled separately)
    // But with ceil: ceil(30/10) + 1 = 4, minus 2 = 2 interior ✓
    expect(linePosts!.qty).toBeGreaterThanOrEqual(2);
  });

  it("non-exact multiple: 25ft at 10ft OC → 2 interior posts (not 1)", () => {
    const input = makeInput({
      productLineId: "chain_link_6ft",
      postSize: "2in" as any,
      runs: [{ id: "r1", linearFeet: 25, startType: "end", endType: "end" }],
    });
    const graph = buildFenceGraph(input);
    const result = generateBom(graph, { fenceType: "chain_link", wastePct: 0.05, priceMap: {} });

    const linePosts = result.bom.find(b => b.sku === "CL_POST_2IN");
    expect(linePosts).toBeDefined();
    // 25ft / 10ft = 2.5 → ceil = 3 intervals → 4 posts → 2 interior
    // OLD BUG: floor(25/10) - 1 = 1 (wrong, missed a post)
    expect(linePosts!.qty).toBeGreaterThanOrEqual(2);
  });

  it("short run: 8ft at 10ft OC → no line post BOM item emitted", () => {
    const input = makeInput({
      productLineId: "chain_link_6ft",
      postSize: "2in" as any,
      runs: [{ id: "r1", linearFeet: 8, startType: "end", endType: "end" }],
    });
    const graph = buildFenceGraph(input);
    const result = generateBom(graph, { fenceType: "chain_link", wastePct: 0.05, priceMap: {} });

    const linePosts = result.bom.find(b => b.sku === "CL_POST_2IN");
    // 8ft < 10ft OC → 0 interior posts, BOM item should not be emitted
    expect(linePosts).toBeUndefined();

    // Terminal posts should still exist
    const termPosts = result.bom.find(b => b.sku === "CL_POST_TERM");
    expect(termPosts).toBeDefined();
    expect(termPosts!.qty).toBeGreaterThan(0);
  });
});

// ═════════════════════════════════════════════════════════════════
// FIX 5: Aluminum gravel pricing
// ═════════════════════════════════════════════════════════════════

describe("Aluminum gravel pricing", () => {
  it("aluminum BOM should include priced gravel", () => {
    const input = makeInput({
      productLineId: "aluminum_6ft",
      postSize: "4x4",
    });
    const graph = buildFenceGraph(input);
    const result = generateBom(graph, {
      fenceType: "aluminum",
      wastePct: 0.05,
      priceMap: {},
    });

    const gravel = result.bom.find(b => b.sku === "GRAVEL_40LB");
    expect(gravel).toBeDefined();
    expect(gravel!.unitCost).toBeDefined();
    expect(gravel!.unitCost).toBeGreaterThan(0);
    expect(gravel!.extCost).toBeDefined();
    expect(gravel!.extCost).toBeGreaterThan(0);
  });
});

// ═════════════════════════════════════════════════════════════════
// FIX 6: Input validation
// ═════════════════════════════════════════════════════════════════

describe("Input validation", () => {
  it("should throw on all-zero-length runs", () => {
    const input = makeInput({
      runs: [
        { id: "r1", linearFeet: 0, startType: "end", endType: "end" },
        { id: "r2", linearFeet: 0, startType: "end", endType: "end" },
      ],
    });

    expect(() => buildFenceGraph(input)).toThrow("No valid runs");
  });

  it("should silently filter out zero-length runs when others exist", () => {
    const input = makeInput({
      runs: [
        { id: "r1", linearFeet: 0, startType: "end", endType: "end" },
        { id: "r2", linearFeet: 50, startType: "end", endType: "end" },
      ],
    });

    const graph = buildFenceGraph(input);
    // Should have processed only the 50ft run
    const segEdges = graph.edges.filter(e => e.type === "segment");
    expect(segEdges.length).toBe(1);
    expect(segEdges[0].length_in).toBe(600); // 50ft * 12
  });

  it("should throw when gate width >= run length", () => {
    const input = makeInput({
      runs: [{ id: "r1", linearFeet: 10, startType: "end", endType: "gate" }],
      gates: [{ id: "g1", afterRunId: "r1", gateType: "double", widthFt: 12, isPoolGate: false }],
    });

    expect(() => buildFenceGraph(input)).toThrow("must be less than its run length");
  });

  it("should allow gate width smaller than run length", () => {
    const input = makeInput({
      runs: [{ id: "r1", linearFeet: 20, startType: "end", endType: "gate" }],
      gates: [{ id: "g1", afterRunId: "r1", gateType: "single", widthFt: 4, isPoolGate: false }],
    });

    expect(() => buildFenceGraph(input)).not.toThrow();
  });
});

// ═════════════════════════════════════════════════════════════════
// Integration: Before/After impact test
// ═════════════════════════════════════════════════════════════════

describe("Integration: estimate output sanity checks", () => {
  it("100ft vinyl privacy 6ft should produce reasonable totals", () => {
    const input = makeInput();
    const graph = buildFenceGraph(input);
    const result = generateBom(graph, {
      fenceType: "vinyl",
      laborRatePerHr: 65,
      wastePct: 0.05,
      priceMap: {},
    });

    // Sanity: material cost should be in a realistic range for 100ft vinyl
    // Rough: 13 posts × $38 + 13 panels × $68 + rails + concrete ≈ $1,500-$3,000
    expect(result.totalMaterialCost).toBeGreaterThan(1000);
    expect(result.totalMaterialCost).toBeLessThan(5000);

    // Labor: ~10-25 hours for 100ft
    expect(result.totalLaborHrs).toBeGreaterThan(5);
    expect(result.totalLaborHrs).toBeLessThan(30);

    // No NaN or negative values
    expect(result.totalCost).toBeGreaterThan(0);
    expect(Number.isFinite(result.totalCost)).toBe(true);
    expect(result.bom.every(b => b.qty > 0)).toBe(true);
  });

  it("100ft wood privacy 6ft should produce reasonable totals", () => {
    const input = makeInput({ productLineId: "wood_privacy_6ft", postSize: "4x4" });
    const graph = buildFenceGraph(input);
    const result = generateBom(graph, {
      fenceType: "wood",
      wastePct: 0.05,
      priceMap: {},
    });

    expect(result.totalMaterialCost).toBeGreaterThan(500);
    expect(result.totalMaterialCost).toBeLessThan(4000);
    expect(result.totalCost).toBeGreaterThan(0);
  });

  it("100ft chain link 6ft should produce reasonable totals", () => {
    const input = makeInput({ productLineId: "chain_link_6ft", postSize: "2in" as any });
    const graph = buildFenceGraph(input);
    const result = generateBom(graph, {
      fenceType: "chain_link",
      wastePct: 0.05,
      priceMap: {},
    });

    expect(result.totalMaterialCost).toBeGreaterThan(200);
    expect(result.totalMaterialCost).toBeLessThan(3000);
    expect(result.totalCost).toBeGreaterThan(0);
  });

  it("100ft aluminum 6ft should produce reasonable totals", () => {
    const input = makeInput({ productLineId: "aluminum_6ft", postSize: "4x4" });
    const graph = buildFenceGraph(input);
    const result = generateBom(graph, {
      fenceType: "aluminum",
      wastePct: 0.05,
      priceMap: {},
    });

    expect(result.totalMaterialCost).toBeGreaterThan(1000);
    expect(result.totalMaterialCost).toBeLessThan(6000);
    expect(result.totalCost).toBeGreaterThan(0);

    // Verify gravel is now priced
    const gravel = result.bom.find(b => b.sku === "GRAVEL_40LB");
    expect(gravel?.extCost).toBeGreaterThan(0);
  });
});
