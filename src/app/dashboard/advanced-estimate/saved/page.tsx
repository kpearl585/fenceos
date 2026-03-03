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
    .from("profiles").select("org_id").eq("auth_id", user.id).single();
  if (!profile) redirect("/dashboard");

  const { data: estimates } = await admin
    .from("fence_graphs")
    .select("id, name, total_lf, total_cost, status, closed_at, closeout_actual_waste_pct, created_at, input_json")
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
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-fence-950">Saved Advanced Estimates</h1>
            <p className="text-gray-500 text-sm mt-1">Run-based engine estimates with full BOM traceability</p>
          </div>
          <Link href="/dashboard/advanced-estimate"
            className="bg-fence-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-fence-700 transition-colors">
            New Estimate
          </Link>
        </div>

        {/* Calibration status */}
        {cal ? (
          <div className="bg-fence-950 text-white rounded-xl p-4 mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-fence-400 uppercase tracking-widest mb-1">Engine Calibration Active</p>
              <p className="text-sm text-fence-100">
                Waste factor: <span className="font-bold text-white">{(cal.currentFactor * 100).toFixed(1)}%</span>
                {" "}·{" "}
                Based on <span className="font-bold text-white">{cal.sampleCount}</span> closed job{cal.sampleCount !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-fence-500">New estimates use your calibrated waste factor automatically</p>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-amber-800 font-semibold">Engine not yet calibrated</p>
            <p className="text-xs text-amber-700 mt-1">Close out completed jobs below to start calibrating the waste model for your operation. Accuracy improves with every job.</p>
          </div>
        )}

        {/* Open estimates */}
        <div className="mb-8">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Open Estimates ({openEstimates.length})</h2>
          {openEstimates.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <p className="text-gray-400 text-sm">No open estimates. <Link href="/dashboard/advanced-estimate" className="text-fence-600 font-semibold hover:underline">Create one.</Link></p>
            </div>
          ) : (
            <div className="space-y-2">
              {openEstimates.map((est) => {
                const input = est.input_json as { fenceType?: string; productLineId?: string } | null;
                const fenceType = input?.fenceType ?? "vinyl";
                return (
                  <Link key={est.id} href={`/dashboard/advanced-estimate/${est.id}`}
                    className="block bg-white rounded-xl border border-gray-200 hover:border-fence-400 hover:shadow-sm transition-all px-5 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-fence-900">{est.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5 capitalize">
                          {fenceType.replace("_", " ")} · {est.total_lf ?? "—"} LF · {new Date(est.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-fence-900">{est.total_cost ? fmt(est.total_cost) : "—"}</p>
                        <p className="text-xs text-amber-600 font-semibold">Open — close out to calibrate</p>
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
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Closed ({closedEstimates.length})</h2>
            <div className="space-y-2">
              {closedEstimates.map((est) => (
                <Link key={est.id} href={`/dashboard/advanced-estimate/${est.id}`}
                  className="block bg-white rounded-xl border border-gray-100 hover:border-fence-300 transition-all px-5 py-4 opacity-75 hover:opacity-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-fence-900">{est.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {est.total_lf ?? "—"} LF · Closed {est.closed_at ? new Date(est.closed_at).toLocaleDateString() : "—"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-500">{est.total_cost ? fmt(est.total_cost) : "—"}</p>
                      <p className="text-xs text-green-600 font-semibold">
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
    </main>
  );
}
