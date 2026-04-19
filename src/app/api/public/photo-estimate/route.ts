/**
 * POST /api/public/photo-estimate
 *
 * Fully public, unauthenticated endpoint. Accepts a multipart upload of
 * a single yard photo + optional context, runs it through OpenAI GPT-4o
 * Vision via the existing fence-graph ai-extract pipeline, and returns a
 * structured estimate with a claim_token the user can email-capture or
 * use to sign up.
 *
 * Defenses stacked from cheap to expensive:
 *   1. Per-IP rate limit (in-memory, 3/24h) — fast reject.
 *   2. MIME + size validation of the uploaded file — rejects bad inputs
 *      before any storage or API call.
 *   3. Pre-check daily cost counter (read-only SELECT) — if already at
 *      the cap, bail before burning OpenAI tokens.
 *   4. Sharp downsize to 1024px JPEG — bounds token usage on the Vision
 *      call and removes EXIF / metadata from what we send upstream.
 *   5. Post-call atomic counter increment via RPC — enforces the cap
 *      under concurrency and raises DAILY_COST_CAP_EXCEEDED when any
 *      concurrent burst pushes the total over $5/day.
 *
 * All errors are sanitized before returning; Sentry captures the
 * unexpected ones with phase: 'sprint_2_photo_estimator'.
 */

import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/server";
import { RateLimiters } from "@/lib/security/rate-limit";
import { publicExtractFromImage } from "@/lib/ai-extract/publicExtractFromImage";
import { estimateFence } from "@/lib/fence-graph/engine";
import type { FenceProjectInput } from "@/lib/fence-graph/types";
import {
  PhotoEstimateRequestSchema,
  PHOTO_ESTIMATE_ALLOWED_MIMES,
  PHOTO_ESTIMATE_MAX_BYTES,
  isAllowedPhotoMime,
} from "@/lib/validation/photo-estimate-schemas";

// Node.js runtime is required — sharp is a native binary.
export const runtime = "nodejs";
// Vision calls can take 20–30s under load; keep headroom.
export const maxDuration = 60;

const DAILY_CAP_CENTS = 500;

// ── Helpers ──────────────────────────────────────────────────────

function getClientIp(request: NextRequest): string {
  // x-forwarded-for is a comma-separated list; first entry is the client.
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

function extFor(mime: string): "jpg" | "png" | "webp" {
  if (mime === "image/png")  return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

function formatPriceRange(totalCost: number): { low: number; high: number } {
  return {
    low:  Math.round(totalCost * 0.85),
    high: Math.round(totalCost * 1.15),
  };
}

function fenceTypeLabel(
  fenceType: string,
  heightFt: number,
  productLineId: string
): string {
  // productLineId like "wood_privacy_6ft" → "Wood Privacy, 6ft"
  const parts = productLineId.split("_");
  const pretty = parts
    .filter((p) => !/^\d+ft$/.test(p))
    .map((p) => p[0]?.toUpperCase() + p.slice(1))
    .join(" ");
  return `${pretty || fenceType}, ${heightFt}ft`;
}

function buildDisplayMarkdown(
  extractionData: NonNullable<
    Awaited<ReturnType<typeof publicExtractFromImage>>["data"]
  >,
  totalLinearFeet: number,
  priceLow: number,
  priceHigh: number
): string {
  const runCount  = extractionData.runs.length;
  const gateCount = extractionData.runs.reduce(
    (s, r) => s + r.gates.length,
    0
  );
  const firstRun = extractionData.runs[0];
  const typeLine = firstRun
    ? fenceTypeLabel(firstRun.fenceType, firstRun.heightFt, firstRun.productLineId)
    : "Not detected";

  const flagsBlock = extractionData.flags.length
    ? `\n\n**Heads up:**\n${extractionData.flags.map((f) => `- ${f}`).join("\n")}`
    : "";

  return [
    `## Your Fence Estimate`,
    ``,
    `**Type:** ${typeLine}`,
    `**Length:** ${totalLinearFeet} linear feet${
      runCount > 1 ? ` (across ${runCount} runs)` : ""
    }`,
    `**Gates:** ${gateCount}`,
    ``,
    `### Estimated price range`,
    `**$${priceLow.toLocaleString()} – $${priceHigh.toLocaleString()}**`,
    ``,
    `_${extractionData.rawSummary}_`,
    flagsBlock,
  ].join("\n");
}

// ── Handler ──────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const admin = createAdminClient();

  try {
    // 1) Per-IP rate limit.
    const ip = getClientIp(request);
    const rate = RateLimiters.photoEstimatePublic(ip);
    if (!rate.success) {
      return NextResponse.json(
        {
          error:
            rate.error ??
            "You've used your free estimates for today. Please try again tomorrow or sign up for more.",
          resetAt: new Date(rate.resetAt).toISOString(),
        },
        { status: 429 }
      );
    }

    // 2) Parse multipart + validate text inputs.
    const form = await request.formData();
    const imageField = form.get("image");
    if (!(imageField instanceof File)) {
      return NextResponse.json(
        { error: "An image file is required." },
        { status: 400 }
      );
    }

    const additionalContext =
      typeof form.get("additionalContext") === "string"
        ? (form.get("additionalContext") as string)
        : undefined;
    const locationHint =
      typeof form.get("locationHint") === "string"
        ? (form.get("locationHint") as string)
        : undefined;

    PhotoEstimateRequestSchema.parse({ additionalContext, locationHint });

    // 3) Validate image — MIME + size.
    const mime = imageField.type;
    if (!isAllowedPhotoMime(mime)) {
      return NextResponse.json(
        {
          error: `Unsupported image format. Please upload ${PHOTO_ESTIMATE_ALLOWED_MIMES.join(
            ", "
          )}.`,
        },
        { status: 400 }
      );
    }
    if (imageField.size > PHOTO_ESTIMATE_MAX_BYTES) {
      return NextResponse.json(
        { error: "Image is too large. Please upload a photo under 8 MB." },
        { status: 400 }
      );
    }
    if (imageField.size === 0) {
      return NextResponse.json(
        { error: "Image appears to be empty. Please upload a valid photo." },
        { status: 400 }
      );
    }

    // 4) Pre-check daily cost cap. Cheaper than losing tokens on a call
    //    that's guaranteed to fail when the increment RPC runs later.
    const { data: capRow } = await admin
      .from("photo_estimate_daily_cost")
      .select("total_cost_cents")
      .eq("date", new Date().toISOString().slice(0, 10))
      .maybeSingle();
    if (capRow && capRow.total_cost_cents >= DAILY_CAP_CENTS) {
      return NextResponse.json(
        {
          error:
            "The free tier is at capacity for today. Please try again tomorrow or create an account.",
        },
        { status: 429 }
      );
    }

    // 5) Upload original to private bucket — grouped by day for cleanup.
    const originalBuffer = Buffer.from(await imageField.arrayBuffer());
    const day = new Date().toISOString().slice(0, 10);
    const uploadId = crypto.randomUUID();
    const storagePath = `${day}/${uploadId}.${extFor(mime)}`;

    const uploadResult = await admin.storage
      .from("photo-estimate-uploads")
      .upload(storagePath, originalBuffer, {
        contentType: mime,
        upsert: false,
      });
    if (uploadResult.error) {
      throw new Error(`Storage upload failed: ${uploadResult.error.message}`);
    }

    // 6) Downsize + JPEG encode for the Vision call.
    const downsized = await sharp(originalBuffer)
      .rotate() // respect EXIF orientation before stripping it
      .resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
    const base64 = downsized.toString("base64");

    // 7) Extraction via existing pipeline.
    const extraction = await publicExtractFromImage(
      base64,
      "image/jpeg",
      additionalContext || locationHint
        ? [additionalContext, locationHint && `Location: ${locationHint}`]
            .filter(Boolean)
            .join("\n")
        : undefined
    );

    // 8) Atomic cost increment + cap enforcement.
    const { error: costErr } = await admin.rpc(
      "increment_photo_estimate_cost",
      { p_cents: extraction.costCents }
    );
    if (costErr) {
      if ((costErr.message ?? "").includes("DAILY_COST_CAP_EXCEEDED")) {
        return NextResponse.json(
          {
            error:
              "The free tier is at capacity for today. Please try again tomorrow or create an account.",
          },
          { status: 429 }
        );
      }
      throw new Error(`Cost-counter RPC failed: ${costErr.message}`);
    }

    // 9) If extraction is blocked, return a helpful 422 but keep the
    //    claim_token row so the user can see the flags in the UI.
    if (extraction.blocked || !extraction.data) {
      return NextResponse.json(
        {
          error:
            "We couldn't identify a fence run in this photo. Try a different angle or add a note describing the fence.",
          blockers: extraction.blockers,
          flags: extraction.data?.flags ?? [],
        },
        { status: 422 }
      );
    }

    // 10) Run the BOM engine. Anon flow has no org priceMap — engine
    //     defaults produce a ballpark that we widen into a range.
    const input = extraction.data as unknown as FenceProjectInput;
    const engineResult = estimateFence(input, {
      laborRatePerHr: 75,
      wastePct: 0.10,
      priceMap: {},
    });

    const totalLinearFeet = extraction.data.runs.reduce(
      (s, r) => s + r.linearFeet,
      0
    );
    const { low: priceLow, high: priceHigh } = formatPriceRange(
      engineResult.totalCost
    );
    const gateCount = extraction.data.runs.reduce(
      (s, r) => s + r.gates.length,
      0
    );
    const firstRun = extraction.data.runs[0];
    const typeLabel = firstRun
      ? fenceTypeLabel(firstRun.fenceType, firstRun.heightFt, firstRun.productLineId)
      : "Unknown";

    const displayMarkdown = buildDisplayMarkdown(
      extraction.data,
      totalLinearFeet,
      priceLow,
      priceHigh
    );

    // 11) Persist the anonymous estimate row. Service role bypasses RLS.
    const { data: inserted, error: insertErr } = await admin
      .from("public_photo_estimates")
      .insert({
        ip_address: ip === "unknown" ? null : ip,
        user_agent: (request.headers.get("user-agent") ?? "").slice(0, 500),
        image_storage_path: storagePath,
        extraction_json:   extraction.data as unknown as Record<string, unknown>,
        estimate_json:     engineResult   as unknown as Record<string, unknown>,
        openai_cost_cents: extraction.costCents,
      })
      .select("claim_token")
      .single();

    if (insertErr || !inserted) {
      throw new Error(
        `Failed to persist photo estimate: ${insertErr?.message ?? "unknown"}`
      );
    }

    return NextResponse.json({
      claim_token: inserted.claim_token,
      extraction: {
        runs: extraction.data.runs,
        confidence: extraction.data.confidence,
        flags: extraction.data.flags,
        rawSummary: extraction.data.rawSummary,
      },
      estimate: {
        totalLinearFeet,
        totalCost: engineResult.totalCost,
        priceRangeLow:  priceLow,
        priceRangeHigh: priceHigh,
        bomSummary:     extraction.data.rawSummary,
        fenceTypeLabel: typeLabel,
        gateCount,
      },
      displayMarkdown,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      const firstIssue = err.issues[0];
      return NextResponse.json(
        {
          error: firstIssue?.message ?? "Invalid request.",
        },
        { status: 400 }
      );
    }

    Sentry.captureException(err, {
      tags: { phase: "sprint_2_photo_estimator", step: "photo_estimate" },
    });
    console.error("POST /api/public/photo-estimate error:", err);
    return NextResponse.json(
      {
        error:
          "We couldn't process your photo right now. Please try again in a moment.",
      },
      { status: 500 }
    );
  }
}
