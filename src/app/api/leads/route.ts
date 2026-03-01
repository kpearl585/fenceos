import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (name.length > 200) {
      return NextResponse.json(
        { error: "Name is too long." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { error: dbError } = await supabase
      .from("leads")
      .insert({ email, name: name || null });

    if (dbError) {
      console.error("[LEAD DB ERROR]", dbError);
      return NextResponse.json(
        { error: "Failed to save lead. Please try again." },
        { status: 500 }
      );
    }


    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[LEAD ERROR]", error);
    return NextResponse.json(
      { error: "Server error. Please try again." },
      { status: 500 }
    );
  }
}
