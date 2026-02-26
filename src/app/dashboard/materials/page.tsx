import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { redirect } from "next/navigation";
import { canAccess } from "@/lib/roles";

export default async function MaterialsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);

  if (!canAccess(profile.role, "materials")) {
    redirect("/dashboard");
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-fence-900 mb-1">Materials</h1>
      <p className="text-sm text-gray-500 mb-6">
        Manage your material catalog with unit costs and suppliers.
      </p>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-fence-100 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-fence-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
        </div>
        <h2 className="font-semibold text-fence-900 mb-1">No materials yet</h2>
        <p className="text-sm text-gray-400">
          Add materials to your catalog. These will be available when building estimates.
        </p>
      </div>
    </>
  );
}
