import type { FenceType } from "./bom/index";
import type { WoodStyle } from "./bom/woodBom";
import { PRODUCT_LINES, type FenceProjectInput, type GateInput } from "./types";

const VALID_RUN_TYPES = new Set(["end", "corner", "gate"]);
const VALID_FENCE_TYPES = new Set<FenceType>(["vinyl", "wood", "chain_link", "aluminum"]);
const MIN_GATE_WIDTH_FT = 3;
const MAX_GATE_WIDTH_FT = 24;
const VALID_WOOD_STYLES = new Set<WoodStyle>([
  "dog_ear_privacy",
  "flat_top_privacy",
  "picket",
  "board_on_board",
]);

function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value);
}

export function inferFenceTypeFromProductLineId(productLineId?: string | null): FenceType | null {
  if (!productLineId || !PRODUCT_LINES[productLineId]) return null;
  if (productLineId.startsWith("vinyl_")) return "vinyl";
  if (productLineId.startsWith("wood_")) return "wood";
  if (productLineId.startsWith("chain_link_")) return "chain_link";
  if (productLineId.startsWith("aluminum_")) return "aluminum";
  return null;
}

export function sanitizeGatesForEstimator(gates: GateInput[]): GateInput[] {
  // Preserve every gate: multiple gates on one run are valid estimate inputs,
  // and silently deduplicating them corrupts both costing and saved drafts.
  return [...gates];
}

export function assertValidFenceProjectInput(input: FenceProjectInput): void {
  if (!PRODUCT_LINES[input.productLineId]) {
    throw new Error(`Unknown product line: ${input.productLineId}`);
  }

  if (!Array.isArray(input.runs) || input.runs.length === 0) {
    throw new Error("At least one fence run is required.");
  }

  const runIds = new Set<string>();
  for (const run of input.runs) {
    if (!run.id || runIds.has(run.id)) {
      throw new Error("Each fence run must have a unique id.");
    }
    runIds.add(run.id);

    if (!isFiniteNumber(run.linearFeet) || run.linearFeet <= 0) {
      throw new Error(`Run ${run.id} must have a positive length.`);
    }

    if (!VALID_RUN_TYPES.has(run.startType) || !VALID_RUN_TYPES.has(run.endType)) {
      throw new Error(`Run ${run.id} has an invalid boundary type.`);
    }

    const slopeDeg = run.slopeDeg ?? 0;
    if (!isFiniteNumber(slopeDeg) || slopeDeg < 0 || slopeDeg > 45) {
      throw new Error(`Run ${run.id} has an invalid slope.`);
    }
  }

  for (const gate of input.gates) {
    if (!runIds.has(gate.afterRunId)) {
      throw new Error(`Gate ${gate.id} is attached to an unknown run.`);
    }

    if (!isFiniteNumber(gate.widthFt) || gate.widthFt < MIN_GATE_WIDTH_FT || gate.widthFt > MAX_GATE_WIDTH_FT) {
      throw new Error(`Gate ${gate.id} must be between ${MIN_GATE_WIDTH_FT}ft and ${MAX_GATE_WIDTH_FT}ft wide.`);
    }
  }
}

export function assertValidEstimateOptions(options: {
  laborRatePerHr: number;
  wastePct: number;
  fenceType: FenceType;
  woodStyle?: WoodStyle;
}): void {
  if (!VALID_FENCE_TYPES.has(options.fenceType)) {
    throw new Error("Invalid fence type.");
  }

  if (options.fenceType === "wood" && options.woodStyle && !VALID_WOOD_STYLES.has(options.woodStyle)) {
    throw new Error("Invalid wood style.");
  }

  if (!isFiniteNumber(options.laborRatePerHr) || options.laborRatePerHr <= 0) {
    throw new Error("Labor rate must be greater than zero.");
  }

  if (!isFiniteNumber(options.wastePct) || options.wastePct < 0 || options.wastePct > 1) {
    throw new Error("Waste percentage must be between 0 and 100%.");
  }
}

export function totalLinearFeet(input: FenceProjectInput): number {
  return input.runs.reduce((sum, run) => sum + run.linearFeet, 0);
}
