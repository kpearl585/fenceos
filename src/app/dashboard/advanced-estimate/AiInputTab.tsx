"use client";
import { useState, useRef, useCallback } from "react";
import { extractFromText, extractFromImage, extractFromSurvey } from "./aiActions";
import type { AiExtractionResult, AiExtractedRun, AiExtractedGate, CritiqueResult } from "@/lib/fence-graph/ai-extract/types";
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

// Fence types the UI lets contractors switch between on a run row.
// Matches AiExtractedRun["fenceType"] exactly.
const FENCE_TYPE_OPTIONS: Array<AiExtractedRun["fenceType"]> = ["vinyl", "wood", "chain_link", "aluminum"];

// When the contractor changes a run's fence type or height, we need to
// pick a sensible productLineId. This picks the most common line per
// (type, height) combo; contractors can't edit productLineId directly
// because the downstream engine requires it to be in the schema-valid
// enum — we keep it in sync with the type/height selection for them.
function defaultProductLineId(fenceType: AiExtractedRun["fenceType"], heightFt: number): string {
  const h = Math.round(heightFt);
  if (fenceType === "vinyl") {
    if (h <= 4) return "vinyl_picket_4ft";
    if (h >= 8) return "vinyl_privacy_8ft";
    return "vinyl_privacy_6ft";
  }
  if (fenceType === "wood") {
    if (h <= 4) return "wood_picket_4ft";
    if (h >= 8) return "wood_privacy_8ft";
    return "wood_privacy_6ft";
  }
  if (fenceType === "chain_link") {
    return h <= 4 ? "chain_link_4ft" : "chain_link_6ft";
  }
  // aluminum
  return h <= 4 ? "aluminum_4ft" : "aluminum_6ft";
}

function gateTypeLabel(type: AiExtractedGate["type"]): string {
  switch (type) {
    case "walk": return "Walk";
    case "drive": return "Drive";
    case "double_drive": return "Double drive";
    case "pool": return "Pool";
  }
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
  // Contractor edits to AI-extracted runs, before Apply. AI result
  // stays immutable; these layer on top on the way into the engine.
  // - `runOverrides[i]`: patches to the i-th AI run (LF, type, height, gates)
  // - `deletedRunIndices`: i-th AI run tombstoned (hallucinated run the AI shouldn't have emitted)
  // - `addedRuns`: contractor-added runs appended after the AI list
  // This model lets the AI output stay pristine in audit logs while the
  // engine sees the corrected runs.
  const [runOverrides, setRunOverrides] = useState<Record<number, Partial<AiExtractedRun>>>({});
  const [deletedRunIndices, setDeletedRunIndices] = useState<Set<number>>(new Set());
  const [addedRuns, setAddedRuns] = useState<AiExtractedRun[]>([]);
  const [additionalContext, setAdditionalContext] = useState("");
  const [loading, setLoading] = useState(false);
  // Separate loading state for Claude escalation — the main CTA stays
  // enabled so the contractor can go back to text/image modes while
  // the re-run is in flight.
  const [reRunning, setReRunning] = useState(false);
  const [extractedWithModel, setExtractedWithModel] = useState<"gpt-4o" | "claude-opus-4-7" | null>(null);
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
    setRunOverrides({});
    setDeletedRunIndices(new Set());
    setAddedRuns([]);
    setExtractedWithModel(null);

    // try/catch/finally is critical here: server actions can throw for
    // many reasons (network blip, RSC serialization issue, Next.js
    // runtime error). Without this, the spinner stayed stuck forever
    // because setLoading(false) never ran. Now:
    //  - catch surfaces the error to the UI so contractor sees *something*
    //  - finally guarantees the spinner always unwinds
    try {
      if (typeof window !== "undefined") {
        console.log("[ai-extract] sending", { mode, hasSurvey: !!surveyBase64, hasImage: !!imageBase64, textLen: text.length });
      }
      const res = mode === "text"
        ? await extractFromText(text)
        : mode === "image"
        ? await extractFromImage(imageBase64!, imageMime, additionalContext || undefined)
        : await extractFromSurvey(surveyBase64!, "image/png", additionalContext || undefined, "gpt-4o");

      if (typeof window !== "undefined") {
        console.log("[ai-extract] response", { success: res?.success, hasResult: !!res?.result, error: res?.error, runs: res?.result?.runs?.length });
      }

      if (isPaywallBlock(res)) {
        onPaywall?.(res);
        return;
      }

      if (!res || !res.success || !res.result) {
        setError(res?.error ?? "Extraction failed — no runs returned. Try uploading a different PDF or adding more detail to the description.");
        return;
      }

      if (mode === "survey") setExtractedWithModel("gpt-4o");
      setResult(res.result);
      setCritique(res.critique ?? null);
      setValidationWarnings(res.validationWarnings ?? []);
      setValidationBlockers(res.validationBlockers ?? []);
      setCriticallyBlocked(res.criticallyBlocked ?? res.blocked ?? false);
      if (res.rateRemaining != null) setRateRemaining(res.rateRemaining);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Extraction failed — please try again.";
      if (typeof window !== "undefined") {
        console.error("[ai-extract] error", err);
      }
      setError(`${msg} (check browser console for details)`);
    } finally {
      setLoading(false);
    }
  }

  // Escalation path — contractor reviewed the GPT-4o result and asked
  // for a higher-accuracy re-run. Costs ~$0.10 more + ~30s latency,
  // bounded to contractor-initiated action so cost stays predictable.
  async function handleReRunWithClaude() {
    if (!surveyBase64) return;
    setReRunning(true);
    setError(null);
    // Keep existing result visible while Claude works — feels less
    // disorienting than blanking the preview.
    try {
      const res = await extractFromSurvey(
        surveyBase64,
        "image/png",
        additionalContext || undefined,
        "claude-opus-4-7",
      );
      if (isPaywallBlock(res)) {
        onPaywall?.(res);
        return;
      }
      if (!res || !res.success || !res.result) {
        setError(res?.error ?? "Re-run failed — Claude didn't return any runs.");
        return;
      }
      setResult(res.result);
      setCritique(res.critique ?? null);
      setValidationWarnings(res.validationWarnings ?? []);
      setValidationBlockers(res.validationBlockers ?? []);
      setCriticallyBlocked(res.criticallyBlocked ?? res.blocked ?? false);
      setRunOverrides({});
      setDeletedRunIndices(new Set());
      setAddedRuns([]);
      setApplied(false);
      setExtractedWithModel("claude-opus-4-7");
      if (res.rateRemaining != null) setRateRemaining(res.rateRemaining);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Re-run failed — please try again.";
      if (typeof window !== "undefined") {
        console.error("[ai-extract-claude] error", err);
      }
      setError(msg);
    } finally {
      setReRunning(false);
    }
  }

  function handleApply() {
    if (!result) {
      setError("Nothing to apply — run extraction first.");
      return;
    }
    if (criticallyBlocked) return; // hard guard in addition to the disabled button
    try {
      // Compose the final run list sent to the engine:
      //   1. AI runs with overrides applied, filtered by deletedRunIndices
      //   2. Contractor-added runs appended after
      // The AI result itself stays pristine for audit logs; this is a
      // layer on top so we can always trace what the model said vs. what
      // the contractor actually bid.
      const editedAiRuns = result.runs
        .map((run, i) => {
          if (deletedRunIndices.has(i)) return null;
          const override = runOverrides[i];
          return override ? { ...run, ...override } : run;
        })
        .filter((r): r is AiExtractedRun => r !== null);
      const finalRuns = [...editedAiRuns, ...addedRuns];

      // Strip runs with 0 LF so the engine doesn't get a zero-length run
      // that would silently drop through downstream math. This tolerates
      // a contractor who added an empty row but didn't fill in a number.
      const validRuns = finalRuns.filter((r) => r.linearFeet > 0);

      if (validRuns.length === 0) {
        setError("No runs with linear feet > 0. Fill in a run length before applying.");
        return;
      }

      const edited: AiExtractionResult = { ...result, runs: validRuns };
      const state = toEngineState(edited, newRunId, newGateId);
      if (!state) {
        setError("Could not convert runs to estimator state. Try re-running the extraction.");
        return;
      }

      if (typeof window !== "undefined") {
        console.log("[ai-apply]", {
          runs: state.runs.length,
          gates: state.gates.length,
          fenceType: state.fenceType,
          productLineId: state.productLineId,
        });
      }

      onApply(state);
      setApplied(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to apply runs to estimator.";
      if (typeof window !== "undefined") {
        console.error("[ai-apply] error", err);
      }
      setError(msg);
    }
  }

  // ── Row-level edit helpers ────────────────────────────────────────
  // These work on BOTH AI runs (source="ai", keyed by i) and contractor-
  // added runs (source="added", keyed by i in addedRuns). The row
  // component below dispatches to the right setter.
  function patchAiRun(i: number, patch: Partial<AiExtractedRun>) {
    setRunOverrides((prev) => ({ ...prev, [i]: { ...prev[i], ...patch } }));
  }
  function patchAddedRun(i: number, patch: Partial<AiExtractedRun>) {
    setAddedRuns((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function deleteAiRun(i: number) {
    setDeletedRunIndices((prev) => {
      const next = new Set(prev);
      next.add(i);
      return next;
    });
  }
  function restoreAiRun(i: number) {
    setDeletedRunIndices((prev) => {
      const next = new Set(prev);
      next.delete(i);
      return next;
    });
  }
  function deleteAddedRun(i: number) {
    setAddedRuns((prev) => prev.filter((_, idx) => idx !== i));
  }
  function addNewRun() {
    if (!result) return;
    // Seed from the dominant AI run so type/height/soil are pre-filled
    // to what the contractor is most likely to want. LF starts at 0
    // so the contractor has to type a real number — preferring an
    // empty input over a misleading placeholder.
    const template = result.runs[0];
    const newRun: AiExtractedRun = {
      linearFeet: 0,
      fenceType: template?.fenceType ?? "vinyl",
      productLineId: template?.productLineId ?? "vinyl_privacy_6ft",
      heightFt: template?.heightFt ?? 6,
      gates: [],
      soilType: template?.soilType ?? "standard",
      slopePercent: 0,
      isWindExposed: false,
      poolCode: false,
      runLabel: "Added by contractor",
    };
    setAddedRuns((prev) => [...prev, newRun]);
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

          {/* Survey-only: higher-accuracy re-run with Claude Opus 4.7.
              Only surface after a GPT-4o extraction; once Claude has
              run, hide this to avoid back-and-forth thrash. Contractor
              can always clear + re-upload to start over. */}
          {mode === "survey" && extractedWithModel === "gpt-4o" && (
            <div className="rounded-xl border border-accent/20 bg-accent/5 px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text">Not quite right?</p>
                  <p className="mt-0.5 text-xs text-muted leading-relaxed">
                    Re-run with our higher-accuracy model (Claude Opus 4.7). Better at complex markup, partial runs, and mid-run gates. Takes ~30 seconds.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleReRunWithClaude}
                  disabled={reRunning}
                  className="flex-shrink-0 px-3 py-2 bg-accent hover:bg-accent-light accent-glow text-white text-xs font-bold rounded-lg transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-accent whitespace-nowrap"
                >
                  {reRunning ? (
                    <span className="flex items-center gap-1.5">
                      <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Re-running…
                    </span>
                  ) : "Re-run with higher accuracy"}
                </button>
              </div>
            </div>
          )}

          {/* Note when the result came from Claude so it's clear which
              model produced the runs being reviewed. */}
          {mode === "survey" && extractedWithModel === "claude-opus-4-7" && (
            <div className="rounded-xl border border-accent/20 bg-accent/5 px-4 py-2">
              <p className="text-xs text-accent-light">
                <span className="font-semibold">Extracted via Claude Opus 4.7</span>
                <span className="text-muted"> · higher-accuracy mode</span>
              </p>
            </div>
          )}

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
                {result.runs.map((run, i) => {
                  const override = runOverrides[i];
                  const deleted = deletedRunIndices.has(i);
                  const merged: AiExtractedRun = override ? { ...run, ...override } : run;
                  return (
                    <RunEditorRow
                      key={`ai-${i}`}
                      label={run.runLabel || `Run ${i + 1}`}
                      aiOriginal={run}
                      current={merged}
                      deleted={deleted}
                      wasEdited={!!override && Object.keys(override).length > 0}
                      onPatch={(patch) => patchAiRun(i, patch)}
                      onDelete={() => deleteAiRun(i)}
                      onRestore={() => restoreAiRun(i)}
                      onResetToAi={() =>
                        setRunOverrides((prev) => {
                          const next = { ...prev };
                          delete next[i];
                          return next;
                        })
                      }
                    />
                  );
                })}
                {addedRuns.map((run, i) => (
                  <RunEditorRow
                    key={`added-${i}`}
                    label={`${run.runLabel || `Added run ${i + 1}`}`}
                    aiOriginal={null}
                    current={run}
                    deleted={false}
                    wasEdited={false}
                    onPatch={(patch) => patchAddedRun(i, patch)}
                    onDelete={() => deleteAddedRun(i)}
                  />
                ))}
                {/* Add-run button — always visible so contractor can append
                    a missing segment the AI didn't extract. */}
                <div className="px-4 py-3">
                  <button
                    type="button"
                    onClick={addNewRun}
                    className="w-full text-sm font-semibold text-accent-light hover:text-accent border border-dashed border-border hover:border-accent/40 rounded-lg py-2 transition-colors duration-150"
                  >
                    + Add run
                  </button>
                </div>
              </div>
              {(() => {
                // Total LF = non-deleted AI runs (with overrides) + added runs.
                // Rendered inline so the contractor sees a live total as
                // they edit.
                const aiLf = result.runs.reduce((s, r, i) => {
                  if (deletedRunIndices.has(i)) return s;
                  const override = runOverrides[i];
                  return s + ((override?.linearFeet ?? r.linearFeet) || 0);
                }, 0);
                const addedLf = addedRuns.reduce((s, r) => s + (r.linearFeet || 0), 0);
                const totalLf = aiLf + addedLf;
                const hasEdits =
                  Object.keys(runOverrides).length > 0 ||
                  deletedRunIndices.size > 0 ||
                  addedRuns.length > 0;
                const visibleRuns = result.runs.length - deletedRunIndices.size + addedRuns.length;
                return (
                  <div className="px-4 py-3 bg-surface-3 border-t border-border flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-text">
                        {totalLf} LF total · {visibleRuns} {visibleRuns === 1 ? "run" : "runs"}
                        {hasEdits && (
                          <span className="text-xs text-accent-light ml-2 font-normal">(edited)</span>
                        )}
                      </p>
                      {result.runs.some(r => r.fenceType !== result.runs[0].fenceType) && (
                        <p className="text-xs text-warning mt-0.5">Mixed fence types — dominant type will be set.</p>
                      )}
                    </div>
                    {applied ? (
                      <span className="text-sm font-semibold text-accent-light">Applied to estimate</span>
                    ) : (
                      <button
                        onClick={handleApply}
                        disabled={criticallyBlocked || visibleRuns === 0}
                        title={
                          visibleRuns === 0
                            ? "At least one run is required"
                            : criticallyBlocked
                            ? "Resolve critical blockers before applying"
                            : undefined
                        }
                        className="px-4 py-2 bg-accent hover:bg-accent-light accent-glow text-white text-sm font-bold rounded-lg transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-accent"
                      >
                        {criticallyBlocked ? "Blocked" : "Apply to Estimate"}
                      </button>
                    )}
                  </div>
                );
              })()}
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

// ── RunEditorRow ───────────────────────────────────────────────────
// Single row in the AI-extracted runs list. Handles LF, fence type,
// height, gates, and row delete/restore. Used for both AI-emitted
// runs (with override tracking) and contractor-added runs (direct
// state updates). The `aiOriginal` prop differs: for AI rows it holds
// the untouched AI value so we can show "reset to AI (N)" affordances
// and a strikethrough when deleted; for added rows it's null.
//
// This lives inside the same file to keep AiInputTab self-contained —
// it's substantial enough to extract to its own file if we grow it
// further, but today it reads linearly with the parent.
interface RunEditorRowProps {
  label: string;
  aiOriginal: AiExtractedRun | null;
  current: AiExtractedRun;
  deleted: boolean;
  wasEdited: boolean;
  onPatch: (patch: Partial<AiExtractedRun>) => void;
  onDelete: () => void;
  onRestore?: () => void;
  onResetToAi?: () => void;
}

function RunEditorRow({
  label,
  aiOriginal,
  current,
  deleted,
  wasEdited,
  onPatch,
  onDelete,
  onRestore,
  onResetToAi,
}: RunEditorRowProps) {
  if (deleted) {
    return (
      <div className="px-4 py-3 flex items-center justify-between bg-danger/5">
        <p className="text-sm text-muted line-through truncate">{label}</p>
        <button
          type="button"
          onClick={onRestore}
          className="text-xs font-medium text-accent-light hover:text-accent underline underline-offset-2 flex-shrink-0"
        >
          restore
        </button>
      </div>
    );
  }

  function addGate() {
    const nextGate: AiExtractedGate = { widthFt: 4, type: "walk" };
    onPatch({ gates: [...current.gates, nextGate] });
  }
  function updateGate(i: number, patch: Partial<AiExtractedGate>) {
    const next = current.gates.map((g, idx) => (idx === i ? { ...g, ...patch } : g));
    onPatch({ gates: next });
  }
  function deleteGate(i: number) {
    onPatch({ gates: current.gates.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="px-4 py-3 space-y-2">
      {/* Header row: label + delete */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-text truncate">{label}</p>
        <button
          type="button"
          onClick={onDelete}
          title="Delete this run"
          aria-label={`Delete run ${label}`}
          className="flex-shrink-0 text-muted hover:text-danger transition-colors duration-150 text-xs leading-none p-1"
        >
          ✕
        </button>
      </div>

      {/* LF + fence type + height — three-field grid on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">LF</span>
          <input
            type="number"
            min="0"
            step="1"
            value={current.linearFeet}
            onChange={(e) => {
              const v = e.target.valueAsNumber;
              if (!Number.isFinite(v) || v < 0) return;
              onPatch({ linearFeet: v });
            }}
            className={`font-display text-base font-bold bg-surface-3 border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-150 ${
              wasEdited ? "border-accent/40 text-accent-light" : "border-border text-text"
            }`}
            aria-label={`Linear feet for ${label}`}
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">Fence type</span>
          <select
            value={current.fenceType}
            onChange={(e) => {
              const next = e.target.value as AiExtractedRun["fenceType"];
              onPatch({
                fenceType: next,
                // Keep productLineId in sync — the engine requires a valid
                // enum value, so we derive a sensible default from
                // (type, height).
                productLineId: defaultProductLineId(next, current.heightFt),
              });
            }}
            className="bg-surface-3 border border-border text-text rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent capitalize"
          >
            {FENCE_TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t.replace("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">Height (ft)</span>
          <input
            type="number"
            min="2"
            max="12"
            step="1"
            value={current.heightFt}
            onChange={(e) => {
              const v = e.target.valueAsNumber;
              if (!Number.isFinite(v) || v < 2 || v > 12) return;
              onPatch({
                heightFt: v,
                productLineId: defaultProductLineId(current.fenceType, v),
              });
            }}
            className="bg-surface-3 border border-border text-text rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
          />
        </label>
      </div>

      {/* Gates */}
      {current.gates.length > 0 && (
        <div className="space-y-1.5">
          {current.gates.map((gate, gi) => (
            <div key={gi} className="flex items-center gap-2 pl-2 border-l-2 border-accent/30">
              <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">Gate</span>
              <input
                type="number"
                min="2"
                max="24"
                step="0.5"
                value={gate.widthFt}
                onChange={(e) => {
                  const v = e.target.valueAsNumber;
                  if (!Number.isFinite(v) || v < 2 || v > 24) return;
                  updateGate(gi, { widthFt: v });
                }}
                className="w-16 bg-surface-3 border border-border text-text rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                aria-label="Gate width in feet"
              />
              <span className="text-xs text-muted">ft</span>
              <select
                value={gate.type}
                onChange={(e) => updateGate(gi, { type: e.target.value as AiExtractedGate["type"] })}
                className="bg-surface-3 border border-border text-text rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              >
                <option value="walk">{gateTypeLabel("walk")}</option>
                <option value="drive">{gateTypeLabel("drive")}</option>
                <option value="double_drive">{gateTypeLabel("double_drive")}</option>
                <option value="pool">{gateTypeLabel("pool")}</option>
              </select>
              <button
                type="button"
                onClick={() => deleteGate(gi)}
                title="Remove this gate"
                aria-label="Remove gate"
                className="text-muted hover:text-danger text-xs leading-none p-1"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add gate + reset-to-AI row */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={addGate}
          className="text-xs text-accent-light hover:text-accent underline underline-offset-2"
        >
          + add gate
        </button>
        {aiOriginal && wasEdited && onResetToAi && (
          <button
            type="button"
            onClick={onResetToAi}
            className="text-[10px] text-muted hover:text-text underline underline-offset-2"
          >
            reset to AI ({aiOriginal.linearFeet} LF · {aiOriginal.fenceType} {aiOriginal.heightFt}ft)
          </button>
        )}
      </div>
    </div>
  );
}
