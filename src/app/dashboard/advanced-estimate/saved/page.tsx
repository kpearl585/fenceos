import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata = { title: "Saved Estimates — FenceEstimatePro" };

function fmt(n: number) {
  return "$" + Math.round(n).toLocaleString("en-US");
}

export default async function SavedAdvancedEstimatesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users").select("org_id").eq("auth_id", user.id).single();
  if (!profile) redirect("/dashboard");

  const { data: estimates } = await admin
    .from("fence_graphs")
    .select("id, name, total_lf, total_cost, status, closed_at, closeout_actual_waste_pct, created_at, input_json, source_photo_storage_path")
    .eq("org_id", profile.org_id)
    .order("created_at", { ascending: false })
    .limit(100);

  // Fetch org calibration
  const { data: org } = await admin
    .from("organizations")
    .select("waste_calibration_json")
    .eq("id", profile.org_id)
    .single();

  const cal = org?.waste_calibration_json as { currentFactor: number; sampleCount: number } | null;
  const openEstimates = (estimates ?? []).filter(e => e.status !== "closed");
  const closedEstimates = (estimates ?? []).filter(e => e.status === "closed");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-text">Saved Advanced Estimates</h1>
          <p className="text-muted text-sm mt-1">Run-based engine estimates with full BOM traceability</p>
        </div>
        <Link href="/dashboard/advanced-estimate"
          className="bg-accent hover:bg-accent-light accent-glow text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-150">
          New Estimate
        </Link>
      </div>

      {/* Calibration status — signature dark panel, matches estimator summary */}
      {cal ? (
        <div className="bg-background border border-accent/20 accent-glow text-text rounded-xl p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-accent-light uppercase tracking-widest mb-1">Engine Calibration Active</p>
            <p className="text-sm text-muted">
              Waste factor: <span className="font-bold font-display text-text">{(cal.currentFactor * 100).toFixed(1)}%</span>
              {" "}·{" "}
              Based on <span className="font-bold font-display text-text">{cal.sampleCount}</span> closed job{cal.sampleCount !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-xs text-muted">New estimates use your calibrated waste factor automatically</p>
          </div>
        </div>
      ) : (
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 mb-6">
          <p className="text-sm text-warning font-semibold">Engine not yet calibrated</p>
          <p className="text-xs text-warning/80 mt-1">Close out completed jobs below to start calibrating the waste model for your operation. Accuracy improves with every job.</p>
        </div>
      )}

      {/* Open estimates */}
      <div className="mb-8">
        <h2 className="text-sm font-bold text-muted uppercase tracking-widest mb-3">Open Estimates ({openEstimates.length})</h2>
        {openEstimates.length === 0 ? (
          <div className="bg-surface-2 rounded-xl border border-border p-8 text-center">
            <p className="text-muted text-sm">No open estimates. <Link href="/dashboard/advanced-estimate" className="text-accent-light hover:text-accent font-semibold transition-colors duration-150">Create one.</Link></p>
          </div>
        ) : (
          <div className="space-y-2">
            {openEstimates.map((est) => {
              const input = est.input_json as { fenceType?: string; productLineId?: string } | null;
              const fenceType = input?.fenceType ?? "vinyl";
              const fromPhoto = Boolean((est as { source_photo_storage_path?: string | null }).source_photo_storage_path);
              return (
                <Link key={est.id} href={`/dashboard/advanced-estimate/${est.id}`}
                  className="block bg-surface-2 rounded-xl border border-border hover:border-border-strong hover:bg-surface-3 transition-colors duration-150 px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-text">{est.name}</p>
                        {fromPhoto && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 border border-accent/30 px-2 py-0.5 text-[10px] font-medium text-accent-light uppercase tracking-wider">
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l3-3h3l2-2h4l2 2h3l3 3v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                              <circle cx="12" cy="13" r="4"/>
                            </svg>
                            From photo
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted mt-0.5 capitalize">
                        {fenceType.replace("_", " ")} · {est.total_lf ?? "—"} LF · {new Date(est.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-lg font-bold text-text">{est.total_cost ? fmt(est.total_cost) : "—"}</p>
                      <p className="text-xs text-warning font-semibold">Open — close out to calibrate</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Closed estimates */}
      {closedEstimates.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-muted uppercase tracking-widest mb-3">Closed ({closedEstimates.length})</h2>
          <div className="space-y-2">
            {closedEstimates.map((est) => (
              <Link key={est.id} href={`/dashboard/advanced-estimate/${est.id}`}
                className="block bg-surface-2 rounded-xl border border-border hover:border-border-strong hover:bg-surface-3 transition-colors duration-150 px-5 py-4 opacity-80 hover:opacity-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-text">{est.name}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {est.total_lf ?? "—"} LF · Closed {est.closed_at ? new Date(est.closed_at).toLocaleDateString() : "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-lg font-bold text-muted">{est.total_cost ? fmt(est.total_cost) : "—"}</p>
                    <p className="text-xs text-accent-light font-semibold">
                      Actual waste: {est.closeout_actual_waste_pct != null
                        ? `${(est.closeout_actual_waste_pct * 100).toFixed(1)}%`
                        : "—"}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
