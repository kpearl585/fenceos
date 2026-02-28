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
    redirect(`/dashboard/jobs/${jobId}?error=Invalid+status+transition`);
  }

  // Foreman can only start jobs (scheduled → active)
  if (
    profile.role === "foreman" &&
    !(job.status === "scheduled" && newStatus === "active")
  ) {
    redirect(`/dashboard/jobs/${jobId}?error=Foremen+can+only+start+scheduled+jobs`);
  }

  // Enforce: all materials must be verified before starting
  if (newStatus === "active") {
    const { data: unverified } = await supabase
      .from("job_material_verifications")
      .select("id")
      .eq("job_id", jobId)
      .eq("verified", false);
    if (unverified && unverified.length > 0) {
      redirect(`/dashboard/jobs/${jobId}?error=Verify+all+${unverified.length}+material(s)+before+starting+the+job`);
    }
  }

  // Enforce: all required checklist items must be completed before marking complete
  if (newStatus === "complete") {
    const { data: incomplete } = await supabase
      .from("job_checklists")
      .select("id")
      .eq("job_id", jobId)
      .eq("is_required", true)
      .eq("completed", false);
    if (incomplete && incomplete.length > 0) {
      redirect(`/dashboard/jobs/${jobId}?error=Complete+all+${incomplete.length}+required+checklist+item(s)+first`);
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

/* ------------------------------------------------------------------ */
/*  Update Job Status (Kanban drag-and-drop)                          */
/* ------------------------------------------------------------------ */

const STATUS_ORDER = ["scheduled", "active", "complete"];

export async function updateJobStatus(fd: FormData) {
  const { supabase, profile } = await getJobAuthContext();
  const jobId = fd.get("jobId") as string;
  const newStatus = fd.get("status") as string;

  if (!jobId || !newStatus) throw new Error("Missing jobId or status");

  const validStatuses = ["scheduled", "active", "complete"];
  if (!validStatuses.includes(newStatus)) throw new Error("Invalid status");

  // Fetch current status to validate transition
  const { data: job, error: fetchError } = await supabase
    .from("jobs")
    .select("status")
    .eq("id", jobId)
    .eq("org_id", profile.org_id)
    .single();

  if (fetchError || !job) throw new Error("Job not found");

  const currentIdx = STATUS_ORDER.indexOf(job.status);
  const newIdx = STATUS_ORDER.indexOf(newStatus);

  // Enforce forward-only transitions (one step at a time)
  if (newIdx !== currentIdx + 1) {
    throw new Error(`Invalid transition: ${job.status} → ${newStatus}`);
  }

  const updates: Record<string, unknown> = { status: newStatus };
  if (newStatus === "complete") updates.completed_date = new Date().toISOString();

  const { error } = await supabase
    .from("jobs")
    .update(updates)
    .eq("id", jobId)
    .eq("org_id", profile.org_id);

  if (error) throw new Error(`Status update failed: ${error.message}`);
}
