// ── Gate Pricing Engine ──────────────────────────────────────────
// Deterministic gate cost modeling to eliminate variance
// Replaces loose gate estimates with precise material + labor calculations

import type { GateSpec } from "./types";
import type { OrgEstimatorConfig } from "./config/types";
import { DEFAULT_ESTIMATOR_CONFIG } from "./config/defaults";

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
}

export interface GateCost {
  materialCost: number;
  laborHours: number;
  laborCost: number;
  totalCost: number;
  hardware: GateHardware;
  breakdown: string;
}

/**
 * Calculate precise gate costs by type, width, and fence type
 * Eliminates gate variance by deterministic hardware + labor modeling
 */
export function calculateGateCost(
  gateSpec: GateSpec,
  fenceType: "vinyl" | "wood" | "chain_link" | "aluminum",
  priceMap: Record<string, number>,
  laborRatePerHr: number,
  config: OrgEstimatorConfig = DEFAULT_ESTIMATOR_CONFIG
): GateCost {
  const { gateType, openingWidth_in, isPoolGate } = gateSpec;
  const widthFt = openingWidth_in / 12;

  // Gate width tier classification (affects material cost)
  const widthTier = classifyGateWidth(widthFt);

  // Base gate SKU selection
  const baseSku = selectGateSku(fenceType, gateType, widthTier);

  // Hardware package assembly
  const hardware = assembleGateHardware(
    baseSku,
    gateType,
    fenceType,
    isPoolGate,
    priceMap
  );

  // Calculate material cost
  const materialCost = calculateGateMaterialCost(hardware);

  // Calculate labor hours (complexity-based, config-driven)
  const laborHours = calculateGateLaborHours(gateType, widthTier, fenceType, isPoolGate, config);
  const laborCost = laborHours * laborRatePerHr;

  // Generate breakdown
  const breakdown = generateGateBreakdown(hardware, laborHours, gateType, widthFt);

  return {
    materialCost,
    laborHours,
    laborCost,
    totalCost: materialCost + laborCost,
    hardware,
    breakdown,
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
    // Double gates: use appropriate double/drive gate SKU
    switch (fenceType) {
      case "vinyl": return "GATE_VINYL_4FT"; // 2x single for double
      case "wood": return "GATE_WOOD_DBL";
      case "chain_link": return "GATE_CL_DBL";
      case "aluminum": return "GATE_ALUM_4FT"; // 2x single for double
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
  priceMap: Record<string, number>
): GateHardware {
  const p = (sku: string) => priceMap[sku] || 0;

  const hardware: GateHardware = {
    gateSku,
    gateQty: gateType === "double" ? 2 : 1, // Double gates = 2 leaves
    gateUnitPrice: p(gateSku),

    // Hinges: 2 pairs per leaf
    hingeSku: "HINGE_HD",
    hingeQty: gateType === "double" ? 4 : 2, // 2 pairs per leaf
    hingeUnitPrice: p("HINGE_HD"),

    // Latch
    latchSku: isPoolGate ? "GATE_LATCH_POOL" : "GATE_LATCH",
    latchQty: 1, // 1 latch per gate
    latchUnitPrice: p(isPoolGate ? "GATE_LATCH_POOL" : "GATE_LATCH"),

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

  // Pool gates may need spring closer
  if (isPoolGate) {
    hardware.springCloserSku = "GATE_SPRING_CLOSER";
    hardware.springCloserQty = 1;
    hardware.springCloserUnitPrice = p("GATE_SPRING_CLOSER");
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
  laborRatePerHr: number,
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
