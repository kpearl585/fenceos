import { createAdminClient } from "@/lib/supabase/server";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Approve a change order and update job financial totals.
 *
 * 1. Validate CO is pending
 * 2. Mark CO as approved
 * 3. Recalculate job totals (add CO subtotal/cost)
 * 4. Update job gross_profit and gross_margin_pct
 */
export async function approveChangeOrder(
  changeOrderId: string,
  approvedByUserId: string
): Promise<void> {
  const supabase = createAdminClient();

  // Load change order
  const { data: co, error: coErr } = await supabase
    .from("change_orders")
    .select("id, job_id, status, subtotal, cost_total")
    .eq("id", changeOrderId)
    .single();
  if (coErr || !co) throw new Error("Change order not found");
  if (co.status !== "pending") {
    throw new Error(`Change order is already ${co.status}`);
  }

  // Load current job totals
  const { data: job, error: jobErr } = await supabase
    .from("jobs")
    .select("total_price, total_cost")
    .eq("id", co.job_id)
    .single();
  if (jobErr || !job) throw new Error("Job not found");

  // Calculate new totals
  const newPrice = round2(Number(job.total_price) + Number(co.subtotal));
  const newCost = round2(Number(job.total_cost) + Number(co.cost_total));
  const newProfit = round2(newPrice - newCost);
  const newMarginPct = newPrice > 0 ? round2(newProfit / newPrice) : 0;

  // Mark CO approved
  const { error: approveErr } = await supabase
    .from("change_orders")
    .update({
      status: "approved",
      approved_by: approvedByUserId,
      approved_at: new Date().toISOString(),
    })
    .eq("id", changeOrderId);
  if (approveErr) throw new Error(`Failed to approve: ${approveErr.message}`);

  // Update job totals (no updated_at — column does not exist on jobs table)
  const { error: jobUpdateErr } = await supabase
    .from("jobs")
    .update({
      total_price: newPrice,
      total_cost: newCost,
      gross_profit: newProfit,
      gross_margin_pct: newMarginPct,
    })
    .eq("id", co.job_id);
  if (jobUpdateErr) {
    throw new Error(`Failed to update job totals: ${jobUpdateErr.message}`);
  }
}
