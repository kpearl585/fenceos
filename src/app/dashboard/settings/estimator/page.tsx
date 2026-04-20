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
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-fence-950">Estimator Settings</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                Start with the Essentials &mdash; that&rsquo;s what most contractors need. The engine is pre-tuned to industry defaults; open <span className="font-medium">Show advanced settings</span> only if you need to fine-tune crew hours, material math, or gate multipliers.
              </p>
            </div>
            <Link
              href="/onboarding/estimator-setup"
              className="shrink-0 inline-flex items-center gap-1.5 bg-fence-50 border border-fence-200 text-fence-700 hover:bg-fence-100 hover:border-fence-300 rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Run setup wizard
            </Link>
          </div>
        </div>
        <EstimatorSettingsClient config={config} hasCustomConfig={hasCustomConfig} />
      </div>
    </main>
  );
}
