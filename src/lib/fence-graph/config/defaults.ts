// ── Default Estimator Config ─────────────────────────────────────
// These values match the current hardcoded engine behavior.
// New orgs get these defaults; contractors override via Settings.

import type { OrgEstimatorConfig } from "./types";

export const DEFAULT_ESTIMATOR_CONFIG: Readonly<OrgEstimatorConfig> = {
  configVersion: 1,

  // ── Labor rates (hrs per unit) ─────────────────────────────────
  // Sourced from current BOM generators as of April 2026.
  labor: {
    vinyl: {
      holeDig: 0.25,
      postSet: 0.20,
      sectionInstall: 0.50,
      cutting: 0.15,
      racking: 0.30,
      concretePour: 0.08,
    },
    wood: {
      holeDig: 0.25,
      postSet: 0.20,
      railInstall: 0.10,
      boardNailing: 0.40,
      bobInstall: 0.06,
      cutting: 0.15,
      racking: 0.30,
      concretePour: 0.08,
    },
    chain_link: {
      holeDig: 0.25,
      postSet: 0.20,
      topRail: 0.20,
      fabricStretch: 1.50,
      tieWire: 0.15,
      concretePour: 0.10,
    },
    aluminum: {
      holeDig: 0.25,       // corrected from 0.75 (was 3x too high)
      postSet: 0.20,        // corrected from 0.50
      panelInstall: 0.45,   // corrected from 1.25
      cutting: 0.20,
      racking: 0.40,
      concretePour: 0.10,
    },
  },

  // ── Per-estimate labor adjustment ──────────────────────────────
  laborEfficiency: {
    baseMultiplier: 1.0,   // 1.0 = normal speed, 1.3 = 30% harder job
  },

  // ── Gate labor ─────────────────────────────────────────────────
  gateLaborBase: {
    single: 1.5,   // base hours for single gate install
    double: 3.0,   // base hours for double gate install
  },
  gateWidthMultipliers: {
    small: 1.0,       // <= 4ft: baseline
    standard: 1.1,    // 5-6ft: +10%
    wide: 1.3,        // 7-12ft: +30%
    extraWide: 1.5,   // 13ft+: +50%
  },
  gatePoolMultiplier: 1.2,   // +20% for pool code compliance

  // ── Gate clearance gaps (inches) ───────────────────────────────
  gateGaps: {
    hinge: 0.75,
    latch: 0.50,
    center: 1.0,    // double gate center gap
  },

  // ── Concrete ───────────────────────────────────────────────────
  concrete: {
    bagYieldCuFt: 0.60,       // 80lb bag yield
    gravelBagCuFt: 0.50,      // 40lb gravel bag
    floridaDepthIn: 42,        // min post depth for FL sandy/wet soil
  },

  // ── Material assumptions ───────────────────────────────────────
  material: {
    vinylPicketsPerFoot: 2,           // 6" on-center spacing
    woodPicketWidth: 5.5,             // 1x6 actual width (inches)
    woodBoBOverlapPct: 0.24,          // 24% overlap for board-on-board
    screwsPerSection: 25,             // screws per fence section
    chainLinkPostOcFt: 10,           // line post on-center (feet)
    chainLinkTopRailStockFt: 21,     // standard top rail stock length (feet)
  },

  // ── Overhead (per job) ─────────────────────────────────────────
  overhead: {
    fixed: {
      setupHrs: 1.5,     // unload truck, stage tools, prep site
      layoutHrs: 0.75,   // measure, stake, string lines
    },
    perDay: {
      cleanupHrs: 0.5,   // end-of-day sweep, load scraps
    },
  },

  // ── Delivery / logistics ───────────────────────────────────────
  logistics: {
    deliveryFee: 95.00,            // flat delivery charge
    freeDeliveryThreshold: 500,    // waived above this material total
  },

  // ── Equipment rental ($/day) ───────────────────────────────────
  equipment: {
    augerPerDay: 95,
    mixerPerDay: 55,
    stretcherPerDay: 45,   // chain link fence stretcher
    sawPerDay: 50,          // chop saw for aluminum/metal
  },

  // ── Old fence removal ──────────────────────────────────────────
  removal: {
    laborPerLf: 0.08,          // hrs per linear foot of removal
    postExtractionHrs: 0.25,   // hrs per post to extract old concrete
    disposalCost: 325,          // flat dumpster/disposal cost
  },

  // ── Pricing rules ──────────────────────────────────────────────
  pricing: {
    minimumJobCharge: 0,   // 0 = disabled; contractor sets their own floor
  },

  // ── Production schedule ────────────────────────────────────────
  production: {
    hoursPerDay: 8,
  },

  // ── Default waste factor ───────────────────────────────────────
  waste: {
    defaultPct: 0.05,  // 5%
  },

  // ── Regional adjustments ───────────────────────────────────────
  region: {
    key: "base",
    laborMultiplier: 1.0,
    materialMultiplier: 1.0,
  },
};
