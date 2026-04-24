"use server";

import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { canAccess } from "@/lib/roles";
import { revalidatePath } from "next/cache";
import type { JobOutcome } from "@/types/database";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

async function getJobOutcomeAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const profile = await ensureProfile(supabase, user);
  if (!canAccess(profile.role, "jobs")) {
    throw new Error("You do not have access to jobs");
  }

  return { supabase, profile };
}

/* ------------------------------------------------------------------ */
/*  Save Job Outcome                                                   */
/* ------------------------------------------------------------------ */

export async function saveJobOutcome(fd: FormData) {
  const { supabase, profile } = await getJobOutcomeAuthContext();

  const jobId = fd.get("jobId") as string;
  const actualMaterialCost = fd.get("actualMaterialCost") as string;
  const actualLaborHours = fd.get("actualLaborHours") as string;
  const actualTotalCost = fd.get("actualTotalCost") as string;
  const notes = fd.get("notes") as string;

  if (!jobId) {
    throw new Error("Job ID is required");
  }

  // Get the job to extract estimated total
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id, total_price, org_id")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    throw new Error("Job not found");
  }

  const estimatedTotal = job.total_price || 0;
  const actualTotal = actualTotalCost ? parseFloat(actualTotalCost) : null;
  const materialCost = actualMaterialCost ? parseFloat(actualMaterialCost) : null;
  const laborHours = actualLaborHours ? parseFloat(actualLaborHours) : null;

  // Calculate profit margin if we have actual total
  let profitMargin = null;
  if (actualTotal && estimatedTotal) {
    const profit = estimatedTotal - actualTotal;
    profitMargin = profit / estimatedTotal;
  }

  // Check if outcome already exists
  const { data: existing } = await supabase
    .from("job_outcomes")
    .select("id")
    .eq("job_id", jobId)
    .single();

  if (existing) {
    // Update existing
    const { error: updateError } = await supabase
      .from("job_outcomes")
      .update({
        actual_material_cost: materialCost,
        actual_labor_hours: laborHours,
        actual_total_cost: actualTotal,
        profit_margin: profitMargin,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (updateError) {
      console.error("Error updating job outcome:", updateError);
      throw new Error("Failed to update job outcome");
    }
  } else {
    // Create new
    const { error: insertError } = await supabase
      .from("job_outcomes")
      .insert({
        job_id: jobId,
        org_id: profile.org_id,
        estimated_total: estimatedTotal,
        actual_material_cost: materialCost,
        actual_labor_hours: laborHours,
        actual_total_cost: actualTotal,
        profit_margin: profitMargin,
        notes: notes || null,
      });

    if (insertError) {
      console.error("Error creating job outcome:", insertError);
      throw new Error("Failed to save job outcome");
    }
  }

  revalidatePath(`/dashboard/jobs/${jobId}`);
  return { success: true };
}

/* ------------------------------------------------------------------ */
/*  Get Job Outcome                                                    */
/* ------------------------------------------------------------------ */

export async function getJobOutcome(jobId: string): Promise<JobOutcome | null> {
  const { supabase } = await getJobOutcomeAuthContext();

  const { data, error } = await supabase
    .from("job_outcomes")
    .select("*")
    .eq("job_id", jobId)
    .single();

  if (error) {
    // Not found is OK
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error fetching job outcome:", error);
    return null;
  }

  return data as JobOutcome;
}
