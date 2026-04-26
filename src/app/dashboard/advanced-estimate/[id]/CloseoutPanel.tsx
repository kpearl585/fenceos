"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { EnhancedCloseoutForm } from "@/components/EnhancedCloseoutForm";
import type { EstimateCloseoutAnalysis } from "@/lib/fence-graph/closeout/types";
import type { WasteCalibration } from "@/lib/fence-graph/bom/shared";
import type { EstimatorTuningRecommendation } from "@/lib/fence-graph/closeout/tuning";
import { applyCloseoutTuningRecommendations } from "../actions";

interface Props {
  estimateId: string;
  estimateName: string;
  estimatedValues: {
    materialCost: number;
    laborHours: number;
    laborCost: number;
    totalCost: number;
    wastePct: number;
  };
  isClosed: boolean;
  actuals: {
    wastePct: number | null;
    laborHours: number | null;
    crewSize: number | null;
    weatherConditions: string | null;
    materialCost: number | null;
    laborCost: number | null;
    totalCost: number | null;
    notes: string | null;
  };
  closedAt: string | null;
  calibration: WasteCalibration;
  analysis: EstimateCloseoutAnalysis | null;
  tuningRecommendations: EstimatorTuningRecommendation[];
  canApplyTuning: boolean;
}

function formatCurrency(value: number | null) {
  if (value == null) return "—";
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

export default function CloseoutPanel({
  estimateId,
  estimateName,
  estimatedValues,
  isClosed,
  actuals,
  closedAt,
  calibration,
  analysis,
  tuningRecommendations,
  canApplyTuning,
}: Props) {
  const router = useRouter();
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);
  const [isApplying, startApply] = useTransition();

  if (isClosed) {
    const autoRecommendations = tuningRecommendations.filter((item) => item.patch);

    return (
      <div className="space-y-4">
        <div className="bg-surface-2 rounded-xl border border-border p-5">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Closeout Complete</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted">Actual waste</span>
              <span className="font-display text-sm font-bold text-accent-light">
                {actuals.wastePct != null ? `${actuals.wastePct.toFixed(1)}%` : "—"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted">Actual materials</span>
              <span className="font-display text-sm font-bold text-text">{formatCurrency(actuals.materialCost)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted">Actual labor</span>
              <span className="font-display text-sm font-bold text-text">
                {actuals.laborHours != null ? `${actuals.laborHours.toFixed(1)}h` : "—"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted">Actual labor cost</span>
              <span className="font-display text-sm font-bold text-text">{formatCurrency(actuals.laborCost)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted">Actual total cost</span>
              <span className="font-display text-sm font-bold text-text">{formatCurrency(actuals.totalCost)}</span>
            </div>
            {actuals.crewSize != null && (
              <div className="flex justify-between items-center">
                <span className="text-muted">Crew / weather</span>
                <span className="font-display text-sm font-bold text-text">
                  {actuals.crewSize} crew{actuals.weatherConditions ? ` · ${actuals.weatherConditions}` : ""}
                </span>
              </div>
            )}
          </div>

          {closedAt && (
            <p className="text-xs text-muted mt-4">Closed {new Date(closedAt).toLocaleDateString()}</p>
          )}

          <div className="mt-4 bg-accent/10 border border-accent/30 rounded-lg p-3">
            <p className="text-xs font-semibold text-accent-light uppercase tracking-wider mb-1">Calibration updated</p>
            <p className="text-xs text-accent-light/80">
              Engine waste factor:{" "}
              <strong className="font-display text-accent-light">
                {(calibration.currentFactor * 100).toFixed(1)}%
              </strong>{" "}
              from {calibration.sampleCount} job{calibration.sampleCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {analysis && (
          <>
            <div className="bg-surface-2 rounded-xl border border-border p-5">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Variance Summary</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted">Estimated raw cost</span>
                  <span className="font-display text-sm font-bold text-text">
                    {formatCurrency(analysis.costVariance.estimatedRawCost)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted">Actual final cost</span>
                  <span className="font-display text-sm font-bold text-text">
                    {formatCurrency(analysis.costVariance.actualFinalJobCost)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted">Variance</span>
                  <span className="font-display text-sm font-bold text-accent-light">
                    {analysis.costVariance.variancePct >= 0 ? "+" : ""}
                    {(analysis.costVariance.variancePct * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted">Data completeness</span>
                  <span className="text-text capitalize">{analysis.costVariance.dataCompleteness ?? "none"}</span>
                </div>
              </div>
            </div>

            {(analysis.learningSummary.topVarianceDrivers.length > 0 ||
              analysis.learningSummary.whatToReviewNextTime.length > 0) && (
              <div className="bg-surface-2 rounded-xl border border-border p-5 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Top Variance Drivers</p>
                  <div className="space-y-2">
                    {analysis.learningSummary.topVarianceDrivers.slice(0, 3).map((driver) => (
                      <p key={driver} className="text-sm text-text">{driver}</p>
                    ))}
                  </div>
                </div>
                {analysis.learningSummary.whatToReviewNextTime.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Review Next Time</p>
                    <div className="space-y-2">
                      {analysis.learningSummary.whatToReviewNextTime.slice(0, 3).map((item) => (
                        <p key={item} className="text-sm text-text">{item}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {tuningRecommendations.length > 0 && (
          <div className="bg-surface-2 rounded-xl border border-border p-5 space-y-4">
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Estimator Tuning</p>
              <p className="text-sm text-muted">
                These recommendations were generated from this closeout. Auto-tuning only applies bounded, high-confidence corrections.
              </p>
            </div>

            <div className="space-y-3">
              {tuningRecommendations.map((recommendation) => (
                <div key={recommendation.id} className="rounded-lg border border-border bg-surface-3 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-text">{recommendation.title}</p>
                      <p className="text-xs text-muted mt-1">{recommendation.message}</p>
                    </div>
                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-accent-light bg-accent/10 border border-accent/20 rounded px-2 py-1">
                      {recommendation.patch ? "Auto" : "Review"}
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-2">{recommendation.reason}</p>
                  {recommendation.beforeValue != null && recommendation.afterValue != null && (
                    <p className="text-xs text-accent-light mt-2">
                      {recommendation.configArea}: {recommendation.beforeValue.toFixed(3)}
                      {recommendation.unit ? ` ${recommendation.unit}` : ""} → {recommendation.afterValue.toFixed(3)}
                      {recommendation.unit ? ` ${recommendation.unit}` : ""}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {canApplyTuning && autoRecommendations.length > 0 && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() =>
                    startApply(async () => {
                      setApplyError(null);
                      setApplySuccess(null);
                      const result = await applyCloseoutTuningRecommendations(estimateId);
                      if (!result.success) {
                        setApplyError(result.error ?? "Failed to apply tuning");
                        return;
                      }
                      setApplySuccess(
                        `Applied ${result.appliedCount ?? autoRecommendations.length} tuning ${result.appliedCount === 1 ? "update" : "updates"} to estimator settings.`
                      );
                      router.refresh();
                    })
                  }
                  disabled={isApplying}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold bg-accent hover:bg-accent-light accent-glow text-white transition-colors duration-150 disabled:opacity-50 disabled:hover:bg-accent"
                >
                  {isApplying
                    ? "Applying tuning..."
                    : `Apply ${autoRecommendations.length} Auto-Tuning ${autoRecommendations.length === 1 ? "Update" : "Updates"}`}
                </button>
                {applyError && <p className="text-xs text-danger">{applyError}</p>}
                {applySuccess && <p className="text-xs text-accent-light">{applySuccess}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-surface-2 rounded-xl border border-border p-5">
        <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Job Closeout</p>
        <p className="text-xs text-muted">
          Record real costs, labor, field conditions, and quantity drift for {estimateName}. This powers the feedback loop and keeps future estimates tighter.
        </p>
      </div>

      <div className="bg-surface-2 rounded-xl border border-border p-5">
        <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Current engine calibration</p>
        <p className="font-display text-sm font-bold text-text">
          {(calibration.currentFactor * 100).toFixed(1)}% waste factor
        </p>
        <p className="text-xs text-muted">
          {calibration.sampleCount === 0
            ? "Default baseline — no jobs closed yet"
            : `From ${calibration.sampleCount} closed job${calibration.sampleCount !== 1 ? "s" : ""}`}
        </p>
      </div>

      <EnhancedCloseoutForm
        estimateId={estimateId}
        estimatedValues={estimatedValues}
        onSuccess={() => router.refresh()}
        onCancel={() => router.refresh()}
      />
    </div>
  );
}
