#!/usr/bin/env tsx
// Quick test of gate pricing engine integration

import { buildFenceGraph } from "../src/lib/fence-graph/builder";
import { estimateFence } from "../src/lib/fence-graph/estimator";

const testJob = {
  projectName: "Gate Test",
  productLineId: "VINYL_PRIVACY_WHITE_6FT",
  fenceHeight: 72,
  postSize: "5x5" as const,
  soilType: "standard" as const,
  windMode: false,
  runs: [
    { id: "R1", linearFeet: 100, startType: "end" as const, endType: "end" as const, slopeDeg: 0 }
  ],
  gates: [
    { runId: "R1", positionLF: 50, gateType: "single" as const, openingWidth_in: 48, isPoolGate: false }
  ]
};

try {
  const graph = buildFenceGraph(testJob);
  const estimate = estimateFence(graph);

  console.log("✅ Gate pricing engine test PASSED");
  console.log(`Total: $${estimate.total.toFixed(2)}`);
  console.log(`Labor Hours: ${estimate.totalLaborHours.toFixed(1)}`);
  console.log(`Gates: ${testJob.gates.length}`);
} catch (err) {
  console.error("❌ Gate pricing engine test FAILED");
  console.error(err);
  process.exit(1);
}
