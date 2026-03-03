import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdvancedEstimateClient from "./AdvancedEstimateClient";
import { getOrgMaterialPrices } from "./actions";

export const metadata = { title: "Advanced Estimate — FenceEstimatePro" };

export default async function AdvancedEstimatePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const priceMap = await getOrgMaterialPrices();
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
        <AdvancedEstimateClient priceMap={priceMap} />
      </div>
    </main>
  );
}
