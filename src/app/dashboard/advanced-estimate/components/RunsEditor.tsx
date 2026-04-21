"use client";
import type { RunInput } from "@/lib/fence-graph/engine";
import type {
  GateType,
  GateHingeType,
  GateLatchType,
  GateHardwareColor,
  GatePostInsert,
} from "@/lib/fence-graph/types";
import { HelpTooltip } from "@/components/Tooltip";
import type { UseRunsEditorReturn } from "../hooks/useRunsEditor";
import {
  SIMPLE_CORNERS_MAX,
  SLOPE_DEG_MIN,
  SLOPE_DEG_MAX,
  SLOPE_RACKED_MAX_DEG,
  GATE_WIDTH_MIN,
  GATE_WIDTH_MAX,
  DEFAULT_GATE_WIDTH_FT,
} from "../constants";

const START_END_TYPES = ["end", "corner", "gate"] as const;
const GATE_TYPES: GateType[] = ["single", "double"];

const GATE_HINGE_OPTIONS: { value: GateHingeType; label: string }[] = [
  { value: "standard", label: "Standard" },
  { value: "self_closing", label: "Self-closing" },
];
const GATE_LATCH_OPTIONS: { value: GateLatchType; label: string }[] = [
  { value: "standard", label: "Standard" },
  { value: "lokk_latch", label: "LokkLatch" },
  { value: "magnetic", label: "Magnetic" },
  { value: "slide_bolt", label: "Slide bolt" },
];
const HARDWARE_COLOR_OPTIONS: { value: GateHardwareColor; label: string }[] = [
  { value: "black", label: "Black" },
  { value: "bronze", label: "Bronze" },
  { value: "white", label: "White" },
];
const POST_INSERT_OPTIONS: { value: GatePostInsert; label: string }[] = [
  { value: "none", label: "None" },
  { value: "aluminum", label: "Aluminum" },
  { value: "steel", label: "Steel" },
];

const INPUT_CLASS = "w-full border border-border bg-surface-3 text-text rounded-lg px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-150";
const INPUT_CLASS_XS = "w-full border border-border bg-surface-3 text-text rounded-lg px-3 py-2 text-xs placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-150";
const LABEL_CLASS = "block text-xs font-medium text-muted mb-1";

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
    <div className="bg-surface-2 rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-text">Fence Measurements</h2>
          <p className="text-xs text-muted mt-0.5">
            {runsMode === "simple"
              ? "Enter total linear feet and number of corners"
              : "Add each straight segment between structural breaks"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted uppercase tracking-wider">Total</p>
          <p className="font-display text-lg font-bold text-text">{totalLF} LF</p>
        </div>
      </div>

      {/* Simple/Advanced Mode Toggle */}
      <div className="flex bg-surface-3 border border-border rounded-lg p-1 gap-1 mb-4">
        <button
          onClick={() => handleRunsModeChange("simple")}
          className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors duration-150 ${runsMode === "simple" ? "bg-accent text-white" : "text-muted hover:text-text"}`}
        >
          Simple Mode
        </button>
        <button
          onClick={() => handleRunsModeChange("advanced")}
          className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors duration-150 ${runsMode === "advanced" ? "bg-accent text-white" : "text-muted hover:text-text"}`}
        >
          Advanced (Run-by-Run)
        </button>
      </div>

      {/* Simple Mode UI */}
      {runsMode === "simple" && (
        <div className="space-y-3 mb-4">
          <div>
            <label className={`${LABEL_CLASS} flex items-center gap-1`}>
              Fence Shape
              <HelpTooltip content="Open: fence runs along an edge with two free ends (e.g. back property line). Closed: fence wraps all the way around an area (e.g. backyard enclosure)." />
            </label>
            <div className="flex bg-surface-3 border border-border rounded-lg p-1 gap-1">
              <button
                type="button"
                onClick={() => setSimpleShape("open")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors duration-150 ${simpleShape === "open" ? "bg-accent text-white" : "text-muted hover:text-text"}`}
              >
                Open (line / L-shape)
              </button>
              <button
                type="button"
                onClick={() => setSimpleShape("closed")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors duration-150 ${simpleShape === "closed" ? "bg-accent text-white" : "text-muted hover:text-text"}`}
              >
                Closed (enclosure)
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`${LABEL_CLASS} flex items-center gap-1`}>
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
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={`${LABEL_CLASS} flex items-center gap-1`}>
                Number of Corners
                <HelpTooltip content={simpleShape === "closed" ? "Count the 90-degree turns around the enclosure. A rectangle has 4 corners. Sections = corners." : "Count the 90-degree turns in the line. A straight fence has 0 corners (1 section). An L-shape has 1 corner (2 sections)."} />
              </label>
              <input
                type="number"
                min={0}
                max={SIMPLE_CORNERS_MAX}
                placeholder="2"
                value={simpleCorners || ""}
                onChange={(e) => {
                  const v = e.target.valueAsNumber;
                  setSimpleCorners(Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0);
                }}
                className={INPUT_CLASS}
              />
            </div>
          </div>
          {simpleTotalFeet > 0 && effectiveRuns.length > 0 && (
            <div className="bg-accent/10 border border-accent/20 rounded-lg p-3">
              <p className="text-xs font-semibold text-accent-light uppercase tracking-wider mb-1">Auto-Generated</p>
              <p className="text-xs text-accent-light/80">
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
                <div key={run.id} className="border border-border rounded-xl p-4 bg-surface-3">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-muted uppercase tracking-wider">Run {idx + 1}</span>
                    <button onClick={() => removeRun(run.id)} className="text-xs text-danger hover:text-danger/80 transition-colors duration-150">Remove</button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="col-span-2 sm:col-span-1">
                      <label className={LABEL_CLASS}>Linear Feet</label>
                      <input
                        type="number" min={0} placeholder="0"
                        value={run.linearFeet || ""}
                        onChange={(e) => {
                          const v = e.target.valueAsNumber;
                          updateRun(run.id, { linearFeet: Number.isFinite(v) ? Math.max(0, v) : 0 });
                        }}
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>Start</label>
                      <select
                        value={run.startType}
                        onChange={(e) => updateRun(run.id, { startType: e.target.value as RunInput["startType"] })}
                        className={INPUT_CLASS}
                      >
                        {START_END_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>End</label>
                      <select
                        value={run.endType}
                        onChange={(e) => updateRun(run.id, { endType: e.target.value as RunInput["endType"] })}
                        className={INPUT_CLASS}
                      >
                        {START_END_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>Slope (deg)</label>
                      <input
                        type="number" min={SLOPE_DEG_MIN} max={SLOPE_DEG_MAX} placeholder="0"
                        value={run.slopeDeg || ""}
                        onChange={(e) => {
                          const v = e.target.valueAsNumber;
                          updateRun(run.id, { slopeDeg: Number.isFinite(v) ? Math.max(SLOPE_DEG_MIN, Math.min(SLOPE_DEG_MAX, v)) : 0 });
                        }}
                        className={INPUT_CLASS}
                      />
                    </div>
                  </div>
                  {(run.slopeDeg ?? 0) > 0 && (
                    <p className="mt-2 text-xs text-warning">
                      {(run.slopeDeg ?? 0) <= SLOPE_RACKED_MAX_DEG ? "Racked panels (tilted to follow grade)" : "Stepped panels — level sections with gaps at each step"}
                    </p>
                  )}

                  {/* Gates for this run */}
                  {gatesForRun.map((gate) => (
                    <div key={gate.id} className="mt-3 border border-accent/20 bg-accent/5 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-accent-light uppercase tracking-wider">Gate after Run {idx + 1}</span>
                        <button onClick={() => removeGate(gate.id)} className="text-xs text-danger hover:text-danger/80 transition-colors duration-150">Remove</button>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className={LABEL_CLASS}>Type</label>
                          <select
                            value={gate.gateType}
                            onChange={(e) => updateGate(gate.id, { gateType: e.target.value as GateType })}
                            className={INPUT_CLASS_XS}
                          >
                            {GATE_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className={LABEL_CLASS}>Width (ft)</label>
                          <input
                            type="number" min={GATE_WIDTH_MIN} max={GATE_WIDTH_MAX}
                            value={gate.widthFt}
                            onChange={(e) => {
                              const v = e.target.valueAsNumber;
                              updateGate(gate.id, { widthFt: Number.isFinite(v) ? v : DEFAULT_GATE_WIDTH_FT });
                            }}
                            className={INPUT_CLASS_XS}
                          />
                        </div>
                        <div className="flex items-center gap-2 pt-5">
                          <input
                            type="checkbox" id={`pool_${gate.id}`}
                            checked={gate.isPoolGate}
                            onChange={(e) => updateGate(gate.id, { isPoolGate: e.target.checked })}
                            className="rounded accent-accent"
                          />
                          <label htmlFor={`pool_${gate.id}`} className="text-xs text-muted">Pool gate</label>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className={LABEL_CLASS}>Hinges</label>
                          <select
                            value={gate.hinges ?? ""}
                            onChange={(e) => updateGate(gate.id, { hinges: (e.target.value || undefined) as GateHingeType | undefined })}
                            className={INPUT_CLASS_XS}
                          >
                            <option value="">—</option>
                            {GATE_HINGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className={LABEL_CLASS}>Latch</label>
                          <select
                            value={gate.latch ?? ""}
                            onChange={(e) => updateGate(gate.id, { latch: (e.target.value || undefined) as GateLatchType | undefined })}
                            className={INPUT_CLASS_XS}
                          >
                            <option value="">—</option>
                            {GATE_LATCH_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className={LABEL_CLASS}>Color</label>
                          <select
                            value={gate.hardwareColor ?? ""}
                            onChange={(e) => updateGate(gate.id, { hardwareColor: (e.target.value || undefined) as GateHardwareColor | undefined })}
                            className={INPUT_CLASS_XS}
                          >
                            <option value="">—</option>
                            {HARDWARE_COLOR_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className={LABEL_CLASS}>Post insert</label>
                          <select
                            value={gate.postInsert ?? ""}
                            onChange={(e) => updateGate(gate.id, { postInsert: (e.target.value || undefined) as GatePostInsert | undefined })}
                            className={INPUT_CLASS_XS}
                          >
                            <option value="">—</option>
                            {POST_INSERT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => addGate(run.id)}
                    className="mt-3 text-xs text-accent-light hover:text-accent font-medium transition-colors duration-150"
                  >
                    + Add gate after this run
                  </button>
                </div>
              );
            })}
          </div>

          <button
            onClick={addRun}
            className="mt-4 w-full border-2 border-dashed border-border text-muted hover:border-accent/60 hover:text-accent-light hover:bg-accent/5 rounded-xl py-3 text-sm font-semibold transition-colors duration-150"
          >
            + Add Run
          </button>
        </>
      )}
    </div>
  );
}
