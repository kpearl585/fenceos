// ── Estimate Engine – Public API ────────────────────────────────
//
// Pure functions only.  No Supabase imports.  No React.
// Consumers pass in a Map<sku, MaterialRow> loaded from the DB.
//

export { buildRequirements } from "./buildRequirements";
export { priceRequirements } from "./pricing";
export { calculateLabor, calculateTotals } from "./margin";
export { FENCE_TYPE_CONFIGS, FENCE_TYPE_OPTIONS, REQUIRED_SKUS } from "./fenceTypes";

export type {
  FenceType,
  EstimateInputs,
  MaterialRequirement,
  MaterialPriced,
  LaborLine,
  EstimateResult,
  EstimateTotals,
  MaterialRow,
} from "./types";

import type { EstimateInputs, EstimateResult, MaterialRow, FenceType } from "./types";
import { buildRequirements } from "./buildRequirements";
import { priceRequirements } from "./pricing";
import { calculateLabor, calculateTotals } from "./margin";
import { REQUIRED_SKUS } from "./fenceTypes";

// ── Validation ─────────────────────────────────────────────────

/**
 * Pre-flight check: ensures every required SKU for the given fence type
 * exists in the materials map.  Throws a descriptive error if any are
 * missing — this is meant to block save/quote at the UI layer.
 */
export function validateMaterialsMap(
  fenceType: FenceType,
  materialsMap: Map<string, MaterialRow>
): void {
  const required = REQUIRED_SKUS[fenceType];
  const missing = required.filter((sku) => !materialsMap.has(sku));
  if (missing.length > 0) {
    throw new Error(
      `Cannot build estimate: the following required material SKUs are missing ` +
      `from the materials table for fence type "${fenceType}": ${missing.join(", ")}. ` +
      `Run the materials seed migration or add them manually.`
    );
  }
}

// ── Main Engine ────────────────────────────────────────────────

/**
 * Full estimate engine: takes inputs + materials map, returns complete result.
 *
 * Pure function — no side effects, no DB calls.
 * The caller is responsible for loading materials from Supabase and
 * building the Map<sku, MaterialRow>.
 */
export function runEstimateEngine(
  inputs: EstimateInputs,
  materialsMap: Map<string, MaterialRow>
): EstimateResult {
  // 1. Validate required SKUs exist
  validateMaterialsMap(inputs.fenceType, materialsMap);

  // 2. Build material requirements (deterministic qty calculations)
  const requirements = buildRequirements(inputs);

  // 3. Resolve pricing from materials map
  const { pricedItems, missingSkus } = priceRequirements(
    requirements,
    materialsMap
  );

  // 4. Calculate labor
  const labor = calculateLabor(inputs);

  // 5. Aggregate totals
  const totals = calculateTotals(pricedItems, labor);

  // 6. Margin guard status
  const marginStatus: "ok" | "warning" =
    totals.grossMarginPct >= inputs.targetMarginPct ? "ok" : "warning";

  return {
    requirements,
    pricedItems,
    labor,
    totals,
    marginStatus,
    missingSkus,
  };
}
