import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSavedEstimate, getOrgCalibration, getOrgEstimatorConfig } from "../actions";
import CloseoutPanel from "./CloseoutPanel";
import ShareQuoteButton from "@/components/ShareQuoteButton";
import HoaPacketButton from "@/components/HoaPacketButton";
import type { FenceEstimateResult } from "@/lib/fence-graph/types";
import type { EstimateCloseoutAnalysis } from "@/lib/fence-graph/closeout/types";
import type { CloseoutActuals } from "@/lib/fence-graph/closeout/types";
import { buildEstimatorTuningRecommendations, type EstimatorTuningRecommendation } from "@/lib/fence-graph/closeout/tuning";
import { inferFenceTypeFromProductLineId } from "@/lib/fence-graph/estimateInput";

export const metadata = { title: "Estimate Detail — FenceEstimatePro" };

function fmt(n: number) {
  return "$" + Math.round(n).toLocaleString("en-US");
}

export default async function SavedEstimateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const profile = await ensureProfile(supabase, user);

  const est = await getSavedEstimate(id);
  if (!est) redirect("/dashboard/advanced-estimate/saved");

  const cal = await getOrgCalibration();
  const { config } = await getOrgEstimatorConfig();
  const result = est.result_json as FenceEstimateResult;
  const isClosed = est.status === "closed";
  const analysis =
    (est.closeout_analysis_json as EstimateCloseoutAnalysis | null | undefined) ?? null;
  const actuals =
    (est.closeout_actuals_json as CloseoutActuals | null | undefined) ?? null;
  const persistedInput = est.input_json as {
    productLineId?: string;
    fenceType?: string;
    siteComplexity?: import("@/lib/fence-graph/accuracy-types").SiteComplexity | null;
  };
  const fenceType = (
    typeof persistedInput.fenceType === "string"
      ? persistedInput.fenceType
      : inferFenceTypeFromProductLineId(persistedInput.productLineId)
  ) as "vinyl" | "wood" | "chain_link" | "aluminum" | null;
  const tuningRecommendations: EstimatorTuningRecommendation[] =
    analysis && actuals && fenceType
      ? buildEstimatorTuningRecommendations({
          analysis,
          actuals,
          currentConfig: config,
          fenceType,
          siteComplexity: persistedInput.siteComplexity ?? null,
        })
      : [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link href="/dashboard/advanced-estimate/saved" className="text-sm text-muted hover:text-accent-light transition-colors duration-150">
          Saved Estimates
        </Link>
        <span className="text-muted">/</span>
        <h1 className="font-display text-xl font-bold text-text">{est.name}</h1>
        {isClosed && (
          <span className="text-xs font-semibold bg-accent/15 text-accent-light border border-accent/30 px-2 py-0.5 rounded uppercase tracking-wider">Closed</span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Estimate summary */}
        <div className="lg:col-span-2 space-y-4">
          {/* Summary card — signature accent-glow panel, same treatment as
              the live estimator summary. */}
          <div className="bg-background border border-accent/20 accent-glow text-text rounded-xl p-5">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-muted text-xs uppercase tracking-wider">Total LF</p>
                <p className="font-display text-2xl font-bold text-text">{est.total_lf}</p>
              </div>
              <div>
                <p className="text-muted text-xs uppercase tracking-wider">Estimated Cost</p>
                <p className="font-display text-2xl font-bold text-text">{fmt(est.total_cost ?? 0)}</p>
              </div>
              <div>
                <p className="text-muted text-xs uppercase tracking-wider">Created</p>
                <p className="font-display text-lg font-semibold text-text">{new Date(result.graph.audit.extractionDate).toLocaleDateString()}</p>
              </div>
            </div>
            {isClosed && est.closeout_actual_waste_pct != null && (
              <div className="border-t border-border pt-3">
                <p className="text-muted text-xs uppercase tracking-wider mb-1">Actual Waste Recorded</p>
                <p className="font-display text-xl font-bold text-accent-light">{(est.closeout_actual_waste_pct * 100).toFixed(1)}%</p>
                {est.closeout_notes && <p className="text-muted text-xs mt-1">{est.closeout_notes}</p>}
              </div>
            )}
          </div>

          {/* BOM table */}
          <div className="bg-surface-2 rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <h2 className="font-semibold text-text text-sm">Bill of Materials</h2>
            </div>
            <div className="divide-y divide-border">
              <div className="px-4 py-2 bg-surface-3 grid grid-cols-12 gap-1 text-xs font-semibold text-muted uppercase tracking-wider">
                <span className="col-span-5">Material</span>
                <span className="col-span-2 text-right">Qty</span>
                <span className="col-span-2 text-right">Unit $</span>
                <span className="col-span-3 text-right">Ext. Cost</span>
              </div>
              {result.bom.map((item, i) => (
                <div key={i} className="px-4 py-2.5 grid grid-cols-12 gap-1 items-center hover:bg-surface-3 transition-colors duration-150">
                  <div className="col-span-5">
                    <p className="text-sm font-medium text-text truncate">{item.name}</p>
                    <p className="text-xs text-muted truncate">{item.traceability}</p>
                  </div>
                  <p className="col-span-2 text-sm font-bold font-display text-text text-right">{item.qty} <span className="text-xs text-muted font-normal">{item.unit}</span></p>
                  <p className="col-span-2 text-xs text-muted text-right font-mono">
                    {item.unitCost != null ? fmt(item.unitCost) : <span className="text-warning">—</span>}
                  </p>
                  <p className="col-span-3 text-sm font-semibold text-right">
                    {item.extCost != null && item.extCost > 0
                      ? <span className="text-text font-display">{fmt(item.extCost)}</span>
                      : <span className="text-warning text-xs">—</span>}
                  </p>
                </div>
              ))}
              <div className="px-4 py-3 bg-surface-3 flex justify-between">
                <p className="text-sm font-bold text-text">Materials Total</p>
                <p className="font-display text-sm font-bold text-accent-light">{fmt(result.totalMaterialCost)}</p>
              </div>
            </div>
          </div>

          {/* Labor */}
          <div className="bg-surface-2 rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <h2 className="font-semibold text-text text-sm">Labor Drivers</h2>
            </div>
            <div className="divide-y divide-border">
              {result.laborDrivers.filter(l => l.count > 0).map((l, i) => (
                <div key={i} className="px-4 py-2.5 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-text">{l.activity}</p>
                    <p className="text-xs text-muted">{l.count} × {l.rateHrs}h</p>
                  </div>
                  <p className="font-display text-sm font-bold text-text">{l.totalHrs.toFixed(1)}h</p>
                </div>
              ))}
              <div className="px-4 py-3 bg-surface-3 flex justify-between">
                <p className="text-sm font-bold text-text">Total Labor</p>
                <p className="font-display text-sm font-bold text-accent-light">{result.totalLaborHrs}h · {fmt(result.totalLaborCost)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Closeout panel */}
        <div className="space-y-4">
          {/* Share Quote Button */}
          {!isClosed && (
            <div className="bg-surface-2 rounded-xl border border-border p-5">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Share with Customer</h3>
              <p className="text-xs text-muted mb-4">
                Send a secure link for customer to view and accept this quote.
              </p>
              <ShareQuoteButton estimateId={est.id} estimateName={est.name} />
            </div>
          )}

          {/* HOA Packet generation */}
          <div className="bg-surface-2 rounded-xl border border-border p-5">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">HOA Submittal</h3>
            <p className="text-xs text-muted mb-4">
              Generate a packet bundling your insurance certificate with a project cover page.
            </p>
            <HoaPacketButton estimateId={est.id} estimateName={est.name} />
          </div>

          {/* Closeout Panel */}
          <CloseoutPanel
            estimateId={est.id}
            estimateName={est.name}
            estimatedValues={{
              materialCost: result.totalMaterialCost,
              laborHours: result.totalLaborHrs,
              laborCost: result.totalLaborCost,
              totalCost: result.totalCost,
              wastePct: est.waste_pct * 100,
            }}
            isClosed={isClosed}
            actuals={{
              wastePct: est.closeout_actual_waste_pct != null ? est.closeout_actual_waste_pct * 100 : null,
              laborHours: est.closeout_actual_labor_hours ?? null,
              crewSize: est.closeout_crew_size ?? null,
              weatherConditions: est.closeout_weather_conditions ?? null,
              materialCost: est.closeout_actual_material_cost ?? null,
              laborCost: est.closeout_actual_labor_cost ?? null,
              totalCost: est.closeout_actual_total_cost ?? null,
              notes: est.closeout_notes ?? null,
            }}
            closedAt={est.closed_at}
            calibration={cal}
            analysis={analysis}
            tuningRecommendations={tuningRecommendations}
            canApplyTuning={profile.role === "owner"}
          />
        </div>
      </div>
    </div>
  );
}
