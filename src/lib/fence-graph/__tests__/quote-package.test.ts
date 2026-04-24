// ── Quote Package Tests ──────────────────────────────────────────
// Tests for quote metadata, terms, customer proposal, shopping list.

import { describe, it, expect } from "vitest";
import { estimateFence } from "../engine";
import {
  buildQuoteMetadata,
  buildTermsAndConditions,
  groupBomIntoShoppingList,
  DEFAULT_TERMS,
} from "../quotePackage";
import { mergeEstimatorConfig } from "../config/resolveEstimatorConfig";
import type { FenceProjectInput, BomItem } from "../types";

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
// 1. Quote metadata
// ═══════════════════════════════════════════════════════════════

describe("Quote metadata", () => {
  it("quoteValidUntil defaults to 30 days after createdAt", () => {
    const meta = buildQuoteMetadata(30);

    const created = new Date(meta.createdAt);
    const validUntil = new Date(meta.quoteValidUntil);
    const diffDays = Math.round((validUntil.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

    expect(diffDays).toBeGreaterThanOrEqual(29);
    expect(diffDays).toBeLessThanOrEqual(31);
  });

  it("quoteVersion defaults to 1", () => {
    const meta = buildQuoteMetadata();
    expect(meta.quoteVersion).toBe(1);
  });

  it("createdAt is a valid ISO timestamp", () => {
    const meta = buildQuoteMetadata();
    expect(new Date(meta.createdAt).toISOString()).toBe(meta.createdAt);
  });

  it("quoteValidUntil is YYYY-MM-DD format", () => {
    const meta = buildQuoteMetadata();
    expect(meta.quoteValidUntil).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("estimate result includes quoteMetadata", () => {
    const result = estimateFence(makeInput(), { laborRatePerHr: 65, wastePct: 0.05, priceMap: {} });
    expect(result.quoteMetadata).toBeDefined();
    expect(result.quoteMetadata!.quoteVersion).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. Terms and conditions
// ═══════════════════════════════════════════════════════════════

describe("Terms and conditions", () => {
  it("fallback terms appear when no custom terms provided", () => {
    const terms = buildTermsAndConditions(null);
    expect(terms.length).toBe(DEFAULT_TERMS.length);
    expect(terms[0]).toContain("Payment");
    expect(terms).toContain(DEFAULT_TERMS[4]); // utility disclaimer
  });

  it("custom terms override defaults entirely", () => {
    const custom = ["Net 30 terms.", "No refunds."];
    const terms = buildTermsAndConditions(custom);
    expect(terms).toEqual(custom);
    expect(terms.length).toBe(2);
  });

  it("empty custom array falls back to defaults", () => {
    const terms = buildTermsAndConditions([]);
    expect(terms.length).toBe(DEFAULT_TERMS.length);
  });

  it("estimate result includes termsAndConditions", () => {
    const result = estimateFence(makeInput(), { laborRatePerHr: 65, wastePct: 0.05, priceMap: {} });
    expect(result.termsAndConditions).toBeDefined();
    expect(result.termsAndConditions!.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. Customer proposal summary
// ═══════════════════════════════════════════════════════════════

describe("Customer proposal summary", () => {
  it("fields derive correctly from estimate inputs", () => {
    const input = makeInput({
      runs: [{ id: "r1", linearFeet: 100, startType: "end", endType: "gate" }],
      gates: [{ id: "g1", afterRunId: "r1", gateType: "single", widthFt: 4, isPoolGate: false }],
    });
    const result = estimateFence(input, { laborRatePerHr: 65, wastePct: 0.05, priceMap: {} });
    const cp = result.customerProposal!;

    expect(cp).toBeDefined();
    expect(cp.fenceTypeLabel).toBe("Vinyl");
    expect(cp.productLineLabel).toBe("Vinyl Privacy 6ft");
    expect(cp.totalLinearFeet).toBe(100);
    expect(cp.gateCount).toBe(1);
    expect(cp.finalQuotedTotal).toBeGreaterThan(0);
  });

  it("estimatedInstallDays rounds up correctly", () => {
    // Small job: < 8 hours → 1 day
    const small = estimateFence(
      makeInput({ runs: [{ id: "r1", linearFeet: 20, startType: "end", endType: "end" }] }),
      { laborRatePerHr: 65, wastePct: 0.05, priceMap: {} }
    );
    expect(small.customerProposal!.estimatedInstallDays).toBe(1);

    // Large job: should be > 1 day
    const large = estimateFence(
      makeInput({
        runs: [
          { id: "r1", linearFeet: 300, startType: "end", endType: "corner" },
          { id: "r2", linearFeet: 300, startType: "corner", endType: "end" },
        ],
      }),
      { laborRatePerHr: 65, wastePct: 0.05, priceMap: {} }
    );
    expect(large.customerProposal!.estimatedInstallDays).toBeGreaterThan(1);
  });

  it("shortScopeSummary includes fence type, height, LF, and gate count", () => {
    const input = makeInput({
      runs: [{ id: "r1", linearFeet: 150, startType: "end", endType: "gate" }],
      gates: [{ id: "g1", afterRunId: "r1", gateType: "single", widthFt: 4, isPoolGate: false }],
    });
    const result = estimateFence(input, { laborRatePerHr: 65, wastePct: 0.05, priceMap: {} });
    const summary = result.customerProposal!.shortScopeSummary;

    expect(summary).toContain("150 LF");
    expect(summary).toContain("6 ft");
    expect(summary).toContain("vinyl");
    expect(summary).toContain("1 gate");
  });

  it("exclusions include permits when not priced", () => {
    const result = estimateFence(makeInput(), { laborRatePerHr: 65, wastePct: 0.05, priceMap: {} });
    const excl = result.customerProposal!.exclusionsSummary;
    expect(excl.some(e => e.includes("permit"))).toBe(true);
  });

  it("exclusions omit permits when included", () => {
    const result = estimateFence(
      makeInput({ permitCost: 200 }),
      { laborRatePerHr: 65, wastePct: 0.05, priceMap: {} }
    );
    const excl = result.customerProposal!.exclusionsSummary;
    expect(excl.some(e => e.toLowerCase().includes("permit"))).toBe(false);
  });

  it("exclusions omit removal when included", () => {
    const result = estimateFence(
      makeInput({ existingFenceRemoval: true }),
      { laborRatePerHr: 65, wastePct: 0.05, priceMap: {} }
    );
    const excl = result.customerProposal!.exclusionsSummary;
    expect(excl.some(e => e.toLowerCase().includes("removal"))).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. Shopping list groups
// ═══════════════════════════════════════════════════════════════

describe("Shopping list groups", () => {
  it("classifies BOM items into correct groups", () => {
    const result = estimateFence(makeInput(), { laborRatePerHr: 65, wastePct: 0.05, priceMap: {} });
    const groups = result.shoppingListGroups!;

    expect(groups).toBeDefined();
    expect(groups.length).toBeGreaterThan(0);

    const fenceSupplier = groups.find(g => g.group === "Fence Supplier");
    const hardwareStore = groups.find(g => g.group === "Hardware Store");
    const rentalYard = groups.find(g => g.group === "Rental Yard");

    expect(fenceSupplier).toBeDefined();
    expect(fenceSupplier!.items.length).toBeGreaterThan(0);

    expect(hardwareStore).toBeDefined();
    expect(hardwareStore!.items.some(i => i.sku === "CONCRETE_80LB")).toBe(true);

    expect(rentalYard).toBeDefined();
    expect(rentalYard!.items.some(i => i.sku === "EQUIP_AUGER")).toBe(true);
  });

  it("grouped subtotals sum correctly", () => {
    const result = estimateFence(makeInput(), { laborRatePerHr: 65, wastePct: 0.05, priceMap: {} });
    const groups = result.shoppingListGroups!;

    for (const group of groups) {
      const expectedSubtotal = group.items.reduce((s, i) => s + (i.extCost ?? 0), 0);
      expect(group.subtotal).toBe(expectedSubtotal);
    }
  });

  it("all BOM items are assigned to exactly one group", () => {
    const result = estimateFence(makeInput(), { laborRatePerHr: 65, wastePct: 0.05, priceMap: {} });
    const groups = result.shoppingListGroups!;

    const allGroupedItems = groups.flatMap(g => g.items);
    expect(allGroupedItems.length).toBe(result.bom.length);

    // No duplicates
    const skus = allGroupedItems.map(i => i.sku);
    expect(new Set(skus).size).toBe(skus.length);
  });

  it("chain link items go to fence supplier", () => {
    const input = makeInput({ productLineId: "chain_link_6ft", postSize: "2in" as any });
    const result = estimateFence(input, { fenceType: "chain_link", laborRatePerHr: 65, wastePct: 0.05, priceMap: {} });
    const groups = result.shoppingListGroups!;

    const fenceSupplier = groups.find(g => g.group === "Fence Supplier")!;
    expect(fenceSupplier.items.some(i => i.sku === "CL_POST_TERM")).toBe(true);
    expect(fenceSupplier.items.some(i => i.sku.startsWith("CL_"))).toBe(true);
  });

  it("regulatory items go to Regulatory group", () => {
    const result = estimateFence(
      makeInput({ permitCost: 200, surveyCost: 400 }),
      { laborRatePerHr: 65, wastePct: 0.05, priceMap: {} }
    );
    const groups = result.shoppingListGroups!;

    const reg = groups.find(g => g.group === "Regulatory");
    expect(reg).toBeDefined();
    expect(reg!.items.some(i => i.sku === "REG_PERMIT")).toBe(true);
    expect(reg!.items.some(i => i.sku === "REG_SURVEY")).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. General regressions
// ═══════════════════════════════════════════════════════════════

describe("No regressions with quote package", () => {
  const fenceTypes = [
    { type: "vinyl" as const, product: "vinyl_privacy_6ft", post: "5x5" as const },
    { type: "wood" as const, product: "wood_privacy_6ft", post: "4x4" as const },
    { type: "chain_link" as const, product: "chain_link_6ft", post: "2in" as any },
    { type: "aluminum" as const, product: "aluminum_6ft", post: "4x4" as const },
  ];

  for (const { type, product, post } of fenceTypes) {
    it(`${type}: produces valid quote package`, () => {
      const result = estimateFence(
        makeInput({ productLineId: product, postSize: post }),
        { fenceType: type, laborRatePerHr: 65, wastePct: 0.05, priceMap: {} }
      );

      expect(result.quoteMetadata).toBeDefined();
      expect(result.customerProposal).toBeDefined();
      expect(result.termsAndConditions).toBeDefined();
      expect(result.shoppingListGroups).toBeDefined();
      expect(result.totalCost).toBeGreaterThan(0);
      expect(Number.isFinite(result.totalCost)).toBe(true);
    });
  }

  it("backward compat: old-style call works and produces quote package", () => {
    const result = estimateFence(makeInput(), 65);
    expect(result.quoteMetadata).toBeDefined();
    expect(result.customerProposal).toBeDefined();
    expect(result.termsAndConditions!.length).toBeGreaterThan(0);
    expect(result.totalCost).toBeGreaterThan(0);
  });
});
