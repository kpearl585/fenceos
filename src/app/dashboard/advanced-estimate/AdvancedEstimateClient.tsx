"use client";
import { useMemo, useState } from "react";
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
import {
  DEFAULT_LABOR_RATE,
  DEFAULT_MARKUP_PCT,
  DEFAULT_LABOR_EFFICIENCY,
  DEFAULT_POST_SIZE,
  DEFAULT_FENCE_HEIGHT_IN,
} from "./constants";

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
    handleSave, handlePdfDownload, handleProposalDownload, handleConvertToEstimate,
  } = useEstimateActions({
    input, result, projectName, laborRate, wastePct, markupPct,
    fenceType, woodStyle, customer, totalLF: editor.totalLF,
  });

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

        {/* Config nudge banner — shown when using default rates */}
        {!hasCustomConfig && !nudgeDismissed && (
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
          <AiInputTab onApply={(state: AiAppliedState) => {
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
          }} />
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
    </div>
  );
}
