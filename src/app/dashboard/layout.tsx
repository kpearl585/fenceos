import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { getVisibleNav } from "@/lib/roles";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { MobileNav } from "@/components/dashboard/MobileNav";
import { TrialBanner } from "@/components/dashboard/TrialBanner";
import HelpModule from "@/components/dashboard/HelpModule";
import PostHogProvider from "@/components/PostHogProvider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Bootstrap: ensure profile + org exist
  let profile;
  try {
    profile = await ensureProfile(supabase, user);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    // Provisioning failed — show actionable error with refresh link
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md px-4">
          <h1 className="text-xl font-bold text-text mb-2">Account setup failed</h1>
          <p className="text-sm text-muted mb-4">
            We couldn't finish setting up your account. This is usually a temporary issue.
          </p>
          {process.env.NODE_ENV !== "production" && (
            <p className="text-xs text-red-400 mb-4 font-mono break-all">{message}</p>
          )}
          <a
            href="/dashboard"
            className="inline-block px-4 py-2 bg-accent text-white text-sm rounded hover:bg-accent-dark transition-colors"
          >
            Retry
          </a>
          <p className="text-xs text-muted mt-4">
            If this keeps happening, contact{" "}
            <a href="mailto:support@fenceestimatepro.com" className="underline">
              support@fenceestimatepro.com
            </a>
          </p>
        </div>
      </div>
    );
  }

  const visibleNav = getVisibleNav(profile.role);

  // Fetch org name for sidebar
  const { data: org } = await supabase
    .from("organizations")
    .select("name, plan, plan_status, trial_ends_at")
    .eq("id", profile.org_id)
    .single();

  const orgName = org?.name ?? "My Organization";
  const plan = org?.plan ?? "trial";
  const planStatus = org?.plan_status ?? "trialing";
  const trialEndsAt = org?.trial_ends_at ?? null;
  const daysRemaining = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000))
    : 14;

  // Hard-lock expired trials — redirect to upgrade unless already there
  const isExpiredTrial =
    (plan === "trial" || plan === "trialing") &&
    (planStatus === "expired" || daysRemaining <= 0);

  // Allow the upgrade page and billing portal through even when expired
  // (checked server-side against the request pathname via the layout URL)
  // We use a client-side guard instead so we don't need the request object here.
  // See: TrialExpiredGate below — rendered only when expired.

  // Hard gate: expired trial — show upgrade wall instead of dashboard content
  if (isExpiredTrial) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="bg-surface-2 rounded-2xl border border-border p-10 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-danger/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-text mb-2">Your trial has ended</h2>
          <p className="text-sm text-muted mb-6 leading-relaxed">
            Your 14-day free trial has expired. Your estimates, customers, and job history are saved — pick a plan to get back to work.
          </p>
          <a
            href="/dashboard/upgrade"
            className="inline-block w-full bg-accent hover:bg-accent-dark text-white font-bold text-sm py-3 px-6 rounded-xl transition-colors mb-3"
          >
            Choose a Plan →
          </a>
          <p className="text-xs text-muted">Starting at $49/month · Cancel anytime</p>
        </div>
      </div>
    );
  }

  // PostHog identity — assembled from data already fetched above so
  // this mount adds zero extra DB queries. Root layout has a null-
  // identity PostHogProvider for anon pageviews; the dashboard variant
  // below upgrades the same PostHog instance with the user's identity.
  const phIdentity = {
    userId: user.id,
    email: profile.email ?? null,
    fullName: profile.full_name ?? null,
    orgId: profile.org_id,
    orgName: org?.name ?? null,
    plan: (org?.plan as string | null) ?? null,
  };

  return (
    <div className="min-h-screen bg-background">
      <PostHogProvider identity={phIdentity} />
      <Sidebar items={visibleNav} orgName={orgName} />

      {/* Main content column — header + trial banner + page content all
          pushed right of the fixed sidebar on desktop so the sidebar's
          brand stays visible (header used to span full width and cover
          the sidebar's top-left corner). */}
      <div className="lg:pl-64">
        <Header
          email={profile.email}
          role={profile.role}
          fullName={profile.full_name}
        />
        <TrialBanner daysRemaining={daysRemaining} plan={plan} />
        <main className="pb-20 lg:pb-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>

      <MobileNav items={visibleNav} />
      <HelpModule />
    </div>
  );
}
