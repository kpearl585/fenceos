import { createClient } from "@/lib/supabase/server";

export interface ChangeOrderLineInput {
  sku?: string;
  name: string;
  type: "material" | "labor";
  qty: number;
  unit_cost?: number;
  unit_price?: number;
}

export interface ChangeOrderCalculation {
  lines: {
    sku: string | null;
    name: string;
    type: "material" | "labor";
    qty: number;
    unit_cost: number;
    unit_price: number;
    extended_cost: number;
    extended_price: number;
  }[];
  subtotal: number;
  cost_total: number;
  gross_profit: number;
  gross_margin_pct: number;
  /** Current job totals */
  job_current_price: number;
  job_current_cost: number;
  job_current_margin_pct: number;
  /** Projected totals after change order */
  projected_price: number;
  projected_cost: number;
  projected_margin_pct: number;
  /** Delta */
  margin_delta_pct: number;
  /** Target from estimate */
  target_margin_pct: number;
  /** Whether projected margin drops below target */
  requires_owner_approval: boolean;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Calculate a change order's financials and margin impact.
 *
 * For material lines with a SKU, resolves current pricing from
 * the materials table. For labor or lines without SKU, uses
 * the provided unit_cost / unit_price.
 *
 * Compares the projected job margin against the estimate's
 * target_margin_pct to determine if owner approval is required.
 */
export async function calculateChangeOrder(
  jobId: string,
  orgId: string,
  lineInputs: ChangeOrderLineInput[]
): Promise<ChangeOrderCalculation> {
  const supabase = await createClient();

  // 1. Load current job financials
  const { data: job, error: jobErr } = await supabase
    .from("jobs")
    .select("total_price, total_cost, gross_margin_pct, estimate_id")
    .eq("id", jobId)
    .single();
  if (jobErr || !job) throw new Error("Job not found");

  // 2. Load target margin from linked estimate
  let targetMarginPct = 0.35; // fallback default
  if (job.estimate_id) {
    const { data: est } = await supabase
      .from("estimates")
      .select("target_margin_pct")
      .eq("id", job.estimate_id)
      .single();
    if (est?.target_margin_pct != null) {
      targetMarginPct = Number(est.target_margin_pct);
    }
  }

  // 3. Resolve SKU pricing for material lines
  const skus = lineInputs
    .filter((l) => l.type === "material" && l.sku)
    .map((l) => l.sku as string);

  const skuPricing: Record<string, { unit_cost: number; unit_price: number }> = {};
  if (skus.length > 0) {
    const { data: mats } = await supabase
      .from("materials")
      .select("sku, unit_cost, unit_price")
      .eq("org_id", orgId)
      .in("sku", skus);
    if (mats) {
      for (const m of mats) {
        skuPricing[m.sku] = {
          unit_cost: Number(m.unit_cost) || 0,
          unit_price: Number(m.unit_price) || 0,
        };
      }
    }
  }

  // 4. Build calculated lines
  const lines = lineInputs.map((input) => {
    let unitCost = Number(input.unit_cost) || 0;
    let unitPrice = Number(input.unit_price) || 0;

    // Resolve from materials table if SKU exists
    if (input.type === "material" && input.sku && skuPricing[input.sku]) {
      unitCost = skuPricing[input.sku].unit_cost;
      unitPrice = skuPricing[input.sku].unit_price;
    }

    const qty = Number(input.qty) || 0;
    return {
      sku: input.sku || null,
      name: input.name,
      type: input.type,
      qty,
      unit_cost: round2(unitCost),
      unit_price: round2(unitPrice),
      extended_cost: round2(unitCost * qty),
      extended_price: round2(unitPrice * qty),
    };
  });

  // 5. Aggregate change order totals
  const subtotal = round2(lines.reduce((s, l) => s + l.extended_price, 0));
  const costTotal = round2(lines.reduce((s, l) => s + l.extended_cost, 0));
  const grossProfit = round2(subtotal - costTotal);
  const grossMarginPct = subtotal > 0 ? round2(grossProfit / subtotal) : 0;

  // 6. Project new job totals
  const jobCurrentPrice = Number(job.total_price) || 0;
  const jobCurrentCost = Number(job.total_cost) || 0;
  const jobCurrentMarginPct = Number(job.gross_margin_pct) || 0;

  const projectedPrice = round2(jobCurrentPrice + subtotal);
  const projectedCost = round2(jobCurrentCost + costTotal);
  const projectedMarginPct =
    projectedPrice > 0
      ? round2((projectedPrice - projectedCost) / projectedPrice)
      : 0;

  const marginDeltaPct = round2(projectedMarginPct - jobCurrentMarginPct);

  // 7. Determine if owner approval required
  const requiresOwnerApproval = projectedMarginPct < targetMarginPct;

  return {
    lines,
    subtotal,
    cost_total: costTotal,
    gross_profit: grossProfit,
    gross_margin_pct: grossMarginPct,
    job_current_price: jobCurrentPrice,
    job_current_cost: jobCurrentCost,
    job_current_margin_pct: jobCurrentMarginPct,
    projected_price: projectedPrice,
    projected_cost: projectedCost,
    projected_margin_pct: projectedMarginPct,
    margin_delta_pct: marginDeltaPct,
    target_margin_pct: targetMarginPct,
    requires_owner_approval: requiresOwnerApproval,
  };
}
