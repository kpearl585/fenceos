import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { canAccess } from "@/lib/roles";
import { redirect, notFound } from "next/navigation";
import { planHasJobs } from "@/lib/planLimits";
import { createAdminClient } from "@/lib/supabase/server";
import Link from "next/link";
import ChangeOrderForm from "@/components/jobs/ChangeOrderForm";
import GenerateDocsPanel from "@/components/jobs/GenerateDocsPanel";
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

const INPUT_CLASS =
  "w-full border border-border bg-surface-3 text-text rounded-lg px-3 py-2.5 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-150";

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-warning/15 text-warning",
  active: "bg-accent/15 text-accent-light",
  complete: "bg-accent text-white",
  cancelled: "bg-surface-3 text-muted",
};
const CO_STATUS_STYLES: Record<string, string> = {
  pending: "bg-warning/15 text-warning",
  approved: "bg-accent/15 text-accent-light",
  rejected: "bg-danger/15 text-danger",
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
        <Link href="/dashboard/jobs" className="text-sm text-accent-light hover:text-accent font-medium transition-colors duration-150">
          &larr; Back to Jobs
        </Link>
        {canManage && job.estimate_id && (
          <a href={`/api/pdf/estimate/${job.estimate_id}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-accent-light hover:text-accent font-medium border border-accent/30 px-3 py-1.5 rounded-lg hover:bg-accent/10 transition-colors duration-150">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            Download PDF
          </a>
        )}
      </div>

      {/* Error message */}
      {errorMsg && (
        <div className="mb-5 p-3.5 bg-danger/10 border border-danger/30 text-danger rounded-lg text-sm font-medium">
           {decodeURIComponent(errorMsg)}
        </div>
      )}

      {/* Title + Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-text">{customer?.name || "Job"}</h1>
          <p className="text-sm text-muted mt-0.5">
            {est?.fence_type?.replace("_", " ") || "\u2014"} &middot; {est?.linear_feet || 0} ft
            {(est?.gate_count ?? 0) > 0 && ` · ${est.gate_count} gate(s)`}
            {job.estimate_id && (
              <Link href={`/dashboard/estimates/${job.estimate_id}`} className="ml-2 text-accent-light hover:text-accent underline transition-colors duration-150">
                View Estimate
              </Link>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wider ${STATUS_STYLES[job.status] || "bg-surface-3 text-muted"}`}>
            {job.status}
          </span>
          {job.status === "complete" && invoiceUrl && (
            <a
              href={invoiceUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-accent hover:bg-accent-light accent-glow text-white rounded-lg font-semibold transition-colors duration-150"
            >
              View Invoice PDF
            </a>
          )}
        </div>
      </div>

      {/* Invoice Banner — shown when job is complete and invoice exists */}
      {job.status === "complete" && invoiceUrl && (
        <div className="mb-6 flex items-center justify-between bg-accent/10 border border-accent/30 rounded-xl px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-accent-light">Job Complete &mdash; Invoice Sent</p>
            <p className="text-xs text-muted mt-0.5">
              Invoice was emailed to the customer.
              {paidAt && ` Marked paid ${new Date(paidAt!).toLocaleDateString()}.`}
            </p>
          </div>
          <a
            href={invoiceUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 text-sm px-4 py-2 bg-accent hover:bg-accent-light accent-glow text-white rounded-lg font-semibold transition-colors duration-150"
          >
            View Invoice PDF
          </a>
        </div>
      )}

      {/* Financial Summary — OWNER ONLY. The Total Price card gets the signature accent-glow treatment. */}
      {isOwner && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-background border border-accent/20 accent-glow rounded-xl p-4">
            <p className="text-xs text-muted uppercase tracking-wider mb-1">Total Price</p>
            <p className="font-display text-xl font-bold text-text">{fmt(job.total_price)}</p>
          </div>
          <div className="bg-surface-2 rounded-xl border border-border p-4">
            <p className="text-xs text-muted uppercase tracking-wider mb-1">Total Cost</p>
            <p className="font-display text-xl font-bold text-text">{fmt(job.total_cost)}</p>
          </div>
          <div className="bg-surface-2 rounded-xl border border-border p-4">
            <p className="text-xs text-muted uppercase tracking-wider mb-1">Gross Profit</p>
            <p className="font-display text-xl font-bold text-text">{fmt(job.gross_profit)}</p>
          </div>
          <div className="bg-surface-2 rounded-xl border border-border p-4">
            <p className="text-xs text-muted uppercase tracking-wider mb-1">Margin</p>
            <p className={`font-display text-xl font-bold ${Number(job.gross_margin_pct) >= targetMarginPct ? "text-accent-light" : "text-danger"}`}>
              {fmtPct(job.gross_margin_pct)}
            </p>
            <p className="text-xs text-muted mt-0.5">Target: {fmtPct(targetMarginPct)}</p>
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

      {/* Price + schedule for non-owners — Job Value gets accent-glow */}
      {!isOwner && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-background border border-accent/20 accent-glow rounded-xl p-4">
            <p className="text-xs text-muted uppercase tracking-wider mb-1">Job Value</p>
            <p className="font-display text-xl font-bold text-text">{fmt(job.total_price)}</p>
          </div>
          <div className="bg-surface-2 rounded-xl border border-border p-4">
            <p className="text-xs text-muted uppercase tracking-wider mb-1">Scheduled</p>
            <p className="font-display text-xl font-bold text-text">
              {job.scheduled_date ? new Date(job.scheduled_date + "T00:00:00").toLocaleDateString() : "TBD"}
            </p>
          </div>
        </div>
      )}

      {/* Customer Info */}
      {customer && (
        <div className="bg-surface-2 rounded-xl border border-border p-4 mb-6">
          <h2 className="font-semibold text-text mb-2">Customer</h2>
          <p className="text-sm text-text">{customer.name}</p>
          {customer.phone && (
            <p className="text-sm text-muted">{customer.phone}</p>
          )}
          {customer.address && (
            <p className="text-sm text-muted">
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
          <div className="bg-surface-2 rounded-xl border border-border p-4">
            <h3 className="font-semibold text-text mb-2 text-sm">
              Assigned Foreman
            </h3>
            <form action={assignForeman}>
              <input type="hidden" name="jobId" value={job.id} />
              <select
                name="foremanId"
                defaultValue={job.assigned_foreman_id || ""}
                className={`${INPUT_CLASS} mb-2`}
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
                className="w-full bg-accent hover:bg-accent-light accent-glow text-white py-2 rounded-lg text-sm font-semibold transition-colors duration-150"
              >
                Update Foreman
              </button>
            </form>
          </div>
          <div className="bg-surface-2 rounded-xl border border-border p-4">
            <h3 className="font-semibold text-text mb-2 text-sm">
              Scheduled Date
            </h3>
            <form action={updateScheduledDate}>
              <input type="hidden" name="jobId" value={job.id} />
              <input
                type="date"
                name="scheduledDate"
                defaultValue={job.scheduled_date || ""}
                className={`${INPUT_CLASS} mb-2`}
              />
              <button
                type="submit"
                className="w-full bg-accent hover:bg-accent-light accent-glow text-white py-2 rounded-lg text-sm font-semibold transition-colors duration-150"
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
          <div className="bg-surface-2 rounded-xl border border-border p-4">
            <p className="text-xs text-muted uppercase tracking-wider">Foreman</p>
            <p className="font-semibold text-text">{foremanName}</p>
          </div>
          <div className="bg-surface-2 rounded-xl border border-border p-4">
            <p className="text-xs text-muted uppercase tracking-wider">Scheduled</p>
            <p className="font-semibold text-text">
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
          <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 mb-6">
            <p className="text-sm text-warning mb-3">
              Checklist and material verifications have not been generated yet.
            </p>
            <form action={initForemanData}>
              <input type="hidden" name="jobId" value={job.id} />
              <button
                type="submit"
                className="bg-warning hover:bg-warning/90 text-background px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-150"
              >
                Generate Checklist &amp; Verifications
              </button>
            </form>
          </div>
        )}

      {/* Material Verification */}
      {hasVerifications && (
        <div className="bg-surface-2 rounded-xl border border-border overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-text">
              Material Verification (
              {
                verifications.filter(
                  (v: { verified: boolean }) => v.verified
                ).length
              }
              /{verifications.length})
            </h2>
            {allMaterialsVerified && (
              <span className="text-xs bg-accent/15 text-accent-light px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                All Verified
              </span>
            )}
          </div>
          <div className="divide-y divide-border">
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
                      className={`text-sm font-medium ${v.verified ? "text-accent-light" : "text-text"}`}
                    >
                      {v.name}
                    </p>
                    <p className="text-xs text-muted">
                      SKU: <span className="font-mono">{v.sku}</span> &middot; Required: {v.required_qty}
                    </p>
                  </div>
                  {v.verified ? (
                    <span className="text-xs bg-accent/15 text-accent-light px-2 py-1 rounded-full font-semibold whitespace-nowrap uppercase tracking-wider">
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
                        className="w-20 border border-border bg-surface-3 text-text rounded-lg px-2 py-1.5 text-sm text-right font-mono focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-150"
                      />
                      <button
                        type="submit"
                        className="bg-accent hover:bg-accent-light accent-glow text-white px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors duration-150"
                      >
                        Verify
                      </button>
                    </form>
                  ) : (
                    <span className="text-xs text-muted">Not verified</span>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Checklist */}
      {hasChecklist && (
        <div className="bg-surface-2 rounded-xl border border-border overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-text">
              Checklist (
              {
                checklist.filter(
                  (c: { completed: boolean }) => c.completed
                ).length
              }
              /{checklist.length})
            </h2>
            {allRequiredDone && (
              <span className="text-xs bg-accent/15 text-accent-light px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                All Required Done
              </span>
            )}
          </div>
          <div className="divide-y divide-border">
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
                        className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors duration-150 ${c.completed ? "bg-accent border-accent text-white" : "border-border-strong hover:border-accent"}`}
                      >
                        {c.completed && <span className="text-xs"></span>}
                      </button>
                    </form>
                  ) : (
                    <div
                      className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${c.completed ? "bg-accent border-accent text-white" : "border-border-strong"}`}
                    >
                      {c.completed && <span className="text-xs"></span>}
                    </div>
                  )}
                  <div className="flex-1">
                    <span
                      className={`text-sm ${c.completed ? "line-through text-muted" : "text-text"}`}
                    >
                      {c.label}
                    </span>
                    {c.is_required && !c.completed && (
                      <span className="ml-2 text-xs text-danger font-semibold uppercase tracking-wider">
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
      <div className="bg-surface-2 rounded-xl border border-border overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="font-semibold text-text">
            Photos ({photos.length})
          </h2>
        </div>
        {canExecute && job.status !== "complete" && (
          <div className="px-5 py-4 border-b border-border bg-surface-3">
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
                className="flex-1 text-sm text-text file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-accent/10 file:text-accent-light hover:file:bg-accent/15 file:transition-colors file:duration-150"
              />
              <input
                type="text"
                name="caption"
                placeholder="Caption (optional)"
                className="border border-border bg-surface-2 text-text rounded-lg px-3 py-2 text-sm sm:w-48 placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-150"
              />
              <button
                type="submit"
                className="bg-accent hover:bg-accent-light accent-glow text-white px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors duration-150"
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
                    className="w-full h-32 object-cover rounded-lg border border-border"
                  />
                  {p.caption && (
                    <p className="text-xs text-text mt-1 truncate">
                      {p.caption}
                    </p>
                  )}
                  <p className="text-xs text-muted">
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
                        className="bg-danger hover:bg-danger/90 text-white w-6 h-6 rounded-full text-xs transition-colors duration-150"
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
          <p className="px-5 py-4 text-sm text-muted">
            No photos uploaded yet.
          </p>
        )}
      </div>
      {/* Documents — pre-filled contracts, lien waivers, change orders */}
      <GenerateDocsPanel jobId={job.id} />

      {/*  CHANGE ORDERS  */}
      <div className="bg-surface-2 rounded-xl border border-border overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-text">
            Change Orders ({changeOrders.length})
            {pendingCOs.length > 0 && (
              <span className="ml-2 text-xs bg-warning/15 text-warning px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                {pendingCOs.length} pending
              </span>
            )}
          </h2>
        </div>

        {/* Existing Change Orders */}
        {changeOrders.length > 0 && (
          <div className="divide-y divide-border">
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
                        className={`text-xs px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${CO_STATUS_STYLES[co.status] || "bg-surface-3 text-muted"}`}
                      >
                        {co.status}
                      </span>
                      <span className="text-xs text-muted">
                        {new Date(co.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-sm font-bold text-text">{fmt(co.subtotal)}</p>
                      <p className="text-xs text-muted">
                        Cost: {fmt(co.cost_total)} &middot; Margin:{" "}
                        {fmtPct(co.gross_margin_pct)}
                      </p>
                    </div>
                  </div>

                  {/* CO Line Items */}
                  {(co.change_order_line_items ?? []).length > 0 && (
                    <table className="w-full text-xs mb-2">
                      <thead>
                        <tr className="text-muted border-b border-border uppercase tracking-wider">
                          <th className="text-left py-1 font-semibold">Item</th>
                          <th className="text-left py-1 font-semibold">Type</th>
                          <th className="text-right py-1 font-semibold">Qty</th>
                          <th className="text-right py-1 font-semibold">Price</th>
                          <th className="text-right py-1 font-semibold">Ext.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(co.change_order_line_items ?? []).map((li) => (
                          <tr key={li.id} className="border-b border-border">
                            <td className="py-1 text-text">{li.name}</td>
                            <td className="py-1 text-muted">{li.type}</td>
                            <td className="py-1 text-right text-text font-mono">{li.qty}</td>
                            <td className="py-1 text-right text-text font-mono">
                              {fmt(li.unit_price)}
                            </td>
                            <td className="py-1 text-right text-text font-mono">
                              {fmt(li.extended_price)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {co.reason && (
                    <p className="text-xs text-muted italic mb-2">
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
                          className="bg-accent hover:bg-accent-light accent-glow text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150"
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
                          className="bg-danger hover:bg-danger/90 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150"
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
            <div className="px-5 py-4 border-t border-border bg-surface-3">
              <h3 className="text-sm font-semibold text-text mb-3">
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
            <p className="px-5 py-4 text-sm text-muted">
              No change orders.
            </p>
          )}
      </div>
      {/* Materials Snapshot */}
      {materialItems.length > 0 && (
        <div className="bg-surface-2 rounded-xl border border-border overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="font-semibold text-text">
              Materials ({materialItems.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-3">
                <tr className="text-muted border-b border-border text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-2 font-semibold">Item</th>
                  <th className="text-right px-5 py-2 font-semibold">Qty</th>
                  <th className="text-right px-5 py-2 font-semibold">
                    Unit Price
                  </th>
                  <th className="text-right px-5 py-2 font-semibold">
                    Ext. Price
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {materialItems.map(
                  (li: {
                    id: string;
                    name: string;
                    qty: number;
                    unit_price: number;
                    extended_price: number;
                    sku: string | null;
                  }) => (
                    <tr key={li.id} className="hover:bg-surface-3 transition-colors duration-150">
                      <td className="px-5 py-2 text-text">
                        {li.name}
                        {li.sku && (
                          <span className="ml-1 text-xs text-muted font-mono">
                            ({li.sku})
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-2 text-right text-text font-mono">{li.qty}</td>
                      <td className="px-5 py-2 text-right text-text font-mono">
                        {fmt(li.unit_price)}
                      </td>
                      <td className="px-5 py-2 text-right font-display font-semibold text-text">
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
        <div className="bg-surface-2 rounded-xl border border-border overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="font-semibold text-text">
              Labor ({laborItems.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-3">
                <tr className="text-muted border-b border-border text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-2 font-semibold">
                    Description
                  </th>
                  <th className="text-right px-5 py-2 font-semibold">Qty</th>
                  <th className="text-right px-5 py-2 font-semibold">Rate</th>
                  <th className="text-right px-5 py-2 font-semibold">
                    Ext. Price
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {laborItems.map(
                  (li: {
                    id: string;
                    name: string;
                    qty: number;
                    unit_price: number;
                    extended_price: number;
                  }) => (
                    <tr key={li.id} className="hover:bg-surface-3 transition-colors duration-150">
                      <td className="px-5 py-2 text-text">{li.name}</td>
                      <td className="px-5 py-2 text-right text-text font-mono">{li.qty}</td>
                      <td className="px-5 py-2 text-right text-text font-mono">
                        {fmt(li.unit_price)}
                      </td>
                      <td className="px-5 py-2 text-right font-display font-semibold text-text">
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
          <div className="bg-surface-2 rounded-xl border border-border p-5 mb-6">
            <h2 className="font-semibold text-text mb-3">Materials Verification</h2>
            {mvStatus === "foreman_approved" && (
              <div className="flex items-center gap-2 text-accent-light bg-accent/10 border border-accent/30 rounded-lg p-3 text-sm font-medium">
                <span></span><span>Materials verified &mdash; job cleared to start</span>
              </div>
            )}
            {mvStatus === "employee_confirmed" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-muted bg-surface-3 border border-border rounded-lg p-3 text-sm font-medium">
                  <span></span><span>Employee has confirmed materials loaded</span>
                </div>
                {canExecute && (
                  <form action={handleApprove}>
                    <input type="hidden" name="jobId" value={job.id} />
                    <button type="submit" className="bg-accent hover:bg-accent-light accent-glow text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-150">
                      Approve &amp; Clear to Start
                    </button>
                  </form>
                )}
              </div>
            )}
            {mvStatus === "rejected" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-danger bg-danger/10 border border-danger/30 rounded-lg p-3 text-sm font-medium">
                  <span></span><span>Material verification was rejected</span>
                </div>
                {canExecute && (
                  <form action={handleRequestVerification}>
                    <input type="hidden" name="jobId" value={job.id} />
                    <input type="hidden" name="jobName" value={jobNameStr} />
                    <input type="hidden" name="jobAddr" value={jobAddr} />
                    <input type="hidden" name="foremanEmail" value={foremanEmail} />
                    <button type="submit" className="bg-warning hover:bg-warning/90 text-background px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-150">
                      Re-request Verification
                    </button>
                  </form>
                )}
              </div>
            )}
            {(mvStatus === "pending" || !mvStatus) && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-warning bg-warning/10 border border-warning/30 rounded-lg p-3 text-sm">
                  <span>&#x231B;</span><span>Awaiting material verification before job can start</span>
                </div>
                {canExecute && (
                  <div className="flex gap-2 flex-wrap">
                    <a
                      href={`/dashboard/jobs/${job.id}/verify-materials`}
                      className="bg-accent hover:bg-accent-light accent-glow text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-150"
                    >
                      Verify Materials Now &rarr;
                    </a>
                    {foremanEmail && (
                      <form action={handleRequestVerification}>
                        <input type="hidden" name="jobId" value={job.id} />
                        <input type="hidden" name="jobName" value={jobNameStr} />
                        <input type="hidden" name="jobAddr" value={jobAddr} />
                        <input type="hidden" name="foremanEmail" value={foremanEmail} />
                        <button type="submit" className="border border-accent/30 text-accent-light hover:bg-accent/10 hover:text-accent px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-150">
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
        <div className="bg-surface-2 rounded-xl border border-border p-5 mb-6">
          <h2 className="font-semibold text-text mb-4 text-base">Final Invoice</h2>

          {/* Original Estimate Line Items */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Original Estimate</p>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-3">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs text-muted font-semibold uppercase tracking-wider">Item</th>
                    <th className="text-right px-3 py-2 text-xs text-muted font-semibold uppercase tracking-wider">Qty</th>
                    <th className="text-right px-3 py-2 text-xs text-muted font-semibold uppercase tracking-wider">Unit Price</th>
                    <th className="text-right px-3 py-2 text-xs text-muted font-semibold uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {materialItems.length === 0 ? (
                    <tr><td colSpan={4} className="px-3 py-3 text-muted text-xs text-center">No line items</td></tr>
                  ) : (
                    materialItems.map((item: { id: string; name: string; qty: number; unit: string; unit_price: number; extended_price: number }) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 text-text">{item.name}</td>
                        <td className="px-3 py-2 text-right text-muted font-mono">{item.qty} {item.unit}</td>
                        <td className="px-3 py-2 text-right text-muted font-mono">{fmt(item.unit_price)}</td>
                        <td className="px-3 py-2 text-right font-display font-semibold text-text">{fmt(item.extended_price)}</td>
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
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Approved Change Orders</p>
              {approvedCOs.map((co: { id: string; reason?: string; description?: string; subtotal: number; change_order_line_items?: { id?: string; name: string; qty: number; unit_price: number; extended_price: number }[] }) => (
                <div key={co.id} className="rounded-lg border border-warning/30 bg-warning/10 overflow-hidden mb-2">
                  <div className="px-3 py-2 border-b border-warning/30">
                    <p className="text-xs font-semibold text-warning">{co.reason || co.description || "Change Order"}</p>
                  </div>
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-warning/20">
                      {(Array.isArray(co.change_order_line_items) ? co.change_order_line_items : []).map((li, idx) => (
                        <tr key={li.id ?? idx}>
                          <td className="px-3 py-2 text-text">{li.name}</td>
                          <td className="px-3 py-2 text-right text-muted font-mono">{li.qty}</td>
                          <td className="px-3 py-2 text-right text-muted font-mono">{fmt(li.unit_price)}</td>
                          <td className="px-3 py-2 text-right font-display font-semibold text-text">{fmt(li.extended_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-3 py-2 text-right text-xs font-semibold text-warning border-t border-warning/30">
                    CO Subtotal: <span className="font-display font-bold">{fmt(co.subtotal)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Invoice Total */}
          <div className="flex justify-end border-t border-border pt-3 mb-4">
            <div className="text-right">
              <p className="text-xs text-muted uppercase tracking-wider">Total Due</p>
              <p className="font-display text-2xl font-bold text-text">{fmt(job.total_price)}</p>
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
              <p className="text-xs text-muted mt-2">Marks job complete, generates PDF invoice, and emails the customer.</p>
            </div>
          )}
          {job.status === "complete" && invoiceUrl && (
            <a
              href={invoiceUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm px-4 py-2 bg-accent hover:bg-accent-light accent-glow text-white rounded-lg font-semibold transition-colors duration-150"
            >
              Download Invoice PDF
            </a>
          )}
        </div>
      )}

      {/* Status Transitions */}
      {job.status !== "complete" && job.status !== "cancelled" && (
        <div className="bg-surface-2 rounded-xl border border-border p-4 mb-6">
          <h2 className="font-semibold text-text mb-3">Job Actions</h2>
          <div className="flex flex-wrap gap-2">
            {job.status === "scheduled" && canExecute && (
              <form action={transitionJobStatus}>
                <input type="hidden" name="jobId" value={job.id} />
                <input type="hidden" name="newStatus" value="active" />
                <button
                  type="submit"
                  className="bg-accent hover:bg-accent-light accent-glow text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-150"
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
                  className="bg-surface-3 hover:bg-surface-3/80 text-muted border border-border-strong hover:text-text px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-150"
                >
                  Cancel Job
                </button>
              </form>
            )}
          </div>
          {!allMaterialsVerified && job.status === "scheduled" && (
            <p className="text-xs text-warning mt-2">
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
