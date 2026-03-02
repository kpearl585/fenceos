import Stripe from "stripe";

/**
 * Singleton Stripe server-side client.
 * Uses STRIPE_SECRET_KEY from environment.
 */

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error(
        "STRIPE_SECRET_KEY is not set. Add it to .env.local."
      );
    }
    stripeInstance = new Stripe(key, {
      apiVersion: "2024-06-20",
      typescript: true,
    });
  }
  return stripeInstance;
}
