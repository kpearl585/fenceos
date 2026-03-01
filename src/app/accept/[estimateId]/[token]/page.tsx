import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import AcceptForm from "./AcceptForm";

/**
 * Public acceptance page — no auth required.
 * Validates token, shows estimate summary + legal terms + signature form.
 */

async function createAnonClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server component — ignore
          }
        },
      },
    }
  );
}

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

  const orgName = (
    est.organizations as unknown as { name: string }[]
  )?.[0]?.name || "Contractor";

  const fenceLabel = (est.fence_type || "standard")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c: string) => c.toUpperCase());

  // Expired estimate
  if (est.status === "expired") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-lg w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">&#9203;</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            This Estimate Has Expired
          </h1>
          <p className="text-gray-600 mb-4">
            This estimate is no longer valid. Estimates expire after 30 days.
          </p>
          <p className="text-gray-600 font-medium">
            Contact <strong>{orgName}</strong> to request a new quote.
          </p>
        </div>
      </div>
    );
  }

  // Already accepted
  if (est.status === "accepted" || est.status === "converted") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-lg w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✓</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Estimate Accepted
          </h1>
          <p className="text-gray-600 mb-4">
            This estimate was accepted by{" "}
            <strong>{est.accepted_by_name || "the customer"}</strong>
            {est.accepted_at &&
              ` on ${new Date(est.accepted_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}`}
            .
          </p>
          <p className="text-sm text-gray-400">
            No further action is required.
          </p>
        </div>
      </div>
    );
  }

  // Must be in 'quoted' status
  if (est.status !== "quoted") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-lg w-full p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Estimate Not Available
          </h1>
          <p className="text-gray-600">
            This estimate is not currently available for acceptance. Please
            contact your contractor.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500">Estimate from</p>
              <h1 className="text-xl font-bold text-gray-900">{orgName}</h1>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-3xl font-bold text-gray-900">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                }).format(Number(est.total))}
              </p>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-4">
            <h2 className="font-semibold text-gray-900 mb-1">{est.title}</h2>
            <p className="text-sm text-gray-600">
              {fenceLabel} · {est.linear_feet} ft
              {Number(est.gate_count) > 0 && ` · ${est.gate_count} gate(s)`}
            </p>
            {customer && (
              <p className="text-sm text-gray-500 mt-1">
                {customer.name}
                {customer.address && ` — ${customer.address}`}
                {customer.city && `, ${customer.city}`}
                {customer.state && ` ${customer.state}`}
              </p>
            )}
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Estimate Details</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-100 text-xs">
                  <th className="text-left px-6 py-3 font-medium">Item</th>
                  <th className="text-right px-4 py-3 font-medium">Qty</th>
                  <th className="text-right px-4 py-3 font-medium">Price</th>
                  <th className="text-right px-6 py-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
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
                    <tr key={idx}>
                      <td className="px-6 py-3">{li.description}</td>
                      <td className="px-4 py-3 text-right">
                        {li.quantity} {li.unit}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                        }).format(Number(li.unit_price))}
                      </td>
                      <td className="px-6 py-3 text-right font-medium">
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
                <tr className="border-t-2 border-gray-200">
                  <td
                    colSpan={3}
                    className="px-6 py-3 text-right font-bold text-gray-900"
                  >
                    Total
                  </td>
                  <td className="px-6 py-3 text-right font-bold text-gray-900 text-lg">
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
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-3">Payment Terms</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {est.payment_terms_snapshot}
            </p>
          </div>
        )}

        {/* Legal Terms */}
        {est.legal_terms_snapshot && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-3">
              Terms & Conditions
            </h2>
            <div className="max-h-64 overflow-y-auto border border-gray-100 rounded-lg p-4 bg-gray-50">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
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
