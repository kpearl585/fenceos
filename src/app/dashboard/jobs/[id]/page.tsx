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
import {
  initForemanData,
  toggleChecklistItem,
  verifyMaterial,
  addJobPhoto,
  deleteJobPhoto,
} from "../foremanActions";

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
  let foremen: { id: string; full_name: string | null; email: string }[] = [];
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

  // Load checklist items
  const { data: checklistItems } = await supabase
    .from("job_checklists")
    .select("*")
    .eq("job_id", id)
    .order("sort_order");
  const checklist = checklistItems ?? [];

  // Load material verifications
  const { data: verificationItems } = await supabase
    .from("job_material_verifications")
    .select("*")
    .eq("job_id", id)
    .order("created_at");
  const verifications = verificationItems ?? [];

  // Load photos
  const { data: photoItems } = await supabase
    .from("job_photos")
    .select("*")
    .eq("job_id", id)
    .order("created_at", { ascending: false });
  const photos = photoItems ?? [];

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
  const canExecute = profile.role === "owner" || profile.role === "foreman";
  const hasChecklist = checklist.length > 0;
  const hasVerifications = verifications.length > 0;

  // Completion readiness
  const requiredIncomplete = checklist.filter(
    (c: { required: boolean; completed: boolean }) => c.required && !c.completed
  ).length;
  const allRequiredDone = requiredIncomplete === 0 && hasChecklist;
  const allMaterialsVerified =
    verifications.length > 0 &&
    verifications.every((v: { verified: boolean }) => v.verified);

  // Photo signed URLs
  const photoUrls: Record<string, string> = {};
  for (const p of photos) {
    const { data } = supabase.storage
      .from("job-photos")
      .getPublicUrl(p.storage_path);
    photoUrls[p.id] = data.publicUrl;
  }

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
            {(est?.gate_count ?? 0) > 0 && ` · ${est.gate_count} gate(s)`}
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
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-fence-900 mb-2 text-sm">Assigned Foreman</h3>
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
              <button type="submit" className="w-full bg-fence-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-fence-700 transition-colors">
                Update Foreman
              </button>
            </form>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-fence-900 mb-2 text-sm">Scheduled Date</h3>
            <form action={updateScheduledDate}>
              <input type="hidden" name="jobId" value={job.id} />
              <input type="date" name="scheduledDate" defaultValue={job.scheduled_date || ""} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm mb-2" />
              <button type="submit" className="w-full bg-fence-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-fence-700 transition-colors">
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
                ? new Date(job.scheduled_date + "T00:00:00").toLocaleDateString()
                : "Not scheduled"}
            </p>
          </div>
        </div>
      )}

      {/* Initialize Foreman Data Button */}
      {canExecute && !hasChecklist && !hasVerifications && job.status !== "complete" && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-amber-800 mb-3">
            Checklist and material verifications have not been generated yet.
          </p>
          <form action={initForemanData}>
            <input type="hidden" name="jobId" value={job.id} />
            <button type="submit" className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-700 transition-colors">
              Generate Checklist &amp; Verifications
            </button>
          </form>
        </div>
      )}

      {/* Material Verification Section */}
      {hasVerifications && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-fence-900">
              Material Verification ({verifications.filter((v: { verified: boolean }) => v.verified).length}/{verifications.length})
            </h2>
            {allMaterialsVerified && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">All Verified</span>
            )}
          </div>
          <div className="divide-y divide-gray-100">
            {verifications.map((v: { id: string; name: string; sku: string; required_qty: number; verified_qty: number | null; verified: boolean }) => (
              <div key={v.id} className="px-5 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${v.verified ? "text-green-700" : "text-gray-900"}`}>{v.name}</p>
                  <p className="text-xs text-gray-500">SKU: {v.sku} · Required: {v.required_qty}</p>
                </div>
                {v.verified ? (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium whitespace-nowrap">
                    ✓ {v.verified_qty} verified
                  </span>
                ) : canExecute && job.status !== "complete" ? (
                  <form action={verifyMaterial} className="flex items-center gap-2">
                    <input type="hidden" name="jobId" value={job.id} />
                    <input type="hidden" name="verificationId" value={v.id} />
                    <input
                      type="number"
                      name="verifiedQty"
                      defaultValue={v.required_qty}
                      min={0}
                      step="any"
                      className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-right"
                    />
                    <button type="submit" className="bg-fence-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-fence-700 transition-colors whitespace-nowrap">
                      Verify
                    </button>
                  </form>
                ) : (
                  <span className="text-xs text-gray-400">Not verified</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Checklist Section */}
      {hasChecklist && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-fence-900">
              Checklist ({checklist.filter((c: { completed: boolean }) => c.completed).length}/{checklist.length})
            </h2>
            {allRequiredDone && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">All Required Done</span>
            )}
          </div>
          <div className="divide-y divide-gray-100">
            {checklist.map((c: { id: string; label: string; required: boolean; completed: boolean; item_key: string }) => (
              <div key={c.id} className="px-5 py-3 flex items-center gap-3">
                {canExecute && job.status !== "complete" ? (
                  <form action={toggleChecklistItem}>
                    <input type="hidden" name="jobId" value={job.id} />
                    <input type="hidden" name="itemId" value={c.id} />
                    <input type="hidden" name="completed" value={c.completed ? "false" : "true"} />
                    <button type="submit" className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                      c.completed
                        ? "bg-green-500 border-green-500 text-white"
                        : "border-gray-300 hover:border-fence-500"
                    }`}>
                      {c.completed && <span className="text-xs">✓</span>}
                    </button>
                  </form>
                ) : (
                  <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${
                    c.completed ? "bg-green-500 border-green-500 text-white" : "border-gray-300"
                  }`}>
                    {c.completed && <span className="text-xs">✓</span>}
                  </div>
                )}
                <div className="flex-1">
                  <span className={`text-sm ${c.completed ? "line-through text-gray-400" : "text-gray-900"}`}>
                    {c.label}
                  </span>
                  {c.required && !c.completed && (
                    <span className="ml-2 text-xs text-red-500 font-medium">Required</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Photos Section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-fence-900">Photos ({photos.length})</h2>
        </div>

        {/* Upload form */}
        {canExecute && job.status !== "complete" && (
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <form action={addJobPhoto} encType="multipart/form-data" className="flex flex-col sm:flex-row gap-2">
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
              <button type="submit" className="bg-fence-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-fence-700 transition-colors whitespace-nowrap">
                Upload
              </button>
            </form>
          </div>
        )}

        {/* Photo grid */}
        {photos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
            {photos.map((p: { id: string; caption: string | null; storage_path: string; created_at: string }) => (
              <div key={p.id} className="relative group">
                <img
                  src={photoUrls[p.id]}
                  alt={p.caption || "Job photo"}
                  className="w-full h-32 object-cover rounded-lg"
                />
                {p.caption && (
                  <p className="text-xs text-gray-600 mt-1 truncate">{p.caption}</p>
                )}
                <p className="text-xs text-gray-400">
                  {new Date(p.created_at).toLocaleDateString()}
                </p>
                {profile.role === "owner" && (
                  <form action={deleteJobPhoto} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <input type="hidden" name="jobId" value={job.id} />
                    <input type="hidden" name="photoId" value={p.id} />
                    <button type="submit" className="bg-red-600 text-white w-6 h-6 rounded-full text-xs hover:bg-red-700" title="Delete photo">
                      ✕
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="px-5 py-4 text-sm text-gray-400">No photos uploaded yet.</p>
        )}
      </div>

      {/* Material Line Items (read-only snapshot) */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-fence-900">Materials ({materialItems.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Item</th>
                <th className="px-4 py-2 font-medium text-right">Qty</th>
                <th className="px-4 py-2 font-medium text-right">Unit Cost</th>
                <th className="px-4 py-2 font-medium text-right">Unit Price</th>
                <th className="px-4 py-2 font-medium text-right">Ext. Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {materialItems.map((li: { id: string; name: string; qty: number; unit: string; unit_cost: number; unit_price: number; extended_price: number }) => (
                <tr key={li.id}>
                  <td className="px-4 py-2.5">{li.name}</td>
                  <td className="px-4 py-2.5 text-right">{li.qty} {li.unit}</td>
                  <td className="px-4 py-2.5 text-right text-gray-500">{fmt(li.unit_cost)}</td>
                  <td className="px-4 py-2.5 text-right">{fmt(li.unit_price)}</td>
                  <td className="px-4 py-2.5 text-right font-medium">{fmt(li.extended_price)}</td>
                </tr>
              ))}
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
                  {laborItems.map((li: { id: string; name: string; extended_price: number }) => (
                    <tr key={li.id}>
                      <td className="px-4 py-2.5">{li.name}</td>
                      <td className="px-4 py-2.5 text-right font-medium">{fmt(li.extended_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Status Transition Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Start Job (foreman or owner/sales) — blocked if materials not verified */}
        {(isForeman || canManage) && job.status === "scheduled" && (
          <form action={transitionJobStatus} className="flex-1">
            <input type="hidden" name="jobId" value={job.id} />
            <input type="hidden" name="newStatus" value="active" />
            <button
              type="submit"
              className={`w-full py-3 rounded-xl font-semibold transition-colors ${
                hasVerifications && !allMaterialsVerified
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
              disabled={hasVerifications && !allMaterialsVerified}
            >
              {hasVerifications && !allMaterialsVerified
                ? "Verify All Materials to Start"
                : "Start Job"}
            </button>
          </form>
        )}

        {/* Complete Job (owner/sales only) — blocked if required checklist not done */}
        {canManage && job.status === "active" && (
          <form action={transitionJobStatus} className="flex-1">
            <input type="hidden" name="jobId" value={job.id} />
            <input type="hidden" name="newStatus" value="complete" />
            <button
              type="submit"
              className={`w-full py-3 rounded-xl font-semibold transition-colors ${
                !allRequiredDone && hasChecklist
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
              disabled={!allRequiredDone && hasChecklist}
            >
              {!allRequiredDone && hasChecklist
                ? `Complete Checklist (${requiredIncomplete} remaining)`
                : "Mark Complete"}
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
