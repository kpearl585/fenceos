"use server";

import { redirect } from "next/navigation";
import { createDepositCheckoutSession } from "./createDepositCheckoutSession";

/**
 * Server action: initiates Stripe Checkout for estimate deposit.
 * Called from the estimate detail page "Pay Deposit" button.
 */
export async function payDeposit(fd: FormData) {
  const estimateId = fd.get("estimateId") as string;
  if (!estimateId) throw new Error("Missing estimateId");

  const { url } = await createDepositCheckoutSession(estimateId);
  redirect(url);
}
