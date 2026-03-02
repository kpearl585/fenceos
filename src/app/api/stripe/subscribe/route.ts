import { NextRequest, NextResponse } from "next/server";
import { createSubscriptionCheckout } from "@/lib/stripe/subscription";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { plan, billing_period = "monthly" } = await req.json();
  if (!["starter", "pro", "business"].includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }
  if (!["monthly", "annual"].includes(billing_period)) {
    return NextResponse.json({ error: "Invalid billing period" }, { status: 400 });
  }

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
      billingPeriod: billing_period as "monthly" | "annual",
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    console.error("[subscribe] Checkout error:", err);
    const stripeErr = err as { type?: string; message?: string; code?: string };
    if (stripeErr?.type === "StripeInvalidRequestError" || stripeErr?.code === "account_invalid") {
      return NextResponse.json({ error: "Payment processing is being configured. Please contact support@fenceestimatepro.com to complete your upgrade." }, { status: 503 });
    }
    return NextResponse.json({ error: stripeErr?.message || "Failed to create checkout session. Please try again or contact support." }, { status: 500 });
  }
}
