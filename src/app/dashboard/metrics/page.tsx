import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { redirect } from "next/navigation";

function currency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);
}
function pct(n: number) { return `${n.toFixed(1)}%`; }
function delta(n: number) {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

export default async function MetricsDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const profile = await ensureProfile(supabase, user);
  if (profile.role !== "owner") redirect("/dashboard");

  const admin = createAdminClient();
  const orgId = profile.org_id;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
  const sevenDaysAgo  = new Date(now.getTime() - 7  * 86400000).toISOString();

  const [
    { data: allEstimates },
    { data: allJobs },
    { data: customers },
    { data: teamMembers },
    { data: org },
  ] = await Promise.all([
    admin.from("estimates").select("id,status,total,created_at,accepted_at").eq("org_id", orgId),
    admin.from("jobs").select("id,status,created_at").eq("org_id", orgId),
    admin.from("customers").select("id,created_at").eq("org_id", orgId),
    admin.from("users").select("id,role,created_at").eq("org_id", orgId),
    admin.from("organizations").select("plan,plan_status,trial_ends_at").eq("id", orgId).single(),
  ]);

  const estimates = allEstimates ?? [];
  const jobs      = allJobs ?? [];

  // ── Revenue metrics ───────────────────────────────────────────────────────
  const acceptedAll   = estimates.filter(e => e.status === "accepted" || e.status === "deposit_paid");
  const acceptedMonth = acceptedAll.filter(e => e.accepted_at && e.accepted_at >= startOfMonth);
  const acceptedLast  = acceptedAll.filter(e => e.accepted_at && e.accepted_at >= startOfLastMonth && e.accepted_at <= endOfLastMonth);

  const revenueThisMonth = acceptedMonth.reduce((s, e) => s + Number(e.total), 0);
  const revenueLastMonth = acceptedLast.reduce((s, e) => s + Number(e.total), 0);
  const revenueGrowth    = revenueLastMonth > 0 ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100 : 0;
  const revenueTotal     = acceptedAll.reduce((s, e) => s + Number(e.total), 0);

  // ── Estimate metrics ──────────────────────────────────────────────────────
  const quoted    = estimates.filter(e => e.status === "quoted");
  const pipeline  = quoted.reduce((s, e) => s + Number(e.total), 0);
  const sent      = estimates.filter(e => ["quoted","accepted","deposit_paid","rejected"].includes(e.status));
  const closeRate = sent.length > 0 ? (acceptedAll.length / sent.length) * 100 : 0;
  const avgDeal   = acceptedAll.length > 0 ? revenueTotal / acceptedAll.length : 0;

  // ── Activity ──────────────────────────────────────────────────────────────
  const estimatesThisMonth = estimates.filter(e => e.created_at >= startOfMonth).length;
  const estimatesLast30    = estimates.filter(e => e.created_at >= thirtyDaysAgo).length;
  const estimatesLast7     = estimates.filter(e => e.created_at >= sevenDaysAgo).length;
  const jobsActive         = jobs.filter(j => j.status === "active").length;
  const jobsScheduled      = jobs.filter(j => j.status === "scheduled").length;
  const jobsComplete       = jobs.filter(j => j.status === "complete").length;
  const newCustomers30     = (customers ?? []).filter(c => c.created_at >= thirtyDaysAgo).length;

  const plan = org?.plan ?? "trial";
  const daysLeft = org?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(org.trial_ends_at).getTime() - now.getTime()) / 86400000))
    : null;

  // ── Health scores ─────────────────────────────────────────────────────────
  const activityScore = Math.min(100, Math.round((estimatesLast7 / 5) * 100));
  const pipelineHealth = pipeline > 0 ? "Active" : "Empty";

  const kpis = [
    { label: "Revenue This Month", value: currency(revenueThisMonth), sub: delta(revenueGrowth) + " vs last month", color: revenueGrowth >= 0 ? "text-green-600" : "text-red-500", icon: "💰" },
    { label: "Total Revenue", value: currency(revenueTotal), sub: `${acceptedAll.length} jobs closed`, color: "text-fence-700", icon: "📈" },
    { label: "Pipeline Value", value: currency(pipeline), sub: `${quoted.length} open quotes`, color: "text-blue-600", icon: "🔵" },
    { label: "Close Rate", value: pct(closeRate), sub: `${acceptedAll.length} of ${sent.length} sent`, color: closeRate >= 30 ? "text-green-600" : "text-amber-600", icon: "🎯" },
    { label: "Avg Deal Size", value: currency(avgDeal), sub: "per accepted estimate", color: "text-fence-700", icon: "📊" },
    { label: "Active Jobs", value: String(jobsActive), sub: `${jobsScheduled} scheduled · ${jobsComplete} complete`, color: "text-purple-600", icon: "🔧" },
    { label: "Estimates (30d)", value: String(estimatesLast30), sub: `${estimatesLast7} this week`, color: "text-fence-700", icon: "📝" },
    { label: "New Customers (30d)", value: String(newCustomers30), sub: `${customers?.length ?? 0} total`, color: "text-fence-700", icon: "👥" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fence-950">KPI Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Revenue intelligence · Owner view only</p>
        </div>
        <div className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
          plan === "trial" ? "bg-amber-100 text-amber-700" :
          plan === "pro" ? "bg-fence-100 text-fence-700" :
          plan === "business" ? "bg-purple-100 text-purple-700" :
          "bg-gray-100 text-gray-600"
        }`}>
          {plan === "trial" ? `Trial · ${daysLeft}d left` : plan}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className="text-xl mb-1">{k.icon}</div>
            <div className={`text-2xl font-black ${k.color} mb-0.5`}>{k.value}</div>
            <div className="text-xs text-gray-500">{k.label}</div>
            <div className="text-xs text-gray-400 mt-1">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Health Indicators */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <h2 className="font-bold text-fence-950 mb-4">Business Health</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Activity Score</span>
              <span className="text-sm font-bold text-fence-700">{activityScore}/100</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${activityScore >= 60 ? "bg-green-500" : activityScore >= 30 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${activityScore}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">Based on estimates created this week</p>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Close Rate</span>
              <span className="text-sm font-bold text-fence-700">{pct(closeRate)}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${closeRate >= 30 ? "bg-green-500" : closeRate >= 15 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${Math.min(100, closeRate * 2)}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">Target: 30%+ · Industry avg: 20%</p>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Pipeline Health</span>
              <span className={`text-sm font-bold ${pipelineHealth === "Active" ? "text-green-600" : "text-amber-600"}`}>{pipelineHealth}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${pipeline > 0 ? "bg-green-500" : "bg-gray-300"}`} style={{ width: pipeline > 0 ? "75%" : "5%" }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">{currency(pipeline)} in open quotes</p>
          </div>
        </div>
      </div>

      {/* Team */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <h2 className="font-bold text-fence-950 mb-3">Team</h2>
        <div className="flex gap-6">
          {["owner","sales","foreman"].map(role => {
            const count = (teamMembers ?? []).filter(m => m.role === role).length;
            return (
              <div key={role}>
                <div className="text-2xl font-black text-fence-950">{count}</div>
                <div className="text-xs text-gray-500 capitalize">{role}{count !== 1 ? "s" : ""}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
