#!/usr/bin/env tsx
/**
 * Board-on-Board Calculation Test
 * Validates overlap-based picket counting vs gap-based counting
 */

import { estimateFence } from "../src/lib/fence-graph/engine";

console.log("═══════════════════════════════════════════════════════════");
console.log("BOARD-ON-BOARD CALCULATION TEST");
console.log("═══════════════════════════════════════════════════════════\n");

// ── TEST 1: Standard Picket (Gap-Based) ──
console.log("TEST 1: Standard Wood Picket Fence (Gap-Based)\n");

const standardPicket = estimateFence({
  projectName: "Standard Picket Test",
  productLineId: "wood_picket_4ft",
  fenceHeight: 4,
  postSize: "4x4" as const,
  soilType: "standard" as const,
  windMode: false,
  runs: [{ id: "r1", linearFeet: 100, startType: "end" as const, endType: "end" as const, slopeDeg: 0 }],
  gates: []
}, {
  fenceType: "wood",
  woodStyle: "picket",
  laborRatePerHr: 65,
  wastePct: 0.05,
  priceMap: {}
});

console.log("Total Cost:", standardPicket.totalCost);
console.log("Material Cost:", standardPicket.totalMaterialCost);
console.log("Labor Cost:", standardPicket.totalLaborCost);
console.log("Labor Hours:", standardPicket.totalLaborHrs);

// Find picket item in BOM
const picketItem = standardPicket.bom.find(item =>
  item.sku.includes("WOOD_PICKET") || item.name.includes("Picket")
);

if (picketItem) {
  console.log("\nPicket Details:");
  console.log("  SKU:", picketItem.sku);
  console.log("  Quantity:", picketItem.qty);
  console.log("  Notes:", picketItem.notes);
  console.log("  Expected: 100 LF × 3 pickets/ft = ~315 pickets (with 5% waste)");
}

console.log("\n═══════════════════════════════════════════════════════════\n");

// ── TEST 2: Board-on-Board (Overlap-Based) ──
console.log("TEST 2: Board-on-Board Wood Fence (Overlap-Based)\n");

const boardOnBoard = estimateFence({
  projectName: "Board-on-Board Test",
  productLineId: "wood_privacy_6ft", // 6ft height
  fenceHeight: 6,
  postSize: "4x4" as const,
  soilType: "standard" as const,
  windMode: false,
  runs: [{ id: "r1", linearFeet: 100, startType: "end" as const, endType: "end" as const, slopeDeg: 0 }],
  gates: []
}, {
  fenceType: "wood",
  woodStyle: "board_on_board",
  laborRatePerHr: 65,
  wastePct: 0.05,
  priceMap: {}
});

console.log("Total Cost:", boardOnBoard.totalCost);
console.log("Material Cost:", boardOnBoard.totalMaterialCost);
console.log("Labor Cost:", boardOnBoard.totalLaborCost);
console.log("Labor Hours:", boardOnBoard.totalLaborHrs);

// Find board item in BOM
const boardItem = boardOnBoard.bom.find(item =>
  item.sku.includes("WOOD_PICKET") || item.name.includes("Board")
);

if (boardItem) {
  console.log("\nBoard Details:");
  console.log("  SKU:", boardItem.sku);
  console.log("  Quantity:", boardItem.qty);
  console.log("  Notes:", boardItem.notes);

  // Calculate expected using overlap formula
  const lengthInches = 100 * 12; // 1200 inches
  const picketWidth = 5.5; // 1×6 actual width
  const overlapPct = 0.24;
  const overlap = picketWidth * overlapPct; // ~1.32 inches

  const frontCount = Math.ceil((lengthInches - picketWidth) / (picketWidth - overlap) + 1);
  const frontWithWaste = Math.ceil(frontCount * 1.05);
  const total = frontWithWaste * 2; // Front + back

  console.log("\n  Expected Calculation:");
  console.log(`    Length: ${lengthInches}" (100 LF)`);
  console.log(`    Picket Width: ${picketWidth}"`);
  console.log(`    Overlap: ${overlap.toFixed(2)}" (${(overlapPct * 100).toFixed(0)}% of width)`);
  console.log(`    Effective Coverage: ${(picketWidth - overlap).toFixed(2)}" per board`);
  console.log(`    Front Boards: ${frontCount} (no waste)`);
  console.log(`    Front Boards: ${frontWithWaste} (with 5% waste)`);
  console.log(`    Total Boards: ${total} (front + back)`);
  console.log(`    Actual from BOM: ${boardItem.qty}`);
  console.log(`    Match: ${boardItem.qty === total ? '✅ YES' : '❌ NO'}`);
}

console.log("\n═══════════════════════════════════════════════════════════\n");

// ── TEST 3: Comparison ──
console.log("TEST 3: Material & Labor Comparison\n");

console.log("Standard Picket (100 LF):");
console.log(`  Pickets: ${picketItem?.qty || 'N/A'}`);
console.log(`  Labor: ${standardPicket.totalLaborHrs}hrs`);
console.log(`  Material: $${standardPicket.totalMaterialCost}`);
console.log(`  Total: $${standardPicket.totalCost}`);

console.log("\nBoard-on-Board (100 LF):");
console.log(`  Boards: ${boardItem?.qty || 'N/A'}`);
console.log(`  Labor: ${boardOnBoard.totalLaborHrs}hrs`);
console.log(`  Material: $${boardOnBoard.totalMaterialCost}`);
console.log(`  Total: $${boardOnBoard.totalCost}`);

if (picketItem && boardItem) {
  const materialRatio = boardItem.qty / picketItem.qty;
  const laborRatio = boardOnBoard.totalLaborHrs / standardPicket.totalLaborHrs;

  console.log("\nRatios (Board-on-Board vs Standard Picket):");
  console.log(`  Material Count: ${materialRatio.toFixed(2)}× (${((materialRatio - 1) * 100).toFixed(1)}% more)`);
  console.log(`  Labor Hours: ${laborRatio.toFixed(2)}× (${((laborRatio - 1) * 100).toFixed(1)}% more)`);
  console.log(`  Total Cost: ${(boardOnBoard.totalCost / standardPicket.totalCost).toFixed(2)}×`);
}

console.log("\n═══════════════════════════════════════════════════════════\n");

// ── TEST 4: Audit Trail Verification ──
console.log("TEST 4: Audit Trail Verification\n");

console.log("Board-on-Board Audit Trail:");
boardOnBoard.auditTrail
  .filter(line =>
    line.includes("Board-on-board") ||
    line.includes("Overlap") ||
    line.includes("Pricing Class")
  )
  .forEach(line => console.log(`  ${line}`));

console.log("\n═══════════════════════════════════════════════════════════\n");

// ── TEST 5: Regression Check - Existing Picket Jobs ──
console.log("TEST 5: Regression Check - Existing Picket Jobs Should Not Change\n");

const existingPicketJob = estimateFence({
  projectName: "Existing Picket (From Validation)",
  productLineId: "wood_picket_4ft",
  fenceHeight: 4,
  postSize: "4x4" as const,
  soilType: "clay" as const,
  windMode: false,
  runs: [{ id: "r1", linearFeet: 220, startType: "end" as const, endType: "end" as const, slopeDeg: 0 }],
  gates: [{ id: "g1", afterRunId: "r1", gateType: "double" as const, widthFt: 10 }]
}, {
  fenceType: "wood",
  woodStyle: "picket",
  laborRatePerHr: 65,
  wastePct: 0.05,
  priceMap: {}
});

console.log("Wood Picket 220LF (Job #5 from validation):");
console.log(`  Total Cost: $${existingPicketJob.totalCost}`);
console.log(`  Expected: ~$6,168 (from validation suite)`);
console.log(`  Match: ${Math.abs(existingPicketJob.totalCost - 6168) < 10 ? '✅ YES (within $10)' : '❌ NO - REGRESSION!'}`);

console.log("\n═══════════════════════════════════════════════════════════\n");
console.log("BOARD-ON-BOARD TEST COMPLETE");
console.log("═══════════════════════════════════════════════════════════\n");
