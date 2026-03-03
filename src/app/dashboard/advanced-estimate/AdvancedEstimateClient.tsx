"use client";
import { useState, useMemo, useTransition } from "react";
import {
  estimateFence,
  PRODUCT_LINES,
  type FenceProjectInput,
  type RunInput,
  type GateInput,
  type FenceEstimateResult,
} from "@/lib/fence-graph/engine";
import { saveAdvancedEstimate, generateAdvancedEstimatePdf } from "./actions";
import type { SoilType, PanelHeight, PostSize, GateType } from "@/lib/fence-graph/types";

const SOIL_LABELS: Record<SoilType, string> = {
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

export default function AdvancedEstimateClient() {
  const [productLineId, setProductLineId] = useState("classic_privacy_6ft");
  const [soilType, setSoilType] = useState<SoilType>("sandy_loam");
  const [windMode, setWindMode] = useState(false);
  const [laborRate, setLaborRate] = useState(65);
  const [wastePct, setWastePct] = useState(5);
  const [runs, setRuns] = useState<RunInput[]>([defaultRun()]);
  const [gates, setGates] = useState<GateInput[]>([]);
  const [activeTab, setActiveTab] = useState<"bom" | "labor" | "audit">("bom");
  const [projectName, setProjectName] = useState("New Estimate");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [pdfStatus, setPdfStatus] = useState<"idle" | "generating" | "error">("idle");
  const [isPending, startTransition] = useTransition();

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
      return estimateFence(input, laborRate, wastePct / 100);
    } catch {
      return null;
    }
  }, [productLineId, soilType, windMode, laborRate, wastePct, runs, gates]);

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

  async function handleSave() {
    if (!result) return;
    setSaveStatus("saving");
    const res = await saveAdvancedEstimate(input, result, projectName, laborRate, wastePct / 100);
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
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Product Line</label>
              <select
                value={productLineId}
                onChange={(e) => setProductLineId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fence-400"
              >
                {Object.entries(PRODUCT_LINES).map(([id, pl]) => (
                  <option key={id} value={id}>{pl.name}</option>
                ))}
              </select>
            </div>
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
        </div>
      </div>

      {/* ── Right Column: Live Results ─────────────────────────────── */}
      <div className="lg:col-span-2 space-y-4">

        {/* Summary card */}
        {result ? (
          <>
            <div className="bg-fence-950 rounded-xl p-5 text-white">
              <p className="text-fence-400 text-xs font-semibold uppercase tracking-widest mb-3">Estimate Summary</p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-fence-400 text-xs">Materials</p>
                  <p className="text-2xl font-bold">{fmt(result.totalMaterialCost)}</p>
                </div>
                <div>
                  <p className="text-fence-400 text-xs">Labor ({result.totalLaborHrs}h)</p>
                  <p className="text-2xl font-bold">{fmt(result.totalLaborCost)}</p>
                </div>
              </div>
              <div className="border-t border-fence-800 pt-3 flex justify-between items-center">
                <p className="text-fence-300 text-sm font-semibold">Total Cost</p>
                <p className="text-3xl font-bold text-white">{fmt(result.totalCost)}</p>
              </div>
              <div className="mt-3 flex justify-between text-xs text-fence-500">
                <span>Confidence: {Math.round(result.overallConfidence * 100)}%</span>
                <span>{totalLF} LF · {result.bom.length} materials</span>
                {result.redFlagItems.length > 0 && (
                  <span className="text-amber-400">{result.redFlagItems.length} red flags</span>
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={handleSave}
                  disabled={saveStatus === "saving"}
                  className="py-2 rounded-lg text-xs font-semibold bg-fence-700 hover:bg-fence-600 text-white transition-colors disabled:opacity-60"
                >
                  {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : saveStatus === "error" ? "Error" : "Save Estimate"}
                </button>
                <button
                  onClick={handlePdfDownload}
                  disabled={pdfStatus === "generating"}
                  className="py-2 rounded-lg text-xs font-semibold bg-white text-fence-900 hover:bg-fence-50 transition-colors disabled:opacity-60"
                >
                  {pdfStatus === "generating" ? "Generating..." : pdfStatus === "error" ? "Failed" : "Export PDF"}
                </button>
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
                  {result.bom.map((item, i) => (
                    <div key={i} className="px-4 py-2.5 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                          <p className="text-xs text-gray-400 truncate">{item.traceability}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-gray-900">{item.qty} {item.unit}</p>
                          {item.confidence < 0.8 && (
                            <span className="text-xs text-amber-500">Low confidence</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
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
