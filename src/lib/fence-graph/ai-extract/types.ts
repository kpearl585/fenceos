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
  hiddenCostFlags?: string[];  // potential additional costs detected
  rawSummary: string;
  /** Survey-only: every numeric dimension the model claims to have seen
   *  on the page, with location annotation. Surfaced in the review UI so
   *  contractors can spot hallucinated numbers BEFORE applying. */
  observedDimensions?: string[];
  /** Survey-only: every non-numeric annotation the model claims to have
   *  seen — legend entries, color meanings, gate marks, margin notes.
   *  Same verification purpose as observedDimensions. */
  observedAnnotations?: string[];
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

export type ScopeRiskField =
  | "soilType"
  | "demoRequired"
  | "accessDifficulty"
  | "obstacles"
  | "permitComplexity";

export interface ScopeRiskQuestion {
  id: string;
  field: ScopeRiskField;
  priority: "high" | "medium";
  question: string;
  reason: string;
  suggestedValue?: string | number | boolean;
}

export interface ScopeRiskAssessment {
  summary: string;
  questions: ScopeRiskQuestion[];
}

export interface AiExtractionResponse {
  success: boolean;
  result?: AiExtractionResult;
  critique?: CritiqueResult;
  scopeRiskAssessment?: ScopeRiskAssessment;
  /** Legacy combined messages (warnings + blockers). UI should prefer
   *  validationBlockers / validationWarnings going forward. */
  validationErrors?: string[];
  /** Critical issues that must be resolved before applying. */
  validationBlockers?: string[];
  /** Informational issues that don't prevent applying. */
  validationWarnings?: string[];
  /** True if ANY of: Zod validation blocked, business rule blocked,
   *  critique returned criticalBlockers, or critique set
   *  overallReadyToApply=false. UI Apply button must respect this flag. */
  criticallyBlocked?: boolean;
  /** @deprecated use criticallyBlocked. Kept for backward compat. */
  blocked?: boolean;
  error?: string;
  inputTokens?: number;
  outputTokens?: number;
  rateRemaining?: number;      // extractions remaining this hour
}
