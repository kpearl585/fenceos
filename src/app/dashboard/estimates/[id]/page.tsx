import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { canAccess } from "@/lib/roles";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { sendQuote, deleteEstimate, convertToJob, duplicateEstimate, reQuoteEstimate } from "../actions";
import { ShareEstimatePanel } from "@/components/estimates/ShareEstimatePanel";
import { payDeposit } from "@/lib/stripe/depositAction";

function fmt(v: number | string | null) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(v) || 0);
}

function fmtPct(v: number | string | null) {
  return `${(Number(v || 0) * 100).toFixed(1)}%`;
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-surface-3 text-muted",
  quoted: "bg-accent/15 text-accent-light",
  sent: "bg-accent/15 text-accent-light",
  accepted: "bg-warning/15 text-warning",
  deposit_paid: "bg-accent/15 text-accent-light",
  converted: "bg-accent text-white",
  rejected: "bg-danger/15 text-danger",
  expired: "bg-surface-3 text-muted",
};

export default async function EstimateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);
  if (!canAccess(profile.role, "estimates")) redirect("/dashboard");

  // Load estimate
  const { data: est, error } = await supabase
    .from("estimates")
    .select("*, customers(id, name, phone, email, address, city, state)")
    .eq("id", id)
    .eq("org_id", profile.org_id)
    .single();

  if (error || !est) notFound();

  // Load line items
  const { data: lineItems } = await supabase
    .from("estimate_line_items")
    .select("*")
    .eq("estimate_id", id)
    .order("sort_order");

  const items = lineItems ?? [];
  const materialItems = items.filter(
    (li: { type: string }) => li.type === "material"
  );
  const laborItems = items.filter(
    (li: { type: string }) => li.type === "labor"
  );

  const isQuoted = est.status === "quoted";
  const isConverted = est.status === "converted";
  const marginOk = est.margin_status === "good" || est.margin_status === "ok";
  const rawTargetPct = Number(est.target_margin_pct);
  const targetPct = rawTargetPct > 1 ? rawTargetPct / 100 : rawTargetPct || 0.35;
  const rawGrossMarginPct = Number(est.gross_margin_pct);
  const grossMarginPct = rawGrossMarginPct > 1 ? rawGrossMarginPct / 100 : rawGrossMarginPct;
  const missingCustomer = !est.customer_id;
  const depositAmount = Number(est.deposit_required_amount) || (Number(est.total) * 0.5);
  const canConvert = !missingCustomer && est.status === "deposit_paid";
  const customerRecord = Array.isArray(est.customers)
    ? est.customers[0]
    : est.customers;

  // Check if job exists for converted estimate
  let linkedJobId: string | null = null;
  if (isConverted) {
    const { data: linkedJob } = await supabase
      .from("jobs")
      .select("id")
      .eq("estimate_id", id)
      .maybeSingle();
    linkedJobId = linkedJob?.id ?? null;
  }

  return (
    <>
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link
          href="/dashboard/estimates"
          className="text-sm text-accent-light hover:text-accent font-medium transition-colors duration-150"
        >
          &larr; Back to Estimates
        </Link>
      </div>

      {/* Title + Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-text">{est.title}</h1>
          <p className="text-sm text-muted mt-0.5">
            {(() => {
              const cust = customerRecord as { id: string; name: string } | null;
              return cust ? (
                <Link href={`/dashboard/customers/${cust.id}`} className="text-accent-light hover:text-accent hover:underline transition-colors duration-150">
                  {cust.name}
                </Link>
              ) : (
                <span className="text-warning font-medium">No customer</span>
              );
            })()}{" "}
            &middot; {est.fence_type?.replace("_", " ")} &middot; {est.linear_feet} ft
            {est.gate_count > 0 && ` · ${est.gate_count} gate(s)`}
          </p>
        </div>
        <span
          className={`self-start text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wider ${STATUS_STYLES[est.status] || "bg-surface-3 text-muted"}`}
        >
          {est.status}
          {isQuoted &&
            est.quoted_at &&
            ` \u00b7 ${new Date(est.quoted_at).toLocaleDateString()}`}
        </span>
      </div>

      {/* ── Missing Customer Warning (prominent, near top) ── */}
      {missingCustomer && !isConverted && (
        <div id="customer-warning" className="rounded-xl border border-warning/30 bg-warning/10 p-4 sm:p-5 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-warning text-xl flex-shrink-0">&#9888;</span>
            <div>
              <h2 className="font-bold text-warning">No Customer Assigned</h2>
              <p className="text-sm text-muted mt-1">
                This estimate has no customer. You must assign a customer before
                you can send a quote or convert to a job.
              </p>
              {est.status === "draft" && (
                <Link
                  href={`/dashboard/estimates/new?edit=${est.id}`}
                  className="inline-block mt-3 bg-warning hover:bg-warning/90 text-background px-5 py-2 rounded-lg text-sm font-semibold transition-colors duration-150"
                >
                  Edit Estimate to Add Customer
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Customer Info Card ── */}
      {!missingCustomer && (() => {
        const cust = customerRecord as {
          id: string;
          name: string;
          phone: string | null;
          email: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
        } | null;
        return cust ? (
          <div className="bg-surface-2 rounded-xl border border-border p-4 mb-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold text-text text-sm">Customer</h2>
              <Link href={`/dashboard/customers/${cust.id}`} className="text-xs text-accent-light hover:text-accent font-medium transition-colors duration-150">
                View Details &rarr;
              </Link>
            </div>
            <p className="text-sm font-medium text-text">{cust.name}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-sm text-muted">
              {cust.phone && <span>{cust.phone}</span>}
              {cust.email && <span>{cust.email}</span>}
              {cust.address && (
                <span>{cust.address}{cust.city && `, ${cust.city}`}{cust.state && ` ${cust.state}`}</span>
              )}
            </div>
          </div>
        ) : null;
      })()}

      {/* ── Margin Preview Card — the signature hero; estimate total is THE moment ── */}
      <div
        className={`rounded-xl p-5 sm:p-6 mb-6 ${
          marginOk
            ? "bg-background border border-accent/20 accent-glow"
            : "bg-surface-2 border border-danger/30"
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg text-text">Margin Preview</h2>
          <span
            className={`font-display text-2xl font-bold ${
              marginOk ? "text-accent-light" : "text-danger"
            }`}
          >
            {fmtPct(grossMarginPct)}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted uppercase tracking-wider text-xs">Total Price</p>
            <p className="font-display font-bold text-lg text-text">{fmt(est.total)}</p>
          </div>
          <div>
            <p className="text-muted uppercase tracking-wider text-xs">Est. Cost</p>
            <p className="font-display font-bold text-lg text-text">{fmt(est.estimated_cost)}</p>
          </div>
          <div>
            <p className="text-muted uppercase tracking-wider text-xs">Gross Profit</p>
            <p className="font-display font-bold text-lg text-text">{fmt(est.gross_profit)}</p>
          </div>
          <div>
            <p className="text-muted uppercase tracking-wider text-xs">Target Margin</p>
            <p className="font-display font-bold text-lg text-text">{fmtPct(targetPct)}</p>
          </div>
        </div>

        {!marginOk && (
          <div className="mt-4 bg-danger/10 border border-danger/30 rounded-lg p-3 text-sm text-danger">
            <strong>Margin Guard:</strong> Gross margin is below your{" "}
            {fmtPct(targetPct)} target. Quote sending is blocked until margin
            meets the target.
          </div>
        )}
      </div>

      {/* Deposit section */}
      {est.status === "accepted" && !est.deposit_paid && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="font-bold text-amber-900">Deposit Required Before Scheduling</h2>
              <p className="text-sm text-amber-800 mt-1">
                Collect the deposit before converting this estimate into a job.
              </p>
              <p className="text-sm font-semibold text-amber-900 mt-2">
                Deposit due: {fmt(depositAmount)}
              </p>
            </div>
            <form action={payDeposit}>
              <input type="hidden" name="estimateId" value={est.id} />
              <button
                type="submit"
                className="px-6 py-3 rounded-xl font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors"
              >
                Collect Deposit
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Subtotals ── */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-surface-2 rounded-xl border border-border p-4">
          <p className="text-sm text-muted uppercase tracking-wider text-xs">Materials</p>
          <p className="font-display text-xl font-bold text-text">{fmt(est.materials_subtotal)}</p>
        </div>
        <div className="bg-surface-2 rounded-xl border border-border p-4">
          <p className="text-sm text-muted uppercase tracking-wider text-xs">Labor</p>
          <p className="font-display text-xl font-bold text-text">{fmt(est.labor_subtotal)}</p>
        </div>
      </div>

      {/* ── Line Items Table ── */}
      <div className="bg-surface-2 rounded-xl border border-border overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="font-semibold text-text">
            Material Line Items ({materialItems.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-3 text-muted text-left">
              <tr>
                <th className="px-4 py-2 font-semibold uppercase tracking-wider text-xs">Item</th>
                <th className="px-4 py-2 font-semibold text-right uppercase tracking-wider text-xs">Qty</th>
                <th className="px-4 py-2 font-semibold text-right uppercase tracking-wider text-xs">
                  Unit Cost
                </th>
                <th className="px-4 py-2 font-semibold text-right uppercase tracking-wider text-xs">
                  Unit Price
                </th>
                <th className="px-4 py-2 font-semibold text-right uppercase tracking-wider text-xs">
                  Ext. Price
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {materialItems.map(
                (li: {
                  id: string;
                  description: string;
                  quantity: number;
                  unit: string;
                  unit_cost: number;
                  unit_price: number;
                  extended_price: number;
                }) => (
                  <tr key={li.id} className="hover:bg-surface-3 transition-colors duration-150">
                    <td className="px-4 py-2.5 text-text">{li.description}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-text">
                      {li.quantity} {li.unit}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted font-mono">
                      {fmt(li.unit_cost)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-text font-mono">
                      {fmt(li.unit_price)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-display font-semibold text-text">
                      {fmt(li.extended_price)}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        {laborItems.length > 0 && (
          <>
            <div className="px-5 py-3 border-t border-b border-border bg-surface-3">
              <h3 className="font-semibold text-text text-sm">Labor</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border">
                  {laborItems.map(
                    (li: {
                      id: string;
                      description: string;
                      quantity: number;
                      extended_price: number;
                    }) => (
                      <tr key={li.id} className="hover:bg-surface-3 transition-colors duration-150">
                        <td className="px-4 py-2.5 text-text">{li.description}</td>
                        <td className="px-4 py-2.5 text-right font-display font-semibold text-text">
                          {fmt(li.extended_price)}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Converted banner */}
      {isConverted && (
        <div className="bg-surface-2 border border-accent/30 rounded-xl p-4 mb-6">
          <p className="text-sm font-semibold text-accent-light">
            This estimate has been converted to a job and is locked.
          </p>
          {linkedJobId && (
            <Link
              href={`/dashboard/jobs/${linkedJobId}`}
              className="inline-block mt-2 bg-accent hover:bg-accent-light accent-glow text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors duration-150"
            >
              View Job
            </Link>
          )}
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Re-quote (for expired estimates) */}
        {est.status === "expired" && (profile.role === "owner" || profile.role === "sales") && (
          <form action={reQuoteEstimate}>
            <input type="hidden" name="estimateId" value={est.id} />
            <button
              type="submit"
              className="px-6 py-3 rounded-xl font-semibold bg-accent hover:bg-accent-light accent-glow text-white transition-colors duration-150"
            >
              Re-quote
            </button>
          </form>
        )}

        {/* Edit (only for drafts) */}
        {est.status === "draft" && (
          <Link
            href={`/dashboard/estimates/new?edit=${est.id}`}
            className="flex-1 text-center bg-accent hover:bg-accent-light accent-glow text-white py-3 rounded-xl font-semibold transition-colors duration-150"
          >
            Edit Estimate
          </Link>
        )}

        {/* Share with Customer — shown when quoted and has token */}
        {est.status === "quoted" && est.accept_token && (
          <div>
            <ShareEstimatePanel
              estimateId={est.id}
              acceptToken={est.accept_token}
              customerEmail={
                (customerRecord as { email?: string } | null)?.email
              }
            />
            {est.last_sent_at && (
              <p className="text-xs text-muted mt-2 px-1">
                Last sent to: <span className="text-text">{est.last_sent_to || "\u2014"}</span> on{" "}
                {new Date(est.last_sent_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            )}
          </div>
        )}

        {/* Send Quote — requires margin OK AND customer assigned */}
        {est.status === "draft" && (
          <form action={sendQuote} className="flex-1">
            <input type="hidden" name="estimateId" value={est.id} />
            <button
              type="submit"
              disabled={!marginOk || missingCustomer}
              className={`w-full py-3 rounded-xl font-semibold transition-colors duration-150 ${
                marginOk && !missingCustomer
                  ? "bg-accent hover:bg-accent-light accent-glow text-white"
                  : "bg-surface-3 text-muted cursor-not-allowed"
              }`}
            >
              {missingCustomer
                ? "Assign Customer to Quote"
                : marginOk
                  ? "Send Quote"
                  : "Margin Too Low \u2014 Cannot Quote"}
            </button>
          </form>
        )}

        {/* Convert to Job — visible when status allows, disabled without customer */}
        {est.status === "deposit_paid" && (
          canConvert ? (
            <form action={convertToJob} className="flex-1">
              <input type="hidden" name="estimateId" value={est.id} />
              <button
                type="submit"
                className="w-full py-3 rounded-xl font-semibold bg-accent hover:bg-accent-light accent-glow text-white transition-colors duration-150"
              >
                Convert to Job
              </button>
            </form>
          ) : (
            <a
              href="#customer-warning"
              className="flex-1 block w-full py-3 rounded-xl font-semibold bg-surface-3 text-muted cursor-not-allowed text-center text-sm"
            >
              Assign Customer to Convert
            </a>
          )
        )}

      {/* Download PDF — always available once quoted */}
        {(est.status !== "draft") && (
          <a
            href={`/api/pdf/estimate/${est.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-xl font-semibold text-accent-light border border-accent/30 hover:bg-accent/10 hover:text-accent transition-colors duration-150 text-center text-sm"
          >
            &darr; PDF
          </a>
        )}

        {/* Duplicate Estimate */}
        {(profile.role === "owner" || profile.role === "sales") && (
          <form action={duplicateEstimate.bind(null, est.id)}>
            <button
              type="submit"
              className="px-6 py-3 rounded-xl font-semibold text-accent-light border border-accent/30 hover:bg-accent/10 hover:text-accent transition-colors duration-150"
            >
              Duplicate
            </button>
          </form>
        )}

        {/* Delete (owner only, not converted) */}
        {profile.role === "owner" && !isConverted && (
          <form action={deleteEstimate}>
            <input type="hidden" name="estimateId" value={est.id} />
            <button
              type="submit"
              className="px-6 py-3 rounded-xl font-semibold text-danger border border-danger/30 hover:bg-danger/10 transition-colors duration-150"
            >
              Delete
            </button>
          </form>
        )}
      </div>
    </>
  );
}
