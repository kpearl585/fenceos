#!/usr/bin/env tsx
/**
 * Internet market benchmark
 *
 * Purpose:
 * - Create 10 representative fence jobs from live public internet pricing guides
 * - Run the estimator against those jobs
 * - Compare estimated totals against the public all-in installed ranges
 *
 * Important:
 * - These are market sanity checks, not real closeout truth.
 * - Jobs are intentionally kept simple (flat, standard lots, no removal, no gates)
 *   because public pricing guides are usually quoted as broad per-foot installed ranges.
 */

import { estimateFence } from "../src/lib/fence-graph/engine";

type FenceType = "vinyl" | "wood" | "chain_link" | "aluminum";

type InternetBenchmarkJob = {
  name: string;
  fenceType: FenceType;
  productLineId:
    | "vinyl_privacy_6ft"
    | "vinyl_picket_4ft"
    | "wood_privacy_6ft"
    | "chain_link_4ft"
    | "chain_link_6ft"
    | "aluminum_4ft"
    | "aluminum_6ft";
  totalLf: number;
  expectedPerFoot: {
    min: number;
    max: number;
    basis: string;
  };
  sourceUrls: string[];
  input: Parameters<typeof estimateFence>[0];
};

const PRICE_MAP = {};

function makeFlatJob(
  projectName: string,
  productLineId: InternetBenchmarkJob["productLineId"],
  fenceType: FenceType,
  totalLf: number
): InternetBenchmarkJob["input"] {
  return {
    projectName,
    productLineId,
    fenceHeight: productLineId.endsWith("_4ft") ? 4 : 6,
    postSize:
      fenceType === "chain_link"
        ? ("2in" as const)
        : productLineId.startsWith("vinyl_privacy")
          ? ("5x5" as const)
          : ("4x4" as const),
    soilType: "standard",
    windMode: false,
    runs: [
      {
        id: "r1",
        linearFeet: totalLf,
        startType: "end",
        endType: "end",
        slopeDeg: 0,
      },
    ],
    gates: [],
  };
}

const jobs: InternetBenchmarkJob[] = [
  {
    name: "Internet Job 1 • Vinyl Privacy 6ft • 100LF",
    fenceType: "vinyl",
    productLineId: "vinyl_privacy_6ft",
    totalLf: 100,
    expectedPerFoot: {
      min: 25,
      max: 40,
      basis: "Overlap of HomeAdvisor 2025 6ft vinyl ($25-$40/lf) and Bob Vila 2024 6ft vinyl ($25-$40/lf)",
    },
    sourceUrls: [
      "https://www.homeadvisor.com/cost/fencing/install-a-vinyl-or-pvc-fence/",
      "https://www.bobvila.com/articles/vinyl-fence-cost/",
    ],
    input: makeFlatJob("Internet V1", "vinyl_privacy_6ft", "vinyl", 100),
  },
  {
    name: "Internet Job 2 • Vinyl Privacy 6ft • 180LF",
    fenceType: "vinyl",
    productLineId: "vinyl_privacy_6ft",
    totalLf: 180,
    expectedPerFoot: {
      min: 25,
      max: 40,
      basis: "Overlap of HomeAdvisor 2025 6ft vinyl ($25-$40/lf) and Bob Vila 2024 6ft vinyl ($25-$40/lf)",
    },
    sourceUrls: [
      "https://www.homeadvisor.com/cost/fencing/install-a-vinyl-or-pvc-fence/",
      "https://www.bobvila.com/articles/vinyl-fence-cost/",
    ],
    input: makeFlatJob("Internet V2", "vinyl_privacy_6ft", "vinyl", 180),
  },
  {
    name: "Internet Job 3 • Vinyl Picket 4ft • 120LF",
    fenceType: "vinyl",
    productLineId: "vinyl_picket_4ft",
    totalLf: 120,
    expectedPerFoot: {
      min: 15,
      max: 20,
      basis: "Overlap of HomeAdvisor 2025 vinyl picket ($14-$20/lf) and Bob Vila 2024 vinyl picket ($15-$35/lf)",
    },
    sourceUrls: [
      "https://www.homeadvisor.com/cost/fencing/install-a-vinyl-or-pvc-fence/",
      "https://www.bobvila.com/articles/vinyl-fence-cost/",
    ],
    input: makeFlatJob("Internet V3", "vinyl_picket_4ft", "vinyl", 120),
  },
  {
    name: "Internet Job 4 • Wood Privacy 6ft • 100LF",
    fenceType: "wood",
    productLineId: "wood_privacy_6ft",
    totalLf: 100,
    expectedPerFoot: {
      min: 27,
      max: 50,
      basis: "Overlap of HomeAdvisor 2025 wood privacy ($25-$50/lf) and Bob Vila 2023 wood privacy ($27-$60/lf)",
    },
    sourceUrls: [
      "https://www.homeadvisor.com/cost/fencing/install-a-wood-fence//",
      "https://www.bobvila.com/articles/wood-fence-cost/",
    ],
    input: makeFlatJob("Internet W1", "wood_privacy_6ft", "wood", 100),
  },
  {
    name: "Internet Job 5 • Wood Privacy 6ft • 180LF",
    fenceType: "wood",
    productLineId: "wood_privacy_6ft",
    totalLf: 180,
    expectedPerFoot: {
      min: 27,
      max: 50,
      basis: "Overlap of HomeAdvisor 2025 wood privacy ($25-$50/lf) and Bob Vila 2023 wood privacy ($27-$60/lf)",
    },
    sourceUrls: [
      "https://www.homeadvisor.com/cost/fencing/install-a-wood-fence//",
      "https://www.bobvila.com/articles/wood-fence-cost/",
    ],
    input: makeFlatJob("Internet W2", "wood_privacy_6ft", "wood", 180),
  },
  {
    name: "Internet Job 6 • Chain Link 4ft • 150LF",
    fenceType: "chain_link",
    productLineId: "chain_link_4ft",
    totalLf: 150,
    expectedPerFoot: {
      min: 8,
      max: 20,
      basis: "Overlap of HomeAdvisor 2025 4ft chain link ($8-$20/lf) and Angi 2026 4ft chain link ($8-$20/lf)",
    },
    sourceUrls: [
      "https://www.homeadvisor.com/cost/fencing/install-a-chain-link-fence//",
      "https://www.angi.com/articles/how-much-does-installing-chain-link-fence-cost.htm",
    ],
    input: makeFlatJob("Internet CL1", "chain_link_4ft", "chain_link", 150),
  },
  {
    name: "Internet Job 7 • Chain Link 6ft • 250LF",
    fenceType: "chain_link",
    productLineId: "chain_link_6ft",
    totalLf: 250,
    expectedPerFoot: {
      min: 10,
      max: 29,
      basis: "HomeAdvisor 2025 6ft chain link installed range",
    },
    sourceUrls: [
      "https://www.homeadvisor.com/cost/fencing/install-a-chain-link-fence//",
    ],
    input: makeFlatJob("Internet CL2", "chain_link_6ft", "chain_link", 250),
  },
  {
    name: "Internet Job 8 • Chain Link 4ft • 300LF",
    fenceType: "chain_link",
    productLineId: "chain_link_4ft",
    totalLf: 300,
    expectedPerFoot: {
      min: 8,
      max: 20,
      basis: "Overlap of HomeAdvisor 2025 4ft chain link ($8-$20/lf) and Angi 2026 4ft chain link ($8-$20/lf)",
    },
    sourceUrls: [
      "https://www.homeadvisor.com/cost/fencing/install-a-chain-link-fence//",
      "https://www.angi.com/articles/how-much-does-installing-chain-link-fence-cost.htm",
    ],
    input: makeFlatJob("Internet CL3", "chain_link_4ft", "chain_link", 300),
  },
  {
    name: "Internet Job 9 • Aluminum 4ft • 120LF",
    fenceType: "aluminum",
    productLineId: "aluminum_4ft",
    totalLf: 120,
    expectedPerFoot: {
      min: 25,
      max: 50,
      basis: "Angi 2026 aluminum picket installed range",
    },
    sourceUrls: [
      "https://www.angi.com/articles/how-much-does-aluminum-or-steel-fence-cost.htm",
    ],
    input: makeFlatJob("Internet A1", "aluminum_4ft", "aluminum", 120),
  },
  {
    name: "Internet Job 10 • Aluminum 6ft • 150LF",
    fenceType: "aluminum",
    productLineId: "aluminum_6ft",
    totalLf: 150,
    expectedPerFoot: {
      min: 22,
      max: 72,
      basis: "Angi 2026 standard aluminum all-in installed range",
    },
    sourceUrls: [
      "https://www.angi.com/articles/how-much-does-aluminum-or-steel-fence-cost.htm",
    ],
    input: makeFlatJob("Internet A2", "aluminum_6ft", "aluminum", 150),
  },
];

type Outcome = "WITHIN_RANGE" | "LOW" | "HIGH";

function classify(total: number, min: number, max: number): Outcome {
  if (total < min) return "LOW";
  if (total > max) return "HIGH";
  return "WITHIN_RANGE";
}

console.log("═══════════════════════════════════════════════════════════");
console.log("INTERNET MARKET BENCHMARK");
console.log("═══════════════════════════════════════════════════════════");
console.log("Public pricing sanity check using 10 representative jobs.\n");

let within = 0;
let low = 0;
let high = 0;
let signedPctSum = 0;
let absPctSum = 0;

for (const [index, job] of jobs.entries()) {
  const expectedMin = job.expectedPerFoot.min * job.totalLf;
  const expectedMax = job.expectedPerFoot.max * job.totalLf;
  const midpoint = (expectedMin + expectedMax) / 2;

  const result = estimateFence(job.input, {
    fenceType: job.fenceType,
    laborRatePerHr: 65,
    wastePct: 0.05,
    priceMap: PRICE_MAP,
  });

  const outcome = classify(result.totalCost, expectedMin, expectedMax);
  if (outcome === "WITHIN_RANGE") within++;
  if (outcome === "LOW") low++;
  if (outcome === "HIGH") high++;

  const signedPct = ((result.totalCost - midpoint) / midpoint) * 100;
  const absPct = Math.abs(signedPct);
  signedPctSum += signedPct;
  absPctSum += absPct;

  console.log(`[${index + 1}/10] ${job.name}`);
  console.log(`  Type: ${job.fenceType} | Product: ${job.productLineId} | Feet: ${job.totalLf}`);
  console.log(
    `  Estimate: $${result.totalCost.toLocaleString()} ($${(result.totalCost / job.totalLf).toFixed(2)}/lf)`
  );
  console.log(
    `  Internet range: $${expectedMin.toLocaleString()} - $${expectedMax.toLocaleString()} ($${job.expectedPerFoot.min}-$${job.expectedPerFoot.max}/lf)`
  );
  console.log(`  Midpoint delta: ${signedPct >= 0 ? "+" : ""}${signedPct.toFixed(1)}%`);
  console.log(`  Outcome: ${outcome}`);
  console.log(`  Basis: ${job.expectedPerFoot.basis}`);
  console.log("");
}

const totalJobs = jobs.length;
const meanSignedPct = signedPctSum / totalJobs;
const meanAbsolutePct = absPctSum / totalJobs;

console.log("═══════════════════════════════════════════════════════════");
console.log("SUMMARY");
console.log("═══════════════════════════════════════════════════════════");
console.log(`Within public range: ${within}/${totalJobs} (${Math.round((within / totalJobs) * 100)}%)`);
console.log(`Low vs public range: ${low}/${totalJobs} (${Math.round((low / totalJobs) * 100)}%)`);
console.log(`High vs public range: ${high}/${totalJobs} (${Math.round((high / totalJobs) * 100)}%)`);
console.log(`Mean signed delta vs midpoint: ${meanSignedPct >= 0 ? "+" : ""}${meanSignedPct.toFixed(1)}%`);
console.log(`Mean absolute delta vs midpoint: ${meanAbsolutePct.toFixed(1)}%`);
console.log("");
console.log("Sources used:");
console.log("- https://www.homeadvisor.com/cost/fencing/install-a-vinyl-or-pvc-fence/");
console.log("- https://www.bobvila.com/articles/vinyl-fence-cost/");
console.log("- https://www.homeadvisor.com/cost/fencing/install-a-wood-fence//");
console.log("- https://www.bobvila.com/articles/wood-fence-cost/");
console.log("- https://www.homeadvisor.com/cost/fencing/install-a-chain-link-fence//");
console.log("- https://www.angi.com/articles/how-much-does-installing-chain-link-fence-cost.htm");
console.log("- https://www.angi.com/articles/how-much-does-aluminum-or-steel-fence-cost.htm");
console.log("");
console.log("Note: public internet ranges are broad consumer-market guides, not contractor closeout truth.");
