import type { CritiqueResult, AiExtractionResult, ScopeRiskAssessment, ScopeRiskQuestion } from "./types";

const DEMO_HINTS = ["remove", "removal", "tear out", "tear-out", "existing fence", "replace fence", "demo"];
const ACCESS_HINTS = ["tight", "narrow", "alley", "no access", "hand-carry", "carry materials", "backyard only", "limited access"];
const OBSTACLE_HINTS = ["tree", "trees", "root", "roots", "rock", "rocks", "utility", "utilities", "stump", "bush", "hedge"];
const PERMIT_HINTS = ["permit", "hoa", "association", "approval", "code"];
const SOIL_HINTS = ["soil", "clay", "rocky", "rock", "sandy", "sand", "wet", "water table", "caliche"];

function containsAny(input: string, needles: string[]): boolean {
  return needles.some((needle) => input.includes(needle));
}

function addQuestion(
  questions: ScopeRiskQuestion[],
  question: ScopeRiskQuestion
) {
  if (questions.some((existing) => existing.field === question.field)) return;
  questions.push(question);
}

export function buildScopeRiskAssessment(
  originalInput: string,
  extraction: AiExtractionResult,
  critique?: CritiqueResult | null
): ScopeRiskAssessment {
  const text = originalInput.toLowerCase();
  const totalLf = extraction.runs.reduce((sum, run) => sum + run.linearFeet, 0);
  const totalGates = extraction.runs.reduce((sum, run) => sum + run.gates.length, 0);
  const hasPoolSignals =
    text.includes("pool") ||
    extraction.runs.some((run) => run.poolCode || run.gates.some((gate) => gate.type === "pool"));
  const allStandardSoil =
    extraction.runs.length > 0 &&
    extraction.runs.every((run) => run.soilType === "standard");
  const hasLowConfidenceSoil =
    critique?.uncertainFields?.some((field) => field.field.toLowerCase().includes("soil")) ?? false;

  const questions: ScopeRiskQuestion[] = [];

  if ((allStandardSoil && !containsAny(text, SOIL_HINTS)) || hasLowConfidenceSoil) {
    addQuestion(questions, {
      id: "soil-confirm",
      field: "soilType",
      priority: totalLf >= 120 ? "high" : "medium",
      question: "Confirm digging conditions before you trust the number.",
      reason: "Soil type changes post depth, concrete usage, and labor more than most small scope details.",
      suggestedValue: extraction.runs[0]?.soilType ?? "standard",
    });
  }

  if (!containsAny(text, DEMO_HINTS) && totalLf >= 60) {
    addQuestion(questions, {
      id: "demo-confirm",
      field: "demoRequired",
      priority: totalLf >= 120 ? "high" : "medium",
      question: "Is there an existing fence to tear out?",
      reason: "Removal changes labor, disposal, and post-extraction time immediately.",
      suggestedValue: false,
    });
  }

  if (!containsAny(text, ACCESS_HINTS) && (text.includes("back") || totalLf >= 120 || totalGates > 0)) {
    addQuestion(questions, {
      id: "access-confirm",
      field: "accessDifficulty",
      priority: totalLf >= 150 ? "high" : "medium",
      question: "How tight is site access for crew and material movement?",
      reason: "Access difficulty is one of the fastest ways to lose labor margin on otherwise normal jobs.",
      suggestedValue: 2,
    });
  }

  if (!containsAny(text, OBSTACLE_HINTS) && totalLf >= 100) {
    addQuestion(questions, {
      id: "obstacles-confirm",
      field: "obstacles",
      priority: "medium",
      question: "Any trees, roots, utilities, rock, or hardscape in the fence line?",
      reason: "Obstructions quietly slow digging and often add hand work or re-layout time.",
      suggestedValue: 2,
    });
  }

  if ((hasPoolSignals || !containsAny(text, PERMIT_HINTS)) && (hasPoolSignals || totalGates > 0 || totalLf >= 150)) {
    addQuestion(questions, {
      id: "permit-confirm",
      field: "permitComplexity",
      priority: hasPoolSignals ? "high" : "medium",
      question: "Any HOA, permit, or pool-code requirements on this job?",
      reason: "Permit and compliance friction does not change footage, but it absolutely changes quote risk and scope completeness.",
      suggestedValue: hasPoolSignals ? 3 : 1,
    });
  }

  const prioritized = questions
    .sort((a, b) => {
      if (a.priority === b.priority) return 0;
      return a.priority === "high" ? -1 : 1;
    })
    .slice(0, 4);

  return {
    summary:
      prioritized.length > 0
        ? "AI extracted the fence runs, but these are the remaining margin-critical facts worth confirming before you trust the estimate."
        : "No additional AI scope-risk questions are needed for this extraction.",
    questions: prioritized,
  };
}
