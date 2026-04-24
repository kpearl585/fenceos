#!/usr/bin/env tsx
// Detailed inspection of Job #1 to understand the underbid

import { estimateFence } from "../src/lib/fence-graph/engine";

const job = {
  projectName: "V1",
  productLineId: "vinyl_privacy_6ft",
  fenceHeight: 6,
  postSize: "5x5" as const,
  soilType: "standard" as const,
  windMode: false,
  runs: [{ id: "r1", linearFeet: 150, startType: "end" as const, endType: "end" as const, slopeDeg: 0 }],
  gates: [{ id: "g1", afterRunId: "r1", gateType: "single" as const, widthFt: 4 }]
};

try {
  const result = estimateFence(job, {
    fenceType: "vinyl",
    laborRatePerHr: 65,
    wastePct: 0.05,
    priceMap: {}
  });

  console.log("\n=== JOB #1: VINYL PRIVACY 150LF ===\n");
  console.log("Total:", result.totalCost);
  console.log("Material:", result.totalMaterialCost);
  console.log("Labor:", result.totalLaborCost, `(${result.totalLaborHrs}hrs)`);
  console.log("\n=== AUDIT TRAIL ===\n");
  result.auditTrail.forEach(line => console.log(line));

  console.log("\n=== BOM (Top 10 Items) ===\n");
  result.bom.slice(0, 15).forEach(item => {
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
