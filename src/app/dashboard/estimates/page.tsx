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
  draft:    "bg-surface-3 text-muted",
  quoted:   "bg-accent/15 text-accent-light",
  approved: "bg-accent/20 text-accent-light",
  rejected: "bg-danger/15 text-danger",
  expired:  "bg-warning/15 text-warning",
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
          <h1 className="font-display text-2xl font-bold text-text">Estimates</h1>
          <p className="text-sm text-muted mt-0.5">{filtered.length} estimate{filtered.length !== 1 ? "s" : ""}{status ? ` · ${status}` : ""}</p>
        </div>
        <Link href="/dashboard/advanced-estimate" className="bg-accent hover:bg-accent-light accent-glow text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-150">
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
        <div className="bg-surface-2 rounded-xl border border-border p-12 text-center">
          <p className="text-muted text-sm">{q || status ? "No estimates match your search." : "No estimates yet."}</p>
          {!q && !status && (
            <>
              <Link href="/dashboard/advanced-estimate" className="mt-3 inline-block text-sm text-accent-light hover:text-accent font-semibold transition-colors duration-150">Create your first estimate →</Link>
              <p className="mt-4 text-xs text-muted">
                Looking for a saved draft from the Estimator?{" "}
                <Link href="/dashboard/advanced-estimate/saved" className="text-accent-light hover:text-accent font-semibold transition-colors duration-150">Check Saved Drafts</Link>.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="bg-surface-2 rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-3 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-muted uppercase tracking-wider text-xs">Customer</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted uppercase tracking-wider text-xs hidden sm:table-cell">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted uppercase tracking-wider text-xs hidden md:table-cell">LF</th>
                  {isOwner && <th className="text-right px-4 py-3 font-semibold text-muted uppercase tracking-wider text-xs">Total</th>}
                  {isOwner && <th className="text-right px-4 py-3 font-semibold text-muted uppercase tracking-wider text-xs hidden sm:table-cell">Margin</th>}
                  <th className="text-center px-4 py-3 font-semibold text-muted uppercase tracking-wider text-xs">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted uppercase tracking-wider text-xs hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((e: { id: string; title: string; status: string; total: number | null; gross_margin_pct: number | null; fence_type: string | null; linear_feet: number | null; created_at: string; last_sent_at: string | null; last_sent_to: string | null; customers: { name: string }[] | null }) => (
                  <tr key={e.id} className="hover:bg-surface-3 transition-colors duration-150 cursor-pointer">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/estimates/${e.id}`} className="block">
                        <p className="font-medium text-text hover:text-accent-light transition-colors duration-150">{(e.customers as { name: string }[] | null)?.[0]?.name || "—"}</p>
                        <p className="text-xs text-muted truncate max-w-[160px]">{e.title}</p>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted hidden sm:table-cell capitalize">{e.fence_type?.replace(/_/g, " ") || "—"}</td>
                    <td className="px-4 py-3 text-muted hidden md:table-cell font-mono">{e.linear_feet ? `${e.linear_feet} LF` : "—"}</td>
                    {isOwner && <td className="px-4 py-3 text-right font-semibold text-text font-display">{e.total ? fmt(e.total) : "—"}</td>}
                    {isOwner && (
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        <span className={`font-semibold font-display text-sm ${Number(e.gross_margin_pct) >= targetMargin ? "text-accent-light" : Number(e.gross_margin_pct) >= warnMargin ? "text-warning" : "text-danger"}`}>
                          {e.gross_margin_pct ? `${(Number(e.gross_margin_pct) * 100).toFixed(1)}%` : "—"}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_COLORS[e.status] || "bg-surface-3 text-muted"}`}>
                          {e.status}
                        </span>
                        {e.status === "quoted" && e.last_sent_at && (
                          <span className="text-xs text-muted">
                            Sent {new Date(e.last_sent_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-muted text-xs hidden md:table-cell">
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
