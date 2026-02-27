import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { redirect } from "next/navigation";
import { canAccess } from "@/lib/roles";
import Link from "next/link";

function fmt(v: number | string | null) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(v) || 0);
}

function fmtPct(v: number | string | null) {
  return `${(Number(v || 0) * 100).toFixed(1)}%`;
}

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-yellow-100 text-yellow-700",
  active: "bg-blue-100 text-blue-700",
  complete: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default async function JobsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);
  if (!canAccess(profile.role, "jobs")) redirect("/dashboard");

  const { data: jobs } = await supabase
    .from("jobs")
    .select(
      "id, status, total_price, gross_margin_pct, scheduled_date, assigned_foreman_id, created_at, customers(name), estimates(fence_type, linear_feet)"
    )
    .eq("org_id", profile.org_id)
    .order("created_at", { ascending: false });

  // Load foreman names for display
  const foremanIds = (jobs ?? [])
    .map((j: { assigned_foreman_id: string | null }) => j.assigned_foreman_id)
    .filter(Boolean) as string[];

  let foremanMap: Record<string, string> = {};
  if (foremanIds.length > 0) {
    const { data: foremen } = await supabase
      .from("users")
      .select("id, full_name, email")
      .in("id", foremanIds);
    for (const f of foremen ?? []) {
      foremanMap[f.id] = f.full_name || f.email || "Unknown";
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-fence-900">Jobs</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Track fence jobs from schedule to completion.
          </p>
        </div>
      </div>

      {!jobs || jobs.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-fence-100 flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-fence-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
          </div>
          <h2 className="font-semibold text-fence-900 mb-1">No jobs yet</h2>
          <p className="text-sm text-gray-400 mb-6">
            Convert a quoted estimate to create your first job.
          </p>
          <Link
            href="/dashboard/estimates"
            className="bg-fence-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-fence-700 transition-colors inline-block"
          >
            View Estimates
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map(
            (job: {
              id: string;
              status: string;
              total_price: number;
              gross_margin_pct: number;
              scheduled_date: string | null;
              assigned_foreman_id: string | null;
              created_at: string;
              customers: { name: string }[];
              estimates: { fence_type: string; linear_feet: number }[];
            }) => {
              const est = job.estimates?.[0];
              const customerName =
                job.customers?.[0]?.name || "No customer";
              const fenceType =
                est?.fence_type?.replace("_", " ") || "—";
              const foremanName = job.assigned_foreman_id
                ? foremanMap[job.assigned_foreman_id] || "Unassigned"
                : "Unassigned";

              return (
                <Link
                  key={job.id}
                  href={`/dashboard/jobs/${job.id}`}
                  className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-fence-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-fence-900 truncate">
                        {customerName}
                      </h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {fenceType} · {est?.linear_feet || 0} ft ·{" "}
                        {foremanName}
                      </p>
                      {job.scheduled_date && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Scheduled:{" "}
                          {new Date(
                            job.scheduled_date + "T00:00:00"
                          ).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold">
                        {fmt(job.total_price)}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 justify-end">
                        <span className="text-sm font-medium text-green-600">
                          {fmtPct(job.gross_margin_pct)}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            STATUS_STYLES[job.status] ||
                            "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {job.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            }
          )}
        </div>
      )}
    </>
  );
}
