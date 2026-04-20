import { redirect } from "next/navigation";
import Link from "next/link";
import { getSavedEstimate, getOrgCalibration } from "../actions";
import CloseoutPanel from "./CloseoutPanel";
import ShareQuoteButton from "@/components/ShareQuoteButton";
import HoaPacketButton from "@/components/HoaPacketButton";
import type { FenceEstimateResult } from "@/lib/fence-graph/types";

export const metadata = { title: "Estimate Detail — FenceEstimatePro" };

function fmt(n: number) {
  return "$" + Math.round(n).toLocaleString("en-US");
}

export default async function SavedEstimateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const est = await getSavedEstimate(id);
  if (!est) redirect("/dashboard/advanced-estimate/saved");

  const cal = await getOrgCalibration();
  const result = est.result_json as FenceEstimateResult;
  const input = est.input_json;
  const isClosed = est.status === "closed";

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard/advanced-estimate/saved" className="text-sm text-gray-400 hover:text-fence-600">
            Saved Estimates
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-xl font-bold text-fence-950">{est.name}</h1>
          {isClosed && (
            <span className="text-xs font-semibold bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded">Closed</span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Estimate summary */}
          <div className="lg:col-span-2 space-y-4">
            {/* Summary card */}
            <div className="bg-fence-950 text-white rounded-xl p-5">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-fence-300 text-xs">Total LF</p>
                  <p className="text-2xl font-bold">{est.total_lf}</p>
                </div>
                <div>
                  <p className="text-fence-300 text-xs">Estimated Cost</p>
                  <p className="text-2xl font-bold">{fmt(est.total_cost ?? 0)}</p>
                </div>
                <div>
                  <p className="text-fence-300 text-xs">Created</p>
                  <p className="text-lg font-semibold">{new Date(result.graph.audit.extractionDate).toLocaleDateString()}</p>
                </div>
              </div>
              {isClosed && est.closeout_actual_waste_pct != null && (
                <div className="border-t border-fence-800 pt-3">
                  <p className="text-fence-300 text-xs mb-1">Actual Waste Recorded</p>
                  <p className="text-xl font-bold text-green-400">{(est.closeout_actual_waste_pct * 100).toFixed(1)}%</p>
                  {est.closeout_notes && <p className="text-fence-300 text-xs mt-1">{est.closeout_notes}</p>}
                </div>
              )}
            </div>

            {/* BOM table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <h2 className="font-semibold text-fence-900 text-sm">Bill of Materials</h2>
              </div>
              <div className="divide-y divide-gray-50">
                <div className="px-4 py-2 bg-gray-50 grid grid-cols-12 gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  <span className="col-span-5">Material</span>
                  <span className="col-span-2 text-right">Qty</span>
                  <span className="col-span-2 text-right">Unit $</span>
                  <span className="col-span-3 text-right">Ext. Cost</span>
                </div>
                {result.bom.map((item, i) => (
                  <div key={i} className="px-4 py-2.5 grid grid-cols-12 gap-1 items-center hover:bg-gray-50">
                    <div className="col-span-5">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                      <p className="text-xs text-gray-400 truncate">{item.traceability}</p>
                    </div>
                    <p className="col-span-2 text-sm font-bold text-gray-900 text-right">{item.qty} <span className="text-xs text-gray-400 font-normal">{item.unit}</span></p>
                    <p className="col-span-2 text-xs text-gray-500 text-right">
                      {item.unitCost != null ? fmt(item.unitCost) : <span className="text-amber-400">—</span>}
                    </p>
                    <p className="col-span-3 text-sm font-semibold text-right">
                      {item.extCost != null && item.extCost > 0
                        ? <span className="text-gray-900">{fmt(item.extCost)}</span>
                        : <span className="text-amber-400 text-xs">—</span>}
                    </p>
                  </div>
                ))}
                <div className="px-4 py-3 bg-gray-50 flex justify-between">
                  <p className="text-sm font-bold text-gray-700">Materials Total</p>
                  <p className="text-sm font-bold text-fence-700">{fmt(result.totalMaterialCost)}</p>
                </div>
              </div>
            </div>

            {/* Labor */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <h2 className="font-semibold text-fence-900 text-sm">Labor Drivers</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {result.laborDrivers.filter(l => l.count > 0).map((l, i) => (
                  <div key={i} className="px-4 py-2.5 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{l.activity}</p>
                      <p className="text-xs text-gray-400">{l.count} × {l.rateHrs}h</p>
                    </div>
                    <p className="text-sm font-bold text-gray-900">{l.totalHrs.toFixed(1)}h</p>
                  </div>
                ))}
                <div className="px-4 py-3 bg-gray-50 flex justify-between">
                  <p className="text-sm font-bold text-gray-700">Total Labor</p>
                  <p className="text-sm font-bold text-fence-700">{result.totalLaborHrs}h · {fmt(result.totalLaborCost)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Closeout panel */}
          <div className="space-y-4">
            {/* Share Quote Button */}
            {!isClosed && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Share with Customer</h3>
                <p className="text-xs text-gray-600 mb-4">
                  Send a secure link for customer to view and accept this quote.
                </p>
                <ShareQuoteButton estimateId={est.id} estimateName={est.name} />
              </div>
            )}

            {/* HOA Packet generation */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">HOA Submittal</h3>
              <p className="text-xs text-gray-600 mb-4">
                Generate a packet bundling your insurance certificate with a project cover page.
              </p>
              <HoaPacketButton estimateId={est.id} estimateName={est.name} />
            </div>

            {/* Closeout Panel */}
            <CloseoutPanel
              estimateId={est.id}
              estimateName={est.name}
              estimatedWastePct={est.waste_pct * 100}
              isClosed={isClosed}
              actualWastePct={est.closeout_actual_waste_pct != null ? est.closeout_actual_waste_pct * 100 : null}
              closedAt={est.closed_at}
              calibration={cal}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
