import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { canAccess } from "@/lib/roles";

/**
 * Transactional conversion: Estimate → Job
 *
 * 1. Validate estimate status = 'quoted'
 * 2. Check no existing job (prevent double conversion)
 * 3. Insert jobs row (financial snapshot)
 * 4. Copy estimate_line_items → job_line_items
 * 5. Set estimate.status = 'converted'
 * 6. Return job id
 *
 * If any step fails, cleanup is attempted and error thrown.
 * The DB trigger on estimates blocks edits once converted.
 */
export async function convertEstimateToJob(
  estimateId: string
): Promise<{ jobId: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const profile = await ensureProfile(supabase, user);
  if (!canAccess(profile.role, "estimates")) {
    throw new Error("You do not have access to convert estimates");
  }

  // 1. Load estimate
  const { data: est, error: estErr } = await supabase
    .from("estimates")
    .select("*")
    .eq("id", estimateId)
    .eq("org_id", profile.org_id)
    .single();

  if (estErr || !est) {
    throw new Error("Estimate not found or access denied");
  }

  // 2. Validate status
  if (est.status !== "quoted") {
    throw new Error(
      `Cannot convert estimate with status "${est.status}". Only quoted estimates can be converted.`
    );
  }

  // 3. Prevent double conversion
  const { data: existingJob } = await supabase
    .from("jobs")
    .select("id")
    .eq("estimate_id", estimateId)
    .maybeSingle();

  if (existingJob) {
    throw new Error(
      `Estimate already converted to job ${existingJob.id}.`
    );
  }

  // 4. Require customer
  if (!est.customer_id) {
    throw new Error(
      "Estimate must have a customer before converting to a job."
    );
  }

  // 5. Load estimate line items
  const { data: lineItems, error: liErr } = await supabase
    .from("estimate_line_items")
    .select("*")
    .eq("estimate_id", estimateId)
    .order("sort_order");

  if (liErr) {
    throw new Error(`Failed to load line items: ${liErr.message}`);
  }

  // 6. Insert job row (financial snapshot)
  const { data: job, error: jobErr } = await supabase
    .from("jobs")
    .insert({
      org_id: profile.org_id,
      estimate_id: estimateId,
      customer_id: est.customer_id,
      status: "scheduled",
      total_price: Number(est.total) || 0,
      total_cost: Number(est.estimated_cost) || 0,
      gross_profit: Number(est.gross_profit) || 0,
      gross_margin_pct: Number(est.gross_margin_pct) || 0,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (jobErr || !job) {
    throw new Error(
      `Failed to create job: ${jobErr?.message ?? "unknown"}`
    );
  }

  // 7. Copy line items → job_line_items
  if (lineItems && lineItems.length > 0) {
    const jobLines = lineItems.map((li) => ({
      job_id: job.id,
      sku: li.sku || null,
      name: li.description || li.sku || "Unnamed item",
      type: li.type as "material" | "labor",
      unit: li.unit || "ea",
      qty: Number(li.quantity) || 0,
      unit_cost: Number(li.unit_cost) || 0,
      unit_price: Number(li.unit_price) || 0,
      extended_cost: Number(li.extended_cost) || 0,
      extended_price: Number(li.extended_price) || 0,
      meta: li.meta || null,
    }));

    const { error: jliErr } = await supabase
      .from("job_line_items")
      .insert(jobLines);

    if (jliErr) {
      await supabase.from("jobs").delete().eq("id", job.id);
      throw new Error(`Failed to copy line items: ${jliErr.message}`);
    }
  }

  // 8. Lock estimate → status = 'converted'
  const { error: lockErr } = await supabase
    .from("estimates")
    .update({
      status: "converted",
      updated_at: new Date().toISOString(),
    })
    .eq("id", estimateId);

  if (lockErr) {
    await supabase.from("job_line_items").delete().eq("job_id", job.id);
    await supabase.from("jobs").delete().eq("id", job.id);
    throw new Error(`Failed to lock estimate: ${lockErr.message}`);
  }

  return { jobId: job.id };
}
