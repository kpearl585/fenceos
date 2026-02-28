import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("waitlist")
    .insert({ email: email.toLowerCase().trim(), source: "landing_page" });

  if (error && !error.message.includes("duplicate")) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
