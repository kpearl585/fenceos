/**
 * POST /api/public/photo-estimate/claim
 *
 * Captures an email against a claim_token on a public_photo_estimates
 * row and sends a Resend email with a claim URL. The actual signup +
 * estimate transfer into fence_graphs happens in a follow-up sprint
 * (currently the claim URL routes to /signup?claim_token=...); this
 * endpoint's job is to secure the lead and deliver the lifecycle trigger.
 *
 * No auth — anyone with a valid claim_token can bind an email.
 * Rate-limited per IP to 5 claims / 24h to deter scraping.
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/server";
import { PhotoEstimateClaimSchema } from "@/lib/validation/photo-estimate-schemas";
import { sendClaimEmail } from "@/lib/email/send-claim-email";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { trackPhotoEstimatorEvent } from "@/lib/photo-estimate/track-event";

export const runtime = "nodejs";
export const maxDuration = 20;

function getClientIp(request: NextRequest): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rate = checkRateLimit({
      key: `photo-estimate-claim:${ip}`,
      limit: 5,
      windowMs: 24 * 60 * 60 * 1000,
    });
    if (!rate.success) {
      return NextResponse.json(
        { error: rate.error ?? "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    const { claim_token, email } = PhotoEstimateClaimSchema.parse(body);

    const admin = createAdminClient();

    const { data: row, error: fetchErr } = await admin
      .from("public_photo_estimates")
      .select(
        "id, claim_token, email, claimed_at, estimate_json, extraction_json"
      )
      .eq("claim_token", claim_token)
      .maybeSingle();

    if (fetchErr || !row) {
      // Same surface as "claimed" to avoid leaking whether a token exists.
      return NextResponse.json(
        { error: "This estimate link is invalid or has expired." },
        { status: 404 }
      );
    }

    if (row.claimed_at) {
      return NextResponse.json(
        {
          error:
            "This estimate has already been claimed. Sign in to view it.",
        },
        { status: 409 }
      );
    }

    // Reject email-rebind once an email is on file. The claim_token is
    // already a soft secret (it's in the result-card URL / in the claim
    // email), so if it leaks, an attacker could otherwise overwrite the
    // legitimate address and hijack the signup flow. Record the attempt
    // for monitoring — a spike in this event is a leak signal.
    if (row.email && row.email.toLowerCase() !== email.toLowerCase()) {
      await trackPhotoEstimatorEvent({
        event: "email_rebind_rejected",
        claimToken: claim_token,
        ipAddress: ip,
        properties: {
          existing_email_domain: row.email.split("@")[1] ?? null,
          attempted_email_domain: email.split("@")[1] ?? null,
        },
      });
      return NextResponse.json(
        {
          error:
            "This estimate is already linked to a different email address. If that's you, check your inbox for the original claim link.",
        },
        { status: 409 }
      );
    }

    const { error: updateErr } = await admin
      .from("public_photo_estimates")
      .update({
        email,
        email_captured_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    if (updateErr) {
      throw new Error(`Failed to record email: ${updateErr.message}`);
    }

    await trackPhotoEstimatorEvent({
      event: "email_captured",
      claimToken: claim_token,
      ipAddress: ip,
      properties: {
        email_domain: email.split("@")[1] ?? null,
        resubmit: Boolean(row.email),
      },
    });

    // Narrow the jsonb columns just enough to email the user useful
    // details. Shape-check defensively — a malformed row shouldn't 500.
    const estimate = (row.estimate_json ?? {}) as Record<string, unknown>;
    const priceRangeLow =
      typeof estimate.priceRangeLow === "number"
        ? estimate.priceRangeLow
        : typeof estimate.totalCost === "number"
        ? Math.round(estimate.totalCost * 0.85)
        : 0;
    const priceRangeHigh =
      typeof estimate.priceRangeHigh === "number"
        ? estimate.priceRangeHigh
        : typeof estimate.totalCost === "number"
        ? Math.round(estimate.totalCost * 1.15)
        : 0;
    const totalLinearFeet =
      typeof estimate.totalLinearFeet === "number" ? estimate.totalLinearFeet : 0;
    const fenceTypeLabel =
      typeof estimate.fenceTypeLabel === "string"
        ? estimate.fenceTypeLabel
        : "Your fence";

    try {
      await sendClaimEmail({
        to: email,
        claimToken: claim_token,
        priceRangeLow,
        priceRangeHigh,
        fenceTypeLabel,
        totalLinearFeet,
      });
    } catch (emailErr) {
      // Capture, but don't fail the request — the lead is already
      // persisted. User-facing message stays positive so they don't
      // retry indefinitely if Resend is flaky.
      Sentry.captureException(emailErr, {
        tags: { phase: "sprint_2_photo_estimator", step: "claim_email" },
      });
      console.error("Claim email send failed:", emailErr);
    }

    return NextResponse.json({
      success: true,
      message: "Check your inbox for the claim link.",
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      const firstIssue = err.issues[0];
      return NextResponse.json(
        { error: firstIssue?.message ?? "Invalid request." },
        { status: 400 }
      );
    }

    Sentry.captureException(err, {
      tags: { phase: "sprint_2_photo_estimator", step: "claim_post" },
    });
    console.error("POST /api/public/photo-estimate/claim error:", err);
    return NextResponse.json(
      { error: "We couldn't process this request. Please try again." },
      { status: 500 }
    );
  }
}
