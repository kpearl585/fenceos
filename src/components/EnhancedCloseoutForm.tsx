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

  const [closeoutData, setCloseoutData] = useState<CloseoutData>({
    actualWastePct: estimatedValues.wastePct,
    notes: "",
    actualLaborHours: estimatedValues.laborHours,
    crewSize: 2,
    weatherConditions: "clear",
    actualMaterialCost: estimatedValues.materialCost,
    actualLaborCost: estimatedValues.laborCost,
    actualTotalCost: estimatedValues.totalCost,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await closeoutEstimateEnhanced(estimateId, closeoutData);

    if (result.success) {
      onSuccess();
    } else {
      setError(result.error ?? "Failed to close estimate");
    }
    setLoading(false);
  };

  const materialVariance = estimatedValues.materialCost > 0
    ? ((closeoutData.actualMaterialCost - estimatedValues.materialCost) / estimatedValues.materialCost * 100).toFixed(1)
    : "0.0";

  const laborVariance = estimatedValues.laborHours > 0
    ? ((closeoutData.actualLaborHours - estimatedValues.laborHours) / estimatedValues.laborHours * 100).toFixed(1)
    : "0.0";

  const totalVariance = estimatedValues.totalCost > 0
    ? ((closeoutData.actualTotalCost - estimatedValues.totalCost) / estimatedValues.totalCost * 100).toFixed(1)
    : "0.0";

  const wasteVariance = estimatedValues.wastePct > 0
    ? ((closeoutData.actualWastePct - estimatedValues.wastePct) / estimatedValues.wastePct * 100).toFixed(1)
    : "0.0";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6 bg-white rounded-lg border border-gray-200">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Close Out Job</h2>
        <p className="text-sm text-gray-600 mt-1">
          Record actual costs and hours to improve future estimates
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Material Costs */}
      <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-gray-900">Material Costs</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estimated: ${estimatedValues.materialCost.toFixed(2)}
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Actual Material Cost *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={closeoutData.actualMaterialCost}
              onChange={(e) => setCloseoutData({ ...closeoutData, actualMaterialCost: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <p className={`text-xs mt-1 ${parseFloat(materialVariance) > 0 ? "text-red-600" : "text-green-600"}`}>
              {parseFloat(materialVariance) > 0 ? "+" : ""}{materialVariance}% variance
            </p>
          </div>
        </div>
      </div>

      {/* Labor */}
      <div className="space-y-4 p-4 bg-green-50 rounded-lg">
        <h3 className="font-semibold text-gray-900">Labor</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estimated: {estimatedValues.laborHours.toFixed(1)} hrs
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Actual Labor Hours *
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              required
              value={closeoutData.actualLaborHours}
              onChange={(e) => setCloseoutData({ ...closeoutData, actualLaborHours: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <p className={`text-xs mt-1 ${parseFloat(laborVariance) > 0 ? "text-red-600" : "text-green-600"}`}>
              {parseFloat(laborVariance) > 0 ? "+" : ""}{laborVariance}% variance
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Crew Size *
            </label>
            <input
              type="number"
              min="1"
              max="20"
              required
              value={closeoutData.crewSize}
              onChange={(e) => setCloseoutData({ ...closeoutData, crewSize: parseInt(e.target.value) || 2 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Weather Conditions *
            </label>
            <select
              value={closeoutData.weatherConditions}
              onChange={(e) => setCloseoutData({ ...closeoutData, weatherConditions: e.target.value as CloseoutData["weatherConditions"] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Actual Labor Cost *
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={closeoutData.actualLaborCost}
            onChange={(e) => setCloseoutData({ ...closeoutData, actualLaborCost: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>

      {/* Waste */}
      <div className="space-y-4 p-4 bg-yellow-50 rounded-lg">
        <h3 className="font-semibold text-gray-900">Material Waste</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estimated: {estimatedValues.wastePct.toFixed(1)}%
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Actual Waste % *
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              required
              value={closeoutData.actualWastePct}
              onChange={(e) => setCloseoutData({ ...closeoutData, actualWastePct: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <p className={`text-xs mt-1 ${parseFloat(wasteVariance) > 0 ? "text-red-600" : "text-green-600"}`}>
              {parseFloat(wasteVariance) > 0 ? "+" : ""}{wasteVariance}% variance
            </p>
          </div>
        </div>
      </div>

      {/* Total Cost */}
      <div className="space-y-4 p-4 bg-purple-50 rounded-lg">
        <h3 className="font-semibold text-gray-900">Total Cost</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estimated: ${estimatedValues.totalCost.toFixed(2)}
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Actual Total Cost *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={closeoutData.actualTotalCost}
              onChange={(e) => setCloseoutData({ ...closeoutData, actualTotalCost: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <p className={`text-xs mt-1 ${parseFloat(totalVariance) > 0 ? "text-red-600" : "text-green-600"}`}>
              {parseFloat(totalVariance) > 0 ? "+" : ""}{totalVariance}% variance
            </p>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          value={closeoutData.notes}
          onChange={(e) => setCloseoutData({ ...closeoutData, notes: e.target.value })}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="Any surprises? Issues encountered? Lessons learned?"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? "Closing..." : "Close Job"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
