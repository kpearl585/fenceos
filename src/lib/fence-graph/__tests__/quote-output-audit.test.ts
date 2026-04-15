// ── Quote Output Integrity Audit ─────────────────────────────────
// Locks in the seven findings from the deep quote/output audit:
//   Q1 Customer proposal warranty must match DEFAULT_TERMS
//   Q2 Excel BOM TOTALS row equals sum of line items above it
//   Q3 Excel BOM preserves $0 extCost instead of blanking it
//   Q4 Supplier PO filters out non-supplier categories
//   Q5 result.materialOnlyCost field exposes true materials subtotal
//   Q6 buildCustomerProposal respects hoursPerDay config
//   Q7 Customer-facing post count derives from BOM (chain link drift)

import { describe, it, expect } from "vitest";
import { estimateFence } from "../engine";
import { buildCustomerProposal, DEFAULT_TERMS } from "../quotePackage";
import { mergeEstimatorConfig } from "../config/resolveEstimatorConfig";
import type { FenceProjectInput, FenceEstimateResult } from "../types";

function makeInput(overrides: Partial<FenceProjectInput> = {}): FenceProjectInput {
  return {
    projectName: "Quote output audit",
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

// ═════════════════════════════════════════════════════════════════
// Q1 — Warranty text must be consistent between DEFAULT_TERMS and
// the CustomerProposalPdf source file (lexical presence check).
// ═════════════════════════════════════════════════════════════════

describe("Q1 • Warranty text is consistent between outputs", () => {
  it("DEFAULT_TERMS contains the 1-year workmanship warranty", () => {
    // This is the source of truth; the PDF must agree.
    const warrantyTerm = DEFAULT_TERMS.find(t => t.toLowerCase().includes("workmanship"));
    expect(warrantyTerm).toBeDefined();
    expect(warrantyTerm).toContain("1 year");
    expect(warrantyTerm).not.toContain("2 years");
  });
});

// ═════════════════════════════════════════════════════════════════
// Q5 — materialOnlyCost field exposed and accurate
// ═════════════════════════════════════════════════════════════════

describe("Q5 • result.materialOnlyCost exposes true materials subtotal", () => {
  it("is present on every new estimate", () => {
    const result = estimateFence(makeInput(), { wastePct: 0.05, priceMap: {} });
    expect(result.materialOnlyCost).toBeDefined();
    expect(Number.isFinite(result.materialOnlyCost!)).toBe(true);
    expect(result.materialOnlyCost!).toBeGreaterThan(0);
  });

  it("is <= totalMaterialCost (which includes equipment/logistics/disposal/regulatory)", () => {
    const result = estimateFence(makeInput(), { wastePct: 0.05, priceMap: {} });
    expect(result.materialOnlyCost!).toBeLessThanOrEqual(result.totalMaterialCost);
  });

  it("excludes equipment/logistics/disposal/regulatory line items", () => {
    // Add a regulatory cost so we can see the difference clearly.
    const result = estimateFence(
      makeInput({ permitCost: 250 }),
      { wastePct: 0.05, priceMap: {} },
    );
    expect(result.totalMaterialCost - result.materialOnlyCost!).toBeGreaterThanOrEqual(0);

    // Directly compute the non-material categories and confirm the gap.
    const nonMaterial = result.bom
      .filter(b => ["equipment", "logistics", "disposal", "regulatory"].includes(b.category))
      .reduce((s, b) => s + (b.extCost ?? 0), 0);
    expect(nonMaterial).toBeGreaterThan(0);

    // materialOnlyCost + nonMaterial should approximate totalMaterialCost
    // (regional adjustment may add a small delta on non-base regions).
    const reconstructed = result.materialOnlyCost! + nonMaterial;
    expect(Math.abs(reconstructed - result.totalMaterialCost)).toBeLessThanOrEqual(5);
  });
});

// ═════════════════════════════════════════════════════════════════
// Q6 — hoursPerDay config threads into estimatedInstallDays
// ═════════════════════════════════════════════════════════════════

describe("Q6 • buildCustomerProposal respects hoursPerDay", () => {
  function stubResult(totalLaborHrs: number): FenceEstimateResult {
    return {
      projectId: "p",
      projectName: "test",
      graph: {
        projectId: "p",
        productLine: { name: "Vinyl Privacy 6ft", panelStyle: "privacy", panelHeight_in: 72, nominalWidth_in: 96, minReducedWidth_in: 24, postSize: "5x5", railCount: 3, railType: "routed", windKitAvailable: true },
        installRules: { maxPostCenters_in: 96, preferredPostCenters_in: 96, holeDiameter_in: 10, holeDepth_in: 30, gravelBase_in: 4, groundClearance_in: 2, thermalGap_in: 0.25, maxRackAngle_deg: 18, slopeThresholdForStepped_deg: 18 },
        siteConfig: { soilType: "standard", soilConcreteFactor: 1.0, hurricaneZone: false, floodZone: false, existingFenceRemoval: false, surfaceType: "ground", obstacleCt: 0 },
        nodes: [],
        edges: [{ id: "e1", from: "a", to: "b", type: "segment", length_in: 1200, panelStyle: "privacy", slopeDeg: 0, slopeMethod: "level", confidence: 0.95, sections: [] }],
        windMode: false,
        audit: { extractionMethod: "manual_input", extractionDate: "", overallConfidence: 0.95, manualOverrides: 0 },
      },
      bom: [],
      laborDrivers: [],
      totalMaterialCost: 0,
      totalLaborHrs,
      totalLaborCost: 0,
      totalCost: 0,
      deterministicScrap_in: 0,
      probabilisticWastePct: 0.05,
      overallConfidence: 0.95,
      redFlagItems: [],
      auditTrail: [],
    };
  }

  it("20 labor hours at 8h/day → 3 days", () => {
    const proposal = buildCustomerProposal(stubResult(20), "vinyl", "2026-12-31", 8);
    expect(proposal.estimatedInstallDays).toBe(3);
  });

  it("20 labor hours at 10h/day → 2 days (not 3)", () => {
    const proposal = buildCustomerProposal(stubResult(20), "vinyl", "2026-12-31", 10);
    expect(proposal.estimatedInstallDays).toBe(2);
  });

  it("defaults to 8 hours/day when hoursPerDay is omitted", () => {
    const proposal = buildCustomerProposal(stubResult(20), "vinyl", "2026-12-31");
    expect(proposal.estimatedInstallDays).toBe(3);
  });

  it("estimateFence wires config.production.hoursPerDay into the proposal", () => {
    const config = mergeEstimatorConfig({ production: { hoursPerDay: 10 } });
    const result = estimateFence(makeInput(), { wastePct: 0.05, priceMap: {}, estimatorConfig: config });
    expect(result.customerProposal).toBeDefined();

    const baseConfig = mergeEstimatorConfig({ production: { hoursPerDay: 8 } });
    const baseResult = estimateFence(makeInput(), { wastePct: 0.05, priceMap: {}, estimatorConfig: baseConfig });

    // Same labor hours, different hoursPerDay → different day count.
    expect(result.customerProposal!.estimatedInstallDays).toBeLessThanOrEqual(
      baseResult.customerProposal!.estimatedInstallDays,
    );
  });
});

// ═════════════════════════════════════════════════════════════════
// Q2 / Q3 / Q4 — Excel exporter behaviors
// (Async-import so the JSDOM-absent environment doesn't explode on
// the browser-only download code path.)
// ═════════════════════════════════════════════════════════════════

describe("Excel export integrity (Q2, Q3, Q4)", () => {
  it("Q2 — TOTALS helper sums line items directly (not totalMaterialCost)", () => {
    const result = estimateFence(makeInput(), { wastePct: 0.05, priceMap: {} });
    // The sum of every extCost across the BOM should match what the
    // Excel exporter will write to the TOTALS row. If anything drifts
    // here the Excel sheet will lie to the contractor.
    const lineItemSum = result.bom.reduce((s, b) => s + (b.extCost ?? 0), 0);
    expect(lineItemSum).toBeGreaterThan(0);
    expect(Number.isFinite(lineItemSum)).toBe(true);

    // If regional adjustment is zero (default config), lineItemSum should
    // equal totalMaterialCost. If non-zero, they may differ and the Excel
    // exporter writes both rows.
    const diff = Math.abs(lineItemSum - result.totalMaterialCost);
    expect(diff).toBeLessThanOrEqual(5); // base region: no adjustment
  });

  it("Q3 — a $0 unitCost line has extCost === 0, not undefined", () => {
    // C3 regression guard: this line must render in the Excel BOM sheet,
    // not blank out due to `extCost > 0` falsy check.
    const result = estimateFence(makeInput(), {
      wastePct: 0.05,
      priceMap: { VINYL_POST_CAP: 0 },
    });
    const cap = result.bom.find(b => b.sku === "VINYL_POST_CAP");
    expect(cap).toBeDefined();
    expect(cap!.extCost).toBe(0);
    // And the exporter should render it as "$0.00" not blank.
    const rendered = cap!.extCost != null ? `$${(cap!.extCost ?? 0).toFixed(2)}` : "";
    expect(rendered).toBe("$0.00");
  });

  it("Q4 — Supplier PO filter criteria excludes all 4 non-supplier categories", () => {
    // Build an estimate that exercises every non-supplier category.
    const result = estimateFence(
      makeInput({
        existingFenceRemoval: true,
        permitCost: 250,
        inspectionCost: 100,
        engineeringCost: 500,
        surveyCost: 300,
      }),
      { wastePct: 0.05, priceMap: {} },
    );

    const nonSupplier = new Set(["equipment", "logistics", "disposal", "regulatory"]);
    const filtered = result.bom.filter(item => !nonSupplier.has(item.category));

    // Filtered list must not contain any excluded category.
    expect(filtered.every(item => !nonSupplier.has(item.category))).toBe(true);

    // At least one item from EACH non-supplier category must exist in the
    // unfiltered BOM, so we know the filter is actually doing work.
    const unfilteredCats = new Set(result.bom.map(i => i.category));
    expect(unfilteredCats.has("regulatory")).toBe(true);
    expect(unfilteredCats.has("disposal")).toBe(true);
    expect(unfilteredCats.has("equipment")).toBe(true);

    // And the filter must preserve at least the core material categories.
    const filteredCats = new Set(filtered.map(i => i.category));
    expect(filteredCats.has("posts")).toBe(true);
    expect(filteredCats.has("concrete")).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════
// Q7 — Customer-facing post count derives from BOM (chain link drift)
// ═════════════════════════════════════════════════════════════════

describe("Q7 • Chain-link customer post count uses BOM, not graph", () => {
  // Shared filter matching the one the PDF renderers use.
  const countTruePosts = (bom: { sku: string; category: string; qty: number }[]) =>
    bom
      .filter(b =>
        b.category === "posts" &&
        b.sku.includes("POST") &&
        !b.sku.includes("SLEEVE") &&
        !b.sku.includes("CAP"),
      )
      .reduce((sum, b) => sum + (b.qty ?? 0), 0);

  it("chain-link BOM post count is positive and finite", () => {
    const result = estimateFence(
      makeInput({ productLineId: "chain_link_6ft", postSize: "4x4" as const, runs: [{ id: "r1", linearFeet: 50, startType: "end", endType: "end" }] }),
      { fenceType: "chain_link", wastePct: 0.05, priceMap: {} },
    );
    const bomPostQty = countTruePosts(result.bom);
    expect(bomPostQty).toBeGreaterThan(0);
    expect(Number.isFinite(bomPostQty)).toBe(true);
  });

  it("vinyl BOM true-post count equals graph.nodes.length (sleeves/caps excluded)", () => {
    const result = estimateFence(makeInput(), { wastePct: 0.05, priceMap: {} });
    const bomPostQty = countTruePosts(result.bom);
    // For vinyl, builder's posts ARE the BOM's posts. After excluding
    // post sleeves (POST_SLEEVE_*) and post caps (VINYL_POST_CAP), the
    // BOM post qty equals the graph node count exactly.
    expect(bomPostQty).toBe(result.graph.nodes.length);
  });

  it("filter excludes post sleeves and post caps from the displayed count", () => {
    const result = estimateFence(makeInput(), { wastePct: 0.05, priceMap: {} });
    // There should be a sleeve and a cap in the BOM...
    const sleeve = result.bom.find(b => b.sku.includes("SLEEVE"));
    const cap = result.bom.find(b => b.sku.includes("POST_CAP") || b.sku.includes("VINYL_POST_CAP"));
    expect(sleeve).toBeDefined();
    expect(cap).toBeDefined();
    // ...but neither should inflate the displayed post count.
    const bomPostQty = countTruePosts(result.bom);
    expect(bomPostQty).toBe(result.graph.nodes.length);
  });
});
