// ── AI Extraction Schema — Zod Validation ────────────────────────
// Server-side validation of GPT-4o extraction output.
// Runs AFTER OpenAI returns JSON; blocks apply if critical fields fail.
// Schema is also used to drive OpenAI structured output format.

import { z } from "zod";

export const GateSchema = z.object({
  widthFt: z.number().min(2).max(24),
  type: z.enum(["walk", "drive", "double_drive", "pool"]),
});

export const RunSchema = z.object({
  linearFeet: z.number().min(0).max(10000),
  fenceType: z.enum(["vinyl", "wood", "chain_link", "aluminum"]),
  // Must stay in sync with EXTRACTION_JSON_SCHEMA below — anything Zod accepts
  // that the JSON Schema rejects is dead drift since the model can never emit it.
  productLineId: z.enum([
    "vinyl_privacy_6ft", "vinyl_privacy_8ft", "vinyl_picket_4ft", "vinyl_picket_6ft",
    "wood_privacy_6ft", "wood_privacy_8ft", "wood_picket_4ft",
    "chain_link_4ft", "chain_link_6ft",
    "aluminum_4ft", "aluminum_6ft",
  ]),
  heightFt: z.number().min(2).max(12),
  gates: z.array(GateSchema).default([]),
  soilType: z.enum(["standard", "sandy", "sandy_loam", "rocky", "clay", "wet"]),
  slopePercent: z.number().min(0).max(100).default(0),
  isWindExposed: z.boolean().default(false),
  poolCode: z.boolean().default(false),
  runLabel: z.string().max(100).default(""),
});

export const ExtractionSchema = z.object({
  runs: z.array(RunSchema),
  confidence: z.number().min(0).max(1),
  flags: z.array(z.string()).default([]),
  rawSummary: z.string(),
});

// ── Survey-specific extraction schema ─────────────────────────────
// Marked surveys require structured-CoT reasoning because GPT-4o
// reads handwriting unreliably. Forcing the model to enumerate every
// dimension and annotation it sees BEFORE committing to runs pins it
// to evidence rather than eyeballing geometry. These fields are not
// consumed downstream — they're a grounding harness for the model.
//
// This schema is ONLY used by the survey extraction path. The photo
// extraction path continues to use ExtractionSchema above unchanged.
export const SurveyExtractionSchema = ExtractionSchema.extend({
  observedDimensions: z
    .array(z.string())
    .describe(
      "Every numeric dimension visible on the image — printed or handwritten. Each entry is a short plain-English note like '73 handwritten at top edge' or '130.00 printed along west property line'. Populate BEFORE extracting runs. Each run must trace back to one of these.",
    ),
  observedAnnotations: z
    .array(z.string())
    .describe(
      "Every non-dimensional annotation visible — legend entries, gate marks, scope notes, color meanings, arrows, labels. Example: 'green highlighter along top + left (partial) = new install per legend', '5 WG handwritten near house return = 5 ft walk gate', 'blue along right = existing neighbor fence'. Populate BEFORE extracting runs.",
    ),
});

export const CritiqueSchema = z.object({
  uncertainFields: z.array(z.object({
    field: z.string(),
    runIndex: z.number().optional(),
    issue: z.string(),
    suggestedAction: z.string(),
  })),
  questionsForContractor: z.array(z.string()).max(7),
  confidenceByField: z.record(z.string(), z.number().min(0).max(1)),
  overallReadyToApply: z.boolean(),
  criticalBlockers: z.array(z.string()),
});

// ── Validate & sanitize extraction result ─────────────────────────
// Returns three classifications:
//   blockers: must be resolved before the extraction can be applied
//   warnings: informational only; safe to apply but worth surfacing
//   errors:   union of blockers + warnings (legacy field, kept for
//             backward-compat with consumers that haven't migrated)
//
// UI consumers should prefer the explicit `blockers` array over
// substring-matching the legacy `errors` array. The `blocked` boolean
// stays as a fast-path summary equal to `blockers.length > 0`.
export function validateExtraction(raw: unknown): {
  valid: boolean;
  data?: z.infer<typeof ExtractionSchema>;
  errors: string[];
  warnings: string[];
  blockers: string[];
  blocked: boolean;
} {
  const result = ExtractionSchema.safeParse(raw);
  if (!result.success) {
    const messages = result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`);
    return {
      valid: false,
      errors: messages,
      warnings: [],
      blockers: messages,
      blocked: true,
    };
  }

  const data = result.data;
  const blockers: string[] = [];
  const warnings: string[] = [];

  // Business rules on top of schema
  for (let i = 0; i < data.runs.length; i++) {
    const run = data.runs[i];
    if (run.linearFeet === 0) {
      blockers.push(`Run ${i + 1} (${run.runLabel || "unlabeled"}): linearFeet is 0`);
    }
    if (run.linearFeet > 5000) {
      warnings.push(`Run ${i + 1}: ${run.linearFeet} LF seems unusually long — verify`);
    }
    for (const gate of run.gates) {
      if (gate.type === "double_drive" && gate.widthFt < 8) {
        warnings.push(`Run ${i + 1}: double drive gate is only ${gate.widthFt}ft — typical minimum is 10ft`);
      }
      if (gate.type === "pool" && !run.poolCode) {
        run.poolCode = true; // auto-correct
        warnings.push(`Run ${i + 1}: pool gate detected — poolCode auto-set to true`);
      }
    }
  }

  if (data.runs.length === 0) {
    blockers.push("No runs extracted — cannot apply");
  }

  return {
    valid: true,
    data,
    errors: [...blockers, ...warnings], // legacy combined field
    warnings,
    blockers,
    blocked: blockers.length > 0,
  };
}

// ── OpenAI JSON Schema (for response_format) ──────────────────────
// Mirrors the Zod schema as a plain JSON Schema object for the API call.
export const EXTRACTION_JSON_SCHEMA = {
  type: "object",
  properties: {
    runs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          linearFeet: { type: "number" },
          fenceType: { type: "string", enum: ["vinyl", "wood", "chain_link", "aluminum"] },
          productLineId: { type: "string", enum: [
            "vinyl_privacy_6ft", "vinyl_privacy_8ft", "vinyl_picket_4ft", "vinyl_picket_6ft",
            "wood_privacy_6ft", "wood_privacy_8ft", "wood_picket_4ft",
            "chain_link_4ft", "chain_link_6ft", "aluminum_4ft", "aluminum_6ft",
          ]},
          heightFt: { type: "number" },
          gates: {
            type: "array",
            items: {
              type: "object",
              properties: {
                widthFt: { type: "number" },
                type: { type: "string", enum: ["walk", "drive", "double_drive", "pool"] },
              },
              required: ["widthFt", "type"],
              additionalProperties: false,
            },
          },
          soilType: { type: "string", enum: ["standard", "sandy", "sandy_loam", "rocky", "clay", "wet"] },
          slopePercent: { type: "number" },
          isWindExposed: { type: "boolean" },
          poolCode: { type: "boolean" },
          runLabel: { type: "string" },
        },
        required: ["linearFeet", "fenceType", "productLineId", "heightFt", "gates", "soilType", "slopePercent", "isWindExposed", "poolCode", "runLabel"],
        additionalProperties: false,
      },
    },
    confidence: { type: "number" },
    flags: { type: "array", items: { type: "string" } },
    rawSummary: { type: "string" },
  },
  required: ["runs", "confidence", "flags", "rawSummary"],
  additionalProperties: false,
};

// ── Survey-specific JSON Schema (structured-CoT variant) ──────────
// Used only by the survey extraction path. Extends EXTRACTION_JSON_SCHEMA
// with two required enumeration fields that force the model to ground
// every run in observed evidence before emitting it.
export const SURVEY_EXTRACTION_JSON_SCHEMA = {
  type: "object",
  properties: {
    // Order matters: the model fills fields top-down, so observations
    // are declared first to force enumeration before extraction.
    observedDimensions: {
      type: "array",
      items: { type: "string" },
      description:
        "Every numeric dimension visible on the image — printed or handwritten. Each entry must include location ('73 handwritten at top edge', '130.00 printed along west property line', '5 WG near house return'). Populate BEFORE extracting runs. No run may use a dimension not listed here.",
    },
    observedAnnotations: {
      type: "array",
      items: { type: "string" },
      description:
        "Every non-dimensional annotation — legend entries, gate marks, color meanings, scope notes. Example: 'green highlighter = new install per legend', 'blue along right = existing neighbor fence', '5 WG annotation = 5 ft walk gate between left-side corner and house return'. Populate BEFORE extracting runs.",
    },
    runs: EXTRACTION_JSON_SCHEMA.properties.runs,
    confidence: { type: "number" },
    flags: { type: "array", items: { type: "string" } },
    rawSummary: { type: "string" },
  },
  required: [
    "observedDimensions",
    "observedAnnotations",
    "runs",
    "confidence",
    "flags",
    "rawSummary",
  ],
  additionalProperties: false,
};

export const CRITIQUE_JSON_SCHEMA = {
  type: "object",
  properties: {
    uncertainFields: {
      type: "array",
      items: {
        type: "object",
        properties: {
          field: { type: "string" },
          runIndex: { type: "number" },
          issue: { type: "string" },
          suggestedAction: { type: "string" },
        },
        required: ["field", "issue", "suggestedAction"],
        additionalProperties: false,
      },
    },
    questionsForContractor: { type: "array", items: { type: "string" }, maxItems: 7 },
    confidenceByField: { type: "object", additionalProperties: { type: "number" } },
    overallReadyToApply: { type: "boolean" },
    criticalBlockers: { type: "array", items: { type: "string" } },
  },
  required: ["uncertainFields", "questionsForContractor", "confidenceByField", "overallReadyToApply", "criticalBlockers"],
  additionalProperties: false,
};
