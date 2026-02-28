import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { redirect } from "next/navigation";
import { canAccess } from "@/lib/roles";
import Link from "next/link";
import JobKanban, { type KanbanJob } from "@/components/jobs/JobKanban";

export default async function JobsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);
  if (!canAccess(profile.role, "jobs")) redirect("/dashboard");

  const isOwner = profile.role === "owner";

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, status, total_price, gross_margin_pct, scheduled_date, assigned_foreman_id, created_at, customers(name), estimates(fence_type, linear_feet)")
    .eq("org_id", profile.org_id)
    .order("created_at", { ascending: false });

  // Foreman names
  const foremanIds = (jobs ?? [])
    .map((j: { assigned_foreman_id: string | null }) => j.assigned_foreman_id)
    .filter(Boolean) as string[];

  let foremanMap: Record<string, string> = {};
  if (foremanIds.length > 0) {
    const { data: foremen } = await supabase
      .from("users")
      .select("id, full_name, email")
      .in("id", foremanIds);
    for (const f of foremen ?? []) {
      foremanMap[f.id] = f.full_name || f.email || "Unknown";
    }
  }

  const kanbanJobs: KanbanJob[] = (jobs ?? []).map((job: {
    id: string;
    status: string;
    total_price: number | null;
    gross_margin_pct: number | null;
    scheduled_date: string | null;
    assigned_foreman_id: string | null;
    customers: { name: string }[] | null;
    estimates: { fence_type: string; linear_feet: number }[] | null;
  }) => ({
    id: job.id,
    status: job.status,
    total_price: job.total_price,
    gross_margin_pct: isOwner ? job.gross_margin_pct : null,
    scheduled_date: job.scheduled_date,
    customerName: job.customers?.[0]?.name ?? "No customer",
    fenceType: job.estimates?.[0]?.fence_type?.replace(/_/g, " ") ?? "—",
    linearFeet: job.estimates?.[0]?.linear_feet ?? 0,
    foremanName: job.assigned_foreman_id ? (foremanMap[job.assigned_foreman_id] ?? "Unassigned") : "Unassigned",
    isOwner,
  }));

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-fence-900">Jobs</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Drag cards to advance job status. Click a card to open details.
          </p>
        </div>
        <Link
          href="/dashboard/estimates"
          className="text-sm bg-fence-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-fence-700 transition-colors"
        >
          + New Estimate
        </Link>
      </div>

      {kanbanJobs.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-fence-100 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-fence-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
          </div>
          <h2 className="font-semibold text-fence-900 mb-1">No jobs yet</h2>
          <p className="text-sm text-gray-400 mb-6">Convert an accepted estimate to create your first job.</p>
          <Link href="/dashboard/estimates" className="bg-fence-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-fence-700 transition-colors inline-block">
            View Estimates
          </Link>
        </div>
      ) : (
        <JobKanban jobs={kanbanJobs} />
      )}
    </>
  );
}
