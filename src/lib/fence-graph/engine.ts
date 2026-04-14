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
  CommercialSummary, QuoteMetadata, CustomerProposalSummary, ShoppingListGroup,
} from "./types";
export {
  PRODUCT_LINES, INSTALL_RULES, SOIL_CONCRETE_FACTORS,
} from "./types";

// Config system
export type { OrgEstimatorConfig, DeepPartial } from "./config/types";
export { DEFAULT_ESTIMATOR_CONFIG } from "./config/defaults";
export {
  mergeEstimatorConfig,
  resolveEstimatorConfigFromOrgSettings,
} from "./config/resolveEstimatorConfig";

// Quote package helpers
export {
  buildQuoteMetadata,
  buildTermsAndConditions,
  groupBomIntoShoppingList,
  DEFAULT_TERMS,
} from "./quotePackage";

// Closeout intelligence
export { analyzeEstimateCloseout } from "./closeout/analyzeCloseout";
export type {
  CloseoutActuals,
  FieldConditions,
  EstimateCloseoutAnalysis,
  CostVarianceSummary,
  CategoryVariance,
  CalibrationSignal,
  ContractorLearningSummary,
} from "./closeout/types";

import { buildFenceGraph } from "./builder";
import { generateBom, type FenceType, type WoodStyle } from "./bom/index";
import type { FenceProjectInput, FenceEstimateResult } from "./types";
import type { OrgEstimatorConfig, DeepPartial } from "./config/types";
import { mergeEstimatorConfig } from "./config/resolveEstimatorConfig";

export interface EstimateOptions {
  fenceType?: FenceType;
  woodStyle?: WoodStyle;
  laborRatePerHr?: number;
  wastePct?: number;
  priceMap?: Record<string, number>;
  /** Org-level estimator config (merged over defaults if partial) */
  estimatorConfig?: OrgEstimatorConfig | DeepPartial<OrgEstimatorConfig>;
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

  // Resolve full config: if caller provided a partial, merge over defaults
  const config = opts.estimatorConfig
    ? ("configVersion" in opts.estimatorConfig
        ? opts.estimatorConfig as OrgEstimatorConfig
        : mergeEstimatorConfig(opts.estimatorConfig as DeepPartial<OrgEstimatorConfig>))
    : mergeEstimatorConfig(null);

  const graph = buildFenceGraph(input, config);
  return generateBom(graph, {
    fenceType: opts.fenceType ?? "vinyl",
    woodStyle: opts.woodStyle,
    laborRatePerHr: opts.laborRatePerHr ?? 65,
    wastePct: opts.wastePct ?? wastePct,
    priceMap: opts.priceMap ?? {},
    estimatorConfig: config,
    // Pass through regulatory costs from project input
    permitCost: input.permitCost,
    inspectionCost: input.inspectionCost,
    engineeringCost: input.engineeringCost,
    surveyCost: input.surveyCost,
  });
}
