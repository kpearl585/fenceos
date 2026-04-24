// ── FenceGraph Engine — Main Entry Point ─────────────────────────
// Public API for the multi-type fence estimation engine.
// Usage: import { estimateFence } from "@/lib/fence-graph/engine"

export { buildFenceGraph } from "./builder";
export { generateBom, type FenceType, type WoodStyle } from "./bom/index";
export { segmentRun, countPanelsToBuy } from "./segmentation";
export { calcConcretePerPost, calcTotalConcrete } from "./concrete";
export { cuttingStockOptimizer, updateWasteCalibration, DEFAULT_WASTE_CALIBRATION } from "./bom/shared";
export type {
  FenceProjectInput, FenceGraph, FenceEstimateResult,
  BomItem, LaborDriver, RunInput, GateInput,
  FenceNode, FenceEdge, ProductLineConfig,
} from "./types";
export {
  PRODUCT_LINES, INSTALL_RULES, SOIL_CONCRETE_FACTORS,
} from "./types";

import { buildFenceGraph } from "./builder";
import { generateBom, type FenceType, type WoodStyle } from "./bom/index";
import type { FenceProjectInput, FenceEstimateResult } from "./types";
import { assertValidEstimateOptions, assertValidFenceProjectInput } from "./estimateInput";

export interface EstimateOptions {
  fenceType?: FenceType;
  woodStyle?: WoodStyle;
  laborRatePerHr?: number;
  wastePct?: number;
  priceMap?: Record<string, number>;
}

/**
 * Full pipeline: contractor input → FenceGraph → BOM → result
 */
export function estimateFence(
  input: FenceProjectInput,
  laborRateOrOptions: number | EstimateOptions = 65,
  wastePct = 0.05
): FenceEstimateResult {
  const opts: EstimateOptions = typeof laborRateOrOptions === "number"
    ? { laborRatePerHr: laborRateOrOptions, wastePct }
    : laborRateOrOptions;

  assertValidFenceProjectInput(input);
  assertValidEstimateOptions({
    laborRatePerHr: opts.laborRatePerHr ?? 65,
    wastePct: opts.wastePct ?? wastePct,
    fenceType: opts.fenceType ?? "vinyl",
    woodStyle: opts.woodStyle,
  });

  const graph = buildFenceGraph(input);
  return generateBom(graph, {
    fenceType: opts.fenceType ?? "vinyl",
    woodStyle: opts.woodStyle,
    laborRatePerHr: opts.laborRatePerHr ?? 65,
    wastePct: opts.wastePct ?? wastePct,
    priceMap: opts.priceMap ?? {},
  });
}
