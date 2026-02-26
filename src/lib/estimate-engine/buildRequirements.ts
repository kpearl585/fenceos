// ── Build Requirements Router ──────────────────────────────────
import type { EstimateInputs, MaterialRequirement } from "./types";
import { calculateWood } from "./calculateWood";
import { calculateChainLink } from "./calculateChainLink";
import { calculateVinyl } from "./calculateVinyl";

/**
 * Routes to the correct calculator based on fence type.
 * Returns an array of MaterialRequirements (unpriced SKU + qty pairs).
 */
export function buildRequirements(
  inputs: EstimateInputs
): MaterialRequirement[] {
  switch (inputs.fenceType) {
    case "wood_privacy":
      return calculateWood(inputs);
    case "chain_link":
      return calculateChainLink(inputs);
    case "vinyl":
      return calculateVinyl(inputs);
    default: {
      const _exhaustive: never = inputs.fenceType;
      throw new Error(`Unknown fence type: ${_exhaustive}`);
    }
  }
}
