#!/usr/bin/env tsx

import { estimateFence, type DeepPartial, type OrgEstimatorConfig } from "../src/lib/fence-graph/engine";
import { getPriceMap } from "../src/lib/fence-graph/pricing/defaultPrices";

type FenceType = "vinyl" | "wood" | "chain_link" | "aluminum";

interface BenchmarkJob {
  name: string;
  fenceType: FenceType;
  woodStyle?: "picket";
  expectedRange: { min: number; max: number };
  input: Parameters<typeof estimateFence>[0];
}

const jobs: BenchmarkJob[] = [
  {
    name: "Vinyl Privacy 6ft - 150LF Simple",
    fenceType: "vinyl",
    expectedRange: { min: 5175, max: 6900 },
    input: {
      projectName: "V1",
      productLineId: "vinyl_privacy_6ft",
      fenceHeight: 6,
      postSize: "5x5",
      soilType: "standard",
      windMode: false,
      runs: [{ id: "r1", linearFeet: 150, startType: "end", endType: "end", slopeDeg: 0 }],
      gates: [{ id: "g1", afterRunId: "r1", gateType: "single", widthFt: 4 }],
    },
  },
  {
    name: "Vinyl Picket 4ft - 200LF Decorative",
    fenceType: "vinyl",
    expectedRange: { min: 4440, max: 6660 },
    input: {
      projectName: "V2",
      productLineId: "vinyl_picket_4ft",
      fenceHeight: 4,
      postSize: "4x4",
      soilType: "clay",
      windMode: false,
      runs: [{ id: "r1", linearFeet: 200, startType: "end", endType: "end", slopeDeg: 0 }],
      gates: [{ id: "g1", afterRunId: "r1", gateType: "double", widthFt: 10 }],
    },
  },
  {
    name: "Vinyl Privacy 6ft - 250LF Multi-Gate",
    fenceType: "vinyl",
    expectedRange: { min: 6900, max: 10350 },
    input: {
      projectName: "V3",
      productLineId: "vinyl_privacy_6ft",
      fenceHeight: 6,
      postSize: "5x5",
      soilType: "sandy_loam",
      windMode: false,
      runs: [
        { id: "r1", linearFeet: 120, startType: "end", endType: "corner", slopeDeg: 0 },
        { id: "r2", linearFeet: 130, startType: "corner", endType: "end", slopeDeg: 0 },
      ],
      gates: [
        { id: "g1", afterRunId: "r1", gateType: "single", widthFt: 4, isPoolGate: false },
        { id: "g2", afterRunId: "r2", gateType: "double", widthFt: 12, isPoolGate: false },
      ],
    },
  },
  {
    name: "Wood Privacy 6ft - 180LF Standard",
    fenceType: "wood",
    expectedRange: { min: 2940, max: 4410 },
    input: {
      projectName: "W1",
      productLineId: "wood_privacy_6ft",
      fenceHeight: 6,
      postSize: "4x4",
      soilType: "standard",
      windMode: false,
      runs: [{ id: "r1", linearFeet: 180, startType: "end", endType: "end", slopeDeg: 0 }],
      gates: [{ id: "g1", afterRunId: "r1", gateType: "single", widthFt: 4 }],
    },
  },
  {
    name: "Wood Picket 4ft - 220LF Simple",
    fenceType: "wood",
    woodStyle: "picket",
    expectedRange: { min: 4004, max: 6370 },
    input: {
      projectName: "W2",
      productLineId: "wood_picket_4ft",
      fenceHeight: 4,
      postSize: "4x4",
      soilType: "clay",
      windMode: false,
      runs: [{ id: "r1", linearFeet: 220, startType: "end", endType: "end", slopeDeg: 0 }],
      gates: [{ id: "g1", afterRunId: "r1", gateType: "double", widthFt: 10 }],
    },
  },
  {
    name: "Wood Privacy 6ft - 160LF Sloped + Wind",
    fenceType: "wood",
    expectedRange: { min: 3000, max: 5000 },
    input: {
      projectName: "W3",
      productLineId: "wood_privacy_6ft",
      fenceHeight: 6,
      postSize: "4x4",
      soilType: "rocky",
      windMode: true,
      runs: [{ id: "r1", linearFeet: 160, startType: "end", endType: "end", slopeDeg: 12 }],
      gates: [{ id: "g1", afterRunId: "r1", gateType: "single", widthFt: 4 }],
    },
  },
  {
    name: "Chain Link 6ft - 300LF Commercial",
    fenceType: "chain_link",
    expectedRange: { min: 3200, max: 5000 },
    input: {
      projectName: "CL1",
      productLineId: "chain_link_6ft",
      fenceHeight: 6,
      postSize: "2in",
      soilType: "standard",
      windMode: false,
      runs: [{ id: "r1", linearFeet: 300, startType: "end", endType: "end", slopeDeg: 0 }],
      gates: [{ id: "g1", afterRunId: "r1", gateType: "double", widthFt: 16, isPoolGate: false }],
    },
  },
  {
    name: "Short Run Chain Link - 80LF",
    fenceType: "chain_link",
    expectedRange: { min: 850, max: 1500 },
    input: {
      projectName: "SR3",
      productLineId: "chain_link_4ft",
      fenceHeight: 4,
      postSize: "2in",
      soilType: "standard",
      windMode: false,
      runs: [{ id: "r1", linearFeet: 80, startType: "end", endType: "end", slopeDeg: 0 }],
      gates: [],
    },
  },
  {
    name: "Wet Soil Chain Link - 200LF",
    fenceType: "chain_link",
    expectedRange: { min: 2200, max: 3500 },
    input: {
      projectName: "CLW1",
      productLineId: "chain_link_4ft",
      fenceHeight: 4,
      postSize: "2in",
      soilType: "wet",
      windMode: false,
      runs: [{ id: "r1", linearFeet: 200, startType: "end", endType: "end", slopeDeg: 0 }],
      gates: [{ id: "g1", afterRunId: "r1", gateType: "single", widthFt: 4 }],
    },
  },
  {
    name: "Vinyl Picket Long Run - 300LF",
    fenceType: "vinyl",
    expectedRange: { min: 8500, max: 13000 },
    input: {
      projectName: "VP3",
      productLineId: "vinyl_picket_4ft",
      fenceHeight: 4,
      postSize: "4x4",
      soilType: "clay",
      windMode: false,
      runs: [{ id: "r1", linearFeet: 300, startType: "end", endType: "end", slopeDeg: 0 }],
      gates: [{ id: "g1", afterRunId: "r1", gateType: "double", widthFt: 10 }],
    },
  },
];

function buildPatch(args: {
  vinylLaborScale: number;
  woodLaborScale: number;
  chainLinkLaborScale: number;
  equipmentScale: number;
  overheadScale: number;
  logisticsScale: number;
}): DeepPartial<OrgEstimatorConfig> {
  return {
    labor: {
      vinyl: {
        holeDig: Number((0.25 * args.vinylLaborScale).toFixed(3)),
        postSet: Number((0.20 * args.vinylLaborScale).toFixed(3)),
        sectionInstall: Number((0.50 * args.vinylLaborScale).toFixed(3)),
        cutting: Number((0.15 * args.vinylLaborScale).toFixed(3)),
        racking: Number((0.30 * args.vinylLaborScale).toFixed(3)),
        concretePour: Number((0.08 * args.vinylLaborScale).toFixed(3)),
      },
      wood: {
        holeDig: Number((0.25 * args.woodLaborScale).toFixed(3)),
        postSet: Number((0.20 * args.woodLaborScale).toFixed(3)),
        railInstall: Number((0.10 * args.woodLaborScale).toFixed(3)),
        boardNailing: Number((0.40 * args.woodLaborScale).toFixed(3)),
        bobInstall: Number((0.06 * args.woodLaborScale).toFixed(3)),
        cutting: Number((0.15 * args.woodLaborScale).toFixed(3)),
        racking: Number((0.30 * args.woodLaborScale).toFixed(3)),
        concretePour: Number((0.08 * args.woodLaborScale).toFixed(3)),
      },
      chain_link: {
        holeDig: Number((0.25 * args.chainLinkLaborScale).toFixed(3)),
        postSet: Number((0.20 * args.chainLinkLaborScale).toFixed(3)),
        topRail: Number((0.20 * args.chainLinkLaborScale).toFixed(3)),
        fabricStretch: Number((1.50 * args.chainLinkLaborScale).toFixed(3)),
        tieWire: Number((0.15 * args.chainLinkLaborScale).toFixed(3)),
        concretePour: Number((0.10 * args.chainLinkLaborScale).toFixed(3)),
      },
    },
    region: {
      laborMultiplier: 1,
      materialMultiplier: 1,
    },
    equipment: {
      augerPerDay: Math.round(95 * args.equipmentScale),
      mixerPerDay: Math.round(55 * args.equipmentScale),
      stretcherPerDay: Math.round(45 * args.equipmentScale),
      sawPerDay: Math.round(50 * args.equipmentScale),
    },
    overhead: {
      fixed: {
        setupHrs: Number((1.5 * args.overheadScale).toFixed(2)),
        layoutHrs: Number((0.75 * args.overheadScale).toFixed(2)),
      },
      perDay: {
        cleanupHrs: Number((0.5 * args.overheadScale).toFixed(2)),
      },
    },
    logistics: {
      deliveryFee: Math.round(95 * args.logisticsScale),
      freeDeliveryThreshold: 500,
    },
  };
}

function midpoint(range: { min: number; max: number }) {
  return (range.min + range.max) / 2;
}

function scaledPriceMap(args: {
  vinylMaterialScale: number;
  woodMaterialScale: number;
  chainLinkMaterialScale: number;
}) {
  const base = getPriceMap("base");
  const scaled: Record<string, number> = {};
  for (const [sku, price] of Object.entries(base)) {
    let next = price;
    if (sku.startsWith("VINYL_") || sku.startsWith("GATE_VINYL_")) {
      next = price * args.vinylMaterialScale;
    } else if (sku.startsWith("WOOD_") || sku.startsWith("POST_CAP_4X4") || sku.startsWith("GATE_WOOD_")) {
      next = price * args.woodMaterialScale;
    } else if (
      sku.startsWith("CHAIN_LINK_") ||
      sku.startsWith("CL_") ||
      sku.startsWith("GATE_CHAIN_LINK_") ||
      sku.startsWith("GATE_CL_")
    ) {
      next = price * args.chainLinkMaterialScale;
    }
    scaled[sku] = Math.round(next * 100) / 100;
  }
  return scaled;
}

function evaluatePatch(
  patch: DeepPartial<OrgEstimatorConfig>,
  priceMap: Record<string, number>
) {
  let withinRange = 0;
  let absPctErrorSum = 0;
  const details: Array<{ name: string; total: number; target: number; pctError: number }> = [];

  for (const job of jobs) {
    const result = estimateFence(job.input, {
      fenceType: job.fenceType,
      woodStyle: job.woodStyle,
      laborRatePerHr: 65,
      wastePct: 0.05,
      priceMap,
      estimatorConfig: patch,
    });
    const target = midpoint(job.expectedRange);
    const pctError = ((result.totalCost - target) / target) * 100;
    absPctErrorSum += Math.abs(pctError);
    if (result.totalCost >= job.expectedRange.min && result.totalCost <= job.expectedRange.max) {
      withinRange += 1;
    }
    details.push({
      name: job.name,
      total: result.totalCost,
      target,
      pctError,
    });
  }

  return {
    meanAbsPctError: absPctErrorSum / jobs.length,
    withinRange,
    details,
  };
}

const vinylMaterialScales = [0.82, 0.86, 0.9];
const woodMaterialScales = [0.68, 0.74, 0.8];
const chainLinkMaterialScales = [0.95, 1.0];
const vinylLaborScales = [0.85, 0.9, 0.95];
const woodLaborScales = [0.7, 0.8, 0.9];
const chainLinkLaborScales = [0.95, 1.0];
const equipmentScales = [0, 0.25];
const overheadScales = [0.7, 0.85, 1];
const logisticsScales = [0.5, 1];

let best:
  | {
      patchArgs: {
        vinylMaterialScale: number;
        woodMaterialScale: number;
        chainLinkMaterialScale: number;
        vinylLaborScale: number;
        woodLaborScale: number;
        chainLinkLaborScale: number;
        equipmentScale: number;
        overheadScale: number;
        logisticsScale: number;
      };
      meanAbsPctError: number;
      withinRange: number;
      details: Array<{ name: string; total: number; target: number; pctError: number }>;
    }
  | null = null;

for (const vinylMaterialScale of vinylMaterialScales) {
  for (const woodMaterialScale of woodMaterialScales) {
    for (const chainLinkMaterialScale of chainLinkMaterialScales) {
      const priceMap = scaledPriceMap({
        vinylMaterialScale,
        woodMaterialScale,
        chainLinkMaterialScale,
      });
      for (const vinylLaborScale of vinylLaborScales) {
        for (const woodLaborScale of woodLaborScales) {
          for (const chainLinkLaborScale of chainLinkLaborScales) {
            for (const equipmentScale of equipmentScales) {
              for (const overheadScale of overheadScales) {
                for (const logisticsScale of logisticsScales) {
                  const patchArgs = {
                    vinylMaterialScale,
                    woodMaterialScale,
                    chainLinkMaterialScale,
                    vinylLaborScale,
                    woodLaborScale,
                    chainLinkLaborScale,
                    equipmentScale,
                    overheadScale,
                    logisticsScale,
                  };
                  const result = evaluatePatch(buildPatch(patchArgs), priceMap);
                  if (
                    !best ||
                    result.withinRange > best.withinRange ||
                    (result.withinRange === best.withinRange &&
                      result.meanAbsPctError < best.meanAbsPctError)
                  ) {
                    best = {
                      patchArgs,
                      ...result,
                    };
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

if (!best) {
  console.error("No benchmark result found.");
  process.exit(1);
}

console.log("═══════════════════════════════════════════════════════════");
console.log("ESTIMATOR TUNING BENCHMARK");
console.log("═══════════════════════════════════════════════════════════\n");
console.log("Best coarse-fit configuration against supported synthetic jobs:\n");
console.log(JSON.stringify(best.patchArgs, null, 2));
console.log(`\nWithin expected range: ${best.withinRange}/${jobs.length}`);
console.log(`Mean absolute % error vs range midpoint: ${best.meanAbsPctError.toFixed(1)}%\n`);
console.log("Per-job drift:");
for (const detail of best.details) {
  console.log(
    `- ${detail.name}: $${Math.round(detail.total).toLocaleString()} vs target $${Math.round(detail.target).toLocaleString()} (${detail.pctError > 0 ? "+" : ""}${detail.pctError.toFixed(1)}%)`
  );
}
