import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { redirect } from "next/navigation";
import { canAccess } from "@/lib/roles";

export default async function EstimatesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);

  // Server-side role gate
  if (!canAccess(profile.role, "estimates")) {
    redirect("/dashboard");
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-fence-900 mb-1">Estimates</h1>
      <p className="text-sm text-gray-500 mb-6">
        Create and manage fence estimates with built-in margin protection.
      </p>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-fence-100 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-fence-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="2" width="16" height="20" rx="2" />
            <line x1="8" y1="6" x2="16" y2="6" />
            <line x1="8" y1="10" x2="16" y2="10" />
            <line x1="8" y1="14" x2="12" y2="14" />
          </svg>
        </div>
        <h2 className="font-semibold text-fence-900 mb-1">No estimates yet</h2>
        <p className="text-sm text-gray-400">
          Estimate creation is coming in Phase 5. This page will list all estimates for your organization.
        </p>
      </div>
    </>
  );
}
