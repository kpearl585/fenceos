// ── Photo Estimator — funnel event tracking ─────────────────────
// Thin wrapper around the `track_photo_estimator_event` RPC. Treat
// tracking as best-effort observability: never throw at the caller,
// never block the request. Swallow + log on failure so a broken
// analytics pipeline can't break the product.

import { createAdminClient } from "@/lib/supabase/server";

export type PhotoEstimatorEvent =
  | "photo_upload_submitted"
  | "extraction_returned"
  | "extraction_blocked"
  | "email_captured"
  | "email_rebind_rejected"
  | "signup_claimed";

export interface TrackEventInput {
  event:        PhotoEstimatorEvent;
  claimToken?:  string | null;
  ipAddress?:   string | null;
  properties?:  Record<string, unknown>;
}

export async function trackPhotoEstimatorEvent(
  input: TrackEventInput
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.rpc("track_photo_estimator_event", {
      p_event:       input.event,
      p_claim_token: input.claimToken ?? null,
      p_ip_address:  input.ipAddress  ?? null,
      p_properties:  input.properties ?? null,
    });
    if (error) {
      console.error("[photo-estimate] track event failed:", input.event, error.message);
    }
  } catch (err) {
    console.error("[photo-estimate] track event threw:", input.event, err);
  }
}
