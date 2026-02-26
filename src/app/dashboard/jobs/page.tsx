import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { redirect } from "next/navigation";
import { canAccess } from "@/lib/roles";

export default async function JobsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);

  if (!canAccess(profile.role, "jobs")) {
    redirect("/dashboard");
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-fence-900 mb-1">Jobs</h1>
      <p className="text-sm text-gray-500 mb-6">
        Track active fence jobs from estimate to completion.
      </p>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-fence-100 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-fence-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
        </div>
        <h2 className="font-semibold text-fence-900 mb-1">No jobs yet</h2>
        <p className="text-sm text-gray-400">
          Jobs are created from approved estimates. This page will show your active job pipeline.
        </p>
      </div>
    </>
  );
}
