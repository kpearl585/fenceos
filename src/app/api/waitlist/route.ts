import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { getRequestIp, takeRateLimit } from "@/lib/api/rateLimit";
import { clearEmailSuppression } from "@/lib/email/suppressions";

export async function POST(req: NextRequest) {
  try {
    const ip = getRequestIp(req);
    const rateLimit = takeRateLimit(`waitlist:${ip}`, 5, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        }
      );
    }

    const { email } = await req.json();
    if (!email?.trim() || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required." }, { status: 400 });
    }

    const admin = createAdminClient();
    const normalizedEmail = email.trim().toLowerCase();

    // Save to waitlist table (upsert to avoid duplicates)
    const { error: dbErr } = await admin
      .from("waitlist")
      .upsert({ email: normalizedEmail, created_at: new Date().toISOString() }, { onConflict: "email" });

    if (dbErr) {
      console.error("[waitlist] DB error:", dbErr.message);
      // Non-blocking — still send notification
    }

    try {
      await clearEmailSuppression(normalizedEmail);
    } catch (err) {
      console.error("[waitlist] failed to clear suppression:", err);
    }

    // Notify operator
    const notifyEmail =
      process.env.WAITLIST_NOTIFY_EMAIL ||
      process.env.SUPPORT_EMAIL ||
      "support@fenceestimatepro.com";
    await sendEmail({
      to: notifyEmail,
      subject: `New waitlist signup: ${email}`,
      html: `<p style="font-family:sans-serif;">New waitlist signup on FenceEstimatePro:<br><br><strong>${email}</strong></p>`,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[waitlist] error:", err);
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
