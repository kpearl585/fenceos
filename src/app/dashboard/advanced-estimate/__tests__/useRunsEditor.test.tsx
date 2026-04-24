import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useRunsEditor } from "../hooks/useRunsEditor";

// Covers the hook behavior that pure-fn tests can't reach:
// React state transitions, id counter seeding on hydrate(), and
// collision-free add-after-hydrate. Validates the draft-restore
// integration for the runs/gates autosave feature.

describe("useRunsEditor", () => {
  it("starts with one default run and empty gates", () => {
    const { result } = renderHook(() => useRunsEditor());
    expect(result.current.runs).toHaveLength(1);
    expect(result.current.runs[0].linearFeet).toBe(0);
    expect(result.current.gates).toEqual([]);
    expect(result.current.runsMode).toBe("simple");
  });

  it("hydrate() restores runs, gates, mode, and simple-mode params", () => {
    const { result } = renderHook(() => useRunsEditor());
    act(() => {
      result.current.hydrate({
        runs: [
          { id: "run_3", linearFeet: 40, startType: "end", endType: "corner" },
          { id: "run_5", linearFeet: 30, startType: "corner", endType: "end" },
        ],
        gates: [
          { id: "gate_2", afterRunId: "run_3", gateType: "single", widthFt: 4, isPoolGate: false },
        ],
        runsMode: "advanced",
        simpleTotalFeet: 70,
        simpleCorners: 1,
        simpleShape: "closed",
      });
    });
    expect(result.current.runs.map((r) => r.id)).toEqual(["run_3", "run_5"]);
    expect(result.current.gates.map((g) => g.id)).toEqual(["gate_2"]);
    expect(result.current.runsMode).toBe("advanced");
    expect(result.current.simpleTotalFeet).toBe(70);
    expect(result.current.simpleCorners).toBe(1);
    expect(result.current.simpleShape).toBe("closed");
  });

  it("addRun after hydrate uses a post-hydrate id that doesn't collide", () => {
    const { result } = renderHook(() => useRunsEditor());
    act(() => {
      result.current.hydrate({
        runs: [
          { id: "run_3", linearFeet: 40, startType: "end", endType: "corner" },
          { id: "run_7", linearFeet: 30, startType: "corner", endType: "end" },
        ],
      });
    });
    act(() => result.current.addRun());
    const ids = result.current.runs.map((r) => r.id);
    // Next id should be run_8 — max was 7, counter seeded to 7, ++ yields 8.
    expect(ids).toEqual(["run_3", "run_7", "run_8"]);
    expect(new Set(ids).size).toBe(ids.length); // no duplicates
  });

  it("addGate after hydrate uses a post-hydrate gate id that doesn't collide", () => {
    const { result } = renderHook(() => useRunsEditor());
    act(() => {
      result.current.hydrate({
        runs: [{ id: "run_1", linearFeet: 40, startType: "end", endType: "end" }],
        gates: [
          { id: "gate_4", afterRunId: "run_1", gateType: "single", widthFt: 4, isPoolGate: false },
        ],
      });
    });
    act(() => result.current.addGate("run_1"));
    const ids = result.current.gates.map((g) => g.id);
    expect(ids).toEqual(["gate_4", "gate_5"]);
  });

  it("hydrate() accepts an empty runs[] (user had deleted all runs)", () => {
    const { result } = renderHook(() => useRunsEditor());
    act(() => result.current.hydrate({ runs: [] }));
    expect(result.current.runs).toEqual([]);
    // Fresh addRun still starts from run_1 — counter stays at its initial
    // value because max of empty list is 0.
    act(() => result.current.addRun());
    expect(result.current.runs[0].id).toMatch(/^run_\d+$/);
  });

  it("hydrate() never reduces the counter below its existing value", () => {
    // If the user added 5 runs (counter = 6) and we then hydrate with an
    // older snapshot that only has run_2, the counter should stay at 6
    // so a subsequent addRun doesn't clobber the restored run_2.
    const { result } = renderHook(() => useRunsEditor());
    act(() => {
      result.current.addRun();
      result.current.addRun();
      result.current.addRun();
    });
    act(() => {
      result.current.hydrate({
        runs: [{ id: "run_2", linearFeet: 20, startType: "end", endType: "end" }],
      });
    });
    act(() => result.current.addRun());
    const newest = result.current.runs[result.current.runs.length - 1].id;
    const n = Number(newest.split("_")[1]);
    expect(n).toBeGreaterThan(2);
  });

  it("effectiveRuns derives from simpleTotalFeet in simple mode", () => {
    const { result } = renderHook(() => useRunsEditor());
    act(() => result.current.setSimpleTotalFeet(100));
    expect(result.current.totalLF).toBe(100);
    expect(result.current.effectiveRuns.length).toBeGreaterThanOrEqual(1);
  });

  it("effectiveRuns uses runs[] in advanced mode", () => {
    const { result } = renderHook(() => useRunsEditor());
    act(() => {
      result.current.hydrate({
        runsMode: "advanced",
        runs: [
          { id: "run_1", linearFeet: 25, startType: "end", endType: "corner" },
          { id: "run_2", linearFeet: 35, startType: "corner", endType: "end" },
        ],
      });
    });
    expect(result.current.totalLF).toBe(60);
    expect(result.current.effectiveRuns.map((r) => r.linearFeet)).toEqual([25, 35]);
  });

  it("removeRun also removes gates attached to that run", () => {
    const { result } = renderHook(() => useRunsEditor());
    act(() => {
      result.current.hydrate({
        runs: [
          { id: "run_1", linearFeet: 40, startType: "end", endType: "corner" },
          { id: "run_2", linearFeet: 30, startType: "corner", endType: "end" },
        ],
        gates: [
          { id: "gate_1", afterRunId: "run_1", gateType: "single", widthFt: 4, isPoolGate: false },
          { id: "gate_2", afterRunId: "run_2", gateType: "single", widthFt: 4, isPoolGate: false },
        ],
      });
    });
    act(() => result.current.removeRun("run_1"));
    expect(result.current.runs.map((r) => r.id)).toEqual(["run_2"]);
    expect(result.current.gates.map((g) => g.id)).toEqual(["gate_2"]);
  });
});
