#!/usr/bin/env tsx
/**
 * Detailed Calibration Analysis
 *
 * Breaks down the 5 audit jobs to identify overpricing sources
 */

import { estimateFence } from "../src/lib/fence-graph/engine";
import type { FenceProjectInput } from "../src/lib/fence-graph/types";

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

const jobs = [
  {
    name: "Standard Vinyl Privacy Backyard",
    expectedRange: { min: 3500, max: 5500 },
    fenceType: "vinyl" as const,
    input: {
      projectName: "Test Job 1",
      productLineId: "vinyl_privacy_6ft",
      fenceHeight: 6,
      postSize: "5x5" as const,
      soilType: "sandy_loam" as const,
      windMode: false,
      runs: [
        { id: "r1", linearFeet: 180, startType: "end" as const, endType: "end" as const, slopeDeg: 0 }
      ],
      gates: [
        { id: "g1", afterRunId: "r1", gateType: "double" as const, widthFt: 12 }
      ]
    }
  },
  {
    name: "Wood Privacy with Slope",
    expectedRange: { min: 3000, max: 4500 },
    fenceType: "wood" as const,
    input: {
      projectName: "Test Job 2",
      productLineId: "wood_privacy_6ft",
      fenceHeight: 6,
      postSize: "4x4" as const,
      soilType: "clay" as const,
      windMode: false,
      runs: [
        { id: "r1", linearFeet: 200, startType: "end" as const, endType: "end" as const, slopeDeg: 10 }
      ],
      gates: [
        { id: "g1", afterRunId: "r1", gateType: "single" as const, widthFt: 4 }
      ]
    }
  },
  {
    name: "Chain Link Commercial",
    expectedRange: { min: 3500, max: 5500 },
    fenceType: "chain_link" as const,
    input: {
      projectName: "Test Job 3",
      productLineId: "chain_link_6ft",
      fenceHeight: 6,
      postSize: "2in" as const,
      soilType: "standard" as const,
      windMode: false,
      runs: [
        { id: "r1", linearFeet: 400, startType: "end" as const, endType: "end" as const, slopeDeg: 0 }
      ],
      gates: [
        { id: "g1", afterRunId: "r1", gateType: "double" as const, widthFt: 16 },
        { id: "g2", afterRunId: "r1", gateType: "double" as const, widthFt: 16 }
      ]
    }
  },
  {
    name: "Gate-Heavy Multi-Run",
    expectedRange: { min: 3000, max: 4500 },
    fenceType: "vinyl" as const,
    input: {
      projectName: "Test Job 4",
      productLineId: "vinyl_privacy_6ft",
      fenceHeight: 6,
      postSize: "5x5" as const,
      soilType: "sandy" as const,
      windMode: false,
      runs: [
        { id: "r1", linearFeet: 100, startType: "end" as const, endType: "corner" as const, slopeDeg: 0 },
        { id: "r2", linearFeet: 80, startType: "corner" as const, endType: "end" as const, slopeDeg: 0 }
      ],
      gates: [
        { id: "g1", afterRunId: "r1", gateType: "single" as const, widthFt: 4 },
        { id: "g2", afterRunId: "r2", gateType: "double" as const, widthFt: 12 },
        { id: "g3", afterRunId: "r2", gateType: "single" as const, widthFt: 4 }
      ]
    }
  },
  {
    name: "Difficult Conditions (slope + wind + rocky)",
    expectedRange: { min: 2500, max: 4000 },
    fenceType: "wood" as const,
    input: {
      projectName: "Test Job 5",
      productLineId: "wood_privacy_6ft",
      fenceHeight: 6,
      postSize: "4x4" as const,
      soilType: "rocky" as const,
      windMode: true,
      runs: [
        { id: "r1", linearFeet: 150, startType: "end" as const, endType: "end" as const, slopeDeg: 15 }
      ],
      gates: [
        { id: "g1", afterRunId: "r1", gateType: "single" as const, widthFt: 4 }
      ]
    }
  }
];

console.log("═══════════════════════════════════════════════════════════");
console.log("DETAILED CALIBRATION ANALYSIS");
console.log("═══════════════════════════════════════════════════════════\n");

for (let i = 0; i < jobs.length; i++) {
  const job = jobs[i];
  const totalLF = job.input.runs.reduce((s, r) => s + r.linearFeet, 0);
  const gateCount = job.input.gates.length;

  console.log(`\n[${ i + 1}/5] ${job.name}`);
  console.log(`  Linear Feet: ${totalLF} | Gates: ${gateCount} | Type: ${job.fenceType}`);
  console.log(`  Expected Range: $${job.expectedRange.min.toLocaleString()} - $${job.expectedRange.max.toLocaleString()}`);

  try {
    const result = estimateFence(job.input, {
      fenceType: job.fenceType,
      laborRatePerHr: 65,
      wastePct: 0.05,
      priceMap: DEFAULT_PRICES
    });

    const costPerFoot = result.totalCost / totalLF;
    const assessment =
      result.totalCost < job.expectedRange.min ? "⚠️  UNDERBID RISK" :
      result.totalCost > job.expectedRange.max ? "⚠️  OVERPRICED" :
      "✅ SAFE";

    console.log(`\n  TOTALS:`);
    console.log(`    Total: $${result.totalCost.toLocaleString()} (@ $${costPerFoot.toFixed(2)}/ft)`);
    console.log(`    Material: $${result.totalMaterialCost.toLocaleString()}`);
    console.log(`    Labor: $${result.totalLaborCost.toLocaleString()} (${result.totalLaborHrs}hrs @ $65/hr)`);
    console.log(`    Assessment: ${assessment}`);

    // Calculate gate cost contribution
    const gateBomItems = result.bom.filter(item =>
      item.sku.includes("GATE") || item.sku.includes("HINGE") ||
      item.sku.includes("LATCH") || item.sku.includes("DROP_ROD") ||
      item.sku.includes("GATE_STOP")
    );
    const gateMaterialCost = gateBomItems.reduce((s, item) => s + (item.extCost || 0), 0);

    const gateLabor = result.laborDrivers.find(d => d.activity.includes("Gate"));
    const gateLaborCost = gateLabor ? gateLabor.totalHrs * 65 : 0;
    const totalGateCost = gateMaterialCost + gateLaborCost;

    console.log(`\n  GATE CONTRIBUTION:`);
    console.log(`    Material: $${gateMaterialCost.toLocaleString()}`);
    console.log(`    Labor: $${gateLaborCost.toLocaleString()} (${gateLabor?.totalHrs || 0}hrs)`);
    console.log(`    Total: $${totalGateCost.toLocaleString()} (${((totalGateCost / result.totalCost) * 100).toFixed(1)}% of total)`);

    // Labor breakdown
    console.log(`\n  LABOR BREAKDOWN:`);
    console.log(`    Total Labor Hours: ${result.totalLaborHrs}hrs (${(result.totalLaborHrs / totalLF * 10).toFixed(2)}hrs per 10 LF)`);
    for (const driver of result.laborDrivers) {
      const pct = (driver.totalHrs / result.totalLaborHrs * 100).toFixed(0);
      console.log(`      ${driver.activity}: ${driver.totalHrs}hrs (${pct}%)`);
    }

    // Top 5 material cost items
    const topItems = [...result.bom]
      .sort((a, b) => (b.extCost || 0) - (a.extCost || 0))
      .slice(0, 5);

    console.log(`\n  TOP 5 MATERIAL COSTS:`);
    for (const item of topItems) {
      const pct = ((item.extCost || 0) / result.totalMaterialCost * 100).toFixed(1);
      console.log(`    ${item.sku}: $${(item.extCost || 0).toLocaleString()} (${pct}%) - ${item.qty} @ $${item.unitCost}`);
    }

    // Hidden cost flags
    const concreteItem = result.bom.find(item => item.sku.includes("CONCRETE"));
    const concreteMultiplier = job.input.soilType === "sandy" ? "×1.5" :
                                job.input.soilType === "sandy_loam" ? "×1.25" :
                                job.input.soilType === "wet" ? "×1.75" : "×1.0";

    console.log(`\n  HIDDEN COST FACTORS:`);
    console.log(`    Soil Type: ${job.input.soilType} (concrete ${concreteMultiplier})`);
    console.log(`    Slope: ${job.input.runs.some(r => r.slopeDeg > 0) ? `Yes (max ${Math.max(...job.input.runs.map(r => r.slopeDeg))}°)` : "No"}`);
    console.log(`    Wind Mode: ${job.input.windMode ? "Yes (rebar reinforcement)" : "No"}`);

  } catch (error: any) {
    console.log(`  ❌ ERROR: ${error.message}`);
  }
}

console.log("\n═══════════════════════════════════════════════════════════");
console.log("END ANALYSIS");
console.log("═══════════════════════════════════════════════════════════\n");
