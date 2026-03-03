// ── FenceGraph Engine — Main Entry Point ─────────────────────────
// Public API for the vinyl fence estimation engine.
// Usage: import { estimateFence } from "@/lib/fence-graph/engine"

export { buildFenceGraph } from "./builder";
export { generateBom } from "./bom";
export { segmentRun, countPanelsToBuy } from "./segmentation";
export { calcConcretePerPost, calcTotalConcrete } from "./concrete";
export type {
  FenceProjectInput, FenceGraph, FenceEstimateResult,
  BomItem, LaborDriver, RunInput, GateInput,
  FenceNode, FenceEdge, ProductLineConfig,
} from "./types";
export { PRODUCT_LINES, INSTALL_RULES, SOIL_CONCRETE_FACTORS } from "./types";

import { buildFenceGraph } from "./builder";
import { generateBom } from "./bom";
import type { FenceProjectInput, FenceEstimateResult } from "./types";

/**
 * Full pipeline: contractor input → FenceGraph → BOM → result
 */
export function estimateFence(
  input: FenceProjectInput,
  laborRatePerHr = 65,
  wastePct = 0.05
): FenceEstimateResult {
  const graph = buildFenceGraph(input);
  return generateBom(graph, laborRatePerHr, wastePct);
}
