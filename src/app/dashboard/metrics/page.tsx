import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { redirect } from "next/navigation";
import UpgradeGate from "@/components/dashboard/UpgradeGate";
import { getPlanLimits } from "@/lib/planLimits";

function currency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);
}
function pct(n: number, decimals = 1) { return `${n.toFixed(decimals)}%`; }
function deltaLabel(n: number) {
  const sign = n >= 0 ? "" : "";
  const color = n >= 0 ? "text-green-600" : "text-red-500";
  return { sign, color, text: `${sign} ${Math.abs(n).toFixed(1)}%` };
}

interface StatCardProps {
  label: string; value: string; sub?: string;
  deltaText?: string; deltaColor?: string; icon: string; accent?: string;
}
function StatCard({ label, value, sub, deltaText, deltaColor, icon, accent = "text-fence-950" }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <div className="text-lg mb-2">{icon}</div>
      <div className={`text-2xl font-black mb-0.5 ${accent}`}>{value}</div>
      <div className="text-xs text-gray-500 font-medium">{label}</div>
      {deltaText && <div className={`text-xs font-semibold mt-1 ${deltaColor}`}>{deltaText}</div>}
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function HealthBar({ label, value, max, target, format = "pct" }: {
  label: string; value: number; max: number; target: number; format?: string;
}) {
  const pctFilled = Math.min(100, (value / max) * 100);
  const color = value >= target ? "bg-green-500" : value >= target * 0.6 ? "bg-amber-400" : "bg-red-400";
  const display = format === "currency" ? currency(value) : format === "raw" ? String(Math.round(value)) : pct(value);
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-sm font-bold text-fence-950">{display}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pctFilled}%` }} />
      </div>
    </div>
  );
}

export default async function MetricsDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const profile = await ensureProfile(supabase, user);
  if (profile.role !== "owner") redirect("/dashboard");

  // Plan gate — advanced reporting requires Business (admin client — cannot fail open)
  const adminForPlan = createAdminClient();
  const { data: orgForPlan } = await adminForPlan.from("organizations").select("plan").eq("id", profile.org_id).single();
  if (!getPlanLimits(orgForPlan?.plan).advancedReporting) {
    return <UpgradeGate feature="Advanced Reporting" requiredPlan="Business" description="Full KPI dashboard with margin analysis, revenue trends, close rate tracking, and business health scoring. Available on Business." />;
  }

  const admin = createAdminClient();
  const orgId = profile.org_id;
  const now = new Date();

  //  Time windows 
  const startThisWeek  = new Date(now.getTime() - 7  * 86400000).toISOString();
  const startLastWeek  = new Date(now.getTime() - 14 * 86400000).toISOString();
  const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const endLastMonth   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
  const start90        = new Date(now.getTime() - 90 * 86400000).toISOString();

  const [
    { data: allEstimates },
    { data: allJobs },
    { data: allCustomers },
    { data: teamMembers },
    { data: org },
  ] = await Promise.all([
    admin.from("estimates").select("id,status,total,created_at,accepted_at,last_sent_at").eq("org_id", orgId),
    admin.from("jobs").select("id,status,created_at").eq("org_id", orgId),
    admin.from("customers").select("id,created_at").eq("org_id", orgId),
    admin.from("users").select("id,role").eq("org_id", orgId),
    admin.from("organizations").select("plan,plan_status,trial_ends_at,created_at").eq("id", orgId).single(),
  ]);

  const estimates  = allEstimates  ?? [];
  const customers  = allCustomers  ?? [];

  //  Revenue 
  const closed     = estimates.filter(e => ["accepted","deposit_paid"].includes(e.status));
  const closedWeek = closed.filter(e => e.accepted_at && e.accepted_at >= startThisWeek);
  const closedLstW = closed.filter(e => e.accepted_at && e.accepted_at >= startLastWeek && e.accepted_at < startThisWeek);
  const closedMo   = closed.filter(e => e.accepted_at && e.accepted_at >= startThisMonth);
  const closedLstM = closed.filter(e => e.accepted_at && e.accepted_at >= startLastMonth && e.accepted_at <= endLastMonth);

  const revWeek  = closedWeek.reduce((s, e) => s + Number(e.total), 0);
  const revLstW  = closedLstW.reduce((s, e) => s + Number(e.total), 0);
  const revMonth = closedMo.reduce((s, e) => s + Number(e.total), 0);
  const revLstM  = closedLstM.reduce((s, e) => s + Number(e.total), 0);
  const revTotal  = closed.reduce((s, e) => s + Number(e.total), 0);

  const revWeekDelta  = revLstW  > 0 ? ((revWeek  - revLstW)  / revLstW)  * 100 : 0;
  const revMonthDelta = revLstM  > 0 ? ((revMonth - revLstM)  / revLstM)  * 100 : 0;

  const avgDeal  = closed.length  > 0 ? revTotal  / closed.length  : 0;

  //  Acquisition 
  const sent     = estimates.filter(e => ["quoted","accepted","deposit_paid","rejected"].includes(e.status));
  const sentWeek = sent.filter(e => e.last_sent_at && e.last_sent_at >= startThisWeek);
  const sentLstW = sent.filter(e => e.last_sent_at && e.last_sent_at >= startLastWeek && e.last_sent_at < startThisWeek);
  const leadsDelta = sentLstW.length > 0 ? ((sentWeek.length - sentLstW.length) / sentLstW.length) * 100 : 0;

  const closeRate     = sent.length  > 0 ? (closed.length  / sent.length)  * 100 : 0;
  const closeRateWeek = sentWeek.length > 0 ? (closedWeek.length / sentWeek.length) * 100 : 0;

  //  CAC / LTV / LTV:CAC 
  // CAC = estimated (no ad spend yet — using $0 paid, time-cost proxy)
  // Once Stripe live: CAC = total acquisition spend / new customers
  const newCust90  = customers.filter(c => c.created_at >= start90).length;
  const cac        = newCust90 > 0 ? 0 : 0; // $0 when all organic — update when paid traffic starts
  const avgMonthlyRev = avgDeal > 0 ? avgDeal : 0;
  const estimatedLTV  = avgDeal * 3; // conservative: avg contractor stays 3+ jobs
  const ltvcac         = cac > 0 ? estimatedLTV / cac : null;

  //  Retention proxies 
  const custWithJobs   = new Set((allJobs ?? []).map(j => j.id)).size;
  const onboardingRate = customers.length > 0 ? Math.min(100, (custWithJobs / customers.length) * 100) : 0;

  //  Efficiency 
  const grossMarginPct = 75; // SaaS target — update when cost data available
  const plan = org?.plan ?? "trial";
  const daysLeft = org?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(org.trial_ends_at).getTime() - now.getTime()) / 86400000))
    : null;

  //  Bottleneck diagnostic 
  let bottleneck = "No data yet — send your first estimate to start tracking.";
  let bottleneckAction = "Build your first estimate → send to a customer.";
  if (sent.length === 0) {
    bottleneck = "No quotes sent yet.";
    bottleneckAction = "Acquisition: Send your first estimate to a customer today.";
  } else if (sent.length > 0 && closeRate < 15) {
    bottleneck = "Low close rate — offer or pricing issue.";
    bottleneckAction = "Review your last 3 rejected estimates. Adjust price or scope.";
  } else if (closeRate >= 15 && customers.length > 5 && onboardingRate < 50) {
    bottleneck = "Low onboarding completion — retention risk.";
    bottleneckAction = "Call your last 5 customers. Ask what's confusing about the process.";
  } else if (closeRate >= 25 && revMonth > 0) {
    bottleneck = "Engine running. Bottleneck: volume.";
    bottleneckAction = "Increase outreach volume — more quotes = more revenue.";
  }

  const weekDelta  = deltaLabel(revWeekDelta);
  const monthDelta = deltaLabel(revMonthDelta);
  const leadsDeltaObj = deltaLabel(leadsDelta);

  return (
    <div className="space-y-8 pb-10">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fence-950">KPI Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">Owner-only · Updates in real time</p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
          plan === "trial" ? "bg-amber-100 text-amber-700" :
          plan === "pro"   ? "bg-fence-100 text-fence-700" :
          plan === "business" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"
        }`}>
          {plan === "trial" ? `Trial · ${daysLeft}d left` : plan}
        </span>
      </div>

      {/* Revenue Row */}
      <div>
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Revenue</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon="" label="Revenue This Week"  value={currency(revWeek)}
            deltaText={weekDelta.text}  deltaColor={weekDelta.color}  sub="vs prior 7 days" />
          <StatCard icon="" label="Revenue This Month" value={currency(revMonth)}
            deltaText={monthDelta.text} deltaColor={monthDelta.color} sub="vs last month" />
          <StatCard icon="" label="Total Revenue"      value={currency(revTotal)} sub={`${closed.length} deals closed`} />
          <StatCard icon="" label="Avg Deal Size"       value={currency(avgDeal)}  sub="per closed estimate" />
        </div>
      </div>

      {/* Acquisition Row */}
      <div>
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Acquisition</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon="" label="Quotes Sent (Week)"  value={String(sentWeek.length)}
            deltaText={leadsDeltaObj.text} deltaColor={leadsDeltaObj.color} sub="vs prior 7 days" />
          <StatCard icon="" label="Close Rate (All Time)" value={pct(closeRate)}
            accent={closeRate >= 30 ? "text-green-600" : closeRate >= 15 ? "text-amber-600" : "text-red-500"}
            sub={`${closed.length} of ${sent.length} sent`} />
          <StatCard icon="" label="Close Rate (Week)"     value={pct(closeRateWeek)}
            accent={closeRateWeek >= 30 ? "text-green-600" : "text-amber-600"}
            sub={`${closedWeek.length} of ${sentWeek.length} this week`} />
          <StatCard icon="" label="CAC"  value={cac > 0 ? currency(cac) : "$0 (organic)"}
            sub="cost per acquired customer" />
        </div>
      </div>

      {/* Retention + LTV Row */}
      <div>
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Retention & LTV</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon=""  label="Est. Customer LTV"    value={currency(estimatedLTV)} sub="avg deal × 3 jobs" />
          <StatCard icon=""  label="LTV:CAC Ratio"        value={ltvcac !== null ? `${ltvcac.toFixed(1)}:1` : "N/A (organic)"}
            accent="text-green-600" sub="Target: >3:1" />
          <StatCard icon=""  label="Onboarding Rate"      value={pct(onboardingRate)}
            accent={onboardingRate >= 60 ? "text-green-600" : "text-amber-600"}
            sub="customers with active jobs" />
          <StatCard icon=""  label="Total Customers"      value={String(customers.length)}
            sub={`${customers.filter(c => c.created_at >= startThisMonth).length} new this month`} />
        </div>
      </div>

      {/* Health Bars */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <h2 className="font-bold text-fence-950 mb-5">Performance Health</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <HealthBar label="Close Rate"       value={closeRate}     max={50}  target={30} />
          <HealthBar label="Onboarding Rate"  value={onboardingRate} max={100} target={60} />
          <HealthBar label="Avg Deal Size"    value={avgDeal}       max={10000} target={3000} format="currency" />
        </div>
      </div>

      {/* Bottleneck Diagnostic */}
      <div className={`rounded-xl border p-6 ${
        bottleneck.includes("No data") || bottleneck.includes("No quotes")
          ? "bg-gray-50 border-gray-200"
          : bottleneck.includes("Low close") ? "bg-amber-50 border-amber-200"
          : bottleneck.includes("onboarding") ? "bg-red-50 border-red-200"
          : "bg-green-50 border-green-200"
      }`}>
        <div className="flex items-start gap-3">
          <span className="text-xl">
            {bottleneck.includes("volume") ? "" :
             bottleneck.includes("onboarding") ? "" :
             bottleneck.includes("close rate") ? "" : ""}
          </span>
          <div>
            <h3 className="font-bold text-fence-950 mb-1">Current Bottleneck</h3>
            <p className="text-sm text-gray-700 mb-2">{bottleneck}</p>
            <p className="text-sm font-semibold text-fence-700">→ {bottleneckAction}</p>
          </div>
        </div>
      </div>

      {/* KPI Priority Rule */}
      <div className="bg-fence-950 rounded-xl p-6 text-white">
        <h2 className="font-bold mb-4 text-fence-300 text-xs uppercase tracking-wider">KPI Priority Diagnostic</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {[
            { cond: "Leads low",              fix: "Acquisition problem → increase outreach",   active: sentWeek.length < 3 },
            { cond: "Leads high, closes low", fix: "Offer problem → review pricing + messaging", active: sentWeek.length >= 3 && closeRate < 15 },
            { cond: "Sales high, churn high", fix: "Onboarding problem → improve activation",   active: closed.length > 10 && onboardingRate < 50 },
            { cond: "Revenue high, margin low",fix: "Pricing problem → raise prices",           active: revMonth > 10000 && grossMarginPct < 60 },
          ].map(({ cond, fix, active }) => (
            <div key={cond} className={`flex gap-3 p-3 rounded-lg ${active ? "bg-amber-500/20 border border-amber-500/40" : "bg-white/5"}`}>
              <span>{active ? "" : ""}</span>
              <div>
                <div className={`font-semibold text-xs ${active ? "text-amber-300" : "text-white/50"}`}>{cond}</div>
                <div className={`text-xs mt-0.5 ${active ? "text-white" : "text-white/30"}`}>{fix}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
