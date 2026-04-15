"use client";
import { useCallback, useMemo, useRef, useState } from "react";
import type { RunInput, GateInput } from "@/lib/fence-graph/engine";

export type RunsMode = "simple" | "advanced";
export type SimpleShape = "open" | "closed";

function makeDefaultRun(id: string): RunInput {
  return {
    id,
    linearFeet: 0,
    startType: "end",
    endType: "end",
    slopeDeg: 0,
  };
}

function computeSimpleSections(
  totalFeet: number,
  cornersRaw: number,
  shape: SimpleShape,
  idPrefix: "simple" | "run",
  nextRunId?: () => string,
): RunInput[] {
  if (totalFeet <= 0) return [];
  const corners = Math.max(0, Math.floor(cornersRaw));
  const numSections = shape === "closed" ? Math.max(1, corners) : corners + 1;
  const feetPerSection = totalFeet / numSections;
  const out: RunInput[] = [];
  for (let i = 0; i < numSections; i++) {
    const isFirst = i === 0;
    const isLast = i === numSections - 1;
    out.push({
      id: idPrefix === "simple" ? `simple_${i}` : (nextRunId ? nextRunId() : `run_${i}`),
      linearFeet: Math.round(feetPerSection),
      startType: shape === "closed" ? "corner" : (isFirst ? "end" : "corner"),
      endType: shape === "closed" ? "corner" : (isLast ? "end" : "corner"),
      slopeDeg: 0,
    });
  }
  return out;
}

export interface UseRunsEditorReturn {
  // Raw state
  runs: RunInput[];
  setRuns: React.Dispatch<React.SetStateAction<RunInput[]>>;
  gates: GateInput[];
  setGates: React.Dispatch<React.SetStateAction<GateInput[]>>;
  runsMode: RunsMode;
  simpleTotalFeet: number;
  simpleCorners: number;
  simpleShape: SimpleShape;

  // Simple mode setters
  setSimpleTotalFeet: (v: number) => void;
  setSimpleCorners: (v: number) => void;
  setSimpleShape: (v: SimpleShape) => void;

  // Derived
  effectiveRuns: RunInput[];
  totalLF: number;

  // Mode switching (seeds advanced from simple if advanced is empty)
  handleRunsModeChange: (mode: RunsMode) => void;

  // Run / gate mutators
  addRun: () => void;
  updateRun: (id: string, patch: Partial<RunInput>) => void;
  removeRun: (id: string) => void;
  addGate: (afterRunId: string) => void;
  updateGate: (id: string, patch: Partial<GateInput>) => void;
  removeGate: (id: string) => void;

  // Escape hatches for consumers that need to seed state (e.g. AI apply)
  newRunId: () => string;
  makeDefaultRun: (id: string) => RunInput;
}

// Owns all runs/gates/simple-mode state for the advanced estimator.
// Exposes derived effectiveRuns and totalLF plus mutators. Keeping this
// in one hook means the id counters, the Simple→Advanced seed logic,
// and the mutators all close over the same setRuns/setGates without
// having to drill them through props.
export function useRunsEditor(): UseRunsEditorReturn {
  const runIdCtrRef = useRef(0);
  const gateIdCtrRef = useRef(0);
  const newRunId = useCallback(() => `run_${++runIdCtrRef.current}`, []);
  const newGateId = useCallback(() => `gate_${++gateIdCtrRef.current}`, []);

  const [runs, setRuns] = useState<RunInput[]>(() => [makeDefaultRun(`run_${++runIdCtrRef.current}`)]);
  const [gates, setGates] = useState<GateInput[]>([]);
  const [runsMode, setRunsMode] = useState<RunsMode>("simple");
  const [simpleTotalFeet, setSimpleTotalFeet] = useState(0);
  const [simpleCorners, setSimpleCorners] = useState(0);
  const [simpleShape, setSimpleShape] = useState<SimpleShape>("open");

  const effectiveRuns = useMemo<RunInput[]>(() => {
    if (runsMode !== "simple") return runs;
    return computeSimpleSections(simpleTotalFeet, simpleCorners, simpleShape, "simple");
  }, [runsMode, simpleTotalFeet, simpleCorners, simpleShape, runs]);

  const totalLF = useMemo(
    () => effectiveRuns.reduce((s, r) => s + (r.linearFeet || 0), 0),
    [effectiveRuns],
  );

  // Seed advanced state from simple state on first switch so users don't
  // lose measurements when they move from Simple to refine section-by-section.
  const handleRunsModeChange = useCallback((mode: RunsMode) => {
    if (mode === "advanced" && runsMode === "simple") {
      const isDefaultAdvanced = runs.length <= 1 && (runs[0]?.linearFeet ?? 0) === 0;
      if (isDefaultAdvanced && simpleTotalFeet > 0) {
        const seeded = computeSimpleSections(
          simpleTotalFeet, simpleCorners, simpleShape, "run", newRunId,
        );
        setRuns(seeded);
      }
    }
    setRunsMode(mode);
  }, [runsMode, runs, simpleTotalFeet, simpleCorners, simpleShape, newRunId]);

  const addRun = useCallback(() => {
    setRuns((prev) => [...prev, makeDefaultRun(newRunId())]);
  }, [newRunId]);

  const updateRun = useCallback((id: string, patch: Partial<RunInput>) => {
    setRuns((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const removeRun = useCallback((id: string) => {
    setRuns((prev) => prev.filter((r) => r.id !== id));
    setGates((prev) => prev.filter((g) => g.afterRunId !== id));
  }, []);

  const addGate = useCallback((afterRunId: string) => {
    setGates((prev) => [...prev, {
      id: newGateId(),
      afterRunId,
      gateType: "single",
      widthFt: 4,
      isPoolGate: false,
    }]);
  }, [newGateId]);

  const updateGate = useCallback((id: string, patch: Partial<GateInput>) => {
    setGates((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }, []);

  const removeGate = useCallback((id: string) => {
    setGates((prev) => prev.filter((g) => g.id !== id));
  }, []);

  return {
    runs, setRuns, gates, setGates,
    runsMode, simpleTotalFeet, simpleCorners, simpleShape,
    setSimpleTotalFeet, setSimpleCorners, setSimpleShape,
    effectiveRuns, totalLF,
    handleRunsModeChange,
    addRun, updateRun, removeRun, addGate, updateGate, removeGate,
    newRunId, makeDefaultRun,
  };
}
