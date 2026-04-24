/**
 * GET /api/ar/assets?token=<uuid>
 *
 * Customer-facing AR bootstrap endpoint. Given a shareable quote token
 * (fence_graphs.public_token), returns the 3D model URLs and panel
 * count the AR viewer needs to render the customer's fence in Quick
 * Look / Scene Viewer.
 *
 * Token validation flow mirrors /api/accept + src/app/quote/actions.ts:
 *   1. Shape-check the token as a UUID (Zod).
 *   2. Call rpc('is_token_valid', { token }) — this returns false for
 *      unknown, expired, or already-accepted tokens. We 404 on any
 *      failure without leaking which case hit (security by indistinct
 *      error surface).
 *   3. Load the fence_graphs row by public_token with service role so
 *      RLS can't mask it from the anon customer flow.
 *   4. Derive the asset catalog key via the SQL helper (single source
 *      of truth — matches the TS deriveFenceTypeId).
 *   5. Look up the active panel model for that key and compute panel
 *      count = ceil(total LF / segment length).
 *
 * All errors are sanitized — DB error objects never reach the client.
 * Sentry captures unexpected failures with phase: 'ar_quote'.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getARAssetUrls } from "@/lib/ar/asset-urls";
import { ARAssetsQuerySchema } from "@/lib/validation/ar-schemas";
import type { FenceProjectInput } from "@/lib/fence-graph/types";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

export async function GET(request: NextRequest) {
  try {
    // 1) Validate input
    const rawToken = request.nextUrl.searchParams.get("token");
    const { token } = ARAssetsQuerySchema.parse({ token: rawToken });

    const admin = createAdminClient();

    // 2) Token validity — same RPC the acceptance flow uses
    const { data: isValid, error: tokenErr } = await admin.rpc("is_token_valid", {
      token,
    });
    if (tokenErr || !isValid) {
      return NextResponse.json(
        { error: "Invalid or expired quote link" },
        { status: 404 }
      );
    }

    // 3) Fetch the quote row. Service role bypasses RLS — required for
    //    the anon customer path where there's no auth user.
    const { data: graph, error: graphErr } = await admin
      .from("fence_graphs")
      .select("id, input_json, ar_enabled, org_id")
      .eq("public_token", token)
      .single();

    if (graphErr || !graph) {
      return NextResponse.json(
        { error: "Invalid or expired quote link" },
        { status: 404 }
      );
    }

    // `ar_enabled` was added by migration 20260419010000 but isn't in
    // the generated types yet. Narrow the shape locally.
    const graphRow = graph as unknown as {
      id: string;
      input_json: FenceProjectInput;
      ar_enabled: boolean;
      org_id: string;
    };

    if (!graphRow.ar_enabled) {
      return NextResponse.json(
        { error: "AR not available for this quote" },
        { status: 404 }
      );
    }

    const input = graphRow.input_json;
    const productLineId =
      typeof input?.productLineId === "string" ? input.productLineId : null;

    // fenceHeight is PanelHeight = 4 | 5 | 6 | 8 (integer). Default to
    // 6 if missing — matches the TS deriveFenceTypeId default and keeps
    // the SQL RPC happy (it expects an INTEGER, not null).
    const fenceHeight =
      typeof input?.fenceHeight === "number" ? input.fenceHeight : 6;

    // 4) Authoritative SQL derivation — one place defines the mapping.
    const { data: fenceTypeId, error: deriveErr } = await admin.rpc(
      "derive_ar_fence_type_id",
      {
        product_line_id: productLineId,
        fence_height: fenceHeight,
      }
    );

    if (deriveErr || !fenceTypeId || typeof fenceTypeId !== "string") {
      return NextResponse.json(
        { error: "No AR model available for this fence type yet" },
        { status: 404 }
      );
    }

    // 5) Active panel asset row.
    const { data: asset, error: assetErr } = await admin
      .from("ar_model_assets")
      .select("glb_path, usdz_path, thumbnail_path, segment_length_ft")
      .eq("fence_type_id", fenceTypeId)
      .eq("asset_type", "panel")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (assetErr || !asset) {
      return NextResponse.json(
        { error: "No AR model available for this fence type yet" },
        { status: 404 }
      );
    }

    // DECIMAL columns arrive as string from PostgREST; coerce defensively.
    const segmentLengthFt = Number(asset.segment_length_ft);
    if (!Number.isFinite(segmentLengthFt) || segmentLengthFt <= 0) {
      throw new Error(
        `Invalid segment_length_ft for fence type ${fenceTypeId}`
      );
    }

    // Treat missing/invalid per-run linear feet as 0 so a partially-
    // filled estimate still resolves to a sane panel count.
    const runs = Array.isArray(input?.runs) ? input.runs : [];
    const totalLinearFeet = runs.reduce((sum, run) => {
      const lf = typeof run?.linearFeet === "number" ? run.linearFeet : 0;
      return sum + (Number.isFinite(lf) && lf > 0 ? lf : 0);
    }, 0);

    const panelCount =
      totalLinearFeet > 0 ? Math.ceil(totalLinearFeet / segmentLengthFt) : 0;

    const urls = getARAssetUrls(
      asset.glb_path,
      asset.usdz_path,
      asset.thumbnail_path ?? undefined
    );

    return NextResponse.json({
      glbUrl: urls.glbUrl,
      usdzUrl: urls.usdzUrl,
      thumbnailUrl: urls.thumbnailUrl ?? null,
      panelCount,
      segmentLengthFt,
      fenceTypeId,
      heightFt: fenceHeight,
      totalLinearFeet,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      // Bad token shape is a client error, not a server bug — don't
      // page on it.
      return NextResponse.json(
        { error: "Invalid or expired quote link" },
        { status: 404 }
      );
    }

    Sentry.captureException(err, {
      tags: { phase: "ar_quote", step: "fetch_assets" },
    });
    console.error("GET /api/ar/assets error:", err);
    return NextResponse.json(
      { error: "Failed to load AR assets" },
      { status: 500 }
    );
  }
}
