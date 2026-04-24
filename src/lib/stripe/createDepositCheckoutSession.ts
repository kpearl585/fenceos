import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { canAccess } from "@/lib/roles";
import { getStripe } from "./client";

/**
 * Creates a Stripe Checkout session for the 50% deposit on an accepted estimate.
 *
 * Validations:
 *  - User authenticated + has estimates access
 *  - Estimate belongs to user's org
 *  - Status = 'accepted'
 *  - deposit_paid = false
 *
 * Returns the Checkout session URL for redirect.
 */
export async function createDepositCheckoutSession(
  estimateId: string
): Promise<{ url: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const profile = await ensureProfile(supabase, user);
  if (!canAccess(profile.role, "estimates")) {
    throw new Error("You do not have access to estimates");
  }

  // Load estimate
  const { data: est, error: estErr } = await supabase
    .from("estimates")
    .select("id, org_id, status, total, deposit_required_amount, deposit_paid, title, customers(name)")
    .eq("id", estimateId)
    .eq("org_id", profile.org_id)
    .single();

  if (estErr || !est) {
    throw new Error("Estimate not found or access denied");
  }

  if (est.status !== "accepted") {
    throw new Error(
      `Estimate status is "${est.status}". Deposit can only be collected on accepted estimates.`
    );
  }

  if (est.deposit_paid) {
    throw new Error("Deposit has already been paid for this estimate.");
  }

  const depositAmount = Number(est.deposit_required_amount) || Math.round(Number(est.total) * 50) / 100;

  if (depositAmount <= 0) {
    throw new Error("Invalid deposit amount.");
  }

  // Amount in cents for Stripe
  const amountCents = Math.round(depositAmount * 100);

  const customerName = (
    est.customers as unknown as { name: string }[] | null
  )?.[0]?.name || "Customer";

  const stripe = getStripe();

  const origin = process.env.NEXT_PUBLIC_APP_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: amountCents,
          product_data: {
            name: `Deposit — ${est.title || "Fence Estimate"}`,
            description: `50% deposit for ${customerName}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      estimate_id: estimateId,
      org_id: profile.org_id,
    },
    success_url: `${origin}/deposit/success?estimateId=${estimateId}`,
    cancel_url: `${origin}/deposit/cancel?estimateId=${estimateId}`,
  });

  // Store checkout session ID + pending status
  await supabase
    .from("estimates")
    .update({
      stripe_checkout_session_id: session.id,
      stripe_payment_status: "pending",
      updated_at: new Date().toISOString(),
    })
    .eq("id", estimateId);

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL.");
  }

  return { url: session.url };
}
