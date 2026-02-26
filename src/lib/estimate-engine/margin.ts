// ── Margin & Labor Calculations ────────────────────────────────
import type { MaterialPriced, LaborLine, EstimateTotals, EstimateInputs } from "./types";
import { FENCE_TYPE_CONFIGS } from "./fenceTypes";

/**
 * Calculate labor hours and cost/price.
 * Labor price is marked up to achieve the target margin:
 *   price = cost / (1 - targetMarginPct)
 */
export function calculateLabor(inputs: EstimateInputs): LaborLine {
  const cfg = FENCE_TYPE_CONFIGS[inputs.fenceType];
  const hours = round2((inputs.linearFeet / 100) * cfg.laborHoursPer100Ft);
  const cost = round2(hours * inputs.laborRatePerHr);
  const price = round2(cost / (1 - inputs.targetMarginPct));

  return { hours, rate: inputs.laborRatePerHr, cost, price };
}

/**
 * Aggregate priced materials + labor into financial totals.
 */
export function calculateTotals(
  pricedItems: MaterialPriced[],
  labor: LaborLine
): EstimateTotals {
  const materialsSubtotal = round2(
    pricedItems.reduce((sum, i) => sum + i.extendedPrice, 0)
  );
  const materialsCost = round2(
    pricedItems.reduce((sum, i) => sum + i.extendedCost, 0)
  );

  const laborSubtotal = labor.price;
  const subtotal = round2(materialsSubtotal + laborSubtotal);
  const total = subtotal; // tax = 0 for now

  const estimatedCost = round2(materialsCost + labor.cost);
  const grossProfit = round2(total - estimatedCost);
  const grossMarginPct = total > 0 ? round2(grossProfit / total) : 0;

  return {
    materialsSubtotal,
    laborSubtotal,
    subtotal,
    total,
    estimatedCost,
    grossProfit,
    grossMarginPct,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
