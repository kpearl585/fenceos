"use client";
import { useState, useRef, useCallback } from "react";
import { extractFromText, extractFromImage, extractFromSurvey } from "./aiActions";
import type { AiExtractionResult, AiExtractedRun, CritiqueResult } from "@/lib/fence-graph/ai-extract/types";
import type { RunInput, GateInput, FenceType } from "@/lib/fence-graph/engine";
import type { SoilType, GateType } from "@/lib/fence-graph/types";
import { QUICK_TEMPLATES } from "@/lib/fence-graph/ai-extract/templates";
import { isPaywallBlock, type PaywallBlock } from "@/lib/paywall";
import { rasterizePdfFirstPage } from "@/lib/pdf/rasterize-client";

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
  /** Raised when the server action returns a PaywallBlock (expired trial,
   *  lapsed subscription, etc.) so the parent can surface the modal. */
  onPaywall?: (block: PaywallBlock) => void;
}

// ── Convert AI extraction → engine state ─────────────────────────
// Pure function so we can unit-test it without mounting the component.
// Multi-run extractions mark the joining nodes as corners (startType =
// "corner" on every run after the first) so the builder reinforces them
// and applies corner concrete depth — previously every joining node was
// left as "end", silently under-bidding multi-run AI jobs.
export function toEngineState(
  result: AiExtractionResult,
  newRunId: () => string,
  newGateId: () => string,
): AiAppliedState | null {
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
  const isMultiRun = result.runs.length > 1;

  for (let i = 0; i < result.runs.length; i++) {
    const aiRun = result.runs[i];
    const runId = newRunId();
    engineRuns.push({
      id: runId,
      linearFeet: aiRun.linearFeet,
      // First run starts at an open end. Every subsequent run starts at a
      // corner so the builder mutates the shared previous-end node into a
      // corner post (reinforced + structural concrete depth). This is what
      // makes multi-run AI jobs bid the same as manually-entered multi-run.
      startType: i > 0 && isMultiRun ? "corner" : "end",
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
  if (c >= 0.85) return "text-accent-light bg-accent/15 border-accent/30";
  if (c >= 0.65) return "text-warning bg-warning/10 border-warning/30";
  return "text-danger bg-danger/10 border-danger/30";
}

function confidenceLabel(c: number) {
  if (c >= 0.85) return "High confidence";
  if (c >= 0.65) return "Review recommended";
  return "Low confidence — review carefully";
}

const INPUT_CLASS = "w-full border border-border bg-surface-3 text-text rounded-lg px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-150";
const LABEL_CLASS = "block text-xs font-semibold text-muted uppercase tracking-wider mb-2";

export default function AiInputTab({ onApply, onPaywall }: Props) {
  // Per-instance ID counters so two AI tabs (or multiple extractions on
  // the same page) can't collide IDs. Replaces the prior module-level
  // mutable counters that leaked across mounts and HMR.
  const runCtrRef = useRef(0);
  const gateCtrRef = useRef(0);
  const newRunId = useCallback(() => `ai_run_${++runCtrRef.current}`, []);
  const newGateId = useCallback(() => `ai_gate_${++gateCtrRef.current}`, []);

  const [mode, setMode] = useState<"text" | "image" | "survey">("text");
  const [text, setText] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState("image/jpeg");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  // Survey-mode state. Survey PDFs are rendered to PNG on the client
  // via pdfjs-dist, so `surveyBase64` ends up as an image under the
  // hood — we just take a PDF-rendering step to get there.
  const [surveyBase64, setSurveyBase64] = useState<string | null>(null);
  const [surveyPreview, setSurveyPreview] = useState<string | null>(null);
  const [surveyFilename, setSurveyFilename] = useState<string | null>(null);
  const [surveyPages, setSurveyPages] = useState<number>(1);
  const [renderingPdf, setRenderingPdf] = useState(false);
  // Contractor can edit extracted `linearFeet` per run before Apply —
  // keyed by run index in the AI result. AI extraction stays immutable;
  // overrides layer on top on the way into the engine.
  const [runLfOverrides, setRunLfOverrides] = useState<Record<number, number>>({});
  const [additionalContext, setAdditionalContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiExtractionResult | null>(null);
  const [critique, setCritique] = useState<CritiqueResult | null>(null);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [validationBlockers, setValidationBlockers] = useState<string[]>([]);
  // criticallyBlocked is the unified gate the Apply button respects; it's
  // true if Zod/business rules blocked, OR critique returned criticalBlockers,
  // OR critique LLM said overallReadyToApply=false.
  const [criticallyBlocked, setCriticallyBlocked] = useState(false);
  const [rateRemaining, setRateRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const surveyFileRef = useRef<HTMLInputElement>(null);

  async function handleExtract() {
    setLoading(true);
    setError(null);
    setResult(null);
    setCritique(null);
    setValidationWarnings([]);
    setValidationBlockers([]);
    setCriticallyBlocked(false);
    setApplied(false);
    setRunLfOverrides({});

    const res = mode === "text"
      ? await extractFromText(text)
      : mode === "image"
      ? await extractFromImage(imageBase64!, imageMime, additionalContext || undefined)
      : await extractFromSurvey(surveyBase64!, "image/png", additionalContext || undefined);

    setLoading(false);

    if (isPaywallBlock(res)) {
      onPaywall?.(res);
      return;
    }

    if (!res.success || !res.result) {
      setError(res.error ?? "Extraction failed");
      return;
    }
    setResult(res.result);
    setCritique(res.critique ?? null);
    setValidationWarnings(res.validationWarnings ?? []);
    setValidationBlockers(res.validationBlockers ?? []);
    setCriticallyBlocked(res.criticallyBlocked ?? res.blocked ?? false);
    if (res.rateRemaining != null) setRateRemaining(res.rateRemaining);
  }

  function handleApply() {
    if (!result) return;
    if (criticallyBlocked) return; // hard guard in addition to the disabled button
    // Apply contractor's edited linearFeet (per-run overrides) on the
    // way into the engine. We don't mutate the AI result itself —
    // overrides layer on top so the contractor can see what the AI
    // said AND what they changed it to.
    const edited: AiExtractionResult = Object.keys(runLfOverrides).length === 0
      ? result
      : {
          ...result,
          runs: result.runs.map((run, i) => {
            const override = runLfOverrides[i];
            return override != null && override !== run.linearFeet
              ? { ...run, linearFeet: override }
              : run;
          }),
        };
    const state = toEngineState(edited, newRunId, newGateId);
    if (!state) return;
    onApply(state);
    setApplied(true);
  }

  async function handleSurveyFile(file: File) {
    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file.");
      return;
    }
    // 15 MB ceiling — multi-page surveys can hit 5-10 MB. Above this
    // we'd push Vercel request-size limits on the extraction call.
    if (file.size > 15 * 1024 * 1024) {
      setError("PDF too large. Please keep it under 15 MB.");
      return;
    }
    setError(null);
    setRenderingPdf(true);
    setSurveyBase64(null);
    setSurveyPreview(null);
    try {
      const rendered = await rasterizePdfFirstPage(file);
      setSurveyBase64(rendered.base64);
      setSurveyPreview(rendered.dataUrl);
      setSurveyFilename(file.name);
      setSurveyPages(rendered.totalPages);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to render PDF";
      setError(`Couldn't read that PDF: ${msg}`);
    } finally {
      setRenderingPdf(false);
    }
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
      {/* Header — signature panel, same accent-glow treatment as the
          estimator summary card. */}
      <div className="bg-background border border-accent/20 accent-glow text-text rounded-xl px-5 py-4">
        <div className="flex items-center gap-3 mb-1">
          <svg className="w-5 h-5 text-accent-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          <p className="font-display text-sm font-bold">AI Estimate Assistant</p>
          <span className="text-xs bg-surface-2 text-accent-light border border-border px-2 py-0.5 rounded font-semibold uppercase tracking-wider">GPT-4o</span>
        </div>
        <p className="text-xs text-muted">
          Describe the job or upload a site photo, sketch, or plan. AI extracts the runs — the engine does all the math.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex bg-surface-3 border border-border rounded-lg p-1 gap-1">
        {(["text", "image", "survey"] as const).map(m => (
          <button key={m}
            onClick={() => setMode(m)}
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors duration-150 ${mode === m ? "bg-accent text-white" : "text-muted hover:text-text"}`}
          >
            {m === "text" ? "Text Description" : m === "image" ? "Photo / Sketch" : "Marked Survey"}
          </button>
        ))}
      </div>

      {/* Text input */}
      {mode === "text" && (
        <div>
          {/* Quick Templates */}
          <div className="mb-4">
            <label className={LABEL_CLASS}>Quick Start Templates</label>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_TEMPLATES.map(template => (
                <button
                  key={template.id}
                  onClick={() => setText(template.prompt)}
                  className="text-left border border-border bg-surface-2 rounded-lg px-3 py-2 hover:border-accent/60 hover:bg-accent/5 transition-colors duration-150"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{template.icon}</span>
                    <span className="text-xs font-semibold text-text">{template.name}</span>
                  </div>
                  <p className="text-xs text-muted">{template.description}</p>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted mt-2">Tap a template to prefill, then customize as needed</p>
          </div>

          <label className={LABEL_CLASS}>Describe the job</label>
          <textarea
            rows={5}
            placeholder={"Example: 180ft vinyl privacy 6ft fence on the back and sides of a residential property in Tampa. One walk gate on the left, one double drive gate across the back. Flat lot, sandy soil."}
            value={text}
            onChange={e => setText(e.target.value)}
            className="w-full border border-border bg-surface-3 text-text rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent resize-none placeholder:text-muted transition-colors duration-150"
          />
          <p className="text-xs text-muted mt-1">Include: footage, fence type, height, gates, soil, slope. More detail = higher accuracy.</p>
        </div>
      )}

      {/* Image input */}
      {mode === "image" && (
        <div className="space-y-3">
          <div>
            <label className={LABEL_CLASS}>Upload Image</label>
            {imagePreview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Site plan" className="w-full rounded-xl border border-border max-h-64 object-contain bg-surface-3" />
                <button
                  onClick={() => { setImagePreview(null); setImageBase64(null); if (fileRef.current) fileRef.current.value = ""; }}
                  className="absolute top-2 right-2 bg-surface-2 border border-border rounded-lg px-2 py-1 text-xs text-muted hover:text-danger transition-colors duration-150"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleImageFile(f); }}
                className="border-2 border-dashed border-border bg-surface-3 rounded-xl p-8 text-center cursor-pointer hover:border-accent/60 hover:bg-accent/5 transition-colors duration-150"
              >
                <svg className="w-8 h-8 text-muted mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                <p className="text-sm font-medium text-text">Upload or drag a site photo, sketch, or plan</p>
                <p className="text-xs text-muted mt-1">JPG, PNG, WEBP — max 4MB</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }} className="hidden" />
          </div>
          <div>
            <label className={LABEL_CLASS}>Additional context (optional)</label>
            <input type="text"
              placeholder="e.g. 6ft vinyl privacy, back yard only, sandy soil"
              value={additionalContext}
              onChange={e => setAdditionalContext(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
        </div>
      )}

      {/* Marked Survey input — PDF upload + client-side render to PNG */}
      {mode === "survey" && (
        <div className="space-y-3">
          <div className="bg-accent/5 border border-accent/20 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-accent-light uppercase tracking-wider mb-1">How this works</p>
            <p className="text-xs text-muted leading-relaxed">
              Upload a marked-up boundary survey (PDF). AI reads your colored highlights + handwritten notes, pulls run lengths from the printed dimensions, and proposes runs + gates. Review the proposed runs below and tweak before running the estimate.
            </p>
          </div>
          <div>
            <label className={LABEL_CLASS}>Upload Marked Survey (PDF)</label>
            {surveyPreview ? (
              <div className="relative bg-surface-3 border border-border rounded-xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={surveyPreview} alt="Rendered survey" className="w-full max-h-[500px] object-contain bg-white" />
                <div className="absolute top-2 right-2 flex gap-2">
                  <span className="bg-surface-2 border border-border rounded-lg px-2 py-1 text-xs text-muted">
                    {surveyFilename}
                    {surveyPages > 1 ? ` · page 1 of ${surveyPages}` : ""}
                  </span>
                  <button
                    onClick={() => {
                      setSurveyPreview(null);
                      setSurveyBase64(null);
                      setSurveyFilename(null);
                      setSurveyPages(1);
                      if (surveyFileRef.current) surveyFileRef.current.value = "";
                    }}
                    className="bg-surface-2 border border-border rounded-lg px-2 py-1 text-xs text-muted hover:text-danger transition-colors duration-150"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => surveyFileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  const f = e.dataTransfer.files[0];
                  if (f) handleSurveyFile(f);
                }}
                className="border-2 border-dashed border-border bg-surface-3 rounded-xl p-8 text-center cursor-pointer hover:border-accent/60 hover:bg-accent/5 transition-colors duration-150"
              >
                {renderingPdf ? (
                  <div className="flex flex-col items-center gap-2">
                    <svg className="animate-spin w-6 h-6 text-accent-light" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-sm font-medium text-text">Rendering PDF...</p>
                  </div>
                ) : (
                  <>
                    <svg className="w-8 h-8 text-muted mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm font-medium text-text">Upload or drag a marked-up PDF survey</p>
                    <p className="text-xs text-muted mt-1">Only the first page is analyzed — max 15 MB</p>
                  </>
                )}
              </div>
            )}
            <input
              ref={surveyFileRef}
              type="file"
              accept="application/pdf"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleSurveyFile(f);
              }}
              className="hidden"
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Additional context (optional)</label>
            <input
              type="text"
              placeholder="e.g. 6ft white vinyl privacy, installed 4 inches above grade"
              value={additionalContext}
              onChange={e => setAdditionalContext(e.target.value)}
              className={INPUT_CLASS}
            />
            <p className="text-xs text-muted mt-1">Tells the AI what handwriting to expect — helps when notes are hard to read.</p>
          </div>
        </div>
      )}

      {/* CTA */}
      <button
        onClick={handleExtract}
        disabled={
          loading ||
          (mode === "text" ? !text.trim() : mode === "image" ? !imageBase64 : !surveyBase64)
        }
        className="w-full py-3 bg-accent hover:bg-accent-light accent-glow text-white text-sm font-bold rounded-xl transition-colors duration-150 disabled:opacity-40 disabled:hover:bg-accent"
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
        <p className="text-xs text-warning text-center">{rateRemaining} extraction{rateRemaining !== 1 ? "s" : ""} remaining this hour</p>
      )}

      {error && (
        <div className="bg-danger/10 border border-danger/30 rounded-xl px-4 py-3">
          <p className="text-sm text-danger font-semibold">Extraction failed</p>
          <p className="text-xs text-danger/80 mt-1">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Confidence header */}
          <div className={`border rounded-xl px-4 py-3 flex items-center justify-between gap-4 ${confidenceBadgeClass(result.confidence)}`}>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">{confidenceLabel(result.confidence)}</p>
              <p className="text-sm mt-0.5">{result.rawSummary}</p>
            </div>
            <span className="font-display text-2xl font-bold flex-shrink-0">{Math.round(result.confidence * 100)}%</span>
          </div>

          {/* Critical blockers — unified from validation + critique.
              Reads the explicit blockers array instead of substring-matching
              the legacy combined errors array. */}
          {criticallyBlocked && (
            <div className="bg-danger/10 border border-danger/30 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-danger uppercase tracking-wider mb-2">Cannot apply — resolve first</p>
              <ul className="space-y-1">
                {[...validationBlockers, ...(critique?.criticalBlockers ?? [])].map((b, i) => (
                  <li key={i} className="text-xs text-danger flex gap-2"><span className="font-bold">!</span><span>{b}</span></li>
                ))}
                {critique?.overallReadyToApply === false && (critique?.criticalBlockers?.length ?? 0) === 0 && (
                  <li className="text-xs text-danger flex gap-2">
                    <span className="font-bold">!</span>
                    <span>Quality-control review flagged this extraction as not ready to apply.</span>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Auto-corrections + warnings (informational, safe to apply) */}
          {validationWarnings.length > 0 && (
            <div className="bg-warning/10 border border-warning/30 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-warning uppercase tracking-wider mb-2">Auto-corrected</p>
              <ul className="space-y-1">
                {validationWarnings.map((e, i) => (
                  <li key={i} className="text-xs text-warning flex gap-2"><span className="text-warning/60">—</span><span>{e}</span></li>
                ))}
              </ul>
            </div>
          )}

          {/* Survey-only: AI's observation trail — what the model claims
              to have seen on the page. Contractors can expand these and
              spot hallucinated dims/annotations BEFORE applying. This is
              the cheapest catch-a-bad-extraction checkpoint. */}
          {(result.observedDimensions?.length || result.observedAnnotations?.length) && (
            <details className="bg-surface-2 border border-border rounded-xl px-4 py-3 group">
              <summary className="cursor-pointer flex items-center gap-2 text-xs font-semibold text-muted uppercase tracking-wider select-none">
                <span>What the AI saw</span>
                <span className="text-muted font-normal normal-case tracking-normal">— open to verify against your survey</span>
              </summary>
              <div className="mt-3 space-y-3">
                {result.observedDimensions && result.observedDimensions.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-text mb-1">
                      Dimensions ({result.observedDimensions.length})
                    </p>
                    <ul className="space-y-0.5 text-xs text-muted">
                      {result.observedDimensions.map((d, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-muted/60">•</span>
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.observedAnnotations && result.observedAnnotations.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-text mb-1">
                      Annotations ({result.observedAnnotations.length})
                    </p>
                    <ul className="space-y-0.5 text-xs text-muted">
                      {result.observedAnnotations.map((a, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-muted/60">•</span>
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="text-xs text-warning/90 pt-2 border-t border-border">
                  If any line doesn&rsquo;t match what&rsquo;s actually on your survey, the extracted runs are probably wrong — edit them below or add missing runs after applying.
                </p>
              </div>
            </details>
          )}

          {/* Flags / assumptions */}
          {result.flags.length > 0 && (
            <div className="bg-warning/10 border border-warning/30 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-warning uppercase tracking-wider mb-2">Verify before sending bid</p>
              <ul className="space-y-1">
                {result.flags.map((f, i) => (
                  <li key={i} className="text-xs text-warning flex gap-2">
                    <span className="flex-shrink-0 text-warning/60">—</span><span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Hidden Cost Flags */}
          {result.hiddenCostFlags && result.hiddenCostFlags.length > 0 && (
            <div className="bg-danger/10 border border-danger/30 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-danger uppercase tracking-wider mb-2">Potential Additional Costs</p>
              <ul className="space-y-1">
                {result.hiddenCostFlags.map((f, i) => (
                  <li key={i} className="text-xs text-danger flex gap-2">
                    <span className="flex-shrink-0 text-danger/60">•</span><span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Extracted runs preview */}
          {result.runs.length > 0 ? (
            <div className="bg-surface-2 border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <p className="text-sm font-semibold text-text">{result.runs.length} run{result.runs.length !== 1 ? "s" : ""} extracted</p>
                <p className="text-xs text-muted">Review before applying</p>
              </div>
              <div className="divide-y divide-border">
                {result.runs.map((run: AiExtractedRun, i: number) => {
                  // Editable LF: AI suggestion is the initial value but
                  // contractor can override before Apply. We track the
                  // override separately so the original AI value is never
                  // mutated — makes it easy to tell the contractor
                  // "you changed this from N to M".
                  const overrideLf = runLfOverrides[i];
                  const displayLf = overrideLf ?? run.linearFeet;
                  const wasEdited = overrideLf != null && overrideLf !== run.linearFeet;
                  return (
                    <div key={i} className="px-4 py-3 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-text">{run.runLabel || `Run ${i + 1}`}</p>
                        <p className="text-xs text-muted mt-0.5 capitalize">
                          {run.fenceType.replace("_", " ")} · {run.heightFt}ft · {run.productLineId.replace(/_/g, " ")}
                        </p>
                        {run.gates.length > 0 && (
                          <p className="text-xs text-accent-light mt-0.5">
                            {run.gates.map(g => `${g.widthFt}ft ${g.type.replace("_", " ")}`).join(", ")}
                          </p>
                        )}
                        {(run.soilType !== "standard" || run.poolCode || run.isWindExposed) && (
                          <p className="text-xs text-warning mt-0.5">
                            {[
                              run.soilType !== "standard" && `${run.soilType} soil`,
                              run.poolCode && "pool code",
                              run.isWindExposed && "wind exposed",
                            ].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0 flex flex-col items-end gap-0.5">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={displayLf}
                            onChange={e => {
                              const v = e.target.valueAsNumber;
                              if (!Number.isFinite(v) || v < 0) return;
                              setRunLfOverrides(prev => ({ ...prev, [i]: v }));
                            }}
                            className={`font-display text-lg font-bold w-20 text-right bg-surface-3 border rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-150 ${
                              wasEdited ? "border-accent/40 text-accent-light" : "border-border text-text"
                            }`}
                            aria-label={`Linear feet for run ${i + 1}`}
                          />
                          <span className="text-xs text-muted">LF</span>
                        </div>
                        {wasEdited && (
                          <button
                            type="button"
                            onClick={() => setRunLfOverrides(prev => {
                              const next = { ...prev };
                              delete next[i];
                              return next;
                            })}
                            className="text-[10px] text-muted hover:text-text transition-colors duration-150 underline underline-offset-2"
                          >
                            reset to AI ({run.linearFeet})
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="px-4 py-3 bg-surface-3 border-t border-border flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-text">
                    {result.runs.reduce((s, r, i) => s + (runLfOverrides[i] ?? r.linearFeet), 0)} LF total
                    {Object.keys(runLfOverrides).length > 0 && (
                      <span className="text-xs text-accent-light ml-2 font-normal">(edited)</span>
                    )}
                  </p>
                  {result.runs.some(r => r.fenceType !== result.runs[0].fenceType) && (
                    <p className="text-xs text-warning mt-0.5">Mixed fence types detected — dominant type will be set. Adjust fence type per run if needed.</p>
                  )}
                </div>
                {applied ? (
                  <span className="text-sm font-semibold text-accent-light">Applied to estimate</span>
                ) : (
                  <button
                    onClick={handleApply}
                    disabled={criticallyBlocked}
                    title={criticallyBlocked ? "Resolve critical blockers before applying" : undefined}
                    className="px-4 py-2 bg-accent hover:bg-accent-light accent-glow text-white text-sm font-bold rounded-lg transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-accent"
                  >
                    {criticallyBlocked ? "Blocked" : "Apply to Estimate"}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-surface-2 border border-border rounded-xl px-4 py-6 text-center">
              <p className="text-sm text-muted">No runs extracted. Provide more detail and try again.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
