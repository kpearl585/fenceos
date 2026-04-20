// ── Consume a photo-estimator claim token after signup ──────────
// Transfers a public_photo_estimates row into a fence_graphs row
// owned by the newly-signed-up user's org. Idempotent per token:
// once claimed, repeat calls are no-ops.
//
// Called from the Onboarding page server component when the user's
// Supabase auth metadata has a claim_token stashed from /signup.
// Designed to never throw at the caller — any failure is logged to
// Sentry and the user proceeds with normal onboarding.

import { createAdminClient } from "@/lib/supabase/server";
import * as Sentry from "@sentry/nextjs";
import type { User } from "@supabase/supabase-js";
import { trackPhotoEstimatorEvent } from "@/lib/photo-estimate/track-event";

type EstimateJson = {
  totalLinearFeet?: number;
  totalCost?: number;
  fenceTypeLabel?: string;
} & Record<string, unknown>;

export async function consumeClaimToken(
  user: User,
  orgId: string,
  claimToken: string
): Promise<{ success: boolean; fenceGraphId?: string }> {
  if (!/^[0-9a-f-]{36}$/i.test(claimToken)) {
    return { success: false };
  }

  try {
    const admin = createAdminClient();

    const { data: row, error: fetchErr } = await admin
      .from("public_photo_estimates")
      .select("id, claimed_at, extraction_json, estimate_json, image_storage_path")
      .eq("claim_token", claimToken)
      .maybeSingle();

    if (fetchErr || !row) {
      return { success: false };
    }

    if (row.claimed_at) {
      // Token already spent. Clear the stashed metadata so we don't
      // retry on every onboarding load.
      await clearUserMetadataClaimToken(admin, user);
      return { success: false };
    }

    const estimate = (row.estimate_json ?? {}) as EstimateJson;
    const totalLinearFeet =
      typeof estimate.totalLinearFeet === "number" ? estimate.totalLinearFeet : 0;
    const totalCost =
      typeof estimate.totalCost === "number" ? estimate.totalCost : 0;
    const fenceTypeLabel =
      typeof estimate.fenceTypeLabel === "string"
        ? estimate.fenceTypeLabel
        : "AI Photo Estimate";

    const name = `${fenceTypeLabel} (from photo)`;

    const { data: inserted, error: insertErr } = await admin
      .from("fence_graphs")
      .insert({
        org_id: orgId,
        name,
        input_json:  row.extraction_json as unknown as Record<string, unknown>,
        result_json: row.estimate_json   as unknown as Record<string, unknown>,
        labor_rate: 75,
        waste_pct: 10,
        total_lf: totalLinearFeet,
        total_cost: totalCost,
        status: "draft",
        source_photo_storage_path: row.image_storage_path ?? null,
      })
      .select("id")
      .single();

    if (insertErr || !inserted) {
      throw new Error(
        `Failed to create fence_graph from claim: ${insertErr?.message ?? "unknown"}`
      );
    }

    const { error: updateErr } = await admin
      .from("public_photo_estimates")
      .update({
        claimed_at: new Date().toISOString(),
        claimed_by_user_id: user.id,
        claimed_fence_graph_id: inserted.id,
      })
      .eq("id", row.id);

    if (updateErr) {
      // Best-effort cleanup — we don't want an orphaned fence_graph, but
      // we also don't want to block the user. Log and carry on.
      Sentry.captureException(updateErr, {
        tags: { phase: "sprint_2_photo_estimator", step: "claim_mark_claimed" },
      });
    }

    await clearUserMetadataClaimToken(admin, user);

    await trackPhotoEstimatorEvent({
      event: "signup_claimed",
      claimToken,
      properties: {
        fence_graph_id: inserted.id,
        total_linear_feet: totalLinearFeet,
      },
    });

    return { success: true, fenceGraphId: inserted.id };
  } catch (err) {
    Sentry.captureException(err, {
      tags: { phase: "sprint_2_photo_estimator", step: "consume_claim_token" },
    });
    console.error("consumeClaimToken error:", err);
    return { success: false };
  }
}

async function clearUserMetadataClaimToken(
  admin: ReturnType<typeof createAdminClient>,
  user: User
): Promise<void> {
  try {
    const next = { ...(user.user_metadata ?? {}) };
    delete next.claim_token;
    await admin.auth.admin.updateUserById(user.id, { user_metadata: next });
  } catch (err) {
    // Non-fatal — worst case we retry a claim that's already marked
    // done, which is a no-op.
    Sentry.captureException(err, {
      tags: { phase: "sprint_2_photo_estimator", step: "clear_claim_metadata" },
    });
  }
}
