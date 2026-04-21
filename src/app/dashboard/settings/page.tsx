import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { redirect } from "next/navigation";
import { canAccess } from "@/lib/roles";
import { saveOrgSettings, saveOrgContact, deleteAccount } from "./actions";
import OrgNameForm from "@/components/settings/OrgNameForm";
import BrandingForm from "@/components/settings/BrandingForm";
import InsuranceCertUpload from "@/components/settings/InsuranceCertUpload";
import TeamMembersSection from "@/components/settings/TeamMembersSection";
import BillingPortalButton from "@/components/settings/BillingPortalButton";
import ExportDataButton from "@/components/settings/ExportDataButton";
import DeleteAccountButton from "@/components/settings/DeleteAccountButton";
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
  const [
    { data: orgSettings },
    { data: branding },
    { data: orgUsers },
    { data: org },
    { data: insuranceCert },
  ] = await Promise.all([
    supabase.from("org_settings").select("*").eq("org_id", profile.org_id).single(),
    supabase.from("org_branding").select("*").eq("org_id", profile.org_id).single(),
    adminSettings.from("users").select("id, full_name, email, role, created_at").eq("org_id", profile.org_id).order("created_at"),
    adminSettings.from("organizations").select("name, slug, id, plan, plan_status, trial_ends_at").eq("id", profile.org_id).single(),
    adminSettings
      .from("org_hoa_docs")
      .select("filename, file_size_bytes, uploaded_at, expires_at")
      .eq("org_id", profile.org_id)
      .eq("doc_type", "insurance_cert")
      .maybeSingle(),
  ]);

  const insuranceCertExisting = insuranceCert
    ? {
        filename: insuranceCert.filename as string,
        fileSizeBytes: Number(insuranceCert.file_size_bytes) || 0,
        uploadedAt: insuranceCert.uploaded_at as string,
        expiresAt: (insuranceCert.expires_at as string | null) ?? null,
      }
    : null;

  const planLabel: Record<string, string> = {
    starter: "Starter — $49/mo",
    pro: "Pro — $89/mo",
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

        {/* Estimator Settings Link */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-fence-900">Estimator Settings</h2>
              <p className="text-xs text-gray-500 mt-0.5">Customize labor rates, material assumptions, overhead, equipment, and pricing rules for your crew.</p>
            </div>
            <Link
              href="/dashboard/settings/estimator"
              className="bg-fence-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-fence-700 transition-colors whitespace-nowrap"
            >
              Configure
            </Link>
          </div>
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

        {/* Company Contact Info — shown on every customer-facing PDF.
            Deliberately outside the plan gate: every plan's quotes need a
            phone/email/address in the "from" block. Only branding (logo,
            colors) is Pro+. */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-fence-900 mb-1">Company Contact Info</h2>
          <p className="text-xs text-gray-500 mb-4">
            Shown on every customer-facing proposal, invoice, and contract. Keep this up to date so customers know how to reach you.
          </p>
          <form action={saveOrgContact} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  name="phone"
                  type="tel"
                  defaultValue={(branding as Record<string, unknown> | null)?.phone as string || ""}
                  placeholder="(555) 867-5309"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-fence-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  name="email"
                  type="email"
                  defaultValue={(branding as Record<string, unknown> | null)?.email as string || ""}
                  placeholder="quotes@yourcompany.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-fence-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mailing Address</label>
              <input
                name="address"
                defaultValue={(branding as Record<string, unknown> | null)?.address as string || ""}
                placeholder="123 Main St, Springfield, IL 62701"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-fence-500"
              />
            </div>
            <button type="submit" className="bg-fence-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-fence-700">
              Save Contact Info
            </button>
          </form>
        </div>

        {/* HOA Packet — contractor documents that get bundled into HOA
            submittal PDFs on demand. Upload once per renewal; every packet
            pulls from here. Owner-only per RLS. */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-fence-900 mb-1">HOA Packet</h2>
          <p className="text-xs text-gray-500 mb-4">
            Upload your insurance certificate once. FEP will bundle it into every HOA submittal packet you generate from a quote, so you don&rsquo;t have to chase the PDF for every job.
          </p>
          <InsuranceCertUpload orgId={profile.org_id} existing={insuranceCertExisting} />
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

        {/* Data & Privacy */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-fence-900 mb-4">Data & Privacy</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <p className="text-sm font-medium text-gray-700">Export Your Data</p>
                <p className="text-xs text-gray-500 mt-0.5">Download all your estimates, customers, and materials as an Excel workbook (opens in Excel, Numbers, or Google Sheets).</p>
              </div>
              <ExportDataButton />
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-50 rounded-xl border border-red-200 p-6">
          <h2 className="font-semibold text-red-900 mb-4">Danger Zone</h2>
          <div className="space-y-4">
            <div className="flex items-start justify-between p-4 bg-white rounded-lg border border-red-200">
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900">Delete Account</p>
                <p className="text-xs text-red-600 mt-0.5">
                  Permanently delete your account and all associated data. This action cannot be undone.
                  All estimates, customers, materials, and team members will be permanently deleted after 30 days.
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Active subscriptions will be cancelled. We recommend exporting your data first.
                </p>
              </div>
              <DeleteAccountButton action={deleteAccount} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
