"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { canAccess } from "@/lib/roles";
import { redirect } from "next/navigation";
import { generateChecklist } from "@/lib/jobs/generateChecklist";

async function getForemanAuthContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const profile = await ensureProfile(supabase, user);
  if (!canAccess(profile.role, "jobs")) throw new Error("Access denied");
  return { supabase, profile, user };
}

/* ------------------------------------------------------------------ */
/*  Initialize Checklist + Material Verifications                      */
/* ------------------------------------------------------------------ */

export async function initForemanData(fd: FormData) {
  const { profile } = await getForemanAuthContext();
  const jobId = fd.get("jobId") as string;
  if (!jobId) throw new Error("Missing jobId");

  const admin = createAdminClient();

  // Get job + fence type
  const { data: job, error: jobErr } = await admin
    .from("jobs")
    .select("estimate_id, org_id")
    .eq("id", jobId)
    .eq("org_id", profile.org_id)
    .single();

  if (jobErr || !job) throw new Error(`Job not found: ${jobErr?.message}`);

  let fenceType: string | null = null;
  if (job.estimate_id) {
    const { data: est } = await admin
      .from("estimates")
      .select("fence_type")
      .eq("id", job.estimate_id)
      .single();
    fenceType = est?.fence_type ?? null;
  }

  // Generate checklist
  await generateChecklist(jobId, fenceType);

  // Generate material verifications — use admin client throughout
  const { data: materials } = await admin
    .from("job_line_items")
    .select("sku, name, qty")
    .eq("job_id", jobId)
    .eq("type", "material")
    .not("sku", "is", null);

  if (materials && materials.length > 0) {
    const rows = materials.map((m: { sku: string; name: string; qty: number }) => ({
      job_id: jobId,
      sku: m.sku,
      name: m.name || m.sku || "Unknown",
      required_qty: Number(m.qty) || 0,
    }));

    const { error: verErr } = await admin
      .from("job_material_verifications")
      .upsert(rows, { onConflict: "job_id,sku", ignoreDuplicates: true });

    if (verErr) throw new Error(`Material verification failed: ${verErr.message}`);
  }

  redirect(`/dashboard/jobs/${jobId}`);
}

/* ------------------------------------------------------------------ */
/*  Toggle Checklist Item                                              */
/* ------------------------------------------------------------------ */

export async function toggleChecklistItem(fd: FormData) {
  const { supabase, profile, user } = await getForemanAuthContext();
  const jobId = fd.get("jobId") as string;
  const itemId = fd.get("itemId") as string;
  const completed = fd.get("completed") === "true";

  if (profile.role !== "owner" && profile.role !== "foreman") {
    throw new Error("Only owners and foremen can update checklists");
  }

  const admin = createAdminClient();

  const updateData: Record<string, unknown> = { completed };
  if (completed) {
    updateData.completed_at = new Date().toISOString();
    updateData.completed_by = user?.id;
  } else {
    updateData.completed_at = null;
    updateData.completed_by = null;
  }

  const { error } = await admin
    .from("job_checklists")
    .update(updateData)
    .eq("id", itemId)
    .eq("job_id", jobId);

  if (error) throw new Error(`Checklist update failed: ${error.message}`);
  redirect(`/dashboard/jobs/${jobId}`);
}

/* ------------------------------------------------------------------ */
/*  Verify Material                                                    */
/* ------------------------------------------------------------------ */

export async function verifyMaterial(fd: FormData) {
  const { supabase, profile, user } = await getForemanAuthContext();
  const verificationId = fd.get("verificationId") as string;
  const verifiedQty = Number(fd.get("verifiedQty")) || 0;
  const jobId = fd.get("jobId") as string;

  if (profile.role !== "owner" && profile.role !== "foreman") {
    throw new Error("Only owners and foremen can verify materials");
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("job_material_verifications")
    .update({
      verified: true,
      verified_qty: verifiedQty,
      verified_at: new Date().toISOString(),
      verified_by: user?.id,
    })
    .eq("id", verificationId);

  if (error) throw new Error(`Verification failed: ${error.message}`);
  redirect(`/dashboard/jobs/${jobId}`);
}

/* ------------------------------------------------------------------ */
/*  Upload Job Photo                                                   */
/* ------------------------------------------------------------------ */

export async function uploadJobPhoto(fd: FormData) {
  const { profile } = await getForemanAuthContext();
  const jobId = fd.get("jobId") as string;
  const caption = (fd.get("caption") as string) || "";
  const file = fd.get("photo") as File;

  if (!file || file.size === 0) throw new Error("No file provided");

  const admin = createAdminClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${profile.org_id}/${jobId}/${Date.now()}.${ext}`;

  const { error: uploadErr } = await admin.storage
    .from("job-photos")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

  const { data: { publicUrl } } = admin.storage.from("job-photos").getPublicUrl(path);

  const { error: insertErr } = await admin
    .from("job_photos")
    .insert({
      job_id: jobId,
      org_id: profile.org_id,
      storage_path: path,
      caption: caption || null,
      uploaded_by: null,
    });

  if (insertErr) throw new Error(`Photo record failed: ${insertErr.message}`);
  redirect(`/dashboard/jobs/${jobId}`);
}

/* ------------------------------------------------------------------ */
/*  Delete Job Photo                                                   */
/* ------------------------------------------------------------------ */

export async function deleteJobPhoto(fd: FormData) {
  const { profile } = await getForemanAuthContext();
  const photoId = fd.get("photoId") as string;
  const jobId = fd.get("jobId") as string;
  if (!photoId) throw new Error("Missing photoId");

  const admin = createAdminClient();

  const { data: photo } = await admin
    .from("job_photos")
    .select("storage_path")
    .eq("id", photoId)
    .single();

  if (photo?.storage_path) {
    await admin.storage.from("job-photos").remove([photo.storage_path]);
  }

  await admin.from("job_photos").delete().eq("id", photoId);
  redirect(`/dashboard/jobs/${jobId}`);
}

// Alias for backward compat
export { uploadJobPhoto as addJobPhoto };
