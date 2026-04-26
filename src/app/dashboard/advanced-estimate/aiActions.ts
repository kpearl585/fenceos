"use server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import OpenAI from "openai";
import { SYSTEM_PROMPT, USER_PROMPT_TEXT, USER_PROMPT_IMAGE, AERIAL_SYSTEM_ADDENDUM } from "@/lib/fence-graph/ai-extract/prompt";
import { CRITIQUE_SYSTEM_PROMPT, CRITIQUE_USER_PROMPT } from "@/lib/fence-graph/ai-extract/critique-prompt";
import { EXTRACTION_JSON_SCHEMA, CRITIQUE_JSON_SCHEMA, validateExtraction } from "@/lib/fence-graph/ai-extract/schema";
import type { AiExtractionResponse, AiExtractionResult } from "@/lib/fence-graph/ai-extract/types";
import type { CritiqueResult } from "@/lib/fence-graph/ai-extract/types";
import { detectHiddenCosts } from "@/lib/fence-graph/ai-extract/hiddenCostDetection";
import { buildScopeRiskAssessment } from "@/lib/fence-graph/ai-extract/scopeRisk";
import crypto from "crypto";

// ── Rate limiting constants ────────────────────────────────────────
const RATE_LIMIT_PER_HOUR = 20;   // max extractions per org per hour
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

// ── OpenAI client ─────────────────────────────────────────────────
function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("AI_UNAVAILABLE: OPENAI_API_KEY not configured");
  return new OpenAI({ apiKey: key });
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
  _model: "gpt-4o" | "claude-opus-4-7" = "gpt-4o"
): Promise<AiExtractionResponse> {
  return extractFromImage(base64, mimeType, additionalText);
}
