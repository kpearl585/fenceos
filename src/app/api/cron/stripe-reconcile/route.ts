import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe/client";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseServiceKey, getSupabaseUrl } from "@/lib/supabase/env";

// Hourly cron: reconcile our organizations.plan_status with Stripe's
// authoritative subscription.status. Catches the ~0.5% of webhook events
// that Stripe drops or that our /api/stripe/webhook handler silently
// failed to process — each of which would otherwise let a paying customer
// silently churn off our platform (past_due/canceled in Stripe, still
// "active" in our DB) or let a canceled customer keep full access.
//
// Runtime: Stripe rate limit is 100 req/sec on live mode, far above what
// this sweep uses. We paginate by `stripe_subscription_id IS NOT NULL`
// so we never fetch more orgs than we need.

const MAX_ORGS_PER_RUN = 500;

function admin() {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceKey();

  if (!url || !key) {
    throw new Error(
      "Missing Supabase admin env vars for stripe-reconcile cron."
    );
  }

  return createClient(
    url,
    key
  );
}

type Org = {
  id: string;
  plan: string | null;
  plan_status: string | null;
  stripe_subscription_id: string;
};

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = admin();
  const stripe = getStripe();

  // Orgs that have a subscription (trial orgs without checkout don't qualify).
  const { data: orgs, error: fetchErr } = await supabase
    .from("organizations")
    .select("id, plan, plan_status, stripe_subscription_id")
    .not("stripe_subscription_id", "is", null)
    .limit(MAX_ORGS_PER_RUN);

  if (fetchErr) {
    Sentry.captureException(fetchErr, {
      tags: { cron: "stripe-reconcile", step: "fetch" },
    });
    return NextResponse.json(
      { error: "Failed to fetch orgs" },
      { status: 500 }
    );
  }

  let checked = 0;
  let drifted = 0;
  let canceledOnStripe = 0;
  let errorsCount = 0;
  const drifts: {
    orgId: string;
    previous: string | null;
    updated: string;
  }[] = [];
  const errors: { orgId: string; message: string }[] = [];

  for (const org of (orgs as Org[] | null) ?? []) {
    checked++;
    try {
      // Authoritative read from Stripe.
      const sub = await stripe.subscriptions.retrieve(
        org.stripe_subscription_id
      );

      if (sub.status !== org.plan_status) {
        await supabase
          .from("organizations")
          .update({ plan_status: sub.status })
          .eq("id", org.id);
        drifts.push({
          orgId: org.id,
          previous: org.plan_status,
          updated: sub.status,
        });
        drifted++;

        // Surface drift in Sentry at info level so dashboards show when
        // our webhook handler is missing events. (Error level would be
        // too noisy — drift is expected to happen occasionally.)
        Sentry.captureMessage(
          `Stripe drift: org ${org.id} was "${org.plan_status}", Stripe says "${sub.status}"`,
          {
            tags: { cron: "stripe-reconcile", step: "drift" },
            level: "info",
          }
        );
      }
    } catch (err: unknown) {
      // Stripe throws a typed error when the subscription doesn't exist.
      // That means the subscription was fully deleted — flip our record
      // to "canceled" so we stop granting access. This is distinct from
      // a plain API error (network, rate limit, etc.) which we just log.
      type StripeErr = { statusCode?: number; code?: string };
      const e = err as StripeErr;
      const isNotFound =
        e?.statusCode === 404 || e?.code === "resource_missing";

      if (isNotFound) {
        if (org.plan_status !== "canceled") {
          await supabase
            .from("organizations")
            .update({
              plan_status: "canceled",
              // Also clear the id so we don't keep pinging Stripe for a
              // subscription that no longer exists.
              stripe_subscription_id: null,
            })
            .eq("id", org.id);
          drifts.push({
            orgId: org.id,
            previous: org.plan_status,
            updated: "canceled",
          });
          canceledOnStripe++;
        }
        continue;
      }

      const message = err instanceof Error ? err.message : "unknown error";
      errors.push({ orgId: org.id, message });
      errorsCount++;
      Sentry.captureException(err, {
        tags: { cron: "stripe-reconcile", step: "retrieve", orgId: org.id },
        level: "error",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    checked,
    drifted,
    canceledOnStripe,
    errorsCount,
    drifts: drifts.slice(0, 20),
    errors: errors.slice(0, 10),
  });
}
