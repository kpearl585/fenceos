import {
  calculateOverallComplexity,
  getSiteComplexityLabel,
  type SiteComplexity,
} from "./accuracy-types";
import type { ConfidenceReviewGate, FenceProjectInput } from "./types";
import type { AdaptiveLaborBucket, SiteComplexityBand } from "./config/types";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function getSiteComplexityBand(score: number): SiteComplexityBand {
  if (score <= 1.5) return "easy";
  if (score <= 2.5) return "standard";
  if (score <= 3.5) return "moderate";
  if (score <= 4.5) return "difficult";
  return "very_difficult";
}

export function normalizeSiteComplexity(
  complexity?: SiteComplexity | null
): SiteComplexity | null {
  if (!complexity) return null;

  const normalized: SiteComplexity = {
    ...complexity,
    overall_score:
      complexity.overall_score ??
      calculateOverallComplexity({
        access_difficulty: complexity.access_difficulty,
        obstacles: complexity.obstacles,
        ground_hardness: complexity.ground_hardness,
        demo_required: complexity.demo_required,
        permit_complexity: complexity.permit_complexity,
      }),
  };

  return normalized;
}

export function getSiteComplexityLaborMultiplier(
  complexity?: SiteComplexity | null
): { multiplier: number; note: string | null } {
  const normalized = normalizeSiteComplexity(complexity);
  if (!normalized) {
    return { multiplier: 1, note: null };
  }

  const laborDifficulty =
    normalized.access_difficulty * 0.4 +
    normalized.obstacles * 0.35 +
    normalized.ground_hardness * 0.25;

  const multiplier = round2(clamp(0.88 + laborDifficulty * 0.06, 0.94, 1.18));
  const label = getSiteComplexityLabel(normalized.overall_score ?? laborDifficulty);

  return {
    multiplier,
    note:
      Math.abs(multiplier - 1) < 0.01
        ? `Site complexity assessed as ${label} (${round1(normalized.overall_score ?? laborDifficulty)}). No labor adjustment applied.`
        : `Site complexity assessed as ${label} (${round1(normalized.overall_score ?? laborDifficulty)}). Labor adjusted to ${Math.round(multiplier * 100)}% of baseline.`,
  };
}

export function getAdaptiveLaborBucketForComplexity(
  complexity: SiteComplexity | null | undefined,
  buckets?: Record<SiteComplexityBand, AdaptiveLaborBucket> | null,
): {
  band: SiteComplexityBand | null;
  multiplier: number;
  sampleCount: number;
  note: string | null;
} {
  const normalized = normalizeSiteComplexity(complexity);
  if (!normalized || !buckets) {
    return { band: null, multiplier: 1, sampleCount: 0, note: null };
  }

  const band = getSiteComplexityBand(normalized.overall_score ?? 0);
  const bucket = buckets[band];
  if (!bucket) {
    return { band, multiplier: 1, sampleCount: 0, note: null };
  }

  return {
    band,
    multiplier: bucket.multiplier,
    sampleCount: bucket.sampleCount,
    note:
      bucket.sampleCount > 0 && Math.abs(bucket.multiplier - 1) > 0.01
        ? `Adaptive labor learned for ${band.replace("_", " ")} sites from ${bucket.sampleCount} closeout${bucket.sampleCount === 1 ? "" : "s"}: ${Math.round(bucket.multiplier * 100)}% of baseline.`
        : null,
  };
}

export function buildScopeConfidence(input: FenceProjectInput): {
  confidence: number;
  notes: string[];
  reviewGates: ConfidenceReviewGate[];
} {
  let confidence = 0.96;
  const notes: string[] = [];
  const reviewGates: ConfidenceReviewGate[] = [];
  const totalLF = input.runs.reduce((sum, run) => sum + run.linearFeet, 0);

  const normalizedComplexity = normalizeSiteComplexity(input.siteComplexity);
  if (!normalizedComplexity) {
    confidence -= 0.08;
    notes.push("No site complexity assessment was recorded.");
    const severity: ConfidenceReviewGate["severity"] =
      input.existingFenceRemoval || input.gates.length > 0 || totalLF >= 150
        ? "blocker"
        : "review";
    reviewGates.push({
      id: "site-complexity-missing",
      fieldId: "est-site-complexity",
      severity,
      message:
        severity === "blocker"
          ? "Add the site complexity assessment before sending this estimate. Access, obstacles, and ground conditions materially affect accuracy on this job."
          : "Consider adding the site complexity assessment to tighten labor and confidence on this estimate.",
    });
  } else {
    const label = getSiteComplexityLabel(normalizedComplexity.overall_score ?? 0);
    notes.push(
      `Site complexity recorded as ${label} (${round1(normalizedComplexity.overall_score ?? 0)}).`
    );

    if ((normalizedComplexity.overall_score ?? 0) >= 4) {
      confidence -= 0.03;
      notes.push("High-complexity site conditions increase variance risk.");
    }

    if (
      input.existingFenceRemoval &&
      normalizedComplexity.demo_required !== true &&
      normalizedComplexity.demo_required !== "partial"
    ) {
      confidence -= 0.03;
      notes.push("Existing fence removal is enabled, but demo complexity was not fully scoped.");
      reviewGates.push({
        id: "demo-scope-missing",
        fieldId: "est-site-complexity",
        severity: "blocker",
        message: "This job includes fence removal. Mark the demolition complexity in Site Complexity before sending the quote.",
      });
    }
  }

  const runsWithCorners = input.runs.filter(
    (run) => run.startType === "corner" || run.endType === "corner"
  );
  const missingCornerAngles = runsWithCorners.filter((run) => run.cornerAngle == null).length;
  if (missingCornerAngles > 0) {
    const penalty = Math.min(0.06, missingCornerAngles * 0.02);
    confidence -= penalty;
    notes.push(`Missing corner angles on ${missingCornerAngles} run${missingCornerAngles === 1 ? "" : "s"}.`);
    reviewGates.push({
      id: "corner-angles-missing",
      fieldId: "est-runs",
      severity: "blocker",
      message: `Add corner angles for the ${missingCornerAngles} run${missingCornerAngles === 1 ? "" : "s"} with corner connections before sending the quote.`,
    });
  }

  const steepRunsWithoutMethod = input.runs.filter(
    (run) => (run.slopeDeg ?? 0) >= 12 && !run.slopeMethod
  ).length;
  if (steepRunsWithoutMethod > 0) {
    const penalty = Math.min(0.04, steepRunsWithoutMethod * 0.02);
    confidence -= penalty;
    notes.push(`Steep runs are missing explicit slope handling on ${steepRunsWithoutMethod} segment${steepRunsWithoutMethod === 1 ? "" : "s"}.`);
    reviewGates.push({
      id: "slope-method-missing",
      fieldId: "est-runs",
      severity: "blocker",
      message: `Choose racked or stepped handling for ${steepRunsWithoutMethod} steeper run${steepRunsWithoutMethod === 1 ? "" : "s"} before sending the quote.`,
    });
  }

  if (input.gates.length > 0 && !normalizedComplexity) {
    confidence -= 0.02;
    notes.push("Gate jobs are more reliable when access and ground conditions are assessed.");
  }

  if (totalLF >= 250 && !normalizedComplexity) {
    confidence -= 0.03;
    notes.push("Large jobs need site complexity captured for top-tier accuracy.");
  }

  return {
    confidence: round2(clamp(confidence, 0.55, 0.99)),
    notes,
    reviewGates,
  };
}
