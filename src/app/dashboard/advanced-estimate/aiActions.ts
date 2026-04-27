"use server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, USER_PROMPT_TEXT, USER_PROMPT_IMAGE, AERIAL_SYSTEM_ADDENDUM } from "@/lib/fence-graph/ai-extract/prompt";
import { CRITIQUE_SYSTEM_PROMPT, CRITIQUE_USER_PROMPT } from "@/lib/fence-graph/ai-extract/critique-prompt";
import {
  EXTRACTION_JSON_SCHEMA,
  CRITIQUE_JSON_SCHEMA,
  SURVEY_EXTRACTION_JSON_SCHEMA,
  SurveyExtractionSchema,
  validateExtraction,
} from "@/lib/fence-graph/ai-extract/schema";
import type { AiExtractionResponse, AiExtractionResult } from "@/lib/fence-graph/ai-extract/types";
import type { CritiqueResult } from "@/lib/fence-graph/ai-extract/types";
import { detectHiddenCosts } from "@/lib/fence-graph/ai-extract/hiddenCostDetection";
import { buildScopeRiskAssessment } from "@/lib/fence-graph/ai-extract/scopeRisk";
import { SURVEY_SYSTEM_PROMPT, SURVEY_USER_PROMPT_IMAGE } from "@/lib/fence-graph/ai-extract/survey-prompt";
import crypto from "crypto";

type SurveyAnthropicModel =
  | "claude-opus-4-20250514"
  | "claude-sonnet-4-20250514";

function normalizeSurveyModel(
  model: "gpt-4o" | "claude-opus-4-7" | "claude-sonnet-4-6" | SurveyAnthropicModel
): "gpt-4o" | SurveyAnthropicModel {
  if (model === "claude-opus-4-7") return "claude-opus-4-20250514";
  if (model === "claude-sonnet-4-6") return "claude-sonnet-4-20250514";
  return model;
}

// ── Rate limiting constants ────────────────────────────────────────
const RATE_LIMIT_PER_HOUR = 20;   // max extractions per org per hour
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

// ── OpenAI client ─────────────────────────────────────────────────
function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("AI_UNAVAILABLE: OPENAI_API_KEY not configured");
  return new OpenAI({ apiKey: key });
}

function getAnthropic(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("AI_UNAVAILABLE: ANTHROPIC_API_KEY not configured");
  return new Anthropic({ apiKey: key });
}

function hasOpenAI(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

function hasAnthropic(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function isQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /quota|rate limit|429|billing details|credit balance/i.test(msg);
}

// ── AI health check ───────────────────────────────────────────────
export async function checkAiReadiness(): Promise<{ available: boolean; reason?: string }> {
  if (!process.env.OPENAI_API_KEY) {
    return { available: false, reason: "AI extraction is not configured. Contact your administrator." };
  }
  return { available: true };
}

// ── Rate limiter ──────────────────────────────────────────────────
async function checkRateLimit(orgId: string): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const admin = createAdminClient();
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const { count } = await admin
      .from("ai_extraction_log")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .gte("created_at", since);

    const used = count ?? 0;
    return { allowed: used < RATE_LIMIT_PER_HOUR, remaining: Math.max(0, RATE_LIMIT_PER_HOUR - used) };
  } catch {
    return { allowed: true, remaining: RATE_LIMIT_PER_HOUR }; // fail open on rate check error
  }
}

// ── Persist extraction audit (non-blocking) ───────────────────────
async function persistAudit(payload: {
  orgId: string;
  userId: string;
  inputType: "text" | "image";
  inputHash: string;
  rawExtraction: AiExtractionResult | null;
  critiqueJson: CritiqueResult | null;
  validationErrors: string[];
  confidence: number;
  inputTokens?: number;
  outputTokens?: number;
}) {
  try {
    const admin = createAdminClient();
    await admin.from("ai_extraction_log").insert({
      org_id: payload.orgId,
      user_id: payload.userId,
      input_type: payload.inputType,
      input_hash: payload.inputHash,
      model: "gpt-4o",
      schema_version: "v1",
      raw_extraction: payload.rawExtraction as unknown as Record<string, unknown>,
      critique_json: payload.critiqueJson as unknown as Record<string, unknown>,
      validation_errors: payload.validationErrors,
      confidence: payload.confidence,
      input_tokens: payload.inputTokens,
      output_tokens: payload.outputTokens,
    });
  } catch {
    // Non-blocking — never fail the extraction if audit write fails
  }
}

// ── Core extraction call ──────────────────────────────────────────
async function runExtraction(
  client: OpenAI,
  messages: OpenAI.Chat.ChatCompletionMessageParam[]
): Promise<{ result: AiExtractionResult; inputTokens: number; outputTokens: number }> {
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.1,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "fence_extraction",
        strict: true,
        schema: EXTRACTION_JSON_SCHEMA,
      },
    },
    messages,
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as AiExtractionResult;

  return {
    result: parsed,
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
  };
}

// ── Critique pass ─────────────────────────────────────────────────
async function runCritique(
  client: OpenAI,
  extraction: AiExtractionResult,
  originalInput: string
): Promise<CritiqueResult | null> {
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.1,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "fence_critique",
          strict: true,
          schema: CRITIQUE_JSON_SCHEMA,
        },
      },
      messages: [
        { role: "system", content: CRITIQUE_SYSTEM_PROMPT },
        {
          role: "user",
          content: CRITIQUE_USER_PROMPT(JSON.stringify(extraction, null, 2), originalInput),
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    return JSON.parse(raw) as CritiqueResult;
  } catch {
    return null; // critique is enhancement, not critical path
  }
}

async function runSurveyExtractionOpenAI(
  client: OpenAI,
  base64: string,
  mimeType: "image/png" | "image/jpeg",
  additionalText?: string
): Promise<{ result: AiExtractionResult; inputTokens: number; outputTokens: number }> {
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.1,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "survey_extraction",
        strict: true,
        schema: SURVEY_EXTRACTION_JSON_SCHEMA,
      },
    },
    messages: [
      { role: "system", content: SURVEY_SYSTEM_PROMPT },
      { role: "user", content: SURVEY_USER_PROMPT_IMAGE(base64, mimeType, additionalText) },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as AiExtractionResult;
  return {
    result: parsed,
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
  };
}

async function runSurveyExtractionAnthropic(
  client: Anthropic,
  model: SurveyAnthropicModel,
  base64: string,
  mimeType: "image/png" | "image/jpeg",
  additionalText?: string
): Promise<{ result: AiExtractionResult; inputTokens: number; outputTokens: number }> {
  const userContent: Anthropic.Messages.ContentBlockParam[] = [
    {
      type: "image",
      source: { type: "base64", media_type: mimeType, data: base64 },
    },
    {
      type: "text",
      text: additionalText
        ? `Additional context from contractor: ${additionalText}\n\nThis is a marked-up boundary survey. Extract fence runs from the contractor's colored markup. Use the handwritten legend to decide which color means "new install" vs "existing fence" vs other.`
        : `This is a marked-up boundary survey. Extract fence runs from the contractor's colored markup. Use the handwritten legend to decide which color means "new install" vs "existing fence" vs other.`,
    },
  ];

  const response = await client.messages.create({
    model,
    max_tokens: 16_000,
    system: SURVEY_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
  });

  const textBlock = response.content.find(
    (block): block is Anthropic.Messages.TextBlock => block.type === "text"
  );
  if (!textBlock) {
    throw new Error("Anthropic survey extraction returned no text block");
  }

  const raw = textBlock.text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace < 0) {
    throw new Error(`Could not find JSON object in Anthropic response: ${raw.slice(0, 200)}…`);
  }

  const parsedRaw = JSON.parse(raw.slice(firstBrace, lastBrace + 1));
  const validation = SurveyExtractionSchema.safeParse(parsedRaw);
  const parsed = validation.success
    ? (validation.data as AiExtractionResult)
    : (parsedRaw as AiExtractionResult);

  return {
    result: parsed,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

// ── Image quality ladder ──────────────────────────────────────────
// First pass: detail:"low" (fast + cheap)
// If confidence < 0.75 on key fields → re-run with detail:"high"
async function runImageExtraction(
  client: OpenAI,
  base64: string,
  mimeType: string,
  additionalText?: string
): Promise<{ result: AiExtractionResult; inputTokens: number; outputTokens: number; usedHighDetail: boolean }> {
  // Determine if this looks like an aerial/satellite image based on context clues
  const isLikelyAerial = additionalText?.toLowerCase().match(/aerial|satellite|google maps|overhead|bird.?s? eye|drone|top.?down/) != null;
  const systemPrompt = isLikelyAerial
    ? SYSTEM_PROMPT + "\n" + AERIAL_SYSTEM_ADDENDUM
    : SYSTEM_PROMPT;

  // Pass 1: low detail
  const lowDetailContent = [
    {
      type: "image_url" as const,
      image_url: { url: `data:${mimeType};base64,${base64}`, detail: "low" as const },
    },
    {
      type: "text" as const,
      text: additionalText
        ? `Additional context: ${additionalText}\n\nExtract fence project data from this image.`
        : "Extract fence project data from this image.",
    },
  ];

  const pass1 = await client.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.1,
    response_format: {
      type: "json_schema",
      json_schema: { name: "fence_extraction", strict: true, schema: EXTRACTION_JSON_SCHEMA },
    },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: lowDetailContent },
    ],
  });

  const raw1 = pass1.choices[0]?.message?.content ?? "{}";
  const result1 = JSON.parse(raw1) as AiExtractionResult;

  // Check if we need high detail
  const needsHighDetail =
    result1.confidence < 0.75 ||
    result1.runs.some(r => r.linearFeet === 0) ||
    result1.runs.length === 0;

  if (!needsHighDetail) {
    return {
      result: result1,
      inputTokens: pass1.usage?.prompt_tokens ?? 0,
      outputTokens: pass1.usage?.completion_tokens ?? 0,
      usedHighDetail: false,
    };
  }

  // Pass 2: high detail
  const highDetailContent = [
    {
      type: "image_url" as const,
      image_url: { url: `data:${mimeType};base64,${base64}`, detail: "high" as const },
    },
    {
      type: "text" as const,
      text: `${additionalText ? `Additional context: ${additionalText}\n\n` : ""}Look carefully at all dimensions, measurements, and labels in this image. Extract complete fence project data.`,
    },
  ];

  const pass2 = await client.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.1,
    response_format: {
      type: "json_schema",
      json_schema: { name: "fence_extraction", strict: true, schema: EXTRACTION_JSON_SCHEMA },
    },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: highDetailContent },
    ],
  });

  const raw2 = pass2.choices[0]?.message?.content ?? "{}";
  const result2 = JSON.parse(raw2) as AiExtractionResult;

  return {
    result: result2,
    inputTokens: (pass1.usage?.prompt_tokens ?? 0) + (pass2.usage?.prompt_tokens ?? 0),
    outputTokens: (pass1.usage?.completion_tokens ?? 0) + (pass2.usage?.completion_tokens ?? 0),
    usedHighDetail: true,
  };
}

// ── Auth + profile helper ─────────────────────────────────────────
async function getAuthContext(): Promise<{ userId: string; orgId: string } | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const profile = await ensureProfile(supabase, user);

    return { userId: user.id, orgId: profile.org_id };
  } catch {
    return null;
  }
}

// ── Public: Extract from text ─────────────────────────────────────
export async function extractFromText(
  description: string
): Promise<AiExtractionResponse> {
  // AI readiness check
  const readiness = await checkAiReadiness();
  if (!readiness.available) return { success: false, error: readiness.reason };

  if (!description.trim()) return { success: false, error: "Description is required" };

  const auth = await getAuthContext();
  if (!auth) return { success: false, error: "Not authenticated" };

  // Rate limit
  const rateCheck = await checkRateLimit(auth.orgId);
  if (!rateCheck.allowed) {
    return { success: false, error: `Rate limit reached. You have used ${RATE_LIMIT_PER_HOUR} AI extractions this hour. Try again later.` };
  }

  const inputHash = crypto.createHash("sha256").update(description).digest("hex").slice(0, 16);

  try {
    const client = getOpenAI();

    // Pass 1: Extract
    const { result, inputTokens, outputTokens } = await runExtraction(client, [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Extract fence project data from the following contractor input:\n\n${description}` },
    ]);

    // Validate
    const validation = validateExtraction(result);
    if (validation.data) {
      Object.assign(result, validation.data); // apply sanitized/corrected values
    }

    // Pass 2: Critique (parallel, non-blocking path)
    const critique = await runCritique(client, result, description);
    const scopeRiskAssessment = buildScopeRiskAssessment(description, result, critique);
    result.hiddenCostFlags = detectHiddenCosts(description, result);

    // Merge critique flags into result
    if (critique?.questionsForContractor?.length) {
      result.flags = [...(result.flags ?? []), ...critique.questionsForContractor.slice(0, 3)];
    }

    const validationBlockers = validation.blockers;
    const validationWarnings = validation.warnings;
    const critiqueBlockers = critique?.criticalBlockers ?? [];
    const criticallyBlocked =
      validation.blocked ||
      critiqueBlockers.length > 0 ||
      critique?.overallReadyToApply === false;

    // Persist audit (non-blocking)
    void persistAudit({
      orgId: auth.orgId,
      userId: auth.userId,
      inputType: "text",
      inputHash,
      rawExtraction: result,
      critiqueJson: critique,
      validationErrors: validation.errors,
      confidence: result.confidence,
      inputTokens,
      outputTokens,
    });

    return {
      success: true,
      result,
      critique: critique ?? undefined,
      scopeRiskAssessment,
      validationErrors: validation.errors,
      validationWarnings,
      validationBlockers,
      criticallyBlocked,
      blocked: criticallyBlocked,
      inputTokens,
      outputTokens,
      rateRemaining: rateCheck.remaining - 1,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Extraction failed";
    if (msg.startsWith("AI_UNAVAILABLE")) return { success: false, error: "AI extraction is not available. Contact your administrator." };
    return { success: false, error: msg };
  }
}

// ── Public: Extract from image ────────────────────────────────────
export async function extractFromImage(
  base64: string,
  mimeType: string,
  additionalText?: string
): Promise<AiExtractionResponse> {
  const readiness = await checkAiReadiness();
  if (!readiness.available) return { success: false, error: readiness.reason };

  if (!base64) return { success: false, error: "Image data required" };

  const auth = await getAuthContext();
  if (!auth) return { success: false, error: "Not authenticated" };

  const rateCheck = await checkRateLimit(auth.orgId);
  if (!rateCheck.allowed) {
    return { success: false, error: `Rate limit reached (${RATE_LIMIT_PER_HOUR}/hour). Try again later.` };
  }

  // Size check — keep under 4MB for performance
  const sizeBytes = (base64.length * 3) / 4;
  if (sizeBytes > 4_000_000) {
    return { success: false, error: "Image too large. Please use a photo under 4MB." };
  }

  const inputHash = crypto.createHash("sha256").update(base64.slice(0, 1000)).digest("hex").slice(0, 16);

  try {
    const client = getOpenAI();

    // Image extraction with quality ladder (low → high)
    const { result, inputTokens, outputTokens, usedHighDetail } = await runImageExtraction(
      client, base64, mimeType, additionalText
    );

    // Validate
    const validation = validateExtraction(result);
    if (validation.data) Object.assign(result, validation.data);

    // Add detail flag
    if (usedHighDetail) {
      result.flags = [`Used high-detail analysis (confidence was low on first pass)`, ...(result.flags ?? [])];
    }

    // Critique pass
    const critiqueInput = additionalText ?? "Image upload (no additional context)";
    const critique = await runCritique(client, result, critiqueInput);
    const scopeRiskAssessment = buildScopeRiskAssessment(critiqueInput, result, critique);
    result.hiddenCostFlags = detectHiddenCosts(critiqueInput, result);
    if (critique?.questionsForContractor?.length) {
      result.flags = [...(result.flags ?? []), ...critique.questionsForContractor.slice(0, 3)];
    }

    const validationBlockers = validation.blockers;
    const validationWarnings = validation.warnings;
    const critiqueBlockers = critique?.criticalBlockers ?? [];
    const criticallyBlocked =
      validation.blocked ||
      critiqueBlockers.length > 0 ||
      critique?.overallReadyToApply === false;

    // Persist audit
    void persistAudit({
      orgId: auth.orgId,
      userId: auth.userId,
      inputType: "image",
      inputHash,
      rawExtraction: result,
      critiqueJson: critique,
      validationErrors: validation.errors,
      confidence: result.confidence,
      inputTokens,
      outputTokens,
    });

    return {
      success: true,
      result,
      critique: critique ?? undefined,
      scopeRiskAssessment,
      validationErrors: validation.errors,
      validationWarnings,
      validationBlockers,
      criticallyBlocked,
      blocked: criticallyBlocked,
      inputTokens,
      outputTokens,
      rateRemaining: rateCheck.remaining - 1,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Image extraction failed";
    return { success: false, error: msg };
  }
}

// Survey uploads are client-rasterized to image data before they hit the
// server action, so the image extraction path is a safe baseline when the
// richer survey-specific pipeline is not present on this branch.
export async function extractFromSurvey(
  base64: string,
  mimeType: string,
  additionalText?: string,
  model:
    | "gpt-4o"
    | "claude-opus-4-7"
    | "claude-sonnet-4-6"
    | SurveyAnthropicModel = "claude-sonnet-4-20250514"
): Promise<AiExtractionResponse> {
  if (!base64) return { success: false, error: "Survey image data required" };

  if (!hasAnthropic() && !hasOpenAI()) {
    return {
      success: false,
      error: "Survey extraction is not configured. Add ANTHROPIC_API_KEY or OPENAI_API_KEY.",
    };
  }

  const auth = await getAuthContext();
  if (!auth) return { success: false, error: "Not authenticated" };

  const rateCheck = await checkRateLimit(auth.orgId);
  if (!rateCheck.allowed) {
    return { success: false, error: `Rate limit reached (${RATE_LIMIT_PER_HOUR}/hour). Try again later.` };
  }

  const sizeBytes = (base64.length * 3) / 4;
  if (sizeBytes > 12_500_000) {
    return {
      success: false,
      error: "Survey image is too large to send. Crop the PDF to the marked area or export a smaller first page.",
    };
  }

  const inputHash = crypto.createHash("sha256").update(base64.slice(0, 1000)).digest("hex").slice(0, 16);
  const requestedModel = normalizeSurveyModel(model);

  const preferredAnthropic = requestedModel.startsWith("claude");
  const tried: string[] = [];

  try {
    let result: AiExtractionResult;
    let inputTokens = 0;
    let outputTokens = 0;
    let modelUsed: "gpt-4o" | SurveyAnthropicModel;

    try {
      if (preferredAnthropic) {
        tried.push(requestedModel);
        const client = getAnthropic();
        const run = await runSurveyExtractionAnthropic(
          client,
          requestedModel as SurveyAnthropicModel,
          base64,
          mimeType as "image/png" | "image/jpeg",
          additionalText
        );
        ({ result, inputTokens, outputTokens } = run);
        modelUsed = requestedModel;
      } else {
        tried.push("gpt-4o");
        const client = getOpenAI();
        const run = await runSurveyExtractionOpenAI(
          client,
          base64,
          mimeType as "image/png" | "image/jpeg",
          additionalText
        );
        ({ result, inputTokens, outputTokens } = run);
        modelUsed = "gpt-4o";
      }
    } catch (primaryErr) {
      if (preferredAnthropic && !hasAnthropic() && hasOpenAI()) {
        tried.push("gpt-4o");
        const client = getOpenAI();
        const run = await runSurveyExtractionOpenAI(
          client,
          base64,
          mimeType as "image/png" | "image/jpeg",
          additionalText
        );
        ({ result, inputTokens, outputTokens } = run);
        modelUsed = "gpt-4o";
      } else if (!preferredAnthropic && hasAnthropic() && isQuotaError(primaryErr)) {
        const fallbackModel: SurveyAnthropicModel = "claude-sonnet-4-20250514";
        tried.push(fallbackModel);
        const client = getAnthropic();
        const run = await runSurveyExtractionAnthropic(
          client,
          fallbackModel,
          base64,
          mimeType as "image/png" | "image/jpeg",
          additionalText
        );
        ({ result, inputTokens, outputTokens } = run);
        modelUsed = fallbackModel;
      } else {
        throw primaryErr;
      }
    }

    const validation = validateExtraction(result);
    if (validation.data) Object.assign(result, validation.data);

    let critique: CritiqueResult | null = null;
    if (hasOpenAI()) {
      try {
        critique = await runCritique(
          getOpenAI(),
          result,
          additionalText ?? "Survey upload"
        );
      } catch {
        critique = null;
      }
    }

    const critiqueInput = additionalText ?? "Survey upload";
    const scopeRiskAssessment = buildScopeRiskAssessment(critiqueInput, result, critique);
    result.hiddenCostFlags = detectHiddenCosts(critiqueInput, result);
    if (critique?.questionsForContractor?.length) {
      result.flags = [...(result.flags ?? []), ...critique.questionsForContractor.slice(0, 3)];
    }
    if (tried.length > 1) {
      result.flags = [`Primary survey extractor failed, fell back to ${modelUsed}.`, ...(result.flags ?? [])];
    }

    const validationBlockers = validation.blockers;
    const validationWarnings = validation.warnings;
    const critiqueBlockers = critique?.criticalBlockers ?? [];
    const criticallyBlocked =
      validation.blocked ||
      critiqueBlockers.length > 0 ||
      critique?.overallReadyToApply === false;

    void persistAudit({
      orgId: auth.orgId,
      userId: auth.userId,
      inputType: "image",
      inputHash,
      rawExtraction: result,
      critiqueJson: critique,
      validationErrors: validation.errors,
      confidence: result.confidence,
      inputTokens,
      outputTokens,
    });

    return {
      success: true,
      modelUsed,
      result,
      critique: critique ?? undefined,
      scopeRiskAssessment,
      validationErrors: validation.errors,
      validationWarnings,
      validationBlockers,
      criticallyBlocked,
      blocked: criticallyBlocked,
      inputTokens,
      outputTokens,
      rateRemaining: rateCheck.remaining - 1,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Survey extraction failed";
    if (/AI_UNAVAILABLE/.test(msg)) {
      return {
        success: false,
        error: "Survey extraction is not configured. Add ANTHROPIC_API_KEY or OPENAI_API_KEY.",
      };
    }
    if (preferredAnthropic && isQuotaError(err)) {
      return {
        success: false,
        error: "Claude survey extraction hit an Anthropic quota or billing limit. Check the Anthropic plan tied to this key.",
      };
    }
    if (isQuotaError(err) && !hasAnthropic()) {
      return {
        success: false,
        error: "OpenAI quota is exhausted. Add ANTHROPIC_API_KEY to use Claude for marked survey extraction.",
      };
    }
    return { success: false, error: msg };
  }
}
