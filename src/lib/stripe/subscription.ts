import { getStripe } from "@/lib/stripe/client";
import {
  getStripePriceId,
  type BillablePlanKey,
  type BillingPeriod,
} from "@/lib/billing/plans";
import type { PaywallTrigger } from "@/lib/paywall";

export async function createSubscriptionCheckout({
  orgId,
  userId,
  plan,
  email,
  successUrl,
  cancelUrl,
  billingPeriod = "monthly",
  paywallTrigger,
}: {
  orgId: string;
  userId: string;
  plan: BillablePlanKey;
  email: string;
  successUrl: string;
  cancelUrl: string;
  billingPeriod?: BillingPeriod;
  paywallTrigger?: PaywallTrigger | null;
}) {
  const stripe = getStripe();
  const priceId = getStripePriceId(plan, billingPeriod);
  if (!priceId) throw new Error(`Unknown plan: ${plan}`);

  const meta: Record<string, string> = {
    org_id: orgId,
    user_id: userId,
    plan,
    billing_period: billingPeriod,
  };
  if (paywallTrigger) meta.paywall_trigger = paywallTrigger;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: email,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: meta,
    subscription_data: { metadata: meta },
    allow_promotion_codes: true,
  });

  return session;
}

export async function createBillingPortalSession(
  stripeCustomerId: string,
  returnUrl: string
) {
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  });
  return session;
}
