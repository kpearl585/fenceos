"use client";
import { useMemo, useState, useEffect } from "react";
import {
  type FenceType,
  type WoodStyle,
  type OrgEstimatorConfig,
  PRODUCT_LINES,
} from "@/lib/fence-graph/engine";
import type { SoilType, PanelHeight } from "@/lib/fence-graph/types";
import AiInputTab, { type AiAppliedState } from "./AiInputTab";
import EstimatorFeedbackButton from "@/components/EstimatorFeedbackButton";
import { useFenceEstimate } from "./hooks/useFenceEstimate";
import { useEstimateActions } from "./hooks/useEstimateActions";
import { useRunsEditor } from "./hooks/useRunsEditor";
import CustomerInfoCard from "./components/CustomerInfoCard";
import RegulatoryCostsCard from "./components/RegulatoryCostsCard";
import EstimateSummaryCard from "./components/EstimateSummaryCard";
import ProjectSetupCard, { PRODUCT_LINE_BY_TYPE } from "./components/ProjectSetupCard";
import RunsEditor from "./components/RunsEditor";
import { PaywallModal } from "@/components/PaywallModal";
import {
  DEFAULT_LABOR_RATE,
  DEFAULT_MARKUP_PCT,
  DEFAULT_LABOR_EFFICIENCY,
  DEFAULT_POST_SIZE,
  DEFAULT_FENCE_HEIGHT_IN,
} from "./constants";

// ── Draft persistence (autosave) ─────────────────────────────────────
// localStorage key is versioned so a future schema change just leaves
// old drafts on the shelf until they're overwritten or user clears the
// key — no broken-restore attempts.
const DRAFT_KEY = "fep-estimator-draft-v1";
const DRAFT_SAVE_DEBOUNCE_MS = 600;

// Scope of what's auto-saved. Intentionally excludes runs[] / gates[]
// arrays because useRunsEditor owns that state internally — a proper
// runs-restore would need a hydration path into the hook. Covered for
// a follow-up; today autosave covers everything the user types into the
// Project Setup card + Regulatory Costs + Customer Info, which is the
// bulk of the typing and the part most costly to lose.
interface EstimatorDraft {
  projectName: string;
  fenceType: string;
  productLineId: string;
  woodStyle: string;
  soilType: string;
  laborRate: number;
  wastePct: number;
  markupPct: number;
  windMode: boolean;
  existingFenceRemoval: boolean;
  laborEfficiency: number;
  permitCost: number;
  inspectionCost: number;
  engineeringCost: number;
  surveyCost: number;
  customer: { name: string; address: string; city: string; phone: string; email: string };
}

export default function AdvancedEstimateClient({
  priceMap = {},
  defaultWastePct = 5,
  aiAvailable = true,
  estimatorConfig,
  hasCustomConfig = false,
}: {
  priceMap?: Record<string, number>;
  defaultWastePct?: number;
  aiAvailable?: boolean;
  estimatorConfig?: OrgEstimatorConfig;
  hasCustomConfig?: boolean;
}) {
  const editor = useRunsEditor();

  const [fenceType, setFenceType] = useState<FenceType>("vinyl");
  const [woodStyle, setWoodStyle] = useState<WoodStyle>("dog_ear_privacy");
  const [productLineId, setProductLineId] = useState("vinyl_privacy_6ft");
  const [soilType, setSoilType] = useState<SoilType>("sandy_loam");
  const [windMode, setWindMode] = useState(false);
  const [laborRate, setLaborRate] = useState(DEFAULT_LABOR_RATE);
  const [wastePct, setWastePct] = useState(defaultWastePct);
  // Default to manual — contractors want to enter numbers immediately.
  // AI is a power feature they discover via the toggle, not the default path.
  const [inputMode, setInputMode] = useState<"manual" | "ai">("manual");
  const [projectName, setProjectName] = useState("New Estimate");
  const [markupPct, setMarkupPct] = useState(DEFAULT_MARKUP_PCT);
  const [customer, setCustomer] = useState({ name: "", address: "", city: "", phone: "", email: "" });
  const [existingFenceRemoval, setExistingFenceRemoval] = useState(false);
  const [laborEfficiency, setLaborEfficiency] = useState(DEFAULT_LABOR_EFFICIENCY);
  const [permitCost, setPermitCost] = useState(0);
  const [inspectionCost, setInspectionCost] = useState(0);
  const [engineeringCost, setEngineeringCost] = useState(0);
  const [surveyCost, setSurveyCost] = useState(0);
  // Persist nudge dismiss so it doesn't reappear on every page load.
  // After ~3 dismissals the contractor has seen it enough.
  const [nudgeDismissed, setNudgeDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("fep-nudge-dismissed") === "true";
  });

  // Autosave draft — see the useEffects below. Surfaces a "Draft restored"
  // note when a previous in-progress estimate is recovered on mount.
  const [draftRestored, setDraftRestored] = useState(false);

  // ── Draft restore on mount ──────────────────────────────────────────
  // useEffect deliberately, not lazy useState initializer: avoids SSR/CSR
  // mismatch and keeps localStorage access off the render path. Runs once.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as Partial<EstimatorDraft>;
      if (!d || typeof d !== "object") return;

      // Restore scalar form state. Keep validation tight — each field is
      // narrowed to its expected runtime type before setState to prevent
      // a corrupted draft from blowing up the estimator.
      if (typeof d.projectName === "string") setProjectName(d.projectName);
      if (typeof d.fenceType === "string") setFenceType(d.fenceType as FenceType);
      if (typeof d.productLineId === "string") setProductLineId(d.productLineId);
      if (typeof d.woodStyle === "string") setWoodStyle(d.woodStyle as WoodStyle);
      if (typeof d.soilType === "string") setSoilType(d.soilType as SoilType);
      if (typeof d.laborRate === "number") setLaborRate(d.laborRate);
      if (typeof d.wastePct === "number") setWastePct(d.wastePct);
      if (typeof d.markupPct === "number") setMarkupPct(d.markupPct);
      if (typeof d.windMode === "boolean") setWindMode(d.windMode);
      if (typeof d.existingFenceRemoval === "boolean") setExistingFenceRemoval(d.existingFenceRemoval);
      if (typeof d.laborEfficiency === "number") setLaborEfficiency(d.laborEfficiency);
      if (typeof d.permitCost === "number") setPermitCost(d.permitCost);
      if (typeof d.inspectionCost === "number") setInspectionCost(d.inspectionCost);
      if (typeof d.engineeringCost === "number") setEngineeringCost(d.engineeringCost);
      if (typeof d.surveyCost === "number") setSurveyCost(d.surveyCost);
      if (d.customer && typeof d.customer === "object") {
        setCustomer({
          name:    typeof d.customer.name === "string" ? d.customer.name : "",
          address: typeof d.customer.address === "string" ? d.customer.address : "",
          city:    typeof d.customer.city === "string" ? d.customer.city : "",
          phone:   typeof d.customer.phone === "string" ? d.customer.phone : "",
          email:   typeof d.customer.email === "string" ? d.customer.email : "",
        });
      }
      setDraftRestored(true);
      // Auto-dismiss after a few seconds — we don't want a permanent
      // banner nagging the user about a draft they're actively editing.
      const t = setTimeout(() => setDraftRestored(false), 5000);
      return () => clearTimeout(t);
    } catch {
      // Corrupt or version-mismatched draft — silently ignore.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  // ── Draft save on change (debounced) ───────────────────────────────
  // Any state change flushes to localStorage after DRAFT_SAVE_DEBOUNCE_MS
  // of inactivity. Each re-run clears the prior timer, so the user's
  // typing cadence never hits the disk on every keystroke.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const draft: EstimatorDraft = {
      projectName, fenceType, productLineId, woodStyle, soilType,
      laborRate, wastePct, markupPct, windMode, existingFenceRemoval,
      laborEfficiency, permitCost, inspectionCost, engineeringCost, surveyCost,
      customer,
    };
    const handle = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch {
        // Storage full / disabled — no-op. Draft is nice-to-have, not
        // required for the estimator to work.
      }
    }, DRAFT_SAVE_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [
    projectName, fenceType, productLineId, woodStyle, soilType,
    laborRate, wastePct, markupPct, windMode, existingFenceRemoval,
    laborEfficiency, permitCost, inspectionCost, engineeringCost, surveyCost,
    customer,
  ]);

  const productLine = PRODUCT_LINES[productLineId];
  const postSize = productLine?.postSize ?? DEFAULT_POST_SIZE;
  const fenceHeight = Math.round((productLine?.panelHeight_in ?? DEFAULT_FENCE_HEIGHT_IN) / 12) as PanelHeight;

  // Build per-estimate config with labor efficiency override
  const estimateConfig = useMemo(() => {
    if (!estimatorConfig) return undefined;
    if (Math.abs(laborEfficiency - DEFAULT_LABOR_EFFICIENCY) < 1e-6) return estimatorConfig;
    return {
      ...estimatorConfig,
      laborEfficiency: { baseMultiplier: laborEfficiency },
    };
  }, [estimatorConfig, laborEfficiency]);

  const { input, result, estimateError } = useFenceEstimate({
    productLineId, fenceHeight, postSize, soilType, windMode,
    effectiveRuns: editor.effectiveRuns, gates: editor.gates, existingFenceRemoval,
    permitCost, inspectionCost, engineeringCost, surveyCost,
    fenceType, woodStyle, laborRate, wastePct, priceMap, estimateConfig,
  });

  const {
    saveStatus, pdfStatus, proposalStatus, convertStatus, convertError,
    paywallBlock, dismissPaywall, showPaywall,
    handleSave, handlePdfDownload, handleProposalDownload, handleConvertToEstimate,
  } = useEstimateActions({
    input, result, projectName, laborRate, wastePct, markupPct,
    fenceType, woodStyle, customer, totalLF: editor.totalLF,
  });

  // Clear the saved draft once a save/convert lands — prevents the next
  // visit from restoring a snapshot that's already persisted in the DB.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (saveStatus === "saved" || convertStatus === "done") {
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
    }
  }, [saveStatus, convertStatus]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* ── Left Column: Inputs ────────────────────────────────────── */}
      <div className="lg:col-span-3 space-y-4">

        {/* AI / Manual toggle */}
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          <button
            onClick={() => setInputMode("manual")}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors ${inputMode === "manual" ? "bg-white text-fence-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            Manual Input
          </button>
          <button
            onClick={() => setInputMode("ai")}
            disabled={!aiAvailable}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${inputMode === "ai" ? "bg-white text-fence-900 shadow-sm" : "text-gray-500 hover:text-gray-700"} disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
            AI Input
          </button>
        </div>

        {/* Draft-restored toast — fades after 5s via the mount effect. */}
        {draftRestored && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 flex items-center justify-between text-sm">
            <span className="text-green-800">
              <span className="font-semibold">Draft restored.</span>{" "}
              We saved your last in-progress estimate so you don&apos;t have to re-enter everything.
            </span>
            <button
              onClick={() => {
                setDraftRestored(false);
                try { localStorage.removeItem(DRAFT_KEY); } catch {}
              }}
              className="text-green-600 hover:text-green-800 ml-3 text-xs font-semibold underline"
            >
              Start fresh
            </button>
          </div>
        )}

        {/* Config nudge — only shown when the org hasn't customized rates
            AND hasn't dismissed. We don't stack this with the draft toast;
            the draft toast takes priority during the first few seconds. */}
        {!hasCustomConfig && !nudgeDismissed && !draftRestored && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-800">Using industry-standard rates</p>
              <p className="text-xs text-blue-700 mt-0.5">
                These estimates use default labor rates and material assumptions.{" "}
                <a href="/dashboard/settings/estimator" className="underline font-semibold">Customize them in Estimator Settings</a> to match your crew speed and local pricing.
              </p>
            </div>
            <button onClick={() => { setNudgeDismissed(true); try { localStorage.setItem("fep-nudge-dismissed", "true"); } catch {} }} className="text-blue-400 hover:text-blue-600 ml-3 text-lg leading-none">&times;</button>
          </div>
        )}

        {/* AI Input Tab */}
        {inputMode === "ai" && (
          <AiInputTab
            onApply={(state: AiAppliedState) => {
              setFenceType(state.fenceType);
              setProductLineId(state.productLineId);
              if (state.productLineId && !PRODUCT_LINE_BY_TYPE[state.fenceType]?.includes(state.productLineId)) {
                setProductLineId(PRODUCT_LINE_BY_TYPE[state.fenceType][0]);
              }
              setSoilType(state.soilType);
              setWindMode(state.windMode);
              editor.setRuns(
                state.runs.length > 0
                  ? state.runs
                  : [editor.makeDefaultRun(editor.newRunId())],
              );
              editor.setGates(state.gates);
              setInputMode("manual"); // Switch to manual so they can review/edit
            }}
            onPaywall={showPaywall}
          />
        )}

        {inputMode === "manual" && (
          <>
            <ProjectSetupCard
              projectName={projectName}
              onProjectNameChange={setProjectName}
              fenceType={fenceType}
              onFenceTypeChange={setFenceType}
              productLineId={productLineId}
              onProductLineIdChange={setProductLineId}
              woodStyle={woodStyle}
              onWoodStyleChange={setWoodStyle}
              soilType={soilType}
              onSoilTypeChange={setSoilType}
              laborRate={laborRate}
              onLaborRateChange={setLaborRate}
              wastePct={wastePct}
              onWastePctChange={setWastePct}
              markupPct={markupPct}
              onMarkupPctChange={setMarkupPct}
              windMode={windMode}
              onWindModeToggle={() => setWindMode((v) => !v)}
              existingFenceRemoval={existingFenceRemoval}
              onExistingFenceRemovalToggle={() => setExistingFenceRemoval((v) => !v)}
              laborEfficiency={laborEfficiency}
              onLaborEfficiencyChange={setLaborEfficiency}
            />

            <RunsEditor editor={editor} />

            <RegulatoryCostsCard
              permitCost={permitCost}
              inspectionCost={inspectionCost}
              engineeringCost={engineeringCost}
              surveyCost={surveyCost}
              onPermitChange={setPermitCost}
              onInspectionChange={setInspectionCost}
              onEngineeringChange={setEngineeringCost}
              onSurveyChange={setSurveyCost}
            />
          </>
        )}

        {/* Customer Info — moved below measurements so contractors
            fill fence details first (the thing they care about) then
            customer info when they're ready to generate a quote. */}
        <CustomerInfoCard value={customer} onChange={setCustomer} />
      </div>

      {/* ── Right Column: Live Results ─────────────────────────────── */}
      <div className="lg:col-span-2 space-y-4">
        <EstimateSummaryCard
          result={result}
          estimateError={estimateError}
          projectName={projectName}
          markupPct={markupPct}
          totalLF={editor.totalLF}
          customer={customer}
          saveStatus={saveStatus}
          pdfStatus={pdfStatus}
          proposalStatus={proposalStatus}
          convertStatus={convertStatus}
          convertError={convertError}
          onSave={handleSave}
          onPdfDownload={handlePdfDownload}
          onProposalDownload={handleProposalDownload}
          onConvertToEstimate={handleConvertToEstimate}
        />
      </div>

      {/* Feedback button - only shown when results are available */}
      {result && <EstimatorFeedbackButton />}

      {/* Sticky mobile price bar — visible only on small screens when
          the results column is scrolled out of view. Shows the live total
          so the contractor always knows the price while editing inputs. */}
      {result && (
        <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-fence-950 text-white px-4 py-3 flex items-center justify-between z-40 shadow-lg border-t border-fence-800">
          <div>
            <p className="text-xs text-fence-300">Estimate Total</p>
            <p className="text-xl font-bold">${Math.round(result.totalCost).toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-fence-300">{editor.totalLF} LF</p>
            <p className="text-sm font-semibold text-fence-200">
              {editor.totalLF > 0 ? `$${Math.round(result.totalCost * (1 + Math.max(0, markupPct) / 100) / editor.totalLF)}/LF` : "—"}
            </p>
          </div>
        </div>
      )}

      <PaywallModal block={paywallBlock} onClose={dismissPaywall} />
    </div>
  );
}
