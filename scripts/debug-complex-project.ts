import { estimateFence, type FenceProjectInput } from "../src/lib/fence-graph/engine";

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

console.log("\nBOM Items:");
result.bom.forEach((item, idx) => {
  console.log(`${idx}: SKU=${item.sku}, Desc="${item.description || 'MISSING'}", Qty=${item.qty}`);
});
