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
  productLineId: z.enum([
    "vinyl_privacy_6ft", "vinyl_privacy_8ft", "vinyl_picket_4ft", "vinyl_picket_6ft",
    "wood_privacy_6ft", "wood_privacy_8ft", "wood_picket_4ft",
    "chain_link_4ft", "chain_link_6ft",
    "aluminum_4ft", "aluminum_6ft",
    "classic_privacy_6ft",
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
export function validateExtraction(raw: unknown): {
  valid: boolean;
  data?: z.infer<typeof ExtractionSchema>;
  errors: string[];
  blocked: boolean;
} {
  const result = ExtractionSchema.safeParse(raw);
  if (!result.success) {
    const errors = result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`);
    return { valid: false, errors, blocked: true };
  }

  const data = result.data;
  const errors: string[] = [];
  let blocked = false;

  // Business rules on top of schema
  for (let i = 0; i < data.runs.length; i++) {
    const run = data.runs[i];
    if (run.linearFeet === 0) {
      errors.push(`Run ${i + 1} (${run.runLabel || "unlabeled"}): linearFeet is 0 — blocked`);
      blocked = true;
    }
    if (run.linearFeet > 5000) {
      errors.push(`Run ${i + 1}: ${run.linearFeet} LF seems unusually long — verify`);
    }
    for (const gate of run.gates) {
      if (gate.type === "double_drive" && gate.widthFt < 8) {
        errors.push(`Run ${i + 1}: double drive gate is only ${gate.widthFt}ft — typical minimum is 10ft`);
      }
      if (gate.type === "pool" && !run.poolCode) {
        run.poolCode = true; // auto-correct
        errors.push(`Run ${i + 1}: pool gate detected — poolCode auto-set to true`);
      }
    }
  }

  if (data.runs.length === 0) {
    errors.push("No runs extracted — cannot apply");
    blocked = true;
  }

  return { valid: true, data, errors, blocked };
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
