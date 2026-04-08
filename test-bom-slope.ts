// ── Slope Adjustment Test ────────────────────────────────────────
// Test slope material adjustments with a 15° racked fence

import { estimateFence } from "./src/lib/fence-graph/engine";
import type { FenceProjectInput } from "./src/lib/fence-graph/types";

const slopedJob: FenceProjectInput = {
  projectName: "Sloped Vinyl Privacy Fence",
  productLineId: "vinyl_privacy_6ft",
  fenceHeight: 6,
  postSize: "5x5",
  soilType: "clay",
  windMode: false,
  runs: [
    {
      id: "R1",
      linearFeet: 100,
      startType: "end",
      endType: "end",
      slopeDeg: 15, // 15° slope (moderate)
      slopeMethod: "racked",
    },
  ],
  gates: [],
};

console.log("=".repeat(70));
console.log("Slope Adjustment Test - 15° Racked Fence");
console.log("=".repeat(70));
console.log("\nJob: 100 ft 6ft vinyl privacy fence, 15° slope (racked)\n");

const result = estimateFence(slopedJob, {
  fenceType: "vinyl",
  laborRatePerHr: 65,
  wastePct: 0.05,
});

// Also test flat for comparison
const flatJob = { ...slopedJob, runs: [{ ...slopedJob.runs[0], slopeDeg: 0, slopeMethod: "level" as const }] };
const flatResult = estimateFence(flatJob, {
  fenceType: "vinyl",
  laborRatePerHr: 65,
  wastePct: 0.05,
});

console.log("COMPARISON: Flat vs 15° Sloped\n");
console.log("-".repeat(70));
console.log("Material".padEnd(40) + "Flat".padEnd(15) + "15° Slope".padEnd(15) + "Diff");
console.log("-".repeat(70));

const materials = ["VINYL_PICKET_6FT", "VINYL_U_CHANNEL_8FT", "CONCRETE_80LB"];
materials.forEach(sku => {
  const flatItem = flatResult.bom.find(i => i.sku === sku);
  const slopeItem = result.bom.find(i => i.sku === sku);
  if (flatItem && slopeItem) {
    const diff = slopeItem.qty - flatItem.qty;
    const pctDiff = ((diff / flatItem.qty) * 100).toFixed(1);
    console.log(
      flatItem.name.substring(0, 38).padEnd(40) +
      flatItem.qty.toString().padEnd(15) +
      slopeItem.qty.toString().padEnd(15) +
      `+${diff} (+${pctDiff}%)`
    );
  }
});

console.log("\n" + "=".repeat(70));
console.log("\n✅ Slope Adjustment Validation:\n");

const picketIncrease = result.bom.find(i => i.sku === "VINYL_PICKET_6FT")!.qty /
                       flatResult.bom.find(i => i.sku === "VINYL_PICKET_6FT")!.qty - 1;

console.log(`Picket increase: ${(picketIncrease * 100).toFixed(1)}%`);
console.log(`Expected for 15° slope: ~3.5% (1/cos(15°) - 1 = 3.5%)`);
console.log(`Status: ${Math.abs(picketIncrease * 100 - 3.5) < 1 ? "✅ CORRECT" : "⚠️  CHECK MATH"}`);

const concreteIncrease = result.bom.find(i => i.sku === "CONCRETE_80LB")!.qty /
                         flatResult.bom.find(i => i.sku === "CONCRETE_80LB")!.qty - 1;

console.log(`\nConcrete increase: ${(concreteIncrease * 100).toFixed(1)}%`);
console.log(`Expected: ~10% (flat already has 25% waste, slope adds 10% more)`);
console.log(`Math: (base × 1.10 slope × 1.25 waste) / (base × 1.25 waste) = 1.10`);
console.log(`Status: ${Math.abs(concreteIncrease * 100 - 10) < 2 ? "✅ CORRECT" : "⚠️  CHECK MATH"}`);

console.log("\n" + "=".repeat(70));
