import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail, trialDay7Email, trialDay12Email, trialExpiredEmail } from "@/lib/email";
import { isEmailSuppressed } from "@/lib/email/suppressions";

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

  // Fetch all trial orgs with their owner email
  const { data: orgs, error } = await supabase
    .from("organizations")
    .select("id, name, trial_ends_at, trial_day7_sent, trial_day12_sent, trial_expired_sent")
    .in("plan", ["trial", "trialing"])
    .not("trial_ends_at", "is", null);

  if (error || !orgs) {
    return NextResponse.json({ error: "Failed to fetch orgs" }, { status: 500 });
  }

  let day7Sent = 0, day12Sent = 0, expiredSent = 0;

  for (const org of orgs) {
    const endsAt = new Date(org.trial_ends_at);
    const daysLeft = Math.ceil((endsAt.getTime() - now.getTime()) / 86400000);

    // Get owner email
    const { data: owner } = await supabase
      .from("users")
      .select("email")
      .eq("org_id", org.id)
      .eq("role", "owner")
      .single();

    if (!owner?.email) continue;
    if (await isEmailSuppressed(owner.email)) continue;

    // Day 7 email (7 days remaining, not yet sent)
    if (daysLeft === 7 && !org.trial_day7_sent) {
      const tpl = trialDay7Email({ email: owner.email, orgName: org.name, trialEndsAt: org.trial_ends_at });
      await sendEmail(tpl);
      await supabase.from("organizations").update({ trial_day7_sent: now.toISOString() }).eq("id", org.id);
      day7Sent++;
    }

    // Day 2 email (2 days remaining, not yet sent)
    if (daysLeft === 2 && !org.trial_day12_sent) {
      const tpl = trialDay12Email({ email: owner.email, orgName: org.name });
      await sendEmail(tpl);
      await supabase.from("organizations").update({ trial_day12_sent: now.toISOString() }).eq("id", org.id);
      day12Sent++;
    }

    // Expired email (0 days left, not yet sent)
    if (daysLeft <= 0 && !org.trial_expired_sent) {
      const tpl = trialExpiredEmail({ email: owner.email, orgName: org.name });
      await sendEmail(tpl);
      await supabase.from("organizations").update({ trial_expired_sent: now.toISOString() }).eq("id", org.id);
      expiredSent++;
    }
  }

  return NextResponse.json({ ok: true, day7Sent, day12Sent, expiredSent });
}
