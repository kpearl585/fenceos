import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { getVisibleNav } from "@/lib/roles";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { MobileNav } from "@/components/dashboard/MobileNav";
import { TrialBanner } from "@/components/dashboard/TrialBanner";
import HelpModule from "@/components/dashboard/HelpModule";

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
  } catch {
    // If bootstrap fails (tables don't exist yet), show minimal fallback
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-xl font-bold text-fence-900 mb-2">Setting up your account...</h1>
          <p className="text-sm text-gray-500">
            Database tables are being provisioned. Please refresh in a moment.
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
  const trialEndsAt = org?.trial_ends_at ?? null;
  const daysRemaining = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000))
    : 14;

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar items={visibleNav} orgName={orgName} />
      <Header
        email={profile.email}
        role={profile.role}
        fullName={profile.full_name}
      />

      {/* Main content area — pushed right on desktop, full width on mobile */}
      <div className="lg:pl-64">
        <TrialBanner daysRemaining={daysRemaining} plan={plan} />
      </div>
      <main className="lg:pl-64 pt-0 pb-20 lg:pb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>

      <MobileNav items={visibleNav} />
      <HelpModule />
    </div>
  );
}
