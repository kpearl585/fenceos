import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import UpgradeClient from "./UpgradeClient";

export default async function UpgradePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Use ensureProfile so the profile is always available (creates it if missing)
  // — avoids silent redirect to /dashboard when a raw .single() query returns null
  const profile = await ensureProfile(supabase, user);

  if (profile.role !== "owner") redirect("/dashboard");

  return <UpgradeClient />;
}
