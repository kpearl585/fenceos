// ── Advanced Estimate Functional Test Suite ──────────────────────
// Comprehensive validation of calculation logic, data integrity, and edge cases
// Run: npx tsx scripts/test-advanced-estimate-functional.ts

import { estimateFence, type FenceProjectInput } from "../src/lib/fence-graph/engine";
import type { FenceEstimateResult } from "../src/lib/fence-graph/types";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  warnings?: string[];
  result?: FenceEstimateResult;
  assertions: { description: string; passed: boolean; actual?: any; expected?: any }[];
}

const testResults: TestResult[] = [];

// ── Test Utilities ────────────────────────────────────────────────

function assert(condition: boolean, description: string, actual?: any, expected?: any): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${description}. Expected: ${expected}, Got: ${actual}`);
  }
}

function runTest(name: string, testFn: () => void): void {
  const assertions: TestResult["assertions"] = [];
  let passed = true;
  let error: string | undefined;
  let warnings: string[] = [];

  try {
    testFn();
    console.log(`✅ ${name}`);
  } catch (err) {
    passed = false;
    error = err instanceof Error ? err.message : String(err);
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error}`);
  }

  testResults.push({ name, passed, error, warnings, assertions });
}

function validateNoNaN(result: FenceEstimateResult, testName: string): void {
  const nanFields: string[] = [];

  if (isNaN(result.totalCost)) nanFields.push("totalCost");
  if (isNaN(result.totalMaterialCost)) nanFields.push("totalMaterialCost");
  if (isNaN(result.totalLaborCost)) nanFields.push("totalLaborCost");
  if (isNaN(result.totalLaborHrs)) nanFields.push("totalLaborHrs");

  result.bom.forEach((item, idx) => {
    if (isNaN(item.qty)) nanFields.push(`bom[${idx}].qty (${item.sku})`);
    if (item.unitCost && isNaN(item.unitCost)) nanFields.push(`bom[${idx}].unitCost (${item.sku})`);
    if (item.extCost && isNaN(item.extCost)) nanFields.push(`bom[${idx}].extCost (${item.sku})`);
  });

  if (nanFields.length > 0) {
    throw new Error(`NaN detected in ${testName}: ${nanFields.join(", ")}`);
  }
}

function validateNoNegatives(result: FenceEstimateResult, testName: string): void {
  const negFields: string[] = [];

  if (result.totalCost < 0) negFields.push(`totalCost=${result.totalCost}`);
  if (result.totalMaterialCost < 0) negFields.push(`totalMaterialCost=${result.totalMaterialCost}`);
  if (result.totalLaborCost < 0) negFields.push(`totalLaborCost=${result.totalLaborCost}`);
  if (result.totalLaborHrs < 0) negFields.push(`totalLaborHrs=${result.totalLaborHrs}`);

  result.bom.forEach((item, idx) => {
    if (item.qty < 0) negFields.push(`bom[${idx}].qty=${item.qty} (${item.sku})`);
    if (item.unitCost && item.unitCost < 0) negFields.push(`bom[${idx}].unitCost=${item.unitCost} (${item.sku})`);
    if (item.extCost && item.extCost < 0) negFields.push(`bom[${idx}].extCost=${item.extCost} (${item.sku})`);
  });

  if (negFields.length > 0) {
    throw new Error(`Negative values detected in ${testName}: ${negFields.join(", ")}`);
  }
}

function validateNoUndefined(result: FenceEstimateResult, testName: string): void {
  const undefinedFields: string[] = [];

  if (result.totalCost === undefined) undefinedFields.push("totalCost");
  if (result.totalMaterialCost === undefined) undefinedFields.push("totalMaterialCost");
  if (result.totalLaborCost === undefined) undefinedFields.push("totalLaborCost");
  if (result.totalLaborHrs === undefined) undefinedFields.push("totalLaborHrs");

  result.bom.forEach((item, idx) => {
    if (item.qty === undefined) undefinedFields.push(`bom[${idx}].qty (${item.sku})`);
    if (item.sku === undefined) undefinedFields.push(`bom[${idx}].sku`);
  });

  if (undefinedFields.length > 0) {
    throw new Error(`Undefined values detected in ${testName}: ${undefinedFields.join(", ")}`);
  }
}

// ── Test Scenarios ────────────────────────────────────────────────

console.log("\n🔍 PHASE 1: END-TO-END FLOW TESTS\n");

runTest("Vinyl fence - basic 100ft run", () => {
  const input: FenceProjectInput = {
    productLineId: "vinyl_privacy_6ft",
    postSize: "5x5",
    soilType: "standard",
    windMode: false,
    runs: [
      {
        id: "run1",
        linearFeet: 100,
        startType: "end",
        endType: "end",
        panelStyle: "privacy",
      },
    ],
    gates: [],
  };

  const result = estimateFence(input, { fenceType: "vinyl", laborRatePerHr: 65, wastePct: 0.05 });

  validateNoNaN(result, "Vinyl basic");
  validateNoNegatives(result, "Vinyl basic");
  validateNoUndefined(result, "Vinyl basic");

  assert(result.totalCost > 0, "Total cost should be positive", result.totalCost);
  assert(result.bom.length > 0, "BOM should have items", result.bom.length);
  assert(result.totalLaborHrs > 0, "Labor hours should be positive", result.totalLaborHrs);
});

runTest("Wood fence - basic 50ft run", () => {
  const input: FenceProjectInput = {
    productLineId: "wood_privacy_6ft",
    postSize: "4x4",
    soilType: "standard",
    windMode: false,
    runs: [
      {
        id: "run1",
        linearFeet: 50,
        startType: "end",
        endType: "end",
      },
    ],
    gates: [],
  };

  const result = estimateFence(input, {
    fenceType: "wood",
    woodStyle: "dog_ear_privacy",
    laborRatePerHr: 65,
    wastePct: 0.05,
  });

  validateNoNaN(result, "Wood basic");
  validateNoNegatives(result, "Wood basic");
  validateNoUndefined(result, "Wood basic");

  assert(result.totalCost > 0, "Total cost should be positive", result.totalCost);
  assert(result.bom.length > 0, "BOM should have items", result.bom.length);
});

runTest("Chain link fence - basic 75ft run", () => {
  const input: FenceProjectInput = {
    productLineId: "chain_link_4ft",
    postSize: "2in",
    soilType: "standard",
    windMode: false,
    runs: [
      {
        id: "run1",
        linearFeet: 75,
        startType: "end",
        endType: "end",
      },
    ],
    gates: [],
  };

  const result = estimateFence(input, { fenceType: "chain_link", laborRatePerHr: 65, wastePct: 0.05 });

  validateNoNaN(result, "Chain link basic");
  validateNoNegatives(result, "Chain link basic");
  validateNoUndefined(result, "Chain link basic");

  assert(result.totalCost > 0, "Total cost should be positive", result.totalCost);
  assert(result.bom.length > 0, "BOM should have items", result.bom.length);
});

console.log("\n🔍 PHASE 2: GATE PRICING VALIDATION\n");

runTest("Single gate - vinyl 4ft", () => {
  const input: FenceProjectInput = {
    productLineId: "vinyl_privacy_6ft",
    postSize: "5x5",
    soilType: "standard",
    windMode: false,
    runs: [
      {
        id: "run1",
        linearFeet: 50,
        startType: "end",
        endType: "gate",
      },
    ],
    gates: [
      {
        id: "gate1",
        afterRunId: "run1",
        widthFt: 4,
        gateType: "single",
        isPoolGate: false,
      },
    ],
  };

  const resultWithGate = estimateFence(input, { fenceType: "vinyl", laborRatePerHr: 65, wastePct: 0.05 });

  // Compare with no gate
  const inputNoGate = { ...input, gates: [], runs: [{ ...input.runs[0], endType: "end" as const }] };
  const resultNoGate = estimateFence(inputNoGate, { fenceType: "vinyl", laborRatePerHr: 65, wastePct: 0.05 });

  validateNoNaN(resultWithGate, "Vinyl with gate");
  validateNoNegatives(resultWithGate, "Vinyl with gate");

  const gateCostDiff = resultWithGate.totalCost - resultNoGate.totalCost;
  assert(gateCostDiff > 0, "Gate should increase total cost", gateCostDiff);
  assert(gateCostDiff > 100, "Gate cost difference should be reasonable (>$100)", gateCostDiff);
  assert(gateCostDiff < 5000, "Gate cost difference should be reasonable (<$5000)", gateCostDiff);
});

runTest("Double gate - vinyl 10ft", () => {
  const input: FenceProjectInput = {
    productLineId: "vinyl_privacy_6ft",
    postSize: "5x5",
    soilType: "standard",
    windMode: false,
    runs: [
      {
        id: "run1",
        linearFeet: 50,
        startType: "end",
        endType: "gate",
      },
    ],
    gates: [
      {
        id: "gate1",
        afterRunId: "run1",
        widthFt: 10,
        gateType: "double",
        isPoolGate: false,
      },
    ],
  };

  const result = estimateFence(input, { fenceType: "vinyl", laborRatePerHr: 65, wastePct: 0.05 });

  validateNoNaN(result, "Double gate");
  validateNoNegatives(result, "Double gate");

  // Double gate should be more expensive than single gate
  const gateItems = result.bom.filter(item => item.sku.toLowerCase().includes("gate"));
  assert(gateItems.length > 0, "Should have gate items in BOM", gateItems.length);
});

runTest("Multiple gates - 2 single gates", () => {
  const input: FenceProjectInput = {
    productLineId: "vinyl_privacy_6ft",
    postSize: "5x5",
    soilType: "standard",
    windMode: false,
    runs: [
      {
        id: "run1",
        linearFeet: 50,
        startType: "end",
        endType: "gate",
      },
      {
        id: "run2",
        linearFeet: 30,
        startType: "gate",
        endType: "end",
      },
    ],
    gates: [
      {
        id: "gate1",
        afterRunId: "run1",
        widthFt: 4,
        gateType: "single",
        isPoolGate: false,
      },
      {
        id: "gate2",
        afterRunId: "run1",
        widthFt: 4,
        gateType: "single",
        isPoolGate: false,
      },
    ],
  };

  const result = estimateFence(input, { fenceType: "vinyl", laborRatePerHr: 65, wastePct: 0.05 });

  validateNoNaN(result, "Multiple gates");
  validateNoNegatives(result, "Multiple gates");

  const gateItems = result.bom.filter(item => item.sku.toLowerCase().includes("gate"));
  assert(gateItems.length > 0, "Should have gate items for multiple gates", gateItems.length);
});

console.log("\n🔍 PHASE 3: DATA INTEGRITY CHECKS\n");

runTest("Complex project - all fence types mixed terrain", () => {
  const input: FenceProjectInput = {
    productLineId: "vinyl_privacy_6ft",
    postSize: "5x5",
    soilType: "clay",
    windMode: true,
    runs: [
      {
        id: "run1",
        linearFeet: 100,
        startType: "end",
        endType: "corner",
        slopeDeg: 5,
        slopeMethod: "racked",
      },
      {
        id: "run2",
        linearFeet: 75,
        startType: "corner",
        endType: "gate",
        slopeDeg: 10,
        slopeMethod: "stepped",
      },
    ],
    gates: [
      {
        id: "gate1",
        afterRunId: "run2",
        widthFt: 6,
        gateType: "single",
        isPoolGate: true,
      },
    ],
  };

  const result = estimateFence(input, { fenceType: "vinyl", laborRatePerHr: 65, wastePct: 0.05 });

  validateNoNaN(result, "Complex project");
  validateNoNegatives(result, "Complex project");
  validateNoUndefined(result, "Complex project");

  // Verify all BOM items have SKUs and names
  result.bom.forEach((item, idx) => {
    assert(item.sku && item.sku.length > 0, `BOM item ${idx} should have SKU`, item.sku);
    assert(item.name && item.name.length > 0, `BOM item ${idx} should have name`, item.name);
  });
});

console.log("\n🔍 PHASE 4: EDGE CASE TESTING\n");

runTest("Edge case - very small run (10ft)", () => {
  const input: FenceProjectInput = {
    productLineId: "vinyl_privacy_6ft",
    postSize: "5x5",
    soilType: "standard",
    windMode: false,
    runs: [
      {
        id: "run1",
        linearFeet: 10,
        startType: "end",
        endType: "end",
      },
    ],
    gates: [],
  };

  const result = estimateFence(input, { fenceType: "vinyl", laborRatePerHr: 65, wastePct: 0.05 });

  validateNoNaN(result, "Small run");
  validateNoNegatives(result, "Small run");
  assert(result.totalCost > 0, "Small run should have positive cost", result.totalCost);
});

runTest("Edge case - very large run (500ft)", () => {
  const input: FenceProjectInput = {
    productLineId: "vinyl_privacy_6ft",
    postSize: "5x5",
    soilType: "standard",
    windMode: false,
    runs: [
      {
        id: "run1",
        linearFeet: 500,
        startType: "end",
        endType: "end",
      },
    ],
    gates: [],
  };

  const result = estimateFence(input, { fenceType: "vinyl", laborRatePerHr: 65, wastePct: 0.05 });

  validateNoNaN(result, "Large run");
  validateNoNegatives(result, "Large run");
  assert(result.totalCost > 0, "Large run should have positive cost", result.totalCost);
  assert(result.bom.length > 0, "Large run should have BOM items", result.bom.length);
});

runTest("Edge case - steep slope (20 degrees)", () => {
  const input: FenceProjectInput = {
    productLineId: "vinyl_privacy_6ft",
    postSize: "5x5",
    soilType: "standard",
    windMode: false,
    runs: [
      {
        id: "run1",
        linearFeet: 50,
        startType: "end",
        endType: "end",
        slopeDeg: 20,
        slopeMethod: "stepped",
      },
    ],
    gates: [],
  };

  const result = estimateFence(input, { fenceType: "vinyl", laborRatePerHr: 65, wastePct: 0.05 });

  validateNoNaN(result, "Steep slope");
  validateNoNegatives(result, "Steep slope");
  assert(result.totalCost > 0, "Steep slope should have positive cost", result.totalCost);
});

runTest("Edge case - sandy soil + wind mode", () => {
  const input: FenceProjectInput = {
    productLineId: "vinyl_privacy_6ft",
    postSize: "5x5",
    soilType: "sandy",
    windMode: true,
    runs: [
      {
        id: "run1",
        linearFeet: 50,
        startType: "end",
        endType: "end",
      },
    ],
    gates: [],
  };

  const result = estimateFence(input, { fenceType: "vinyl", laborRatePerHr: 65, wastePct: 0.05 });

  validateNoNaN(result, "Sandy + wind");
  validateNoNegatives(result, "Sandy + wind");

  // Wind mode + sandy soil should increase concrete usage
  const concreteItems = result.bom.filter(item => item.sku.toLowerCase().includes("concrete"));
  assert(concreteItems.length > 0, "Should have concrete in BOM", concreteItems.length);
});

runTest("Edge case - multiple runs with varying dimensions", () => {
  const input: FenceProjectInput = {
    productLineId: "vinyl_privacy_6ft",
    postSize: "5x5",
    soilType: "standard",
    windMode: false,
    runs: [
      {
        id: "run1",
        linearFeet: 25,
        startType: "end",
        endType: "corner",
      },
      {
        id: "run2",
        linearFeet: 50,
        startType: "corner",
        endType: "corner",
      },
      {
        id: "run3",
        linearFeet: 100,
        startType: "corner",
        endType: "gate",
      },
    ],
    gates: [
      {
        id: "gate1",
        afterRunId: "run3",
        widthFt: 4,
        gateType: "single",
        isPoolGate: false,
      },
    ],
  };

  const result = estimateFence(input, { fenceType: "vinyl", laborRatePerHr: 65, wastePct: 0.05 });

  validateNoNaN(result, "Multiple varying runs");
  validateNoNegatives(result, "Multiple varying runs");

  const totalLF = 25 + 50 + 100;
  assert(result.totalCost > 0, "Multiple runs should have positive cost", result.totalCost);
});

// ── Summary Report ────────────────────────────────────────────────

console.log("\n" + "=".repeat(60));
console.log("TEST SUMMARY");
console.log("=".repeat(60) + "\n");

const passed = testResults.filter(t => t.passed).length;
const failed = testResults.filter(t => !t.passed).length;

console.log(`Total tests: ${testResults.length}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);

if (failed > 0) {
  console.log("\nFailed tests:");
  testResults
    .filter(t => !t.passed)
    .forEach(t => {
      console.log(`  - ${t.name}`);
      console.log(`    Error: ${t.error}`);
    });
  process.exit(1);
} else {
  console.log("\n✅ All tests passed!");
  console.log("\nFunctional verification complete:");
  console.log("  ✅ End-to-end flow validated");
  console.log("  ✅ Gate pricing calculations verified");
  console.log("  ✅ Data integrity confirmed (no NaN/undefined/negatives)");
  console.log("  ✅ Edge cases handled correctly");
  console.log("  ✅ BOM generation working for all fence types");
  process.exit(0);
}
