#!/usr/bin/env tsx
/**
 * Pre-Launch Audit Script
 *
 * Runs comprehensive tests to validate FenceEstimatePro is ready for launch.
 * Tests revenue accuracy, BOM completeness, edge cases, and failure modes.
 */

import { estimateFence, PRODUCT_LINES } from "../src/lib/fence-graph/engine";
import type { FenceProjectInput, RunInput, GateInput } from "../src/lib/fence-graph/types";

// Use default seed prices for testing
const DEFAULT_PRICES = {
  // Vinyl
  "VINYL_PANEL_6FT": 60,
  "VINYL_PANEL_8FT": 75,
  "VINYL_POST_5X5": 35,
  "VINYL_POST_CAP": 4,
  "VINYL_RAIL_8FT": 18,
  "VINYL_RAIL_BRACKET": 1.25,
  "VINYL_PICKET_6FT": 3.60,
  "VINYL_PICKET_8FT": 4.50,
  "VINYL_U_CHANNEL_8FT": 6.50,
  "POST_SLEEVE_5X5": 11.5,
  "CONCRETE_80LB": 5.75,
  "GRAVEL_40LB": 4.25,
  "ALUM_INSERT": 16.5,
  "REBAR_4_3FT": 7.25,
  "GATE_STOP": 9.5,
  "DROP_ROD": 38,
  "GATE_LATCH_POOL": 42,
  // Wood
  "WOOD_PANEL_6FT": 35,
  "WOOD_PANEL_8FT": 45,
  "WOOD_PICKET_6FT": 3.5,
  "WOOD_PICKET_8FT": 3.5,
  "WOOD_POST_4X4_8": 12,
  "WOOD_POST_4X4_10": 22,
  "WOOD_POST_6X6_8": 22,
  "WOOD_RAIL_2X4_8": 8,
  "WOOD_RAIL_BOT_8": 6,
  "WOOD_HURRICANE_TIE": 0.75,
  "WOOD_CARRIAGE_BOLT": 0.45,
  "POST_CAP_4X4": 3.5,
  "SCREWS_1LB": 6,
  // Chain Link
  "CL_FABRIC_4FT": 1.7,
  "CL_FABRIC_6FT": 2.4,
  "CL_POST_2IN": 22,
  "CL_POST_TERM": 28,
  "CL_TOPRAIL": 0.9,
  "CL_TENSION_WIRE": 20,
  "CL_TENSION_BAR": 4.5,
  "CL_TENSION_BAND": 0.85,
  "CL_BRACE_BAND": 1.2,
  "CL_LOOP_CAP": 0.65,
  "CL_RAIL_END": 2,
  "STAPLES_1LB": 8.5,
  // Gates
  "GATE_VINYL_4FT": 130,
  "GATE_WOOD_4FT": 95,
  "GATE_WOOD_DBL": 280,
  "GATE_CL_4FT": 75,
  "GATE_CL_DBL": 180,
  "HINGE_HD": 18,
  "GATE_LATCH": 12,
  // Aluminum
  "ALUM_PANEL_6FT": 85,
  "ALUM_POST_2X2": 28,
  "ALUM_POST_CAP": 3,
  "ALUM_RAIL_FLAT": 22,
  "ALUM_SET_SCREW": 0.15,
};

console.log("═══════════════════════════════════════════════════════════");
console.log("FENCEESTIMATEPRO PRE-LAUNCH AUDIT");
console.log("═══════════════════════════════════════════════════════════\n");

// ────────────────────────────────────────────────────────────────────
// AUDIT 1: REVENUE ACCURACY
// ────────────────────────────────────────────────────────────────────

console.log("AUDIT 1: REVENUE ACCURACY");
console.log("Running 5 realistic test jobs...\n");

const testJobs: Array<{ name: string; input: FenceProjectInput; fenceType: "vinyl" | "wood" | "chain_link"; expectedRange: { min: number; max: number } }> = [
  {
    name: "Standard Vinyl Privacy Backyard",
    fenceType: "vinyl",
    input: {
      projectName: "Test Job 1",
      productLineId: "vinyl_privacy_6ft",
      fenceHeight: 6,
      postSize: "5x5",
      soilType: "sandy_loam",
      windMode: false,
      runs: [
        { id: "r1", linearFeet: 180, startType: "end", endType: "end", slopeDeg: 0 }
      ],
      gates: [
        { id: "g1", afterRunId: "r1", gateType: "double", widthFt: 12 }
      ]
    },
    expectedRange: { min: 3500, max: 5500 }
  },
  {
    name: "Wood Privacy with Slope",
    fenceType: "wood",
    input: {
      projectName: "Test Job 2",
      productLineId: "wood_privacy_6ft",
      fenceHeight: 6,
      postSize: "4x4",
      soilType: "clay",
      windMode: false,
      runs: [
        { id: "r1", linearFeet: 200, startType: "end", endType: "end", slopeDeg: 10 }
      ],
      gates: [
        { id: "g1", afterRunId: "r1", gateType: "single", widthFt: 4 }
      ]
    },
    expectedRange: { min: 3000, max: 4500 }
  },
  {
    name: "Chain Link Commercial",
    fenceType: "chain_link",
    input: {
      projectName: "Test Job 3",
      productLineId: "chain_link_6ft",
      fenceHeight: 6,
      postSize: "2in",
      soilType: "standard",
      windMode: false,
      runs: [
        { id: "r1", linearFeet: 400, startType: "end", endType: "end", slopeDeg: 0 }
      ],
      gates: [
        { id: "g1", afterRunId: "r1", gateType: "double", widthFt: 16 },
        { id: "g2", afterRunId: "r1", gateType: "double", widthFt: 16 }
      ]
    },
    expectedRange: { min: 3500, max: 5500 }
  },
  {
    name: "Gate-Heavy Multi-Run",
    fenceType: "vinyl",
    input: {
      projectName: "Test Job 4",
      productLineId: "vinyl_privacy_6ft",
      fenceHeight: 6,
      postSize: "5x5",
      soilType: "sandy",
      windMode: false,
      runs: [
        { id: "r1", linearFeet: 100, startType: "end", endType: "corner", slopeDeg: 0 },
        { id: "r2", linearFeet: 80, startType: "corner", endType: "end", slopeDeg: 0 }
      ],
      gates: [
        { id: "g1", afterRunId: "r1", gateType: "single", widthFt: 4 },
        { id: "g2", afterRunId: "r2", gateType: "double", widthFt: 12 },
        { id: "g3", afterRunId: "r2", gateType: "single", widthFt: 4 }
      ]
    },
    expectedRange: { min: 3000, max: 4500 }
  },
  {
    name: "Difficult Conditions (slope + wind + rocky)",
    fenceType: "wood",
    input: {
      projectName: "Test Job 5",
      productLineId: "wood_privacy_6ft",
      fenceHeight: 6,
      postSize: "4x4",
      soilType: "rocky",
      windMode: true,
      runs: [
        { id: "r1", linearFeet: 150, startType: "end", endType: "end", slopeDeg: 15 }
      ],
      gates: [
        { id: "g1", afterRunId: "r1", gateType: "single", widthFt: 4 }
      ]
    },
    expectedRange: { min: 2500, max: 4000 }
  }
];

const results = [];

for (let i = 0; i < testJobs.length; i++) {
  const job = testJobs[i];
  console.log(`[${i + 1}/${testJobs.length}] ${job.name}`);

  try {
    const result = estimateFence(job.input, {
      fenceType: job.fenceType,
      laborRatePerHr: 65,
      wastePct: 0.05,
      priceMap: DEFAULT_PRICES
    });

    const totalLF = job.input.runs.reduce((sum, r) => sum + r.linearFeet, 0);
    const gateCount = job.input.gates.length;
    const costPerFoot = result.totalCost / totalLF;

    const assessment =
      result.totalCost < job.expectedRange.min ? "⚠️  UNDERBID RISK" :
      result.totalCost > job.expectedRange.max ? "⚠️  OVERPRICED" :
      "✅ SAFE";

    console.log(`  Total: $${result.totalCost.toLocaleString()} (${totalLF}ft @ $${costPerFoot.toFixed(2)}/ft)`);
    console.log(`  Material: $${result.totalMaterialCost.toLocaleString()} | Labor: $${result.totalLaborCost.toLocaleString()} (${result.totalLaborHrs}hrs)`);
    console.log(`  Gates: ${gateCount} | BOM items: ${result.bom.length}`);
    console.log(`  ${assessment}\n`);

    results.push({
      job: job.name,
      total: result.totalCost,
      material: result.totalMaterialCost,
      labor: result.totalLaborCost,
      laborHrs: result.totalLaborHrs,
      bomItems: result.bom.length,
      assessment,
      bom: result.bom,
      laborDrivers: result.laborDrivers,
    });

  } catch (error: any) {
    console.log(`  ❌ ERROR: ${error.message}\n`);
    results.push({
      job: job.name,
      error: error.message,
      assessment: "❌ FAILED"
    });
  }
}

console.log("─────────────────────────────────────────────────────────────");
console.log("REVENUE ACCURACY SUMMARY\n");

const safeJobs = results.filter(r => r.assessment === "✅ SAFE").length;
const riskJobs = results.filter(r => r.assessment?.includes("RISK")).length;
const failedJobs = results.filter(r => r.assessment === "❌ FAILED").length;

console.log(`Safe estimates: ${safeJobs}/${testJobs.length}`);
console.log(`Risky estimates: ${riskJobs}/${testJobs.length}`);
console.log(`Failed: ${failedJobs}/${testJobs.length}\n`);

// ────────────────────────────────────────────────────────────────────
// AUDIT 2: BOM COMPLETENESS
// ────────────────────────────────────────────────────────────────────

console.log("\n═══════════════════════════════════════════════════════════");
console.log("AUDIT 2: BOM COMPLETENESS");
console.log("Inspecting 3 representative BOMs...\n");

const bomCheckJobs = [results[0], results[1], results[2]].filter(r => r.bom);

for (const job of bomCheckJobs) {
  if (!job.bom) continue;

  console.log(`${job.job}:`);
  console.log(`  Total BOM items: ${job.bom.length}`);

  const categories = new Set(job.bom.map(item => {
    const sku = item.sku.toLowerCase();
    if (sku.includes("panel")) return "panels";
    if (sku.includes("post")) return "posts";
    if (sku.includes("rail")) return "rails";
    if (sku.includes("gate")) return "gates";
    if (sku.includes("concrete")) return "concrete";
    if (sku.includes("hinge") || sku.includes("latch")) return "hardware";
    if (sku.includes("cap")) return "caps";
    if (sku.includes("bracket") || sku.includes("tie") || sku.includes("bolt") || sku.includes("screw")) return "fasteners";
    if (sku.includes("fabric") || sku.includes("tension") || sku.includes("brace")) return "chain_link_specific";
    return "other";
  }));

  console.log(`  Categories: ${Array.from(categories).join(", ")}`);

  const hasPosts = job.bom.some(item => item.sku.toLowerCase().includes("post") && !item.sku.toLowerCase().includes("cap"));
  const hasPanels = job.bom.some(item => item.sku.toLowerCase().includes("panel") || item.sku.toLowerCase().includes("fabric"));
  const hasConcrete = job.bom.some(item => item.sku.toLowerCase().includes("concrete"));
  const hasGates = job.bom.some(item => item.sku.toLowerCase().includes("gate"));

  console.log(`  ✓ Includes posts: ${hasPosts ? "Yes" : "❌ NO"}`);
  console.log(`  ✓ Includes panels/fabric: ${hasPanels ? "Yes" : "❌ NO"}`);
  console.log(`  ✓ Includes concrete: ${hasConcrete ? "Yes" : "❌ NO"}`);
  console.log(`  ✓ Includes gates: ${hasGates ? "Yes (expected)" : "No (none specified)"}`);

  // Check for zero quantities
  const zeroQty = job.bom.filter(item => item.qty === 0 || item.qty < 0);
  if (zeroQty.length > 0) {
    console.log(`  ⚠️  Items with zero/negative quantity: ${zeroQty.length}`);
  }

  // Check for missing prices
  const noPrices = job.bom.filter(item => !item.unitCost || item.unitCost === 0);
  if (noPrices.length > 0) {
    console.log(`  ⚠️  Items with missing prices: ${noPrices.length}`);
    noPrices.forEach(item => console.log(`     - ${item.sku}`));
  }

  console.log();
}

console.log("─────────────────────────────────────────────────────────────");
console.log("BOM COMPLETENESS SUMMARY\n");
console.log("Could contractor build from these BOMs? Checking...\n");

const buildable = bomCheckJobs.every(job =>
  job.bom &&
  job.bom.length > 0 &&
  job.bom.some(i => i.sku.toLowerCase().includes("post")) &&
  job.bom.some(i => i.sku.toLowerCase().includes("panel") || i.sku.toLowerCase().includes("fabric"))
);

console.log(buildable ? "✅ All BOMs appear buildable" : "❌ Some BOMs missing critical components");

console.log("\n═══════════════════════════════════════════════════════════");
console.log("AUDIT COMPLETE");
console.log("═══════════════════════════════════════════════════════════\n");

console.log("See full results above for details.\n");
