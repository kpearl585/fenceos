import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import AcceptForm from "./AcceptForm";

/**
 * Public acceptance page — no auth required.
 * Validates token, shows estimate summary + legal terms + signature form.
 */

// Uses the canonical createClient from @/lib/supabase/server (anon key, cookie-aware).
// This is a public customer-facing page — no auth session required.
const createAnonClient = () => createClient();

export default async function AcceptPage({
  params,
}: {
  params: Promise<{ estimateId: string; token: string }>;
}) {
  const { estimateId, token } = await params;
  const supabase = await createAnonClient();

  // Validate token
  const { data: est } = (await supabase
    .from("estimates")
    .select(
      "id, title, status, total, fence_type, linear_feet, gate_count, " +
        "legal_terms_snapshot, payment_terms_snapshot, accept_token, " +
        "accepted_at, accepted_by_name, " +
        "customers(name, address, city, state), " +
        "organizations(name)"
    )
    .eq("id", estimateId)
    .eq("accept_token", token)
    .single()) as { data: any };

  if (!est) notFound();

  // Load line items (customer-facing only)
  const { data: lineItems } = await supabase
    .from("estimate_line_items")
    .select("description, quantity, unit, unit_price, extended_price, type")
    .eq("estimate_id", estimateId)
    .order("sort_order");

  const customer = (
    est.customers as unknown as {
      name: string;
      address: string | null;
      city: string | null;
      state: string | null;
    }[]
  )?.[0];

  const orgObj = est.organizations as unknown as { name: string } | { name: string }[] | null;
  const orgName =
    (Array.isArray(orgObj) ? orgObj[0]?.name : (orgObj as { name: string } | null)?.name) ||
    "Contractor";

  const fenceLabel = (est.fence_type || "standard")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c: string) => c.toUpperCase());

  // Expired estimate
  if (est.status === "expired") {
    return (
      <div className="relative min-h-screen bg-background text-text flex items-center justify-center p-4 overflow-hidden">
        <div className="absolute inset-0 grid-pattern pointer-events-none" />
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-danger/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative bg-surface-2 rounded-2xl border border-border max-w-lg w-full p-8 text-center">
          <div className="w-16 h-16 bg-danger/10 border border-danger/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-text mb-2">
            This Estimate Has Expired
          </h1>
          <p className="text-muted mb-4">
            This estimate is no longer valid. Estimates expire after 30 days.
          </p>
          <p className="text-text font-medium">
            Contact <strong className="text-accent-light">{orgName}</strong> to request a new quote.
          </p>
        </div>
      </div>
    );
  }

  // Already accepted
  if (est.status === "accepted" || est.status === "converted") {
    return (
      <div className="relative min-h-screen bg-background text-text flex items-center justify-center p-4 overflow-hidden">
        <div className="absolute inset-0 grid-pattern pointer-events-none" />
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-accent/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative bg-surface-2 rounded-2xl border border-accent/20 accent-glow max-w-lg w-full p-8 text-center">
          <div className="w-16 h-16 bg-accent/15 border border-accent/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-accent-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-text mb-2">
            Estimate Accepted
          </h1>
          <p className="text-muted mb-4">
            This estimate was accepted by{" "}
            <strong className="text-text">{est.accepted_by_name || "the customer"}</strong>
            {est.accepted_at &&
              ` on ${new Date(est.accepted_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}`}
            .
          </p>
          <p className="text-sm text-muted">
            No further action is required.
          </p>
        </div>
      </div>
    );
  }

  // Must be in 'quoted' status
  if (est.status !== "quoted") {
    return (
      <div className="relative min-h-screen bg-background text-text flex items-center justify-center p-4 overflow-hidden">
        <div className="absolute inset-0 grid-pattern pointer-events-none" />
        <div className="relative bg-surface-2 rounded-2xl border border-border max-w-lg w-full p-8 text-center">
          <h1 className="font-display text-2xl font-bold text-text mb-2">
            Estimate Not Available
          </h1>
          <p className="text-muted">
            This estimate is not currently available for acceptance. Please
            contact your contractor.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background text-text overflow-hidden">
      <div className="absolute inset-0 grid-pattern pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-accent/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-3xl mx-auto px-4 py-8">
        {/* Header — signature panel with accent glow */}
        <div className="bg-surface-2 rounded-2xl border border-accent/20 accent-glow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-muted uppercase tracking-wider">Estimate from</p>
              <h1 className="font-display text-xl font-bold text-text mt-1">{orgName}</h1>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted uppercase tracking-wider">Total</p>
              <p className="font-display text-3xl font-bold text-text mt-1">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                }).format(Number(est.total))}
              </p>
            </div>
          </div>
          <div className="border-t border-border pt-4">
            <h2 className="font-semibold text-text mb-1">{est.title}</h2>
            <p className="text-sm text-muted">
              {fenceLabel} · {est.linear_feet} ft
              {Number(est.gate_count) > 0 && ` · ${est.gate_count} gate(s)`}
            </p>
            {customer && (
              <p className="text-sm text-muted mt-1">
                {customer.name}
                {customer.address && ` — ${customer.address}`}
                {customer.city && `, ${customer.city}`}
                {customer.state && ` ${customer.state}`}
              </p>
            )}
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-surface-2 rounded-2xl border border-border overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold text-text">Estimate Details</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted border-b border-border text-xs uppercase tracking-wider">
                  <th className="text-left px-6 py-3 font-semibold">Item</th>
                  <th className="text-right px-4 py-3 font-semibold">Qty</th>
                  <th className="text-right px-4 py-3 font-semibold">Price</th>
                  <th className="text-right px-6 py-3 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(lineItems ?? []).map(
                  (
                    li: {
                      description: string;
                      quantity: number;
                      unit: string;
                      unit_price: number;
                      extended_price: number;
                    },
                    idx: number
                  ) => (
                    <tr key={idx} className="text-text">
                      <td className="px-6 py-3">{li.description}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        {li.quantity} {li.unit}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-muted">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                        }).format(Number(li.unit_price))}
                      </td>
                      <td className="px-6 py-3 text-right font-medium font-display">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                        }).format(Number(li.extended_price))}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border-strong bg-surface-3">
                  <td
                    colSpan={3}
                    className="px-6 py-3 text-right font-bold text-text"
                  >
                    Total
                  </td>
                  <td className="px-6 py-3 text-right font-bold font-display text-accent-light text-lg">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(Number(est.total))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Payment Terms */}
        {est.payment_terms_snapshot && (
          <div className="bg-surface-2 rounded-2xl border border-border p-6 mb-6">
            <h2 className="font-semibold text-text mb-3">Payment Terms</h2>
            <p className="text-sm text-muted whitespace-pre-wrap leading-relaxed">
              {est.payment_terms_snapshot}
            </p>
          </div>
        )}

        {/* Legal Terms */}
        {est.legal_terms_snapshot && (
          <div className="bg-surface-2 rounded-2xl border border-border p-6 mb-6">
            <h2 className="font-semibold text-text mb-3">
              Terms &amp; Conditions
            </h2>
            <div className="max-h-64 overflow-y-auto border border-border rounded-lg p-4 bg-surface-3">
              <p className="text-sm text-muted whitespace-pre-wrap leading-relaxed">
                {est.legal_terms_snapshot}
              </p>
            </div>
          </div>
        )}

        {/* Acceptance Form (Client Component) */}
        <AcceptForm estimateId={estimateId} token={token} />
      </div>
    </div>
  );
}
