"use client";
import { useState, useMemo, useRef, useCallback } from "react";
import {
  PRODUCT_LINES,
  type RunInput,
  type GateInput,
  type FenceType,
  type WoodStyle,
  type OrgEstimatorConfig,
} from "@/lib/fence-graph/engine";
import type { SoilType, PanelHeight, GateType } from "@/lib/fence-graph/types";
import AiInputTab, { type AiAppliedState } from "./AiInputTab";
import EstimatorFeedbackButton from "@/components/EstimatorFeedbackButton";
import { HelpTooltip } from "@/components/Tooltip";
import { useFenceEstimate } from "./hooks/useFenceEstimate";
import { useEstimateActions } from "./hooks/useEstimateActions";
import CustomerInfoCard from "./components/CustomerInfoCard";
import RegulatoryCostsCard from "./components/RegulatoryCostsCard";
import EstimateSummaryCard from "./components/EstimateSummaryCard";

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
  standard: "Standard / Mixed",
  clay: "Clay (firm)",
  rocky: "Rocky / Caliche",
  sandy_loam: "Sandy Loam (FL inland)",
  sandy: "Sandy (FL coastal)",
  wet: "Wet / High Water Table",
};

const START_END_TYPES = ["end", "corner", "gate"] as const;
const GATE_TYPES: GateType[] = ["single", "double"];

function makeDefaultRun(id: string): RunInput {
  return {
    id,
    linearFeet: 0,
    startType: "end",
    endType: "end",
    slopeDeg: 0,
  };
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
  const runIdCtrRef = useRef(0);
  const gateIdCtrRef = useRef(0);
  const newRunId = useCallback(() => `run_${++runIdCtrRef.current}`, []);
  const newGateId = useCallback(() => `gate_${++gateIdCtrRef.current}`, []);

  const [fenceType, setFenceType] = useState<FenceType>("vinyl");
  const [woodStyle, setWoodStyle] = useState<WoodStyle>("dog_ear_privacy");
  const [productLineId, setProductLineId] = useState("vinyl_privacy_6ft");
  const [soilType, setSoilType] = useState<SoilType>("sandy_loam");
  const [windMode, setWindMode] = useState(false);
  const [laborRate, setLaborRate] = useState(65);
  const [wastePct, setWastePct] = useState(defaultWastePct);
  const [runs, setRuns] = useState<RunInput[]>(() => [makeDefaultRun(`run_${++runIdCtrRef.current}`)]);
  const [gates, setGates] = useState<GateInput[]>([]);
  const [inputMode, setInputMode] = useState<"manual" | "ai">(aiAvailable ? "ai" : "manual");
  const [projectName, setProjectName] = useState("New Estimate");
  const [markupPct, setMarkupPct] = useState(35);
  const [customer, setCustomer] = useState({ name: "", address: "", city: "", phone: "", email: "" });
  // New: job site options
  const [existingFenceRemoval, setExistingFenceRemoval] = useState(false);
  const [laborEfficiency, setLaborEfficiency] = useState(1.0);
  // New: regulatory costs
  const [permitCost, setPermitCost] = useState(0);
  const [inspectionCost, setInspectionCost] = useState(0);
  const [engineeringCost, setEngineeringCost] = useState(0);
  const [surveyCost, setSurveyCost] = useState(0);
  // New: nudge banner
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  // New: Simple Mode
  const [runsMode, setRunsMode] = useState<"simple" | "advanced">("simple");
  const [simpleTotalFeet, setSimpleTotalFeet] = useState(0);
  const [simpleCorners, setSimpleCorners] = useState(0);
  const [simpleShape, setSimpleShape] = useState<"open" | "closed">("open");

  const productLine = PRODUCT_LINES[productLineId];
  const postSize = productLine?.postSize ?? "5x5";
  const fenceHeight = Math.round(productLine?.panelHeight_in / 12) as PanelHeight;

  // Derive the runs the engine should consume.
  // Simple mode: compute sections on demand from total feet + corners + shape,
  // without writing to the `runs` state. Advanced mode: use the edited runs.
  // This preserves Advanced edits across mode toggles and avoids the id churn
  // + focus loss that the old "setRuns inside useEffect" pattern caused.
  const effectiveRuns = useMemo<RunInput[]>(() => {
    if (runsMode !== "simple") return runs;
    if (simpleTotalFeet <= 0) return [];
    const corners = Math.max(0, Math.floor(simpleCorners));
    const numSections = simpleShape === "closed" ? Math.max(1, corners) : corners + 1;
    const feetPerSection = simpleTotalFeet / numSections;
    const out: RunInput[] = [];
    for (let i = 0; i < numSections; i++) {
      const isFirst = i === 0;
      const isLast = i === numSections - 1;
      out.push({
        id: `simple_${i}`,
        linearFeet: Math.round(feetPerSection),
        startType: simpleShape === "closed" ? "corner" : (isFirst ? "end" : "corner"),
        endType: simpleShape === "closed" ? "corner" : (isLast ? "end" : "corner"),
        slopeDeg: 0,
      });
    }
    return out;
  }, [runsMode, simpleTotalFeet, simpleCorners, simpleShape, runs]);

  // Seed advanced state from simple state on first switch so users don't lose
  // their measurements when they decide to refine section-by-section.
  const handleRunsModeChange = useCallback((mode: "simple" | "advanced") => {
    if (mode === "advanced" && runsMode === "simple") {
      const isDefaultAdvanced = runs.length <= 1 && (runs[0]?.linearFeet ?? 0) === 0;
      if (isDefaultAdvanced && simpleTotalFeet > 0) {
        const corners = Math.max(0, Math.floor(simpleCorners));
        const numSections = simpleShape === "closed" ? Math.max(1, corners) : corners + 1;
        const feetPerSection = simpleTotalFeet / numSections;
        const seeded: RunInput[] = [];
        for (let i = 0; i < numSections; i++) {
          const isFirst = i === 0;
          const isLast = i === numSections - 1;
          seeded.push({
            id: `run_${++runIdCtrRef.current}`,
            linearFeet: Math.round(feetPerSection),
            startType: simpleShape === "closed" ? "corner" : (isFirst ? "end" : "corner"),
            endType: simpleShape === "closed" ? "corner" : (isLast ? "end" : "corner"),
            slopeDeg: 0,
          });
        }
        setRuns(seeded);
      }
    }
    setRunsMode(mode);
  }, [runsMode, runs, simpleTotalFeet, simpleCorners, simpleShape]);

  // Build per-estimate config with labor efficiency override
  const estimateConfig = useMemo(() => {
    if (!estimatorConfig) return undefined;
    if (Math.abs(laborEfficiency - 1.0) < 1e-6) return estimatorConfig;
    return {
      ...estimatorConfig,
      laborEfficiency: { baseMultiplier: laborEfficiency },
    };
  }, [estimatorConfig, laborEfficiency]);

  const { input, result, estimateError, hasValidInput } = useFenceEstimate({
    productLineId, fenceHeight, postSize, soilType, windMode,
    effectiveRuns, gates, existingFenceRemoval,
    permitCost, inspectionCost, engineeringCost, surveyCost,
    fenceType, woodStyle, laborRate, wastePct, priceMap, estimateConfig,
  });

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

  const totalLF = effectiveRuns.reduce((s, r) => s + (r.linearFeet || 0), 0);

  const {
    saveStatus, pdfStatus, proposalStatus, convertStatus, convertError,
    handleSave, handlePdfDownload, handleProposalDownload, handleConvertToEstimate,
  } = useEstimateActions({
    input, result, projectName, laborRate, wastePct, markupPct,
    fenceType, woodStyle, customer, totalLF,
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* ── Left Column: Inputs ────────────────────────────────────── */}
      <div className="lg:col-span-3 space-y-4">

        {/* Project Setup */}
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

        {/* Customer Info — Always visible, used by all PDFs/estimates */}
        <CustomerInfoCard value={customer} onChange={setCustomer} />

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
            <button onClick={() => setNudgeDismissed(true)} className="text-blue-400 hover:text-blue-600 ml-3 text-lg leading-none">&times;</button>
          </div>
        )}

        {/* AI Input Tab */}
        {inputMode === "ai" && (
          <AiInputTab onApply={(state: AiAppliedState) => {
            setFenceType(state.fenceType);
            setProductLineId(state.productLineId);
            setSoilType(state.soilType);
            setWindMode(state.windMode);
            setRuns(state.runs.length > 0 ? state.runs : [makeDefaultRun(newRunId())]);
            setGates(state.gates);
            setInputMode("manual"); // Switch to manual so they can review/edit
          }} />
        )}

        {inputMode === "manual" && (<>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-fence-900 mb-4">Project Setup</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Project Name</label>
              <input
                type="text" placeholder="e.g. Smith Residence — Backyard Privacy"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fence-400"
              />
            </div>
            {/* Fence Type Selector */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Fence Type</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {FENCE_TYPES.map((ft) => (
                  <button
                    key={ft.value}
                    type="button"
                    onClick={() => {
                      setFenceType(ft.value);
                      setProductLineId(PRODUCT_LINE_BY_TYPE[ft.value][0]);
                    }}
                    className={`py-2 px-3 rounded-lg text-sm font-semibold border transition-colors ${fenceType === ft.value ? "bg-fence-600 text-white border-fence-600" : "bg-white text-gray-600 border-gray-200 hover:border-fence-400"}`}
                  >
                    {ft.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Product / Height</label>
              <select
                value={productLineId}
                onChange={(e) => setProductLineId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fence-400"
              >
                {PRODUCT_LINE_BY_TYPE[fenceType].map((id) => (
                  <option key={id} value={id}>{PRODUCT_LINES[id]?.name ?? id}</option>
                ))}
              </select>
            </div>
            {fenceType === "wood" && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Wood Style</label>
                <select
                  value={woodStyle}
                  onChange={(e) => setWoodStyle(e.target.value as WoodStyle)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fence-400"
                >
                  {WOOD_STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Soil Type
                <HelpTooltip content="Soil type affects concrete depth and hole diameter. Sandy soil needs deeper holes, clay allows shallower holes. This impacts concrete quantity and post stability." />
              </label>
              <select
                value={soilType}
                onChange={(e) => setSoilType(e.target.value as SoilType)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fence-400"
              >
                {(Object.entries(SOIL_LABELS) as [SoilType, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Labor Rate ($/hr)
                <HelpTooltip content="Your crew's hourly rate including wages, insurance, and benefits. Typical range: $50-80/hr for 2-person crew. System calculates hours based on fence complexity." />
              </label>
              <input
                type="number" min={20} max={200} value={laborRate}
                onChange={(e) => setLaborRate(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fence-400"
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Waste Factor (%)
                <HelpTooltip content="Extra material to account for cuts, defects, and installation errors. Typical: 5-7%. System learns your actual waste from completed jobs and adjusts this automatically." />
              </label>
              <input
                type="number" min={1} max={20} value={wastePct}
                onChange={(e) => setWastePct(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fence-400"
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Markup Over Cost (%)
                <HelpTooltip content="Your profit margin over total cost (materials + labor). Typical: 30-40%. This determines your bid price and gross profit." />
              </label>
              <input
                type="number" min={0} max={200} value={markupPct}
                onChange={(e) => setMarkupPct(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fence-400"
              />
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setWindMode((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${windMode ? "bg-fence-600" : "bg-gray-200"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${windMode ? "translate-x-6" : "translate-x-1"}`} />
              </button>
              <span className="text-sm font-medium text-gray-700">Wind Mode / Hurricane Zone</span>
              {windMode && <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">Deeper posts + aluminum inserts + rebar applied</span>}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setExistingFenceRemoval((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${existingFenceRemoval ? "bg-fence-600" : "bg-gray-200"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${existingFenceRemoval ? "translate-x-6" : "translate-x-1"}`} />
              </button>
              <span className="text-sm font-medium text-gray-700">Existing Fence Removal</span>
              {existingFenceRemoval && <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">Tear-down labor + post extraction + disposal</span>}
            </div>
          </div>

          {/* Labor Efficiency Slider */}
          <div className="mt-4 border-t border-gray-100 pt-4">
            <label className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Site Difficulty Adjustment
              <HelpTooltip content="Adjusts labor time for site conditions. Rocky soil, tight access, or difficult terrain = slide right (+). Wide open, easy access = slide left (-). Affects total labor hours and cost." />
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range" min={0.7} max={1.5} step={0.05}
                value={laborEfficiency}
                onChange={(e) => setLaborEfficiency(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-fence-600"
              />
              <span className="text-sm font-bold text-fence-900 w-14 text-right">
                {laborEfficiency === 1.0 ? "Normal" : `${laborEfficiency > 1 ? "+" : ""}${Math.round((laborEfficiency - 1) * 100)}%`}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Slide right for harder sites (rocky, tight access). Slide left for easy, open lots.
            </p>
          </div>
        </div>

        {/* Regulatory Costs (collapsible) */}
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

        {/* Runs */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-fence-900">Fence Measurements</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {runsMode === "simple" ? "Enter total linear feet and number of corners" : "Add each straight segment between structural breaks"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Total</p>
              <p className="text-lg font-bold text-fence-900">{totalLF} LF</p>
            </div>
          </div>

          {/* Simple/Advanced Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1 gap-1 mb-4">
            <button
              onClick={() => handleRunsModeChange("simple")}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${runsMode === "simple" ? "bg-white text-fence-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              Simple Mode
            </button>
            <button
              onClick={() => handleRunsModeChange("advanced")}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${runsMode === "advanced" ? "bg-white text-fence-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              Advanced (Run-by-Run)
            </button>
          </div>

          {/* Simple Mode UI */}
          {runsMode === "simple" && (
            <div className="space-y-3 mb-4">
              {/* Shape toggle */}
              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-gray-500 mb-1">
                  Fence Shape
                  <HelpTooltip content="Open: fence runs along an edge with two free ends (e.g. back property line). Closed: fence wraps all the way around an area (e.g. backyard enclosure)." />
                </label>
                <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => setSimpleShape("open")}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${simpleShape === "open" ? "bg-white text-fence-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    Open (line / L-shape)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimpleShape("closed")}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${simpleShape === "closed" ? "bg-white text-fence-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    Closed (enclosure)
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-gray-500 mb-1">
                    Total Linear Feet
                    <HelpTooltip content="The total amount of fencing you need. Measure the perimeter where you want the fence installed." />
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="180"
                    value={simpleTotalFeet || ""}
                    onChange={(e) => {
                      const v = e.target.valueAsNumber;
                      setSimpleTotalFeet(Number.isFinite(v) ? Math.max(0, v) : 0);
                    }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fence-400"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-gray-500 mb-1">
                    Number of Corners
                    <HelpTooltip content={simpleShape === "closed" ? "Count the 90-degree turns around the enclosure. A rectangle has 4 corners. Sections = corners." : "Count the 90-degree turns in the line. A straight fence has 0 corners (1 section). An L-shape has 1 corner (2 sections)."} />
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    placeholder="2"
                    value={simpleCorners || ""}
                    onChange={(e) => {
                      const v = e.target.valueAsNumber;
                      setSimpleCorners(Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0);
                    }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fence-400"
                  />
                </div>
              </div>
              {simpleTotalFeet > 0 && effectiveRuns.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-green-800 mb-1">Auto-Generated</p>
                  <p className="text-xs text-green-700">
                    {effectiveRuns.length} section{effectiveRuns.length !== 1 ? "s" : ""} of ~{Math.round(simpleTotalFeet / effectiveRuns.length)} LF each
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Advanced Mode UI */}
          {runsMode === "advanced" && (
          <>
          <div className="space-y-3">
            {runs.map((run, idx) => {
              const gatesForRun = gates.filter((g) => g.afterRunId === run.id);
              return (
                <div key={run.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Run {idx + 1}</span>
                    <button onClick={() => removeRun(run.id)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Linear Feet</label>
                      <input
                        type="number" min={0} placeholder="0"
                        value={run.linearFeet || ""}
                        onChange={(e) => updateRun(run.id, { linearFeet: Number(e.target.value) })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fence-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Start</label>
                      <select
                        value={run.startType}
                        onChange={(e) => updateRun(run.id, { startType: e.target.value as RunInput["startType"] })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fence-400"
                      >
                        {START_END_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">End</label>
                      <select
                        value={run.endType}
                        onChange={(e) => updateRun(run.id, { endType: e.target.value as RunInput["endType"] })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fence-400"
                      >
                        {START_END_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Slope (deg)</label>
                      <input
                        type="number" min={0} max={45} placeholder="0"
                        value={run.slopeDeg || ""}
                        onChange={(e) => updateRun(run.id, { slopeDeg: Number(e.target.value) })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fence-400"
                      />
                    </div>
                  </div>
                  {(run.slopeDeg ?? 0) > 0 && (
                    <p className="mt-2 text-xs text-amber-600">
                      {(run.slopeDeg ?? 0) <= 18 ? "Racked panels (tilted to follow grade)" : "Stepped panels — level sections with gaps at each step"}
                    </p>
                  )}

                  {/* Gates for this run */}
                  {gatesForRun.map((gate) => (
                    <div key={gate.id} className="mt-3 border border-fence-100 bg-fence-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-fence-700 uppercase tracking-wide">Gate after Run {idx + 1}</span>
                        <button onClick={() => removeGate(gate.id)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                          <select
                            value={gate.gateType}
                            onChange={(e) => updateGate(gate.id, { gateType: e.target.value as GateType })}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-fence-400"
                          >
                            {GATE_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Width (ft)</label>
                          <input
                            type="number" min={3} max={14}
                            value={gate.widthFt}
                            onChange={(e) => updateGate(gate.id, { widthFt: Number(e.target.value) })}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-fence-400"
                          />
                        </div>
                        <div className="flex items-center gap-2 pt-5">
                          <input
                            type="checkbox" id={`pool_${gate.id}`}
                            checked={gate.isPoolGate}
                            onChange={(e) => updateGate(gate.id, { isPoolGate: e.target.checked })}
                            className="rounded"
                          />
                          <label htmlFor={`pool_${gate.id}`} className="text-xs text-gray-600">Pool gate</label>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => addGate(run.id)}
                    className="mt-3 text-xs text-fence-600 hover:text-fence-800 font-medium"
                  >
                    + Add gate after this run
                  </button>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => setRuns((prev) => [...prev, makeDefaultRun(newRunId())])}
            className="mt-4 w-full border-2 border-dashed border-gray-200 text-gray-400 hover:border-fence-400 hover:text-fence-600 rounded-xl py-3 text-sm font-semibold transition-colors"
          >
            + Add Run
          </button>
          </>
          )}
        </div> {/* end runs card */}
        </>)} {/* end inputMode === "manual" */}
      </div> {/* end lg:col-span-3 left column */}

      {/* ── Right Column: Live Results ─────────────────────────────── */}
      <div className="lg:col-span-2 space-y-4">
        <EstimateSummaryCard
          result={result}
          estimateError={estimateError}
          projectName={projectName}
          markupPct={markupPct}
          totalLF={totalLF}
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
    </div>
  );
}
