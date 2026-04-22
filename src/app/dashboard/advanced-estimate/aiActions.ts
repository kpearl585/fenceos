"use server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import * as Sentry from "@sentry/nextjs";
import { SYSTEM_PROMPT, USER_PROMPT_TEXT, USER_PROMPT_IMAGE } from "@/lib/fence-graph/ai-extract/prompt";
import { SURVEY_SYSTEM_PROMPT } from "@/lib/fence-graph/ai-extract/survey-prompt";
import { CRITIQUE_SYSTEM_PROMPT, CRITIQUE_USER_PROMPT } from "@/lib/fence-graph/ai-extract/critique-prompt";
import {
  EXTRACTION_JSON_SCHEMA,
  SURVEY_EXTRACTION_JSON_SCHEMA,
  SurveyExtractionSchema,
  CRITIQUE_JSON_SCHEMA,
  validateExtraction,
} from "@/lib/fence-graph/ai-extract/schema";
import type { AiExtractionResponse, AiExtractionResult } from "@/lib/fence-graph/ai-extract/types";
import type { CritiqueResult } from "@/lib/fence-graph/ai-extract/types";
import { detectHiddenCosts } from "@/lib/fence-graph/ai-extract/hiddenCostDetection";
import { instrument } from "@/lib/observability/estimator-instrumentation";
import { enforceBillingGate } from "@/lib/subscription";
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

// ── Anthropic client ──────────────────────────────────────────────
// Used only by the survey extraction path when the contractor opts in
// to higher-accuracy re-run. A/B eval (2026-04-22) showed Claude Opus
// 4.7 beat GPT-4o on the hardest survey case (Calesa: 2.7% LF error
// vs 15%), at 5.3× the cost and 4× the latency. Worth the premium
// as an opt-in escalation, not as the default path.
function getAnthropic(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error("AI_UNAVAILABLE: ANTHROPIC_API_KEY not configured — high-accuracy escalation unavailable");
  }
  return new Anthropic({ apiKey: key });
}

// ── Supported extraction models ───────────────────────────────────
export type SurveyExtractionModel = "gpt-4o" | "claude-opus-4-7";

// ── AI health check ───────────────────────────────────────────────
export async function checkAiReadiness(): Promise<{ available: boolean; reason?: string }> {
  if (!process.env.OPENAI_API_KEY) {
    return { available: false, reason: "AI extraction is not configured. Contact your administrator." };
  }
  return { available: true };
}

// ── Rate limiter ──────────────────────────────────────────────────
// Fails CLOSED on DB error so a Supabase outage cannot bypass the
// per-org GPT-4o budget. Errors are captured to Sentry so an outage
// is observable even when the user-facing message is generic.
async function checkRateLimit(orgId: string): Promise<{ allowed: boolean; remaining: number; error?: string }> {
  try {
    const admin = createAdminClient();
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const { count, error } = await admin
      .from("ai_extraction_log")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .gte("created_at", since);

    if (error) throw error;
    const used = count ?? 0;
    return { allowed: used < RATE_LIMIT_PER_HOUR, remaining: Math.max(0, RATE_LIMIT_PER_HOUR - used) };
  } catch (err) {
    Sentry.captureException(err, {
      tags: { feature: "ai-extraction", step: "rate-limit-check" },
      level: "warning",
    });
    return {
      allowed: false,
      remaining: 0,
      error: "Rate limit check temporarily unavailable. Please retry in a moment.",
    };
  }
}

// ── Persist extraction audit (non-blocking) ───────────────────────
async function persistAudit(payload: {
  orgId: string;
  userId: string;
  inputType: "text" | "image" | "survey";
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
// `systemPrompt` lets survey extraction swap the prompt without forking
// the whole extraction helper — survey images need different guidance
// than generic "yard photo" images, but the quality-ladder logic is
// identical.
// `jsonSchema` lets survey extraction swap in a structured-CoT schema
// variant (observedDimensions + observedAnnotations) without affecting
// photo extraction. The response object is a superset of AiExtractionResult
// so callers can safely read the shared fields.
// `skipLowDetailPass` is for survey: handwriting and small dims aren't
// readable at detail:"low", so pass 1 just burns tokens on surveys.
async function runImageExtraction(
  client: OpenAI,
  base64: string,
  mimeType: string,
  additionalText?: string,
  systemPrompt: string = SYSTEM_PROMPT,
  jsonSchema: Record<string, unknown> = EXTRACTION_JSON_SCHEMA,
  skipLowDetailPass: boolean = false,
): Promise<{ result: AiExtractionResult; inputTokens: number; outputTokens: number; usedHighDetail: boolean }> {
  // Pass 1: low detail (skipped for surveys)
  if (!skipLowDetailPass) {
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
        json_schema: { name: "fence_extraction", strict: true, schema: jsonSchema },
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
  }

  // Pass 2 (or only pass, for surveys): high detail
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
      json_schema: { name: "fence_extraction", strict: true, schema: jsonSchema },
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
    inputTokens: pass2.usage?.prompt_tokens ?? 0,
    outputTokens: pass2.usage?.completion_tokens ?? 0,
    usedHighDetail: true,
  };
}

// ── Auth + profile helper ─────────────────────────────────────────
async function getAuthContext(): Promise<{ userId: string; orgId: string } | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("users").select("org_id").eq("auth_id", user.id).single();
    if (!profile) return null;

    return { userId: user.id, orgId: profile.org_id };
  } catch {
    return null;
  }
}

// ── Survey extraction via Claude Opus 4.7 (opt-in escalation) ─────
// Claude doesn't expose OpenAI's strict json_schema mode, so we ask
// for the JSON shape in the prompt, parse the text block, and
// Zod-validate. Used only when the contractor explicitly clicks
// "Re-run with higher accuracy" in the survey review UI.
async function runSurveyExtractionAnthropic(
  client: Anthropic,
  base64: string,
  mimeType: "image/png" | "image/jpeg",
  additionalText?: string,
): Promise<{ result: AiExtractionResult; inputTokens: number; outputTokens: number }> {
  const text = additionalText
    ? `Additional context from contractor: ${additionalText}\n\nThis is a marked-up boundary survey. Extract fence runs from the contractor's colored markup. Use the handwritten legend to decide which color means "new install" vs "existing fence" vs other.`
    : `This is a marked-up boundary survey. Extract fence runs from the contractor's colored markup. Use the handwritten legend to decide which color means "new install" vs "existing fence" vs other.`;

  const response = await client.messages.create({
    model: "claude-opus-4-7",
    // Survey extractions are ~500-2000 output tokens with CoT; 16K is
    // comfortable headroom and stays under the streaming-required cap.
    max_tokens: 16_000,
    system: SURVEY_SYSTEM_PROMPT,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: mimeType, data: base64 } },
        { type: "text", text },
      ],
    }],
  });

  const textBlock = response.content.find(
    (b): b is Anthropic.Messages.TextBlock => b.type === "text",
  );
  if (!textBlock) throw new Error("Claude response had no text block");

  const raw = textBlock.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace < 0) {
    throw new Error("Claude response didn't contain a JSON object");
  }
  const parsedRaw = JSON.parse(raw.slice(firstBrace, lastBrace + 1));

  const validation = SurveyExtractionSchema.safeParse(parsedRaw);
  const result: AiExtractionResult = validation.success
    ? (validation.data as AiExtractionResult)
    : (parsedRaw as AiExtractionResult);

  return {
    result,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

// ── Resize base64 PNG to fit Anthropic's 5 MB vision ceiling ──────
// 400 DPI client rasterization produces ~8 MB PNGs which exceed
// Claude's per-image input limit. Downscale to ~3 MB so payload
// sits comfortably under the cap after base64 overhead (~33%).
// Sharp is dynamically imported — only loads on the escalation path.
async function resizeForAnthropic(base64Png: string): Promise<{ base64: string; mimeType: "image/png" }> {
  const sizeBytes = (base64Png.length * 3) / 4;
  if (sizeBytes <= 3_500_000) {
    return { base64: base64Png, mimeType: "image/png" };
  }
  const sharp = (await import("sharp")).default;
  const input = Buffer.from(base64Png, "base64");
  const meta = await sharp(input).metadata();
  const originalWidth = meta.width ?? 2400;
  const targetBytes = 3_000_000;
  const linearScale = Math.min(1, Math.sqrt(targetBytes / sizeBytes));
  const newWidth = Math.round(originalWidth * linearScale);
  const resized = await sharp(input)
    .resize({ width: newWidth, withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toBuffer();
  return { base64: resized.toString("base64"), mimeType: "image/png" };
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

  // ✅ BILLING: AI extraction costs real money — enforce subscription + cap.
  const billingBlock = await enforceBillingGate(auth.orgId);
  if (billingBlock) return billingBlock;

  // Rate limit (fails CLOSED on DB error)
  const rateCheck = await checkRateLimit(auth.orgId);
  if (!rateCheck.allowed) {
    return {
      success: false,
      error: rateCheck.error ?? `Rate limit reached. You have used ${RATE_LIMIT_PER_HOUR} AI extractions this hour. Try again later.`,
    };
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

    // Merge critique flags into result
    if (critique?.questionsForContractor?.length) {
      result.flags = [...(result.flags ?? []), ...critique.questionsForContractor.slice(0, 3)];
    }

    // Detect hidden cost flags
    result.hiddenCostFlags = detectHiddenCosts(description, result);

    // Compute the unified critically-blocked flag the UI uses to gate Apply.
    // Any of: schema/business-rule blocker, critique critical blocker, or
    // critique LLM explicit "not ready to apply" verdict.
    const criticallyBlocked =
      validation.blocked ||
      (critique?.criticalBlockers?.length ?? 0) > 0 ||
      (critique != null && critique.overallReadyToApply === false);

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

    instrument.aiExtractionCompleted({
      inputType: "text",
      confidence: result.confidence,
      runCount: result.runs.length,
      blocked: criticallyBlocked,
      inputTokens,
      outputTokens,
    });

    return {
      success: true,
      result,
      critique: critique ?? undefined,
      validationErrors: validation.errors,
      validationBlockers: validation.blockers,
      validationWarnings: validation.warnings,
      blocked: validation.blocked,
      criticallyBlocked,
      inputTokens,
      outputTokens,
      rateRemaining: rateCheck.remaining - 1,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Extraction failed";
    if (msg.startsWith("AI_UNAVAILABLE")) return { success: false, error: "AI extraction is not available. Contact your administrator." };
    Sentry.captureException(err, {
      tags: { feature: "ai-extraction", step: "extract-text" },
      level: "error",
    });
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

  // ✅ BILLING: AI image extraction costs real money — enforce sub + cap.
  const billingBlock = await enforceBillingGate(auth.orgId);
  if (billingBlock) return billingBlock;

  const rateCheck = await checkRateLimit(auth.orgId);
  if (!rateCheck.allowed) {
    return {
      success: false,
      error: rateCheck.error ?? `Rate limit reached (${RATE_LIMIT_PER_HOUR}/hour). Try again later.`,
    };
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
    if (critique?.questionsForContractor?.length) {
      result.flags = [...(result.flags ?? []), ...critique.questionsForContractor.slice(0, 3)];
    }

    // Detect hidden cost flags (use additionalText if available)
    result.hiddenCostFlags = detectHiddenCosts(additionalText || "", result);

    // Same critically-blocked flag the text path uses.
    const criticallyBlocked =
      validation.blocked ||
      (critique?.criticalBlockers?.length ?? 0) > 0 ||
      (critique != null && critique.overallReadyToApply === false);

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
      validationErrors: validation.errors,
      validationBlockers: validation.blockers,
      validationWarnings: validation.warnings,
      blocked: validation.blocked,
      criticallyBlocked,
      inputTokens,
      outputTokens,
      rateRemaining: rateCheck.remaining - 1,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Image extraction failed";
    Sentry.captureException(err, {
      tags: { feature: "ai-extraction", step: "extract-image" },
      level: "error",
    });
    return { success: false, error: msg };
  }
}

// ── Public: Extract from marked survey ────────────────────────────
// Contractor uploads a marked-up boundary survey / plat / site plan
// (rendered to PNG client-side from the uploaded PDF at 400 DPI).
// Default extraction uses GPT-4o; contractors can opt into a
// higher-accuracy re-run with Claude Opus 4.7 from the review UI,
// which trades ~$0.10 extra + ~30s latency for meaningfully better
// reads on hard cases (complex markup, partial runs, mid-run gates).
//
// Model choice flows through `model` — caller is the review UI.
// Critique still runs via GPT-4o regardless; model diversity on the
// critique side is a feature, not a bug.
export async function extractFromSurvey(
  base64: string,
  mimeType: string,
  additionalText?: string,
  model: SurveyExtractionModel = "gpt-4o",
): Promise<AiExtractionResponse> {
  const readiness = await checkAiReadiness();
  if (!readiness.available) return { success: false, error: readiness.reason };

  if (!base64) return { success: false, error: "Survey image data required" };

  const auth = await getAuthContext();
  if (!auth) return { success: false, error: "Not authenticated" };

  // BILLING: Survey extraction is GPT-4o image + often needs high-detail pass.
  const billingBlock = await enforceBillingGate(auth.orgId);
  if (billingBlock) return billingBlock;

  const rateCheck = await checkRateLimit(auth.orgId);
  if (!rateCheck.allowed) {
    return {
      success: false,
      error: rateCheck.error ?? `Rate limit reached (${RATE_LIMIT_PER_HOUR}/hour). Try again later.`,
    };
  }

  // 400 DPI client rasterization produces ~6-10 MB base64 for a
  // letter-size plat, and larger or multi-page surveys can push
  // ~15 MB. Next.js `serverActions.bodySizeLimit` is 20 MB (see
  // next.config.js), so enforcing 16 MB here leaves headroom for
  // request framing + gives the user a clear "too large" error
  // instead of the generic 413 Next.js returns when the body limit
  // is blown (Sentry FENCEOS-9).
  const sizeBytes = (base64.length * 3) / 4;
  if (sizeBytes > 16_000_000) {
    return { success: false, error: "Rendered survey too large. Try a lower-resolution PDF or crop to a single page." };
  }

  const inputHash = crypto.createHash("sha256").update(base64.slice(0, 1000)).digest("hex").slice(0, 16);

  try {
    const client = getOpenAI();

    // Run primary extraction on the selected model
    let result: AiExtractionResult;
    let inputTokens = 0;
    let outputTokens = 0;
    let usedHighDetail = false;

    if (model === "claude-opus-4-7") {
      // Claude caps vision inputs at ~5 MB. Downscale if the 400 DPI
      // render came in larger. Degrades image detail vs GPT-4o but
      // A/B shows Opus still beats GPT-4o on hard cases even at lower
      // DPI — the CoT reasoning matters more than pixel resolution.
      const anthropic = getAnthropic();
      const resized = await resizeForAnthropic(base64);
      const claudeResult = await runSurveyExtractionAnthropic(
        anthropic,
        resized.base64,
        resized.mimeType,
        additionalText,
      );
      result = claudeResult.result;
      inputTokens = claudeResult.inputTokens;
      outputTokens = claudeResult.outputTokens;
      usedHighDetail = true; // Claude Opus always gets the full image (post-resize)
    } else {
      // Default: GPT-4o via the existing quality ladder
      const gptResult = await runImageExtraction(
        client,
        base64,
        mimeType,
        additionalText,
        SURVEY_SYSTEM_PROMPT,
        SURVEY_EXTRACTION_JSON_SCHEMA,
        // Surveys need high detail — handwriting + small printed dims are
        // unreadable at detail:"low", so skip the cheap first pass.
        /* skipLowDetailPass */ true,
      );
      result = gptResult.result;
      inputTokens = gptResult.inputTokens;
      outputTokens = gptResult.outputTokens;
      usedHighDetail = gptResult.usedHighDetail;
    }

    const validation = validateExtraction(result);
    if (validation.data) Object.assign(result, validation.data);

    if (model === "claude-opus-4-7") {
      result.flags = [`Extracted via Claude Opus 4.7 (higher-accuracy mode)`, ...(result.flags ?? [])];
    } else if (usedHighDetail) {
      result.flags = [`Used high-detail analysis (confidence was low on first pass)`, ...(result.flags ?? [])];
    }

    const critiqueInput = additionalText ?? "Marked survey upload (no additional contractor notes)";
    const critique = await runCritique(client, result, critiqueInput);
    if (critique?.questionsForContractor?.length) {
      result.flags = [...(result.flags ?? []), ...critique.questionsForContractor.slice(0, 3)];
    }

    result.hiddenCostFlags = detectHiddenCosts(additionalText || "", result);

    const criticallyBlocked =
      validation.blocked ||
      (critique?.criticalBlockers?.length ?? 0) > 0 ||
      (critique != null && critique.overallReadyToApply === false);

    void persistAudit({
      orgId: auth.orgId,
      userId: auth.userId,
      inputType: "survey",
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
      validationErrors: validation.errors,
      validationBlockers: validation.blockers,
      validationWarnings: validation.warnings,
      blocked: validation.blocked,
      criticallyBlocked,
      inputTokens,
      outputTokens,
      rateRemaining: rateCheck.remaining - 1,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Survey extraction failed";
    Sentry.captureException(err, {
      tags: { feature: "ai-extraction", step: "extract-survey" },
      level: "error",
    });
    return { success: false, error: msg };
  }
}
