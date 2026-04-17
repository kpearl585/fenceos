import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail, trialDay7Email, trialDay12Email, trialExpiredEmail, trialWinbackEmail } from "@/lib/email";
import * as Sentry from "@sentry/nextjs";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = admin();
  const now = new Date();

  // ── Active trial orgs ──────────────────────────────────────────────────────
  const { data: trialOrgs, error: trialErr } = await supabase
    .from("organizations")
    .select("id, name, trial_ends_at, trial_day7_sent, trial_day12_sent, trial_expired_sent")
    .in("plan", ["trial", "trialing"])
    .not("trial_ends_at", "is", null);

  if (trialErr || !trialOrgs) {
    return NextResponse.json({ error: "Failed to fetch trial orgs" }, { status: 500 });
  }

  // ── Expired orgs eligible for win-back (expired, not yet on paid plan, within 30 days) ──
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
  const sevenDaysAgo  = new Date(now.getTime() - 7  * 86400000).toISOString();

  const { data: expiredOrgs } = await supabase
    .from("organizations")
    .select("id, name, trial_ends_at, trial_expired_sent, trial_winback_sent")
    .eq("plan", "trial")
    .not("trial_expired_sent", "is", null)
    .gte("trial_ends_at", thirtyDaysAgo)   // expired within last 30 days
    .lte("trial_ends_at", sevenDaysAgo)    // but at least 7 days ago
    .is("trial_winback_sent", null);       // win-back not yet sent

  let day7Sent = 0, day12Sent = 0, expiredSent = 0, winbackSent = 0;
  const errors: { orgId: string; step: string; message: string }[] = [];

  // ── Active trial sequence ─────────────────────────────────────────────────
  for (const org of trialOrgs) {
    try {
      const endsAt = new Date(org.trial_ends_at);
      const daysLeft = Math.ceil((endsAt.getTime() - now.getTime()) / 86400000);

      const { data: owner } = await supabase
        .from("users")
        .select("email")
        .eq("org_id", org.id)
        .eq("role", "owner")
        .single();

      if (!owner?.email) continue;

      // Day 7 — 7 or fewer days remaining (but trial still active).
      // `<=` instead of `===` so a missed cron run doesn't permanently skip
      // the reminder. Idempotency guaranteed by the `!trial_day7_sent` guard.
      if (daysLeft <= 7 && daysLeft > 2 && !org.trial_day7_sent) {
        const tpl = trialDay7Email({ email: owner.email, orgName: org.name, trialEndsAt: org.trial_ends_at });
        await sendEmail(tpl);
        await supabase.from("organizations").update({ trial_day7_sent: now.toISOString() }).eq("id", org.id);
        day7Sent++;
      }

      // Day 12 — 2 or fewer days remaining (but trial still active).
      if (daysLeft <= 2 && daysLeft > 0 && !org.trial_day12_sent) {
        const tpl = trialDay12Email({ email: owner.email, orgName: org.name });
        await sendEmail(tpl);
        await supabase.from("organizations").update({ trial_day12_sent: now.toISOString() }).eq("id", org.id);
        day12Sent++;
      }

      // Expired — 0 or negative days left
      if (daysLeft <= 0 && !org.trial_expired_sent) {
        const tpl = trialExpiredEmail({ email: owner.email, orgName: org.name });
        await sendEmail(tpl);
        await supabase.from("organizations").update({ trial_expired_sent: now.toISOString() }).eq("id", org.id);
        expiredSent++;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown error";
      errors.push({ orgId: org.id, step: "active-trial", message });
      Sentry.captureException(err, {
        tags: { cron: "trial-emails", step: "active-trial", orgId: org.id },
        level: "error",
      });
    }
  }

  // ── Win-back sequence (7 days post-expiry) ────────────────────────────────
  for (const org of (expiredOrgs ?? [])) {
    try {
      const { data: owner } = await supabase
        .from("users")
        .select("email")
        .eq("org_id", org.id)
        .eq("role", "owner")
        .single();

      if (!owner?.email) continue;

      const tpl = trialWinbackEmail({ email: owner.email, orgName: org.name });
      await sendEmail(tpl);
      await supabase.from("organizations").update({ trial_winback_sent: now.toISOString() }).eq("id", org.id);
      winbackSent++;
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown error";
      errors.push({ orgId: org.id, step: "winback", message });
      Sentry.captureException(err, {
        tags: { cron: "trial-emails", step: "winback", orgId: org.id },
        level: "error",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    day7Sent, day12Sent, expiredSent, winbackSent,
    errorCount: errors.length,
    errors: errors.slice(0, 10), // cap payload; full list is in Sentry
  });
}
