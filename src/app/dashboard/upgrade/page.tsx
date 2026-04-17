import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import UpgradeClient from "./UpgradeClient";
import { parsePaywallTrigger } from "@/lib/paywall";

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
    return <UpgradeClient trigger={trigger} />;
  }

  // Only block non-owners who are on a real paid plan — trial users always see upgrade
  if (profile.role && profile.role !== "owner") redirect("/dashboard");

  return <UpgradeClient trigger={trigger} />;
}
