import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import EstimatorSetupWizard from "./EstimatorSetupWizard";
import { loadEstimatorSetupFields } from "./actions";

export const metadata: Metadata = {
  title: "Set up your estimator | FenceEstimatePro",
  robots: { index: false, follow: false },
};

export default async function EstimatorSetupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Bootstrapping touches ensureProfile so an onboarding-incomplete user
  // who hits this URL gets sent through company setup first.
  await ensureProfile(supabase, user);

  const initial = await loadEstimatorSetupFields();

  return <EstimatorSetupWizard initial={initial} />;
}
