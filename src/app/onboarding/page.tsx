import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { redirect } from "next/navigation";
import { saveOnboarding } from "./actions";
import { consumeClaimToken } from "@/lib/photo-estimate/consume-claim-token";
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

  // Transfer a pending AI Photo Estimator claim (if any) into a
  // fence_graphs row before we branch on onboarding status. Safe in
  // both branches: the helper no-ops on bad/claimed tokens.
  const claimToken =
    typeof user.user_metadata?.claim_token === "string"
      ? user.user_metadata.claim_token
      : null;
  if (claimToken) {
    await consumeClaimToken(user, profile.org_id, claimToken);
  }

  const isDefaultName = !org?.name || org.name.endsWith("'s Org");
  if (!isDefaultName) redirect("/dashboard");

  const inputClass = "w-full px-4 py-3 bg-surface-3 border border-border rounded-lg text-text placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent text-sm transition-colors duration-150";
  const labelClass = "block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider";

  return (
    <div className="relative min-h-screen bg-background text-text flex flex-col overflow-hidden">
      <div className="absolute inset-0 grid-pattern pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-accent/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top bar */}
      <div className="relative flex items-center justify-between px-8 py-5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <span className="font-display font-bold text-sm">FenceEstimate<span className="text-accent-light">Pro</span></span>
        </div>
        <span className="text-muted text-xs uppercase tracking-wider">Step 1 of 1 — Account Setup</span>
      </div>

      <div className="relative flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          {/* Header */}
          <div className="mb-10">
            <div className="w-12 h-12 bg-accent/10 border border-accent/30 rounded-xl flex items-center justify-center mb-5">
              <svg className="w-6 h-6 text-accent-light" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            <h1 className="font-display text-3xl font-bold text-text mb-2">Set up your company</h1>
            <p className="text-muted text-sm leading-relaxed">
              This takes 2 minutes. We&apos;ll use these details to pre-fill your estimates and configure your margin targets.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3.5 bg-danger/10 border border-danger/30 text-danger rounded-lg text-sm">
              {decodeURIComponent(error)}
            </div>
          )}

          <form action={saveOnboarding} className="space-y-6">
            {/* Company info */}
            <div className="bg-surface-2 border border-border rounded-xl p-6 space-y-4">
              <h2 className="text-text font-semibold text-sm mb-1">Company Information</h2>

              <div>
                <label className={labelClass}>
                  Company Name <span className="text-danger">*</span>
                </label>
                <input
                  name="company_name"
                  required
                  autoFocus
                  placeholder="Smith Fence Co."
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  Your Full Name
                </label>
                <input
                  name="full_name"
                  placeholder="John Smith"
                  defaultValue={profile.full_name || ""}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Phone</label>
                  <input
                    name="phone"
                    type="tel"
                    placeholder="(555) 867-5309"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>State</label>
                  <select
                    name="state"
                    className={inputClass}
                  >
                    <option value="">— Select —</option>
                    {US_STATES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Business settings */}
            <div className="bg-surface-2 border border-border rounded-xl p-6 space-y-4">
              <div>
                <h2 className="text-text font-semibold text-sm">Business Settings</h2>
                <p className="text-muted text-xs mt-0.5">You can change these any time in Settings.</p>
              </div>

              <div>
                <label className={labelClass}>
                  Target Gross Margin %
                </label>
                <div className="relative">
                  <input
                    name="target_margin"
                    type="number"
                    min="10"
                    max="80"
                    defaultValue="35"
                    className={`${inputClass} pr-8`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-sm">%</span>
                </div>
                <p className="text-muted text-xs mt-1.5">Industry average is 30–40%. We recommend starting at 35%.</p>
              </div>

              <div>
                <label className={labelClass}>
                  Default Labor Rate (per hour)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
                  <input
                    name="labor_rate"
                    type="number"
                    min="25"
                    max="200"
                    defaultValue="65"
                    className={`${inputClass} pl-7`}
                  />
                </div>
                <p className="text-muted text-xs mt-1.5">Used to auto-calculate labor costs on new estimates.</p>
              </div>
            </div>

            {/* What you get */}
            <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
              <p className="text-accent-light text-xs font-semibold mb-2 uppercase tracking-wider">After setup you&apos;ll be able to:</p>
              <ul className="space-y-1.5">
                {[
                  "Build your first estimate in under 5 minutes",
                  "See your real margin on every job",
                  "Track jobs from estimate to completion",
                ].map(item => (
                  <li key={item} className="flex items-center gap-2 text-muted text-xs">
                    <svg className="w-3 h-3 text-accent-light flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-accent hover:bg-accent-light accent-glow text-white font-semibold rounded-lg transition-colors duration-150 text-sm"
            >
              Set Up My Account →
            </button>

            <p className="text-center text-xs text-muted">
              Need help?{" "}
              <Link href="mailto:support@fenceestimatepro.com" className="text-accent-light hover:text-accent transition-colors duration-150">
                Contact support
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
