"use client";
import type { RunInput } from "@/lib/fence-graph/engine";
import type { GateType } from "@/lib/fence-graph/types";
import { HelpTooltip } from "@/components/Tooltip";
import type { UseRunsEditorReturn } from "../hooks/useRunsEditor";

const START_END_TYPES = ["end", "corner", "gate"] as const;
const GATE_TYPES: GateType[] = ["single", "double"];

interface RunsEditorProps {
  editor: UseRunsEditorReturn;
}

export default function RunsEditor({ editor }: RunsEditorProps) {
  const {
    runs, gates, runsMode, effectiveRuns, totalLF,
    simpleTotalFeet, simpleCorners, simpleShape,
    setSimpleTotalFeet, setSimpleCorners, setSimpleShape,
    handleRunsModeChange,
    addRun, updateRun, removeRun, addGate, updateGate, removeGate,
  } = editor;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-fence-900">Fence Measurements</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {runsMode === "simple"
              ? "Enter total linear feet and number of corners"
              : "Add each straight segment between structural breaks"}
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
                        onChange={(e) => {
                          const v = e.target.valueAsNumber;
                          updateRun(run.id, { linearFeet: Number.isFinite(v) ? Math.max(0, v) : 0 });
                        }}
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
                        onChange={(e) => {
                          const v = e.target.valueAsNumber;
                          updateRun(run.id, { slopeDeg: Number.isFinite(v) ? Math.max(0, Math.min(45, v)) : 0 });
                        }}
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
                            onChange={(e) => {
                              const v = e.target.valueAsNumber;
                              updateGate(gate.id, { widthFt: Number.isFinite(v) ? v : 4 });
                            }}
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
            onClick={addRun}
            className="mt-4 w-full border-2 border-dashed border-gray-200 text-gray-400 hover:border-fence-400 hover:text-fence-600 rounded-xl py-3 text-sm font-semibold transition-colors"
          >
            + Add Run
          </button>
        </>
      )}
    </div>
  );
}
