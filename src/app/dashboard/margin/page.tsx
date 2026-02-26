import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { redirect } from "next/navigation";
import { canAccess } from "@/lib/roles";

export default async function MarginPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);

  // Owner-only route — strict server-side enforcement
  if (!canAccess(profile.role, "margin")) {
    redirect("/dashboard");
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-fence-900 mb-1">Margin Dashboard</h1>
      <p className="text-sm text-gray-500 mb-6">
        Monitor gross margins across estimates and jobs. Owner access only.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Avg Estimate Margin</p>
          <p className="text-2xl font-bold text-fence-900 mt-1">—</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Avg Job Margin</p>
          <p className="text-2xl font-bold text-fence-900 mt-1">—</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Margin at Risk</p>
          <p className="text-2xl font-bold text-fence-900 mt-1">—</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="font-semibold text-fence-900 mb-2">Margin Protection</h2>
        <p className="text-sm text-gray-500">
          As estimates and jobs are created, this dashboard will surface margin trends,
          flag at-risk jobs, and help you protect profitability before quotes go out.
        </p>
      </div>
    </>
  );
}
