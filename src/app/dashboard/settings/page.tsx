import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { redirect } from "next/navigation";
import { canAccess } from "@/lib/roles";
import { saveOrgSettings } from "./actions";
import OrgNameForm from "@/components/settings/OrgNameForm";
import BrandingForm from "@/components/settings/BrandingForm";
import TeamMembersSection from "@/components/settings/TeamMembersSection";
import BillingPortalButton from "@/components/settings/BillingPortalButton";
import { planHasCustomBranding } from "@/lib/planLimits";
import { createAdminClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);
  if (!canAccess(profile.role, "owner")) redirect("/dashboard");

  const adminSettings = createAdminClient();
  const [{ data: orgSettings }, { data: branding }, { data: orgUsers }, { data: org }] = await Promise.all([
    supabase.from("org_settings").select("*").eq("org_id", profile.org_id).single(),
    supabase.from("org_branding").select("*").eq("org_id", profile.org_id).single(),
    adminSettings.from("users").select("id, full_name, email, role, created_at").eq("org_id", profile.org_id).order("created_at"),
    adminSettings.from("organizations").select("name, slug, id, plan, plan_status, trial_ends_at").eq("id", profile.org_id).single(),
  ]);

  const planLabel: Record<string, string> = {
    starter: "Starter — $29/mo",
    pro: "Pro — $79/mo",
    business: "Business — $149/mo",
    trial: "Free Trial",
    free: "Free",
  };
  const planName = planLabel[(org as { plan?: string } | null)?.plan ?? "trial"] ?? "Free Trial";
  const planStatus = (org as { plan_status?: string } | null)?.plan_status ?? "trialing";
  const trialEndsAt = (org as { trial_ends_at?: string } | null)?.trial_ends_at;
  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-fence-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage organization settings, branding, and users.</p>
      </div>

      <div className="space-y-6">
        {/* Org Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-fence-900 mb-4">Organization</h2>
          <OrgNameForm orgId={org?.id || profile.org_id} currentName={org?.name || ""} />
        </div>

        {/* Legal / Payment Terms + Business Settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-fence-900 mb-4">Legal & Payment Terms</h2>
          <form action={saveOrgSettings} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Legal Terms</label>
              <textarea
                name="legal_terms"
                rows={6}
                defaultValue={orgSettings?.legal_terms || ""}
                placeholder="Enter your standard legal terms and conditions..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-fence-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
              <textarea
                name="payment_terms"
                rows={4}
                defaultValue={orgSettings?.payment_terms || ""}
                placeholder="Enter your payment terms..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-fence-500"
              />
            </div>

            {/* Business defaults */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Business Defaults</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Gross Margin (%)
                  </label>
                  <input
                    name="target_margin_pct"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    defaultValue={Number((orgSettings as Record<string, unknown>)?.target_margin_pct ?? 35)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-fence-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Labor Rate (per LF)
                  </label>
                  <input
                    name="default_labor_rate"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={Number((orgSettings as Record<string, unknown>)?.default_labor_rate ?? 0)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-fence-500"
                  />
                </div>
              </div>
            </div>

            <button type="submit" className="bg-fence-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-fence-700">
              Save Settings
            </button>
          </form>
        </div>

        {/* Branding */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-fence-900 mb-4">Branding</h2>
          {planHasCustomBranding((org as { plan?: string } | null)?.plan) ? (
            <BrandingForm
              orgId={profile.org_id}
              initialPrimaryColor={branding?.primary_color || '#2D6A4F'}
              initialAccentColor={branding?.accent_color || '#4ade80'}
              initialLogoUrl={branding?.logo_url || ''}
              initialFooterNote={branding?.footer_note || ''}
            />
          ) : (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <p className="text-sm font-medium text-gray-700">Custom PDF Branding</p>
                <p className="text-xs text-gray-400 mt-0.5">Add your logo and brand colors to all PDF estimates. Available on Pro and above.</p>
              </div>
              <Link href="/dashboard/upgrade" className="bg-fence-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-fence-700 transition-colors whitespace-nowrap">
                Upgrade to Pro
              </Link>
            </div>
          )}
        </div>


        {/* Billing */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-fence-900 mb-4">Plan & Billing</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Current Plan</p>
              <p className="text-base font-bold text-fence-700 mt-1">{planName}</p>
              {planStatus === "trialing" && trialDaysLeft !== null && (
                <p className="text-xs text-amber-600 mt-0.5">{trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} remaining in trial</p>
              )}
              {planStatus === "active" && (
                <p className="text-xs text-green-600 mt-0.5">Active subscription</p>
              )}
              {planStatus === "cancelled" && (
                <p className="text-xs text-red-500 mt-0.5">Subscription cancelled</p>
              )}
            </div>
            <div className="flex gap-2">
              {planStatus !== "active" && (
                <a
                  href="/dashboard/upgrade"
                  className="border border-fence-600 text-fence-600 hover:bg-fence-50 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  Upgrade Plan
                </a>
              )}
              <BillingPortalButton />
            </div>
          </div>
        </div>

        {/* Users */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-fence-900 mb-4">Team Members</h2>
          <TeamMembersSection
            members={(orgUsers ?? []) as Array<{id: string; full_name: string | null; email: string; role: string; created_at: string}>}
            orgId={org?.id || profile.org_id}
            currentUserId={user.id}
          />
        </div>
      </div>
    </>
  );
}
