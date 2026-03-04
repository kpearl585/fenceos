// ── AI Extraction Types ────────────────────────────────────────────

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
  confidence: number;       // 0–1 overall
  flags: string[];          // assumptions, unknowns, questions
  rawSummary: string;
}

export interface CritiqueUncertainField {
  field: string;
  runIndex?: number;
  issue: string;
  suggestedAction: string;
}

export interface CritiqueResult {
  uncertainFields: CritiqueUncertainField[];
  questionsForContractor: string[];
  confidenceByField: Record<string, number>;
  overallReadyToApply: boolean;
  criticalBlockers: string[];
}

export interface AiExtractionResponse {
  success: boolean;
  result?: AiExtractionResult;
  critique?: CritiqueResult;
  validationErrors?: string[];
  blocked?: boolean;           // true if Zod validation found critical blockers
  error?: string;
  inputTokens?: number;
  outputTokens?: number;
  rateRemaining?: number;      // extractions remaining this hour
}
