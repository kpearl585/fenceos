import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { canAccess } from "@/lib/roles";
import { redirect } from "next/navigation";
import Link from "next/link";

function fmt(v: number | string | null) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(v) || 0);
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  quoted: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-yellow-100 text-yellow-700",
};

export default async function EstimatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);
  if (!canAccess(profile.role, "estimates")) redirect("/dashboard");

  const { data: estimates } = await supabase
    .from("estimates")
    .select(
      "id, title, status, total, gross_margin_pct, margin_status, fence_type, linear_feet, created_at, customers(name)"
    )
    .eq("org_id", profile.org_id)
    .order("created_at", { ascending: false });

  return (
    <>
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-fence-900">Estimates</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Create and manage fence estimates with margin protection.
          </p>
        </div>
        <Link
          href="/dashboard/estimates/new"
          className="bg-fence-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-fence-700 transition-colors"
        >
          + New Estimate
        </Link>
      </div>

      {!estimates || estimates.length === 0 ? (
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
              <rect x="4" y="2" width="16" height="20" rx="2" />
              <line x1="8" y1="6" x2="16" y2="6" />
              <line x1="8" y1="10" x2="16" y2="10" />
              <line x1="8" y1="14" x2="12" y2="14" />
            </svg>
          </div>
          <h2 className="font-semibold text-fence-900 mb-1">
            No estimates yet
          </h2>
          <p className="text-sm text-gray-400 mb-6">
            Create your first fence estimate to see it here.
          </p>
          <Link
            href="/dashboard/estimates/new"
            className="bg-fence-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-fence-700 transition-colors inline-block"
          >
            Create Estimate
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {estimates.map(
            (est: {
              id: string;
              title: string;
              status: string;
              total: number;
              gross_margin_pct: number;
              margin_status: string;
              fence_type: string;
              linear_feet: number;
              created_at: string;
              customers: { name: string }[];
            }) => {
              const marginPct = Number(est.gross_margin_pct) || 0;
              const marginColor =
                est.margin_status === "warning"
                  ? "text-red-600"
                  : "text-green-600";
              return (
                <Link
                  key={est.id}
                  href={`/dashboard/estimates/${est.id}`}
                  className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-fence-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-fence-900 truncate">
                        {est.title}
                      </h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {est.customers?.[0]?.name || "No customer"} ·{" "}
                        {est.linear_feet} ft ·{" "}
                        {new Date(est.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold">{fmt(est.total)}</p>
                      <div className="flex items-center gap-2 mt-0.5 justify-end">
                        <span
                          className={`text-sm font-semibold ${marginColor}`}
                        >
                          {(marginPct * 100).toFixed(1)}%
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            STATUS_COLORS[est.status] ??
                            "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {est.status.toUpperCase()}
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
