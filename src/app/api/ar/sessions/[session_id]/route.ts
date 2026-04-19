/**
 * PATCH /api/ar/sessions/[session_id]
 *
 * Updates an existing ar_sessions row as the launch moves through its
 * lifecycle: initiated → launched → placed → screenshot_taken →
 * completed (or abandoned at any point). Both customer and contractor
 * flows call this endpoint; the two are distinguished by whether the
 * body includes publicToken:
 *
 *   - Customer path (body.publicToken present): we verify that the
 *     token matches the session's public_token and use the service
 *     role to update. This is how an anon customer proves ownership
 *     without an auth user.
 *
 *   - Contractor path (no publicToken): we require an authenticated
 *     user whose profile.org_id matches session.org_id. The RLS UPDATE
 *     policy on ar_sessions would also enforce this via createClient(),
 *     but we run the explicit check to return a clean 403 rather than
 *     an RLS-masked 404 on the update.
 *
 * camelCase body fields → snake_case DB columns mapping lives here
 * because the DB is the canonical shape; the route is the translation
 * layer.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { ARSessionUpdateSchema } from "@/lib/validation/ar-schemas";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

const SessionIdSchema = z.string().uuid("Invalid session id");

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ session_id: string }> }
) {
  try {
    const { session_id } = await params;
    const sessionId = SessionIdSchema.parse(session_id);

    const raw = await request.json().catch(() => null);
    if (raw === null) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }
    const input = ARSessionUpdateSchema.parse(raw);

    const admin = createAdminClient();

    // 1) Load the session — we need its public_token + org_id to
    //    verify ownership, and we need to confirm it exists before
    //    handing back a 200.
    const { data: session, error: loadErr } = await admin
      .from("ar_sessions")
      .select("id, public_token, org_id")
      .eq("id", sessionId)
      .single();

    if (loadErr || !session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const sessionRow = session as unknown as {
      id: string;
      public_token: string | null;
      org_id: string;
    };

    // 2) Ownership check — customer path by token, contractor path by
    //    authenticated user's org.
    if (input.publicToken !== undefined) {
      // Customer path. Empty/mismatched tokens get 403, not 404, so
      // the client can distinguish "wrong session" from "gone".
      if (
        !sessionRow.public_token ||
        sessionRow.public_token !== input.publicToken
      ) {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }
    } else {
      // Contractor path.
      const supabase = await createClient();
      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser();

      if (authErr || !user) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }

      // Lookup via service role so the profile read doesn't depend on
      // the user's own RLS (matches the pattern used in stripe/portal
      // + price-sync actions).
      const { data: profile } = await admin
        .from("users")
        .select("org_id")
        .eq("auth_id", user.id)
        .single();

      if (!profile || profile.org_id !== sessionRow.org_id) {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }
    }

    // 3) Build the update payload. Only defined fields flow through —
    //    undefined stays undefined so we don't clobber columns on a
    //    partial PATCH. The DB type generator hasn't caught up to the
    //    AR migration yet, so we cast at the .update boundary.
    const updates: Record<string, string | number | null> = {};
    if (input.status !== undefined) updates.status = input.status;
    if (input.arLaunchedAt !== undefined) updates.ar_launched_at = input.arLaunchedAt;
    if (input.firstPlacedAt !== undefined) updates.first_placed_at = input.firstPlacedAt;
    if (input.completedAt !== undefined) updates.completed_at = input.completedAt;
    if (input.durationSeconds !== undefined)
      updates.duration_seconds = input.durationSeconds;

    // If the caller sent nothing updatable, short-circuit to 200.
    // Validates the fact that the session exists + is owned, without
    // writing a no-op row change.
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: true });
    }

    const { error: updateErr } = await admin
      .from("ar_sessions")
      .update(updates as never)
      .eq("id", sessionId);

    if (updateErr) {
      Sentry.captureException(updateErr, {
        tags: { phase: "ar_quote", step: "update_session" },
      });
      return NextResponse.json(
        { error: "Failed to update session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      const first = err.issues[0];
      return NextResponse.json(
        { error: first?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    Sentry.captureException(err, {
      tags: { phase: "ar_quote", step: "update_session" },
    });
    console.error("PATCH /api/ar/sessions/[session_id] error:", err);
    return NextResponse.json(
      { error: "Failed to update session" },
      { status: 500 }
    );
  }
}
