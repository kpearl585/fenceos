import { NextRequest, NextResponse } from "next/server";
import { createBillingPortalSession } from "@/lib/stripe/subscription";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users").select("org_id, role").eq("id", user.id).single();

  if (profile?.role !== "owner") {
    return NextResponse.json({ error: "Owner only" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizations").select("stripe_customer_id").eq("id", profile.org_id).single();

  if (!org?.stripe_customer_id) {
    return NextResponse.json({ error: "No billing account found" }, { status: 400 });
  }

  const origin = req.headers.get("origin") || "https://fenceestimatepro.com";
  const session = await createBillingPortalSession(
    org.stripe_customer_id,
    `${origin}/dashboard/settings`
  );

  return NextResponse.json({ url: session.url });
}
