"use server";

import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { canAccess } from "@/lib/roles";
import { redirect } from "next/navigation";
import { convertEstimateToJob } from "@/lib/jobs/convertEstimateToJob";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

async function getJobAuthContext() {
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
/*  Convert Estimate → Job                                             */
/* ------------------------------------------------------------------ */

export async function convertToJob(fd: FormData) {
  const estimateId = fd.get("estimateId") as string;
  if (!estimateId) throw new Error("Missing estimateId");

  const { jobId } = await convertEstimateToJob(estimateId);
  redirect(`/dashboard/jobs/${jobId}`);
}

/* ------------------------------------------------------------------ */
/*  Assign Foreman                                                     */
/* ------------------------------------------------------------------ */

export async function assignForeman(fd: FormData) {
  const { supabase, profile } = await getJobAuthContext();
  const jobId = fd.get("jobId") as string;
  const foremanId = (fd.get("foremanId") as string) || null;

  if (profile.role !== "owner" && profile.role !== "sales") {
    throw new Error("Only owners and sales can assign foremen");
  }

  const { error } = await supabase
    .from("jobs")
    .update({ assigned_foreman_id: foremanId || null })
    .eq("id", jobId)
    .eq("org_id", profile.org_id);

  if (error) throw new Error(`Failed to assign foreman: ${error.message}`);
  redirect(`/dashboard/jobs/${jobId}`);
}

/* ------------------------------------------------------------------ */
/*  Update Scheduled Date                                              */
/* ------------------------------------------------------------------ */

export async function updateScheduledDate(fd: FormData) {
  const { supabase, profile } = await getJobAuthContext();
  const jobId = fd.get("jobId") as string;
  const date = (fd.get("scheduledDate") as string) || null;

  if (profile.role !== "owner" && profile.role !== "sales") {
    throw new Error("Only owners and sales can set schedule dates");
  }

  const { error } = await supabase
    .from("jobs")
    .update({ scheduled_date: date })
    .eq("id", jobId)
    .eq("org_id", profile.org_id);

  if (error) throw new Error(`Failed to update date: ${error.message}`);
  redirect(`/dashboard/jobs/${jobId}`);
}

/* ------------------------------------------------------------------ */
/*  Transition Job Status                                              */
/* ------------------------------------------------------------------ */

export async function transitionJobStatus(fd: FormData) {
  const { supabase, profile } = await getJobAuthContext();
  const jobId = fd.get("jobId") as string;
  const newStatus = fd.get("newStatus") as string;

  // Validate transitions
  const validTransitions: Record<string, string[]> = {
    scheduled: ["active", "cancelled"],
    active: ["complete", "cancelled"],
  };

  // Load current job
  const { data: job, error: loadErr } = await supabase
    .from("jobs")
    .select("status, org_id")
    .eq("id", jobId)
    .single();

  if (loadErr || !job) throw new Error("Job not found");

  const allowed = validTransitions[job.status];
  if (!allowed || !allowed.includes(newStatus)) {
    throw new Error(
      `Cannot transition from "${job.status}" to "${newStatus}".`
    );
  }

  // Foreman can only start jobs (scheduled → active)
  if (
    profile.role === "foreman" &&
    !(job.status === "scheduled" && newStatus === "active")
  ) {
    throw new Error("Foremen can only start scheduled jobs");
  }

  // Enforce: all materials must be verified before starting
  if (newStatus === "active") {
    const { data: unverified } = await supabase
      .from("job_material_verifications")
      .select("id")
      .eq("job_id", jobId)
      .eq("verified", false);
    if (unverified && unverified.length > 0) {
      throw new Error(
        `Cannot start job: ${unverified.length} material(s) not yet verified.`
      );
    }
  }

  // Enforce: all required checklist items must be completed before marking complete
  if (newStatus === "complete") {
    const { data: incomplete } = await supabase
      .from("job_checklists")
      .select("id")
      .eq("job_id", jobId)
      .eq("required", true)
      .eq("completed", false);
    if (incomplete && incomplete.length > 0) {
      throw new Error(
        `Cannot complete job: ${incomplete.length} required checklist item(s) not completed.`
      );
    }
  }

  const updateData: Record<string, unknown> = { status: newStatus };
  if (newStatus === "complete") {
    updateData.completed_date = new Date().toISOString().split("T")[0];
  }

  const { error } = await supabase
    .from("jobs")
    .update(updateData)
    .eq("id", jobId)
    .eq("org_id", profile.org_id);

  if (error) throw new Error(`Failed to update status: ${error.message}`);
  redirect(`/dashboard/jobs/${jobId}`);
}
