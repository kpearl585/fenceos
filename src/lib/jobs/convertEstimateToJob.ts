import { createClient, createAdminClient } from "@/lib/supabase/server";
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
  const tag = `[convertEstimateToJob][${estimateId.slice(0, 8)}]`;

  // Auth check via user-scoped client
  const authSupabase = await createClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const profile = await ensureProfile(authSupabase, user);
  if (!canAccess(profile.role, "estimates")) {
    throw new Error("You do not have access to convert estimates");
  }

  // Use admin client for all DB operations to bypass RLS
  const supabase = createAdminClient();

  // 1. Load estimate
  const { data: est, error: estErr } = await supabase
    .from("estimates")
    .select("*")
    .eq("id", estimateId)
    .eq("org_id", profile.org_id)
    .single();

  if (estErr || !est) {
    console.error(`${tag} FAIL estimate fetch`, estErr?.message);
    throw new Error("Estimate not found or access denied");
  }


  // 2. Validate status — allow quoted, accepted, or deposit_paid
  const allowedStatuses = ["quoted", "accepted", "deposit_paid"];
  if (!allowedStatuses.includes(est.status)) {
    throw new Error(
      `Cannot convert estimate with status "${est.status}".`
    );
  }

  // Deposit gate removed — contractors manage deposits outside the app.
  // Job conversion is allowed regardless of deposit status.

  // 4. Prevent double conversion
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

  // 5. Require customer
  if (!est.customer_id) {
    throw new Error(
      "Estimate must have a customer before converting to a job."
    );
  }

  // 6. Load estimate line items
  const { data: lineItems, error: liErr } = await supabase
    .from("estimate_line_items")
    .select("*")
    .eq("estimate_id", estimateId)
    .order("sort_order");

  if (liErr) {
    throw new Error(`Failed to load line items: ${liErr.message}`);
  }


  // 7. Insert job row (financial snapshot)
  const jobTitle = est.title || `Job from Estimate ${estimateId.slice(0, 8)}`;

  const jobPayload = {
    org_id: profile.org_id,
    estimate_id: estimateId,
    customer_id: est.customer_id,
    title: jobTitle,
    status: "scheduled" as const,
    total_price: Number(est.total) || 0,
    total_cost: Number(est.estimated_cost) || 0,
    gross_profit: Number(est.gross_profit) || 0,
    gross_margin_pct: Number(est.gross_margin_pct) || 0,
    created_by: profile.id,
  };


  const { data: job, error: jobErr } = await supabase
    .from("jobs")
    .insert(jobPayload)
    .select("id")
    .single();

  if (jobErr || !job) {
    console.error(`${tag} FAIL job insert`, jobErr?.message, jobErr?.code, jobErr?.details);
    throw new Error(
      `Failed to create job: ${jobErr?.message ?? "unknown"}`
    );
  }


  // 8. Copy line items → job_line_items
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
      console.error(`${tag} FAIL line items copy — rolling back job`, jliErr.message);
      await supabase.from("jobs").delete().eq("id", job.id);
      throw new Error(`Failed to copy line items: ${jliErr.message}`);
    }

  }

  // 9. Lock estimate → status = 'converted'

  const { error: lockErr } = await supabase
    .from("estimates")
    .update({
      status: "converted",
      updated_at: new Date().toISOString(),
    })
    .eq("id", estimateId);

  if (lockErr) {
    console.error(`${tag} FAIL estimate lock — rolling back`, lockErr.message);
    await supabase.from("job_line_items").delete().eq("job_id", job.id);
    await supabase.from("jobs").delete().eq("id", job.id);
    throw new Error(`Failed to lock estimate: ${lockErr.message}`);
  }

  return { jobId: job.id };
}
