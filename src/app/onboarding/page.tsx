import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { redirect } from "next/navigation";
import { saveOnboarding } from "./actions";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Set Up Your Account | FenceEstimatePro" };

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

export default async function OnboardingPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await props.searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);

  // Already onboarded — skip
  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", profile.org_id)
    .single();

  const isDefaultName = !org?.name || org.name.endsWith("'s Org");
  if (!isDefaultName) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-fence-950 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-fence-500 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <span className="text-white font-bold text-sm">FenceEstimatePro</span>
        </div>
        <span className="text-white/30 text-xs">Step 1 of 1 — Account Setup</span>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          {/* Header */}
          <div className="mb-10">
            <div className="w-12 h-12 bg-fence-500/10 border border-fence-500/20 rounded-xl flex items-center justify-center mb-5">
              <svg className="w-6 h-6 text-fence-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Set up your company</h1>
            <p className="text-white/45 text-sm leading-relaxed">
              This takes 2 minutes. We&apos;ll use these details to pre-fill your estimates and configure your margin targets.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm">
               {decodeURIComponent(error)}
            </div>
          )}

          <form action={saveOnboarding} className="space-y-6">
            {/* Company info */}
            <div className="bg-white/[0.03] border border-white/8 rounded-xl p-6 space-y-4">
              <h2 className="text-white font-semibold text-sm mb-1">Company Information</h2>

              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wide">
                  Company Name <span className="text-red-400">*</span>
                </label>
                <input
                  name="company_name"
                  required
                  autoFocus
                  placeholder="Smith Fence Co."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-fence-500 focus:border-transparent text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wide">
                  Your Full Name
                </label>
                <input
                  name="full_name"
                  placeholder="John Smith"
                  defaultValue={profile.full_name || ""}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-fence-500 focus:border-transparent text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wide">Phone</label>
                  <input
                    name="phone"
                    type="tel"
                    placeholder="(555) 867-5309"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-fence-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wide">State</label>
                  <select
                    name="state"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-fence-500 text-sm"
                  >
                    <option value="" className="bg-fence-950">— Select —</option>
                    {US_STATES.map(s => (
                      <option key={s} value={s} className="bg-fence-950">{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Business settings */}
            <div className="bg-white/[0.03] border border-white/8 rounded-xl p-6 space-y-4">
              <div>
                <h2 className="text-white font-semibold text-sm">Business Settings</h2>
                <p className="text-white/30 text-xs mt-0.5">You can change these any time in Settings.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wide">
                  Target Gross Margin %
                </label>
                <div className="relative">
                  <input
                    name="target_margin"
                    type="number"
                    min="10"
                    max="80"
                    defaultValue="35"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-fence-500 text-sm pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">%</span>
                </div>
                <p className="text-white/25 text-xs mt-1.5">Industry average is 30–40%. We recommend starting at 35%.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wide">
                  Default Labor Rate (per hour)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">$</span>
                  <input
                    name="labor_rate"
                    type="number"
                    min="25"
                    max="200"
                    defaultValue="65"
                    className="w-full pl-7 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-fence-500 text-sm"
                  />
                </div>
                <p className="text-white/25 text-xs mt-1.5">Used to auto-calculate labor costs on new estimates.</p>
              </div>
            </div>

            {/* What you get */}
            <div className="bg-fence-500/5 border border-fence-500/15 rounded-xl p-4">
              <p className="text-fence-300 text-xs font-medium mb-2">After setup you&apos;ll be able to:</p>
              <ul className="space-y-1.5">
                {[
                  "Build your first estimate in under 5 minutes",
                  "See your real margin on every job",
                  "Track jobs from estimate to completion",
                ].map(item => (
                  <li key={item} className="flex items-center gap-2 text-white/45 text-xs">
                    <span className="text-fence-400 text-xs"></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-fence-600 hover:bg-fence-500 text-white font-semibold rounded-lg transition-colors text-sm"
            >
              Set Up My Account →
            </button>

            <p className="text-center text-xs text-white/20">
              Need help?{" "}
              <Link href="mailto:support@fenceestimatepro.com" className="text-white/35 hover:text-white/50">
                Contact support
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
