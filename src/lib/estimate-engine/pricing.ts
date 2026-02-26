// ── Pricing: resolve SKUs against public.materials rows ────────
import type { MaterialRequirement, MaterialPriced, MaterialRow } from "./types";

/**
 * Resolves raw requirements against a Map<sku, MaterialRow> from the DB.
 *
 * Returns priced line items and a list of any SKUs that could not be
 * resolved.  Callers MUST check missingSkus.length and block save/quote
 * if any are missing.
 */
export function priceRequirements(
  requirements: MaterialRequirement[],
  materialsMap: Map<string, MaterialRow>
): { pricedItems: MaterialPriced[]; missingSkus: string[] } {
  const pricedItems: MaterialPriced[] = [];
  const missingSkus: string[] = [];

  for (const req of requirements) {
    const mat = materialsMap.get(req.sku);
    if (!mat) {
      missingSkus.push(req.sku);
      continue;
    }

    const unitCost = Number(mat.unit_cost);
    const unitPrice = Number(mat.unit_price);

    if (unitCost <= 0 || unitPrice <= 0) {
      throw new Error(
        `Material SKU "${req.sku}" has invalid pricing: ` +
        `unit_cost=${unitCost}, unit_price=${unitPrice}. ` +
        `Both must be positive numbers.`
      );
    }

    pricedItems.push({
      ...req,
      unitCost,
      unitPrice,
      extendedCost: round2(unitCost * req.qty),
      extendedPrice: round2(unitPrice * req.qty),
    });
  }

  return { pricedItems, missingSkus };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
