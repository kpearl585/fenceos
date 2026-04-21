"use client";

import { useState } from "react";
import { saveJobOutcome } from "@/app/dashboard/jobs/outcomeActions";
import type { JobOutcome } from "@/types/database";

interface JobOutcomeFormProps {
  jobId: string;
  estimatedTotal: number;
  existingOutcome: JobOutcome | null;
}

export default function JobOutcomeForm({ jobId, estimatedTotal, existingOutcome }: JobOutcomeFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);

    try {
      await saveJobOutcome(formData);
      setSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to save job outcome");
    } finally {
      setIsSaving(false);
    }
  };

  const actualTotal = existingOutcome?.actual_total_cost || 0;
  const variance = existingOutcome?.actual_total_cost ? estimatedTotal - existingOutcome.actual_total_cost : 0;
  const variancePct = existingOutcome?.actual_total_cost ? (variance / estimatedTotal) * 100 : 0;

  return (
    <div className="bg-surface-2 rounded-xl border border-border p-4 mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-text text-sm">Actual Job Costs</h3>
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="text-xs px-3 py-1.5 bg-accent hover:bg-accent-light accent-glow text-white rounded-lg font-semibold transition-colors duration-150"
          >
            {existingOutcome ? "Update" : "Log Costs"}
          </button>
        )}
      </div>

      {existingOutcome && !isOpen ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted">Material Cost</p>
              <p className="font-semibold text-text">
                ${existingOutcome.actual_material_cost?.toLocaleString() || "—"}
              </p>
            </div>
            <div>
              <p className="text-muted">Labor Hours</p>
              <p className="font-semibold text-text">{existingOutcome.actual_labor_hours || "—"}</p>
            </div>
            <div>
              <p className="text-muted">Total Cost</p>
              <p className="font-semibold text-text">${actualTotal.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted">Variance</p>
              <p className={`font-semibold ${variance >= 0 ? "text-accent-light" : "text-danger"}`}>
                {variance >= 0 ? "+" : ""}${variance.toLocaleString()} ({variancePct >= 0 ? "+" : ""}
                {variancePct.toFixed(1)}%)
              </p>
            </div>
          </div>
          {existingOutcome.notes && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-muted">Notes:</p>
              <p className="text-sm mt-1 text-text">{existingOutcome.notes}</p>
            </div>
          )}
        </div>
      ) : !existingOutcome && !isOpen ? (
        <p className="text-sm text-muted">
          Log actual costs to track estimate accuracy and improve future quotes.
        </p>
      ) : null}

      {isOpen && (
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <input type="hidden" name="jobId" value={jobId} />

          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">
              Actual Material Cost ($)
            </label>
            <input
              type="number"
              name="actualMaterialCost"
              step="0.01"
              defaultValue={existingOutcome?.actual_material_cost || ""}
              className="w-full border border-border bg-surface-3 text-text rounded-lg px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-150"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">
              Actual Labor Hours
            </label>
            <input
              type="number"
              name="actualLaborHours"
              step="0.5"
              defaultValue={existingOutcome?.actual_labor_hours || ""}
              className="w-full border border-border bg-surface-3 text-text rounded-lg px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-150"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">
              Actual Total Cost ($) <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              name="actualTotalCost"
              step="0.01"
              required
              defaultValue={existingOutcome?.actual_total_cost || ""}
              className="w-full border border-border bg-surface-3 text-text rounded-lg px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-150"
              placeholder="0.00"
            />
            <p className="text-xs text-muted mt-1">
              Estimated: ${estimatedTotal.toLocaleString()}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider">
              Notes (optional)
            </label>
            <textarea
              name="notes"
              rows={3}
              defaultValue={existingOutcome?.notes || ""}
              className="w-full border border-border bg-surface-3 text-text rounded-lg px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-150"
              placeholder="Any issues or complications..."
            />
          </div>

          {error && (
            <div className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg p-3">
              {error}
            </div>
          )}

          {success && (
            <div className="text-sm text-accent-light bg-accent/10 border border-accent/30 rounded-lg p-3">
              ✓ Job outcome saved successfully
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 bg-accent hover:bg-accent-light accent-glow text-white py-2 rounded-lg text-sm font-semibold transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setError(null);
              }}
              className="flex-1 bg-surface-3 border border-border text-text py-2 rounded-lg text-sm font-semibold hover:bg-surface-2 transition-colors duration-150"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
