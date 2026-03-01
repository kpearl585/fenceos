import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import UpgradeClient from "./UpgradeClient";

export default async function UpgradePage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users").select("org_id, role").eq("id", user.id).single();

  if (profile?.role !== "owner") redirect("/dashboard");

  return <UpgradeClient />;
}
