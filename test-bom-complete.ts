// ── BOM Completion Sprint Test ───────────────────────────────────
// Test the 5 critical fixes with the sample job:
// "180 ft 6ft vinyl privacy fence with 1 double gate"

import { estimateFence } from "./src/lib/fence-graph/engine";
import type { FenceProjectInput } from "./src/lib/fence-graph/types";

const sampleJob: FenceProjectInput = {
  projectName: "Sample Vinyl Privacy Fence",
  productLineId: "vinyl_privacy_6ft",
  fenceHeight: 6,
  postSize: "5x5",
  soilType: "clay",
  windMode: false,
  runs: [
    {
      id: "R1",
      linearFeet: 176, // 180 - 4 for gate = 176ft run
      startType: "end",
      endType: "gate",
      slopeDeg: 0, // Flat ground
      slopeMethod: "level",
    },
  ],
  gates: [
    {
      id: "G1",
      afterRunId: "R1",
      gateType: "double",
      widthFt: 4, // 4ft clear opening
      isPoolGate: false,
    },
  ],
};

console.log("=".repeat(70));
console.log("FenceEstimatePro - BOM Completion Sprint Test");
console.log("=".repeat(70));
console.log("\nSample Job:");
console.log("- 180 ft 6ft vinyl privacy fence");
console.log("- 1 double gate (4ft opening)");
console.log("- Post size: 5x5");
console.log("- Soil: clay");
console.log("- Wind mode: no");
console.log("- Slope: flat (0°)");
console.log("\n" + "=".repeat(70));

const result = estimateFence(sampleJob, {
  fenceType: "vinyl",
  laborRatePerHr: 65,
  wastePct: 0.05,
  // priceMap is now optional - will use defaults
});

console.log("\n📊 BILL OF MATERIALS\n");
console.log("Category".padEnd(20) + "Item".padEnd(50) + "Qty".padEnd(10) + "Unit".padEnd(8) + "Cost");
console.log("-".repeat(110));

let currentCategory = "";
for (const item of result.bom) {
  if (item.category !== currentCategory) {
    console.log();
    currentCategory = item.category;
  }
  const cost = item.extCost ? `$${item.extCost.toFixed(2)}` : "$0.00";
  console.log(
    item.category.padEnd(20) +
    item.name.padEnd(50) +
    item.qty.toString().padEnd(10) +
    item.unit.padEnd(8) +
    cost
  );
}

console.log("\n" + "=".repeat(110));
console.log("\n💰 COST SUMMARY\n");
console.log(`Materials:     $${result.totalMaterialCost.toFixed(2)}`);
console.log(`Labor:         $${result.totalLaborCost.toFixed(2)} (${result.totalLaborHrs.toFixed(1)} hrs × $65/hr)`);
console.log(`TOTAL:         $${result.totalCost.toFixed(2)}`);

console.log("\n" + "=".repeat(70));
console.log("\n📋 AUDIT TRAIL\n");
result.graph.audit.auditTrail?.forEach((entry, i) => {
  console.log(`${i + 1}. ${entry}`);
});

console.log("\n" + "=".repeat(70));
console.log("\n✅ TEST VALIDATION\n");

const validations = [
  {
    name: "Default pricing works",
    check: result.totalMaterialCost > 0,
    expected: "Material cost > $0",
  },
  {
    name: "Component-level materials included",
    check: result.bom.some(item => item.sku.includes("PICKET") || item.sku.includes("U_CHANNEL")),
    expected: "Pickets or U-channel in BOM",
  },
  {
    name: "Post sleeves included",
    check: result.bom.some(item => item.sku.includes("SLEEVE")),
    expected: "Post sleeves in BOM",
  },
  {
    name: "Complete gate hardware",
    check: result.bom.some(item => item.sku === "DROP_ROD") && result.bom.some(item => item.sku === "GATE_STOP"),
    expected: "Drop rod and gate stops in BOM",
  },
  {
    name: "Concrete has realistic waste",
    check: result.bom.find(item => item.sku === "CONCRETE_80LB")?.qty! > 63, // Should be >63 with 25% waste
    expected: "Concrete bags > 63 (with waste factor)",
  },
  {
    name: "Gate dimensions standardized",
    check: result.graph.edges.some(e => e.gateSpec?.openingWidth_in === 48), // 4ft = 48"
    expected: "Gate spec shows 48\" opening width",
  },
];

validations.forEach(({ name, check, expected }) => {
  const status = check ? "✅ PASS" : "❌ FAIL";
  console.log(`${status} - ${name}`);
  if (!check) {
    console.log(`    Expected: ${expected}`);
  }
});

const passedCount = validations.filter(v => v.check).length;
console.log(`\n${passedCount}/${validations.length} validations passed`);

if (passedCount === validations.length) {
  console.log("\n🎉 ALL CRITICAL FIXES IMPLEMENTED SUCCESSFULLY!");
} else {
  console.log("\n⚠️  Some validations failed - review implementation");
}

console.log("\n" + "=".repeat(70));
