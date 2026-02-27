import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/stripe/webhook
 *
 * Stripe webhook handler. Validates signature, processes checkout.session.completed.
 * Uses Supabase service-role client (not user-scoped) since webhooks have no auth context.
 *
 * Required env vars:
 *  - STRIPE_SECRET_KEY
 *  - STRIPE_WEBHOOK_SECRET
 *  - NEXT_PUBLIC_SUPABASE_URL
 *  - SUPABASE_SERVICE_ROLE_KEY
 */

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL");
  }
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  // Read raw body for signature verification
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  // Handle checkout.session.completed
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const estimateId = session.metadata?.estimate_id;
    const orgId = session.metadata?.org_id;

    if (!estimateId || !orgId) {
      console.error("Webhook missing metadata:", session.metadata);
      return NextResponse.json(
        { error: "Missing metadata" },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // Retrieve PaymentIntent ID
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id || null;

    // Update estimate: deposit paid + status → deposit_paid
    const { error: updateErr } = await supabase
      .from("estimates")
      .update({
        deposit_paid: true,
        deposit_paid_at: new Date().toISOString(),
        stripe_payment_intent_id: paymentIntentId,
        stripe_payment_status: "paid",
        status: "deposit_paid",
        updated_at: new Date().toISOString(),
      })
      .eq("id", estimateId)
      .eq("org_id", orgId);

    if (updateErr) {
      console.error("Failed to update estimate after payment:", updateErr);
      return NextResponse.json(
        { error: "Database update failed" },
        { status: 500 }
      );
    }

    console.log(
      `Deposit paid for estimate ${estimateId} (org ${orgId}). PaymentIntent: ${paymentIntentId}`
    );
  }

  // Acknowledge receipt
  return NextResponse.json({ received: true });
}
