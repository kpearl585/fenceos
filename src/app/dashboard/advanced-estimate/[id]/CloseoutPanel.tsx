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
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Closeout Complete</p>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Actual waste recorded</span>
          <span className="text-sm font-bold text-green-700">{actualWastePct?.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-gray-600">Estimated waste was</span>
          <span className="text-sm font-bold text-gray-500">{estimatedWastePct.toFixed(1)}%</span>
        </div>
        {closedAt && (
          <p className="text-xs text-gray-400">Closed {new Date(closedAt).toLocaleDateString()}</p>
        )}
        <div className="mt-4 bg-fence-50 border border-fence-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-fence-700 mb-1">Calibration updated</p>
          <p className="text-xs text-fence-600">Engine waste factor: <strong>{(calibration.currentFactor * 100).toFixed(1)}%</strong> from {calibration.sampleCount} job{calibration.sampleCount !== 1 ? "s" : ""}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Job Closeout</p>
      <p className="text-xs text-gray-400 mb-4">
        Record actual material waste after the job completes. This updates your engine calibration — future estimates get more accurate automatically.
      </p>

      {/* Current calibration */}
      <div className="bg-gray-50 rounded-lg p-3 mb-4">
        <p className="text-xs font-semibold text-gray-600 mb-1">Current engine calibration</p>
        <p className="text-sm font-bold text-fence-900">{(calibration.currentFactor * 100).toFixed(1)}% waste factor</p>
        <p className="text-xs text-gray-400">{calibration.sampleCount === 0 ? "Default — no jobs closed yet" : `From ${calibration.sampleCount} job${calibration.sampleCount !== 1 ? "s" : ""}`}</p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Actual Waste %
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number" min="0" max="30" step="0.5"
              value={wastePct}
              onChange={e => setWastePct(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fence-400"
            />
            <span className="text-sm text-gray-500 flex-shrink-0">%</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Estimated was {estimatedWastePct.toFixed(1)}%</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes (optional)</label>
          <textarea
            rows={2} placeholder="e.g. rocky soil, extra cuts on corners..."
            value={notes} onChange={e => setNotes(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fence-400 resize-none"
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
            <div className="bg-fence-50 border border-fence-100 rounded-lg p-3">
              <p className="text-xs font-semibold text-fence-700 mb-1">After closeout, engine will use:</p>
              <p className="text-lg font-bold text-fence-900">{(preview * 100).toFixed(1)}% waste factor</p>
              <p className="text-xs text-fence-600">
                {preview > calibration.currentFactor ? "↑ Increased" : preview < calibration.currentFactor ? "↓ Decreased" : "No change"} from {(calibration.currentFactor * 100).toFixed(1)}%
              </p>
            </div>
          );
        })()}

        <button
          onClick={handleCloseout}
          disabled={status === "submitting" || !wastePct || Number(wastePct) <= 0}
          className="w-full py-2.5 rounded-lg text-sm font-semibold bg-fence-600 hover:bg-fence-700 text-white transition-colors disabled:opacity-50"
        >
          {status === "submitting" ? "Saving..." : status === "error" ? "Error — try again" : "Close Out Job"}
        </button>

        {status === "done" && newCal && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
            <p className="text-sm font-bold text-green-700">Calibration updated</p>
            <p className="text-xs text-green-600 mt-1">Engine now uses {(newCal.currentFactor * 100).toFixed(1)}% waste factor ({newCal.sampleCount} jobs)</p>
          </div>
        )}
      </div>
    </div>
  );
}
