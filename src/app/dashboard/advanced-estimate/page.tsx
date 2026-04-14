import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdvancedEstimateClient from "./AdvancedEstimateClient";
import { getOrgMaterialPrices, getOrgCalibration, getOrgEstimatorConfig } from "./actions";
import { checkAiReadiness } from "./aiActions";

export const metadata = { title: "Advanced Estimate — FenceEstimatePro" };

export default async function AdvancedEstimatePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [priceMap, calibration, aiReadiness, estimatorConfig] = await Promise.all([
    getOrgMaterialPrices(),
    getOrgCalibration(),
    checkAiReadiness(),
    getOrgEstimatorConfig(),
  ]);
  const hasPrices = Object.keys(priceMap).length > 0;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-fence-600 bg-fence-50 border border-fence-200 px-2 py-0.5 rounded">Beta</span>
            <h1 className="text-2xl font-bold text-fence-950">Advanced Fence Estimator</h1>
          </div>
          <p className="text-gray-500 text-sm">
            Run-based estimation engine. Add each fence segment individually for professional-grade accuracy with full material traceability.
          </p>
          <div className="flex items-center gap-4 mt-2">
            <a href="/dashboard/advanced-estimate/saved" className="text-sm text-fence-600 font-semibold hover:underline">
              View Saved Estimates →
            </a>
            {calibration.sampleCount > 0 && (
              <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded font-semibold">
                Engine calibrated from {calibration.sampleCount} job{calibration.sampleCount !== 1 ? "s" : ""} · {(calibration.currentFactor * 100).toFixed(1)}% waste
              </span>
            )}
          </div>
          {!hasPrices && (
            <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <span className="text-amber-600 text-sm font-semibold flex-shrink-0">No material prices found.</span>
              <span className="text-amber-700 text-sm">
                Quantities will be accurate but dollar amounts will show $0. Set unit costs in{" "}
                <a href="/dashboard/materials" className="underline font-semibold">Materials</a>{" "}
                to enable cost and bid pricing.
              </span>
            </div>
          )}
        </div>
        {!aiReadiness.available && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
            <p className="text-sm font-semibold text-amber-800">AI Input unavailable</p>
            <p className="text-xs text-amber-700 mt-1">{aiReadiness.reason ?? "AI extraction is not configured."} Manual input is fully available.</p>
          </div>
        )}
        <AdvancedEstimateClient
          priceMap={priceMap}
          defaultWastePct={Math.round(calibration.currentFactor * 100)}
          aiAvailable={aiReadiness.available}
          estimatorConfig={estimatorConfig.config}
          hasCustomConfig={estimatorConfig.hasCustomConfig}
        />
      </div>
    </main>
  );
}
