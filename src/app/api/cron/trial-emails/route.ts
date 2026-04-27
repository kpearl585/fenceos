import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  sendEmail,
  trialDay7Email,
  trialDay12Email,
  trialExpiredEmail,
  trialWinbackEmail,
} from "@/lib/email";
import { isEmailSuppressed } from "@/lib/email/suppressions";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseServiceKey, getSupabaseUrl } from "@/lib/supabase/env";

function admin() {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceKey();

  if (!url || !key) {
    throw new Error("Missing Supabase admin env vars for trial-emails cron.");
  }

  return createClient(
    url,
    key
  );
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = admin();
  const now = new Date();

  const { data: trialOrgs, error: trialErr } = await supabase
    .from("organizations")
    .select("id, name, trial_ends_at, trial_day7_sent, trial_day12_sent, trial_expired_sent")
    .in("plan", ["trial", "trialing"])
    .not("trial_ends_at", "is", null);

  if (trialErr || !trialOrgs) {
    return NextResponse.json({ error: "Failed to fetch trial orgs" }, { status: 500 });
  }

  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();

  const { data: expiredOrgs } = await supabase
    .from("organizations")
    .select("id, name, trial_ends_at, trial_expired_sent, trial_winback_sent")
    .eq("plan", "trial")
    .not("trial_expired_sent", "is", null)
    .gte("trial_ends_at", thirtyDaysAgo)
    .lte("trial_ends_at", sevenDaysAgo)
    .is("trial_winback_sent", null);

  let day7Sent = 0;
  let day12Sent = 0;
  let expiredSent = 0;
  let winbackSent = 0;
  const errors: { orgId: string; step: string; message: string }[] = [];

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
      if (await isEmailSuppressed(owner.email)) continue;

      if (daysLeft <= 7 && daysLeft > 2 && !org.trial_day7_sent) {
        const tpl = trialDay7Email({
          email: owner.email,
          orgName: org.name,
          trialEndsAt: org.trial_ends_at,
        });
        await sendEmail(tpl);
        await supabase
          .from("organizations")
          .update({ trial_day7_sent: now.toISOString() })
          .eq("id", org.id);
        day7Sent++;
      }

      if (daysLeft <= 2 && daysLeft > 0 && !org.trial_day12_sent) {
        const tpl = trialDay12Email({ email: owner.email, orgName: org.name });
        await sendEmail(tpl);
        await supabase
          .from("organizations")
          .update({ trial_day12_sent: now.toISOString() })
          .eq("id", org.id);
        day12Sent++;
      }

      if (daysLeft <= 0 && !org.trial_expired_sent) {
        const tpl = trialExpiredEmail({ email: owner.email, orgName: org.name });
        await sendEmail(tpl);
        await supabase
          .from("organizations")
          .update({ trial_expired_sent: now.toISOString() })
          .eq("id", org.id);
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

  for (const org of expiredOrgs ?? []) {
    try {
      const { data: owner } = await supabase
        .from("users")
        .select("email")
        .eq("org_id", org.id)
        .eq("role", "owner")
        .single();

      if (!owner?.email) continue;
      if (await isEmailSuppressed(owner.email)) continue;

      const tpl = trialWinbackEmail({ email: owner.email, orgName: org.name });
      await sendEmail(tpl);
      await supabase
        .from("organizations")
        .update({ trial_winback_sent: now.toISOString() })
        .eq("id", org.id);
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
    day7Sent,
    day12Sent,
    expiredSent,
    winbackSent,
    errorCount: errors.length,
    errors: errors.slice(0, 10),
  });
}
