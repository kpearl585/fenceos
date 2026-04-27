import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { getRequestIp, takeRateLimit } from "@/lib/api/rateLimit";
import { clearEmailSuppression } from "@/lib/email/suppressions";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(req: NextRequest) {
  try {
    const ip = getRequestIp(req);
    const rateLimit = takeRateLimit(`waitlist:${ip}`, 5, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        }
      );
    }

    const body = await req.json();
    const email: string | undefined = body?.email;
    const rawMessage: string | undefined = body?.message;

    if (!email?.trim() || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required." }, { status: 400 });
    }

    const message = rawMessage?.trim().slice(0, 2000);
    const admin = createAdminClient();
    const normalizedEmail = email.trim().toLowerCase();

    const { error: dbErr } = await admin
      .from("waitlist")
      .upsert(
        { email: normalizedEmail, created_at: new Date().toISOString() },
        { onConflict: "email" }
      );

    if (dbErr) {
      console.error("[waitlist] DB error:", dbErr.message);
    }

    try {
      await clearEmailSuppression(normalizedEmail);
    } catch (err) {
      console.error("[waitlist] failed to clear suppression:", err);
    }

    const notifyEmail =
      process.env.WAITLIST_NOTIFY_EMAIL ||
      process.env.SUPPORT_EMAIL ||
      "support@fenceestimatepro.com";

    const subject = message
      ? `New contact message from ${email}`
      : `New waitlist signup: ${email}`;
    const html = message
      ? `<p style="font-family:sans-serif;">New contact message on FenceEstimatePro:</p>
         <p style="font-family:sans-serif;"><strong>From:</strong> ${escapeHtml(email)}</p>
         <p style="font-family:sans-serif;"><strong>Message:</strong></p>
         <blockquote style="font-family:sans-serif;border-left:3px solid #16A34A;margin:0;padding:0 12px;color:#333;">${escapeHtml(message).replace(/\n/g, "<br>")}</blockquote>`
      : `<p style="font-family:sans-serif;">New waitlist signup on FenceEstimatePro:<br><br><strong>${escapeHtml(email)}</strong></p>`;

    await sendEmail({ to: notifyEmail, subject, html });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[waitlist] error:", err);
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
