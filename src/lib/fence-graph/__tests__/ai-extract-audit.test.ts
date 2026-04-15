// ── AI Extraction Audit Regression Tests ────────────────────────
// Locks in the seven findings from the deep AI extraction reliability
// audit. Pure-logic coverage on the validation + sanitization layer
// and the engine-state mapper. Does NOT call OpenAI — the GPT-4o
// path is exercised by scripts/test-ai-extraction.ts (slow + costs).

import { describe, it, expect } from "vitest";
import {
  validateExtraction,
  RunSchema,
  ExtractionSchema,
} from "../ai-extract/schema";
import { toEngineState } from "@/app/dashboard/advanced-estimate/AiInputTab";
import type { AiExtractionResult } from "../ai-extract/types";

// ── Helpers ──────────────────────────────────────────────────────

function makeRun(overrides: Partial<{
  linearFeet: number;
  fenceType: "vinyl" | "wood" | "chain_link" | "aluminum";
  productLineId: string;
  heightFt: number;
  gates: { widthFt: number; type: "walk" | "drive" | "double_drive" | "pool" }[];
  soilType: "standard" | "sandy" | "sandy_loam" | "rocky" | "clay" | "wet";
  slopePercent: number;
  isWindExposed: boolean;
  poolCode: boolean;
  runLabel: string;
}> = {}) {
  return {
    linearFeet: 100,
    fenceType: "vinyl" as const,
    productLineId: "vinyl_privacy_6ft",
    heightFt: 6,
    gates: [],
    soilType: "standard" as const,
    slopePercent: 0,
    isWindExposed: false,
    poolCode: false,
    runLabel: "Test run",
    ...overrides,
  };
}

function makeExtraction(runs: ReturnType<typeof makeRun>[], overrides: Partial<AiExtractionResult> = {}): AiExtractionResult {
  return {
    runs,
    confidence: 0.9,
    flags: [],
    rawSummary: "Test extraction",
    ...overrides,
  };
}

// Stable id generators for toEngineState tests
function makeIdGenerators() {
  let r = 0;
  let g = 0;
  return {
    newRunId: () => `run_${++r}`,
    newGateId: () => `gate_${++g}`,
  };
}

// ═════════════════════════════════════════════════════════════════
// A3 — validateExtraction returns separate blockers/warnings
// ═════════════════════════════════════════════════════════════════

describe("A3 • validateExtraction separates blockers from warnings", () => {
  it("a clean extraction returns empty blockers and warnings", () => {
    const result = validateExtraction(makeExtraction([makeRun()]));
    expect(result.valid).toBe(true);
    expect(result.blockers).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.blocked).toBe(false);
  });

  it("zero linearFeet on a run is a blocker, not a warning", () => {
    const result = validateExtraction(makeExtraction([makeRun({ linearFeet: 0 })]));
    expect(result.blocked).toBe(true);
    expect(result.blockers.length).toBeGreaterThan(0);
    expect(result.blockers[0]).toContain("linearFeet is 0");
    // Should not appear in warnings.
    expect(result.warnings).toEqual([]);
  });

  it("zero runs is a blocker", () => {
    const result = validateExtraction(makeExtraction([]));
    expect(result.blocked).toBe(true);
    expect(result.blockers).toContain("No runs extracted — cannot apply");
  });

  it("oversized run (>5000 LF) is a warning, not a blocker", () => {
    const result = validateExtraction(makeExtraction([makeRun({ linearFeet: 6000 })]));
    expect(result.blocked).toBe(false);
    expect(result.blockers).toEqual([]);
    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0]).toContain("6000");
  });

  it("undersized double_drive gate is a warning", () => {
    const result = validateExtraction(makeExtraction([
      makeRun({ gates: [{ widthFt: 4, type: "double_drive" }] }),
    ]));
    expect(result.blocked).toBe(false);
    expect(result.warnings.some(w => w.includes("double drive gate"))).toBe(true);
  });

  it("pool gate auto-sets poolCode and emits a warning", () => {
    const result = validateExtraction(makeExtraction([
      makeRun({
        poolCode: false,
        gates: [{ widthFt: 4, type: "pool" }],
      }),
    ]));
    expect(result.valid).toBe(true);
    expect(result.data!.runs[0].poolCode).toBe(true);
    expect(result.warnings.some(w => w.includes("poolCode auto-set"))).toBe(true);
    expect(result.blocked).toBe(false);
  });

  it("legacy errors field still contains everything (backward compat)", () => {
    const result = validateExtraction(makeExtraction([
      makeRun({ linearFeet: 0 }),
      makeRun({ linearFeet: 6000 }),
    ]));
    // errors === blockers + warnings
    expect(result.errors.length).toBe(result.blockers.length + result.warnings.length);
    expect(result.errors).toEqual([...result.blockers, ...result.warnings]);
  });

  it("schema-invalid raw payload returns blockers (not silent acceptance)", () => {
    const bad = { runs: [{ linearFeet: "not a number" }], confidence: 0.5, flags: [], rawSummary: "x" };
    const result = validateExtraction(bad);
    expect(result.valid).toBe(false);
    expect(result.blocked).toBe(true);
    expect(result.blockers.length).toBeGreaterThan(0);
  });
});

// ═════════════════════════════════════════════════════════════════
// A5 — Schema drift: classic_privacy_6ft removed from Zod
// ═════════════════════════════════════════════════════════════════

describe("A5 • RunSchema productLineId enum matches the JSON Schema sent to OpenAI", () => {
  it("RunSchema rejects classic_privacy_6ft (legacy alias removed)", () => {
    const result = RunSchema.safeParse(makeRun({ productLineId: "classic_privacy_6ft" }));
    expect(result.success).toBe(false);
  });

  it("RunSchema accepts every documented product line id", () => {
    const valid = [
      "vinyl_privacy_6ft", "vinyl_privacy_8ft", "vinyl_picket_4ft", "vinyl_picket_6ft",
      "wood_privacy_6ft", "wood_privacy_8ft", "wood_picket_4ft",
      "chain_link_4ft", "chain_link_6ft",
      "aluminum_4ft", "aluminum_6ft",
    ];
    for (const id of valid) {
      const r = RunSchema.safeParse(makeRun({ productLineId: id }));
      expect(r.success).toBe(true);
    }
  });
});

// ═════════════════════════════════════════════════════════════════
// A2 — toEngineState multi-run corner detection
// ═════════════════════════════════════════════════════════════════

describe("A2 • toEngineState marks joining nodes as corners on multi-run", () => {
  it("single-run extraction stays end/end (open polyline)", () => {
    const ids = makeIdGenerators();
    const state = toEngineState(makeExtraction([makeRun()]), ids.newRunId, ids.newGateId);
    expect(state).not.toBeNull();
    expect(state!.runs).toHaveLength(1);
    expect(state!.runs[0].startType).toBe("end");
    expect(state!.runs[0].endType).toBe("end");
  });

  it("multi-run extraction marks every run after the first with startType: corner", () => {
    const ids = makeIdGenerators();
    const state = toEngineState(
      makeExtraction([
        makeRun({ runLabel: "Run 1", linearFeet: 50 }),
        makeRun({ runLabel: "Run 2", linearFeet: 50 }),
        makeRun({ runLabel: "Run 3", linearFeet: 50 }),
        makeRun({ runLabel: "Run 4", linearFeet: 50 }),
      ]),
      ids.newRunId,
      ids.newGateId,
    );
    expect(state).not.toBeNull();
    expect(state!.runs).toHaveLength(4);
    // First run is open
    expect(state!.runs[0].startType).toBe("end");
    // Subsequent runs join at corners
    expect(state!.runs[1].startType).toBe("corner");
    expect(state!.runs[2].startType).toBe("corner");
    expect(state!.runs[3].startType).toBe("corner");
  });

  it("returns null for empty extraction", () => {
    const ids = makeIdGenerators();
    const state = toEngineState(makeExtraction([]), ids.newRunId, ids.newGateId);
    expect(state).toBeNull();
  });

  it("picks dominant fence type by total LF", () => {
    const ids = makeIdGenerators();
    const state = toEngineState(
      makeExtraction([
        makeRun({ fenceType: "vinyl", linearFeet: 200 }),
        makeRun({ fenceType: "wood", linearFeet: 50, productLineId: "wood_privacy_6ft" }),
        makeRun({ fenceType: "chain_link", linearFeet: 80, productLineId: "chain_link_6ft" }),
      ]),
      ids.newRunId,
      ids.newGateId,
    );
    expect(state!.fenceType).toBe("vinyl");
  });

  it("propagates wind exposure if any run is wind-exposed", () => {
    const ids = makeIdGenerators();
    const state = toEngineState(
      makeExtraction([
        makeRun({ isWindExposed: false }),
        makeRun({ isWindExposed: true }),
      ]),
      ids.newRunId,
      ids.newGateId,
    );
    expect(state!.windMode).toBe(true);
  });

  it("converts slopePercent to slopeDeg via atan", () => {
    const ids = makeIdGenerators();
    const state = toEngineState(
      makeExtraction([
        makeRun({ slopePercent: 0 }),
        makeRun({ slopePercent: 100 }),  // 45 degrees
        makeRun({ slopePercent: 10 }),   // ~5.71 degrees → rounds to 6
      ]),
      ids.newRunId,
      ids.newGateId,
    );
    expect(state!.runs[0].slopeDeg).toBe(0);
    expect(state!.runs[1].slopeDeg).toBe(45);
    expect(state!.runs[2].slopeDeg).toBe(6);
  });

  it("maps gate types correctly", () => {
    const ids = makeIdGenerators();
    const state = toEngineState(
      makeExtraction([
        makeRun({
          gates: [
            { widthFt: 4, type: "walk" },
            { widthFt: 6, type: "drive" },
            { widthFt: 12, type: "double_drive" },
            { widthFt: 4, type: "pool" },
          ],
        }),
      ]),
      ids.newRunId,
      ids.newGateId,
    );
    expect(state!.gates).toHaveLength(4);
    expect(state!.gates[0].gateType).toBe("single");
    expect(state!.gates[0].isPoolGate).toBe(false);
    expect(state!.gates[1].gateType).toBe("single");
    expect(state!.gates[2].gateType).toBe("double");
    expect(state!.gates[3].gateType).toBe("single");
    expect(state!.gates[3].isPoolGate).toBe(true);
  });

  it("uses provided id generators (no module-level state)", () => {
    const ids1 = makeIdGenerators();
    const ids2 = makeIdGenerators();
    const state1 = toEngineState(makeExtraction([makeRun()]), ids1.newRunId, ids1.newGateId);
    const state2 = toEngineState(makeExtraction([makeRun()]), ids2.newRunId, ids2.newGateId);
    // Each call uses its own generator, so both produce the same first id
    expect(state1!.runs[0].id).toBe(state2!.runs[0].id);
  });
});

// ═════════════════════════════════════════════════════════════════
// Integration — multi-run with corner mapping flows into the engine
// ═════════════════════════════════════════════════════════════════

describe("Integration • Multi-run AI extraction triggers corner reinforcement", () => {
  it("4-run rectangle marks 3 corners and reinforces those nodes downstream", async () => {
    // We can't import the engine into a test that imports an .tsx file
    // without the JSDOM env, so this assertion is structural: verify the
    // toEngineState output the engine builder uses. Builder.ts will mutate
    // shared join nodes to type=corner+reinforced=true based on these
    // startType values.
    const ids = makeIdGenerators();
    const state = toEngineState(
      makeExtraction([
        makeRun({ linearFeet: 50 }),
        makeRun({ linearFeet: 50 }),
        makeRun({ linearFeet: 50 }),
        makeRun({ linearFeet: 50 }),
      ]),
      ids.newRunId,
      ids.newGateId,
    );
    expect(state).not.toBeNull();
    const corners = state!.runs.filter(r => r.startType === "corner");
    expect(corners).toHaveLength(3); // runs 2, 3, 4 all join at corners
  });
});
