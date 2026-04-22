import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";

// Escape HTML for safe embedding in the operator notification email.
// Keeps this endpoint dependency-light — no need to pull in a templating lib
// for a one-paragraph email.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(req: NextRequest) {
  try {
    // Legacy waitlist clients still send { email }. Post-launch, the
    // ContactSection sends { email, message? } as a general contact form.
    // Accepting both shapes means we don't need to fork the endpoint.
    const body = await req.json();
    const email: string | undefined = body?.email;
    const rawMessage: string | undefined = body?.message;
    if (!email?.trim() || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required." }, { status: 400 });
    }
    // Cap message length server-side so a single submitter can't ship
    // a novel to the operator mailbox. UI also caps, this is defense in depth.
    const message = rawMessage?.trim().slice(0, 2000);

    const admin = createAdminClient();

    // Save to waitlist table (upsert to avoid duplicates). We keep the
    // table name as-is — it's the canonical "contacted us" log now.
    const { error: dbErr } = await admin
      .from("waitlist")
      .upsert({ email: email.trim().toLowerCase(), created_at: new Date().toISOString() }, { onConflict: "email" });

    if (dbErr) {
      console.error("[waitlist] DB error:", dbErr.message);
      // Non-blocking — still send notification
    }

    // Notify operator. Two templates: plain signup vs. contact message.
    const subject = message
      ? `New contact message from ${email}`
      : `New waitlist signup: ${email}`;
    const html = message
      ? `<p style="font-family:sans-serif;">New contact message on FenceEstimatePro:</p>
         <p style="font-family:sans-serif;"><strong>From:</strong> ${escapeHtml(email)}</p>
         <p style="font-family:sans-serif;"><strong>Message:</strong></p>
         <blockquote style="font-family:sans-serif; border-left:3px solid #16A34A; margin:0; padding:0 12px; color:#333;">${escapeHtml(message).replace(/\n/g, "<br>")}</blockquote>`
      : `<p style="font-family:sans-serif;">New waitlist signup on FenceEstimatePro:<br><br><strong>${escapeHtml(email)}</strong></p>`;

    await sendEmail({ to: "Pearllabs@icloud.com", subject, html });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[waitlist] error:", err);
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
