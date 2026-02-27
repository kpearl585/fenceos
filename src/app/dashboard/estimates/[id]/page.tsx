import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { canAccess } from "@/lib/roles";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { sendQuote, deleteEstimate, convertToJob } from "../actions";
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
    .select("*, customers(name)")
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
            {((est.customers as unknown as { name: string }[] | null)?.[0]?.name) ||
              "No customer"}{" "}
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

        {/* Send Quote */}
        {est.status === "draft" && (
          <form action={sendQuote} className="flex-1">
            <input type="hidden" name="estimateId" value={est.id} />
            <button
              type="submit"
              disabled={!marginOk}
              className={`w-full py-3 rounded-xl font-semibold transition-colors ${
                marginOk
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {marginOk ? "Send Quote" : "Margin Too Low — Cannot Quote"}
            </button>
          </form>
        )}

        {/* Convert to Job (deposit_paid or quoted legacy) — requires customer */}
        {est.customer_id &&
          (est.status === "deposit_paid" || (est.status === "quoted" && !est.deposit_required_amount)) && (
          <form action={convertToJob} className="flex-1">
            <input type="hidden" name="estimateId" value={est.id} />
            <button
              type="submit"
              className="w-full py-3 rounded-xl font-semibold bg-fence-600 text-white hover:bg-fence-700 transition-colors"
            >
              Convert to Job
            </button>
          </form>
        )}

        {/* Warning: cannot convert without customer */}
        {!est.customer_id && !isConverted &&
          (est.status === "deposit_paid" || est.status === "quoted") && (
          <div className="flex-1 py-3 px-4 rounded-xl border border-yellow-300 bg-yellow-50 text-yellow-800 text-sm text-center font-medium">
            Assign a customer before converting to a job.
          </div>
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
