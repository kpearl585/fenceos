import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { canAccess } from "@/lib/roles";
import { redirect } from "next/navigation";
import Link from "next/link";
import SearchFilter from "@/components/dashboard/SearchFilter";
import { getOrgMarginTargets } from "@/lib/marginTargets";

function fmt(v: number | string | null) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(Number(v) || 0);
}

const STATUS_COLORS: Record<string, string> = {
  draft:    "bg-gray-100 text-gray-700",
  quoted:   "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
  expired:  "bg-yellow-100 text-yellow-700",
};

const STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "quoted", label: "Quoted" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "expired", label: "Expired" },
];

export default async function EstimatesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q = "", status = "" } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const profile = await ensureProfile(supabase, user);
  if (!canAccess(profile.role, "estimates")) redirect("/dashboard");

  let query = supabase
    .from("estimates")
    .select("id, title, status, total, gross_margin_pct, fence_type, linear_feet, created_at, last_sent_at, last_sent_to, customers(name)")
    .eq("org_id", profile.org_id)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data: estimates } = await query;
  const isOwner = profile.role === "owner";
  // Margin color bands follow the org's configured target (editable in
  // Settings). Yellow band = within 5pp below target; red = below that.
  const { target: targetMargin, warn: warnMargin } = await getOrgMarginTargets(profile.org_id);

  const filtered = (estimates ?? []).filter(e => {
    if (!q) return true;
    const search = q.toLowerCase();
    const customerName = (e.customers as { name: string }[] | null)?.[0]?.name?.toLowerCase() || "";
    return e.title?.toLowerCase().includes(search) || customerName.includes(search);
  });

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-fence-900">Estimates</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} estimate{filtered.length !== 1 ? "s" : ""}{status ? ` · ${status}` : ""}</p>
        </div>
        <Link href="/dashboard/advanced-estimate" className="bg-fence-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-fence-700 transition-colors">
          + New Estimate
        </Link>
      </div>

      <div className="mb-4">
        <SearchFilter
          placeholder="Search by customer or title..."
          statuses={STATUSES}
          currentSearch={q}
          currentStatus={status}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm">{q || status ? "No estimates match your search." : "No estimates yet."}</p>
          {!q && !status && (
            <>
              <Link href="/dashboard/advanced-estimate" className="mt-3 inline-block text-sm text-fence-600 font-semibold hover:underline">Create your first estimate →</Link>
              <p className="mt-4 text-xs text-gray-400">
                Looking for a saved draft from the Estimator?{" "}
                <Link href="/dashboard/advanced-estimate/saved" className="text-fence-600 font-semibold hover:underline">Check Saved Drafts</Link>.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Customer</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">LF</th>
                  {isOwner && <th className="text-right px-4 py-3 font-semibold text-gray-600">Total</th>}
                  {isOwner && <th className="text-right px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Margin</th>}
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((e: { id: string; title: string; status: string; total: number | null; gross_margin_pct: number | null; fence_type: string | null; linear_feet: number | null; created_at: string; last_sent_at: string | null; last_sent_to: string | null; customers: { name: string }[] | null }) => (
                  <tr key={e.id} className="hover:bg-gray-50 cursor-pointer">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/estimates/${e.id}`} className="block">
                        <p className="font-medium text-fence-900 hover:text-fence-600">{(e.customers as { name: string }[] | null)?.[0]?.name || "—"}</p>
                        <p className="text-xs text-gray-400 truncate max-w-[160px]">{e.title}</p>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell capitalize">{e.fence_type?.replace(/_/g, " ") || "—"}</td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{e.linear_feet ? `${e.linear_feet} LF` : "—"}</td>
                    {isOwner && <td className="px-4 py-3 text-right font-semibold text-fence-900">{e.total ? fmt(e.total) : "—"}</td>}
                    {isOwner && (
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        <span className={`font-semibold text-sm ${Number(e.gross_margin_pct) >= targetMargin ? "text-green-600" : Number(e.gross_margin_pct) >= warnMargin ? "text-yellow-600" : "text-red-500"}`}>
                          {e.gross_margin_pct ? `${(Number(e.gross_margin_pct) * 100).toFixed(1)}%` : "—"}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_COLORS[e.status] || "bg-gray-100 text-gray-600"}`}>
                          {e.status}
                        </span>
                        {e.status === "quoted" && e.last_sent_at && (
                          <span className="text-xs text-gray-400">
                            &#128228; {new Date(e.last_sent_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 text-xs hidden md:table-cell">
                      {new Date(e.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
