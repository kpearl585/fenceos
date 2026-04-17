import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import UpgradeClient from "./UpgradeClient";
import type { PaywallTrigger } from "@/lib/paywall";

// Narrow an arbitrary ?from=... string to the PaywallTrigger union so
// UpgradeClient can trust it.
const VALID_TRIGGERS: readonly PaywallTrigger[] = [
  "estimate_cap_warning",
  "estimate_cap_hit",
  "seat_cap",
  "feature_alternative_bids",
  "feature_qb_sync",
  "feature_pricing_rules",
  "feature_pipeline",
  "feature_branded_pdf",
  "feature_jobs",
  "subscription_expired",
  "subscription_lapsed",
] as const;

function parseTrigger(raw: string | undefined): PaywallTrigger | null {
  if (!raw) return null;
  return (VALID_TRIGGERS as readonly string[]).includes(raw) ? (raw as PaywallTrigger) : null;
}

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { from } = await searchParams;
  const trigger = parseTrigger(from);

  let profile;
  try {
    profile = await ensureProfile(supabase, user);
  } catch {
    // Profile provisioning failed — still show upgrade page
    return <UpgradeClient trigger={trigger} />;
  }

  // Only block non-owners who are on a real paid plan — trial users always see upgrade
  if (profile.role && profile.role !== "owner") redirect("/dashboard");

  return <UpgradeClient trigger={trigger} />;
}
