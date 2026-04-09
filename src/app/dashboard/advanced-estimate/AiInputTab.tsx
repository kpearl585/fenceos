"use client";
import { useState, useRef } from "react";
import { extractFromText, extractFromImage } from "./aiActions";
import type { AiExtractionResult, AiExtractedRun, CritiqueResult } from "@/lib/fence-graph/ai-extract/types";
import type { RunInput, GateInput, FenceType } from "@/lib/fence-graph/engine";
import type { SoilType, GateType } from "@/lib/fence-graph/types";
import { QUICK_TEMPLATES } from "@/lib/fence-graph/ai-extract/templates";

export interface AiAppliedState {
  fenceType: FenceType;
  productLineId: string;
  soilType: SoilType;
  windMode: boolean;
  runs: RunInput[];
  gates: GateInput[];
}

interface Props {
  onApply: (state: AiAppliedState) => void;
}

let runCtr = 0;
let gateCtr = 0;
function newRunId() { return `ai_run_${++runCtr}`; }
function newGateId() { return `ai_gate_${++gateCtr}`; }

// ── Convert AI extraction → engine state ─────────────────────────
function toEngineState(result: AiExtractionResult): AiAppliedState | null {
  if (!result.runs.length) return null;

  // Pick dominant fence type (most LF)
  const lfByType: Record<string, number> = {};
  for (const r of result.runs) {
    lfByType[r.fenceType] = (lfByType[r.fenceType] ?? 0) + r.linearFeet;
  }
  const dominantType = Object.entries(lfByType).sort(([,a],[,b]) => b - a)[0][0] as FenceType;

  // Use the first matching run's productLineId and soil
  const primaryRun = result.runs.find(r => r.fenceType === dominantType) ?? result.runs[0];
  const soilType = (primaryRun.soilType ?? "sandy_loam") as SoilType;
  const windMode = result.runs.some(r => r.isWindExposed);

  // Build engine runs + gates
  const engineRuns: RunInput[] = [];
  const engineGates: GateInput[] = [];

  for (const aiRun of result.runs) {
    const runId = newRunId();
    engineRuns.push({
      id: runId,
      linearFeet: aiRun.linearFeet,
      startType: "end",
      endType: "end",
      slopeDeg: aiRun.slopePercent ? Math.round(Math.atan(aiRun.slopePercent / 100) * (180 / Math.PI)) : 0,
    });

    // Attach gates to this run
    for (const gate of (aiRun.gates ?? [])) {
      const isDouble = gate.type === "double_drive";
      const isPool = gate.type === "pool";
      const gateType: GateType = isDouble ? "double" : "single";
      engineGates.push({
        id: newGateId(),
        afterRunId: runId,
        gateType,
        widthFt: gate.widthFt,
        isPoolGate: isPool,
      });
    }
  }

  return {
    fenceType: dominantType,
    productLineId: primaryRun.productLineId,
    soilType,
    windMode,
    runs: engineRuns,
    gates: engineGates,
  };
}

function confidenceBadgeClass(c: number) {
  if (c >= 0.85) return "text-green-700 bg-green-50 border-green-200";
  if (c >= 0.65) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-red-700 bg-red-50 border-red-200";
}

function confidenceLabel(c: number) {
  if (c >= 0.85) return "High confidence";
  if (c >= 0.65) return "Review recommended";
  return "Low confidence — review carefully";
}

export default function AiInputTab({ onApply }: Props) {
  const [mode, setMode] = useState<"text" | "image">("text");
  const [text, setText] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState("image/jpeg");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [additionalContext, setAdditionalContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiExtractionResult | null>(null);
  const [critique, setCritique] = useState<CritiqueResult | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [blocked, setBlocked] = useState(false);
  const [rateRemaining, setRateRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleExtract() {
    setLoading(true);
    setError(null);
    setResult(null);
    setCritique(null);
    setValidationErrors([]);
    setBlocked(false);
    setApplied(false);

    const res = mode === "text"
      ? await extractFromText(text)
      : await extractFromImage(imageBase64!, imageMime, additionalContext || undefined);

    setLoading(false);

    if (!res.success || !res.result) {
      setError(res.error ?? "Extraction failed");
      return;
    }
    setResult(res.result);
    setCritique(res.critique ?? null);
    setValidationErrors(res.validationErrors ?? []);
    setBlocked(res.blocked ?? false);
    if (res.rateRemaining != null) setRateRemaining(res.rateRemaining);
  }

  function handleApply() {
    if (!result) return;
    const state = toEngineState(result);
    if (!state) return;
    onApply(state);
    setApplied(true);
  }

  function handleImageFile(file: File) {
    setImageMime(file.type || "image/jpeg");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setImagePreview(dataUrl);
      setImageBase64(dataUrl.split(",")[1]);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-fence-950 text-white rounded-xl px-5 py-4">
        <div className="flex items-center gap-3 mb-1">
          <svg className="w-5 h-5 text-fence-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          <p className="text-sm font-bold">AI Estimate Assistant</p>
          <span className="text-xs bg-fence-800 text-fence-300 px-2 py-0.5 rounded font-semibold">GPT-4o</span>
        </div>
        <p className="text-xs text-fence-300">
          Describe the job or upload a site photo, sketch, or plan. AI extracts the runs — the engine does all the math.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
        {(["text", "image"] as const).map(m => (
          <button key={m}
            onClick={() => setMode(m)}
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${mode === m ? "bg-white text-fence-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            {m === "text" ? "Text Description" : "Photo / Sketch / Plan"}
          </button>
        ))}
      </div>

      {/* Text input */}
      {mode === "text" && (
        <div>
          {/* Quick Templates */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Quick Start Templates</label>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_TEMPLATES.map(template => (
                <button
                  key={template.id}
                  onClick={() => setText(template.prompt)}
                  className="text-left border border-gray-200 rounded-lg px-3 py-2 hover:border-fence-400 hover:bg-fence-50 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{template.icon}</span>
                    <span className="text-xs font-semibold text-fence-900">{template.name}</span>
                  </div>
                  <p className="text-xs text-gray-500">{template.description}</p>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">Tap a template to prefill, then customize as needed</p>
          </div>

          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Describe the job</label>
          <textarea
            rows={5}
            placeholder={"Example: 180ft vinyl privacy 6ft fence on the back and sides of a residential property in Tampa. One walk gate on the left, one double drive gate across the back. Flat lot, sandy soil."}
            value={text}
            onChange={e => setText(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-fence-400 resize-none text-gray-700 placeholder:text-gray-300"
          />
          <p className="text-xs text-gray-400 mt-1">Include: footage, fence type, height, gates, soil, slope. More detail = higher accuracy.</p>
        </div>
      )}

      {/* Image input */}
      {mode === "image" && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Upload Image</label>
            {imagePreview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Site plan" className="w-full rounded-xl border border-gray-200 max-h-64 object-contain bg-gray-50" />
                <button
                  onClick={() => { setImagePreview(null); setImageBase64(null); if (fileRef.current) fileRef.current.value = ""; }}
                  className="absolute top-2 right-2 bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-500 hover:text-red-500 shadow-sm"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleImageFile(f); }}
                className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-fence-400 hover:bg-fence-50 transition-colors"
              >
                <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                <p className="text-sm font-medium text-gray-500">Upload or drag a site photo, sketch, or plan</p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP — max 4MB</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }} className="hidden" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Additional context (optional)</label>
            <input type="text"
              placeholder="e.g. 6ft vinyl privacy, back yard only, sandy soil"
              value={additionalContext}
              onChange={e => setAdditionalContext(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fence-400"
            />
          </div>
        </div>
      )}

      {/* CTA */}
      <button
        onClick={handleExtract}
        disabled={loading || (mode === "text" ? !text.trim() : !imageBase64)}
        className="w-full py-3 bg-fence-600 hover:bg-fence-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-40"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Analyzing with GPT-4o...
          </span>
        ) : "Extract Runs with AI"}
      </button>

      {rateRemaining !== null && rateRemaining <= 5 && (
        <p className="text-xs text-amber-600 text-center">{rateRemaining} extraction{rateRemaining !== 1 ? "s" : ""} remaining this hour</p>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-sm text-red-700 font-semibold">Extraction failed</p>
          <p className="text-xs text-red-600 mt-1">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Confidence header */}
          <div className={`border rounded-xl px-4 py-3 flex items-center justify-between gap-4 ${confidenceBadgeClass(result.confidence)}`}>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide">{confidenceLabel(result.confidence)}</p>
              <p className="text-sm mt-0.5">{result.rawSummary}</p>
            </div>
            <span className="text-2xl font-bold flex-shrink-0">{Math.round(result.confidence * 100)}%</span>
          </div>

          {/* Critical blockers */}
          {(blocked || (critique?.criticalBlockers?.length ?? 0) > 0) && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">Cannot apply — resolve first</p>
              <ul className="space-y-1">
                {[...(critique?.criticalBlockers ?? []), ...validationErrors.filter(e => e.includes("blocked"))].map((b, i) => (
                  <li key={i} className="text-xs text-red-800 flex gap-2"><span className="font-bold">!</span><span>{b}</span></li>
                ))}
              </ul>
            </div>
          )}

          {/* Auto-corrections */}
          {validationErrors.filter(e => !e.includes("blocked")).length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-2">Auto-corrected</p>
              <ul className="space-y-1">
                {validationErrors.filter(e => !e.includes("blocked")).map((e, i) => (
                  <li key={i} className="text-xs text-orange-800 flex gap-2"><span className="text-orange-400">—</span><span>{e}</span></li>
                ))}
              </ul>
            </div>
          )}

          {/* Flags / assumptions */}
          {result.flags.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Verify before sending bid</p>
              <ul className="space-y-1">
                {result.flags.map((f, i) => (
                  <li key={i} className="text-xs text-amber-800 flex gap-2">
                    <span className="flex-shrink-0 text-amber-400">—</span><span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Hidden Cost Flags */}
          {result.hiddenCostFlags && result.hiddenCostFlags.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">⚠️ Potential Additional Costs</p>
              <ul className="space-y-1">
                {result.hiddenCostFlags.map((f, i) => (
                  <li key={i} className="text-xs text-red-800 flex gap-2">
                    <span className="flex-shrink-0 text-red-400">•</span><span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Extracted runs preview */}
          {result.runs.length > 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <p className="text-sm font-semibold text-fence-900">{result.runs.length} run{result.runs.length !== 1 ? "s" : ""} extracted</p>
                <p className="text-xs text-gray-400">Review before applying</p>
              </div>
              <div className="divide-y divide-gray-50">
                {result.runs.map((run: AiExtractedRun, i: number) => (
                  <div key={i} className="px-4 py-3 flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{run.runLabel || `Run ${i + 1}`}</p>
                      <p className="text-xs text-gray-500 mt-0.5 capitalize">
                        {run.fenceType.replace("_", " ")} · {run.heightFt}ft · {run.productLineId.replace(/_/g, " ")}
                      </p>
                      {run.gates.length > 0 && (
                        <p className="text-xs text-fence-600 mt-0.5">
                          {run.gates.map(g => `${g.widthFt}ft ${g.type.replace("_", " ")}`).join(", ")}
                        </p>
                      )}
                      {(run.soilType !== "standard" || run.poolCode || run.isWindExposed) && (
                        <p className="text-xs text-amber-600 mt-0.5">
                          {[
                            run.soilType !== "standard" && `${run.soilType} soil`,
                            run.poolCode && "pool code",
                            run.isWindExposed && "wind exposed",
                          ].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                    <p className="text-lg font-bold text-fence-900 flex-shrink-0 ml-3">{run.linearFeet} LF</p>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-700">
                    {result.runs.reduce((s, r) => s + r.linearFeet, 0)} LF total
                  </p>
                  {result.runs.some(r => r.fenceType !== result.runs[0].fenceType) && (
                    <p className="text-xs text-amber-600 mt-0.5">Mixed fence types detected — dominant type will be set. Adjust fence type per run if needed.</p>
                  )}
                </div>
                {applied ? (
                  <span className="text-sm font-semibold text-green-700">Applied to estimate</span>
                ) : (
                  <button
                    onClick={handleApply}
                    disabled={blocked}
                    title={blocked ? "Resolve critical blockers before applying" : undefined}
                    className="px-4 py-2 bg-fence-600 text-white text-sm font-bold rounded-lg hover:bg-fence-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {blocked ? "Blocked" : "Apply to Estimate"}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-6 text-center">
              <p className="text-sm text-gray-500">No runs extracted. Provide more detail and try again.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
