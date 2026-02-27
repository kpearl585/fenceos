import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { canAccess } from "@/lib/roles";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { updateCustomer, deleteCustomer } from "../actions";

function fmt(v: number | string | null) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Number(v) || 0);
}

const EST_STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  quoted: "bg-blue-100 text-blue-700",
  sent: "bg-indigo-100 text-indigo-700",
  accepted: "bg-yellow-100 text-yellow-700",
  deposit_paid: "bg-green-100 text-green-700",
  converted: "bg-purple-100 text-purple-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-gray-100 text-gray-500",
};

const JOB_STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-yellow-100 text-yellow-700",
  active: "bg-blue-100 text-blue-700",
  complete: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default async function CustomerDetailPage({
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
  if (!canAccess(profile.role, "customers")) redirect("/dashboard");

  const { data: customer, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .eq("org_id", profile.org_id)
    .single();

  if (error || !customer) notFound();

  // Load related estimates
  const { data: estimates } = await supabase
    .from("estimates")
    .select("id, title, status, total, created_at")
    .eq("customer_id", id)
    .order("created_at", { ascending: false });

  // Load related jobs
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, status, total_price, scheduled_date")
    .eq("customer_id", id)
    .order("created_at", { ascending: false });

  const canEdit = profile.role === "owner" || profile.role === "sales";
  const canDelete = profile.role === "owner";
  const hasLinkedRecords =
    (estimates?.length ?? 0) > 0 || (jobs?.length ?? 0) > 0;

  return (
    <>
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link
          href="/dashboard/customers"
          className="text-sm text-fence-600 hover:text-fence-800 font-medium"
        >
          &larr; Back to Customers
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <h1 className="text-2xl font-bold text-fence-900">{customer.name}</h1>
        <div className="flex gap-2">
          {canEdit && (
            <Link
              href={`/dashboard/estimates/new`}
              className="bg-fence-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-fence-700 transition-colors"
            >
              + New Estimate
            </Link>
          )}
        </div>
      </div>

      {/* Customer Info Card + Edit Form */}
      {canEdit ? (
        <form
          action={updateCustomer}
          className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 mb-6"
        >
          <input type="hidden" name="customerId" value={customer.id} />
          <h2 className="font-semibold text-fence-900 mb-4">
            Customer Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                name="name"
                required
                defaultValue={customer.name}
                className="w-full border border-gray-300 rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-fence-500 focus:border-fence-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Phone
              </label>
              <input
                name="phone"
                type="tel"
                defaultValue={customer.phone || ""}
                className="w-full border border-gray-300 rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-fence-500 focus:border-fence-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Email
              </label>
              <input
                name="email"
                type="email"
                defaultValue={customer.email || ""}
                className="w-full border border-gray-300 rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-fence-500 focus:border-fence-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Address
              </label>
              <input
                name="address"
                defaultValue={customer.address || ""}
                className="w-full border border-gray-300 rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-fence-500 focus:border-fence-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                City
              </label>
              <input
                name="city"
                defaultValue={customer.city || ""}
                className="w-full border border-gray-300 rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-fence-500 focus:border-fence-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  State
                </label>
                <input
                  name="state"
                  maxLength={2}
                  defaultValue={customer.state || ""}
                  className="w-full border border-gray-300 rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-fence-500 focus:border-fence-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Zip
                </label>
                <input
                  name="zip"
                  defaultValue={customer.zip || ""}
                  className="w-full border border-gray-300 rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-fence-500 focus:border-fence-500"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                rows={2}
                defaultValue={customer.notes || ""}
                className="w-full border border-gray-300 rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-fence-500 focus:border-fence-500"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              className="bg-fence-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-fence-700 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="font-semibold text-fence-900 mb-3">
            Customer Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {customer.phone && (
              <div>
                <span className="text-gray-500">Phone:</span>{" "}
                <a
                  href={`tel:${customer.phone}`}
                  className="text-fence-700 hover:underline"
                >
                  {customer.phone}
                </a>
              </div>
            )}
            {customer.email && (
              <div>
                <span className="text-gray-500">Email:</span>{" "}
                <a
                  href={`mailto:${customer.email}`}
                  className="text-fence-700 hover:underline"
                >
                  {customer.email}
                </a>
              </div>
            )}
            {customer.address && (
              <div>
                <span className="text-gray-500">Address:</span>{" "}
                {customer.address}
                {customer.city && `, ${customer.city}`}
                {customer.state && ` ${customer.state}`}
                {customer.zip && ` ${customer.zip}`}
              </div>
            )}
            {customer.notes && (
              <div className="sm:col-span-2">
                <span className="text-gray-500">Notes:</span>{" "}
                {customer.notes}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Related Estimates */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-fence-900">
            Estimates ({estimates?.length ?? 0})
          </h2>
        </div>
        {estimates && estimates.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {estimates.map(
              (est: {
                id: string;
                title: string;
                status: string;
                total: number;
                created_at: string;
              }) => (
                <Link
                  key={est.id}
                  href={`/dashboard/estimates/${est.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {est.title}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(est.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                    <span className="text-sm font-semibold">
                      {fmt(est.total)}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${EST_STATUS_STYLES[est.status] || "bg-gray-100 text-gray-600"}`}
                    >
                      {est.status.replace("_", " ")}
                    </span>
                  </div>
                </Link>
              )
            )}
          </div>
        ) : (
          <p className="px-5 py-4 text-sm text-gray-400">
            No estimates for this customer.
          </p>
        )}
      </div>

      {/* Related Jobs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-fence-900">
            Jobs ({jobs?.length ?? 0})
          </h2>
        </div>
        {jobs && jobs.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {jobs.map(
              (job: {
                id: string;
                title: string;
                status: string;
                total_price: number;
                scheduled_date: string | null;
              }) => (
                <Link
                  key={job.id}
                  href={`/dashboard/jobs/${job.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {job.title}
                    </p>
                    <p className="text-xs text-gray-400">
                      {job.scheduled_date
                        ? `Scheduled: ${new Date(job.scheduled_date + "T00:00:00").toLocaleDateString()}`
                        : "Not scheduled"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                    <span className="text-sm font-semibold">
                      {fmt(job.total_price)}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${JOB_STATUS_STYLES[job.status] || "bg-gray-100 text-gray-600"}`}
                    >
                      {job.status.toUpperCase()}
                    </span>
                  </div>
                </Link>
              )
            )}
          </div>
        ) : (
          <p className="px-5 py-4 text-sm text-gray-400">
            No jobs for this customer.
          </p>
        )}
      </div>

      {/* Delete Customer (owner only, no linked records) */}
      {canDelete && (
        <div className="bg-white rounded-xl border border-red-200 p-4">
          <h2 className="font-semibold text-red-700 mb-2 text-sm">
            Danger Zone
          </h2>
          {hasLinkedRecords ? (
            <p className="text-sm text-gray-500">
              This customer has linked estimates or jobs and cannot be deleted.
              Remove or reassign those records first.
            </p>
          ) : (
            <form action={deleteCustomer}>
              <input type="hidden" name="customerId" value={customer.id} />
              <p className="text-sm text-gray-500 mb-3">
                Permanently delete this customer. This action cannot be undone.
              </p>
              <button
                type="submit"
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
              >
                Delete Customer
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
