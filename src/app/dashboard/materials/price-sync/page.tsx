import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getPriceFreshness } from "./actions";
import PriceSyncClient from "./PriceSyncClient";

export const metadata = { title: "Price Sync — FenceEstimatePro" };

export default async function PriceSyncPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const freshness = await getPriceFreshness();

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-fence-950">Material Price Sync</h1>
          <p className="text-gray-500 text-sm mt-1">
            Import prices from HD Pro, Lowe&apos;s Pro, or any supplier. Keep your BOM dollar amounts accurate as material costs change.
          </p>
        </div>

        {/* Freshness summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total Materials</p>
            <p className="text-2xl font-bold text-fence-900">{freshness.totalMaterials}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Priced</p>
            <p className="text-2xl font-bold text-green-700">{freshness.pricedMaterials}</p>
          </div>
          <div className={`rounded-xl border p-4 ${freshness.staleCount > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-gray-200"}`}>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Stale (30+ days)</p>
            <p className={`text-2xl font-bold ${freshness.staleCount > 0 ? "text-amber-600" : "text-gray-300"}`}>{freshness.staleCount}</p>
          </div>
          <div className={`rounded-xl border p-4 ${freshness.neverUpdated > 0 ? "bg-red-50 border-red-200" : "bg-white border-gray-200"}`}>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Never synced</p>
            <p className={`text-2xl font-bold ${freshness.neverUpdated > 0 ? "text-red-600" : "text-gray-300"}`}>{freshness.neverUpdated}</p>
          </div>
        </div>

        {freshness.lastSyncDate && (
          <p className="text-xs text-gray-400 mb-6">
            Last price sync: {new Date(freshness.lastSyncDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        )}

        {/* Instructions */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="font-semibold text-fence-900 mb-3">How to export from your supplier</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-orange-50 border border-orange-100 rounded-lg p-4">
              <p className="text-sm font-bold text-orange-900 mb-2">HD Pro / Pro Xtra</p>
              <ol className="text-xs text-orange-800 space-y-1 list-decimal list-inside">
                <li>Log in at homedepot.com/pro</li>
                <li>Go to Order History or Quotes</li>
                <li>Export as CSV or Excel</li>
                <li>Upload the file below</li>
              </ol>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <p className="text-sm font-bold text-blue-900 mb-2">Lowe&apos;s Pro</p>
              <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                <li>Log in at lowes.com/l/pro</li>
                <li>Go to My Lists or Order History</li>
                <li>Export as CSV</li>
                <li>Upload the file below</li>
              </ol>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
              <p className="text-sm font-bold text-gray-900 mb-2">Any Supplier</p>
              <p className="text-xs text-gray-600 mb-2">CSV with at least two columns:</p>
              <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                <li>Product description / name</li>
                <li>Unit price / net price</li>
              </ul>
            </div>
          </div>
        </div>

        <PriceSyncClient />
      </div>
    </main>
  );
}
