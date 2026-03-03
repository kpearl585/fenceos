import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email?.trim() || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required." }, { status: 400 });
    }

    const admin = createAdminClient();

    // Save to waitlist table (upsert to avoid duplicates)
    const { error: dbErr } = await admin
      .from("waitlist")
      .upsert({ email: email.trim().toLowerCase(), created_at: new Date().toISOString() }, { onConflict: "email" });

    if (dbErr) {
      console.error("[waitlist] DB error:", dbErr.message);
      // Non-blocking — still send notification
    }

    // Notify operator
    await sendEmail({
      to: "Pearllabs@icloud.com",
      subject: `New waitlist signup: ${email}`,
      html: `<p style="font-family:sans-serif;">New waitlist signup on FenceEstimatePro:<br><br><strong>${email}</strong></p>`,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[waitlist] error:", err);
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
