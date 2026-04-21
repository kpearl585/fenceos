"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { closeoutEstimate } from "../actions";
import type { WasteCalibration } from "@/lib/fence-graph/bom/shared";

interface Props {
  estimateId: string;
  estimateName: string;
  estimatedWastePct: number;
  isClosed: boolean;
  actualWastePct: number | null;
  closedAt: string | null;
  calibration: WasteCalibration;
}

const INPUT_CLASS = "w-full border border-border bg-surface-3 text-text rounded-lg px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-150";

export default function CloseoutPanel({
  estimateId, estimateName, estimatedWastePct, isClosed, actualWastePct, closedAt, calibration
}: Props) {
  const router = useRouter();
  const [wastePct, setWastePct] = useState(estimatedWastePct.toFixed(1));
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [newCal, setNewCal] = useState<WasteCalibration | null>(null);

  async function handleCloseout() {
    setStatus("submitting");
    const res = await closeoutEstimate(estimateId, Number(wastePct), notes);
    if (res.success) {
      setStatus("done");
      setNewCal(res.newCalibration ?? null);
      router.refresh();
    } else {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }

  if (isClosed) {
    return (
      <div className="bg-surface-2 rounded-xl border border-border p-5">
        <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Closeout Complete</p>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-muted">Actual waste recorded</span>
          <span className="font-display text-sm font-bold text-accent-light">{actualWastePct?.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-muted">Estimated waste was</span>
          <span className="font-display text-sm font-bold text-text">{estimatedWastePct.toFixed(1)}%</span>
        </div>
        {closedAt && (
          <p className="text-xs text-muted">Closed {new Date(closedAt).toLocaleDateString()}</p>
        )}
        <div className="mt-4 bg-accent/10 border border-accent/30 rounded-lg p-3">
          <p className="text-xs font-semibold text-accent-light uppercase tracking-wider mb-1">Calibration updated</p>
          <p className="text-xs text-accent-light/80">Engine waste factor: <strong className="font-display text-accent-light">{(calibration.currentFactor * 100).toFixed(1)}%</strong> from {calibration.sampleCount} job{calibration.sampleCount !== 1 ? "s" : ""}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-2 rounded-xl border border-border p-5">
      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Job Closeout</p>
      <p className="text-xs text-muted mb-4">
        Record actual material waste after the job completes. This updates your engine calibration — future estimates get more accurate automatically.
      </p>

      {/* Current calibration */}
      <div className="bg-surface-3 rounded-lg p-3 mb-4">
        <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Current engine calibration</p>
        <p className="font-display text-sm font-bold text-text">{(calibration.currentFactor * 100).toFixed(1)}% waste factor</p>
        <p className="text-xs text-muted">{calibration.sampleCount === 0 ? "Default — no jobs closed yet" : `From ${calibration.sampleCount} job${calibration.sampleCount !== 1 ? "s" : ""}`}</p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
            Actual Waste %
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number" min="0" max="30" step="0.5"
              value={wastePct}
              onChange={e => setWastePct(e.target.value)}
              className={INPUT_CLASS}
            />
            <span className="text-sm text-muted flex-shrink-0">%</span>
          </div>
          <p className="text-xs text-muted mt-1">Estimated was {estimatedWastePct.toFixed(1)}%</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Notes (optional)</label>
          <textarea
            rows={2} placeholder="e.g. rocky soil, extra cuts on corners..."
            value={notes} onChange={e => setNotes(e.target.value)}
            className={`${INPUT_CLASS} resize-none`}
          />
        </div>

        {/* EWMA preview */}
        {wastePct && Number(wastePct) > 0 && (() => {
          const actual = Number(wastePct) / 100;
          const alpha = calibration.alpha;
          const preview = Math.max(
            calibration.minFactor,
            Math.min(calibration.maxFactor, calibration.currentFactor * (1 - alpha) + actual * alpha)
          );
          return (
            <div className="bg-accent/5 border border-accent/20 rounded-lg p-3">
              <p className="text-xs font-semibold text-accent-light uppercase tracking-wider mb-1">After closeout, engine will use:</p>
              <p className="font-display text-lg font-bold text-text">{(preview * 100).toFixed(1)}% waste factor</p>
              <p className="text-xs text-muted">
                {preview > calibration.currentFactor ? "↑ Increased" : preview < calibration.currentFactor ? "↓ Decreased" : "No change"} from {(calibration.currentFactor * 100).toFixed(1)}%
              </p>
            </div>
          );
        })()}

        <button
          onClick={handleCloseout}
          disabled={status === "submitting" || !wastePct || Number(wastePct) <= 0}
          className="w-full py-2.5 rounded-lg text-sm font-semibold bg-accent hover:bg-accent-light accent-glow text-white transition-colors duration-150 disabled:opacity-50 disabled:hover:bg-accent"
        >
          {status === "submitting" ? "Saving..." : status === "error" ? "Error — try again" : "Close Out Job"}
        </button>

        {status === "done" && newCal && (
          <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 text-center">
            <p className="font-display text-sm font-bold text-accent-light">Calibration updated</p>
            <p className="text-xs text-accent-light/80 mt-1">Engine now uses {(newCal.currentFactor * 100).toFixed(1)}% waste factor ({newCal.sampleCount} jobs)</p>
          </div>
        )}
      </div>
    </div>
  );
}
