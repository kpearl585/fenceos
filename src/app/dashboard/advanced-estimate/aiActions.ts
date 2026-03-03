"use server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";
import { SYSTEM_PROMPT, USER_PROMPT_TEXT, USER_PROMPT_IMAGE } from "@/lib/fence-graph/ai-extract/prompt";
import type { AiExtractionResponse, AiExtractionResult } from "@/lib/fence-graph/ai-extract/types";

function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not configured");
  return new OpenAI({ apiKey: key });
}

// ── Extract from text description ────────────────────────────────
export async function extractFromText(
  description: string
): Promise<AiExtractionResponse> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    if (!description.trim()) return { success: false, error: "Description is required" };

    const client = getOpenAI();
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: USER_PROMPT_TEXT(description) },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as AiExtractionResult;

    return {
      success: true,
      result: parsed,
      inputTokens: response.usage?.prompt_tokens,
      outputTokens: response.usage?.completion_tokens,
    };
  } catch (err: unknown) {
    console.error("AI extraction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Extraction failed" };
  }
}

// ── Extract from image (photo, sketch, plan) ──────────────────────
export async function extractFromImage(
  base64: string,
  mimeType: string,
  additionalText?: string
): Promise<AiExtractionResponse> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    if (!base64) return { success: false, error: "Image data required" };

    // Size check — GPT-4o max ~20MB, but keep it under 4MB for speed
    const sizeBytes = (base64.length * 3) / 4;
    if (sizeBytes > 4_000_000) {
      return { success: false, error: "Image too large. Please use a photo under 4MB." };
    }

    const client = getOpenAI();
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: USER_PROMPT_IMAGE(base64, mimeType, additionalText),
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as AiExtractionResult;

    return {
      success: true,
      result: parsed,
      inputTokens: response.usage?.prompt_tokens,
      outputTokens: response.usage?.completion_tokens,
    };
  } catch (err: unknown) {
    console.error("AI image extraction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Image extraction failed" };
  }
}
