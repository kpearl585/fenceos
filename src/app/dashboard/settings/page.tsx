import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { redirect } from "next/navigation";
import { canAccess } from "@/lib/roles";
import { saveOrgSettings, saveBranding } from "./actions";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);
  if (!canAccess(profile.role, "owner")) redirect("/dashboard");

  const [{ data: orgSettings }, { data: branding }, { data: orgUsers }, { data: org }] = await Promise.all([
    supabase.from("org_settings").select("*").eq("org_id", profile.org_id).single(),
    supabase.from("org_branding").select("*").eq("org_id", profile.org_id).single(),
    supabase.from("users").select("id, full_name, email, role, created_at").eq("org_id", profile.org_id).order("created_at"),
    supabase.from("organizations").select("name, slug").eq("id", profile.org_id).single(),
  ]);

  const ROLE_BADGE: Record<string, string> = {
    owner: "bg-purple-100 text-purple-700",
    sales: "bg-blue-100 text-blue-700",
    foreman: "bg-yellow-100 text-yellow-700",
  };

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
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Name</p>
              <p className="font-medium">{org?.name || "—"}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Slug</p>
              <p className="font-mono text-xs">{org?.slug || "—"}</p>
            </div>
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

        {/* Branding */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-fence-900 mb-4">Branding</h2>
          <form action={saveBranding} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                <input name="primary_color" type="text" defaultValue={branding?.primary_color || ""} placeholder="#1a4d2e" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Accent Color</label>
                <input name="accent_color" type="text" defaultValue={branding?.accent_color || ""} placeholder="#4ade80" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                <input name="logo_url" type="url" defaultValue={branding?.logo_url || ""} placeholder="https://..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Footer Note</label>
                <input name="footer_note" type="text" defaultValue={branding?.footer_note || ""} placeholder="Licensed & Insured" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <button type="submit" className="bg-fence-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-fence-700">
              Save Branding
            </button>
          </form>
        </div>


        {/* Billing */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-fence-900 mb-4">Plan & Billing</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Current Plan</p>
              <p className="text-xs text-gray-400 mt-0.5">Manage your subscription and billing details</p>
            </div>
            <div className="flex gap-2">
              <a
                href="/dashboard/upgrade"
                className="border border-fence-600 text-fence-600 hover:bg-fence-50 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Upgrade Plan
              </a>
              <form action="/api/stripe/portal" method="POST">
                <button
                  type="submit"
                  className="bg-fence-600 hover:bg-fence-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  Manage Billing
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Users */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-fence-900 mb-4">Team Members</h2>
          {!orgUsers || orgUsers.length === 0 ? (
            <p className="text-sm text-gray-400">No users found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 font-semibold text-gray-600">Name</th>
                  <th className="text-left py-2 font-semibold text-gray-600">Email</th>
                  <th className="text-left py-2 font-semibold text-gray-600">Role</th>
                  <th className="text-left py-2 font-semibold text-gray-600">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(orgUsers as Array<{id: string; full_name: string | null; email: string; role: string; created_at: string}>).map((u) => (
                  <tr key={u.id}>
                    <td className="py-2 font-medium">{u.full_name || "—"}</td>
                    <td className="py-2 text-gray-600">{u.email}</td>
                    <td className="py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${ROLE_BADGE[u.role] || "bg-gray-100 text-gray-600"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2 text-gray-400 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
