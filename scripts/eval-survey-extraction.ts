#!/usr/bin/env tsx
/**
 * Survey Extraction Eval Harness
 *
 * Runs SURVEY_SYSTEM_PROMPT against a directory of real marked-up survey
 * samples (default: ~/Fence Pro Data/fence-survey-samples/), captures the
 * raw GPT-4o output, and scores each sample against a per-file rubric
 * derived from the sample set's README. Writes a markdown report under
 * eval-runs/ so iteration history stays readable.
 *
 * Use: npm run eval:survey
 *      SURVEY_SAMPLES_DIR=/custom/path npm run eval:survey
 *
 * PDFs must be pre-rasterized to PNG next to the original (same basename,
 * .png extension). pdftoppm -r 200 -png -singlefile <pdf> <stem> works.
 * This is on purpose — the eval scores the prompt, not the rasterizer.
 */

import { config } from "dotenv";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

// override: true so .env.local wins over any shell-exported vars.
// Without this, a pre-existing empty ANTHROPIC_API_KEY in the shell
// environment silently blocks the real key from loading.
config({ path: path.resolve(process.cwd(), ".env.local"), override: true });

import {
  SURVEY_SYSTEM_PROMPT,
  SURVEY_USER_PROMPT_IMAGE,
} from "../src/lib/fence-graph/ai-extract/survey-prompt";
import {
  SURVEY_EXTRACTION_JSON_SCHEMA,
  SurveyExtractionSchema,
} from "../src/lib/fence-graph/ai-extract/schema";
import type { AiExtractionResult } from "../src/lib/fence-graph/ai-extract/types";

// ────────────────────────────────────────────────────────────────────
// Backends
//
// Each backend is a provider + model tuple. We test the same prompt
// across different vision models so Kelvin can see real numbers rather
// than vibes on "which is more accurate."
//
// Costs are per 1M tokens (vendor list prices as of the skill-cached
// catalog). OpenAI o-series etc. are intentionally absent — they don't
// improve on GPT-4o for vision.
// ────────────────────────────────────────────────────────────────────

type Backend = "gpt-4o" | "claude-sonnet-4-6" | "claude-opus-4-7";

const BACKENDS: Record<
  Backend,
  { label: string; provider: "openai" | "anthropic"; inputPer1M: number; outputPer1M: number }
> = {
  "gpt-4o": { label: "GPT-4o", provider: "openai", inputPer1M: 2.5, outputPer1M: 10 },
  "claude-sonnet-4-6": { label: "Claude Sonnet 4.6", provider: "anthropic", inputPer1M: 3, outputPer1M: 15 },
  "claude-opus-4-7": { label: "Claude Opus 4.7", provider: "anthropic", inputPer1M: 5, outputPer1M: 25 },
};

function resolveBackendsFromArgv(): Backend[] {
  // CLI: `tsx eval-survey-extraction.ts [<backend> | ab | all]`
  // Env override: MODEL=ab / MODEL=gpt-4o / MODEL=claude-opus-4-7
  const arg = (process.argv[2] ?? process.env.MODEL ?? "gpt-4o").toLowerCase();
  if (arg === "ab" || arg === "all") {
    return ["gpt-4o", "claude-sonnet-4-6", "claude-opus-4-7"];
  }
  if (arg === "gpt-4o" || arg === "claude-sonnet-4-6" || arg === "claude-opus-4-7") {
    return [arg];
  }
  throw new Error(
    `Unknown backend '${arg}'. Pass one of: gpt-4o, claude-sonnet-4-6, claude-opus-4-7, ab`
  );
}

// Survey extraction has two extra observation fields not in the shared
// AiExtractionResult type. They're read from the response for reporting;
// they don't flow downstream.
type SurveyExtractionResult = AiExtractionResult & {
  observedDimensions?: string[];
  observedAnnotations?: string[];
};

// ────────────────────────────────────────────────────────────────────
// Per-sample rubric
//
// Co-Claude's sample README stratifies inputs on legend presence,
// dimensions, markup medium etc. We encode each axis as a pass/fail
// predicate so the harness can say "baseline got 3/6 right" without
// hand-labeling runs.
//
// Two scoring modes:
//   "extract": expect a real extraction — ≥1 run with LF > 0, confidence
//              above floor, optional numeric expectations
//   "refuse":  expect graceful failure — runs:[] or confidence below
//              ceiling, ideally flags explain why
// ────────────────────────────────────────────────────────────────────

type Rubric =
  | {
      mode: "extract";
      minRuns: number;
      maxRuns?: number;
      minConfidence: number;
      expectedTotalLf?: { value: number; tolerancePct: number };
      expectedFenceType?: "vinyl" | "wood" | "chain_link" | "aluminum";
      expectedGateCount?: number;
      notes: string;
    }
  | {
      mode: "refuse";
      maxConfidence: number;
      flagHintRegex?: RegExp;
      notes: string;
    };

const RUBRICS: Record<string, Rubric> = {
  "00_keegan_original_marked-survey": {
    mode: "extract",
    // Verified ground truth from customer (2026-04-21):
    //   5 runs green: 73 (rear) + 92 (west, partial to corner) + 6.5 (connector)
    //                 + 6 (post-gate to house) + 5 (house-to-neighbor right side)
    //   1 gate: 5' walk gate between the 6.5 and 6 ft runs
    //   Right side (east) is BLUE = existing, must NOT be counted
    // Total new fence: 182.5 LF, 6' white vinyl privacy
    minRuns: 4,
    maxRuns: 6,
    minConfidence: 0.7,
    expectedTotalLf: { value: 182.5, tolerancePct: 0.1 },
    expectedFenceType: "vinyl",
    expectedGateCount: 1,
    notes:
      "Canonical hard case. Tests: legend compliance (blue=existing must be excluded), mid-run gates, partial runs with handwritten dims over printed property dims, and short connector segments (5-7 ft).",
  },
  "01_raleigh_pink-marker_homeowner": {
    // Printed plat, pink highlighter only, NO legend, NO written dimensions
    // on the plan. A disciplined reader should flag lack of dims and
    // either refuse OR return runs with zero LF + loud flags.
    mode: "extract",
    minRuns: 0,
    minConfidence: 0,
    notes:
      "Pink-marker homeowner markup, no legend, no dimensions. Expect low confidence + flags calling out missing dims. Either runs=[] or runs with LF=0 + flag is acceptable.",
  },
  "01b_raleigh_hand-circled-fence-style": {
    mode: "refuse",
    maxConfidence: 0.4,
    flagHintRegex: /brochure|catalog|style|not.{0,10}(plat|survey)/i,
    notes:
      "This is a product brochure with a style circled — not a plat. Conflation test: prompt must NOT emit runs.",
  },
  "02_bigjerrys_digital-3color-markup_contractor": {
    mode: "extract",
    // Ground truth from fence-estimating-training-dossier.md entry #8:
    //   Fence type: horizontal wood semi-privacy ("The Skyline")
    //   Gates: 4' single walk + 8' double drive
    //   3-color digital legend: red=new, blue=distance-markers, green=old-staying
    // Regression canary: whatever prompt changes we make, this must stay green.
    minRuns: 3,
    minConfidence: 0.8,
    expectedFenceType: "wood",
    expectedGateCount: 2,
    notes:
      "Big Jerry's digital 3-color contractor markup with explicit legend + 4' walk + 8' double drive gates. Dossier-verified ground truth. Regression canary.",
  },
  "03_dcdob_pencil-xmarks_homeowner": {
    // Open question per advisor — current prompt says 'colored highlighter
    // lines = runs' so pencil X-marks may not trigger. Don't pre-score —
    // observe what happens, decide if prompt needs X-mark handling.
    mode: "extract",
    minRuns: 0,
    minConfidence: 0,
    notes:
      "DC DOB example: pencil X-marks as a symbolic convention, 'EXISTING HOUSE' / 'NEW DECK' lettered. Open question — prompt may refuse OR interpret X-marks.",
  },
  "04_graphpaper_sharpie-sketch_homeowner": {
    mode: "refuse",
    maxConfidence: 0.4,
    flagHintRegex: /sketch|not.{0,10}(plat|survey)|graph.paper|freehand/i,
    notes:
      "Graph-paper sharpie sketch, no underlying plat. Expected to refuse gracefully.",
  },
  "05_graphpaper_rough-sketch_homeowner": {
    mode: "refuse",
    maxConfidence: 0.4,
    flagHintRegex: /sketch|not.{0,10}(plat|survey)|graph.paper|freehand/i,
    notes:
      "Rough pen sketch on graph paper. Similar to 04 but sparser. Expected to refuse gracefully.",
  },
};

// ────────────────────────────────────────────────────────────────────
// Scoring
// ────────────────────────────────────────────────────────────────────

interface SampleResult {
  sampleId: string;
  backend: Backend;
  imagePath: string;
  sizeBytes: number;
  passed: boolean;
  rubric: Rubric;
  actual: SurveyExtractionResult;
  failures: string[];
  notes: string[];
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
  error?: string;
}

function scoreResult(
  rubric: Rubric,
  actual: SurveyExtractionResult
): { passed: boolean; failures: string[]; notes: string[] } {
  const failures: string[] = [];
  const notes: string[] = [];

  const totalLf = actual.runs.reduce((s, r) => s + r.linearFeet, 0);
  const gateCount = actual.runs.reduce((s, r) => s + r.gates.length, 0);

  if (rubric.mode === "refuse") {
    // Pass criteria: empty runs OR low confidence. Flag hint is a bonus note.
    const refusedByRuns = actual.runs.length === 0;
    const refusedByConf = actual.confidence <= rubric.maxConfidence;

    if (!refusedByRuns && !refusedByConf) {
      failures.push(
        `Expected refusal — got ${actual.runs.length} runs at conf ${actual.confidence.toFixed(2)} (${totalLf} LF total). Prompt hallucinated on non-survey input.`
      );
    } else {
      if (refusedByRuns) notes.push("runs:[] (good)");
      if (refusedByConf)
        notes.push(`conf ${actual.confidence.toFixed(2)} ≤ ${rubric.maxConfidence} (good)`);
    }

    if (rubric.flagHintRegex) {
      const flagText = actual.flags.join(" | ");
      if (rubric.flagHintRegex.test(flagText)) {
        notes.push("flag hint matched");
      } else {
        notes.push(
          `flag hint missed (wanted ${rubric.flagHintRegex} in flags)`
        );
      }
    }
  } else {
    // extract mode
    if (actual.runs.length < rubric.minRuns) {
      failures.push(
        `Too few runs: ${actual.runs.length} < minRuns ${rubric.minRuns}`
      );
    }
    if (rubric.maxRuns !== undefined && actual.runs.length > rubric.maxRuns) {
      failures.push(
        `Too many runs: ${actual.runs.length} > maxRuns ${rubric.maxRuns}`
      );
    }
    if (actual.confidence < rubric.minConfidence) {
      failures.push(
        `Confidence ${actual.confidence.toFixed(2)} < minConfidence ${rubric.minConfidence}`
      );
    }

    if (rubric.expectedTotalLf) {
      const expected = rubric.expectedTotalLf.value;
      const tol = expected * rubric.expectedTotalLf.tolerancePct;
      const diff = Math.abs(totalLf - expected);
      if (diff > tol) {
        failures.push(
          `Total LF ${totalLf} vs expected ${expected} (±${rubric.expectedTotalLf.tolerancePct * 100}% = ±${tol.toFixed(0)})`
        );
      } else {
        notes.push(
          `LF ${totalLf} within tolerance of ${expected} (diff ${diff.toFixed(0)})`
        );
      }
    }

    if (rubric.expectedFenceType) {
      const types = new Set(actual.runs.map((r) => r.fenceType));
      if (!types.has(rubric.expectedFenceType)) {
        failures.push(
          `Expected at least one run with fenceType ${rubric.expectedFenceType}, got [${[...types].join(",") || "none"}]`
        );
      }
    }

    if (rubric.expectedGateCount !== undefined) {
      if (gateCount !== rubric.expectedGateCount) {
        failures.push(
          `Gate count ${gateCount} != expected ${rubric.expectedGateCount}`
        );
      }
    }
  }

  return { passed: failures.length === 0, failures, notes };
}

// ────────────────────────────────────────────────────────────────────
// Pipeline
// ────────────────────────────────────────────────────────────────────

function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY environment variable is required. Check .env.local."
    );
  }
  return new OpenAI({ apiKey });
}

function getAnthropic(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY environment variable is required. Add it to .env.local (get a key at console.anthropic.com — this is a separate budget from Claude Code)."
    );
  }
  return new Anthropic({ apiKey });
}

function mimeFromPath(p: string): "image/png" | "image/jpeg" | null {
  const ext = path.extname(p).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return null;
}

async function runWithOpenAI(
  client: OpenAI,
  base64: string,
  mime: "image/png" | "image/jpeg"
): Promise<{ result: SurveyExtractionResult; inputTokens: number; outputTokens: number; durationMs: number }> {
  const userContent = SURVEY_USER_PROMPT_IMAGE(base64, mime);
  const started = Date.now();
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
      { role: "user", content: userContent },
    ],
  });
  const durationMs = Date.now() - started;
  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as SurveyExtractionResult;
  return {
    result: parsed,
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
    durationMs,
  };
}

async function runWithAnthropic(
  client: Anthropic,
  model: "claude-opus-4-7" | "claude-sonnet-4-6",
  base64: string,
  mime: "image/png" | "image/jpeg"
): Promise<{ result: SurveyExtractionResult; inputTokens: number; outputTokens: number; durationMs: number }> {
  // Mirrors SURVEY_USER_PROMPT_IMAGE but in Claude's content-block shape.
  // We don't thread additionalText here — eval harness never passes it,
  // keeps the harness apples-to-apples across backends.
  const userContent: Anthropic.Messages.ContentBlockParam[] = [
    {
      type: "image",
      source: { type: "base64", media_type: mime, data: base64 },
    },
    {
      type: "text",
      text: `This is a marked-up boundary survey. Extract fence runs from the contractor's colored markup. Use the handwritten legend to decide which color means "new install" vs "existing fence" vs other.`,
    },
  ];
  const started = Date.now();
  const response = await client.messages.create({
    model,
    // Sonnet 4.6 max output is 64K; Opus 4.7 supports 128K. Either way,
    // survey extractions are ~500-800 output tokens — 16K is plenty and
    // stays under the streaming-required threshold.
    max_tokens: 16_000,
    system: SURVEY_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
  });
  const durationMs = Date.now() - started;

  // Extract the text block from Claude's response. Claude doesn't
  // ship json_schema-style strict mode the same way OpenAI does; we
  // ask for JSON in the prompt and parse it. If the model adds a code
  // fence or preamble, strip it.
  const textBlock = response.content.find(
    (b): b is Anthropic.Messages.TextBlock => b.type === "text"
  );
  if (!textBlock) {
    throw new Error("Anthropic response had no text block");
  }
  const raw = textBlock.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace < 0) {
    throw new Error(`Could not find JSON object in Anthropic response: ${raw.slice(0, 200)}…`);
  }
  const jsonText = raw.slice(firstBrace, lastBrace + 1);
  const parsedRaw = JSON.parse(jsonText);

  // Zod validation — if the model emits a schema-violating response we
  // want to know. Defaults fill missing optional fields.
  const validation = SurveyExtractionSchema.safeParse(parsedRaw);
  const parsed: SurveyExtractionResult = validation.success
    ? (validation.data as SurveyExtractionResult)
    : (parsedRaw as SurveyExtractionResult);

  return {
    result: parsed,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    durationMs,
  };
}

type ClientBundle = { openai?: OpenAI; anthropic?: Anthropic };

async function runSample(
  backend: Backend,
  clients: ClientBundle,
  sampleId: string,
  imagePath: string
): Promise<{ result: SurveyExtractionResult; inputTokens: number; outputTokens: number; durationMs: number }> {
  const mime = mimeFromPath(imagePath);
  if (!mime) throw new Error(`Unsupported image type: ${imagePath}`);
  const buffer = fs.readFileSync(imagePath);
  const base64 = buffer.toString("base64");

  if (backend === "gpt-4o") {
    if (!clients.openai) throw new Error("OpenAI client not initialized");
    return runWithOpenAI(clients.openai, base64, mime);
  }
  if (!clients.anthropic) throw new Error("Anthropic client not initialized");
  return runWithAnthropic(clients.anthropic, backend, base64, mime);
}

function resolveSamplesDir(): string {
  const fromEnv = process.env.SURVEY_SAMPLES_DIR;
  if (fromEnv) return fromEnv;
  return path.join(os.homedir(), "Fence Pro Data", "fence-survey-samples");
}

function discoverSamples(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    throw new Error(`Samples dir not found: ${dir}`);
  }
  return fs
    .readdirSync(dir)
    .filter((f) => /\.(png|jpe?g)$/i.test(f))
    .sort()
    .map((f) => path.join(dir, f));
}

function formatMarkdownReport(
  results: SampleResult[],
  samplesDir: string,
  totalDurationMs: number,
  backends: Backend[]
): string {
  const lines: string[] = [];
  lines.push(`# Survey Extraction Eval — ${new Date().toISOString()}`);
  lines.push("");
  lines.push(`- Samples dir: \`${samplesDir}\``);
  lines.push(`- Prompt: SURVEY_SYSTEM_PROMPT @ commit ${shortCommit()}`);
  lines.push(`- Backends tested: ${backends.map((b) => BACKENDS[b].label).join(", ")}`);
  lines.push(
    `- Wall time: ${(totalDurationMs / 1000).toFixed(1)}s total across ${results.length} (sample, backend) pairs`
  );
  lines.push("");

  // Per-backend summary table at the top — this is the headline number
  // Kelvin will look at first.
  lines.push("## Per-backend summary");
  lines.push("");
  lines.push("| Backend | Pass rate | Tokens in | Tokens out | Cost | Avg latency |");
  lines.push("|---|---|---|---|---|---|");
  for (const backend of backends) {
    const rows = results.filter((r) => r.backend === backend);
    const passed = rows.filter((r) => r.passed).length;
    const tokIn = rows.reduce((s, r) => s + r.inputTokens, 0);
    const tokOut = rows.reduce((s, r) => s + r.outputTokens, 0);
    const cost =
      (tokIn / 1_000_000) * BACKENDS[backend].inputPer1M +
      (tokOut / 1_000_000) * BACKENDS[backend].outputPer1M;
    const avgMs = rows.length > 0 ? rows.reduce((s, r) => s + r.durationMs, 0) / rows.length : 0;
    lines.push(
      `| ${BACKENDS[backend].label} | ${passed}/${rows.length} | ${tokIn.toLocaleString()} | ${tokOut.toLocaleString()} | $${cost.toFixed(3)} | ${(avgMs / 1000).toFixed(1)}s |`
    );
  }
  lines.push("");

  // Per-sample side-by-side when multiple backends; otherwise flat list.
  const sampleIds = [...new Set(results.map((r) => r.sampleId))];
  const isAb = backends.length > 1;

  lines.push(isAb ? "## Per-sample head-to-head" : "## Results");
  lines.push("");

  for (const sampleId of sampleIds) {
    const sampleResults = results.filter((r) => r.sampleId === sampleId);
    const firstResult = sampleResults[0];
    if (!firstResult) continue;

    lines.push(`### \`${sampleId}\``);
    lines.push("");
    lines.push(`*${firstResult.rubric.notes}*`);
    lines.push("");

    if (isAb) {
      // Compact comparison table — the crux of the A/B.
      lines.push("| Backend | Runs | LF | Gates | Conf | Result | Latency | Cost |");
      lines.push("|---|---|---|---|---|---|---|---|");
      for (const backend of backends) {
        const row = sampleResults.find((r) => r.backend === backend);
        if (!row) {
          lines.push(`| ${BACKENDS[backend].label} | — | — | — | — | (no result) | — | — |`);
          continue;
        }
        if (row.error) {
          lines.push(`| ${BACKENDS[backend].label} | — | — | — | — | 💥 error | ${(row.durationMs / 1000).toFixed(1)}s | — |`);
          continue;
        }
        const lf = row.actual.runs.reduce((s, run) => s + run.linearFeet, 0);
        const gates = row.actual.runs.reduce((s, run) => s + run.gates.length, 0);
        const cost =
          (row.inputTokens / 1_000_000) * BACKENDS[backend].inputPer1M +
          (row.outputTokens / 1_000_000) * BACKENDS[backend].outputPer1M;
        lines.push(
          `| ${BACKENDS[backend].label} | ${row.actual.runs.length} | ${lf} | ${gates} | ${row.actual.confidence.toFixed(2)} | ${row.passed ? "✅ PASS" : "❌ FAIL"} | ${(row.durationMs / 1000).toFixed(1)}s | $${cost.toFixed(3)} |`
        );
      }
      lines.push("");

      // Expand each backend's full extraction below the table
      for (const backend of backends) {
        const row = sampleResults.find((r) => r.backend === backend);
        if (!row || row.error) continue;
        lines.push(`<details><summary><strong>${BACKENDS[backend].label}</strong> — full output</summary>`);
        lines.push("");
        lines.push(...renderSampleDetail(row));
        lines.push("");
        lines.push("</details>");
        lines.push("");
      }
    } else {
      // Single-backend: flat detail
      const row = sampleResults[0];
      lines.push(...renderSampleDetail(row));
    }
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

function renderSampleDetail(r: SampleResult): string[] {
  const lines: string[] = [];
  if (r.error) {
    lines.push(`**Error:** ${r.error}`);
    return lines;
  }
  const totalLf = r.actual.runs.reduce((s, run) => s + run.linearFeet, 0);
  const gateCount = r.actual.runs.reduce((s, run) => s + run.gates.length, 0);
  lines.push(
    `- Result: ${r.passed ? "✅ PASS" : "❌ FAIL"} · ${r.actual.runs.length} runs · ${totalLf} LF · ${gateCount} gates · confidence ${r.actual.confidence.toFixed(2)}`
  );
  if (r.actual.runs.length > 0) {
    const types = [...new Set(r.actual.runs.map((rn) => rn.fenceType))].join(", ");
    const heights = [...new Set(r.actual.runs.map((rn) => rn.heightFt))].sort().join("/");
    lines.push(`- Types: ${types} @ ${heights} ft`);
  }
  if (r.actual.flags.length > 0) {
    lines.push(`- Flags:`);
    for (const f of r.actual.flags) lines.push(`  - ${f}`);
  }
  if (r.actual.rawSummary) {
    lines.push(`- Raw summary: *${r.actual.rawSummary}*`);
  }
  if (r.failures.length > 0) {
    lines.push("");
    lines.push("**Failures:**");
    for (const f of r.failures) lines.push(`- ❌ ${f}`);
  }
  if (r.notes.length > 0) {
    lines.push(`- Notes: ${r.notes.join("; ")}`);
  }
  if (r.actual.observedDimensions && r.actual.observedDimensions.length > 0) {
    lines.push("");
    lines.push(`**Observed dimensions (${r.actual.observedDimensions.length}):**`);
    for (const d of r.actual.observedDimensions) lines.push(`- ${d}`);
  }
  if (r.actual.observedAnnotations && r.actual.observedAnnotations.length > 0) {
    lines.push("");
    lines.push(`**Observed annotations (${r.actual.observedAnnotations.length}):**`);
    for (const a of r.actual.observedAnnotations) lines.push(`- ${a}`);
  }
  if (r.actual.runs.length > 0) {
    lines.push("");
    lines.push("```json");
    lines.push(JSON.stringify(r.actual.runs, null, 2));
    lines.push("```");
  }
  lines.push(
    `\n*(${(r.sizeBytes / 1024).toFixed(0)} KB; ${r.durationMs}ms; ${r.inputTokens}/${r.outputTokens} tok)*`
  );
  return lines;
}

function shortCommit(): string {
  try {
    return require("child_process")
      .execSync("git rev-parse --short HEAD", { encoding: "utf8" })
      .trim();
  } catch {
    return "unknown";
  }
}

async function main() {
  const samplesDir = resolveSamplesDir();
  const backends = resolveBackendsFromArgv();

  console.log("═".repeat(70));
  console.log("Survey Extraction Eval");
  console.log("═".repeat(70));
  console.log(`Samples dir: ${samplesDir}`);
  console.log(`Backends: ${backends.map((b) => BACKENDS[b].label).join(" · ")}`);

  const imagePaths = discoverSamples(samplesDir);
  if (imagePaths.length === 0) {
    console.error("No images found. Run: pdftoppm -r 200 -png -singlefile <pdf> <stem>");
    process.exit(1);
  }
  console.log(`Found ${imagePaths.length} samples\n`);

  const clients: ClientBundle = {};
  if (backends.some((b) => BACKENDS[b].provider === "openai")) clients.openai = getOpenAI();
  if (backends.some((b) => BACKENDS[b].provider === "anthropic")) clients.anthropic = getAnthropic();

  const results: SampleResult[] = [];
  const startTotal = Date.now();

  for (const imagePath of imagePaths) {
    const sampleId = path.basename(imagePath, path.extname(imagePath));
    const rubric = RUBRICS[sampleId];
    if (!rubric) {
      console.log(`[SKIP] ${sampleId} — no rubric (add to RUBRICS map)`);
      continue;
    }
    for (const backend of backends) {
      process.stdout.write(`[${sampleId} · ${BACKENDS[backend].label}] ... `);
      try {
        const { result, inputTokens, outputTokens, durationMs } = await runSample(
          backend,
          clients,
          sampleId,
          imagePath
        );
        const { passed, failures, notes } = scoreResult(rubric, result);
        results.push({
          sampleId,
          backend,
          imagePath,
          sizeBytes: fs.statSync(imagePath).size,
          passed,
          rubric,
          actual: result,
          failures,
          notes,
          inputTokens,
          outputTokens,
          durationMs,
        });
        console.log(
          `${passed ? "✅ PASS" : "❌ FAIL"} (${durationMs}ms, ${inputTokens}/${outputTokens} tok)`
        );
        if (!passed) {
          for (const f of failures) console.log(`     ${f}`);
        }
      } catch (err) {
        const msg = (err as Error).message;
        console.log(`💥 ERROR: ${msg}`);
        // Still push an error row so the side-by-side report shows what failed
        results.push({
          sampleId,
          backend,
          imagePath,
          sizeBytes: fs.statSync(imagePath).size,
          passed: false,
          rubric,
          actual: { runs: [], confidence: 0, flags: [], rawSummary: "" },
          failures: [`Runtime error: ${msg}`],
          notes: [],
          inputTokens: 0,
          outputTokens: 0,
          durationMs: 0,
          error: msg,
        });
      }
    }
  }

  const totalDurationMs = Date.now() - startTotal;
  console.log("");
  for (const backend of backends) {
    const rows = results.filter((r) => r.backend === backend);
    const passed = rows.filter((r) => r.passed).length;
    const tokIn = rows.reduce((s, r) => s + r.inputTokens, 0);
    const tokOut = rows.reduce((s, r) => s + r.outputTokens, 0);
    const cost =
      (tokIn / 1_000_000) * BACKENDS[backend].inputPer1M +
      (tokOut / 1_000_000) * BACKENDS[backend].outputPer1M;
    console.log(
      `${BACKENDS[backend].label.padEnd(22)}  ${passed}/${rows.length} passed · ${tokIn.toLocaleString()}/${tokOut.toLocaleString()} tok · $${cost.toFixed(3)}`
    );
  }

  // Write report
  const reportsDir = path.join(process.cwd(), "eval-runs");
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const suffix = backends.length > 1 ? "ab" : backends[0];
  const reportPath = path.join(reportsDir, `survey-${suffix}-${ts}.md`);
  fs.writeFileSync(reportPath, formatMarkdownReport(results, samplesDir, totalDurationMs, backends));
  console.log(`\nReport: ${reportPath}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
