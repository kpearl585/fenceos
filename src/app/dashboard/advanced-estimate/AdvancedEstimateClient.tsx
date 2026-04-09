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
} from "@/lib/fence-graph/engine";
import { saveAdvancedEstimate, generateAdvancedEstimatePdf, generateCustomerProposalPdf } from "./actions";
import { createEstimateFromFenceGraph } from "./convertActions";
import { downloadInternalBom, downloadSupplierPO } from "@/lib/fence-graph/exportBomExcel";
import type { SoilType, PanelHeight, PostSize, GateType } from "@/lib/fence-graph/types";
import AiInputTab, { type AiAppliedState } from "./AiInputTab";

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

export default function AdvancedEstimateClient({ priceMap = {}, defaultWastePct = 5, aiAvailable = true }: { priceMap?: Record<string, number>; defaultWastePct?: number; aiAvailable?: boolean }) {
  const [fenceType, setFenceType] = useState<FenceType>("vinyl");
  const [woodStyle, setWoodStyle] = useState<WoodStyle>("dog_ear_privacy");
  const [productLineId, setProductLineId] = useState("vinyl_privacy_6ft");
  const [soilType, setSoilType] = useState<SoilType>("sandy_loam");
  const [windMode, setWindMode] = useState(false);
  const [laborRate, setLaborRate] = useState(65);
  const [wastePct, setWastePct] = useState(defaultWastePct);
  const [runs, setRuns] = useState<RunInput[]>([defaultRun()]);
  const [gates, setGates] = useState<GateInput[]>([]);
  const [activeTab, setActiveTab] = useState<"bom" | "labor" | "audit">("bom");
  const [inputMode, setInputMode] = useState<"manual" | "ai">("manual");
  const [projectName, setProjectName] = useState("New Estimate");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [markupPct, setMarkupPct] = useState(35);
  const [customer, setCustomer] = useState({ name: "", address: "", city: "", phone: "", email: "" });
  const [proposalStatus, setProposalStatus] = useState<"idle" | "generating" | "error">("idle");
  const [pdfStatus, setPdfStatus] = useState<"idle" | "generating" | "error">("idle");
  const [isPending, startTransition] = useTransition();
  const [convertStatus, setConvertStatus] = useState<"idle" | "converting" | "done" | "error">("idle");
  const [convertError, setConvertError] = useState<string | null>(null);

  const productLine = PRODUCT_LINES[productLineId];
  const postSize = productLine?.postSize ?? "5x5";
  const fenceHeight = Math.round(productLine?.panelHeight_in / 12) as PanelHeight;

  const input: FenceProjectInput = {
    projectName: "Advanced Estimate",
    productLineId,
    fenceHeight,
    postSize,
    soilType,
    windMode,
    runs: runs.filter((r) => r.linearFeet > 0),
    gates,
  };

  const result: FenceEstimateResult | null = useMemo(() => {
    if (input.runs.length === 0) return null;
    try {
      return estimateFence(input, { fenceType, woodStyle, laborRatePerHr: laborRate, wastePct: wastePct / 100, priceMap });
    } catch {
      return null;
    }
  }, [input, productLineId, fenceType, woodStyle, soilType, windMode, laborRate, wastePct, runs, gates, priceMap]);

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

  async function handleProposalDownload() {
    if (!result) return;
    setProposalStatus("generating");
    const res = await generateCustomerProposalPdf(
      input, laborRate, wastePct, markupPct, projectName, fenceType, customer
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
    } else {
      setProposalStatus("error");
      setTimeout(() => setProposalStatus("idle"), 3000);
    }
  }

  async function handleConvertToEstimate() {
    if (!result) return;
    if (!customer.name.trim()) {
      setConvertError("Enter a customer name above before creating an estimate.");
      return;
    }
    setConvertStatus("converting");
    setConvertError(null);
    const res = await createEstimateFromFenceGraph({
      result,
      projectName,
      laborRate,
      markupPct,
      totalLF,
      fenceType,
      customer,
    });
    if (res.success && res.estimateId) {
      setConvertStatus("done");
      window.location.href = `/dashboard/estimates/${res.estimateId}`;
    } else {
      setConvertStatus("error");
      setConvertError(res.error ?? "Conversion failed");
      setTimeout(() => setConvertStatus("idle"), 4000);
    }
  }

  async function handleSave() {
    if (!result) return;
    setSaveStatus("saving");
    const res = await saveAdvancedEstimate(input, { ...result, projectName, bidPrice } as typeof result & { bidPrice: number }, projectName, laborRate, wastePct / 100);
    setSaveStatus(res.success ? "saved" : "error");
    setTimeout(() => setSaveStatus("idle"), 3000);
  }

  async function handlePdfDownload() {
    if (!result) return;
    setPdfStatus("generating");
    const res = await generateAdvancedEstimatePdf(input, laborRate, wastePct, projectName);
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
    } else {
      setPdfStatus("error");
      setTimeout(() => setPdfStatus("idle"), 3000);
    }
  }

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

        {/* AI Input Tab */}
        {inputMode === "ai" && (
          <AiInputTab onApply={(state: AiAppliedState) => {
            setFenceType(state.fenceType);
            setProductLineId(state.productLineId);
            setSoilType(state.soilType);
            setWindMode(state.windMode);
            setRuns(state.runs.length > 0 ? state.runs : [defaultRun()]);
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
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Soil Type</label>
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
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Labor Rate ($/hr)</label>
              <input
                type="number" min={20} max={200} value={laborRate}
                onChange={(e) => setLaborRate(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fence-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Waste Factor (%)</label>
              <input
                type="number" min={1} max={20} value={wastePct}
                onChange={(e) => setWastePct(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fence-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Markup Over Cost (%)</label>
              <input
                type="number" min={0} max={200} value={markupPct}
                onChange={(e) => setMarkupPct(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fence-400"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
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
        </div>

        {/* Runs */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-fence-900">Fence Runs</h2>
              <p className="text-xs text-gray-400 mt-0.5">Add each straight segment between structural breaks (corners, gates, ends)</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Total</p>
              <p className="text-lg font-bold text-fence-900">{totalLF} LF</p>
            </div>
          </div>

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
            onClick={() => setRuns((prev) => [...prev, defaultRun()])}
            className="mt-4 w-full border-2 border-dashed border-gray-200 text-gray-400 hover:border-fence-400 hover:text-fence-600 rounded-xl py-3 text-sm font-semibold transition-colors"
          >
            + Add Run
          </button>
        </div> {/* end runs card */}
        {/* Customer Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-fence-900 mb-1">Customer Info</h2>
          <p className="text-xs text-gray-400 mb-4">Optional — populates the customer proposal PDF</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Customer Name</label>
              <input type="text" placeholder="Jane Smith"
                value={customer.name} onChange={e => setCustomer(c => ({ ...c, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fence-400" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Street Address</label>
              <input type="text" placeholder="123 Main St"
                value={customer.address} onChange={e => setCustomer(c => ({ ...c, address: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fence-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">City, State, Zip</label>
              <input type="text" placeholder="Orlando, FL 32801"
                value={customer.city} onChange={e => setCustomer(c => ({ ...c, city: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fence-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
              <input type="text" placeholder="(555) 000-0000"
                value={customer.phone} onChange={e => setCustomer(c => ({ ...c, phone: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fence-400" />
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
            <div className="bg-fence-950 rounded-xl p-5 text-white">
              <p className="text-fence-400 text-xs font-semibold uppercase tracking-widest mb-3">Estimate Summary</p>
              {/* Cost breakdown */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <p className="text-fence-400 text-xs">Materials Cost</p>
                  <p className="text-xl font-bold">{fmt(result.totalMaterialCost)}</p>
                </div>
                <div>
                  <p className="text-fence-400 text-xs">Labor ({result.totalLaborHrs}h)</p>
                  <p className="text-xl font-bold">{fmt(result.totalLaborCost)}</p>
                </div>
              </div>
              <div className="border-t border-fence-800 pt-3 mb-3 flex justify-between items-center">
                <p className="text-fence-400 text-sm">Total Cost</p>
                <p className="text-xl font-semibold text-fence-200">{fmt(result.totalCost)}</p>
              </div>
              {/* Bid price */}
              {result.totalCost > 0 && (() => {
                const bidPrice = Math.round(result.totalCost * (1 + markupPct / 100));
                const grossProfit = bidPrice - result.totalCost;
                const grossMargin = Math.round((grossProfit / bidPrice) * 100);
                const pricePerLF = totalLF > 0 ? Math.round(bidPrice / totalLF) : 0;
                return (
                  <div className="bg-fence-800 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-fence-300 text-xs font-semibold uppercase tracking-wide">Bid Price ({markupPct}% markup)</p>
                      <p className="text-2xl font-bold text-white">{fmt(bidPrice)}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-fence-500 text-xs">Gross Profit</p>
                        <p className="text-sm font-bold text-green-400">{fmt(grossProfit)}</p>
                      </div>
                      <div>
                        <p className="text-fence-500 text-xs">Gross Margin</p>
                        <p className="text-sm font-bold text-green-400">{grossMargin}%</p>
                      </div>
                      <div>
                        <p className="text-fence-500 text-xs">Per LF</p>
                        <p className="text-sm font-bold text-fence-200">{fmt(pricePerLF)}/LF</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
              <div className="mt-3 flex justify-between text-xs text-fence-500">
                <span>Confidence: {Math.round(result.overallConfidence * 100)}%</span>
                <span>{totalLF} LF · {result.bom.length} line items</span>
                {result.redFlagItems.length > 0 && (
                  <span className="text-amber-400">{result.redFlagItems.length} unpriced</span>
                )}
              </div>
              <div className="mt-4 space-y-2">
                {/* PRIMARY CTA — Convert to sendable estimate */}
                <button
                  onClick={handleConvertToEstimate}
                  disabled={convertStatus === "converting" || convertStatus === "done"}
                  className="w-full py-3 rounded-lg text-sm font-bold bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-60 shadow-sm"
                >
                  {convertStatus === "converting" ? "Creating Estimate..." :
                   convertStatus === "done" ? "Redirecting..." :
                   "Create Estimate & Send to Customer"}
                </button>
                {convertError && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">{convertError}</p>
                )}
                {convertStatus === "idle" && (
                  <p className="text-xs text-fence-500 text-center">Requires customer name in Customer Info above</p>
                )}
                <button
                  onClick={handleSave}
                  disabled={saveStatus === "saving"}
                  className="w-full py-2 rounded-lg text-xs font-semibold bg-fence-700 hover:bg-fence-600 text-white transition-colors disabled:opacity-60"
                >
                  {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : saveStatus === "error" ? "Error" : "Save Draft"}
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handlePdfDownload}
                    disabled={pdfStatus === "generating"}
                    title="Internal BOM with costs, margins, and audit trail"
                    className="py-2 rounded-lg text-xs font-semibold bg-fence-800 hover:bg-fence-700 text-fence-100 transition-colors disabled:opacity-60"
                  >
                    {pdfStatus === "generating" ? "Generating..." : "Internal BOM"}
                  </button>
                  <button
                    onClick={handleProposalDownload}
                    disabled={proposalStatus === "generating"}
                    title="Clean customer-facing proposal — no cost exposure"
                    className="py-2 rounded-lg text-xs font-semibold bg-white text-fence-900 border border-fence-200 hover:bg-fence-50 transition-colors disabled:opacity-60"
                  >
                    {proposalStatus === "generating" ? "Generating..." : proposalStatus === "error" ? "Failed" : "Customer Proposal"}
                  </button>
                </div>
                <p className="text-xs text-fence-600 text-center">Internal BOM shows costs · Proposal shows bid price only</p>
                {/* Excel exports */}
                <div className="border-t border-fence-800 pt-2 mt-1">
                  <p className="text-xs text-fence-500 text-center mb-2">Excel / Spreadsheet</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => result && downloadInternalBom(result, projectName, markupPct, totalLF)}
                      title="Full BOM with costs, margins, labor — internal use only"
                      className="py-2 rounded-lg text-xs font-semibold bg-fence-800 hover:bg-fence-700 text-fence-100 border border-fence-700 transition-colors"
                    >
                      Internal BOM (.xlsx)
                    </button>
                    <button
                      onClick={() => result && downloadSupplierPO(result, projectName, totalLF, undefined, customer.address ? `${customer.address}, ${customer.city}` : undefined)}
                      title="Clean purchase order for your supplier — no costs shown"
                      className="py-2 rounded-lg text-xs font-semibold bg-white text-fence-900 border border-fence-200 hover:bg-fence-50 transition-colors"
                    >
                      Supplier PO (.xlsx)
                    </button>
                  </div>
                  <p className="text-xs text-fence-500 text-center mt-1">Internal shows margins · Supplier PO shows quantities only</p>
                </div>
              </div>
            </div>

            {/* Scrap summary */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Waste Analysis</p>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Deterministic scrap</span>
                <span className="font-semibold text-gray-800">{(result.deterministicScrap_in / 12).toFixed(1)} LF</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-600">Probabilistic waste</span>
                <span className="font-semibold text-gray-800">{result.probabilisticWastePct * 100}%</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex border-b border-gray-100">
                {(["bom", "labor", "audit"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 text-xs font-semibold py-2.5 uppercase tracking-wide transition-colors ${activeTab === tab ? "bg-fence-50 text-fence-700 border-b-2 border-fence-600" : "text-gray-400 hover:text-gray-600"}`}
                  >
                    {tab === "bom" ? "BOM" : tab === "labor" ? "Labor" : "Audit"}
                  </button>
                ))}
              </div>

              {activeTab === "bom" && (
                <div className="divide-y divide-gray-50">
                  {/* Header */}
                  <div className="px-4 py-2 bg-gray-50 grid grid-cols-12 gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    <span className="col-span-5">Material</span>
                    <span className="col-span-2 text-right">Qty</span>
                    <span className="col-span-2 text-right">Unit $</span>
                    <span className="col-span-3 text-right">Ext. Cost</span>
                  </div>
                  {result.bom.map((item, i) => (
                    <div key={i} className="px-4 py-2.5 hover:bg-gray-50 grid grid-cols-12 gap-1 items-center">
                      <div className="col-span-5 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                        <p className="text-xs text-gray-400 truncate">{item.traceability}</p>
                      </div>
                      <p className="col-span-2 text-sm font-bold text-gray-900 text-right">{item.qty} <span className="text-xs text-gray-400 font-normal">{item.unit}</span></p>
                      <p className="col-span-2 text-xs text-gray-500 text-right">
                        {item.unitCost != null ? fmt(item.unitCost) : <span className="text-amber-400">—</span>}
                      </p>
                      <p className="col-span-3 text-sm font-semibold text-right">
                        {item.extCost != null && item.extCost > 0
                          ? <span className="text-gray-900">{fmt(item.extCost)}</span>
                          : <span className="text-amber-400 text-xs">No price</span>}
                      </p>
                    </div>
                  ))}
                  {/* BOM subtotal */}
                  <div className="px-4 py-3 bg-gray-50 flex justify-between items-center">
                    <p className="text-sm font-bold text-gray-700">Materials Total</p>
                    <p className="text-sm font-bold text-fence-700">{fmt(result.totalMaterialCost)}</p>
                  </div>
                </div>
              )}

              {activeTab === "labor" && (
                <div className="divide-y divide-gray-50">
                  {result.laborDrivers.filter(l => l.count > 0).map((l, i) => (
                    <div key={i} className="px-4 py-2.5 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{l.activity}</p>
                        <p className="text-xs text-gray-400">{l.count} units × {l.rateHrs}h each</p>
                      </div>
                      <p className="text-sm font-bold text-gray-900">{l.totalHrs.toFixed(1)}h</p>
                    </div>
                  ))}
                  <div className="px-4 py-3 bg-gray-50 flex justify-between">
                    <p className="text-sm font-bold text-gray-700">Total Labor</p>
                    <p className="text-sm font-bold text-fence-700">{result.totalLaborHrs}h · {fmt(result.totalLaborCost)}</p>
                  </div>
                </div>
              )}

              {activeTab === "audit" && (
                <div className="px-4 py-3">
                  <ul className="space-y-1.5">
                    {result.auditTrail.map((line, i) => (
                      <li key={i} className="text-xs text-gray-500 font-mono leading-relaxed">{line}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-400 text-sm">Add at least one run with a length to generate an estimate.</p>
          </div>
        )}
      </div>
    </div>
  );
}
