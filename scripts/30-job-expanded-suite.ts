#!/usr/bin/env tsx
/**
 * 30+ Job Expanded Validation Suite
 *
 * Phase 5.3: Comprehensive validation across diverse scenarios
 * Tests edge cases, soil types, slopes, gate configurations, material types
 */

import { estimateFence } from "../src/lib/fence-graph/engine";

const PRICE_MAP = {};

const jobs = [
  // ── BASELINE 10 JOBS (from calibration suite) ──
  {
    name: "Vinyl Privacy 6ft - 150LF Simple",
    fenceType: "vinyl" as const,
    expectedRange: { min: 5175, max: 6900, competitive: 5750, safe: 6325 },
    input: {
      projectName: "V1",
      productLineId: "vinyl_privacy_6ft",
      fenceHeight: 6,
      postSize: "5x5" as const,
      soilType: "standard" as const,
      windMode: false,
      runs: [{ id: "r1", linearFeet: 150, startType: "end" as const, endType: "end" as const, slopeDeg: 0 }],
      gates: [{ id: "g1", afterRunId: "r1", gateType: "single" as const, widthFt: 4 }]
    }
  },
  {
    name: "Vinyl Picket 4ft - 200LF Decorative",
    fenceType: "vinyl" as const,
    expectedRange: { min: 4440, max: 6660, competitive: 5180, safe: 5920 },
    input: {
      projectName: "V2",
      productLineId: "vinyl_picket_4ft",
      fenceHeight: 4,
      postSize: "4x4" as const,
      soilType: "clay" as const,
      windMode: false,
      runs: [{ id: "r1", linearFeet: 200, startType: "end" as const, endType: "end" as const, slopeDeg: 0 }],
      gates: [{ id: "g1", afterRunId: "r1", gateType: "double" as const, widthFt: 10 }]
    }
  },
  {
    name: "Vinyl Privacy 6ft - 250LF Multi-Gate",
    fenceType: "vinyl" as const,
    expectedRange: { min: 6900, max: 10350, competitive: 8050, safe: 9200 },
    input: {
      projectName: "V3",
      productLineId: "vinyl_privacy_6ft",
      fenceHeight: 6,
      postSize: "5x5" as const,
      soilType: "sandy_loam" as const,
      windMode: false,
      runs: [
        { id: "r1", linearFeet: 120, startType: "end" as const, endType: "corner" as const, slopeDeg: 0 },
        { id: "r2", linearFeet: 130, startType: "corner" as const, endType: "end" as const, slopeDeg: 0 }
      ],
      gates: [
        { id: "g1", afterRunId: "r1", gateType: "single" as const, widthFt: 4 },
        { id: "g2", afterRunId: "r2", gateType: "double" as const, widthFt: 12 }
      ]
    }
  },
  {
    name: "Wood Privacy 6ft - 180LF Standard",
    fenceType: "wood" as const,
    expectedRange: { min: 2940, max: 4410, competitive: 3360, safe: 3990 },
    input: {
      projectName: "W1",
      productLineId: "wood_privacy_6ft",
      fenceHeight: 6,
      postSize: "4x4" as const,
      soilType: "standard" as const,
      windMode: false,
      runs: [{ id: "r1", linearFeet: 180, startType: "end" as const, endType: "end" as const, slopeDeg: 0 }],
      gates: [{ id: "g1", afterRunId: "r1", gateType: "single" as const, widthFt: 4 }]
    }
  },
  {
    name: "Wood Picket 4ft - 220LF Simple",
    fenceType: "wood" as const,
    woodStyle: "picket" as const,
    expectedRange: { min: 4004, max: 6370, competitive: 4732, safe: 5915 },
    input: {
      projectName: "W2",
      productLineId: "wood_picket_4ft",
      fenceHeight: 4,
      postSize: "4x4" as const,
      soilType: "clay" as const,
      windMode: false,
      runs: [{ id: "r1", linearFeet: 220, startType: "end" as const, endType: "end" as const, slopeDeg: 0 }],
      gates: [{ id: "g1", afterRunId: "r1", gateType: "double" as const, widthFt: 10 }]
    }
  },
  {
    name: "Wood Privacy 6ft - 160LF Sloped + Wind",
    fenceType: "wood" as const,
    expectedRange: { min: 3000, max: 5000, competitive: 3800, safe: 4500 },
    input: {
      projectName: "W3",
      productLineId: "wood_privacy_6ft",
      fenceHeight: 6,
      postSize: "4x4" as const,
      soilType: "rocky" as const,
      windMode: true,
      runs: [{ id: "r1", linearFeet: 160, startType: "end" as const, endType: "end" as const, slopeDeg: 12 }],
      gates: [{ id: "g1", afterRunId: "r1", gateType: "single" as const, widthFt: 4 }]
    }
  },
  {
    name: "Chain Link 6ft - 300LF Commercial",
    fenceType: "chain_link" as const,
    expectedRange: { min: 3200, max: 5000, competitive: 3800, safe: 4500 },
    input: {
      projectName: "CL1",
      productLineId: "chain_link_6ft",
      fenceHeight: 6,
      postSize: "2in" as const,
      soilType: "standard" as const,
      windMode: false,
      runs: [{ id: "r1", linearFeet: 300, startType: "end" as const, endType: "end" as const, slopeDeg: 0 }],
      gates: [{ id: "g1", afterRunId: "r1", gateType: "double" as const, widthFt: 16 }]
    }
  },
  {
    name: "Chain Link 4ft - 400LF Residential",
    fenceType: "chain_link" as const,
    expectedRange: { min: 3220, max: 5175, competitive: 3910, safe: 4600 },
    input: {
      projectName: "CL2",
      productLineId: "chain_link_4ft",
      fenceHeight: 4,
      postSize: "2in" as const,
      soilType: "clay" as const,
      windMode: false,
      runs: [{ id: "r1", linearFeet: 400, startType: "end" as const, endType: "end" as const, slopeDeg: 0 }],
      gates: [
        { id: "g1", afterRunId: "r1", gateType: "single" as const, widthFt: 4 },
        { id: "g2", afterRunId: "r1", gateType: "single" as const, widthFt: 4 }
      ]
    }
  },
  {
    name: "Multi-Run Gate-Heavy - 200LF",
    fenceType: "vinyl" as const,
    expectedRange: { min: 6500, max: 9750, competitive: 7540, safe: 8840 },
    input: {
      projectName: "GH1",
      productLineId: "vinyl_privacy_6ft",
      fenceHeight: 6,
      postSize: "5x5" as const,
      soilType: "sandy" as const,
      windMode: false,
      runs: [
        { id: "r1", linearFeet: 80, startType: "end" as const, endType: "corner" as const, slopeDeg: 0 },
        { id: "r2", linearFeet: 60, startType: "corner" as const, endType: "corner" as const, slopeDeg: 0 },
        { id: "r3", linearFeet: 60, startType: "corner" as const, endType: "end" as const, slopeDeg: 0 }
      ],
      gates: [
        { id: "g1", afterRunId: "r1", gateType: "single" as const, widthFt: 4 },
        { id: "g2", afterRunId: "r2", gateType: "single" as const, widthFt: 4 },
        { id: "g3", afterRunId: "r3", gateType: "double" as const, widthFt: 12 }
      ]
    }
  },
  {
    name: "Extreme Conditions - 120LF Slope+Wind+Wet",
    fenceType: "wood" as const,
    expectedRange: { min: 2500, max: 4500, competitive: 3200, safe: 4000 },
    input: {
      projectName: "EXT1",
      productLineId: "wood_privacy_6ft",
      fenceHeight: 6,
      postSize: "4x4" as const,
      soilType: "wet" as const,
      windMode: true,
      runs: [{ id: "r1", linearFeet: 120, startType: "end" as const, endType: "end" as const, slopeDeg: 18 }],
      gates: [{ id: "g1", afterRunId: "r1", gateType: "single" as const, widthFt: 4 }]
    }
  },

  // ── EDGE CASES: SHORT RUNS (11-13) ──
  {
    name: "Short Run Vinyl - 50LF",
    fenceType: "vinyl" as const,
    expectedRange: { min: 1800, max: 2800, competitive: 2100, safe: 2450 },
    input: {
      projectName: "SR1",
      productLineId: "vinyl_privacy_6ft",
      fenceHeight: 6,
      postSize: "5x5" as const,
      soilType: "standard" as const,
      windMode: false,
      runs: [{ id: "r1", linearFeet: 50, startType: "end" as const, endType: "end" as const, slopeDeg: 0 }],
      gates: []
    }
  },
  {
    name: "Short Run Wood - 60LF",
    fenceType: "wood" as const,
    expectedRange: { min: 1000, max: 1750, competitive: 1200, safe: 1500 },
    input: {
      projectName: "SR2",
      productLineId: "wood_privacy_6ft",
      fenceHeight: 6,
      postSize: "4x4" as const,
      soilType: "standard" as const,
      windMode: false,
      runs: [{ id: "r1", linearFeet: 60, startType: "end" as const, endType: "end" as const, slopeDeg: 0 }],
      gates: []
    }
  },
  {
    name: "Short Run Chain Link - 80LF",
    fenceType: "chain_link" as const,
    expectedRange: { min: 850, max: 1500, competitive: 1050, safe: 1250 },
    input: {
      projectName: "SR3",
      productLineId: "chain_link_4ft",
      fenceHeight: 4,
      postSize: "2in" as const,
      soilType: "standard" as const,
      windMode: false,
      runs: [{ id: "r1", linearFeet: 80, startType: "end" as const, endType: "end" as const, slopeDeg: 0 }],
      gates: []
    }
  },

  // ── EDGE CASES: LONG RUNS (14-16) ──
  {
    name: "Long Run Vinyl - 500LF",
    fenceType: "vinyl" as const,
    expectedRange: { min: 16000, max: 22000, competitive: 18000, safe: 20000 },
    input: {
      projectName: "LR1",
      productLineId: "vinyl_privacy_6ft",
      fenceHeight: 6,
      postSize: "5x5" as const,
      soilType: "standard" as const,
      windMode: false,
      runs: [{ id: "r1", linearFeet: 500, startType: "end" as const, endType: "end" as const, slopeDeg: 0 }],
      gates: [{ id: "g1", afterRunId: "r1", gateType: "single" as const, widthFt: 4 }]
    }
  },
  {
    name: "Long Run Wood - 450LF",
    fenceType: "wood" as const,
    expectedRange: { min: 7200, max: 11000, competitive: 8500, safe: 10000 },
    input: {
      projectName: "LR2",
      productLineId: "wood_privacy_6ft",
      fenceHeight: 6,
      postSize: "4x4" as const,
      soilType: "clay" as const,
      windMode: false,
      runs: [{ id: "r1", linearFeet: 450, startType: "end" as const, endType: "end" as const, slopeDeg: 0 }],
      gates: [{ id: "g1", afterRunId: "r1", gateType: "single" as const, widthFt: 4 }]
    }
  },
  {
    name: "Long Run Chain Link - 600LF",
    fenceType: "chain_link" as const,
    expectedRange: { min: 6000, max: 9500, competitive: 7200, safe: 8500 },
    input: {
      projectName: "LR3",
      productLineId: "chain_link_6ft",
      fenceHeight: 6,
      postSize: "2in" as const,
      soilType: "standard" as const,
      windMode: false,
      runs: [{ id: "r1", linearFeet: 600, startType: "end" as const, endType: "end" as const, slopeDeg: 0 }],
      gates: [{ id: "g1", afterRunId: "r1", gateType: "double" as const, widthFt: 16 }]
    }
  },

  // ── GATE CONFIGURATIONS (17-20) ──
  {
    name: "Pool Gate Vinyl - 100LF",
    fenceType: "vinyl" as const,
    expectedRange: { min: 3800, max: 5500, competitive: 4400, safe: 5000 },
    input: {
      projectName: "PG1",
      productLineId: "vinyl_privacy_6ft",
      fenceHeight: 6,
      postSize: "5x5" as const,
      soilType: "standard" as const,
      windMode: false,
      runs: [{ id: "r1", linearFeet: 100, startType: "end" as const, endType: "end" as const, slopeDeg: 0 }],
      gates: [{ id: "g1", afterRunId: "r1", gateType: "single" as const, widthFt: 4, poolCode: true }]
    }
  },
  {
    name: "Triple Gate Wood - 180LF",
    fenceType: "wood" as const,
    expectedRange: { min: 3600, max: 5500, competitive: 4200, safe: 5000 },
    input: {
      projectName: "TG1",
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
    }
  },
  {
    name: "Wide Double Gate Vinyl - 120LF",
    fenceType: "vinyl" as const,
    expectedRange: { min: 4800, max: 7000, competitive: 5600, safe: 6400 },
    input: {
      projectName: "WG1",
      productLineId: "vinyl_privacy_6ft",
      fenceHeight: 6,
      postSize: "5x5" as const,
      soilType: "clay" as const,
      windMode: false,
      runs: [{ id: "r1", linearFeet: 120, startType: "end" as const, endType: "end" as const, slopeDeg: 0 }],
      gates: [{ id: "g1", afterRunId: "r1", gateType: "double" as const, widthFt: 16 }]
    }
  },
  {
    name: "No Gates Wood - 150LF",
    fenceType: "wood" as const,
    expectedRange: { min: 2400, max: 3600, competitive: 2800, safe: 3300 },
    input: {
      projectName: "NG1",
      productLineId: "wood_privacy_6ft",
      fenceHeight: 6,
      postSize: "4x4" as const,
      soilType: "standard" as const,
      windMode: false,
      runs: [{ id: "r1", linearFeet: 150, startType: "end" as const, endType: "end" as const, slopeDeg: 0 }],
      gates: []
    }
  },

  // ── SOIL CONDITIONS (21-24) ──
  {
    name: "Sandy Soil Vinyl - 140LF",
    fenceType: "vinyl" as const,
    expectedRange: { min: 5000, max: 7000, competitive: 5700, safe: 6400 },
    input: {
      projectName: "SS1",
      productLineId: "vinyl_privacy_6ft",
      fenceHeight: 6,
      postSize: "5x5" as const,
      soilType: "sandy" as const,
      windMode: false,
      runs: [{ id: "r1", linearFeet: 140, startType: "end" as const, endType: "end" as const, slopeDeg: 0 }],
      gates: [{ id: "g1", afterRunId: "r1", gateType: "single" as const, widthFt: 4 }]
    }
  },
  {
    name: "Rocky Soil Wood - 160LF",
    fenceType: "wood" as const,
    expectedRange: { min: 2800, max: 4200, competitive: 3300, safe: 3800 },
    input: {
      projectName: "RS1",
      productLineId: "wood_privacy_6ft",
      fenceHeight: 6,
      postSize: "4x4" as const,
      soilType: "rocky" as const,
      windMode: false,
      runs: [{ id: "r1", linearFeet: 160, startType: "end" as const, endType: "end" as const, slopeDeg: 0 }],
      gates: [{ id: "g1", afterRunId: "r1", gateType: "single" as const, widthFt: 4 }]
    }
  },
  {
    name: "Wet Soil Chain Link - 200LF",
    fenceType: "chain_link" as const,
    expectedRange: { min: 2200, max: 3500, competitive: 2700, safe: 3200 },
    input: {
      projectName: "WS1",
      productLineId: "chain_link_4ft",
      fenceHeight: 4,
      postSize: "2in" as const,
      soilType: "wet" as const,
      windMode: false,
      runs: [{ id: "r1", linearFeet: 200, startType: "end" as const, endType: "end" as const, slopeDeg: 0 }],
      gates: [{ id: "g1", afterRunId: "r1", gateType: "single" as const, widthFt: 4 }]
    }
  },
  {
    name: "Clay Soil Vinyl - 170LF",
    fenceType: "vinyl" as const,
    expectedRange: { min: 5800, max: 8000, competitive: 6600, safe: 7400 },
    input: {
      projectName: "CS1",
      productLineId: "vinyl_privacy_6ft",
      fenceHeight: 6,
      postSize: "5x5" as const,
      soilType: "clay" as const,
      windMode: false,
      runs: [{ id: "r1", linearFeet: 170, startType: "end" as const, endType: "end" as const, slopeDeg: 0 }],
      gates: [{ id: "g1", afterRunId: "r1", gateType: "single" as const, widthFt: 4 }]
    }
  },

  // ── SLOPES (25-27) ──
  {
    name: "Moderate Slope Vinyl - 150LF",
    fenceType: "vinyl" as const,
    expectedRange: { min: 5600, max: 7500, competitive: 6300, safe: 7000 },
    input: {
      projectName: "MS1",
      productLineId: "vinyl_privacy_6ft",
      fenceHeight: 6,
      postSize: "5x5" as const,
      soilType: "standard" as const,
      windMode: false,
      runs: [{ id: "r1", linearFeet: 150, startType: "end" as const, endType: "end" as const, slopeDeg: 10 }],
      gates: [{ id: "g1", afterRunId: "r1", gateType: "single" as const, widthFt: 4 }]
    }
  },
  {
    name: "Steep Slope Wood - 130LF",
    fenceType: "wood" as const,
    expectedRange: { min: 2800, max: 4500, competitive: 3400, safe: 4000 },
    input: {
      projectName: "SS2",
      productLineId: "wood_privacy_6ft",
      fenceHeight: 6,
      postSize: "4x4" as const,
      soilType: "rocky" as const,
      windMode: false,
      runs: [{ id: "r1", linearFeet: 130, startType: "end" as const, endType: "end" as const, slopeDeg: 20 }],
      gates: [{ id: "g1", afterRunId: "r1", gateType: "single" as const, widthFt: 4 }]
    }
  },
  {
    name: "Multi-Run Varied Slope - 220LF",
    fenceType: "vinyl" as const,
    expectedRange: { min: 7500, max: 11000, competitive: 8800, safe: 10000 },
    input: {
      projectName: "MVS1",
      productLineId: "vinyl_privacy_6ft",
      fenceHeight: 6,
      postSize: "5x5" as const,
      soilType: "clay" as const,
      windMode: false,
      runs: [
        { id: "r1", linearFeet: 80, startType: "end" as const, endType: "corner" as const, slopeDeg: 0 },
        { id: "r2", linearFeet: 70, startType: "corner" as const, endType: "corner" as const, slopeDeg: 12 },
        { id: "r3", linearFeet: 70, startType: "corner" as const, endType: "end" as const, slopeDeg: 8 }
      ],
      gates: [{ id: "g1", afterRunId: "r2", gateType: "single" as const, widthFt: 4 }]
    }
  },

  // ── WIND MODE (28-29) ──
  {
    name: "Wind Exposure Vinyl - 180LF",
    fenceType: "vinyl" as const,
    expectedRange: { min: 6500, max: 9000, competitive: 7500, safe: 8300 },
    input: {
      projectName: "WE1",
      productLineId: "vinyl_privacy_6ft",
      fenceHeight: 6,
      postSize: "5x5" as const,
      soilType: "sandy" as const,
      windMode: true,
      runs: [{ id: "r1", linearFeet: 180, startType: "end" as const, endType: "end" as const, slopeDeg: 0 }],
      gates: [{ id: "g1", afterRunId: "r1", gateType: "single" as const, widthFt: 4 }]
    }
  },
  {
    name: "Wind Exposure Chain Link - 250LF",
    fenceType: "chain_link" as const,
    expectedRange: { min: 2800, max: 4500, competitive: 3400, safe: 4000 },
    input: {
      projectName: "WE2",
      productLineId: "chain_link_6ft",
      fenceHeight: 6,
      postSize: "2in" as const,
      soilType: "standard" as const,
      windMode: true,
      runs: [{ id: "r1", linearFeet: 250, startType: "end" as const, endType: "end" as const, slopeDeg: 0 }],
      gates: [{ id: "g1", afterRunId: "r1", gateType: "single" as const, widthFt: 4 }]
    }
  },

  // ── MIXED MATERIAL / SYSTEM (30-32) ──
  {
    name: "Vinyl Picket Long Run - 300LF",
    fenceType: "vinyl" as const,
    expectedRange: { min: 8500, max: 13000, competitive: 10000, safe: 11500 },
    input: {
      projectName: "VP1",
      productLineId: "vinyl_picket_4ft",
      fenceHeight: 4,
      postSize: "4x4" as const,
      soilType: "standard" as const,
      windMode: false,
      runs: [{ id: "r1", linearFeet: 300, startType: "end" as const, endType: "end" as const, slopeDeg: 0 }],
      gates: [{ id: "g1", afterRunId: "r1", gateType: "single" as const, widthFt: 4 }]
    }
  },
  {
    name: "Wood Picket Short Run - 100LF",
    fenceType: "wood" as const,
    woodStyle: "picket" as const,
    expectedRange: { min: 1800, max: 3000, competitive: 2200, safe: 2700 },
    input: {
      projectName: "WP1",
      productLineId: "wood_picket_4ft",
      fenceHeight: 4,
      postSize: "4x4" as const,
      soilType: "clay" as const,
      windMode: false,
      runs: [{ id: "r1", linearFeet: 100, startType: "end" as const, endType: "end" as const, slopeDeg: 0 }],
      gates: []
    }
  },
  {
    name: "Component System Multi-Gate - 280LF",
    fenceType: "vinyl" as const,
    expectedRange: { min: 9500, max: 14000, competitive: 11000, safe: 12500 },
    input: {
      projectName: "CS2",
      productLineId: "vinyl_privacy_6ft",
      fenceHeight: 6,
      postSize: "5x5" as const,
      soilType: "sandy_loam" as const,
      windMode: false,
      runs: [
        { id: "r1", linearFeet: 140, startType: "end" as const, endType: "corner" as const, slopeDeg: 0 },
        { id: "r2", linearFeet: 140, startType: "corner" as const, endType: "end" as const, slopeDeg: 0 }
      ],
      gates: [
        { id: "g1", afterRunId: "r1", gateType: "double" as const, widthFt: 12 },
        { id: "g2", afterRunId: "r2", gateType: "single" as const, widthFt: 4 }
      ]
    }
  }
];

console.log("═══════════════════════════════════════════════════════════");
console.log("30+ JOB EXPANDED VALIDATION SUITE");
console.log("═══════════════════════════════════════════════════════════\n");

let totalJobs = 0;
let fairCompetitive = 0;
let highSafe = 0;
let tooHigh = 0;
let lowUnderbid = 0;
let failed = 0;

// Variance tracking for ±% analysis
const variances: number[] = [];

for (let i = 0; i < jobs.length; i++) {
  const job = jobs[i];
  totalJobs++;
  const totalLF = job.input.runs.reduce((s, r) => s + r.linearFeet, 0);
  const gateCount = job.input.gates.length;

  console.log(`\n[${i + 1}/${jobs.length}] ${job.name}`);
  console.log(`  ${totalLF}ft | ${gateCount} gates | ${job.fenceType}`);

  try {
    const result = estimateFence(job.input, {
      fenceType: job.fenceType,
      woodStyle: (job as any).woodStyle,
      laborRatePerHr: 65,
      wastePct: 0.05,
      priceMap: PRICE_MAP
    });

    const costPerFoot = result.totalCost / totalLF;
    const midpoint = (job.expectedRange.min + job.expectedRange.max) / 2;
    const variancePct = ((result.totalCost - midpoint) / midpoint) * 100;
    variances.push(variancePct);

    let assessment = "";
    let category = "";

    if (result.totalCost < job.expectedRange.min) {
      assessment = "❌ LOW / UNDERBID RISK";
      category = "UNDERBID";
      lowUnderbid++;
    } else if (result.totalCost <= job.expectedRange.competitive) {
      assessment = "✅ FAIR / COMPETITIVE";
      category = "COMPETITIVE";
      fairCompetitive++;
    } else if (result.totalCost <= job.expectedRange.safe) {
      assessment = "✅ HIGH / SAFE";
      category = "SAFE";
      highSafe++;
    } else {
      assessment = "⚠️  TOO HIGH / UNCOMPETITIVE";
      category = "TOO_HIGH";
      tooHigh++;
    }

    console.log(`  Total: $${result.totalCost.toLocaleString()} (@ $${costPerFoot.toFixed(2)}/ft)`);
    console.log(`  Material: $${result.totalMaterialCost.toLocaleString()} | Labor: $${result.totalLaborCost.toLocaleString()} (${result.totalLaborHrs}hrs)`);
    console.log(`  Range: $${job.expectedRange.min.toLocaleString()} - $${job.expectedRange.max.toLocaleString()} (competitive: $${job.expectedRange.competitive.toLocaleString()}, safe: $${job.expectedRange.safe.toLocaleString()})`);
    console.log(`  Variance: ${variancePct > 0 ? '+' : ''}${variancePct.toFixed(1)}% from midpoint`);
    console.log(`  ${assessment}`);

  } catch (error: any) {
    console.log(`  ❌ FAILED: ${error.message}`);
    failed++;
  }
}

console.log("\n═══════════════════════════════════════════════════════════");
console.log("EXPANDED VALIDATION SUMMARY");
console.log("═══════════════════════════════════════════════════════════\n");

console.log(`Total Jobs: ${totalJobs}`);
console.log(`  ✅ FAIR/COMPETITIVE: ${fairCompetitive} (${Math.round(fairCompetitive/totalJobs*100)}%)`);
console.log(`  ✅ HIGH/SAFE: ${highSafe} (${Math.round(highSafe/totalJobs*100)}%)`);
console.log(`  ⚠️  TOO HIGH: ${tooHigh} (${Math.round(tooHigh/totalJobs*100)}%)`);
console.log(`  ❌ UNDERBID: ${lowUnderbid} (${Math.round(lowUnderbid/totalJobs*100)}%)`);
console.log(`  ❌ FAILED: ${failed} (${Math.round(failed/totalJobs*100)}%)`);

const goodJobs = fairCompetitive + highSafe;
const successRate = Math.round(goodJobs/totalJobs*100);

console.log(`\nSUCCESS RATE: ${goodJobs}/${totalJobs} (${successRate}%)`);

// Variance distribution analysis
const within10 = variances.filter(v => Math.abs(v) <= 10).length;
const within15 = variances.filter(v => Math.abs(v) <= 15).length;
const over20 = variances.filter(v => Math.abs(v) > 20).length;
const over25 = variances.filter(v => Math.abs(v) > 25).length;

console.log("\n═══════════════════════════════════════════════════════════");
console.log("VARIANCE DISTRIBUTION");
console.log("═══════════════════════════════════════════════════════════\n");

console.log(`Within ±10%: ${within10}/${totalJobs} (${Math.round(within10/totalJobs*100)}%)`);
console.log(`Within ±15%: ${within15}/${totalJobs} (${Math.round(within15/totalJobs*100)}%)`);
console.log(`Outliers >20%: ${over20}/${totalJobs} (${Math.round(over20/totalJobs*100)}%)`);
console.log(`Outliers >25%: ${over25}/${totalJobs} (${Math.round(over25/totalJobs*100)}%)`);

if (failed > 0) {
  console.log(`\n⚠️  CRITICAL: ${failed} job(s) failed validation`);
} else if (tooHigh > totalJobs * 0.2) {
  console.log(`\n⚠️  WARNING: Too many uncompetitive estimates (${tooHigh}/${totalJobs})`);
} else if (lowUnderbid > 0) {
  console.log(`\n⚠️  WARNING: ${lowUnderbid} job(s) below safe margin`);
} else if (successRate >= 80 && within15 >= totalJobs * 0.7) {
  console.log(`\n✅ VALIDATION READY: ${successRate}% success rate, ${Math.round(within15/totalJobs*100)}% within ±15%`);
} else {
  console.log(`\n⚠️  NEEDS WORK: Success rate ${successRate}% (target: 80%+), ±15% coverage ${Math.round(within15/totalJobs*100)}% (target: 70%+)`);
}

console.log("\n═══════════════════════════════════════════════════════════\n");
