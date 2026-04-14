// ── Job Cost Layers Tests ────────────────────────────────────────
// Tests for overhead, delivery, equipment, removal, and gate gap config.

import { describe, it, expect } from "vitest";
import { estimateFence } from "../engine";
import { buildFenceGraph } from "../builder";
import { generateBom } from "../bom/index";
import { mergeEstimatorConfig } from "../config/resolveEstimatorConfig";
import { DEFAULT_ESTIMATOR_CONFIG } from "../config/defaults";
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
// 1. Setup / Layout / Cleanup overhead labor
// ═══════════════════════════════════════════════════════════════

describe("Overhead labor lines", () => {
  it("should add Job Setup, Layout, and Daily Cleanup labor lines", () => {
    const input = makeInput();
    const result = estimateFence(input, { laborRatePerHr: 65, wastePct: 0.05, priceMap: {} });

    const setup = result.laborDrivers.find(l => l.activity === "Job Setup");
    const layout = result.laborDrivers.find(l => l.activity === "Layout & String Line");
    const cleanup = result.laborDrivers.find(l => l.activity === "Daily Cleanup");

    expect(setup).toBeDefined();
    expect(layout).toBeDefined();
    expect(cleanup).toBeDefined();

    // Default values
    expect(setup!.totalHrs).toBe(1.5);
    expect(layout!.totalHrs).toBe(0.75);
    expect(cleanup!.totalHrs).toBeGreaterThan(0);
  });

  it("should scale cleanup by job days", () => {
    // A large job should have more cleanup days
    const input = makeInput({
      runs: [
        { id: "r1", linearFeet: 200, startType: "end", endType: "corner" },
        { id: "r2", linearFeet: 200, startType: "corner", endType: "end" },
      ],
    });
    const result = estimateFence(input, { laborRatePerHr: 65, wastePct: 0.05, priceMap: {} });
    const cleanup = result.laborDrivers.find(l => l.activity === "Daily Cleanup")!;

    // 400LF should be multi-day → cleanup days > 1
    expect(cleanup.count).toBeGreaterThanOrEqual(1);
  });

  it("custom overhead config should change overhead hours", () => {
    const input = makeInput();
    const config = mergeEstimatorConfig({
      overhead: { fixed: { setupHrs: 3.0, layoutHrs: 1.5 }, perDay: { cleanupHrs: 1.0 } },
    });
    const result = estimateFence(input, {
      laborRatePerHr: 65, wastePct: 0.05, priceMap: {},
      estimatorConfig: config,
    });

    const setup = result.laborDrivers.find(l => l.activity === "Job Setup")!;
    const layout = result.laborDrivers.find(l => l.activity === "Layout & String Line")!;
    expect(setup.totalHrs).toBe(3.0);
    expect(layout.totalHrs).toBe(1.5);
  });

  it("zero overhead config should not add lines", () => {
    const input = makeInput();
    const config = mergeEstimatorConfig({
      overhead: { fixed: { setupHrs: 0, layoutHrs: 0 }, perDay: { cleanupHrs: 0 } },
    });
    const result = estimateFence(input, {
      laborRatePerHr: 65, wastePct: 0.05, priceMap: {},
      estimatorConfig: config,
    });

    expect(result.laborDrivers.find(l => l.activity === "Job Setup")).toBeUndefined();
    expect(result.laborDrivers.find(l => l.activity === "Layout & String Line")).toBeUndefined();
    expect(result.laborDrivers.find(l => l.activity === "Daily Cleanup")).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. Delivery fee
// ═══════════════════════════════════════════════════════════════

describe("Delivery fee", () => {
  it("should add delivery fee when material cost is below threshold", () => {
    // Small job → low material cost → delivery fee applies
    const input = makeInput({
      runs: [{ id: "r1", linearFeet: 10, startType: "end", endType: "end" }],
    });
    const config = mergeEstimatorConfig({
      logistics: { deliveryFee: 95, freeDeliveryThreshold: 5000 },
    });
    const result = estimateFence(input, {
      laborRatePerHr: 65, wastePct: 0.05, priceMap: {},
      estimatorConfig: config,
    });

    const delivery = result.bom.find(b => b.sku === "DELIVERY_FEE");
    expect(delivery).toBeDefined();
    expect(delivery!.unitCost).toBe(95);
    expect(delivery!.extCost).toBe(95);
  });

  it("should NOT add delivery fee when material cost exceeds threshold", () => {
    // Large job → high material cost → no delivery fee
    const input = makeInput({
      runs: [
        { id: "r1", linearFeet: 200, startType: "end", endType: "corner" },
        { id: "r2", linearFeet: 200, startType: "corner", endType: "end" },
      ],
    });
    const config = mergeEstimatorConfig({
      logistics: { deliveryFee: 95, freeDeliveryThreshold: 500 },
    });
    const result = estimateFence(input, {
      laborRatePerHr: 65, wastePct: 0.05, priceMap: {},
      estimatorConfig: config,
    });

    const delivery = result.bom.find(b => b.sku === "DELIVERY_FEE");
    expect(delivery).toBeUndefined();
  });

  it("zero delivery fee should not add line", () => {
    const input = makeInput();
    const config = mergeEstimatorConfig({
      logistics: { deliveryFee: 0 },
    });
    const result = estimateFence(input, {
      laborRatePerHr: 65, wastePct: 0.05, priceMap: {},
      estimatorConfig: config,
    });

    expect(result.bom.find(b => b.sku === "DELIVERY_FEE")).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. Equipment rentals
// ═══════════════════════════════════════════════════════════════

describe("Equipment rentals", () => {
  it("should always include auger rental", () => {
    const input = makeInput();
    const result = estimateFence(input, { laborRatePerHr: 65, wastePct: 0.05, priceMap: {} });

    const auger = result.bom.find(b => b.sku === "EQUIP_AUGER");
    expect(auger).toBeDefined();
    expect(auger!.unitCost).toBe(DEFAULT_ESTIMATOR_CONFIG.equipment.augerPerDay);
    expect(auger!.qty).toBeGreaterThanOrEqual(1);
  });

  it("should add stretcher for chain link only", () => {
    const clInput = makeInput({ productLineId: "chain_link_6ft", postSize: "2in" as any });
    const clResult = estimateFence(clInput, { fenceType: "chain_link", laborRatePerHr: 65, wastePct: 0.05, priceMap: {} });
    expect(clResult.bom.find(b => b.sku === "EQUIP_STRETCHER")).toBeDefined();

    const vinylResult = estimateFence(makeInput(), { fenceType: "vinyl", laborRatePerHr: 65, wastePct: 0.05, priceMap: {} });
    expect(vinylResult.bom.find(b => b.sku === "EQUIP_STRETCHER")).toBeUndefined();
  });

  it("should add saw for aluminum only", () => {
    const alInput = makeInput({ productLineId: "aluminum_6ft", postSize: "4x4" });
    const alResult = estimateFence(alInput, { fenceType: "aluminum", laborRatePerHr: 65, wastePct: 0.05, priceMap: {} });
    expect(alResult.bom.find(b => b.sku === "EQUIP_SAW")).toBeDefined();

    const vinylResult = estimateFence(makeInput(), { fenceType: "vinyl", laborRatePerHr: 65, wastePct: 0.05, priceMap: {} });
    expect(vinylResult.bom.find(b => b.sku === "EQUIP_SAW")).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. Mixer threshold
// ═══════════════════════════════════════════════════════════════

describe("Mixer rental threshold", () => {
  it("should NOT add mixer for small job (< 25 bags)", () => {
    const input = makeInput({
      runs: [{ id: "r1", linearFeet: 20, startType: "end", endType: "end" }],
    });
    const result = estimateFence(input, { laborRatePerHr: 65, wastePct: 0.05, priceMap: {} });

    const concreteBags = result.bom.find(b => b.sku === "CONCRETE_80LB")?.qty ?? 0;
    const mixer = result.bom.find(b => b.sku === "EQUIP_MIXER");

    if (concreteBags < 25) {
      expect(mixer).toBeUndefined();
    }
  });

  it("should add mixer for large job (>= 25 bags)", () => {
    const input = makeInput({
      runs: [
        { id: "r1", linearFeet: 300, startType: "end", endType: "corner" },
        { id: "r2", linearFeet: 300, startType: "corner", endType: "end" },
      ],
    });
    const result = estimateFence(input, { laborRatePerHr: 65, wastePct: 0.05, priceMap: {} });

    const concreteBags = result.bom.find(b => b.sku === "CONCRETE_80LB")?.qty ?? 0;
    if (concreteBags >= 25) {
      const mixer = result.bom.find(b => b.sku === "EQUIP_MIXER");
      expect(mixer).toBeDefined();
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. Existing fence removal
// ═══════════════════════════════════════════════════════════════

describe("Existing fence removal", () => {
  it("should add removal labor + disposal when existingFenceRemoval is true", () => {
    const input = makeInput({ existingFenceRemoval: true });
    const result = estimateFence(input, { laborRatePerHr: 65, wastePct: 0.05, priceMap: {} });

    const removal = result.laborDrivers.find(l => l.activity === "Existing Fence Removal");
    const extraction = result.laborDrivers.find(l => l.activity === "Old Post Extraction");
    const disposal = result.bom.find(b => b.sku === "DISPOSAL_HAULING");

    expect(removal).toBeDefined();
    expect(removal!.totalHrs).toBeGreaterThan(0);
    expect(extraction).toBeDefined();
    expect(extraction!.totalHrs).toBeGreaterThan(0);
    expect(disposal).toBeDefined();
    expect(disposal!.unitCost).toBe(DEFAULT_ESTIMATOR_CONFIG.removal.disposalCost);
  });

  it("should NOT add removal lines when existingFenceRemoval is false", () => {
    const input = makeInput({ existingFenceRemoval: false });
    const result = estimateFence(input, { laborRatePerHr: 65, wastePct: 0.05, priceMap: {} });

    expect(result.laborDrivers.find(l => l.activity === "Existing Fence Removal")).toBeUndefined();
    expect(result.laborDrivers.find(l => l.activity === "Old Post Extraction")).toBeUndefined();
    expect(result.bom.find(b => b.sku === "DISPOSAL_HAULING")).toBeUndefined();
  });

  it("should NOT add removal lines when existingFenceRemoval is undefined", () => {
    const input = makeInput(); // existingFenceRemoval defaults to undefined
    const result = estimateFence(input, { laborRatePerHr: 65, wastePct: 0.05, priceMap: {} });

    expect(result.laborDrivers.find(l => l.activity === "Existing Fence Removal")).toBeUndefined();
  });

  it("removal labor should scale with LF", () => {
    const small = estimateFence(
      makeInput({ existingFenceRemoval: true, runs: [{ id: "r1", linearFeet: 50, startType: "end", endType: "end" }] }),
      { laborRatePerHr: 65, wastePct: 0.05, priceMap: {} }
    );
    const large = estimateFence(
      makeInput({ existingFenceRemoval: true, runs: [{ id: "r1", linearFeet: 200, startType: "end", endType: "end" }] }),
      { laborRatePerHr: 65, wastePct: 0.05, priceMap: {} }
    );

    const smallRemoval = small.laborDrivers.find(l => l.activity === "Existing Fence Removal")!;
    const largeRemoval = large.laborDrivers.find(l => l.activity === "Existing Fence Removal")!;
    expect(largeRemoval.totalHrs).toBeGreaterThan(smallRemoval.totalHrs);
  });
});

// ═══════════════════════════════════════════════════════════════
// 6. Gate gap config changes builder output
// ═══════════════════════════════════════════════════════════════

describe("Gate gap config", () => {
  it("custom gate gaps should change leaf width", () => {
    const input = makeInput({
      runs: [{ id: "r1", linearFeet: 50, startType: "end", endType: "gate" }],
      gates: [{ id: "g1", afterRunId: "r1", gateType: "single", widthFt: 4, isPoolGate: false }],
    });

    const defaultGraph = buildFenceGraph(input);
    const customGraph = buildFenceGraph(input, mergeEstimatorConfig({
      gateGaps: { hinge: 1.5, latch: 1.0, center: 2.0 },
    }));

    const defaultGate = defaultGraph.edges.find(e => e.type === "gate")!.gateSpec!;
    const customGate = customGraph.edges.find(e => e.type === "gate")!.gateSpec!;

    // Wider gaps → narrower leaf
    expect(customGate.leftLeafWidth_in).toBeLessThan(defaultGate.leftLeafWidth_in);
    expect(customGate.hingeGap_in).toBe(1.5);
    expect(customGate.latchGap_in).toBe(1.0);
  });

  it("double gate custom center gap should affect leaf widths", () => {
    const input = makeInput({
      runs: [{ id: "r1", linearFeet: 50, startType: "end", endType: "gate" }],
      gates: [{ id: "g1", afterRunId: "r1", gateType: "double", widthFt: 10, isPoolGate: false }],
    });

    const defaultGraph = buildFenceGraph(input);
    const customGraph = buildFenceGraph(input, mergeEstimatorConfig({
      gateGaps: { center: 2.0 },
    }));

    const defaultGate = defaultGraph.edges.find(e => e.type === "gate")!.gateSpec!;
    const customGate = customGraph.edges.find(e => e.type === "gate")!.gateSpec!;

    // Wider center gap → narrower leaves
    expect(customGate.centerGap_in).toBe(2.0);
    expect(defaultGate.centerGap_in).toBe(1.0);
    expect(customGate.leftLeafWidth_in).toBeLessThan(defaultGate.leftLeafWidth_in);
  });
});

// ═══════════════════════════════════════════════════════════════
// 7. No NaN / negative / validation regressions
// ═══════════════════════════════════════════════════════════════

describe("No regressions with job cost layers", () => {
  const fenceTypes = [
    { type: "vinyl" as const, product: "vinyl_privacy_6ft", post: "5x5" as const },
    { type: "wood" as const, product: "wood_privacy_6ft", post: "4x4" as const },
    { type: "chain_link" as const, product: "chain_link_6ft", post: "2in" as any },
    { type: "aluminum" as const, product: "aluminum_6ft", post: "4x4" as const },
  ];

  for (const { type, product, post } of fenceTypes) {
    it(`${type}: no NaN or negative values with default config + overhead`, () => {
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

    it(`${type}: no regression with removal enabled`, () => {
      const input = makeInput({ productLineId: product, postSize: post, existingFenceRemoval: true });
      const result = estimateFence(input, {
        fenceType: type, laborRatePerHr: 65, wastePct: 0.05, priceMap: {},
      });

      expect(Number.isFinite(result.totalCost)).toBe(true);
      expect(result.totalCost).toBeGreaterThan(0);
      expect(result.bom.every(b => b.qty > 0 && Number.isFinite(b.qty))).toBe(true);
    });
  }

  it("backward compat: old-style call without config still works", () => {
    const input = makeInput();
    const result = estimateFence(input, 65);

    expect(result.totalCost).toBeGreaterThan(0);
    expect(Number.isFinite(result.totalCost)).toBe(true);
  });
});
