"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
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

  const admin = createAdminClient();
  if (foremanId) {
    const { data: assignee, error: assigneeErr } = await admin
      .from("users")
      .select("id, role")
      .eq("id", foremanId)
      .eq("org_id", profile.org_id)
      .single();

    if (
      assigneeErr ||
      !assignee ||
      (assignee.role !== "foreman" && assignee.role !== "owner")
    ) {
      throw new Error("Selected foreman is invalid for this organization");
    }
  }

  const { error } = await admin
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
  const { profile } = await getJobAuthContext();
  const jobId = fd.get("jobId") as string;
  const date = (fd.get("scheduledDate") as string) || null;

  if (profile.role !== "owner" && profile.role !== "sales") {
    redirect(`/dashboard/jobs/${jobId}?error=Only+owners+and+sales+can+set+schedule+dates`);
  }

  const admin = createAdminClient();
  const { error } = await admin
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
    .select("status, org_id, assigned_foreman_id, material_verification_status")
    .eq("id", jobId)
    .eq("org_id", profile.org_id)
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

  if (
    profile.role === "foreman" &&
    job.assigned_foreman_id !== profile.id
  ) {
    redirect(`/dashboard/jobs/${jobId}?error=You+can+only+update+jobs+assigned+to+you`);
  }

  // Enforce: material_verification_status must be 'foreman_approved' before starting
  // Requires migration: ALTER TABLE jobs ADD COLUMN IF NOT EXISTS material_verification_status text DEFAULT 'pending'
  //   CHECK (material_verification_status IN ('pending', 'employee_confirmed', 'foreman_approved', 'rejected'));
  if (newStatus === "active") {
    const mvStatus = job.material_verification_status;
    if (mvStatus && mvStatus !== "foreman_approved") {
      redirect(`/dashboard/jobs/${jobId}?error=Materials+must+be+verified+before+starting+this+job`);
    }
    // Legacy check: also verify all individual material verification rows
    if (!mvStatus) {
      const { data: unverified } = await supabase
        .from("job_material_verifications")
        .select("id")
        .eq("job_id", jobId)
        .eq("verified", false);
      if (unverified && unverified.length > 0) {
        redirect(`/dashboard/jobs/${jobId}?error=Verify+all+${unverified.length}+material(s)+before+starting+the+job`);
      }
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
    updateData.completed_at = new Date().toISOString();
  }

  const admin = createAdminClient();
  const { error } = await admin
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
    .select("status, assigned_foreman_id, material_verification_status")
    .eq("id", jobId)
    .eq("org_id", profile.org_id)
    .single();

  if (fetchError || !job) throw new Error("Job not found");

  const currentIdx = STATUS_ORDER.indexOf(job.status);
  const newIdx = STATUS_ORDER.indexOf(newStatus);

  if (profile.role === "foreman") {
    if (job.assigned_foreman_id !== profile.id) {
      throw new Error("You can only update jobs assigned to you");
    }
    if (!(job.status === "scheduled" && newStatus === "active")) {
      throw new Error("Foremen can only start scheduled jobs");
    }
  }

  // Enforce forward-only transitions (one step at a time)
  if (newIdx !== currentIdx + 1) {
    throw new Error(`Invalid transition: ${job.status} → ${newStatus}`);
  }

  if (newStatus === "active") {
    const mvStatus = job.material_verification_status;
    if (mvStatus && mvStatus !== "foreman_approved") {
      throw new Error("Materials must be verified before starting this job");
    }

    if (!mvStatus) {
      const { data: unverified } = await supabase
        .from("job_material_verifications")
        .select("id")
        .eq("job_id", jobId)
        .eq("verified", false);

      if (unverified && unverified.length > 0) {
        throw new Error(`Verify all ${unverified.length} material(s) before starting the job`);
      }
    }
  }

  if (newStatus === "complete") {
    const { data: incomplete } = await supabase
      .from("job_checklists")
      .select("id")
      .eq("job_id", jobId)
      .eq("is_required", true)
      .eq("completed", false);

    if (incomplete && incomplete.length > 0) {
      throw new Error(`Complete all ${incomplete.length} required checklist item(s) first`);
    }
  }

  const updates: Record<string, unknown> = { status: newStatus };
  if (newStatus === "complete") updates.completed_at = new Date().toISOString();

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("jobs")
    .update(updates)
    .eq("id", jobId)
    .eq("org_id", profile.org_id);

  if (error) throw new Error(`Status update failed: ${error.message}`);
}
