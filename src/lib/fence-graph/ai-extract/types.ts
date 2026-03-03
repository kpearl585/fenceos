// ── AI Extraction Types ───────────────────────────────────────────
// These are the types that GPT-4o outputs.
// They map directly to FenceProjectInput for the engine.

export interface AiExtractedGate {
  widthFt: number;
  type: "walk" | "drive" | "double_drive" | "pool";
}

export interface AiExtractedRun {
  linearFeet: number;
  fenceType: "vinyl" | "wood" | "chain_link" | "aluminum";
  productLineId: string;
  heightFt: number;
  gates: AiExtractedGate[];
  soilType: "standard" | "sandy" | "sandy_loam" | "rocky" | "clay" | "wet";
  slopePercent: number;
  isWindExposed: boolean;
  poolCode: boolean;
  runLabel: string;
}

export interface AiExtractionResult {
  runs: AiExtractedRun[];
  confidence: number;       // 0–1
  flags: string[];          // assumptions, missing info, warnings
  rawSummary: string;
}

export interface AiExtractionResponse {
  success: boolean;
  result?: AiExtractionResult;
  error?: string;
  inputTokens?: number;
  outputTokens?: number;
}
