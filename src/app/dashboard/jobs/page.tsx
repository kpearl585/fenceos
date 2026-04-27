import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { redirect } from "next/navigation";
import { canAccess } from "@/lib/roles";
import Link from "next/link";
import JobKanban, { type KanbanJob } from "@/components/jobs/JobKanban";
import UpgradeGate from "@/components/dashboard/UpgradeGate";
import { planHasJobs } from "@/lib/planLimits";
import { createAdminClient } from "@/lib/supabase/server";

const STATUS_FILTERS = [
  { value: "", label: "All Jobs" },
  { value: "scheduled", label: "Scheduled" },
  { value: "active", label: "Active" },
  { value: "complete", label: "Complete" },
];

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q = "", status = "" } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);
  if (!canAccess(profile.role, "jobs")) redirect("/dashboard");
  const isOwner = profile.role === "owner";

  // Plan gate — jobs require Pro or above (admin client bypasses RLS so this can't fail open)
  const admin = createAdminClient();
  const { data: orgForPlan } = await admin.from("organizations").select("plan").eq("id", profile.org_id).single();
  if (!planHasJobs(orgForPlan?.plan)) {
    return <UpgradeGate feature="Jobs & Foreman Board" requiredPlan="Pro" description="Track every job from scheduled to complete, assign foremen, verify materials, and manage change orders. Available on Pro and Business." />;
  }

  let query = supabase
    .from("jobs")
    .select("id, status, total_price, gross_margin_pct, scheduled_date, assigned_foreman_id, created_at, customers(name), estimates(fence_type, linear_feet)")
    .eq("org_id", profile.org_id)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data: jobs } = await query;

  const foremanIds = (jobs ?? []).map((j: { assigned_foreman_id: string | null }) => j.assigned_foreman_id).filter(Boolean) as string[];
  let foremanMap: Record<string, string> = {};
  if (foremanIds.length > 0) {
    const { data: foremen } = await supabase.from("users").select("id, full_name, email").in("id", foremanIds);
    for (const f of foremen ?? []) foremanMap[f.id] = f.full_name || f.email || "Unknown";
  }

  let kanbanJobs: KanbanJob[] = (jobs ?? []).map((job: {
    id: string; status: string; total_price: number | null; gross_margin_pct: number | null;
    scheduled_date: string | null; assigned_foreman_id: string | null;
    customers: { name: string } | { name: string }[] | null; estimates: { fence_type: string; linear_feet: number } | { fence_type: string; linear_feet: number }[] | null;
  }) => {
    const customer = Array.isArray(job.customers) ? job.customers[0] : job.customers;
    const estimate = Array.isArray(job.estimates) ? job.estimates[0] : job.estimates;
    return {
    id: job.id, status: job.status, total_price: job.total_price,
    gross_margin_pct: isOwner ? job.gross_margin_pct : null,
    scheduled_date: job.scheduled_date,
    customerName: customer?.name ?? "No customer",
    fenceType: estimate?.fence_type?.replace(/_/g, " ") ?? "—",
    linearFeet: estimate?.linear_feet ?? 0,
    foremanName: job.assigned_foreman_id ? (foremanMap[job.assigned_foreman_id] ?? "Unassigned") : "Unassigned",
    isOwner,
  };});

  if (q) {
    const search = q.toLowerCase();
    kanbanJobs = kanbanJobs.filter(j =>
      j.customerName.toLowerCase().includes(search) ||
      j.fenceType.toLowerCase().includes(search) ||
      j.foremanName.toLowerCase().includes(search)
    );
  }

  const total = kanbanJobs.length;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Jobs</h1>
          <p className="text-sm text-muted mt-0.5">{total} job{total !== 1 ? "s" : ""}{status ? ` · ${status}` : ""}</p>
        </div>
        <Link href="/dashboard/estimates" className="text-sm bg-accent text-white px-4 py-2 rounded-lg font-semibold hover:bg-accent-light transition-colors">
          + New Estimate
        </Link>
      </div>

      {/* Search + Filter */}
      <form method="GET" className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input name="q" defaultValue={q} placeholder="Search by customer, type, or foreman..."
            className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent bg-surface text-text placeholder:text-muted" />
        </div>
        <div className="flex gap-1 bg-surface border border-border rounded-lg p-1">
          {STATUS_FILTERS.map(f => (
            <Link key={f.value} href={`/dashboard/jobs?${f.value ? `status=${f.value}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${status === f.value ? "bg-accent text-white" : "text-muted hover:bg-surface-3 hover:text-text"}`}>
              {f.label}
            </Link>
          ))}
        </div>
        {q && (
          <Link href={`/dashboard/jobs${status ? `?status=${status}` : ""}`}
            className="px-3 py-2.5 text-sm text-muted hover:text-text border border-border rounded-lg bg-surface">
            x Clear
          </Link>
        )}
      </form>

      {kanbanJobs.length === 0 ? (
        <div className="bg-surface rounded-xl shadow-sm border border-border p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-accent/15 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-accent-light" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
          </div>
          <h2 className="font-semibold text-text mb-1">{q || status ? "No jobs match your filter" : "No jobs yet"}</h2>
          <p className="text-sm text-muted mb-6">{q || status ? "Try clearing your search or filter." : "Collect a deposit on an accepted estimate, then convert it to create your first job."}</p>
          {(q || status) ? (
            <Link href="/dashboard/jobs" className="bg-accent text-white px-6 py-3 rounded-lg font-semibold hover:bg-accent-light transition-colors inline-block text-sm">Clear Filters</Link>
          ) : (
            <Link href="/dashboard/estimates" className="bg-accent text-white px-6 py-3 rounded-lg font-semibold hover:bg-accent-light transition-colors inline-block text-sm">View Estimates</Link>
          )}
        </div>
      ) : (
        <JobKanban jobs={kanbanJobs} />
      )}
    </>
  );
}
