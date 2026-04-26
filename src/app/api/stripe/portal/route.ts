import { NextRequest, NextResponse } from "next/server";
import { createBillingPortalSession } from "@/lib/stripe/subscription";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAppOrigin } from "@/lib/http/appOrigin";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users").select("org_id, role").eq("auth_id", user.id).single();

  if (profile?.role !== "owner") {
    return NextResponse.json({ error: "Owner only" }, { status: 403 });
  }
  const { data: org } = await admin
    .from("organizations").select("stripe_customer_id").eq("id", profile.org_id).single();

  // No Stripe customer yet — redirect to upgrade page instead of crashing
  if (!org?.stripe_customer_id) {
    return NextResponse.json({ redirect: "/dashboard/upgrade" });
  }

  try {
    const origin = getAppOrigin();
    const session = await createBillingPortalSession(
      org.stripe_customer_id,
      `${origin}/dashboard/settings`
    );
    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    console.error("[portal] Billing portal error:", err);
    return NextResponse.json({ redirect: "/dashboard/upgrade" });
  }
}
