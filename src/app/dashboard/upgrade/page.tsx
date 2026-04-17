import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import UpgradeClient from "./UpgradeClient";
import { parsePaywallTrigger } from "@/lib/paywall";
import { checkSubscription } from "@/lib/subscription";

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { from } = await searchParams;
  const trigger = parsePaywallTrigger(from);

  let profile;
  try {
    profile = await ensureProfile(supabase, user);
  } catch {
    // Profile provisioning failed — still show upgrade page
    return <UpgradeClient trigger={trigger} currentPlan={null} />;
  }

  // Only block non-owners who are on a real paid plan — trial users always see upgrade
  if (profile.role && profile.role !== "owner") redirect("/dashboard");

  // Plan-aware messaging: pass the resolved effective plan so UpgradeClient
  // can soften the banner ("already have access" / "unlock with Pro") instead
  // of always shouting "Upgrade required."
  const sub = await checkSubscription(profile.org_id);

  return (
    <UpgradeClient trigger={trigger} currentPlan={sub.effectivePlan} />
  );
}
