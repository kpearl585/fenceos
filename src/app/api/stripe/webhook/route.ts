import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: ReturnType<typeof stripe.webhooks.constructEvent>;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook sig failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = getServiceClient();

  // ── Subscription checkout completed ──────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    if (session.mode === "subscription") {
      const orgId = session.metadata?.org_id;
      const plan  = session.metadata?.plan;
      const customerId = typeof session.customer === "string"
        ? session.customer : session.customer?.id;

      if (orgId && plan && customerId) {
        await supabase.from("organizations").update({
          stripe_customer_id: customerId,
          stripe_subscription_id: typeof session.subscription === "string"
            ? session.subscription : null,
          plan,
          plan_status: "active",
          trial_ends_at: null,
          updated_at: new Date().toISOString(),
        }).eq("id", orgId);

        console.log(`[webhook] Subscribed org ${orgId} to plan ${plan}`);
      }
    }

    // Deposit payment
    if (session.mode === "payment") {
      const estimateId = session.metadata?.estimate_id;
      const orgId      = session.metadata?.org_id;
      if (estimateId && orgId) {
        const piId = typeof session.payment_intent === "string"
          ? session.payment_intent : null;
        await supabase.from("estimates").update({
          deposit_paid: true,
          deposit_paid_at: new Date().toISOString(),
          stripe_payment_intent_id: piId,
          stripe_payment_status: "paid",
          status: "deposit_paid",
          updated_at: new Date().toISOString(),
        }).eq("id", estimateId).eq("org_id", orgId);
        console.log(`[webhook] Deposit paid for estimate ${estimateId}`);
      }
    }
  }

  // ── Subscription updated ──────────────────────────────────────────────────
  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object;
    const orgId = sub.metadata?.org_id;
    if (orgId) {
      const plan = sub.metadata?.plan || sub.items.data[0]?.price?.metadata?.plan;
      await supabase.from("organizations").update({
        plan: plan || null,
        plan_status: sub.status,
        updated_at: new Date().toISOString(),
      }).eq("id", orgId);
      console.log(`[webhook] Subscription updated for org ${orgId}: ${sub.status}`);
    }
  }

  // ── Subscription cancelled / deleted ─────────────────────────────────────
  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object;
    const orgId = sub.metadata?.org_id;
    if (orgId) {
      await supabase.from("organizations").update({
        plan: "free",
        plan_status: "cancelled",
        stripe_subscription_id: null,
        updated_at: new Date().toISOString(),
      }).eq("id", orgId);
      console.log(`[webhook] Subscription cancelled for org ${orgId}`);
    }
  }

  return NextResponse.json({ received: true });
}
