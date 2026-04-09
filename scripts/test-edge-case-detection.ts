#!/usr/bin/env tsx
// Test edge case detection system

import { estimateFence } from "../src/lib/fence-graph/engine";

console.log("═══════════════════════════════════════════════════════════");
console.log("EDGE CASE DETECTION TEST");
console.log("═══════════════════════════════════════════════════════════\n");

// Test Case 1: Long Run Economics (Vinyl 500LF)
console.log("TEST 1: Long Run Economics (Vinyl 500LF)\n");

const longRun = estimateFence({
  projectName: "Long Run Test",
  productLineId: "vinyl_privacy_6ft",
  fenceHeight: 6,
  postSize: "5x5" as const,
  soilType: "standard" as const,
  windMode: false,
  runs: [{ id: "r1", linearFeet: 500, startType: "end" as const, endType: "end" as const, slopeDeg: 0 }],
  gates: [{ id: "g1", afterRunId: "r1", gateType: "single" as const, widthFt: 4 }]
}, {
  fenceType: "vinyl",
  laborRatePerHr: 65,
  wastePct: 0.05,
  priceMap: {}
});

console.log("Total Cost:", longRun.totalCost);
console.log("Edge Case Flags:", longRun.edgeCaseFlags?.length ?? 0);
if (longRun.edgeCaseFlags) {
  for (const flag of longRun.edgeCaseFlags) {
    console.log(`\n  Type: ${flag.type}`);
    console.log(`  Severity: ${flag.severity}`);
    console.log(`  Message: ${flag.message}`);
  }
}

console.log("\n═══════════════════════════════════════════════════════════\n");

// Test Case 2: Gate-Dominant Short Run
console.log("TEST 2: Gate-Dominant Short Run (100LF Pool Gate)\n");

const gateDominant = estimateFence({
  projectName: "Pool Gate Test",
  productLineId: "vinyl_privacy_6ft",
  fenceHeight: 6,
  postSize: "5x5" as const,
  soilType: "standard" as const,
  windMode: false,
  runs: [{ id: "r1", linearFeet: 100, startType: "end" as const, endType: "end" as const, slopeDeg: 0 }],
  gates: [{ id: "g1", afterRunId: "r1", gateType: "single" as const, widthFt: 4, poolCode: true }]
}, {
  fenceType: "vinyl",
  laborRatePerHr: 65,
  wastePct: 0.05,
  priceMap: {}
});

console.log("Total Cost:", gateDominant.totalCost);
console.log("Edge Case Flags:", gateDominant.edgeCaseFlags?.length ?? 0);
if (gateDominant.edgeCaseFlags) {
  for (const flag of gateDominant.edgeCaseFlags) {
    console.log(`\n  Type: ${flag.type}`);
    console.log(`  Severity: ${flag.severity}`);
    console.log(`  Message: ${flag.message}`);
  }
}

console.log("\n═══════════════════════════════════════════════════════════\n");

// Test Case 3: Ultra-High Gate Density
console.log("TEST 3: Ultra-High Gate Density (3 gates in 180LF)\n");

const highGateDensity = estimateFence({
  projectName: "Triple Gate Test",
  productLineId: "wood_privacy_6ft",
  fenceHeight: 6,
  postSize: "4x4" as const,
  soilType: "sandy" as const,
  windMode: false,
  runs: [
    { id: "r1", linearFeet: 60, startType: "end" as const, endType: "corner" as const, slopeDeg: 0 },
    { id: "r2", linearFeet: 60, startType: "corner" as const, endType: "corner" as const, slopeDeg: 0 },
    { id: "r3", linearFeet: 60, startType: "corner" as const, endType: "end" as const, slopeDeg: 0 }
  ],
  gates: [
    { id: "g1", afterRunId: "r1", gateType: "single" as const, widthFt: 4 },
    { id: "g2", afterRunId: "r2", gateType: "single" as const, widthFt: 4 },
    { id: "g3", afterRunId: "r3", gateType: "single" as const, widthFt: 4 }
  ]
}, {
  fenceType: "wood",
  laborRatePerHr: 65,
  wastePct: 0.05,
  priceMap: {}
});

console.log("Total Cost:", highGateDensity.totalCost);
console.log("Edge Case Flags:", highGateDensity.edgeCaseFlags?.length ?? 0);
if (highGateDensity.edgeCaseFlags) {
  for (const flag of highGateDensity.edgeCaseFlags) {
    console.log(`\n  Type: ${flag.type}`);
    console.log(`  Severity: ${flag.severity}`);
    console.log(`  Message: ${flag.message}`);
  }
}

console.log("\n═══════════════════════════════════════════════════════════\n");

// Test Case 4: Normal Job (No Edge Cases)
console.log("TEST 4: Normal Job (No Edge Cases Expected)\n");

const normalJob = estimateFence({
  projectName: "Normal Test",
  productLineId: "vinyl_privacy_6ft",
  fenceHeight: 6,
  postSize: "5x5" as const,
  soilType: "standard" as const,
  windMode: false,
  runs: [{ id: "r1", linearFeet: 150, startType: "end" as const, endType: "end" as const, slopeDeg: 0 }],
  gates: [{ id: "g1", afterRunId: "r1", gateType: "single" as const, widthFt: 4 }]
}, {
  fenceType: "vinyl",
  laborRatePerHr: 65,
  wastePct: 0.05,
  priceMap: {}
});

console.log("Total Cost:", normalJob.totalCost);
console.log("Edge Case Flags:", normalJob.edgeCaseFlags?.length ?? 0);
if (normalJob.edgeCaseFlags) {
  for (const flag of normalJob.edgeCaseFlags) {
    console.log(`\n  Type: ${flag.type}`);
    console.log(`  Severity: ${flag.severity}`);
    console.log(`  Message: ${flag.message}`);
  }
} else {
  console.log("  ✅ No edge cases detected (as expected)");
}

console.log("\n═══════════════════════════════════════════════════════════\n");
console.log("EDGE CASE DETECTION TEST COMPLETE");
console.log("═══════════════════════════════════════════════════════════\n");
