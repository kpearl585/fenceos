import { NextRequest, NextResponse } from "next/server";
import { createSubscriptionCheckout } from "@/lib/stripe/subscription";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { plan } = await req.json();
  if (!["starter", "pro", "business"].includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  // Get org
  const { data: profile } = await supabase
    .from("users")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) {
    return NextResponse.json({ error: "No organization found" }, { status: 400 });
  }

  if (profile.role !== "owner") {
    return NextResponse.json({ error: "Only owners can manage billing" }, { status: 403 });
  }

  const origin = req.headers.get("origin") || "https://fenceestimatepro.com";

  try {
    const session = await createSubscriptionCheckout({
      orgId: profile.org_id,
      userId: user.id,
      plan: plan as "starter" | "pro" | "business",
      email: user.email!,
      successUrl: `${origin}/dashboard?subscribed=1`,
      cancelUrl: `${origin}/dashboard/upgrade?cancelled=1`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[subscribe] Checkout error:", err);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
