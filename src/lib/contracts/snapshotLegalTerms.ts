import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

/**
 * When estimate transitions to 'quoted':
 * 1. Pull org_settings (legal_terms, payment_terms, legal_version)
 * 2. Snapshot them onto the estimate
 * 3. Generate a secure accept_token
 * After this, legal terms are immutable for that estimate.
 */
export async function snapshotLegalTerms(
  estimateId: string,
  orgId: string
): Promise<{ acceptToken: string }> {
  const supabase = await createClient();

  // Load org settings
  const { data: settings } = await supabase
    .from("org_settings")
    .select("legal_terms, payment_terms, legal_version")
    .eq("org_id", orgId)
    .single();

  const legalTerms = settings?.legal_terms || "";
  const paymentTerms = settings?.payment_terms || "";
  const legalVersion = settings?.legal_version || 1;

  // Generate secure token
  const acceptToken = crypto.randomUUID();

  // Snapshot onto estimate
  const { error } = await supabase
    .from("estimates")
    .update({
      legal_terms_snapshot: legalTerms,
      payment_terms_snapshot: paymentTerms,
      legal_version: legalVersion,
      snapshot_taken_at: new Date().toISOString(),
      accept_token: acceptToken,
    })
    .eq("id", estimateId);

  if (error) {
    throw new Error(`Failed to snapshot legal terms: ${error.message}`);
  }

  return { acceptToken };
}

/**
 * Generate SHA-256 hash of the acceptance payload.
 * This creates an immutable record of what was accepted.
 */
export function generateAcceptanceHash(payload: {
  estimateId: string;
  total: number;
  lineItemsSummary: string;
  legalTermsSnapshot: string;
  timestamp: string;
}): string {
  const data = [
    payload.estimateId,
    payload.total.toFixed(2),
    payload.lineItemsSummary,
    payload.legalTermsSnapshot,
    payload.timestamp,
  ].join("|");

  return crypto.createHash("sha256").update(data).digest("hex");
}
