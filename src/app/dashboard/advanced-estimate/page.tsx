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
            <h1 className="text-2xl font-bold text-fence-950">Fence Estimator</h1>
          </div>
          <p className="text-gray-500 text-sm">
            Professional-grade estimates with full material traceability. Enter measurements below — the engine does all the math.
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
            /* Softened from a red-alert "dollar amounts will show $0" banner.
               The BOM engines layer DEFAULT_PRICES_BASE under the org map
               via mergePrices(), so totals are real — just not tuned to
               this contractor's suppliers. No reason to scare a new user
               away from their first estimate. */
            <div className="mt-3 flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <span className="text-blue-700 text-sm">
                Using default material prices so you can price jobs right away.
                Update your{" "}
                <a href="/dashboard/materials" className="underline font-semibold">Materials</a>{" "}
                catalog anytime to match your supplier costs.
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
