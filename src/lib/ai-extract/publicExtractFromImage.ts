// ── Public AI Photo Estimator — OpenAI Vision wrapper ────────────
// Thin server-only wrapper around the existing fence-graph extraction
// pipeline for the public (anonymous) /try-it flow. Reuses SYSTEM_PROMPT,
// USER_PROMPT_IMAGE, and validateExtraction so text-from-contractor and
// photo-from-homeowner inputs share one contract with downstream code.
//
// The caller is responsible for:
//  - Downsizing + JPEG-encoding the image before base64 encoding.
//  - Checking the daily cost cap (via increment_photo_estimate_cost RPC).
//  - Running estimateFence() on the returned extraction.

import OpenAI from "openai";
import {
  SYSTEM_PROMPT,
  USER_PROMPT_IMAGE,
} from "@/lib/fence-graph/ai-extract/prompt";
import {
  EXTRACTION_JSON_SCHEMA,
  validateExtraction,
  type ExtractionSchema,
} from "@/lib/fence-graph/ai-extract/schema";
import type { z } from "zod";

// Lazy-init so Next's page-data collection doesn't throw at build time
// when OPENAI_API_KEY isn't available in the build sandbox. The client is
// created on first request; subsequent requests reuse it for connection
// keep-alive.
let _openai: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
  if (!_openai) _openai = new OpenAI();
  return _openai;
}

// GPT-4o pricing (cents per 1K tokens) as of 2025-11.
// Update here when OpenAI revises rates.
const INPUT_CENTS_PER_1K  = 0.25; // $2.50/M
const OUTPUT_CENTS_PER_1K = 1.0;  // $10.00/M

export interface PublicExtractionResult {
  data: z.infer<typeof ExtractionSchema> | undefined;
  blockers: string[];
  warnings: string[];
  blocked: boolean;
  costCents: number;
  inputTokens: number;
  outputTokens: number;
}

export async function publicExtractFromImage(
  imageBase64: string,
  mimeType: string,
  additionalContext?: string
): Promise<PublicExtractionResult> {
  const completion = await getOpenAIClient().chat.completions.create({
    model: "gpt-4o",
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "fence_extraction",
        strict: true,
        schema: EXTRACTION_JSON_SCHEMA,
      },
    },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: USER_PROMPT_IMAGE(imageBase64, mimeType, additionalContext),
      },
    ],
    max_tokens: 2000,
  });

  const rawJson = completion.choices[0]?.message?.content ?? "";
  const inputTokens  = completion.usage?.prompt_tokens     ?? 0;
  const outputTokens = completion.usage?.completion_tokens ?? 0;

  const computedCents =
    (inputTokens  * INPUT_CENTS_PER_1K)  / 1000 +
    (outputTokens * OUTPUT_CENTS_PER_1K) / 1000;
  const costCents = Math.max(1, Math.ceil(computedCents));

  // Parse — JSON Schema `strict: true` means this should always succeed,
  // but defend against the rare empty-completion case.
  let parsed: unknown = null;
  try {
    parsed = rawJson ? JSON.parse(rawJson) : null;
  } catch {
    parsed = null;
  }

  const validated = validateExtraction(parsed);

  return {
    data:         validated.data,
    blockers:     validated.blockers,
    warnings:     validated.warnings,
    blocked:      validated.blocked,
    costCents,
    inputTokens,
    outputTokens,
  };
}
