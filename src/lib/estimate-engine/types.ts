// ── Estimate Engine Types ──────────────────────────────────────

/** Supported fence types for MVP */
export type FenceType = "wood_privacy" | "chain_link" | "vinyl";

/** Inputs required to run the estimate engine */
export interface EstimateInputs {
  fenceType: FenceType;
  linearFeet: number;
  gateCount: number;
  postSpacing: number;   // feet between posts
  height: number;        // feet
  wasteFactorPct: number;   // decimal, e.g. 0.05
  targetMarginPct: number;  // decimal, e.g. 0.35
  laborRatePerHr: number;   // dollars per hour, e.g. 65
}

/** A single material requirement before pricing */
export interface MaterialRequirement {
  sku: string;
  name: string;
  unit: string;
  qty: number;
  meta?: Record<string, unknown>;
}

/** A material requirement after pricing resolution */
export interface MaterialPriced extends MaterialRequirement {
  unitCost: number;
  unitPrice: number;
  extendedCost: number;
  extendedPrice: number;
}

/** Labor line item */
export interface LaborLine {
  hours: number;
  rate: number;
  cost: number;
  price: number;
}

/** Complete engine output */
export interface EstimateResult {
  requirements: MaterialRequirement[];
  pricedItems: MaterialPriced[];
  labor: LaborLine;
  totals: EstimateTotals;
  marginStatus: "ok" | "warning";
  missingSkus: string[];
}

/** Computed financial totals */
export interface EstimateTotals {
  materialsSubtotal: number;  // sum of extended_price (sell side)
  laborSubtotal: number;      // labor sell price
  subtotal: number;           // materials + labor sell
  total: number;              // subtotal (tax=0 for now)
  estimatedCost: number;      // sum of extended_cost + labor cost
  grossProfit: number;        // total - estimatedCost
  grossMarginPct: number;     // grossProfit / total (decimal)
}

/** Row shape from public.materials */
export interface MaterialRow {
  id: string;
  sku: string;
  name: string;
  unit: string;
  unit_cost: number;
  unit_price: number;
}
