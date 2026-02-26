import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { redirect } from "next/navigation";
import { canAccess } from "@/lib/roles";

export default async function DashboardHome() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);

  const summaryCards = [
    { label: "Active Estimates", value: "—", segment: "estimates" },
    { label: "Open Jobs", value: "—", segment: "jobs" },
    { label: "Material Items", value: "—", segment: "materials" },
    { label: "Avg Margin", value: "—", segment: "margin" },
  ].filter((card) => canAccess(profile.role, card.segment));

  return (
    <>
      <h1 className="text-2xl font-bold text-fence-900 mb-1">Dashboard</h1>
      <p className="text-sm text-gray-500 mb-6">
        Welcome back, {profile.full_name || profile.email.split("@")[0]}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-5"
          >
            <p className="text-xs text-gray-400 uppercase tracking-wider">{card.label}</p>
            <p className="text-2xl font-bold text-fence-900 mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="font-semibold text-fence-900 mb-2">Getting Started</h2>
        <p className="text-sm text-gray-500">
          Your FenceOS workspace is ready. As you create estimates and jobs,
          this dashboard will show real-time summaries of your pipeline and margins.
        </p>
      </div>
    </>
  );
}
