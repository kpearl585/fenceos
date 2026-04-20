// ── Photo Estimator — signed URL for a claimed estimate's source photo ──
// Server-side helper that turns a storage path into a short-lived signed
// URL. Used by the dashboard saved-estimate view so users can see the
// photo they uploaded even though the bucket is private.

import { createAdminClient } from "@/lib/supabase/server";

const BUCKET = "photo-estimate-uploads";
const URL_TTL_SECONDS = 60 * 60; // 1 hour — renders per dashboard load

export async function getSignedPhotoUrl(
  storagePath: string | null | undefined
): Promise<string | null> {
  if (!storagePath) return null;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, URL_TTL_SECONDS);
    if (error) {
      console.error("[photo-estimate] createSignedUrl failed:", error.message);
      return null;
    }
    return data?.signedUrl ?? null;
  } catch (err) {
    console.error("[photo-estimate] getSignedPhotoUrl threw:", err);
    return null;
  }
}
