import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key);
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

  let supabase: ReturnType<typeof getServiceClient>;
  try {
    supabase = getServiceClient();
  } catch (err) {
    console.error("[webhook] Supabase client init failed:", err);
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  // ── Subscription checkout completed ──────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    if (session.mode === "subscription") {
      const orgId = session.metadata?.org_id;
      const plan  = session.metadata?.plan;
      const customerId = typeof session.customer === "string"
        ? session.customer : session.customer?.id;

      if (orgId && plan && customerId) {
        const { error: updateErr } = await supabase.from("organizations").update({
          stripe_customer_id: customerId,
          stripe_subscription_id: typeof session.subscription === "string"
            ? session.subscription : null,
          plan,
          plan_status: "active",
          trial_ends_at: null,
        }).eq("id", orgId);

        if (updateErr) {
          console.error(`[webhook] Failed to update org ${orgId} after checkout:`, updateErr.message);
          // Return 500 so Stripe retries the webhook
          return NextResponse.json({ error: "DB update failed" }, { status: 500 });
        }
      }
    }

    // Deposit payment
    if (session.mode === "payment") {
      const estimateId = session.metadata?.estimate_id;
      const orgId      = session.metadata?.org_id;
      if (estimateId && orgId) {
        const piId = typeof session.payment_intent === "string"
          ? session.payment_intent : null;
        const { error: depositErr } = await supabase.from("estimates").update({
          deposit_paid: true,
          deposit_paid_at: new Date().toISOString(),
          stripe_payment_intent_id: piId,
          stripe_payment_status: "paid",
          status: "deposit_paid",
          updated_at: new Date().toISOString(),
        }).eq("id", estimateId).eq("org_id", orgId);

        if (depositErr) {
          console.error(`[webhook] Failed to update deposit for estimate ${estimateId}:`, depositErr.message);
          return NextResponse.json({ error: "DB update failed" }, { status: 500 });
        }
      }
    }
  }

  // ── Subscription updated ──────────────────────────────────────────────────
  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object;
    const orgId = sub.metadata?.org_id;
    if (orgId) {
      const plan = sub.metadata?.plan || sub.items.data[0]?.price?.metadata?.plan;
      const { error: subUpdateErr } = await supabase.from("organizations").update({
        plan: plan || null,
        plan_status: sub.status,
      }).eq("id", orgId);

      if (subUpdateErr) {
        console.error(`[webhook] Failed to update subscription for org ${orgId}:`, subUpdateErr.message);
        return NextResponse.json({ error: "DB update failed" }, { status: 500 });
      }
    }
  }

  // ── Subscription cancelled / deleted ─────────────────────────────────────
  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object;
    const orgId = sub.metadata?.org_id;
    if (orgId) {
      const { error: cancelErr } = await supabase.from("organizations").update({
        plan: "free",
        plan_status: "cancelled",
        stripe_subscription_id: null,
      }).eq("id", orgId);

      if (cancelErr) {
        console.error(`[webhook] Failed to cancel subscription for org ${orgId}:`, cancelErr.message);
        return NextResponse.json({ error: "DB update failed" }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
