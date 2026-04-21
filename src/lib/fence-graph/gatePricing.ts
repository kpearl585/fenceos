// ── Gate Pricing Engine ──────────────────────────────────────────
// Deterministic gate cost modeling to eliminate variance
// Replaces loose gate estimates with precise material + labor calculations

import type {
  GateSpec,
  GateLatchType,
  GateHingeType,
  GatePostInsert,
} from "./types";
import type { OrgEstimatorConfig } from "./config/types";
import { DEFAULT_ESTIMATOR_CONFIG } from "./config/defaults";

// ── Hardware → SKU maps ──────────────────────────────────────────
// Contractor selections on GateInput map to these SKUs. When the
// contractor leaves a field unset, the engine falls back to existing
// defaults below (HINGE_HD / GATE_LATCH / GATE_LATCH_POOL) so legacy
// estimates keep pricing the same.
const LATCH_SKU_BY_TYPE: Record<GateLatchType, string> = {
  standard:   "GATE_LATCH",
  lokk_latch: "LATCH_LOKK_LATCH",
  magnetic:   "LATCH_MAGNETIC",
  slide_bolt: "LATCH_SLIDE_BOLT",
};
const HINGE_SKU_BY_TYPE: Record<GateHingeType, string> = {
  standard:     "HINGE_HD",
  self_closing: "HINGE_SELF_CLOSING",
};
// Post-insert: "none" is explicit user choice meaning "no insert".
// Undefined means "contractor didn't pick one" (also no insert).
const POST_INSERT_SKU_BY_TYPE: Record<Exclude<GatePostInsert, "none">, string> = {
  aluminum: "ALUM_INSERT",   // reuses existing general-hardware SKU
  steel:    "STEEL_INSERT",
};

export interface GateHardware {
  gateSku: string;
  gateQty: number;
  gateUnitPrice: number;
  hingeSku: string;
  hingeQty: number;
  hingeUnitPrice: number;
  latchSku: string;
  latchQty: number;
  latchUnitPrice: number;
  stopSku?: string;
  stopQty?: number;
  stopUnitPrice?: number;
  dropRodSku?: string;
  dropRodQty?: number;
  dropRodUnitPrice?: number;
  springCloserSku?: string;
  springCloserQty?: number;
  springCloserUnitPrice?: number;
  // Post insert (reinforcing sleeve inside the hinge post — vinyl fences
  // usually need this for heavy gates; contractor explicitly selects).
  postInsertSku?: string;
  postInsertQty?: number;
  postInsertUnitPrice?: number;
}

export interface GateCost {
  materialCost: number;
  laborHours: number;
  laborCost: number;
  totalCost: number;
  hardware: GateHardware;
  breakdown: string;
  /** SKUs that were missing from the price map; surfaces as a confidence
   *  downgrade on the affected BOM line so missing pricing is not silent. */
  missingPriceSkus: string[];
}

/**
 * Calculate precise gate costs by type, width, and fence type
 * Eliminates gate variance by deterministic hardware + labor modeling
 */
export function calculateGateCost(
  gateSpec: GateSpec,
  fenceType: "vinyl" | "wood" | "chain_link" | "aluminum",
  priceMap: Record<string, number>,
  laborRatePerHr?: number,
  config: OrgEstimatorConfig = DEFAULT_ESTIMATOR_CONFIG
): GateCost {
  const { gateType, openingWidth_in, isPoolGate } = gateSpec;
  const widthFt = openingWidth_in / 12;

  // Gate width tier classification (affects material cost)
  const widthTier = classifyGateWidth(widthFt);

  // Base gate SKU selection
  const baseSku = selectGateSku(fenceType, gateType, widthTier);

  // Hardware package assembly (also records any SKUs missing from priceMap)
  const missingPriceSkus: string[] = [];
  const hardware = assembleGateHardware(
    baseSku,
    gateType,
    fenceType,
    isPoolGate,
    priceMap,
    missingPriceSkus,
    // Contractor-selected hardware from GateSpec (any may be undefined).
    // hardwareColor is intentionally not passed through — color is
    // metadata only in this PR (see README / PR #37). Different finish
    // colors typically cost the same from major distributors; if that
    // ever changes we can add color-aware SKU suffixes here.
    {
      hinges: gateSpec.hinges,
      latch: gateSpec.latch,
      postInsert: gateSpec.postInsert,
    },
  );

  // Calculate material cost
  const materialCost = calculateGateMaterialCost(hardware);

  // Calculate labor hours (complexity-based, config-driven)
  const laborHours = calculateGateLaborHours(gateType, widthTier, fenceType, isPoolGate, config);
  // laborRatePerHr is optional — when not provided, leave laborCost at 0.
  // Callers at the BOM level compute labor cost themselves from totalLaborHrs
  // × the real rate, so forcing a value here would only mislead future readers.
  const laborCost = typeof laborRatePerHr === "number" ? laborHours * laborRatePerHr : 0;

  // Generate breakdown
  const breakdown = generateGateBreakdown(hardware, laborHours, gateType, widthFt);

  return {
    materialCost,
    laborHours,
    laborCost,
    totalCost: materialCost + laborCost,
    hardware,
    breakdown,
    missingPriceSkus,
  };
}

/**
 * Classify gate width into pricing tiers
 */
function classifyGateWidth(widthFt: number): "small" | "standard" | "wide" | "extra_wide" {
  if (widthFt <= 4) return "small";
  if (widthFt <= 6) return "standard";
  if (widthFt <= 12) return "wide";
  return "extra_wide";
}

/**
 * Select correct gate SKU based on fence type and gate configuration
 */
function selectGateSku(
  fenceType: "vinyl" | "wood" | "chain_link" | "aluminum",
  gateType: "single" | "double",
  widthTier: "small" | "standard" | "wide" | "extra_wide"
): string {
  if (gateType === "double") {
    // Double gates: dedicated drive-gate SKUs for all four fence types.
    // Prior implementation used a 4ft single SKU × 2 for vinyl/aluminum,
    // which systematically under-bid wide double gates by $200–$500 each.
    switch (fenceType) {
      case "vinyl": return "GATE_VINYL_DBL";
      case "wood": return "GATE_WOOD_DBL";
      case "chain_link": return "GATE_CL_DBL";
      case "aluminum": return "GATE_ALUM_DBL";
    }
  }

  // Single gates: select by width tier
  if (widthTier === "standard" || widthTier === "wide") {
    // 6ft gates available for some types
    if (fenceType === "vinyl") return "GATE_VINYL_6FT";
  }

  // Default: 4ft walk gate
  switch (fenceType) {
    case "vinyl": return "GATE_VINYL_4FT";
    case "wood": return "GATE_WOOD_4FT";
    case "chain_link": return "GATE_CL_4FT";
    case "aluminum": return "GATE_ALUM_4FT";
  }
}

/**
 * Assemble complete hardware package for gate
 */
function assembleGateHardware(
  gateSku: string,
  gateType: "single" | "double",
  fenceType: "vinyl" | "wood" | "chain_link" | "aluminum",
  isPoolGate: boolean | undefined,
  priceMap: Record<string, number>,
  missingPriceSkus: string[] = [],
  // Contractor selections (all optional — undefined means "use engine default").
  selections: {
    hinges?: GateHingeType;
    latch?: GateLatchType;
    postInsert?: GatePostInsert;
  } = {},
): GateHardware {
  // Nullish-coalesce so `undefined` is caught (missing) and `0` is preserved
  // (legitimate zero price — e.g. comped item). Missing SKUs are recorded
  // so the BOM layer can mark the line for review rather than silently
  // under-bidding at $0.
  const p = (sku: string) => {
    const v = priceMap[sku];
    if (v == null) {
      if (!missingPriceSkus.includes(sku)) missingPriceSkus.push(sku);
      return 0;
    }
    return v;
  };

  // ── Hinge SKU ────────────────────────────────────────────────────
  // Contractor selection wins. When unset, use HINGE_HD (engine default).
  const hingeSku = selections.hinges
    ? HINGE_SKU_BY_TYPE[selections.hinges]
    : "HINGE_HD";

  // ── Latch SKU ────────────────────────────────────────────────────
  // Precedence: contractor's explicit `latch` wins. Only fall through
  // to the pool default when contractor did NOT pick one. Previous
  // behavior silently overrode contractor choice when isPoolGate=true,
  // which confused contractors who intentionally specced a LokkLatch or
  // magnetic latch on a pool gate. See PR #39 discussion.
  const latchSku = selections.latch
    ? LATCH_SKU_BY_TYPE[selections.latch]
    : (isPoolGate ? "GATE_LATCH_POOL" : "GATE_LATCH");

  // Double-gate SKUs (GATE_*_DBL) are priced as one complete kit containing
  // both leaves. Single-gate SKUs are one leaf. Keeping gateQty at 1 for
  // doubles matches how the vendor invoices them and prevents the prior
  // BOM-map collision between single and double rows of the same SKU.
  const hardware: GateHardware = {
    gateSku,
    gateQty: 1,
    gateUnitPrice: p(gateSku),

    // Hinges: priced per pair.
    // Single walk gate: 2 pairs (top + bottom for sag prevention).
    // Double drive gate: 4 pairs (2 per leaf).
    // Quantity stays fixed even when switching to self-closing hinges;
    // revisiting quantity policy (Tru-Close is often installed at
    // fewer pairs) is a separate engine debate, not a pricing one.
    hingeSku,
    hingeQty: gateType === "double" ? 4 : 2,
    hingeUnitPrice: p(hingeSku),

    // Latch
    latchSku,
    latchQty: 1, // 1 latch per gate
    latchUnitPrice: p(latchSku),

    // Gate stops (pair)
    stopSku: "GATE_STOP",
    stopQty: 1, // 1 pair per gate
    stopUnitPrice: p("GATE_STOP"),
  };

  // Double gates need drop rod (cane bolt)
  if (gateType === "double") {
    hardware.dropRodSku = "DROP_ROD";
    hardware.dropRodQty = 1;
    hardware.dropRodUnitPrice = p("DROP_ROD");
  }

  // ── Spring closer ───────────────────────────────────────────────
  // Pool gates legally require a self-closing mechanism. Historically
  // we've added a GATE_SPRING_CLOSER line to pool gates as a separate
  // add-on. If the contractor explicitly picks self-closing hinges
  // (HINGE_SELF_CLOSING — Tru-Close has the spring built in), skip the
  // separate closer to avoid double-pricing.
  const selfClosingHingesPicked = selections.hinges === "self_closing";
  if (isPoolGate && !selfClosingHingesPicked) {
    hardware.springCloserSku = "GATE_SPRING_CLOSER";
    hardware.springCloserQty = 1;
    hardware.springCloserUnitPrice = p("GATE_SPRING_CLOSER");
  }

  // ── Post insert ──────────────────────────────────────────────────
  // Contractor explicitly selects a reinforcing insert for the hinge
  // post. Vinyl-specific in the real world (aluminum or steel 2x2
  // sleeve inside a 5x5 vinyl hinge post for heavy gates); engine adds
  // the line regardless of fence type — respect contractor's call.
  // "none" means "explicitly no insert" (same effect as unselected).
  if (
    selections.postInsert &&
    selections.postInsert !== "none"
  ) {
    const insertSku = POST_INSERT_SKU_BY_TYPE[selections.postInsert];
    hardware.postInsertSku = insertSku;
    hardware.postInsertQty = 1;
    hardware.postInsertUnitPrice = p(insertSku);
  }

  return hardware;
}

/**
 * Calculate total material cost from hardware package
 */
function calculateGateMaterialCost(hardware: GateHardware): number {
  let total = 0;

  total += hardware.gateQty * hardware.gateUnitPrice;
  total += hardware.hingeQty * hardware.hingeUnitPrice;
  total += hardware.latchQty * hardware.latchUnitPrice;

  if (hardware.stopSku && hardware.stopQty && hardware.stopUnitPrice) {
    total += hardware.stopQty * hardware.stopUnitPrice;
  }

  if (hardware.dropRodSku && hardware.dropRodQty && hardware.dropRodUnitPrice) {
    total += hardware.dropRodQty * hardware.dropRodUnitPrice;
  }

  if (hardware.springCloserSku && hardware.springCloserQty && hardware.springCloserUnitPrice) {
    total += hardware.springCloserQty * hardware.springCloserUnitPrice;
  }

  if (hardware.postInsertSku && hardware.postInsertQty && hardware.postInsertUnitPrice) {
    total += hardware.postInsertQty * hardware.postInsertUnitPrice;
  }

  return total;
}

/**
 * Calculate labor hours based on gate complexity
 * Factors: type, width, fence material, pool code requirements
 */
function calculateGateLaborHours(
  gateType: "single" | "double",
  widthTier: "small" | "standard" | "wide" | "extra_wide",
  fenceType: "vinyl" | "wood" | "chain_link" | "aluminum",
  isPoolGate: boolean | undefined,
  config: OrgEstimatorConfig = DEFAULT_ESTIMATOR_CONFIG
): number {
  // Base hours from config
  let baseHours = gateType === "single"
    ? config.gateLaborBase.single
    : config.gateLaborBase.double;

  // Width complexity modifier from config
  const wm = config.gateWidthMultipliers;
  const widthModifiers: Record<string, number> = {
    small: wm.small,
    standard: wm.standard,
    wide: wm.wide,
    extra_wide: wm.extraWide,
  };
  baseHours *= widthModifiers[widthTier] ?? 1.0;

  // Fence type modifier (material-specific — kept inline, not worth config)
  const fenceTypeModifiers = {
    vinyl: 1.0,
    wood: 1.1,
    chain_link: 0.9,
    aluminum: 1.0,
  };
  baseHours *= fenceTypeModifiers[fenceType];

  // Pool gate modifier from config
  if (isPoolGate) {
    baseHours *= config.gatePoolMultiplier;
  }

  // Round to 1 decimal
  return Math.round(baseHours * 10) / 10;
}

/**
 * Generate human-readable cost breakdown
 */
function generateGateBreakdown(
  hardware: GateHardware,
  laborHours: number,
  gateType: "single" | "double",
  widthFt: number
): string {
  const parts: string[] = [];

  parts.push(`${gateType} gate ${widthFt}ft`);
  parts.push(`${hardware.gateQty}× gate @ $${hardware.gateUnitPrice}`);
  parts.push(`${hardware.hingeQty}× hinges`);
  parts.push(`1× latch`);

  if (hardware.stopQty) parts.push(`1× stop`);
  if (hardware.dropRodQty) parts.push(`1× drop rod`);
  if (hardware.springCloserQty) parts.push(`1× spring closer`);
  if (hardware.postInsertQty) parts.push(`1× ${hardware.postInsertSku?.toLowerCase().replace(/_/g, " ") ?? "post insert"}`);

  parts.push(`${laborHours}hrs labor`);

  return parts.join(", ");
}

/**
 * Batch calculate costs for multiple gates
 */
export function calculateAllGateCosts(
  gates: GateSpec[],
  fenceType: "vinyl" | "wood" | "chain_link" | "aluminum",
  priceMap: Record<string, number>,
  laborRatePerHr?: number,
  config: OrgEstimatorConfig = DEFAULT_ESTIMATOR_CONFIG
): {
  gates: GateCost[];
  totalMaterial: number;
  totalLabor: number;
  totalCost: number;
} {
  const gateCosts = gates.map(spec =>
    calculateGateCost(spec, fenceType, priceMap, laborRatePerHr, config)
  );

  const totalMaterial = gateCosts.reduce((sum, g) => sum + g.materialCost, 0);
  const totalLabor = gateCosts.reduce((sum, g) => sum + g.laborCost, 0);

  return {
    gates: gateCosts,
    totalMaterial,
    totalLabor,
    totalCost: totalMaterial + totalLabor,
  };
}
