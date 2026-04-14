import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { redirect } from "next/navigation";
import { canAccess } from "@/lib/roles";
import { getEstimatorConfig } from "./actions";
import EstimatorSettingsClient from "./EstimatorSettingsClient";
import Link from "next/link";

export const metadata = { title: "Estimator Settings — FenceEstimatePro" };

export default async function EstimatorSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);
  if (!canAccess(profile.role, "owner")) redirect("/dashboard/settings");

  const { config, hasCustomConfig } = await getEstimatorConfig();

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard/settings" className="text-sm text-gray-400 hover:text-fence-600">Settings</Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-fence-600 font-semibold">Estimator</span>
          </div>
          <h1 className="text-2xl font-bold text-fence-950">Estimator Settings</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Customize labor rates, material assumptions, overhead, and pricing to match your crew and market.
            Changes apply to all new estimates.
          </p>
        </div>
        <EstimatorSettingsClient config={config} hasCustomConfig={hasCustomConfig} />
      </div>
    </main>
  );
}
