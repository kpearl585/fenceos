"use client";
import { useState } from "react";
import type { CloseoutData } from "@/lib/fence-graph/accuracy-types";
import { closeoutEstimateEnhanced } from "@/app/dashboard/advanced-estimate/actions";

interface EnhancedCloseoutFormProps {
  estimateId: string;
  estimatedValues: {
    materialCost: number;
    laborHours: number;
    laborCost: number;
    totalCost: number;
    wastePct: number;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

export function EnhancedCloseoutForm({
  estimateId,
  estimatedValues,
  onSuccess,
  onCancel,
}: EnhancedCloseoutFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hiddenCostNotesText, setHiddenCostNotesText] = useState("");

  const [closeoutData, setCloseoutData] = useState<CloseoutData>({
    actualWastePct: estimatedValues.wastePct,
    notes: "",
    actualLaborHours: estimatedValues.laborHours,
    crewSize: 2,
    weatherConditions: "clear",
    actualMaterialCost: estimatedValues.materialCost,
    actualLaborCost: estimatedValues.laborCost,
    actualTotalCost: estimatedValues.totalCost,
    actualEquipmentCost: 0,
    actualLogisticsCost: 0,
    actualDisposalCost: 0,
    actualRegulatoryCost: 0,
    actualConcreteBags: 0,
    actualPostsUsed: 0,
    actualPanelsOrPicketsUsed: 0,
    fieldConditions: {},
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await closeoutEstimateEnhanced(estimateId, {
      ...closeoutData,
      hiddenCostNotes: hiddenCostNotesText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    });

    if (result.success) {
      onSuccess();
    } else {
      setError(result.error ?? "Failed to close estimate");
    }
    setLoading(false);
  };

  const materialVariance = estimatedValues.materialCost > 0
    ? ((((closeoutData.actualMaterialCost ?? 0) - estimatedValues.materialCost) / estimatedValues.materialCost) * 100).toFixed(1)
    : "0.0";

  const laborVariance = estimatedValues.laborHours > 0
    ? ((((closeoutData.actualLaborHours ?? 0) - estimatedValues.laborHours) / estimatedValues.laborHours) * 100).toFixed(1)
    : "0.0";

  const totalVariance = estimatedValues.totalCost > 0
    ? ((((closeoutData.actualTotalCost ?? 0) - estimatedValues.totalCost) / estimatedValues.totalCost) * 100).toFixed(1)
    : "0.0";

  const wasteVariance = estimatedValues.wastePct > 0
    ? ((((closeoutData.actualWastePct ?? 0) - estimatedValues.wastePct) / estimatedValues.wastePct) * 100).toFixed(1)
    : "0.0";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6 bg-surface-2 rounded-lg border border-border">
      <div>
        <h2 className="text-xl font-bold text-text">Close Out Job</h2>
        <p className="text-sm text-muted mt-1">
          Record actual costs and hours to improve future estimates
        </p>
      </div>

      {error && (
        <div className="p-3 bg-danger/10 border border-danger/30 rounded text-sm text-danger">
          {error}
        </div>
      )}

      {/* Material Costs */}
      <div className="space-y-4 p-4 bg-surface-3 border border-border rounded-lg">
        <h3 className="font-semibold text-text">Material Costs</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">
              Estimated: ${estimatedValues.materialCost.toFixed(2)}
            </label>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">
              Actual Material Cost *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={closeoutData.actualMaterialCost ?? 0}
              onChange={(e) => setCloseoutData({ ...closeoutData, actualMaterialCost: parseFloat(e.target.value) || 0 })}
              className="w-full border border-border bg-surface-2 text-text rounded-lg px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-150"
            />
            <p className={`text-xs mt-1 ${parseFloat(materialVariance) > 0 ? "text-danger" : "text-accent-light"}`}>
              {parseFloat(materialVariance) > 0 ? "+" : ""}{materialVariance}% variance
            </p>
          </div>
        </div>
      </div>

      {/* Labor */}
      <div className="space-y-4 p-4 bg-surface-3 border border-border rounded-lg">
        <h3 className="font-semibold text-text">Labor</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">
              Estimated: {estimatedValues.laborHours.toFixed(1)} hrs
            </label>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">
              Actual Labor Hours *
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              required
              value={closeoutData.actualLaborHours ?? 0}
              onChange={(e) => setCloseoutData({ ...closeoutData, actualLaborHours: parseFloat(e.target.value) || 0 })}
              className="w-full border border-border bg-surface-2 text-text rounded-lg px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-150"
            />
            <p className={`text-xs mt-1 ${parseFloat(laborVariance) > 0 ? "text-danger" : "text-accent-light"}`}>
              {parseFloat(laborVariance) > 0 ? "+" : ""}{laborVariance}% variance
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">
              Crew Size *
            </label>
            <input
              type="number"
              min="1"
              max="20"
              required
              value={closeoutData.crewSize ?? 2}
              onChange={(e) => setCloseoutData({ ...closeoutData, crewSize: parseInt(e.target.value) || 2 })}
              className="w-full border border-border bg-surface-2 text-text rounded-lg px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-150"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">
              Weather Conditions *
            </label>
            <select
              value={closeoutData.weatherConditions ?? "clear"}
              onChange={(e) => setCloseoutData({ ...closeoutData, weatherConditions: e.target.value as CloseoutData["weatherConditions"] })}
              className="w-full border border-border bg-surface-2 text-text rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-150"
            >
              <option value="clear">Clear</option>
              <option value="rain">Rain</option>
              <option value="heat">Heat</option>
              <option value="cold">Cold</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">
            Actual Labor Cost *
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={closeoutData.actualLaborCost ?? 0}
            onChange={(e) => setCloseoutData({ ...closeoutData, actualLaborCost: parseFloat(e.target.value) || 0 })}
            className="w-full border border-border bg-surface-2 text-text rounded-lg px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-150"
          />
        </div>
      </div>

      {/* Waste */}
      <div className="space-y-4 p-4 bg-surface-3 border border-border rounded-lg">
        <h3 className="font-semibold text-text">Material Waste</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">
              Estimated: {estimatedValues.wastePct.toFixed(1)}%
            </label>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">
              Actual Waste % *
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              required
              value={closeoutData.actualWastePct ?? 0}
              onChange={(e) => setCloseoutData({ ...closeoutData, actualWastePct: parseFloat(e.target.value) || 0 })}
              className="w-full border border-border bg-surface-2 text-text rounded-lg px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-150"
            />
            <p className={`text-xs mt-1 ${parseFloat(wasteVariance) > 0 ? "text-danger" : "text-accent-light"}`}>
              {parseFloat(wasteVariance) > 0 ? "+" : ""}{wasteVariance}% variance
            </p>
          </div>
        </div>
      </div>

      {/* Total Cost */}
      <div className="space-y-4 p-4 bg-surface-3 border border-border rounded-lg">
        <h3 className="font-semibold text-text">Total Cost</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">
              Estimated: ${estimatedValues.totalCost.toFixed(2)}
            </label>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">
              Actual Total Cost *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={closeoutData.actualTotalCost ?? 0}
              onChange={(e) => setCloseoutData({ ...closeoutData, actualTotalCost: parseFloat(e.target.value) || 0 })}
              className="w-full border border-border bg-surface-2 text-text rounded-lg px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-150"
            />
            <p className={`text-xs mt-1 ${parseFloat(totalVariance) > 0 ? "text-danger" : "text-accent-light"}`}>
              {parseFloat(totalVariance) > 0 ? "+" : ""}{totalVariance}% variance
            </p>
          </div>
        </div>
      </div>

      {/* Optional Actual Cost Buckets */}
      <div className="space-y-4 p-4 bg-surface-3 border border-border rounded-lg">
        <div>
          <h3 className="font-semibold text-text">Extra Cost Categories</h3>
          <p className="text-xs text-muted mt-1">
            Fill these when they affected the job. Leaving them blank or zero is fine.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            ["actualEquipmentCost", "Equipment Cost"],
            ["actualLogisticsCost", "Delivery / Logistics"],
            ["actualDisposalCost", "Disposal / Tear-Out"],
            ["actualRegulatoryCost", "Permits / Regulatory"],
          ].map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">
                {label}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={closeoutData[key as keyof CloseoutData] as number | undefined ?? 0}
                onChange={(e) =>
                  setCloseoutData({
                    ...closeoutData,
                    [key]: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full border border-border bg-surface-2 text-text rounded-lg px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-150"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Optional Quantity Actuals */}
      <div className="space-y-4 p-4 bg-surface-3 border border-border rounded-lg">
        <div>
          <h3 className="font-semibold text-text">Field Quantity Actuals</h3>
          <p className="text-xs text-muted mt-1">
            These help explain why a job drifted even when the final dollars look close.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            ["actualConcreteBags", "Concrete Bags"],
            ["actualPostsUsed", "Posts Used"],
            ["actualPanelsOrPicketsUsed", "Panels / Pickets Used"],
          ].map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">
                {label}
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={closeoutData[key as keyof CloseoutData] as number | undefined ?? 0}
                onChange={(e) =>
                  setCloseoutData({
                    ...closeoutData,
                    [key]: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full border border-border bg-surface-2 text-text rounded-lg px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-150"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Field Conditions */}
      <div className="space-y-4 p-4 bg-surface-3 border border-border rounded-lg">
        <div>
          <h3 className="font-semibold text-text">Field Conditions</h3>
          <p className="text-xs text-muted mt-1">
            Mark the site realities that slowed the crew or changed the scope.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            ["rock", "Rock / hard digging"],
            ["roots", "Heavy roots / vegetation"],
            ["standingWater", "Standing water / wet holes"],
            ["accessIssues", "Access issues / long carry"],
            ["utilityConflict", "Utilities / locates caused delays"],
            ["weatherDelay", "Weather delay affected productivity"],
          ].map(([key, label]) => (
            <label
              key={key}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text"
            >
              <input
                type="checkbox"
                checked={Boolean(closeoutData.fieldConditions?.[key as keyof NonNullable<CloseoutData["fieldConditions"]>])}
                onChange={(e) =>
                  setCloseoutData({
                    ...closeoutData,
                    fieldConditions: {
                      ...closeoutData.fieldConditions,
                      [key]: e.target.checked,
                    },
                  })
                }
                className="h-4 w-4 rounded border-border bg-surface-3 text-accent focus:ring-accent"
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Hidden Costs */}
      <div className="space-y-3 p-4 bg-surface-3 border border-border rounded-lg">
        <div>
          <h3 className="font-semibold text-text">Hidden Costs / Lessons Learned</h3>
          <p className="text-xs text-muted mt-1">
            Enter one item per line for anything the estimator should learn from.
          </p>
        </div>
        <textarea
          value={hiddenCostNotesText}
          onChange={(e) => setHiddenCostNotesText(e.target.value)}
          rows={4}
          className="w-full border border-border bg-surface-2 text-text rounded-lg px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-150"
          placeholder={"Extra tear-out around old footings\nTight alley access required hand-carry\nCustomer changed latch hardware mid-job"}
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">
          Notes
        </label>
        <textarea
          value={closeoutData.notes ?? ""}
          onChange={(e) => setCloseoutData({ ...closeoutData, notes: e.target.value })}
          rows={4}
          className="w-full border border-border bg-surface-3 text-text rounded-lg px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-150"
          placeholder="Any surprises? Issues encountered? Lessons learned?"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-accent hover:bg-accent-light accent-glow text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50 transition-colors duration-150"
        >
          {loading ? "Closing..." : "Close Job"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 border border-border bg-surface-3 hover:bg-surface-2 text-text rounded-lg disabled:opacity-50 transition-colors duration-150"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
