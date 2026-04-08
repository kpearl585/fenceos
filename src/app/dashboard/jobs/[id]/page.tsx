import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { canAccess } from "@/lib/roles";
import { redirect, notFound } from "next/navigation";
import { planHasJobs } from "@/lib/planLimits";
import { createAdminClient } from "@/lib/supabase/server";
import Link from "next/link";
import ChangeOrderForm from "@/components/jobs/ChangeOrderForm";
import MarkPaidModal from "@/components/jobs/MarkPaidModal";
import ActivityTimeline from "@/components/jobs/ActivityTimeline";
import {
  assignForeman,
  updateScheduledDate,
  transitionJobStatus,
} from "../actions";
import {
  initForemanData,
  toggleChecklistItem,
  verifyMaterial,
  addJobPhoto,
  deleteJobPhoto,
} from "../foremanActions";
import {
  submitChangeOrder,
  approveChangeOrderAction,
  rejectChangeOrderAction,
} from "../changeOrderActions";
import {
  requestMaterialVerification,
  approveMaterialVerification,
} from "./verifyActions";
import { getJobOutcome } from "../outcomeActions";
import JobOutcomeForm from "@/components/jobs/JobOutcomeForm";

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
const CO_STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default async function JobDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error: errorMsg } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);
  if (!canAccess(profile.role, "jobs")) redirect("/dashboard");

  // Plan gate (admin client — cannot fail open due to RLS)
  const adminForPlan = createAdminClient();
  const { data: orgForPlan } = await adminForPlan.from("organizations").select("plan").eq("id", profile.org_id).single();
  if (!planHasJobs(orgForPlan?.plan)) redirect("/dashboard/jobs");

  /*  data loading  */
  const { data: job, error } = await supabase
    .from("jobs")
    .select(
      "*, customers(name, email, phone, address, city, state), estimates(fence_type, linear_feet, gate_count, title, target_margin_pct)"
    )
    .eq("id", id)
    .eq("org_id", profile.org_id)
    .single();
  if (error || !job) notFound();

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

  let foremen: { id: string; full_name: string | null; email: string }[] = [];
  if (profile.role === "owner" || profile.role === "sales") {
    const { data } = await supabase
      .from("users")
      .select("id, full_name, email")
      .eq("org_id", profile.org_id)
      .in("role", ["foreman", "owner"]);
    foremen = data ?? [];
  }

  let foremanName = "Unassigned";
  let foremanEmail = "";
  if (job.assigned_foreman_id) {
    const { data: fm } = await supabase
      .from("users")
      .select("full_name, email")
      .eq("id", job.assigned_foreman_id)
      .single();
    foremanName = fm?.full_name || fm?.email || "Unknown";
    foremanEmail = fm?.email || "";
  }

  const { data: checklistItems } = await supabase
    .from("job_checklists")
    .select("*")
    .eq("job_id", id)
    .order("sort_order");
  const checklist = checklistItems ?? [];

  const { data: verificationItems } = await supabase
    .from("job_material_verifications")
    .select("*")
    .eq("job_id", id)
    .order("created_at");
  const verifications = verificationItems ?? [];

  const { data: photoItems } = await supabase
    .from("job_photos")
    .select("*")
    .eq("job_id", id)
    .order("created_at", { ascending: false });
  const photos = photoItems ?? [];

  const { data: changeOrderItems } = await supabase
    .from("change_orders")
    .select("*, change_order_line_items(*)")
    .eq("job_id", id)
    .order("created_at", { ascending: false });
  const changeOrders = changeOrderItems ?? [];

  // Fetch job outcome if job is complete
  const jobOutcome = job.status === "complete" ? await getJobOutcome(id) : null;

  let materialsCatalog: {
    sku: string;
    name: string;
    unit: string;
    unit_cost: number;
    unit_price: number;
  }[] = [];
  if (profile.role === "owner" || profile.role === "foreman") {
    const { data: mats } = await supabase
      .from("materials")
      .select("sku, name, unit, unit_cost, unit_price")
      .eq("org_id", profile.org_id)
      .order("name");
    materialsCatalog = mats ?? [];
  }

  /*  computed  */
  const customer = (
    job.customers as unknown as {
      name: string;
      email: string | null;
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
      target_margin_pct: number;
    }[]
  )?.[0];
  const targetMarginPct = Number(est?.target_margin_pct) || 0.35;

  const isOwner = profile.role === "owner";
  const canManage = isOwner || profile.role === "sales";
  const isForeman = profile.role === "foreman";
  const canExecute = profile.role === "owner" || profile.role === "foreman";
  const hasChecklist = checklist.length > 0;
  const hasVerifications = verifications.length > 0;

  const requiredIncomplete = checklist.filter(
    (c: { is_required: boolean; completed: boolean }) => c.is_required && !c.completed
  ).length;
  const allRequiredDone = requiredIncomplete === 0 && hasChecklist;
  const allMaterialsVerified =
    verifications.length > 0 &&
    verifications.every((v: { verified: boolean }) => v.verified);

  const photoUrls: Record<string, string> = {};
  for (const p of photos) {
    const { data } = supabase.storage
      .from("job-photos")
      .getPublicUrl(p.storage_path);
    photoUrls[p.id] = data.publicUrl;
  }

  const approvedCOs = changeOrders.filter(
    (co: { status: string }) => co.status === "approved"
  );
  const pendingCOs = changeOrders.filter(
    (co: { status: string }) => co.status === "pending"
  );

  // Typed accessors for columns added via migration (not in generated types)
  const invoiceUrl = (job as unknown as { invoice_url?: string | null }).invoice_url ?? null;
  const paidAt = (job as unknown as { paid_at?: string | null }).paid_at ?? null;

  /*  render  */
  return (
    <>
      {/* Breadcrumb + PDF */}
      <div className="mb-4 flex items-center justify-between">
        <Link href="/dashboard/jobs" className="text-sm text-fence-600 hover:text-fence-800 font-medium">
          &larr; Back to Jobs
        </Link>
        {canManage && job.estimate_id && (
          <a href={`/api/pdf/estimate/${job.estimate_id}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-fence-600 hover:text-fence-800 font-medium border border-fence-200 px-3 py-1.5 rounded-lg hover:bg-fence-50 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            Download PDF
          </a>
        )}
      </div>

      {/* Error message */}
      {errorMsg && (
        <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
           {decodeURIComponent(errorMsg)}
        </div>
      )}

      {/* Title + Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-fence-900">{customer?.name || "Job"}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {est?.fence_type?.replace("_", " ") || "—"} &middot; {est?.linear_feet || 0} ft
            {(est?.gate_count ?? 0) > 0 && ` · ${est.gate_count} gate(s)`}
            {job.estimate_id && (
              <Link href={`/dashboard/estimates/${job.estimate_id}`} className="ml-2 text-fence-500 hover:text-fence-700 underline">
                View Estimate
              </Link>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`text-xs px-3 py-1 rounded-full font-semibold ${STATUS_STYLES[job.status] || "bg-gray-100 text-gray-600"}`}>
            {job.status.toUpperCase()}
          </span>
          {job.status === "complete" && invoiceUrl && (
            <a
              href={invoiceUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-fence-600 text-white rounded-lg font-semibold hover:bg-fence-700 transition-colors"
            >
              View Invoice PDF
            </a>
          )}
        </div>
      </div>

      {/* Invoice Banner — shown when job is complete and invoice exists */}
      {job.status === "complete" && invoiceUrl && (
        <div className="mb-6 flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-green-800">Job Complete — Invoice Sent</p>
            <p className="text-xs text-green-600 mt-0.5">
              Invoice was emailed to the customer.
              {paidAt && ` Marked paid ${new Date(paidAt!).toLocaleDateString()}.`}
            </p>
          </div>
          <a
            href={invoiceUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 text-sm px-4 py-2 bg-green-700 text-white rounded-lg font-semibold hover:bg-green-800 transition-colors"
          >
            View Invoice PDF
          </a>
        </div>
      )}

      {/* Financial Summary — OWNER ONLY */}
      {isOwner && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Price</p>
            <p className="text-xl font-bold text-fence-900">{fmt(job.total_price)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Cost</p>
            <p className="text-xl font-bold text-fence-900">{fmt(job.total_cost)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Gross Profit</p>
            <p className="text-xl font-bold text-fence-900">{fmt(job.gross_profit)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Margin</p>
            <p className={`text-xl font-bold ${Number(job.gross_margin_pct) >= targetMarginPct ? "text-green-600" : "text-red-600"}`}>
              {fmtPct(job.gross_margin_pct)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Target: {fmtPct(targetMarginPct)}</p>
          </div>
        </div>
      )}

      {/* Job Outcome Tracker — OWNER ONLY, COMPLETE JOBS */}
      {isOwner && job.status === "complete" && (
        <JobOutcomeForm
          jobId={job.id}
          estimatedTotal={job.total_price || 0}
          existingOutcome={jobOutcome}
        />
      )}

      {/* Price + schedule for non-owners */}
      {!isOwner && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Job Value</p>
            <p className="text-xl font-bold text-fence-900">{fmt(job.total_price)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Scheduled</p>
            <p className="text-xl font-bold text-fence-900">
              {job.scheduled_date ? new Date(job.scheduled_date + "T00:00:00").toLocaleDateString() : "TBD"}
            </p>
          </div>
        </div>
      )}

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
      {/* Foreman + Schedule (owner/sales) */}
      {canManage && job.status !== "complete" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
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

      {/* Init Foreman Data */}
      {canExecute &&
        !hasChecklist &&
        !hasVerifications &&
        job.status !== "complete" && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-amber-800 mb-3">
              Checklist and material verifications have not been generated yet.
            </p>
            <form action={initForemanData}>
              <input type="hidden" name="jobId" value={job.id} />
              <button
                type="submit"
                className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-700 transition-colors"
              >
                Generate Checklist &amp; Verifications
              </button>
            </form>
          </div>
        )}

      {/* Material Verification */}
      {hasVerifications && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-fence-900">
              Material Verification (
              {
                verifications.filter(
                  (v: { verified: boolean }) => v.verified
                ).length
              }
              /{verifications.length})
            </h2>
            {allMaterialsVerified && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                All Verified
              </span>
            )}
          </div>
          <div className="divide-y divide-gray-100">
            {verifications.map(
              (v: {
                id: string;
                name: string;
                sku: string;
                required_qty: number;
                verified_qty: number | null;
                verified: boolean;
              }) => (
                <div key={v.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium ${v.verified ? "text-green-700" : "text-gray-900"}`}
                    >
                      {v.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      SKU: {v.sku} · Required: {v.required_qty}
                    </p>
                  </div>
                  {v.verified ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium whitespace-nowrap">
                       {v.verified_qty} verified
                    </span>
                  ) : canExecute && job.status !== "complete" ? (
                    <form
                      action={verifyMaterial}
                      className="flex items-center gap-2"
                    >
                      <input type="hidden" name="jobId" value={job.id} />
                      <input
                        type="hidden"
                        name="verificationId"
                        value={v.id}
                      />
                      <input
                        type="number"
                        name="verifiedQty"
                        defaultValue={v.required_qty}
                        min={0}
                        step="any"
                        className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-right"
                      />
                      <button
                        type="submit"
                        className="bg-fence-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-fence-700 transition-colors whitespace-nowrap"
                      >
                        Verify
                      </button>
                    </form>
                  ) : (
                    <span className="text-xs text-gray-400">Not verified</span>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Checklist */}
      {hasChecklist && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-fence-900">
              Checklist (
              {
                checklist.filter(
                  (c: { completed: boolean }) => c.completed
                ).length
              }
              /{checklist.length})
            </h2>
            {allRequiredDone && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                All Required Done
              </span>
            )}
          </div>
          <div className="divide-y divide-gray-100">
            {checklist.map(
              (c: {
                id: string;
                label: string;
                is_required: boolean;
                completed: boolean;
                item_key: string;
              }) => (
                <div key={c.id} className="px-5 py-3 flex items-center gap-3">
                  {canExecute && job.status !== "complete" ? (
                    <form action={toggleChecklistItem}>
                      <input type="hidden" name="jobId" value={job.id} />
                      <input type="hidden" name="itemId" value={c.id} />
                      <input
                        type="hidden"
                        name="completed"
                        value={c.completed ? "false" : "true"}
                      />
                      <button
                        type="submit"
                        className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${c.completed ? "bg-green-500 border-green-500 text-white" : "border-gray-300 hover:border-fence-500"}`}
                      >
                        {c.completed && <span className="text-xs"></span>}
                      </button>
                    </form>
                  ) : (
                    <div
                      className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${c.completed ? "bg-green-500 border-green-500 text-white" : "border-gray-300"}`}
                    >
                      {c.completed && <span className="text-xs"></span>}
                    </div>
                  )}
                  <div className="flex-1">
                    <span
                      className={`text-sm ${c.completed ? "line-through text-gray-400" : "text-gray-900"}`}
                    >
                      {c.label}
                    </span>
                    {c.is_required && !c.completed && (
                      <span className="ml-2 text-xs text-red-500 font-medium">
                        Required
                      </span>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Photos */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-fence-900">
            Photos ({photos.length})
          </h2>
        </div>
        {canExecute && job.status !== "complete" && (
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <form
              action={addJobPhoto}
              encType="multipart/form-data"
              className="flex flex-col sm:flex-row gap-2"
            >
              <input type="hidden" name="jobId" value={job.id} />
              <input
                type="file"
                name="photo"
                accept="image/jpeg,image/png,image/webp,image/heic"
                required
                className="flex-1 text-sm file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-fence-50 file:text-fence-700 hover:file:bg-fence-100"
              />
              <input
                type="text"
                name="caption"
                placeholder="Caption (optional)"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm sm:w-48"
              />
              <button
                type="submit"
                className="bg-fence-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-fence-700 transition-colors whitespace-nowrap"
              >
                Upload
              </button>
            </form>
          </div>
        )}
        {photos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
            {photos.map(
              (p: {
                id: string;
                caption: string | null;
                storage_path: string;
                created_at: string;
              }) => (
                <div key={p.id} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoUrls[p.id]}
                    alt={p.caption || "Job photo"}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  {p.caption && (
                    <p className="text-xs text-gray-600 mt-1 truncate">
                      {p.caption}
                    </p>
                  )}
                  <p className="text-xs text-gray-400">
                    {new Date(p.created_at).toLocaleDateString()}
                  </p>
                  {profile.role === "owner" && (
                    <form
                      action={deleteJobPhoto}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <input type="hidden" name="jobId" value={job.id} />
                      <input type="hidden" name="photoId" value={p.id} />
                      <button
                        type="submit"
                        className="bg-red-600 text-white w-6 h-6 rounded-full text-xs hover:bg-red-700"
                        title="Delete photo"
                      >
                        
                      </button>
                    </form>
                  )}
                </div>
              )
            )}
          </div>
        ) : (
          <p className="px-5 py-4 text-sm text-gray-400">
            No photos uploaded yet.
          </p>
        )}
      </div>
      {/*  CHANGE ORDERS  */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-fence-900">
            Change Orders ({changeOrders.length})
            {pendingCOs.length > 0 && (
              <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                {pendingCOs.length} pending
              </span>
            )}
          </h2>
        </div>

        {/* Existing Change Orders */}
        {changeOrders.length > 0 && (
          <div className="divide-y divide-gray-100">
            {changeOrders.map(
              (co: {
                id: string;
                status: string;
                reason: string | null;
                subtotal: number;
                cost_total: number;
                gross_profit: number;
                gross_margin_pct: number;
                created_at: string;
                change_order_line_items: {
                  id: string;
                  name: string;
                  type: string;
                  qty: number;
                  unit_price: number;
                  extended_price: number;
                  extended_cost: number;
                }[];
              }) => (
                <div key={co.id} className="px-5 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-semibold ${CO_STATUS_STYLES[co.status] || "bg-gray-100"}`}
                      >
                        {co.status.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(co.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{fmt(co.subtotal)}</p>
                      <p className="text-xs text-gray-500">
                        Cost: {fmt(co.cost_total)} · Margin:{" "}
                        {fmtPct(co.gross_margin_pct)}
                      </p>
                    </div>
                  </div>

                  {/* CO Line Items */}
                  {(co.change_order_line_items ?? []).length > 0 && (
                    <table className="w-full text-xs mb-2">
                      <thead>
                        <tr className="text-gray-400 border-b border-gray-100">
                          <th className="text-left py-1 font-medium">Item</th>
                          <th className="text-left py-1 font-medium">Type</th>
                          <th className="text-right py-1 font-medium">Qty</th>
                          <th className="text-right py-1 font-medium">Price</th>
                          <th className="text-right py-1 font-medium">Ext.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(co.change_order_line_items ?? []).map((li) => (
                          <tr key={li.id} className="border-b border-gray-50">
                            <td className="py-1">{li.name}</td>
                            <td className="py-1 text-gray-500">{li.type}</td>
                            <td className="py-1 text-right">{li.qty}</td>
                            <td className="py-1 text-right">
                              {fmt(li.unit_price)}
                            </td>
                            <td className="py-1 text-right">
                              {fmt(li.extended_price)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {co.reason && (
                    <p className="text-xs text-gray-500 italic mb-2">
                      {co.reason}
                    </p>
                  )}

                  {/* Approve / Reject (owner only, pending only) */}
                  {co.status === "pending" && profile.role === "owner" && (
                    <div className="flex gap-2 mt-2">
                      <form action={approveChangeOrderAction}>
                        <input
                          type="hidden"
                          name="changeOrderId"
                          value={co.id}
                        />
                        <input type="hidden" name="jobId" value={job.id} />
                        <button
                          type="submit"
                          className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors"
                        >
                          Approve
                        </button>
                      </form>
                      <form action={rejectChangeOrderAction}>
                        <input
                          type="hidden"
                          name="changeOrderId"
                          value={co.id}
                        />
                        <input type="hidden" name="jobId" value={job.id} />
                        <button
                          type="submit"
                          className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors"
                        >
                          Reject
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        )}

        {/* Add Change Order Form */}
        {canExecute &&
          job.status !== "complete" &&
          job.status !== "cancelled" && (
            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
              <h3 className="text-sm font-semibold text-fence-900 mb-3">
                Add Change Order
              </h3>
              <ChangeOrderForm
                jobId={job.id}
                materials={materialsCatalog.map((m) => ({
                  sku: m.sku ?? "",
                  name: m.name,
                  unit: m.unit,
                  unit_price: Number(m.unit_price) || 0,
                }))}
              />
            </div>
          )}

        {changeOrders.length === 0 &&
          !(
            canExecute &&
            job.status !== "complete" &&
            job.status !== "cancelled"
          ) && (
            <p className="px-5 py-4 text-sm text-gray-400">
              No change orders.
            </p>
          )}
      </div>
      {/* Materials Snapshot */}
      {materialItems.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-fence-900">
              Materials ({materialItems.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-100 text-xs">
                  <th className="text-left px-5 py-2 font-medium">Item</th>
                  <th className="text-right px-5 py-2 font-medium">Qty</th>
                  <th className="text-right px-5 py-2 font-medium">
                    Unit Price
                  </th>
                  <th className="text-right px-5 py-2 font-medium">
                    Ext. Price
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {materialItems.map(
                  (li: {
                    id: string;
                    name: string;
                    qty: number;
                    unit_price: number;
                    extended_price: number;
                    sku: string | null;
                  }) => (
                    <tr key={li.id}>
                      <td className="px-5 py-2">
                        {li.name}
                        {li.sku && (
                          <span className="ml-1 text-xs text-gray-400">
                            ({li.sku})
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-2 text-right">{li.qty}</td>
                      <td className="px-5 py-2 text-right">
                        {fmt(li.unit_price)}
                      </td>
                      <td className="px-5 py-2 text-right font-medium">
                        {fmt(li.extended_price)}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Labor Snapshot */}
      {laborItems.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-fence-900">
              Labor ({laborItems.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-100 text-xs">
                  <th className="text-left px-5 py-2 font-medium">
                    Description
                  </th>
                  <th className="text-right px-5 py-2 font-medium">Qty</th>
                  <th className="text-right px-5 py-2 font-medium">Rate</th>
                  <th className="text-right px-5 py-2 font-medium">
                    Ext. Price
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {laborItems.map(
                  (li: {
                    id: string;
                    name: string;
                    qty: number;
                    unit_price: number;
                    extended_price: number;
                  }) => (
                    <tr key={li.id}>
                      <td className="px-5 py-2">{li.name}</td>
                      <td className="px-5 py-2 text-right">{li.qty}</td>
                      <td className="px-5 py-2 text-right">
                        {fmt(li.unit_price)}
                      </td>
                      <td className="px-5 py-2 text-right font-medium">
                        {fmt(li.extended_price)}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Materials Verification Card */}
      {job.status === "scheduled" && (() => {
        const mvStatus = ((job as Record<string, unknown>).material_verification_status as string) || "pending";
        const jobAddr = [customer?.address, customer?.city, customer?.state].filter(Boolean).join(", ");
        const jobNameStr = customer?.name || "Job";

        async function handleApprove(fd: FormData) {
          "use server";
          await approveMaterialVerification(fd.get("jobId") as string);
        }
        async function handleRequestVerification(fd: FormData) {
          "use server";
          await requestMaterialVerification(
            fd.get("jobId") as string,
            fd.get("jobName") as string,
            fd.get("jobAddr") as string,
            fd.get("foremanEmail") as string
          );
        }

        return (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <h2 className="font-semibold text-fence-900 mb-3">Materials Verification</h2>
            {mvStatus === "foreman_approved" && (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg p-3 text-sm font-medium">
                <span></span><span>Materials verified — job cleared to start</span>
              </div>
            )}
            {mvStatus === "employee_confirmed" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm font-medium">
                  <span></span><span>Employee has confirmed materials loaded</span>
                </div>
                {canExecute && (
                  <form action={handleApprove}>
                    <input type="hidden" name="jobId" value={job.id} />
                    <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors">
                      Approve &amp; Clear to Start
                    </button>
                  </form>
                )}
              </div>
            )}
            {mvStatus === "rejected" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 text-sm font-medium">
                  <span></span><span>Material verification was rejected</span>
                </div>
                {canExecute && (
                  <form action={handleRequestVerification}>
                    <input type="hidden" name="jobId" value={job.id} />
                    <input type="hidden" name="jobName" value={jobNameStr} />
                    <input type="hidden" name="jobAddr" value={jobAddr} />
                    <input type="hidden" name="foremanEmail" value={foremanEmail} />
                    <button type="submit" className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-700 transition-colors">
                      Re-request Verification
                    </button>
                  </form>
                )}
              </div>
            )}
            {(mvStatus === "pending" || !mvStatus) && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                  <span>⏳</span><span>Awaiting material verification before job can start</span>
                </div>
                {canExecute && (
                  <div className="flex gap-2 flex-wrap">
                    <a
                      href={`/dashboard/jobs/${job.id}/verify-materials`}
                      className="bg-fence-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-fence-700 transition-colors"
                    >
                      Verify Materials Now →
                    </a>
                    {foremanEmail && (
                      <form action={handleRequestVerification}>
                        <input type="hidden" name="jobId" value={job.id} />
                        <input type="hidden" name="jobName" value={jobNameStr} />
                        <input type="hidden" name="jobAddr" value={jobAddr} />
                        <input type="hidden" name="foremanEmail" value={foremanEmail} />
                        <button type="submit" className="border border-fence-600 text-fence-600 hover:bg-fence-50 px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                          Send Verification Request Email
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Final Invoice Section */}
      {(job.status === "active" || job.status === "complete") && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="font-semibold text-fence-900 mb-4 text-base">Final Invoice</h2>

          {/* Original Estimate Line Items */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Original Estimate</p>
            <div className="rounded-lg border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs text-gray-500 font-semibold">Item</th>
                    <th className="text-right px-3 py-2 text-xs text-gray-500 font-semibold">Qty</th>
                    <th className="text-right px-3 py-2 text-xs text-gray-500 font-semibold">Unit Price</th>
                    <th className="text-right px-3 py-2 text-xs text-gray-500 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {materialItems.length === 0 ? (
                    <tr><td colSpan={4} className="px-3 py-3 text-gray-400 text-xs text-center">No line items</td></tr>
                  ) : (
                    materialItems.map((item: { id: string; name: string; qty: number; unit: string; unit_price: number; extended_price: number }) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 text-gray-800">{item.name}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{item.qty} {item.unit}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{fmt(item.unit_price)}</td>
                        <td className="px-3 py-2 text-right font-medium text-gray-800">{fmt(item.extended_price)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Approved Change Orders */}
          {approvedCOs.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Approved Change Orders</p>
              {approvedCOs.map((co: { id: string; reason?: string; description?: string; subtotal: number; change_order_line_items?: { id?: string; name: string; qty: number; unit_price: number; extended_price: number }[] }) => (
                <div key={co.id} className="rounded-lg border border-amber-100 bg-amber-50 overflow-hidden mb-2">
                  <div className="px-3 py-2 border-b border-amber-100">
                    <p className="text-xs font-semibold text-amber-800">{co.reason || co.description || "Change Order"}</p>
                  </div>
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-amber-100">
                      {(Array.isArray(co.change_order_line_items) ? co.change_order_line_items : []).map((li, idx) => (
                        <tr key={li.id ?? idx}>
                          <td className="px-3 py-2 text-gray-800">{li.name}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{li.qty}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{fmt(li.unit_price)}</td>
                          <td className="px-3 py-2 text-right font-medium text-gray-800">{fmt(li.extended_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-3 py-2 text-right text-xs font-semibold text-amber-800 border-t border-amber-100">
                    CO Subtotal: {fmt(co.subtotal)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Invoice Total */}
          <div className="flex justify-end border-t border-gray-200 pt-3 mb-4">
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Due</p>
              <p className="text-2xl font-bold text-fence-900">{fmt(job.total_price)}</p>
            </div>
          </div>

          {/* Action */}
          {job.status === "active" && canExecute && (
            <div>
              <MarkPaidModal
                jobId={job.id}
                jobTitle={job.title}
                totalDue={Number(job.total_price ?? 0)}
                customerEmail={customer?.email ?? undefined}
              />
              <p className="text-xs text-gray-400 mt-2">Marks job complete, generates PDF invoice, and emails the customer.</p>
            </div>
          )}
          {job.status === "complete" && invoiceUrl && (
            <a
              href={invoiceUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm px-4 py-2 bg-fence-600 text-white rounded-lg font-semibold hover:bg-fence-700 transition-colors"
            >
              Download Invoice PDF
            </a>
          )}
        </div>
      )}

      {/* Status Transitions */}
      {job.status !== "complete" && job.status !== "cancelled" && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <h2 className="font-semibold text-fence-900 mb-3">Job Actions</h2>
          <div className="flex flex-wrap gap-2">
            {job.status === "scheduled" && canExecute && (
              <form action={transitionJobStatus}>
                <input type="hidden" name="jobId" value={job.id} />
                <input type="hidden" name="newStatus" value="active" />
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  Start Job
                </button>
              </form>
            )}
            {canManage && (
              <form action={transitionJobStatus}>
                <input type="hidden" name="jobId" value={job.id} />
                <input type="hidden" name="newStatus" value="cancelled" />
                <button
                  type="submit"
                  className="bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-500 transition-colors"
                >
                  Cancel Job
                </button>
              </form>
            )}
          </div>
          {!allMaterialsVerified && job.status === "scheduled" && (
            <p className="text-xs text-amber-600 mt-2">
              All materials must be verified before starting.
            </p>
          )}
        </div>
      )}

      {/*  Activity Timeline  */}
      <div className="mt-6">
        <ActivityTimeline
          jobCreatedAt={job.created_at}
          jobStatus={job.status}
          scheduledDate={job.scheduled_date}
        />
      </div>
    </>
  );
}
