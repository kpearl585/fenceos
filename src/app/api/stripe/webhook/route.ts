import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as Sentry from "@sentry/nextjs";

import { getStripe } from "@/lib/stripe/client";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  return createClient(url, key);
}

async function beginWebhookProcessing(
  supabase: ReturnType<typeof getServiceClient>,
  event: { id: string; type: string }
) {
  const { data: existing, error: fetchErr } = await supabase
    .from("stripe_webhook_events")
    .select("event_id, status")
    .eq("event_id", event.id)
    .maybeSingle();

  if (fetchErr) {
    throw new Error(`Failed to load webhook event state: ${fetchErr.message}`);
  }

  if (existing?.status === "processed" || existing?.status === "processing") {
    return { shouldProcess: false, duplicate: true };
  }

  if (existing?.status === "failed") {
    const { error: retryErr } = await supabase
      .from("stripe_webhook_events")
      .update({
        status: "processing",
        last_error: null,
        received_at: new Date().toISOString(),
        processed_at: null,
      })
      .eq("event_id", event.id);

    if (retryErr) {
      throw new Error(`Failed to reset webhook event state: ${retryErr.message}`);
    }

    return { shouldProcess: true, duplicate: false };
  }

  const { error: insertErr } = await supabase
    .from("stripe_webhook_events")
    .insert({
      event_id: event.id,
      event_type: event.type,
      status: "processing",
    });

  if (insertErr) {
    throw new Error(`Failed to record webhook event: ${insertErr.message}`);
  }

  return { shouldProcess: true, duplicate: false };
}

async function finishWebhookProcessing(
  supabase: ReturnType<typeof getServiceClient>,
  eventId: string,
  status: "processed" | "failed",
  lastError?: string
) {
  const { error } = await supabase
    .from("stripe_webhook_events")
    .update({
      status,
      processed_at: status === "processed" ? new Date().toISOString() : null,
      last_error: lastError ?? null,
    })
    .eq("event_id", eventId);

  if (error) {
    console.error(
      `[webhook] Failed to update event ${eventId} status:`,
      error.message
    );
  }
}

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature" },
      { status: 400 }
    );
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
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    const state = await beginWebhookProcessing(supabase, event);
    if (!state.shouldProcess) {
      return NextResponse.json({ received: true, duplicate: state.duplicate });
    }
  } catch (err) {
    console.error("[webhook] Failed to initialize idempotency state:", err);
    return NextResponse.json(
      { error: "Webhook bookkeeping failed" },
      { status: 500 }
    );
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      if (session.mode === "subscription") {
        const orgId = session.metadata?.org_id;
        const plan = session.metadata?.plan;
        const billingPeriod = session.metadata?.billing_period;
        const paywallTrigger = session.metadata?.paywall_trigger;
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;

        if (orgId && plan && customerId) {
          const { error: updateErr } = await supabase
            .from("organizations")
            .update({
              stripe_customer_id: customerId,
              stripe_subscription_id:
                typeof session.subscription === "string"
                  ? session.subscription
                  : null,
              plan,
              plan_status: "active",
              trial_ends_at: null,
            })
            .eq("id", orgId);

          if (updateErr) {
            console.error(
              `[webhook] Failed to update org ${orgId} after checkout:`,
              updateErr.message
            );
            throw new Error("DB update failed");
          }

          Sentry.captureMessage(
            `Paid conversion: org ${orgId} → ${plan} (${billingPeriod ?? "monthly"})${paywallTrigger ? ` from trigger ${paywallTrigger}` : " [organic]"}`,
            {
              tags: {
                surface: "paid-conversion",
                plan,
                billing_period: billingPeriod ?? "monthly",
                trigger: paywallTrigger ?? "organic",
              },
              level: "info",
              extra: {
                orgId,
                stripeSessionId: session.id,
                stripeSubscriptionId:
                  typeof session.subscription === "string"
                    ? session.subscription
                    : null,
              },
            }
          );
        }
      }

      if (session.mode === "payment") {
        const estimateId = session.metadata?.estimate_id;
        const orgId = session.metadata?.org_id;
        if (estimateId && orgId) {
          const piId =
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : null;
          const { error: depositErr } = await supabase
            .from("estimates")
            .update({
              deposit_paid: true,
              deposit_paid_at: new Date().toISOString(),
              stripe_payment_intent_id: piId,
              stripe_payment_status: "paid",
              status: "deposit_paid",
              updated_at: new Date().toISOString(),
            })
            .eq("id", estimateId)
            .eq("org_id", orgId);

          if (depositErr) {
            console.error(
              `[webhook] Failed to update deposit for estimate ${estimateId}:`,
              depositErr.message
            );
            throw new Error("DB update failed");
          }
        }
      }
    }

    if (event.type === "customer.subscription.updated") {
      const sub = event.data.object;
      const orgId = sub.metadata?.org_id;
      if (orgId) {
        const plan =
          sub.metadata?.plan || sub.items.data[0]?.price?.metadata?.plan;
        const billingPeriod =
          sub.metadata?.billing_period ||
          sub.items.data[0]?.price?.metadata?.billing_period;
        const paywallTrigger = sub.metadata?.paywall_trigger;

        const { error: subUpdateErr } = await supabase
          .from("organizations")
          .update({
            plan: plan || null,
            plan_status: sub.status,
          })
          .eq("id", orgId);

        if (subUpdateErr) {
          console.error(
            `[webhook] Failed to update subscription for org ${orgId}:`,
            subUpdateErr.message
          );
          throw new Error("DB update failed");
        }

        Sentry.captureMessage(
          `Subscription updated: org ${orgId} → ${plan ?? "unknown"} (${billingPeriod ?? "monthly"}) status=${sub.status}`,
          {
            tags: {
              surface: "subscription-updated",
              plan: plan ?? "unknown",
              billing_period: billingPeriod ?? "monthly",
              trigger: paywallTrigger ?? "organic",
              status: sub.status,
            },
            level: "info",
          }
        );

        const subscriberUserId = sub.metadata?.user_id;
        if (subscriberUserId && sub.status === "active") {
          const periodEnd = sub.items?.data?.[0]?.current_period_end;
          const expiresAt = periodEnd
            ? new Date(periodEnd * 1000).toISOString()
            : null;
          const { error: entErr } = await supabase
            .from("entitlements")
            .upsert(
              {
                user_id: subscriberUserId,
                feature: "docs_bundle",
                source: "fep_sub",
                source_ref: sub.id,
                granted_at: new Date().toISOString(),
                expires_at: expiresAt,
              },
              { onConflict: "user_id,feature" }
            );
          if (entErr) {
            console.error(
              `[webhook] docs_bundle grant failed for user ${subscriberUserId}:`,
              entErr.message
            );
          }
        }
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object;
      const orgId = sub.metadata?.org_id;
      if (orgId) {
        const { error: cancelErr } = await supabase
          .from("organizations")
          .update({
            plan: "free",
            plan_status: "cancelled",
            stripe_subscription_id: null,
          })
          .eq("id", orgId);

        if (cancelErr) {
          console.error(
            `[webhook] Failed to cancel subscription for org ${orgId}:`,
            cancelErr.message
          );
          throw new Error("DB update failed");
        }

        const subscriberUserId = sub.metadata?.user_id;
        if (subscriberUserId) {
          const { error: expErr } = await supabase
            .from("entitlements")
            .update({ expires_at: new Date().toISOString() })
            .eq("user_id", subscriberUserId)
            .eq("feature", "docs_bundle")
            .eq("source", "fep_sub")
            .eq("source_ref", sub.id);
          if (expErr) {
            console.error(
              `[webhook] docs_bundle expire failed for user ${subscriberUserId}:`,
              expErr.message
            );
          }
        }
      }
    }

    await finishWebhookProcessing(supabase, event.id, "processed");
    return NextResponse.json({ received: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown webhook error";
    await finishWebhookProcessing(supabase, event.id, "failed", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
