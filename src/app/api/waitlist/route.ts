import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail, waitlistWelcomeEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("waitlist")
      .insert({ email: normalizedEmail, source: "landing_page" });

    if (error && !error.message.includes("duplicate")) {
      return NextResponse.json({ error: "Failed" }, { status: 500 });
    }

    // Send Day 0 welcome email — never fail the signup if this errors
    try {
      await sendEmail({
        to: normalizedEmail,
        subject: "You're on the list. Here's what's coming.",
        html: waitlistWelcomeEmail({ email: normalizedEmail }),
      });
    } catch (emailErr) {
      console.error("[waitlist] Welcome email failed:", emailErr);
    }
  } catch (err) {
    // Waitlist table may not exist yet — fail gracefully
    console.error("[waitlist] Insert error:", err);
  }

  return NextResponse.json({ success: true });
}
