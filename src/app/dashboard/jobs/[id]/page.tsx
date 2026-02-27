import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { canAccess } from "@/lib/roles";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  assignForeman,
  updateScheduledDate,
  transitionJobStatus,
} from "../actions";

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
  scheduled: "bg-yellow-100 text-yellow-700",
  active: "bg-blue-100 text-blue-700",
  complete: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default async function JobDetailPage({
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
  if (!canAccess(profile.role, "jobs")) redirect("/dashboard");

  // Load job with estimate + customer
  const { data: job, error } = await supabase
    .from("jobs")
    .select(
      "*, customers(name, phone, address, city, state), estimates(fence_type, linear_feet, gate_count, title)"
    )
    .eq("id", id)
    .eq("org_id", profile.org_id)
    .single();

  if (error || !job) notFound();

  // Load line items
  const { data: lineItems } = await supabase
    .from("job_line_items")
    .select("*")
    .eq("job_id", id)
    .order("created_at");

  const items = lineItems ?? [];
  const materialItems = items.filter(
    (li: { type: string }) => li.type === "material"
  );
  const laborItems = items.filter(
    (li: { type: string }) => li.type === "labor"
  );

  // Load foremen for dropdown (owner/sales only)
  let foremen: { id: string; full_name: string | null; email: string }[] =
    [];
  if (profile.role === "owner" || profile.role === "sales") {
    const { data } = await supabase
      .from("users")
      .select("id, full_name, email")
      .eq("org_id", profile.org_id)
      .in("role", ["foreman", "owner"]);
    foremen = data ?? [];
  }

  // Load assigned foreman name
  let foremanName = "Unassigned";
  if (job.assigned_foreman_id) {
    const { data: fm } = await supabase
      .from("users")
      .select("full_name, email")
      .eq("id", job.assigned_foreman_id)
      .single();
    foremanName = fm?.full_name || fm?.email || "Unknown";
  }

  const customer = (
    job.customers as unknown as {
      name: string;
      phone: string | null;
      address: string | null;
      city: string | null;
      state: string | null;
    }[]
  )?.[0];
  const est = (
    job.estimates as unknown as {
      fence_type: string;
      linear_feet: number;
      gate_count: number;
      title: string;
    }[]
  )?.[0];

  const canManage = profile.role === "owner" || profile.role === "sales";
  const isForeman = profile.role === "foreman";

  return (
    <>
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link
          href="/dashboard/jobs"
          className="text-sm text-fence-600 hover:text-fence-800 font-medium"
        >
          &larr; Back to Jobs
        </Link>
      </div>

      {/* Title + Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-fence-900">
            {customer?.name || "Job"}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {est?.fence_type?.replace("_", " ") || "—"} &middot;{" "}
            {est?.linear_feet || 0} ft
            {(est?.gate_count ?? 0) > 0 &&
              ` · ${est.gate_count} gate(s)`}
          </p>
        </div>
        <span
          className={`self-start text-xs px-3 py-1 rounded-full font-semibold ${
            STATUS_STYLES[job.status] || "bg-gray-100 text-gray-600"
          }`}
        >
          {job.status.toUpperCase()}
        </span>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Price</p>
          <p className="text-xl font-bold">{fmt(job.total_price)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Cost</p>
          <p className="text-xl font-bold">{fmt(job.total_cost)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Gross Profit</p>
          <p className="text-xl font-bold">{fmt(job.gross_profit)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Margin</p>
          <p className="text-xl font-bold text-green-600">
            {fmtPct(job.gross_margin_pct)}
          </p>
        </div>
      </div>

      {/* Customer Info */}
      {customer && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <h2 className="font-semibold text-fence-900 mb-2">Customer</h2>
          <p className="text-sm">{customer.name}</p>
          {customer.phone && (
            <p className="text-sm text-gray-500">{customer.phone}</p>
          )}
          {customer.address && (
            <p className="text-sm text-gray-500">
              {customer.address}
              {customer.city && `, ${customer.city}`}
              {customer.state && ` ${customer.state}`}
            </p>
          )}
        </div>
      )}

      {/* Foreman + Schedule (owner/sales only) */}
      {canManage && job.status !== "complete" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Assign Foreman */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-fence-900 mb-2 text-sm">
              Assigned Foreman
            </h3>
            <form action={assignForeman}>
              <input type="hidden" name="jobId" value={job.id} />
              <select
                name="foremanId"
                defaultValue={job.assigned_foreman_id || ""}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm mb-2"
              >
                <option value="">Unassigned</option>
                {foremen.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.full_name || f.email}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="w-full bg-fence-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-fence-700 transition-colors"
              >
                Update Foreman
              </button>
            </form>
          </div>

          {/* Schedule Date */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-fence-900 mb-2 text-sm">
              Scheduled Date
            </h3>
            <form action={updateScheduledDate}>
              <input type="hidden" name="jobId" value={job.id} />
              <input
                type="date"
                name="scheduledDate"
                defaultValue={job.scheduled_date || ""}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm mb-2"
              />
              <button
                type="submit"
                className="w-full bg-fence-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-fence-700 transition-colors"
              >
                Update Date
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Foreman read-only info */}
      {isForeman && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Foreman</p>
            <p className="font-semibold">{foremanName}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Scheduled</p>
            <p className="font-semibold">
              {job.scheduled_date
                ? new Date(
                    job.scheduled_date + "T00:00:00"
                  ).toLocaleDateString()
                : "Not scheduled"}
            </p>
          </div>
        </div>
      )}

      {/* Material Line Items (read-only snapshot) */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-fence-900">
            Materials ({materialItems.length})
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
                  name: string;
                  qty: number;
                  unit: string;
                  unit_cost: number;
                  unit_price: number;
                  extended_price: number;
                }) => (
                  <tr key={li.id}>
                    <td className="px-4 py-2.5">{li.name}</td>
                    <td className="px-4 py-2.5 text-right">
                      {li.qty} {li.unit}
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
              <h3 className="font-semibold text-fence-900 text-sm">
                Labor
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {laborItems.map(
                    (li: {
                      id: string;
                      name: string;
                      extended_price: number;
                    }) => (
                      <tr key={li.id}>
                        <td className="px-4 py-2.5">{li.name}</td>
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

      {/* Status Transition Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Foreman: Start Job */}
        {isForeman && job.status === "scheduled" && (
          <form action={transitionJobStatus} className="flex-1">
            <input type="hidden" name="jobId" value={job.id} />
            <input type="hidden" name="newStatus" value="active" />
            <button
              type="submit"
              className="w-full py-3 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Start Job
            </button>
          </form>
        )}

        {/* Owner/Sales: Start Job */}
        {canManage && job.status === "scheduled" && (
          <form action={transitionJobStatus} className="flex-1">
            <input type="hidden" name="jobId" value={job.id} />
            <input type="hidden" name="newStatus" value="active" />
            <button
              type="submit"
              className="w-full py-3 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Start Job
            </button>
          </form>
        )}

        {/* Owner/Sales: Complete Job */}
        {canManage && job.status === "active" && (
          <form action={transitionJobStatus} className="flex-1">
            <input type="hidden" name="jobId" value={job.id} />
            <input type="hidden" name="newStatus" value="complete" />
            <button
              type="submit"
              className="w-full py-3 rounded-xl font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              Mark Complete
            </button>
          </form>
        )}

        {/* Link back to estimate */}
        <Link
          href={`/dashboard/estimates/${job.estimate_id}`}
          className="flex-1 text-center py-3 rounded-xl font-semibold border border-gray-200 text-fence-600 hover:bg-gray-50 transition-colors"
        >
          View Estimate
        </Link>
      </div>
    </>
  );
}
