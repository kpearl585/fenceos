import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { redirect } from "next/navigation";
import { canAccess } from "@/lib/roles";
import { revalidatePath } from "next/cache";

async function saveOrgSettings(fd: FormData) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const profile = await (await import("@/lib/bootstrap")).ensureProfile(supabase, user);

  // Upsert org_settings
  await supabase.from("org_settings").upsert({
    org_id: profile.org_id,
    legal_terms: fd.get("legal_terms") as string || null,
    payment_terms: fd.get("payment_terms") as string || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "org_id" });

  revalidatePath("/dashboard/settings");
}

async function saveBranding(fd: FormData) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const profile = await (await import("@/lib/bootstrap")).ensureProfile(supabase, user);

  await supabase.from("org_branding").upsert({
    org_id: profile.org_id,
    primary_color: fd.get("primary_color") as string || null,
    accent_color: fd.get("accent_color") as string || null,
    footer_note: fd.get("footer_note") as string || null,
    logo_url: fd.get("logo_url") as string || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "org_id" });

  revalidatePath("/dashboard/settings");
}

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

        {/* Legal / Payment Terms */}
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
            <button type="submit" className="bg-fence-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-fence-700">
              Save Terms
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
