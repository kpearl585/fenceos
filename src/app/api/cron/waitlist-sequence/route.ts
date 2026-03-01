import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail, waitlistDayThreeEmail, waitlistDaySevenEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  // CRON_SECRET protection
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("x-cron-secret") || req.headers.get("authorization");
    const provided = authHeader?.replace(/^Bearer\s+/i, "");
    if (provided !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const admin = createAdminClient();
  let sent = 0;

  try {
    const now = new Date();
    const day3End = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const day3Start = new Date(now.getTime() - 3.1 * 24 * 60 * 60 * 1000);
    const day7End = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const day7Start = new Date(now.getTime() - 7.1 * 24 * 60 * 60 * 1000);

    // Day 3 candidates
    try {
      const { data: day3Rows } = await admin
        .from("waitlist")
        .select("id, email, day3_sent")
        .gte("created_at", day3Start.toISOString())
        .lte("created_at", day3End.toISOString())
        .is("day3_sent", null);

      for (const row of day3Rows ?? []) {
        try {
          await sendEmail({
            to: row.email,
            subject: "The $4,200 mistake most fence contractors make every month",
            html: waitlistDayThreeEmail({ email: row.email }),
          });
          await admin.from("waitlist").update({ day3_sent: now.toISOString() }).eq("id", row.id);
          sent++;
        } catch (err) {
          console.error("[waitlist-cron] Day 3 email failed for", row.email, err);
        }
      }
    } catch (err) {
      console.error("[waitlist-cron] Day 3 query failed (columns may not exist yet):", err);
    }

    // Day 7 candidates
    try {
      const { data: day7Rows } = await admin
        .from("waitlist")
        .select("id, email, day7_sent")
        .gte("created_at", day7Start.toISOString())
        .lte("created_at", day7End.toISOString())
        .is("day7_sent", null);

      for (const row of day7Rows ?? []) {
        try {
          await sendEmail({
            to: row.email,
            subject: "Early access is almost here — sneak peek inside",
            html: waitlistDaySevenEmail({ email: row.email }),
          });
          await admin.from("waitlist").update({ day7_sent: now.toISOString() }).eq("id", row.id);
          sent++;
        } catch (err) {
          console.error("[waitlist-cron] Day 7 email failed for", row.email, err);
        }
      }
    } catch (err) {
      console.error("[waitlist-cron] Day 7 query failed (columns may not exist yet):", err);
    }
  } catch (err) {
    console.error("[waitlist-cron] Fatal error:", err);
  }

  return NextResponse.json({ sent });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
