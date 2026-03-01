import { getStripe } from "@/lib/stripe/client";

export const PLAN_PRICE_IDS: Record<string, string> = {
  starter:  "price_1T62WN3lkEgG4216JquIVsyd",
  pro:      "price_1T62WO3lkEgG4216pY0yU6NC",
  business: "price_1T62WO3lkEgG4216uWZMXyoE",
};

export const PLAN_PRICE_IDS_ANNUAL: Record<string, string> = {
  starter:  "price_1T63953lkEgG4216y7E64jvJ",
  pro:      "price_1T63963lkEgG4216TejGsrIt",
  business: "price_1T63963lkEgG4216QyZOkSjy",
};

export const PLAN_ANNUAL_SAVINGS: Record<string, number> = {
  starter:  98,
  pro:      178,
  business: 358,
};

export const PLAN_LIMITS = {
  starter:  { users: 1, estimates_per_month: 20 },
  pro:      { users: 5, estimates_per_month: null },
  business: { users: null, estimates_per_month: null },
};

export async function createSubscriptionCheckout({
  orgId,
  userId,
  plan,
  email,
  successUrl,
  cancelUrl,
  billingPeriod = "monthly",
}: {
  orgId: string;
  userId: string;
  plan: "starter" | "pro" | "business";
  email: string;
  successUrl: string;
  cancelUrl: string;
  billingPeriod?: "monthly" | "annual";
}) {
  const stripe = getStripe();
  const priceId = billingPeriod === "annual"
    ? PLAN_PRICE_IDS_ANNUAL[plan]
    : PLAN_PRICE_IDS[plan];
  if (!priceId) throw new Error(`Unknown plan: ${plan}`);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: email,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { org_id: orgId, user_id: userId, plan, billing_period: billingPeriod },
    subscription_data: { metadata: { org_id: orgId, user_id: userId, plan, billing_period: billingPeriod } },
    allow_promotion_codes: true,
  });

  return session;
}

export async function createBillingPortalSession(stripeCustomerId: string, returnUrl: string) {
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  });
  return session;
}
