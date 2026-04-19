/**
 * POST /api/ar/sessions
 *
 * Creates a telemetry row in public.ar_sessions when a customer or
 * contractor kicks off an AR launch. Both flows hit this endpoint —
 * contractors get here from the dashboard "Preview in AR" button,
 * customers from the /quote/[token] surface.
 *
 * The insert uses the service role (createAdminClient) because the
 * anon customer path has no auth.uid(), and the RLS policies on
 * ar_sessions are scoped to authenticated users only. The token
 * validity check (is_token_valid RPC) is what gates the anon path
 * from writing arbitrary rows.
 *
 * Rate limited at 60/hr per token via RateLimiters.arSessionCreate —
 * that's ~1 launch/minute, which is plenty for a human tapping "Open
 * in AR" repeatedly without enabling log-spam attacks.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { ARSessionCreateSchema } from "@/lib/validation/ar-schemas";
import { RateLimiters } from "@/lib/security/rate-limit";
import type { FenceProjectInput } from "@/lib/fence-graph/types";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

export async function POST(request: NextRequest) {
  try {
    // 1) Parse + validate body
    const body = await request.json().catch(() => null);
    if (body === null) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const input = ARSessionCreateSchema.parse(body);

    // 2) Rate limit on the token — same ceiling for contractor and
    //    customer paths, since a stolen token is the main abuse vector
    //    and both identities share the same token in the contractor
    //    case ("preview as the customer sees it").
    const rate = RateLimiters.arSessionCreate(input.token);
    if (!rate.success) {
      return NextResponse.json(
        { error: rate.error ?? "Rate limit exceeded" },
        { status: 429 }
      );
    }

    const admin = createAdminClient();

    // 3) Token validity — identical check to /api/ar/assets so both
    //    endpoints 404 in lockstep for bad tokens.
    const { data: isValid, error: tokenErr } = await admin.rpc(
      "is_token_valid",
      { token: input.token }
    );
    if (tokenErr || !isValid) {
      return NextResponse.json(
        { error: "Invalid or expired quote link" },
        { status: 404 }
      );
    }

    // 4) Load the quote so we can stamp fence_graph_id + org_id +
    //    aggregate telemetry counts onto the session row.
    const { data: graph, error: graphErr } = await admin
      .from("fence_graphs")
      .select("id, org_id, input_json")
      .eq("public_token", input.token)
      .single();

    if (graphErr || !graph) {
      return NextResponse.json(
        { error: "Invalid or expired quote link" },
        { status: 404 }
      );
    }

    const graphRow = graph as {
      id: string;
      org_id: string;
      input_json: FenceProjectInput;
    };

    // 5) Derive panel_count + total_linear_ft for the analytics row.
    //    These are telemetry hints, NOT authoritative — if anything
    //    downstream (derive RPC, asset lookup) misses, we still insert
    //    the session with null panel_count rather than blocking the
    //    launch. Endpoint 1 (/api/ar/assets) is the source of truth
    //    for what the AR viewer actually shows.
    const runs = Array.isArray(graphRow.input_json?.runs)
      ? graphRow.input_json.runs
      : [];
    const totalLinearFt = runs.reduce((sum, run) => {
      const lf = typeof run?.linearFeet === "number" ? run.linearFeet : 0;
      return sum + (Number.isFinite(lf) && lf > 0 ? lf : 0);
    }, 0);

    let panelCount: number | null = null;
    try {
      const productLineId =
        typeof graphRow.input_json?.productLineId === "string"
          ? graphRow.input_json.productLineId
          : null;
      const fenceHeight =
        typeof graphRow.input_json?.fenceHeight === "number"
          ? graphRow.input_json.fenceHeight
          : 6;

      const { data: fenceTypeId } = await admin.rpc(
        "derive_ar_fence_type_id",
        { product_line_id: productLineId, fence_height: fenceHeight }
      );

      if (typeof fenceTypeId === "string" && fenceTypeId.length > 0) {
        const { data: asset } = await admin
          .from("ar_model_assets")
          .select("segment_length_ft")
          .eq("fence_type_id", fenceTypeId)
          .eq("asset_type", "panel")
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();

        const seg = asset ? Number(asset.segment_length_ft) : NaN;
        if (Number.isFinite(seg) && seg > 0 && totalLinearFt > 0) {
          panelCount = Math.ceil(totalLinearFt / seg);
        }
      }
    } catch (countErr) {
      // Best-effort telemetry; never block session creation on it.
      console.warn("ar_sessions panel_count derive failed:", countErr);
    }

    // 6) Insert the session row. Cast the payload — the generated DB
    //    types don't yet include the columns added by the AR migration.
    const insertPayload = {
      fence_graph_id: graphRow.id,
      org_id: graphRow.org_id,
      launched_by: input.launchedBy,
      public_token: input.token,
      device_type: input.deviceType ?? null,
      ar_mode: input.arMode ?? null,
      user_agent: input.userAgent ?? null,
      status: "initiated",
      panel_count: panelCount,
      total_linear_ft: totalLinearFt > 0 ? totalLinearFt : null,
    };

    const { data: inserted, error: insertErr } = await admin
      .from("ar_sessions")
      .insert(insertPayload as never)
      .select("id")
      .single();

    if (insertErr || !inserted) {
      Sentry.captureException(insertErr ?? new Error("ar_sessions insert returned no row"), {
        tags: { phase: "ar_quote", step: "create_session" },
      });
      return NextResponse.json(
        { error: "Failed to create AR session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ sessionId: (inserted as { id: string }).id });
  } catch (err) {
    if (err instanceof z.ZodError) {
      const first = err.issues[0];
      return NextResponse.json(
        { error: first?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    Sentry.captureException(err, {
      tags: { phase: "ar_quote", step: "create_session" },
    });
    console.error("POST /api/ar/sessions error:", err);
    return NextResponse.json(
      { error: "Failed to create AR session" },
      { status: 500 }
    );
  }
}
