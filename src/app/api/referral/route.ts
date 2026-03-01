import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) {
    return NextResponse.json({ error: "No organization found" }, { status: 400 });
  }

  // Use first 8 chars of org_id as referral code
  const refCode = profile.org_id.replace(/-/g, "").substring(0, 8);
  const referralLink = `https://fenceestimatepro.com/signup?ref=${refCode}`;

  return NextResponse.json({ referralLink, refCode });
}
