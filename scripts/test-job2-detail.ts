#!/usr/bin/env tsx
// Detailed inspection of Job #2 vinyl picket

import { estimateFence } from "../src/lib/fence-graph/engine";

const job = {
  projectName: "V2",
  productLineId: "vinyl_picket_4ft",
  fenceHeight: 4,
  postSize: "4x4" as const,
  soilType: "clay" as const,
  windMode: false,
  runs: [{ id: "r1", linearFeet: 200, startType: "end" as const, endType: "end" as const, slopeDeg: 0 }],
  gates: [{ id: "g1", afterRunId: "r1", gateType: "double" as const, widthFt: 10 }]
};

try {
  const result = estimateFence(job, {
    fenceType: "vinyl",
    laborRatePerHr: 65,
    wastePct: 0.05,
    priceMap: {}
  });

  console.log("\n=== JOB #2: VINYL PICKET 200LF ===\n");
  console.log("Total:", result.totalCost);
  console.log("Material:", result.totalMaterialCost);
  console.log("Labor:", result.totalLaborCost, `(${result.totalLaborHrs}hrs)`);
  console.log("\n=== AUDIT TRAIL ===\n");
  result.auditTrail.forEach(line => console.log(line));

  console.log("\n=== BOM (Gates and Hardware) ===\n");
  result.bom.filter(item => item.category === "gates" || item.sku.includes("GATE") || item.sku.includes("BRACKET")).forEach(item => {
    console.log(`${item.sku.padEnd(25)} ${item.qty.toString().padStart(4)} × $${item.unitCost.toFixed(2).padStart(6)} = $${item.extCost.toFixed(2).padStart(8)} | ${item.notes}`);
  });

  console.log("\n=== LABOR DRIVERS ===\n");
  result.laborDrivers.forEach(driver => {
    console.log(`${driver.activity.padEnd(30)} ${driver.count.toString().padStart(3)}× ${driver.rateHrs.toFixed(2)}hrs = ${driver.totalHrs.toFixed(1)}hrs`);
  });

} catch (err: any) {
  console.error("ERROR:", err.message);
  console.error(err.stack);
}
