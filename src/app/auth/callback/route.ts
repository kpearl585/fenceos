import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/onboarding";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Use NEXT_PUBLIC_SITE_URL for production safety, fallback to origin for local dev
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || origin;
      return NextResponse.redirect(`${baseUrl}${next}`);
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || origin;
  return NextResponse.redirect(`${baseUrl}/login?error=Could+not+authenticate`);
}
