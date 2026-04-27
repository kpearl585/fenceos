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
  draft: "bg-surface-3 text-muted",
  quoted: "bg-info/15 text-info",
  sent: "bg-info/20 text-info",
  accepted: "bg-warning/15 text-warning",
  deposit_paid: "bg-accent/15 text-accent-light",
  converted: "bg-accent/20 text-accent-light",
  rejected: "bg-danger/15 text-danger",
  expired: "bg-surface-3 text-muted",
};

const JOB_STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-warning/15 text-warning",
  active: "bg-info/15 text-info",
  complete: "bg-accent/15 text-accent-light",
  cancelled: "bg-surface-3 text-muted",
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
    .select("id, title, status, total_price, scheduled_date, created_at")
    .eq("customer_id", id)
    .order("created_at", { ascending: false });

  const canEdit = profile.role === "owner" || profile.role === "sales";
  const canDelete = profile.role === "owner";
  const isOwner = profile.role === "owner";
  const allEstimates = estimates ?? [];
  const allJobs = jobs ?? [];
  const acceptedEstimates = allEstimates.filter((e: {status: string}) => ["approved", "accepted", "deposit_paid", "converted"].includes(e.status));
  const totalRevenue = allJobs.filter((j: {status: string; total_price: number | null}) => j.status === "complete").reduce((s: number, j: {status: string; total_price: number | null}) => s + (Number(j.total_price) || 0), 0);
  const allActivity: Array<{ created_at?: string | null }> = [...allEstimates, ...allJobs];
  const lastActivity = allActivity.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0];
  const hasLinkedRecords =
    (estimates?.length ?? 0) > 0 || (jobs?.length ?? 0) > 0;

  return (
    <>
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link
          href="/dashboard/customers"
          className="text-sm text-accent-light hover:text-accent font-medium"
        >
          &larr; Back to Customers
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <h1 className="text-2xl font-bold text-text">{customer.name}</h1>
        <div className="flex gap-2">
          {canEdit && (
            <Link
              href={`/dashboard/estimates/new?customerId=${customer.id}`}
              className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-accent-light transition-colors"
            >
              + New Estimate
            </Link>
          )}
        </div>
      </div>


      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-surface rounded-xl border border-border p-4 shadow-sm">
          <p className="text-xs text-muted uppercase tracking-wide mb-1">Total Estimates</p>
          <p className="text-2xl font-bold text-text">{allEstimates.length}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4 shadow-sm">
          <p className="text-xs text-muted uppercase tracking-wide mb-1">Accepted</p>
          <p className="text-2xl font-bold text-accent-light">{acceptedEstimates.length}</p>
        </div>
        {isOwner && (
          <div className="bg-surface rounded-xl border border-border p-4 shadow-sm">
            <p className="text-xs text-muted uppercase tracking-wide mb-1">Revenue</p>
            <p className="text-2xl font-bold text-text">{fmt(totalRevenue)}</p>
          </div>
        )}
        <div className="bg-surface rounded-xl border border-border p-4 shadow-sm">
          <p className="text-xs text-muted uppercase tracking-wide mb-1">Last Activity</p>
          <p className="text-sm font-semibold text-text mt-1">
            {lastActivity?.created_at ? new Date(lastActivity.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
          </p>
        </div>
      </div>

      {/* Customer Info Card + Edit Form */}
      {canEdit ? (
        <form
          action={updateCustomer}
          className="bg-surface rounded-xl border border-border p-5 sm:p-6 mb-6"
        >
          <input type="hidden" name="customerId" value={customer.id} />
          <h2 className="font-semibold text-text mb-4">
            Customer Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                name="name"
                required
                defaultValue={customer.name}
                className="w-full border border-border bg-surface-3 text-text rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-accent/40 focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                Phone
              </label>
              <input
                name="phone"
                type="tel"
                defaultValue={customer.phone || ""}
                className="w-full border border-border bg-surface-3 text-text rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-accent/40 focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                Email
              </label>
              <input
                name="email"
                type="email"
                defaultValue={customer.email || ""}
                className="w-full border border-border bg-surface-3 text-text rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-accent/40 focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                Address
              </label>
              <input
                name="address"
                defaultValue={customer.address || ""}
                className="w-full border border-border bg-surface-3 text-text rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-accent/40 focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                City
              </label>
              <input
                name="city"
                defaultValue={customer.city || ""}
                className="w-full border border-border bg-surface-3 text-text rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-accent/40 focus:border-accent"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                  <label className="block text-xs font-medium text-muted mb-1">
                  State
                </label>
                <input
                  name="state"
                  maxLength={2}
                  defaultValue={customer.state || ""}
                  className="w-full border border-border bg-surface-3 text-text rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-accent/40 focus:border-accent"
                />
              </div>
              <div>
                  <label className="block text-xs font-medium text-muted mb-1">
                  Zip
                </label>
                <input
                  name="zip"
                  defaultValue={customer.zip || ""}
                  className="w-full border border-border bg-surface-3 text-text rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-accent/40 focus:border-accent"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-muted mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                rows={2}
                defaultValue={customer.notes || ""}
                className="w-full border border-border bg-surface-3 text-text rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-accent/40 focus:border-accent"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              className="bg-accent text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-accent-light transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-surface rounded-xl border border-border p-5 mb-6">
          <h2 className="font-semibold text-text mb-3">
            Customer Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {customer.phone && (
              <div>
                <span className="text-muted">Phone:</span>{" "}
                <a
                  href={`tel:${customer.phone}`}
                  className="text-accent-light hover:underline"
                >
                  {customer.phone}
                </a>
              </div>
            )}
            {customer.email && (
              <div>
                <span className="text-muted">Email:</span>{" "}
                <a
                  href={`mailto:${customer.email}`}
                  className="text-accent-light hover:underline"
                >
                  {customer.email}
                </a>
              </div>
            )}
            {customer.address && (
              <div>
                <span className="text-muted">Address:</span>{" "}
                {customer.address}
                {customer.city && `, ${customer.city}`}
                {customer.state && ` ${customer.state}`}
                {customer.zip && ` ${customer.zip}`}
              </div>
            )}
            {customer.notes && (
              <div className="sm:col-span-2">
                <span className="text-muted">Notes:</span>{" "}
                {customer.notes}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Related Estimates */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="font-semibold text-text">
            Estimates ({estimates?.length ?? 0})
          </h2>
        </div>
        {estimates && estimates.length > 0 ? (
          <div className="divide-y divide-border">
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
                  className="flex items-center justify-between px-5 py-3 hover:bg-surface-2 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text truncate">
                      {est.title}
                    </p>
                    <p className="text-xs text-muted">
                      {new Date(est.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                    <span className="text-sm font-semibold">
                      {fmt(est.total)}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${EST_STATUS_STYLES[est.status] || "bg-surface-3 text-muted"}`}
                    >
                      {est.status.replace("_", " ")}
                    </span>
                  </div>
                </Link>
              )
            )}
          </div>
        ) : (
          <p className="px-5 py-4 text-sm text-muted">
            No estimates for this customer.
          </p>
        )}
      </div>

      {/* Related Jobs */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="font-semibold text-text">
            Jobs ({jobs?.length ?? 0})
          </h2>
        </div>
        {jobs && jobs.length > 0 ? (
          <div className="divide-y divide-border">
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
                  className="flex items-center justify-between px-5 py-3 hover:bg-surface-2 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text truncate">
                      {job.title}
                    </p>
                    <p className="text-xs text-muted">
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
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${JOB_STATUS_STYLES[job.status] || "bg-surface-3 text-muted"}`}
                    >
                      {job.status.toUpperCase()}
                    </span>
                  </div>
                </Link>
              )
            )}
          </div>
        ) : (
          <p className="px-5 py-4 text-sm text-muted">
            No jobs for this customer.
          </p>
        )}
      </div>

      {/* Delete Customer (owner only, no linked records) */}
      {canDelete && (
        <div className="bg-danger/10 rounded-xl border border-danger/30 p-4">
          <h2 className="font-semibold text-danger mb-2 text-sm">
            Danger Zone
          </h2>
          {hasLinkedRecords ? (
            <p className="text-sm text-muted">
              This customer has linked estimates or jobs and cannot be deleted.
              Remove or reassign those records first.
            </p>
          ) : (
            <form action={deleteCustomer}>
              <input type="hidden" name="customerId" value={customer.id} />
              <p className="text-sm text-muted mb-3">
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
