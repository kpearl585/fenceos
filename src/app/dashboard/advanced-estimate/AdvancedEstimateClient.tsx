"use client";
import { useState, useMemo, useTransition } from "react";
import {
  estimateFence,
  PRODUCT_LINES,
  type FenceProjectInput,
  type RunInput,
  type GateInput,
  type FenceEstimateResult,
  type FenceType,
  type WoodStyle,
  type DeepPartial,
  type OrgEstimatorConfig,
  type MaterialPriceMeta,
  assessEstimateMarginRisk,
  markupPctForTargetMargin,
} from "@/lib/fence-graph/engine";
import { saveAdvancedEstimate, generateAdvancedEstimatePdf, generateCustomerProposalPdf } from "./actions";
import { createEstimateFromFenceGraph } from "./convertActions";
import { downloadInternalBom, downloadSupplierPO } from "@/lib/fence-graph/exportBomExcel";
import type { SoilType, PanelHeight, PostSize, GateType } from "@/lib/fence-graph/types";
import AiInputTab, { type AiAppliedState } from "./AiInputTab";
import { sanitizeGatesForEstimator } from "@/lib/fence-graph/estimateInput";
import { SiteComplexityForm } from "@/components/SiteComplexityForm";
import type { SiteComplexity } from "@/lib/fence-graph/accuracy-types";
import { getSiteComplexityLabel } from "@/lib/fence-graph/accuracy-types";
import { validateEstimateBeforeConvert } from "./validation";

const FENCE_TYPES: { value: FenceType; label: string }[] = [
  { value: "vinyl", label: "Vinyl" },
  { value: "wood", label: "Wood" },
  { value: "chain_link", label: "Chain Link" },
  { value: "aluminum", label: "Aluminum / Ornamental" },
];

const WOOD_STYLES: { value: WoodStyle; label: string }[] = [
  { value: "dog_ear_privacy", label: "Dog Ear Privacy" },
  { value: "flat_top_privacy", label: "Flat Top Privacy" },
  { value: "picket", label: "Picket" },
  { value: "board_on_board", label: "Board on Board" },
];

const PRODUCT_LINE_BY_TYPE: Record<FenceType, string[]> = {
  vinyl: ["vinyl_privacy_6ft", "vinyl_privacy_8ft", "vinyl_picket_4ft", "vinyl_picket_6ft"],
  wood: ["wood_privacy_6ft", "wood_privacy_8ft", "wood_picket_4ft"],
  chain_link: ["chain_link_4ft", "chain_link_6ft"],
  aluminum: ["aluminum_4ft", "aluminum_6ft"],
};

const SOIL_LABELS: Record<SoilType, string> = {
  standard: "Standard",
  clay: "Clay (firm)",
  rocky: "Rocky / Caliche",
  sandy_loam: "Sandy Loam (FL inland)",
  sandy: "Sandy (FL coastal)",
  wet: "Wet / High Water Table",
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

const START_END_TYPES = ["end", "corner", "gate"] as const;
const GATE_TYPES: GateType[] = ["single", "double"];

let runIdCtr = 0;
let gateIdCtr = 0;
function newRunId() { return `run_${++runIdCtr}`; }
function newGateId() { return `gate_${++gateIdCtr}`; }

function defaultRun(): RunInput {
  return {
    id: newRunId(),
    linearFeet: 0,
    startType: "end",
    endType: "end",
    slopeDeg: 0,
  };
}

export default function AdvancedEstimateClient({
  priceMap = {},
  priceMeta = {},
  defaultWastePct = 5,
  aiAvailable = true,
  estimatorConfig,
  hasCustomConfig: _hasCustomConfig = false,
  targetMarginPct = 35,
}: {
  priceMap?: Record<string, number>;
  priceMeta?: Record<string, MaterialPriceMeta>;
  defaultWastePct?: number;
  aiAvailable?: boolean;
  estimatorConfig?: OrgEstimatorConfig | DeepPartial<OrgEstimatorConfig>;
  hasCustomConfig?: boolean;
  targetMarginPct?: number;
}) {
  const [fenceType, setFenceType] = useState<FenceType>("vinyl");
  const [woodStyle, setWoodStyle] = useState<WoodStyle>("dog_ear_privacy");
  const [productLineId, setProductLineId] = useState("vinyl_privacy_6ft");
  const [soilType, setSoilType] = useState<SoilType>("sandy_loam");
  const [windMode, setWindMode] = useState(false);
  const [existingFenceRemoval, setExistingFenceRemoval] = useState(false);
  const [laborRate, setLaborRate] = useState(65);
  const [wastePct, setWastePct] = useState(defaultWastePct);
  const [siteComplexity, setSiteComplexity] = useState<Omit<SiteComplexity, "overall_score"> | null>(null);
  const [runs, setRuns] = useState<RunInput[]>([defaultRun()]);
  const [gates, setGates] = useState<GateInput[]>([]);
  const [activeTab, setActiveTab] = useState<"bom" | "labor" | "audit">("bom");
  const [inputMode, setInputMode] = useState<"manual" | "ai">("manual");
  const [showAdvancedInputs, setShowAdvancedInputs] = useState(false);
  const [projectName, setProjectName] = useState("New Estimate");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [markupPct, setMarkupPct] = useState(() => markupPctForTargetMargin(targetMarginPct));
  const [customer, setCustomer] = useState({ name: "", address: "", city: "", phone: "", email: "" });
  const [proposalStatus, setProposalStatus] = useState<"idle" | "generating" | "error">("idle");
  const [pdfStatus, setPdfStatus] = useState<"idle" | "generating" | "error">("idle");
  const [isPending, startTransition] = useTransition();
  const [convertStatus, setConvertStatus] = useState<"idle" | "converting" | "done" | "error">("idle");
  const [convertError, setConvertError] = useState<string | null>(null);

  const productLine = PRODUCT_LINES[productLineId];
  const postSize = productLine?.postSize ?? "5x5";
  const fenceHeight = Math.round(productLine?.panelHeight_in / 12) as PanelHeight;

  const input: FenceProjectInput = useMemo(
    () => ({
      projectName,
      productLineId,
      fenceHeight,
      postSize,
      soilType,
      windMode,
      existingFenceRemoval,
      runs: runs.filter((r) => r.linearFeet > 0),
      gates: sanitizeGatesForEstimator(gates),
      siteComplexity: siteComplexity
        ? {
            ...siteComplexity,
          }
        : undefined,
    }),
    [projectName, productLineId, fenceHeight, postSize, soilType, windMode, existingFenceRemoval, runs, gates, siteComplexity]
  );

  const result: FenceEstimateResult | null = useMemo(() => {
    if (input.runs.length === 0) return null;
    try {
      return estimateFence(input, {
        fenceType,
        woodStyle,
        laborRatePerHr: laborRate,
        wastePct: wastePct / 100,
        priceMap,
        priceMeta,
        estimatorConfig,
      });
    } catch {
      return null;
    }
  }, [input, fenceType, woodStyle, laborRate, wastePct, priceMap, priceMeta, estimatorConfig]);

  function updateRun(id: string, patch: Partial<RunInput>) {
    setRuns((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeRun(id: string) {
    setRuns((prev) => prev.filter((r) => r.id !== id));
    setGates((prev) => prev.filter((g) => g.afterRunId !== id));
  }

  function addGate(afterRunId: string) {
    setGates((prev) => [...prev, {
      id: newGateId(),
      afterRunId,
      gateType: "single",
      widthFt: 4,
      isPoolGate: false,
    }]);
  }

  function updateGate(id: string, patch: Partial<GateInput>) {
    setGates((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }

  function removeGate(id: string) {
    setGates((prev) => prev.filter((g) => g.id !== id));
  }

  const totalLF = runs.reduce((s, r) => s + (r.linearFeet || 0), 0);
  const hasValidInput = input.runs.length > 0;

  const bidPrice = result ? Math.round(result.totalCost * (1 + markupPct / 100)) : 0;
  const confidenceBlockers = result?.confidenceReviewGates?.filter((gate) => gate.severity === "blocker") ?? [];
  const confidenceReviewItems = result?.confidenceReviewGates?.filter((gate) => gate.severity === "review") ?? [];
  const pricingHealth = result?.pricingHealth;
  const marginRisk = result
    ? assessEstimateMarginRisk({
        result,
        markupPct,
        targetMarginPct,
      })
    : null;
  const sendBlocked = confidenceBlockers.length > 0 || marginRisk?.status === "blocked";
  const primaryCtaHint =
    convertError ??
    (sendBlocked
      ? confidenceBlockers[0]?.message || marginRisk?.reasons?.[0] || "Resolve the highlighted estimate blockers before sending."
      : customer.name.trim()
        ? "Create a sendable estimate from the current scope."
        : "Requires customer name in Customer Info above");
  const primaryWarning =
    confidenceBlockers[0]?.message ||
    (pricingHealth && pricingHealth.freshCoveragePct < 0.25
      ? "Refresh material prices before sending this quote."
      : marginRisk?.reasons?.[0] || null);

  async function handleProposalDownload() {
    if (!result) return;
    setProposalStatus("generating");
    let shouldResetStatus = false;
    try {
      const res = await generateCustomerProposalPdf(
        input,
        laborRate,
        wastePct,
        markupPct,
        projectName,
        fenceType,
        woodStyle,
        customer
      );
      if (res.success && res.pdf) {
        const bytes = Uint8Array.from(atob(res.pdf), c => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${projectName.replace(/\s+/g, "-")}-proposal.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        setProposalStatus("idle");
        return;
      }
      setProposalStatus("error");
      shouldResetStatus = true;
    } catch {
      setProposalStatus("error");
      shouldResetStatus = true;
    }
    if (shouldResetStatus) {
      setTimeout(() => setProposalStatus("idle"), 3000);
    }
  }

  async function handleConvertToEstimate() {
    if (!result) return;
    const validationError = validateEstimateBeforeConvert({
      projectName,
      customerName: customer.name,
      result,
      markupPct,
      targetMarginPct,
    });
    if (validationError) {
      setConvertError(validationError.message);
      if (typeof document !== "undefined") {
        const field = document.getElementById(validationError.fieldId) as HTMLElement | null;
        if (field) {
          field.scrollIntoView({ behavior: "smooth", block: "center" });
          setTimeout(() => {
            if ("focus" in field && typeof field.focus === "function") {
              field.focus();
            }
          }, 300);
        }
      }
      return;
    }
    setConvertStatus("converting");
    setConvertError(null);
    let shouldResetStatus = false;
    try {
      const res = await createEstimateFromFenceGraph({
        input,
        projectName,
        laborRate,
        markupPct,
        wastePct,
        fenceType,
        woodStyle,
        customer,
      });
      if (res.success && res.estimateId) {
        setConvertStatus("done");
        window.location.href = `/dashboard/estimates/${res.estimateId}`;
        return;
      }
      setConvertStatus("error");
      setConvertError(res.error ?? "Conversion failed");
      shouldResetStatus = true;
    } catch {
      setConvertStatus("error");
      setConvertError("Conversion failed");
      shouldResetStatus = true;
    }
    if (shouldResetStatus) {
      setTimeout(() => setConvertStatus("idle"), 4000);
    }
  }

  async function handleSave() {
    if (!result) return;
    setSaveStatus("saving");
    try {
      const res = await saveAdvancedEstimate(input, projectName, laborRate, wastePct, fenceType, woodStyle);
      setSaveStatus(res.success ? "saved" : "error");
    } catch {
      setSaveStatus("error");
    }
    setTimeout(() => setSaveStatus("idle"), 3000);
  }

  async function handlePdfDownload() {
    if (!result) return;
    setPdfStatus("generating");
    let shouldResetStatus = false;
    try {
      const res = await generateAdvancedEstimatePdf(input, laborRate, wastePct, projectName, fenceType, woodStyle);
      if (res.success && res.pdf) {
        const bytes = Uint8Array.from(atob(res.pdf), c => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${projectName.replace(/\s+/g, "-")}-estimate.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        setPdfStatus("idle");
        return;
      }
      setPdfStatus("error");
      shouldResetStatus = true;
    } catch {
      setPdfStatus("error");
      shouldResetStatus = true;
    }
    if (shouldResetStatus) {
      setTimeout(() => setPdfStatus("idle"), 3000);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* ── Left Column: Inputs ────────────────────────────────────── */}
      <div className="lg:col-span-3 space-y-4">

        {/* Project Setup */}
        {/* AI / Manual toggle */}
        <div className="flex bg-surface rounded-xl p-1 gap-1 border border-border">
          <button
            onClick={() => setInputMode("manual")}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors ${inputMode === "manual" ? "bg-surface-3 text-text shadow-sm" : "text-muted hover:text-text"}`}
          >
            Manual Input
          </button>
          <button
            onClick={() => setInputMode("ai")}
            disabled={!aiAvailable}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${inputMode === "ai" ? "bg-surface-3 text-text shadow-sm" : "text-muted hover:text-text"} disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
            AI Input
          </button>
        </div>

        {/* AI Input Tab */}
        {inputMode === "ai" && (
          <AiInputTab onApply={(state: AiAppliedState) => {
            setFenceType(state.fenceType);
            setProductLineId(state.productLineId);
            setSoilType(state.soilType);
            setWindMode(state.windMode);
            setExistingFenceRemoval(state.existingFenceRemoval);
            setSiteComplexity(state.siteComplexity ?? null);
            setRuns(state.runs.length > 0 ? state.runs : [defaultRun()]);
            setGates(sanitizeGatesForEstimator(state.gates));
            setInputMode("manual"); // Switch to manual so they can review/edit
          }} />
        )}

        {inputMode === "manual" && (<>
        <div className="bg-surface rounded-xl border border-border p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-text">Project Setup</h2>
              <p className="mt-1 text-xs text-muted">Enter the basics first. Only open advanced settings if this is an unusual job.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAdvancedInputs((v) => !v)}
              className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs font-semibold text-muted hover:text-text transition-colors"
            >
              {showAdvancedInputs ? "Hide advanced" : "Show advanced"}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1">Project Name</label>
              <input
                id="est-project-name"
                type="text" placeholder="e.g. Smith Residence — Backyard Privacy"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full border border-border bg-surface-3 text-text rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
              />
            </div>
            {/* Fence Type Selector */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-2">Fence Type</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {FENCE_TYPES.map((ft) => (
                  <button
                    key={ft.value}
                    type="button"
                    onClick={() => {
                      setFenceType(ft.value);
                      setProductLineId(PRODUCT_LINE_BY_TYPE[ft.value][0]);
                    }}
                    className={`py-2 px-3 rounded-lg text-sm font-semibold border transition-colors ${fenceType === ft.value ? "bg-accent text-white border-accent" : "bg-surface-3 text-text border-border hover:border-accent/40"}`}
                  >
                    {ft.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1">Product / Height</label>
              <select
                value={productLineId}
                onChange={(e) => setProductLineId(e.target.value)}
                className="w-full border border-border bg-surface-3 text-text rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
              >
                {PRODUCT_LINE_BY_TYPE[fenceType].map((id) => (
                  <option key={id} value={id}>{PRODUCT_LINES[id]?.name ?? id}</option>
                ))}
              </select>
            </div>
            {fenceType === "wood" && (
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1">Wood Style</label>
                <select
                  value={woodStyle}
                  onChange={(e) => setWoodStyle(e.target.value as WoodStyle)}
                  className="w-full border border-border bg-surface-3 text-text rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                >
                  {WOOD_STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1">Soil Type</label>
              <select
                value={soilType}
                onChange={(e) => setSoilType(e.target.value as SoilType)}
                className="w-full border border-border bg-surface-3 text-text rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
              >
                {(Object.entries(SOIL_LABELS) as [SoilType, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          {showAdvancedInputs && (
            <div className="mt-4 rounded-xl border border-border bg-surface-2 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Advanced Settings</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1">Labor Rate ($/hr)</label>
                  <input
                    type="number" min={20} max={200} value={laborRate}
                    onChange={(e) => setLaborRate(Number(e.target.value))}
                    className="w-full border border-border bg-surface-3 text-text rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1">Waste Factor (%)</label>
                  <input
                    type="number" min={1} max={20} value={wastePct}
                    onChange={(e) => setWastePct(Number(e.target.value))}
                    className="w-full border border-border bg-surface-3 text-text rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1">Markup Over Cost (%)</label>
                  <input
                    type="number" min={0} max={200} value={markupPct}
                    onChange={(e) => setMarkupPct(Number(e.target.value))}
                    className="w-full border border-border bg-surface-3 text-text rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                  />
                  <p className="mt-1 text-[11px] text-muted">
                    Starts at the markup needed to hit your {targetMarginPct}% target margin.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setWindMode((v) => !v)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${windMode ? "bg-accent" : "bg-surface-3"}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${windMode ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                  <span className="text-sm font-medium text-text">Wind / hurricane job</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setExistingFenceRemoval((v) => !v)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${existingFenceRemoval ? "bg-accent" : "bg-surface-3"}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${existingFenceRemoval ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                  <span className="text-sm font-medium text-text">Remove old fence</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div id="est-site-complexity" tabIndex={-1} className="outline-none">
          <details className="bg-surface rounded-xl border border-border p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-text">Job Difficulty</h2>
                <p className="mt-1 text-xs text-muted">Only fill this out if the site is tricky, steep, rocky, or has permit headaches.</p>
              </div>
              <span className="rounded-full border border-border bg-surface-2 px-3 py-1 text-xs font-semibold text-muted">
                Optional
              </span>
            </summary>
            <div className="mt-4">
              <SiteComplexityForm
                initialComplexity={siteComplexity ?? undefined}
                onComplexityChange={(complexity) => setSiteComplexity(complexity)}
              />
            </div>
          </details>
        </div>

        {/* Runs */}
        <div id="est-runs" tabIndex={-1} className="bg-surface rounded-xl border border-border p-5 outline-none">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-text">Fence Runs</h2>
              <p className="text-xs text-muted mt-0.5">Add each straight segment between structural breaks (corners, gates, ends)</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted">Total</p>
              <p className="text-lg font-bold text-text">{totalLF} LF</p>
            </div>
          </div>

          <div className="space-y-3">
            {runs.map((run, idx) => {
              const gatesForRun = gates.filter((g) => g.afterRunId === run.id);
              const hasGateForRun = gatesForRun.length > 0;
              return (
                <div key={run.id} className="border border-border rounded-xl p-4 bg-surface-2">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-muted uppercase tracking-wide">Run {idx + 1}</span>
                    <button onClick={() => removeRun(run.id)} className="text-xs text-danger/70 hover:text-danger">Remove</button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-xs font-medium text-muted mb-1">Linear Feet</label>
                      <input
                        type="number" min={0} placeholder="0"
                        value={run.linearFeet || ""}
                        onChange={(e) => updateRun(run.id, { linearFeet: Number(e.target.value) })}
                        className="w-full border border-border bg-surface-3 text-text rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Start</label>
                      <select
                        value={run.startType}
                        onChange={(e) => updateRun(run.id, { startType: e.target.value as RunInput["startType"] })}
                        className="w-full border border-border bg-surface-3 text-text rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                      >
                        {START_END_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">End</label>
                      <select
                        value={run.endType}
                        onChange={(e) => updateRun(run.id, { endType: e.target.value as RunInput["endType"] })}
                        className="w-full border border-border bg-surface-3 text-text rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                      >
                        {START_END_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Slope (deg)</label>
                      <input
                        type="number" min={0} max={45} placeholder="0"
                        value={run.slopeDeg || ""}
                        onChange={(e) => updateRun(run.id, { slopeDeg: Number(e.target.value) })}
                        className="w-full border border-border bg-surface-3 text-text rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                      />
                    </div>
                  </div>
                  {(run.slopeDeg ?? 0) > 0 && (
                    <p className="mt-2 text-xs text-warning">
                      {(run.slopeDeg ?? 0) <= 18 ? "Racked panels (tilted to follow grade)" : "Stepped panels — level sections with gaps at each step"}
                    </p>
                  )}

                  {/* Gates for this run */}
                  {gatesForRun.map((gate) => (
                    <div key={gate.id} className="mt-3 border border-accent/20 bg-accent/10 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-accent-light uppercase tracking-wide">Gate after Run {idx + 1}</span>
                        <button onClick={() => removeGate(gate.id)} className="text-xs text-danger/70 hover:text-danger">Remove</button>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-muted mb-1">Type</label>
                          <select
                            value={gate.gateType}
                            onChange={(e) => updateGate(gate.id, { gateType: e.target.value as GateType })}
                            className="w-full border border-border bg-surface-3 text-text rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                          >
                            {GATE_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted mb-1">Width (ft)</label>
                          <input
                            type="number" min={3} max={14}
                            value={gate.widthFt}
                            onChange={(e) => updateGate(gate.id, { widthFt: Number(e.target.value) })}
                            className="w-full border border-border bg-surface-3 text-text rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                          />
                        </div>
                        <div className="flex items-center gap-2 pt-5">
                          <input
                            type="checkbox" id={`pool_${gate.id}`}
                            checked={gate.isPoolGate}
                            onChange={(e) => updateGate(gate.id, { isPoolGate: e.target.checked })}
                            className="rounded"
                          />
                          <label htmlFor={`pool_${gate.id}`} className="text-xs text-text">Pool gate</label>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => addGate(run.id)}
                    disabled={hasGateForRun}
                    className="mt-3 text-xs text-accent-light hover:text-accent font-medium disabled:text-muted disabled:cursor-not-allowed"
                  >
                    {hasGateForRun ? "One gate per run currently supported" : "+ Add gate after this run"}
                  </button>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => setRuns((prev) => [...prev, defaultRun()])}
            className="mt-4 w-full border-2 border-dashed border-border text-muted hover:border-accent/40 hover:text-accent-light rounded-xl py-3 text-sm font-semibold transition-colors"
          >
            + Add Run
          </button>
        </div> {/* end runs card */}
        {/* Customer Info */}
        <div className="bg-surface rounded-xl border border-border p-5">
          <h2 className="font-semibold text-text mb-1">Customer Info</h2>
          <p className="text-xs text-muted mb-4">Optional — populates the customer proposal PDF</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-muted mb-1">Customer Name</label>
              <input type="text" placeholder="Jane Smith"
                id="est-cust-name"
                value={customer.name} onChange={e => setCustomer(c => ({ ...c, name: e.target.value }))}
                className="w-full border border-border bg-surface-3 text-text rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-muted mb-1">Street Address</label>
              <input type="text" placeholder="123 Main St"
                value={customer.address} onChange={e => setCustomer(c => ({ ...c, address: e.target.value }))}
                className="w-full border border-border bg-surface-3 text-text rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">City, State, Zip</label>
              <input type="text" placeholder="Orlando, FL 32801"
                value={customer.city} onChange={e => setCustomer(c => ({ ...c, city: e.target.value }))}
                className="w-full border border-border bg-surface-3 text-text rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Phone</label>
              <input type="text" placeholder="(555) 000-0000"
                value={customer.phone} onChange={e => setCustomer(c => ({ ...c, phone: e.target.value }))}
                className="w-full border border-border bg-surface-3 text-text rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent" />
            </div>
          </div>
        </div>
        </>)} {/* end inputMode === "manual" */}
      </div> {/* end lg:col-span-3 left column */}

      {/* ── Right Column: Live Results ─────────────────────────────── */}
      <div className="lg:col-span-2 space-y-4">

        {/* Summary card */}
        {result ? (
          <>
            <div className="bg-surface rounded-xl border border-border p-5 text-white">
              <p className="text-accent-light text-xs font-semibold uppercase tracking-widest mb-3">Quick Quote</p>
              {/* Cost breakdown */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <p className="text-muted text-xs">Materials Cost</p>
                  <p className="text-xl font-bold">{fmt(result.totalMaterialCost)}</p>
                </div>
                <div>
                  <p className="text-muted text-xs">Labor ({result.totalLaborHrs}h)</p>
                  <p className="text-xl font-bold">{fmt(result.totalLaborCost)}</p>
                </div>
              </div>
              <div className="border-t border-border pt-3 mb-3 flex justify-between items-center">
                <p className="text-muted text-sm">Total Cost</p>
                <p className="text-xl font-semibold text-text">{fmt(result.totalCost)}</p>
              </div>
              {/* Bid price */}
                  {result.totalCost > 0 && (() => {
                const bidPrice = Math.round(result.totalCost * (1 + markupPct / 100));
                const grossProfit = bidPrice - result.totalCost;
                const grossMargin = Math.round((grossProfit / bidPrice) * 100);
                const pricePerLF = totalLF > 0 ? Math.round(bidPrice / totalLF) : 0;
                return (
                  <div className="bg-surface-2 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-accent-light text-xs font-semibold uppercase tracking-wide">Bid Price ({markupPct}% markup)</p>
                      <p className="text-2xl font-bold text-white">{fmt(bidPrice)}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-muted text-xs">Gross Profit</p>
                        <p className="text-sm font-bold text-green-400">{fmt(grossProfit)}</p>
                      </div>
                      <div>
                        <p className="text-muted text-xs">Gross Margin</p>
                        <p className="text-sm font-bold text-green-400">{grossMargin}%</p>
                      </div>
                      <div>
                        <p className="text-muted text-xs">Per LF</p>
                        <p className="text-sm font-bold text-text">{fmt(pricePerLF)}/LF</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
              <div className="mt-3 flex justify-between text-xs text-muted">
                <span>Confidence: {Math.round(result.overallConfidence * 100)}%</span>
                <span>{totalLF} LF · {result.bom.length} line items</span>
                {result.redFlagItems.length > 0 && (
                  <span className="text-amber-400">{result.redFlagItems.length} unpriced</span>
                )}
              </div>
              {primaryWarning && (
                <div className="mt-3 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2">
                  <p className="text-sm font-semibold text-warning">Quick review needed</p>
                  <p className="mt-1 text-xs text-warning/90">{primaryWarning}</p>
                </div>
              )}
              <details className="mt-3 rounded-lg border border-border bg-surface-2">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2">
                  <span className="text-sm font-semibold text-text">View estimate details</span>
                  <span className="text-xs text-muted">Pricing, margin, BOM, labor</span>
                </summary>
                <div className="border-t border-border p-3 space-y-3">
              {pricingHealth && (
                <div
                  id="est-pricing-health"
                  tabIndex={-1}
                  className="mt-3 rounded-lg border border-border bg-surface-2 p-3 outline-none"
                >
                  <div className="flex items-center justify-between text-xs uppercase tracking-wider">
                    <span className="font-semibold text-accent-light">Pricing Coverage</span>
                    <span className="text-muted">
                      {Math.round(pricingHealth.freshCoveragePct * 100)}% fresh
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-surface px-2 py-2">
                      <p className="text-[11px] uppercase tracking-wide text-muted">Fresh</p>
                      <p className="text-sm font-bold text-text">{Math.round(pricingHealth.freshCoveragePct * 100)}%</p>
                    </div>
                    <div className="rounded-lg bg-surface px-2 py-2">
                      <p className="text-[11px] uppercase tracking-wide text-muted">Stale</p>
                      <p className="text-sm font-bold text-warning">{Math.round(pricingHealth.staleCoveragePct * 100)}%</p>
                    </div>
                    <div className="rounded-lg bg-surface px-2 py-2">
                      <p className="text-[11px] uppercase tracking-wide text-muted">Fallback</p>
                      <p className="text-sm font-bold text-text">{pricingHealth.fallbackPriceItemCount}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    Quote accuracy is highest when supplier pricing is current within {pricingHealth.staleThresholdDays} days.
                  </p>
                </div>
              )}
              {marginRisk && (
                <div id="est-margin-risk" tabIndex={-1} className="mt-3 rounded-lg border border-border bg-surface-2 p-3 outline-none">
                  <div className="flex items-center justify-between text-xs uppercase tracking-wider">
                    <span className="font-semibold text-accent-light">Underbid Risk</span>
                    <span
                      className={
                        marginRisk.status === "blocked"
                          ? "text-danger"
                          : marginRisk.status === "risky"
                            ? "text-warning"
                            : marginRisk.status === "watch"
                              ? "text-yellow-300"
                              : "text-green-400"
                      }
                    >
                      {marginRisk.status}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-surface px-2 py-2">
                      <p className="text-[11px] uppercase tracking-wide text-muted">Gross Margin</p>
                      <p className="text-sm font-bold text-text">{marginRisk.grossMarginPct}%</p>
                    </div>
                    <div className="rounded-lg bg-surface px-2 py-2">
                      <p className="text-[11px] uppercase tracking-wide text-muted">Target</p>
                      <p className="text-sm font-bold text-text">{marginRisk.targetMarginPct}%</p>
                    </div>
                    <div className="rounded-lg bg-surface px-2 py-2">
                      <p className="text-[11px] uppercase tracking-wide text-muted">Suggested Markup</p>
                      <p className="text-sm font-bold text-text">{marginRisk.recommendedMarkupPct}%</p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    Recommended protected margin: {marginRisk.recommendedTargetMarginPct}% based on current labor calibration and estimate confidence.
                  </p>
                  {marginRisk.reasons.slice(0, 2).map((reason) => (
                    <p key={reason} className="mt-1 text-xs text-muted">{reason}</p>
                  ))}
                </div>
              )}
              {(confidenceBlockers.length > 0 || confidenceReviewItems.length > 0 || (result.confidenceNotes?.length ?? 0) > 0) && (
                <div className="mt-3 rounded-lg border border-border bg-surface-2 p-3 space-y-2">
                  {confidenceBlockers.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-danger">Resolve Before Quote</p>
                      {confidenceBlockers.slice(0, 3).map((gate) => (
                        <p key={gate.id} className="text-xs text-danger">{gate.message}</p>
                      ))}
                    </div>
                  )}
                  {confidenceReviewItems.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-warning">Recommended Review</p>
                      {confidenceReviewItems.slice(0, 2).map((gate) => (
                        <p key={gate.id} className="text-xs text-warning">{gate.message}</p>
                      ))}
                    </div>
                  )}
                  {result.confidenceNotes?.slice(0, 2).map((note) => (
                    <p key={note} className="text-xs text-muted">{note}</p>
                  ))}
                </div>
              )}
              {(siteComplexity || (result.confidenceNotes?.length ?? 0) > 0) && (
                <div className="mt-3 rounded-lg border border-border bg-surface-2 p-3 space-y-1">
                  {siteComplexity && (
                    <p className="text-xs text-text">
                      Site complexity:{" "}
                      <span className="font-semibold text-accent-light">
                        {getSiteComplexityLabel(
                          result.graph.siteConfig.siteComplexity?.overall_score ?? 0
                        )}
                      </span>
                    </p>
                  )}
                  {result.confidenceNotes?.slice(0, 2).map((note) => (
                    <p key={note} className="text-xs text-muted">{note}</p>
                  ))}
                </div>
              )}
                </div>
              </details>
              <div className="mt-4 space-y-2">
                {/* PRIMARY CTA — Convert to sendable estimate */}
                <button
                  onClick={handleConvertToEstimate}
                  disabled={convertStatus === "converting" || convertStatus === "done" || sendBlocked}
                  className="w-full py-3 rounded-lg text-sm font-bold bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-60 shadow-sm"
                >
                  {convertStatus === "converting" ? "Creating Estimate..." :
                   convertStatus === "done" ? "Redirecting..." :
                   sendBlocked ? "Review quote details first" : "Create Customer Quote"}
                </button>
                {primaryCtaHint && (
                  <p className={`text-xs text-center ${convertError ? "text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1" : "text-muted"}`}>
                    {primaryCtaHint}
                  </p>
                )}
                <button
                  onClick={handleSave}
                  disabled={saveStatus === "saving"}
                  className="w-full py-2 rounded-lg text-xs font-semibold bg-accent-dark hover:bg-accent text-white transition-colors disabled:opacity-60"
                >
                  {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : saveStatus === "error" ? "Error" : "Save Draft"}
                </button>
                <details className="rounded-lg border border-border bg-surface-2">
                  <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold text-muted hover:text-text">
                    Show internal downloads and exports
                  </summary>
                  <div className="border-t border-border p-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handlePdfDownload}
                    disabled={pdfStatus === "generating"}
                    title="Internal BOM with costs, margins, and audit trail"
                    className="py-2 rounded-lg text-xs font-semibold bg-surface-2 hover:bg-surface-3 text-text transition-colors disabled:opacity-60"
                  >
                    {pdfStatus === "generating" ? "Generating..." : "Internal BOM"}
                  </button>
                  <button
                    onClick={handleProposalDownload}
                    disabled={proposalStatus === "generating"}
                    title="Clean customer-facing proposal — no cost exposure"
                    className="py-2 rounded-lg text-xs font-semibold bg-surface-3 text-text border border-border hover:bg-surface-2 transition-colors disabled:opacity-60"
                  >
                    {proposalStatus === "generating" ? "Generating..." : proposalStatus === "error" ? "Failed" : "Customer Proposal"}
                  </button>
                </div>
                <p className="text-xs text-muted text-center">Internal BOM shows costs · Proposal shows bid price only</p>
                {/* Excel exports */}
                <div className="border-t border-fence-800 pt-2 mt-1">
                  <p className="text-xs text-muted text-center mb-2">Excel / Spreadsheet</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => result && downloadInternalBom(result, projectName, markupPct, totalLF)}
                      title="Full BOM with costs, margins, labor — internal use only"
                      className="py-2 rounded-lg text-xs font-semibold bg-surface-2 hover:bg-surface-3 text-text border border-border transition-colors"
                    >
                      Internal BOM (.xlsx)
                    </button>
                    <button
                      onClick={() => result && downloadSupplierPO(result, projectName, totalLF, undefined, customer.address ? `${customer.address}, ${customer.city}` : undefined)}
                      title="Clean purchase order for your supplier — no costs shown"
                      className="py-2 rounded-lg text-xs font-semibold bg-surface-3 text-text border border-border hover:bg-surface-2 transition-colors"
                    >
                      Supplier PO (.xlsx)
                    </button>
                  </div>
                  <p className="text-xs text-muted text-center mt-1">Internal shows margins · Supplier PO shows quantities only</p>
                </div>
                  </div>
                </details>
              </div>
            </div>

            <details className="bg-surface rounded-xl border border-border">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                <span className="text-sm font-semibold text-text">Internal breakdown</span>
                <span className="text-xs text-muted">Waste, BOM, labor, audit</span>
              </summary>
              <div className="border-t border-border p-4 space-y-4">
            {/* Scrap summary */}
            <div className="bg-surface rounded-xl border border-border p-4">
              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Waste Analysis</p>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Deterministic scrap</span>
                <span className="font-semibold text-text">{(result.deterministicScrap_in / 12).toFixed(1)} LF</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted">Probabilistic waste</span>
                <span className="font-semibold text-text">{result.probabilisticWastePct * 100}%</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
              <div className="flex border-b border-border">
                {(["bom", "labor", "audit"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 text-xs font-semibold py-2.5 uppercase tracking-wide transition-colors ${activeTab === tab ? "bg-surface-2 text-accent-light border-b-2 border-accent" : "text-muted hover:text-text"}`}
                  >
                    {tab === "bom" ? "BOM" : tab === "labor" ? "Labor" : "Audit"}
                  </button>
                ))}
              </div>

              {activeTab === "bom" && (
                <div className="divide-y divide-border">
                  {/* Header */}
                  <div className="px-4 py-2 bg-surface-2 grid grid-cols-12 gap-1 text-xs font-semibold text-muted uppercase tracking-wide">
                    <span className="col-span-5">Material</span>
                    <span className="col-span-2 text-right">Qty</span>
                    <span className="col-span-2 text-right">Unit $</span>
                    <span className="col-span-3 text-right">Ext. Cost</span>
                  </div>
                  {result.bom.map((item, i) => (
                    <div key={i} className="px-4 py-2.5 hover:bg-surface-2 grid grid-cols-12 gap-1 items-center">
                      <div className="col-span-5 min-w-0">
                        <p className="text-sm font-medium text-text truncate">{item.name}</p>
                        <p className="text-xs text-muted truncate">{item.traceability}</p>
                      </div>
                      <p className="col-span-2 text-sm font-bold text-text text-right">{item.qty} <span className="text-xs text-muted font-normal">{item.unit}</span></p>
                      <p className="col-span-2 text-xs text-muted text-right">
                        {item.unitCost != null ? fmt(item.unitCost) : <span className="text-warning">—</span>}
                      </p>
                      <p className="col-span-3 text-sm font-semibold text-right">
                        {item.extCost != null && item.extCost > 0
                          ? <span className="text-text">{fmt(item.extCost)}</span>
                          : <span className="text-warning text-xs">No price</span>}
                      </p>
                    </div>
                  ))}
                  {/* BOM subtotal */}
                  <div className="px-4 py-3 bg-surface-2 flex justify-between items-center">
                    <p className="text-sm font-bold text-text">Materials Total</p>
                    <p className="text-sm font-bold text-accent-light">{fmt(result.totalMaterialCost)}</p>
                  </div>
                </div>
              )}

              {activeTab === "labor" && (
                <div className="divide-y divide-border">
                  {result.laborDrivers.filter(l => l.count > 0).map((l, i) => (
                    <div key={i} className="px-4 py-2.5 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-text">{l.activity}</p>
                        <p className="text-xs text-muted">{l.count} units × {l.rateHrs}h each</p>
                      </div>
                      <p className="text-sm font-bold text-text">{l.totalHrs.toFixed(1)}h</p>
                    </div>
                  ))}
                  <div className="px-4 py-3 bg-surface-2 flex justify-between">
                    <p className="text-sm font-bold text-text">Total Labor</p>
                    <p className="text-sm font-bold text-accent-light">{result.totalLaborHrs}h · {fmt(result.totalLaborCost)}</p>
                  </div>
                </div>
              )}

              {activeTab === "audit" && (
                <div className="px-4 py-3">
                  <ul className="space-y-1.5">
                    {result.auditTrail.map((line, i) => (
                      <li key={i} className="text-xs text-muted font-mono leading-relaxed">{line}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
              </div>
            </details>
          </>
        ) : (
          <div className="bg-surface rounded-xl border border-border p-8 text-center">
            <p className="text-muted text-sm">Add at least one run with a length to generate an estimate.</p>
          </div>
        )}
      </div>
    </div>
  );
}
