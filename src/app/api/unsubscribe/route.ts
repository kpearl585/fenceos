import { NextRequest, NextResponse } from "next/server";

import { suppressEmail } from "@/lib/email/suppressions";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  let email = "";

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const json = await request.json().catch(() => ({}));
    email = typeof json.email === "string" ? json.email : "";
  } else {
    const form = await request.formData();
    email = String(form.get("email") ?? "");
  }

  const normalized = email.trim().toLowerCase();
  if (!isValidEmail(normalized)) {
    if (contentType.includes("application/json")) {
      return NextResponse.json({ error: "Valid email required." }, { status: 400 });
    }
    return NextResponse.redirect(new URL("/unsubscribe?error=valid_email", request.url), 303);
  }

  try {
    await suppressEmail(normalized);
  } catch (error) {
    console.error("[unsubscribe] failed:", error);
    if (contentType.includes("application/json")) {
      return NextResponse.json({ error: "Failed to unsubscribe email." }, { status: 500 });
    }
    return NextResponse.redirect(new URL(`/unsubscribe?error=save_failed&email=${encodeURIComponent(normalized)}`, request.url), 303);
  }

  if (contentType.includes("application/json")) {
    return NextResponse.json({ success: true });
  }

  return NextResponse.redirect(new URL(`/unsubscribe?success=1&email=${encodeURIComponent(normalized)}`, request.url), 303);
}
