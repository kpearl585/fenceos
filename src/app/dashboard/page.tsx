import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { redirect } from "next/navigation";
import { canAccess } from "@/lib/roles";
import Link from "next/link";
import ReferralWidget from "@/components/dashboard/ReferralWidget";
import OnboardingChecklist from "@/components/dashboard/OnboardingChecklist";

function fmt(v: number | null) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(v) || 0);
}

function fmtPct(v: number | null) {
  return `${(Number(v || 0) * 100).toFixed(1)}%`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const STATUS_COLORS: Record<string, string> = {
  draft:     "bg-gray-100 text-gray-600",
  quoted:    "bg-blue-100 text-blue-700",
  approved:  "bg-green-100 text-green-700",
  rejected:  "bg-red-100 text-red-600",
  scheduled: "bg-purple-100 text-purple-700",
  active:    "bg-blue-100 text-blue-700",
  complete:  "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default async function DashboardHome({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { welcome } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);
  const isOwner = profile.role === "owner";
  const canEstimate = canAccess(profile.role, "estimates");

  //  Parallel data fetches 
  const [
    { data: estimates },
    { data: jobs },
    { data: customers },
    { data: orgSettings },
  ] = await Promise.all([
    canEstimate
      ? supabase.from("estimates")
          .select("id, title, status, total, gross_margin_pct, created_at, customers(name)")
          .eq("org_id", profile.org_id)
          .order("created_at", { ascending: false })
          .limit(50)
      : { data: [] },
    supabase.from("jobs")
      .select("id, status, total_price, gross_margin_pct, scheduled_date, created_at, customers(name), estimates(fence_type, linear_feet)")
      .eq("org_id", profile.org_id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("customers")
      .select("id", { count: "exact", head: true })
      .eq("org_id", profile.org_id),
    supabase.from("org_settings")
      .select("target_margin_pct")
      .eq("org_id", profile.org_id)
      .single(),
  ]);

  const allEstimates = estimates ?? [];
  const allJobs = jobs ?? [];

  // Resolved org margin target (drives the "below target" alert + card colors
  // below). Falls back to 0.35 if the row is missing (e.g., fresh org whose
  // onboarding row hasn't been upserted yet). 0.35 matches the onboarding
  // form default and the NOT NULL DEFAULT on the column.
  const targetMargin = Number(orgSettings?.target_margin_pct) || 0.35;
  // Yellow band = within 5 percentage points below target. Anything below
  // that is red. Keeps the three-tone scale but anchors it to the user's
  // own target instead of a hardcoded 35/28/below split.
  const warnMargin = Math.max(0, targetMargin - 0.05);

  //  KPIs
  const quotedEstimates = allEstimates.filter(e => e.status === "quoted");
  const draftEstimates = allEstimates.filter(e => e.status === "draft");
  const pipelineValue = quotedEstimates.reduce((s, e) => s + (Number(e.total) || 0), 0);
  const activeJobs = allJobs.filter(j => j.status === "active");
  const scheduledJobs = allJobs.filter(j => j.status === "scheduled");
  const completedJobs = allJobs.filter(j => j.status === "complete");
  const totalRevenue = completedJobs.reduce((s, j) => s + (Number(j.total_price) || 0), 0)
    + activeJobs.reduce((s, j) => s + (Number(j.total_price) || 0), 0);
  const margins = allJobs.filter(j => j.gross_margin_pct && j.status !== "cancelled").map(j => Number(j.gross_margin_pct));
  const avgMargin = margins.length ? margins.reduce((a, b) => a + b, 0) / margins.length : 0;
  const belowTargetJobs = allJobs.filter(j => j.gross_margin_pct && Number(j.gross_margin_pct) < warnMargin && j.status !== "cancelled" && j.status !== "complete");

  // Pipeline counts
  const pipeline = {
    draft:     allEstimates.filter(e => e.status === "draft").length,
    quoted:    allEstimates.filter(e => e.status === "quoted").length,
    approved:  allEstimates.filter(e => e.status === "approved").length,
    scheduled: scheduledJobs.length,
    active:    activeJobs.length,
    complete:  completedJobs.length,
  };

  // Recent estimates (last 5)
  const recentEstimates = allEstimates.slice(0, 5);
  // Active + scheduled jobs (show first 5)
  const liveJobs = [...activeJobs, ...scheduledJobs].slice(0, 5);

  const firstName = profile.full_name ? profile.full_name.split(" ")[0] : "there";

  return (
    <div className="space-y-6">
      {/*  Page Header  */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fence-900">{greeting()}, {firstName}</h1>
          {welcome === "1" && (
            <div className="mb-6 flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 rounded-xl px-5 py-3.5 text-sm font-medium">
              <span>Welcome to FenceEstimatePro! Your account is set up. Start by adding a customer or creating your first estimate.</span>
            </div>
          )}
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <div className="flex gap-2">
          {canEstimate && (
            <Link href="/dashboard/customers/new" className="hidden sm:inline-flex items-center gap-1.5 border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium px-3 py-2 rounded-lg transition-colors">
              + Customer
            </Link>
          )}
          {canEstimate && (
            <Link href="/dashboard/advanced-estimate" className="inline-flex items-center gap-1.5 bg-fence-600 hover:bg-fence-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm">
              + New Estimate
            </Link>
          )}
        </div>
      </div>

      {/*  KPI Cards  */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isOwner && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Revenue (Active+Done)</p>
            <p className="text-2xl font-bold text-fence-900 mt-2">{fmt(totalRevenue)}</p>
            <p className="text-xs text-gray-400 mt-1">{completedJobs.length} jobs completed</p>
          </div>
        )}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Jobs</p>
          <p className="text-2xl font-bold text-fence-900 mt-2">{activeJobs.length}</p>
          <p className="text-xs text-gray-400 mt-1">{scheduledJobs.length} scheduled</p>
        </div>
        {canEstimate && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pipeline Value</p>
            <p className="text-2xl font-bold text-fence-900 mt-2">{fmt(pipelineValue)}</p>
            <p className="text-xs text-gray-400 mt-1">{quotedEstimates.length} quote{quotedEstimates.length !== 1 ? "s" : ""} out · {draftEstimates.length} draft{draftEstimates.length !== 1 ? "s" : ""}</p>
          </div>
        )}
        {isOwner && (
          <div className={`rounded-xl border-2 p-5 shadow-sm ${avgMargin >= targetMargin ? "bg-green-50 border-green-200" : avgMargin >= warnMargin ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200"}`}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg Margin</p>
            <p className={`text-2xl font-bold mt-2 ${avgMargin >= targetMargin ? "text-green-700" : avgMargin >= warnMargin ? "text-yellow-700" : "text-red-700"}`}>
              {margins.length ? fmtPct(avgMargin) : "—"}
            </p>
            <p className="text-xs text-gray-500 mt-1">Target: {fmtPct(targetMargin)}</p>
          </div>
        )}
      </div>


      {/*  Referral Widget — promoted above the fold for growth  */}
      {isOwner && <ReferralWidget />}

      {/*  Onboarding Checklist  */}
      {isOwner && (
        <OnboardingChecklist
          userId={profile.id}
          orgId={profile.org_id}
          userCreatedAt={user.created_at ?? new Date().toISOString()}
        />
      )}

      {/*  Margin Alert  */}
      {isOwner && belowTargetJobs.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">
              {belowTargetJobs.length} job{belowTargetJobs.length !== 1 ? "s" : ""} below {fmtPct(warnMargin)} margin
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              {belowTargetJobs.slice(0, 3).map((j: { customers: { name: string }[] | null }) => (j.customers as { name: string }[] | null)?.[0]?.name || "Unnamed").join(", ")}
              {belowTargetJobs.length > 3 ? ` + ${belowTargetJobs.length - 3} more` : ""}
            </p>
          </div>
          <Link href="/dashboard/owner" className="text-xs font-semibold text-red-700 hover:text-red-900 whitespace-nowrap">
            View P&L →
          </Link>
        </div>
      )}

      {/*  Pipeline Bar  */}
      {canEstimate && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Pipeline</h2>
          <div className="flex items-center gap-1 flex-wrap">
            {[
              { label: "Draft", count: pipeline.draft, color: "bg-gray-200 text-gray-700" },
              { label: "Quoted", count: pipeline.quoted, color: "bg-blue-100 text-blue-700" },
              { label: "Approved", count: pipeline.approved, color: "bg-green-100 text-green-700" },
              { label: "Scheduled", count: pipeline.scheduled, color: "bg-purple-100 text-purple-700" },
              { label: "Active", count: pipeline.active, color: "bg-blue-500 text-white" },
              { label: "Complete", count: pipeline.complete, color: "bg-green-500 text-white" },
            ].map((stage, i) => (
              <div key={stage.label} className="flex items-center gap-1">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${stage.color}`}>
                  <span>{stage.label}</span>
                  <span className="font-bold">{stage.count}</span>
                </div>
                {i < 5 && <span className="text-gray-300 text-xs">→</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/*  Two-Column: Recent Estimates + Live Jobs  */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Recent Estimates */}
        {canEstimate && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-sm">Recent Estimates</h2>
              <Link href="/dashboard/estimates" className="text-xs text-fence-600 hover:text-fence-800 font-medium">View all →</Link>
            </div>
            {recentEstimates.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-gray-400">No estimates yet</p>
                <Link href="/dashboard/advanced-estimate" className="mt-3 inline-block text-xs text-fence-600 font-semibold hover:underline">Create your first estimate →</Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentEstimates.map((e: { id: string; title: string; status: string; total: number | null; gross_margin_pct: number | null; customers: { name: string }[] | null }) => (
                  <Link key={e.id} href={`/dashboard/estimates/${e.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors group">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-fence-900 truncate group-hover:text-fence-600">{(e.customers as { name: string }[] | null)?.[0]?.name || "No customer"}</p>
                      <p className="text-xs text-gray-400 truncate">{e.title}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                      {isOwner && e.total && <span className="text-sm font-semibold text-gray-700">{fmt(e.total)}</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[e.status] || "bg-gray-100 text-gray-600"}`}>
                        {e.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Live Jobs */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">Active & Scheduled Jobs</h2>
            <Link href="/dashboard/jobs" className="text-xs text-fence-600 hover:text-fence-800 font-medium">View all →</Link>
          </div>
          {liveJobs.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-gray-400">No active or scheduled jobs</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {liveJobs.map((j: { id: string; status: string; total_price: number | null; gross_margin_pct: number | null; customers: { name: string }[] | null; estimates: { fence_type: string; linear_feet: number }[] | null }) => (
                <Link key={j.id} href={`/dashboard/jobs/${j.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors group">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-fence-900 truncate group-hover:text-fence-600">
                      {(j.customers as { name: string }[] | null)?.[0]?.name || "No customer"}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {(j.estimates as { fence_type: string; linear_feet: number }[] | null)?.[0]?.fence_type?.replace(/_/g, " ") || "—"} · {(j.estimates as { fence_type: string; linear_feet: number }[] | null)?.[0]?.linear_feet || 0} LF
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                    {isOwner && j.gross_margin_pct && (
                      <span className={`text-xs font-bold ${Number(j.gross_margin_pct) >= targetMargin ? "text-green-600" : Number(j.gross_margin_pct) >= warnMargin ? "text-yellow-600" : "text-red-500"}`}>
                        {fmtPct(j.gross_margin_pct)}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[j.status] || "bg-gray-100 text-gray-600"}`}>
                      {j.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>


      {/*  Quick Actions  */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {canEstimate && (
            <Link href="/dashboard/advanced-estimate" className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-fence-200 hover:border-fence-400 hover:bg-fence-50 transition-all group text-center">
              <span className="text-2xl"></span>
              <span className="text-xs font-semibold text-fence-700 group-hover:text-fence-900">New Estimate</span>
            </Link>
          )}
          {canEstimate && (
            <Link href="/dashboard/customers/new" className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-all group text-center">
              <span className="text-2xl"></span>
              <span className="text-xs font-semibold text-gray-600 group-hover:text-gray-900">New Customer</span>
            </Link>
          )}
          <Link href="/dashboard/jobs" className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-all group text-center">
            <span className="text-2xl"></span>
            <span className="text-xs font-semibold text-gray-600 group-hover:text-gray-900">View Jobs</span>
          </Link>
          {canAccess(profile.role, "materials") && (
            <Link href="/dashboard/materials" className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-all group text-center">
              <span className="text-2xl"></span>
              <span className="text-xs font-semibold text-gray-600 group-hover:text-gray-900">Materials</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
