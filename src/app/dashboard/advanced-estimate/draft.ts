// Draft persistence helpers for the Advanced Estimator.
//
// Pure serialize/parse functions live here so they're unit-testable
// without mounting the component. The client component owns the
// useEffect wiring (timing, localStorage I/O); this file owns the
// shape contract and field-by-field validation.
//
// The key is versioned — bumping DRAFT_KEY invalidates all existing
// drafts rather than attempting a risky forward-migration. New optional
// fields (runs, gates, runsMode, simple-mode params) do NOT require a
// bump: parseDraft drops them silently if absent, so v1 drafts still
// restore their scalar fields and the editor starts fresh.

import type { RunInput, GateInput } from "@/lib/fence-graph/types";

export const DRAFT_KEY = "fep-estimator-draft-v1";
export const DRAFT_SAVE_DEBOUNCE_MS = 600;

export type DraftRunsMode = "simple" | "advanced";
export type DraftSimpleShape = "open" | "closed";

export interface EstimatorDraft {
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
  runsMode: DraftRunsMode;
  simpleTotalFeet: number;
  simpleCorners: number;
  simpleShape: DraftSimpleShape;
  runs: RunInput[];
  gates: GateInput[];
}

export function serializeDraft(draft: EstimatorDraft): string {
  return JSON.stringify(draft);
}

const VALID_POST_TYPES = new Set<RunInput["startType"]>(["end", "corner", "gate"]);
const VALID_SLOPE_METHODS = new Set(["racked", "stepped", "level"]);
const VALID_PANEL_STYLES = new Set(["privacy", "picket", "semi_privacy", "lattice_top"]);
const VALID_GATE_TYPES = new Set<GateInput["gateType"]>(["single", "double"]);
const VALID_GATE_HINGES = new Set(["standard", "self_closing"]);
const VALID_GATE_LATCHES = new Set(["standard", "lokk_latch", "magnetic", "slide_bolt"]);
const VALID_HARDWARE_COLORS = new Set(["black", "bronze", "white"]);
const VALID_POST_INSERTS = new Set(["none", "aluminum", "steel"]);

function parseRunInput(u: unknown): RunInput | null {
  if (!u || typeof u !== "object" || Array.isArray(u)) return null;
  const r = u as Record<string, unknown>;
  if (typeof r.id !== "string" || !r.id) return null;
  if (typeof r.linearFeet !== "number" || !Number.isFinite(r.linearFeet)) return null;
  if (typeof r.startType !== "string" || !VALID_POST_TYPES.has(r.startType as RunInput["startType"])) return null;
  if (typeof r.endType !== "string" || !VALID_POST_TYPES.has(r.endType as RunInput["endType"])) return null;

  const out: RunInput = {
    id: r.id,
    linearFeet: r.linearFeet,
    startType: r.startType as RunInput["startType"],
    endType: r.endType as RunInput["endType"],
  };
  if (typeof r.cornerAngle === "number" && Number.isFinite(r.cornerAngle)) out.cornerAngle = r.cornerAngle;
  if (typeof r.slopeDeg === "number" && Number.isFinite(r.slopeDeg)) out.slopeDeg = r.slopeDeg;
  if (typeof r.slopeMethod === "string" && VALID_SLOPE_METHODS.has(r.slopeMethod)) {
    out.slopeMethod = r.slopeMethod as RunInput["slopeMethod"];
  }
  if (typeof r.panelStyle === "string" && VALID_PANEL_STYLES.has(r.panelStyle)) {
    out.panelStyle = r.panelStyle as RunInput["panelStyle"];
  }
  if (typeof r.notes === "string") out.notes = r.notes;
  return out;
}

function parseGateInput(u: unknown): GateInput | null {
  if (!u || typeof u !== "object" || Array.isArray(u)) return null;
  const g = u as Record<string, unknown>;
  if (typeof g.id !== "string" || !g.id) return null;
  if (typeof g.afterRunId !== "string" || !g.afterRunId) return null;
  if (typeof g.gateType !== "string" || !VALID_GATE_TYPES.has(g.gateType as GateInput["gateType"])) return null;
  if (typeof g.widthFt !== "number" || !Number.isFinite(g.widthFt)) return null;
  if (typeof g.isPoolGate !== "boolean") return null;
  const out: GateInput = {
    id: g.id,
    afterRunId: g.afterRunId,
    gateType: g.gateType as GateInput["gateType"],
    widthFt: g.widthFt,
    isPoolGate: g.isPoolGate,
  };
  if (typeof g.hinges === "string" && VALID_GATE_HINGES.has(g.hinges)) {
    out.hinges = g.hinges as GateInput["hinges"];
  }
  if (typeof g.latch === "string" && VALID_GATE_LATCHES.has(g.latch)) {
    out.latch = g.latch as GateInput["latch"];
  }
  if (typeof g.hardwareColor === "string" && VALID_HARDWARE_COLORS.has(g.hardwareColor)) {
    out.hardwareColor = g.hardwareColor as GateInput["hardwareColor"];
  }
  if (typeof g.postInsert === "string" && VALID_POST_INSERTS.has(g.postInsert)) {
    out.postInsert = g.postInsert as GateInput["postInsert"];
  }
  return out;
}

// Returns a partial draft containing only the fields that pass type-narrowing.
// A field that's missing or wrong-typed is dropped — the caller falls back to
// its default. Corrupt JSON / non-object input returns null so the restore
// path can silently ignore it. Arrays drop invalid items individually rather
// than failing the whole array, so one corrupt run doesn't nuke the draft.
export function parseDraft(raw: string | null | undefined): Partial<EstimatorDraft> | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const d = parsed as Record<string, unknown>;
  const out: Partial<EstimatorDraft> = {};

  if (typeof d.projectName === "string") out.projectName = d.projectName;
  if (typeof d.fenceType === "string") out.fenceType = d.fenceType;
  if (typeof d.productLineId === "string") out.productLineId = d.productLineId;
  if (typeof d.woodStyle === "string") out.woodStyle = d.woodStyle;
  if (typeof d.soilType === "string") out.soilType = d.soilType;
  if (typeof d.laborRate === "number" && Number.isFinite(d.laborRate)) out.laborRate = d.laborRate;
  if (typeof d.wastePct === "number" && Number.isFinite(d.wastePct)) out.wastePct = d.wastePct;
  if (typeof d.markupPct === "number" && Number.isFinite(d.markupPct)) out.markupPct = d.markupPct;
  if (typeof d.windMode === "boolean") out.windMode = d.windMode;
  if (typeof d.existingFenceRemoval === "boolean") out.existingFenceRemoval = d.existingFenceRemoval;
  if (typeof d.laborEfficiency === "number" && Number.isFinite(d.laborEfficiency)) {
    out.laborEfficiency = d.laborEfficiency;
  }
  if (typeof d.permitCost === "number" && Number.isFinite(d.permitCost)) out.permitCost = d.permitCost;
  if (typeof d.inspectionCost === "number" && Number.isFinite(d.inspectionCost)) {
    out.inspectionCost = d.inspectionCost;
  }
  if (typeof d.engineeringCost === "number" && Number.isFinite(d.engineeringCost)) {
    out.engineeringCost = d.engineeringCost;
  }
  if (typeof d.surveyCost === "number" && Number.isFinite(d.surveyCost)) out.surveyCost = d.surveyCost;
  if (d.customer && typeof d.customer === "object" && !Array.isArray(d.customer)) {
    const c = d.customer as Record<string, unknown>;
    out.customer = {
      name: typeof c.name === "string" ? c.name : "",
      address: typeof c.address === "string" ? c.address : "",
      city: typeof c.city === "string" ? c.city : "",
      phone: typeof c.phone === "string" ? c.phone : "",
      email: typeof c.email === "string" ? c.email : "",
    };
  }

  if (d.runsMode === "simple" || d.runsMode === "advanced") out.runsMode = d.runsMode;
  if (typeof d.simpleTotalFeet === "number" && Number.isFinite(d.simpleTotalFeet)) {
    out.simpleTotalFeet = d.simpleTotalFeet;
  }
  if (typeof d.simpleCorners === "number" && Number.isFinite(d.simpleCorners)) {
    out.simpleCorners = d.simpleCorners;
  }
  if (d.simpleShape === "open" || d.simpleShape === "closed") out.simpleShape = d.simpleShape;

  if (Array.isArray(d.runs)) {
    const runs = d.runs.map(parseRunInput).filter((r): r is RunInput => r !== null);
    out.runs = runs;
  }
  if (Array.isArray(d.gates)) {
    const gates = d.gates.map(parseGateInput).filter((g): g is GateInput => g !== null);
    out.gates = gates;
  }

  return out;
}

// Parse the numeric suffix of an id like "run_7" / "gate_12". Returns 0 if
// the id doesn't match the expected shape — the caller treats that as
// "nothing to restore" and the counter stays at its current value.
export function maxIdSuffix(items: { id: string }[], prefix: string): number {
  let max = 0;
  const pat = new RegExp(`^${prefix}_(\\d+)$`);
  for (const it of items) {
    const m = pat.exec(it.id);
    if (!m) continue;
    const n = parseInt(m[1], 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max;
}
