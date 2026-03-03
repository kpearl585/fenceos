import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdvancedEstimateClient from "./AdvancedEstimateClient";

export const metadata = { title: "Advanced Estimate — FenceEstimatePro" };

export default async function AdvancedEstimatePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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
        </div>
        <AdvancedEstimateClient />
      </div>
    </main>
  );
}
