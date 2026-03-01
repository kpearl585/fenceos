import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { canAccess } from "@/lib/roles";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { sendQuote, deleteEstimate, convertToJob, duplicateEstimate } from "../actions";
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
  const marginOk = est.margin_status === "ok";
  const targetPct = Number(est.target_margin_pct) || 0.35;
  const missingCustomer = !est.customer_id;
  const canConvert =
    !missingCustomer &&
    (est.status === "deposit_paid" ||
      (est.status === "quoted" && !est.deposit_required_amount));

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
          className="text-sm text-fence-600 hover:text-fence-800 font-medium"
        >
          ← Back to Estimates
        </Link>
      </div>

      {/* Title + Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-fence-900">{est.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {(() => {
              const cust = (est.customers as unknown as { id: string; name: string }[] | null)?.[0];
              return cust ? (
                <Link href={`/dashboard/customers/${cust.id}`} className="text-fence-600 hover:text-fence-800 hover:underline">
                  {cust.name}
                </Link>
              ) : (
                <span className="text-orange-600 font-medium">No customer</span>
              );
            })()}{" "}
            · {est.fence_type?.replace("_", " ")} · {est.linear_feet} ft
            {est.gate_count > 0 && ` · ${est.gate_count} gate(s)`}
          </p>
        </div>
        <span
          className={`self-start text-xs px-3 py-1 rounded-full font-semibold ${
            isConverted
              ? "bg-purple-100 text-purple-700"
              : est.status === "deposit_paid"
                ? "bg-green-100 text-green-700"
                : est.status === "accepted"
                  ? "bg-yellow-100 text-yellow-700"
                  : isQuoted
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-700"
          }`}
        >
          {est.status === "deposit_paid" ? "DEPOSIT PAID" : est.status.toUpperCase()}
          {isQuoted &&
            est.quoted_at &&
            ` · ${new Date(est.quoted_at).toLocaleDateString()}`}
        </span>
      </div>

      {/* ── Missing Customer Warning (prominent, near top) ── */}
      {missingCustomer && !isConverted && (
        <div id="customer-warning" className="rounded-xl border-2 border-orange-400 bg-orange-50 p-4 sm:p-5 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-orange-500 text-xl flex-shrink-0">&#9888;</span>
            <div>
              <h2 className="font-bold text-orange-800">No Customer Assigned</h2>
              <p className="text-sm text-orange-700 mt-1">
                This estimate has no customer. You must assign a customer before
                you can send a quote or convert to a job.
              </p>
              {est.status === "draft" && (
                <Link
                  href={`/dashboard/estimates/new?edit=${est.id}`}
                  className="inline-block mt-3 bg-orange-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-orange-700 transition-colors"
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
        const cust = (est.customers as unknown as { id: string; name: string; phone: string | null; email: string | null; address: string | null; city: string | null; state: string | null }[] | null)?.[0];
        return cust ? (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold text-fence-900 text-sm">Customer</h2>
              <Link href={`/dashboard/customers/${cust.id}`} className="text-xs text-fence-600 hover:text-fence-800 font-medium">
                View Details →
              </Link>
            </div>
            <p className="text-sm font-medium">{cust.name}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-sm text-gray-500">
              {cust.phone && <span>{cust.phone}</span>}
              {cust.email && <span>{cust.email}</span>}
              {cust.address && (
                <span>{cust.address}{cust.city && `, ${cust.city}`}{cust.state && ` ${cust.state}`}</span>
              )}
            </div>
          </div>
        ) : null;
      })()}

      {/* ── Margin Preview Card ── */}
      <div
        className={`rounded-xl border-2 p-5 sm:p-6 mb-6 ${
          marginOk
            ? "border-green-200 bg-green-50"
            : "border-red-200 bg-red-50"
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg text-fence-900">Margin Preview</h2>
          <span
            className={`text-2xl font-bold ${
              marginOk ? "text-green-700" : "text-red-600"
            }`}
          >
            {fmtPct(est.gross_margin_pct)}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Total Price</p>
            <p className="font-bold text-lg">{fmt(est.total)}</p>
          </div>
          <div>
            <p className="text-gray-500">Est. Cost</p>
            <p className="font-bold text-lg">{fmt(est.estimated_cost)}</p>
          </div>
          <div>
            <p className="text-gray-500">Gross Profit</p>
            <p className="font-bold text-lg">{fmt(est.gross_profit)}</p>
          </div>
          <div>
            <p className="text-gray-500">Target Margin</p>
            <p className="font-bold text-lg">{fmtPct(targetPct)}</p>
          </div>
        </div>

        {!marginOk && (
          <div className="mt-4 bg-red-100 border border-red-300 rounded-lg p-3 text-sm text-red-800">
            <strong>Margin Guard:</strong> Gross margin is below your{" "}
            {fmtPct(targetPct)} target. Quote sending is blocked until margin
            meets the target.
          </div>
        )}
      </div>

      {/* ── Deposit Status ── */}
      {(est.status === "accepted" || est.status === "deposit_paid") && (
        <div
          className={`rounded-xl border-2 p-5 mb-6 ${
            est.deposit_paid
              ? "border-green-200 bg-green-50"
              : "border-yellow-200 bg-yellow-50"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-lg text-fence-900">
                {est.deposit_paid ? "Deposit Paid" : "Deposit Pending"}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                50% deposit:{" "}
                <strong>{fmt(est.deposit_required_amount)}</strong>
                {est.deposit_paid && est.deposit_paid_at && (
                  <span className="ml-2 text-green-700">
                    Paid {new Date(est.deposit_paid_at).toLocaleDateString()}
                  </span>
                )}
              </p>
            </div>
            {!est.deposit_paid && (
              <form action={payDeposit}>
                <input type="hidden" name="estimateId" value={est.id} />
                <button
                  type="submit"
                  className="bg-green-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-green-700 transition-colors text-sm"
                >
                  Pay Deposit
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Subtotals ── */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Materials</p>
          <p className="text-xl font-bold">{fmt(est.materials_subtotal)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Labor</p>
          <p className="text-xl font-bold">{fmt(est.labor_subtotal)}</p>
        </div>
      </div>

      {/* ── Line Items Table ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-fence-900">
            Material Line Items ({materialItems.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Item</th>
                <th className="px-4 py-2 font-medium text-right">Qty</th>
                <th className="px-4 py-2 font-medium text-right">
                  Unit Cost
                </th>
                <th className="px-4 py-2 font-medium text-right">
                  Unit Price
                </th>
                <th className="px-4 py-2 font-medium text-right">
                  Ext. Price
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
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
                  <tr key={li.id}>
                    <td className="px-4 py-2.5">{li.description}</td>
                    <td className="px-4 py-2.5 text-right">
                      {li.quantity} {li.unit}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-500">
                      {fmt(li.unit_cost)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {fmt(li.unit_price)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium">
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
            <div className="px-5 py-3 border-t border-b border-gray-100 bg-gray-50">
              <h3 className="font-semibold text-fence-900 text-sm">Labor</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {laborItems.map(
                    (li: {
                      id: string;
                      description: string;
                      quantity: number;
                      extended_price: number;
                    }) => (
                      <tr key={li.id}>
                        <td className="px-4 py-2.5">{li.description}</td>
                        <td className="px-4 py-2.5 text-right font-medium">
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
        <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4 mb-6">
          <p className="text-sm font-semibold text-purple-800">
            This estimate has been converted to a job and is locked.
          </p>
          {linkedJobId && (
            <Link
              href={`/dashboard/jobs/${linkedJobId}`}
              className="inline-block mt-2 bg-purple-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors"
            >
              View Job
            </Link>
          )}
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Edit (only for drafts) */}
        {est.status === "draft" && (
          <Link
            href={`/dashboard/estimates/new?edit=${est.id}`}
            className="flex-1 text-center bg-fence-600 text-white py-3 rounded-xl font-semibold hover:bg-fence-700 transition-colors"
          >
            Edit Estimate
          </Link>
        )}

        {/* Share with Customer — shown when quoted and has token */}
        {est.status === "quoted" && est.accept_token && (
          <ShareEstimatePanel
            estimateId={est.id}
            acceptToken={est.accept_token}
            customerEmail={
              (est.customers as unknown as { email?: string }[] | null)?.[0]?.email
            }
          />
        )}

        {/* Send Quote — requires margin OK AND customer assigned */}
        {est.status === "draft" && (
          <form action={sendQuote} className="flex-1">
            <input type="hidden" name="estimateId" value={est.id} />
            <button
              type="submit"
              disabled={!marginOk || missingCustomer}
              className={`w-full py-3 rounded-xl font-semibold transition-colors ${
                marginOk && !missingCustomer
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {missingCustomer
                ? "Assign Customer to Quote"
                : marginOk
                  ? "Send Quote"
                  : "Margin Too Low — Cannot Quote"}
            </button>
          </form>
        )}

        {/* Convert to Job — visible when status allows, disabled without customer */}
        {(est.status === "deposit_paid" || (est.status === "quoted" && !est.deposit_required_amount)) && (
          canConvert ? (
            <form action={convertToJob} className="flex-1">
              <input type="hidden" name="estimateId" value={est.id} />
              <button
                type="submit"
                className="w-full py-3 rounded-xl font-semibold bg-fence-600 text-white hover:bg-fence-700 transition-colors"
              >
                Convert to Job
              </button>
            </form>
          ) : (
            <a
              href="#customer-warning"
              className="flex-1 block w-full py-3 rounded-xl font-semibold bg-gray-200 text-gray-400 cursor-not-allowed text-center text-sm"
            >
              Assign Customer to Convert
            </a>
          )
        )}

        {/* Download PDF — always available for quoted/accepted estimates */}
        {(est.status !== "draft") && (
          <a
            href={`/api/pdf/estimate/${est.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-xl font-semibold text-fence-600 border border-fence-200 hover:bg-fence-50 transition-colors text-center text-sm"
          >
            ↓ PDF
          </a>
        )}

        {/* Duplicate Estimate */}
        {(profile.role === "owner" || profile.role === "sales") && (
          <form action={duplicateEstimate.bind(null, est.id)}>
            <button
              type="submit"
              className="px-6 py-3 rounded-xl font-semibold text-fence-700 border border-fence-200 hover:bg-fence-50 transition-colors"
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
              className="px-6 py-3 rounded-xl font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
            >
              Delete
            </button>
          </form>
        )}
      </div>
    </>
  );
}
