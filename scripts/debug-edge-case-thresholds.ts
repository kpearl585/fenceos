#!/usr/bin/env tsx
// Debug edge case detection thresholds

import { estimateFence } from "../src/lib/fence-graph/engine";

// Test Case 2: Pool Gate 100LF
const poolGate = estimateFence({
  projectName: "Pool Gate",
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
  wastePct: 0.05
});

console.log("\n=== POOL GATE 100LF ===");
console.log("Total Cost:", poolGate.totalCost);

const gateBOM = poolGate.bom.filter(item => item.category === "gates" || item.sku.includes("GATE"));
const gateMaterialCost = gateBOM.reduce((s, item) => s + (item.extCost ?? 0), 0);
const gateLabor = poolGate.laborDrivers.filter(d => d.activity.includes("Gate"));
const gateLaborHrs = gateLabor.reduce((s, d) => s + d.totalHrs, 0);
const gateLaborCost = gateLaborHrs * 65;
const gateTotalCost = gateMaterialCost + gateLaborCost;
const gateCostPct = (gateTotalCost / poolGate.totalCost) * 100;

console.log("Gate Material Cost:", gateMaterialCost);
console.log("Gate Labor Cost:", gateLaborCost, `(${gateLaborHrs}hrs)`);
console.log("Gate Total Cost:", gateTotalCost);
console.log("Gate Cost %:", gateCostPct.toFixed(1) + "%");

// Test Case 3: Triple Gates 180LF
const tripleGate = estimateFence({
  projectName: "Triple Gate",
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
  wastePct: 0.05
});

console.log("\n=== TRIPLE GATE 180LF ===");
console.log("Total Cost:", tripleGate.totalCost);
console.log("Total LF:", 180);
console.log("Gate Count:", 3);
console.log("Gate Density:", (3 / 180 * 100).toFixed(1), "gates/100LF");

const gateBOM2 = tripleGate.bom.filter(item => item.category === "gates" || item.sku.includes("GATE"));
const gateMaterialCost2 = gateBOM2.reduce((s, item) => s + (item.extCost ?? 0), 0);
const gateLabor2 = tripleGate.laborDrivers.filter(d => d.activity.includes("Gate"));
const gateLaborHrs2 = gateLabor2.reduce((s, d) => s + d.totalHrs, 0);
const gateLaborCost2 = gateLaborHrs2 * 65;
const gateTotalCost2 = gateMaterialCost2 + gateLaborCost2;
const gateCostPct2 = (gateTotalCost2 / tripleGate.totalCost) * 100;

console.log("Gate Material Cost:", gateMaterialCost2);
console.log("Gate Labor Cost:", gateLaborCost2, `(${gateLaborHrs2}hrs)`);
console.log("Gate Total Cost:", gateTotalCost2);
console.log("Gate Cost %:", gateCostPct2.toFixed(1) + "%");
