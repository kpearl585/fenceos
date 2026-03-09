import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail, trialDay7Email, trialDay12Email, trialExpiredEmail, trialWinbackEmail } from "@/lib/email";

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

  // ── Active trial sequence ─────────────────────────────────────────────────
  for (const org of trialOrgs) {
    const endsAt = new Date(org.trial_ends_at);
    const daysLeft = Math.ceil((endsAt.getTime() - now.getTime()) / 86400000);

    const { data: owner } = await supabase
      .from("users")
      .select("email")
      .eq("org_id", org.id)
      .eq("role", "owner")
      .single();

    if (!owner?.email) continue;

    // Day 7 — 7 days remaining
    if (daysLeft === 7 && !org.trial_day7_sent) {
      const tpl = trialDay7Email({ email: owner.email, orgName: org.name, trialEndsAt: org.trial_ends_at });
      await sendEmail(tpl);
      await supabase.from("organizations").update({ trial_day7_sent: now.toISOString() }).eq("id", org.id);
      day7Sent++;
    }

    // Day 12 — 2 days remaining
    if (daysLeft === 2 && !org.trial_day12_sent) {
      const tpl = trialDay12Email({ email: owner.email, orgName: org.name });
      await sendEmail(tpl);
      await supabase.from("organizations").update({ trial_day12_sent: now.toISOString() }).eq("id", org.id);
      day12Sent++;
    }

    // Expired — 0 days left
    if (daysLeft <= 0 && !org.trial_expired_sent) {
      const tpl = trialExpiredEmail({ email: owner.email, orgName: org.name });
      await sendEmail(tpl);
      await supabase.from("organizations").update({ trial_expired_sent: now.toISOString() }).eq("id", org.id);
      expiredSent++;
    }
  }

  // ── Win-back sequence (7 days post-expiry) ────────────────────────────────
  for (const org of (expiredOrgs ?? [])) {
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
  }

  return NextResponse.json({ ok: true, day7Sent, day12Sent, expiredSent, winbackSent });
}
