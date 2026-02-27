"use server";

import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { canAccess } from "@/lib/roles";
import { redirect } from "next/navigation";
import { generateChecklist } from "@/lib/jobs/generateChecklist";
import { generateMaterialVerifications } from "@/lib/jobs/generateMaterialVerifications";
import { uploadJobPhoto } from "@/lib/jobs/uploadJobPhoto";

async function getForemanAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const profile = await ensureProfile(supabase, user);
  if (!canAccess(profile.role, "jobs")) {
    throw new Error("You do not have access to jobs");
  }
  return { supabase, user, profile };
}

/* ------------------------------------------------------------------ */
/*  Initialize Checklist + Material Verifications                      */
/* ------------------------------------------------------------------ */

export async function initForemanData(fd: FormData) {
  const { supabase, profile } = await getForemanAuthContext();
  const jobId = fd.get("jobId") as string;
  if (!jobId) throw new Error("Missing jobId");

  // Load job to get fence type from linked estimate
  const { data: job } = await supabase
    .from("jobs")
    .select("estimate_id, org_id")
    .eq("id", jobId)
    .eq("org_id", profile.org_id)
    .single();
  if (!job) throw new Error("Job not found");

  let fenceType: string | null = null;
  if (job.estimate_id) {
    const { data: est } = await supabase
      .from("estimates")
      .select("fence_type")
      .eq("id", job.estimate_id)
      .single();
    fenceType = est?.fence_type ?? null;
  }

  await generateChecklist(jobId, fenceType);
  await generateMaterialVerifications(jobId);
  redirect(`/dashboard/jobs/${jobId}`);
}

/* ------------------------------------------------------------------ */
/*  Toggle Checklist Item                                              */
/* ------------------------------------------------------------------ */

export async function toggleChecklistItem(fd: FormData) {
  const { supabase, user, profile } = await getForemanAuthContext();
  const jobId = fd.get("jobId") as string;
  const itemId = fd.get("itemId") as string;
  const completed = fd.get("completed") === "true";

  if (
    profile.role !== "owner" &&
    profile.role !== "foreman"
  ) {
    throw new Error("Only owners and foremen can update checklists");
  }

  const updateData: Record<string, unknown> = { completed };
  if (completed) {
    updateData.completed_at = new Date().toISOString();
    updateData.completed_by = user.id;
  } else {
    updateData.completed_at = null;
    updateData.completed_by = null;
  }

  const { error } = await supabase
    .from("job_checklists")
    .update(updateData)
    .eq("id", itemId)
    .eq("job_id", jobId);

  if (error) throw new Error(`Failed to update checklist: ${error.message}`);
  redirect(`/dashboard/jobs/${jobId}`);
}

/* ------------------------------------------------------------------ */
/*  Verify Material                                                    */
/* ------------------------------------------------------------------ */

export async function verifyMaterial(fd: FormData) {
  const { supabase, user, profile } = await getForemanAuthContext();
  const jobId = fd.get("jobId") as string;
  const verificationId = fd.get("verificationId") as string;
  const verifiedQty = fd.get("verifiedQty") as string;

  if (profile.role !== "owner" && profile.role !== "foreman") {
    throw new Error("Only owners and foremen can verify materials");
  }

  const qty = Number(verifiedQty) || 0;
  const { error } = await supabase
    .from("job_material_verifications")
    .update({
      verified_qty: qty,
      verified: true,
      verified_at: new Date().toISOString(),
      verified_by: user.id,
    })
    .eq("id", verificationId)
    .eq("job_id", jobId);

  if (error) throw new Error(`Failed to verify material: ${error.message}`);
  redirect(`/dashboard/jobs/${jobId}`);
}

/* ------------------------------------------------------------------ */
/*  Upload Job Photo                                                   */
/* ------------------------------------------------------------------ */

export async function addJobPhoto(fd: FormData) {
  const { profile } = await getForemanAuthContext();
  const jobId = fd.get("jobId") as string;
  const file = fd.get("photo") as File | null;
  const caption = (fd.get("caption") as string) || "";

  if (!file || file.size === 0) {
    throw new Error("No photo selected");
  }

  if (profile.role !== "owner" && profile.role !== "foreman") {
    throw new Error("Only owners and foremen can upload photos");
  }

  await uploadJobPhoto(jobId, profile.org_id, profile.id, file, caption);
  redirect(`/dashboard/jobs/${jobId}`);
}

/* ------------------------------------------------------------------ */
/*  Delete Job Photo (owner only)                                      */
/* ------------------------------------------------------------------ */

export async function deleteJobPhoto(fd: FormData) {
  const { supabase, profile } = await getForemanAuthContext();
  const jobId = fd.get("jobId") as string;
  const photoId = fd.get("photoId") as string;

  if (profile.role !== "owner") {
    throw new Error("Only owners can delete photos");
  }

  // Get storage path before deleting record
  const { data: photo } = await supabase
    .from("job_photos")
    .select("storage_path")
    .eq("id", photoId)
    .eq("job_id", jobId)
    .single();

  if (photo) {
    await supabase.from("job_photos").delete().eq("id", photoId);
    await supabase.storage.from("job-photos").remove([photo.storage_path]);
  }

  redirect(`/dashboard/jobs/${jobId}`);
}
