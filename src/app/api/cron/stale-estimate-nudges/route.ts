import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail, staleEstimateNudgeEmail } from "@/lib/email";
import * as Sentry from "@sentry/nextjs";

// Daily cron: find quotes that have sat in "quoted" status for >= N days
// without a customer response, and email the contractor a one-time nudge.
//
// Activates the pipeline dashboard — contractors see stale quotes in-app,
// but they're much more likely to act when the reminder lands in their
// inbox alongside the customer name and amount.
//
// Idempotent via estimates.followup_nudge_sent_at — we send exactly once
// per estimate. If the customer accepts offline, the contractor should
// mark the estimate accepted in-app; we won't spam them.

const NUDGE_AFTER_DAYS = 5;

// Cap per run — avoids a runaway email burst if the column rollout introduces
// a large backlog of "eligible" estimates on the first run. Remaining orgs
// catch up on subsequent runs.
const MAX_NUDGES_PER_RUN = 200;

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://fenceestimatepro.com";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = admin();
  const now = new Date();
  const cutoff = new Date(now.getTime() - NUDGE_AFTER_DAYS * 86400000).toISOString();

  // ── Find eligible quotes ─────────────────────────────────────────────────
  // - status "quoted" = sent to customer, awaiting response (not accepted,
  //   not converted, not draft)
  // - quoted_at on or before cutoff (5+ days old)
  // - no prior nudge (idempotency)
  const { data: estimates, error: fetchErr } = await supabase
    .from("estimates")
    .select("id, org_id, title, total, quoted_at, customer_id")
    .eq("status", "quoted")
    .lte("quoted_at", cutoff)
    .is("followup_nudge_sent_at", null)
    .limit(MAX_NUDGES_PER_RUN);

  if (fetchErr) {
    Sentry.captureException(fetchErr, {
      tags: { cron: "stale-estimate-nudges", step: "fetch" },
    });
    return NextResponse.json(
      { error: "Failed to fetch eligible estimates" },
      { status: 500 }
    );
  }

  let sent = 0;
  const errors: { estimateId: string; step: string; message: string }[] = [];

  for (const est of estimates ?? []) {
    try {
      // Owner email for the org
      const { data: owner } = await supabase
        .from("users")
        .select("email")
        .eq("org_id", est.org_id)
        .eq("role", "owner")
        .single();

      if (!owner?.email) {
        errors.push({
          estimateId: est.id,
          step: "lookup-owner",
          message: "no owner with role=owner found for org",
        });
        continue;
      }

      // Org name + customer name
      const [{ data: org }, { data: customer }] = await Promise.all([
        supabase.from("organizations").select("name").eq("id", est.org_id).single(),
        est.customer_id
          ? supabase.from("customers").select("name").eq("id", est.customer_id).single()
          : Promise.resolve({ data: null }),
      ]);

      const orgName = org?.name ?? "Your Org";
      const customerName =
        (customer as { name?: string } | null)?.name?.trim() ||
        est.title ||
        "your customer";

      const daysSinceQuote = Math.max(
        1,
        Math.floor((now.getTime() - new Date(est.quoted_at).getTime()) / 86400000)
      );

      const tpl = staleEstimateNudgeEmail({
        email: owner.email,
        orgName,
        customerName,
        total: Number(est.total ?? 0),
        daysSinceQuote,
        estimateUrl: `${APP_URL}/dashboard/estimates/${est.id}`,
      });
      await sendEmail(tpl);

      await supabase
        .from("estimates")
        .update({ followup_nudge_sent_at: now.toISOString() })
        .eq("id", est.id);

      sent++;
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown error";
      errors.push({ estimateId: est.id, step: "send", message });
      Sentry.captureException(err, {
        tags: { cron: "stale-estimate-nudges", step: "send", estimateId: est.id },
        level: "error",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    eligible: estimates?.length ?? 0,
    sent,
    errorCount: errors.length,
    errors: errors.slice(0, 10),
  });
}
