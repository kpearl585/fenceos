// ── OrgEstimatorConfig Types ─────────────────────────────────────
// Every tuneable constant in the estimation engine lives here.
// Org-level overrides are stored in org_settings.estimator_config_json
// and deep-merged over DEFAULT_ESTIMATOR_CONFIG at runtime.

// ── Deep-partial helper ──────────────────────────────────────────
// Allows org overrides to specify only the fields they want to change.
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object
    ? T[K] extends Array<infer U>
      ? Array<DeepPartial<U>>
      : DeepPartial<T[K]>
    : T[K];
};

// ── Labor rates by fence type ────────────────────────────────────
// Each value is hours per unit (e.g., 0.25 = 15 minutes per post hole)

export interface VinylLaborRates {
  holeDig: number;       // hrs per post hole
  postSet: number;       // hrs per post (plumb + brace)
  sectionInstall: number; // hrs per section (rails + panel/pickets)
  cutting: number;       // hrs per cut operation
  racking: number;       // hrs per racked section (slope field fab)
  concretePour: number;  // hrs per post (mix + pour)
}

export interface WoodLaborRates {
  holeDig: number;
  postSet: number;
  railInstall: number;   // hrs per rail piece
  boardNailing: number;  // hrs per section (panel/picket attachment)
  bobInstall: number;    // hrs per board (board-on-board only)
  cutting: number;
  racking: number;
  concretePour: number;
}

export interface ChainLinkLaborRates {
  holeDig: number;
  postSet: number;
  topRail: number;       // hrs per rail section
  fabricStretch: number;  // hrs per run (unroll + stretch + tie)
  tieWire: number;       // hrs per post (fastening)
  concretePour: number;
}

export interface AluminumLaborRates {
  holeDig: number;
  postSet: number;
  panelInstall: number;  // hrs per section (panel + rail)
  cutting: number;
  racking: number;
  concretePour: number;
}

// ── Main config type ─────────────────────────────────────────────

export interface OrgEstimatorConfig {
  /** Schema version for forward compatibility */
  configVersion: 1;

  /** Labor rates (hrs per unit) by fence type */
  labor: {
    vinyl: VinylLaborRates;
    wood: WoodLaborRates;
    chain_link: ChainLinkLaborRates;
    aluminum: AluminumLaborRates;
  };

  /** Per-estimate labor speed adjustment (1.0 = normal, 1.3 = 30% slower) */
  laborEfficiency: {
    baseMultiplier: number;
  };

  /** Gate installation base hours */
  gateLaborBase: {
    single: number;
    double: number;
  };

  /** Gate labor multipliers by width tier */
  gateWidthMultipliers: {
    small: number;       // <= 4ft
    standard: number;    // 5-6ft
    wide: number;        // 7-12ft
    extraWide: number;   // 13ft+
  };

  /** Pool gate labor multiplier (applied on top of base) */
  gatePoolMultiplier: number;

  /** Gate clearance gaps in inches */
  gateGaps: {
    hinge: number;
    latch: number;
    center: number;  // double gate center gap
  };

  /** Concrete calculation parameters */
  concrete: {
    bagYieldCuFt: number;      // cu ft yield per bag (80lb = 0.60)
    gravelBagCuFt: number;     // cu ft per gravel bag
    floridaDepthIn: number;    // min depth for sandy/wet FL soil
  };

  /** Material calculation assumptions */
  material: {
    vinylPicketsPerFoot: number;       // pickets per linear foot
    woodPicketWidth: number;           // inches (actual width of 1x6)
    woodBoBOverlapPct: number;         // board-on-board overlap (0.24 = 24%)
    screwsPerSection: number;          // screws per fence section
    chainLinkPostOcFt: number;        // line post on-center spacing
    chainLinkTopRailStockFt: number;  // top rail stock length
  };

  /** Fixed overhead labor per job */
  overhead: {
    fixed: {
      setupHrs: number;    // truck unload, tool staging
      layoutHrs: number;   // measuring, staking, string lines
    };
    perDay: {
      cleanupHrs: number;  // end-of-day sweep + load
    };
  };

  /** Delivery and logistics */
  logistics: {
    deliveryFee: number;           // flat delivery charge ($)
    freeDeliveryThreshold: number; // material $ above which delivery is free
  };

  /** Equipment rental costs per day ($) */
  equipment: {
    augerPerDay: number;
    mixerPerDay: number;
    stretcherPerDay: number;  // chain link fence stretcher
    sawPerDay: number;         // chop saw / metal blade
  };

  /** Old fence removal parameters */
  removal: {
    laborPerLf: number;        // hrs per linear foot of removal
    postExtractionHrs: number; // hrs per post to extract old concrete
    disposalCost: number;      // flat disposal/dumpster cost ($)
  };

  /** Pricing rules */
  pricing: {
    minimumJobCharge: number;  // floor price regardless of scope ($)
  };

  /** Production schedule */
  production: {
    hoursPerDay: number;  // productive install hours per work day
  };

  /** Default waste factor */
  waste: {
    defaultPct: number;  // 0.05 = 5%
  };

  /** Regional adjustments */
  region: {
    key: string;              // region identifier (e.g., "florida", "west")
    laborMultiplier: number;   // 1.0 = base, 1.15 = 15% more
    materialMultiplier: number; // applied to default prices
  };
}
