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

config({ path: path.resolve(process.cwd(), ".env.local") });

import {
  SURVEY_SYSTEM_PROMPT,
  SURVEY_USER_PROMPT_IMAGE,
} from "../src/lib/fence-graph/ai-extract/survey-prompt";
import { EXTRACTION_JSON_SCHEMA } from "../src/lib/fence-graph/ai-extract/schema";
import type { AiExtractionResult } from "../src/lib/fence-graph/ai-extract/types";

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
    minRuns: 2,
    maxRuns: 4,
    minConfidence: 0.75,
    // ~203 LF from the worked example baked into SURVEY_SYSTEM_PROMPT
    expectedTotalLf: { value: 203, tolerancePct: 0.15 },
    expectedFenceType: "vinyl",
    expectedGateCount: 0,
    notes:
      "Canonical case — hand legend, printed dimensions (73/92/15.3/130), 'Deco Rail 6H White Privacy Vinyl'. Already in prompt as worked example.",
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
    minRuns: 1,
    minConfidence: 0.7,
    // Digital overlay with red=new, blue=distance, green=old-staying,
    // and labeled gates ("~4' Single Gate", "~8' Double Gate"). Expect
    // at least 2 gates (1 walk + 1 drive-ish).
    expectedGateCount: 2,
    notes:
      "Big Jerry's digital 3-color contractor markup with explicit legend + labeled gates. Gold-standard contractor input.",
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
  imagePath: string;
  sizeBytes: number;
  passed: boolean;
  rubric: Rubric;
  actual: AiExtractionResult;
  failures: string[];
  notes: string[];
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}

function scoreResult(
  rubric: Rubric,
  actual: AiExtractionResult
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

function mimeFromPath(p: string): "image/png" | "image/jpeg" | null {
  const ext = path.extname(p).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return null;
}

async function runSample(
  client: OpenAI,
  sampleId: string,
  imagePath: string
): Promise<{ result: AiExtractionResult; inputTokens: number; outputTokens: number; durationMs: number }> {
  const mime = mimeFromPath(imagePath);
  if (!mime) throw new Error(`Unsupported image type: ${imagePath}`);
  const buffer = fs.readFileSync(imagePath);
  const base64 = buffer.toString("base64");
  const userContent = SURVEY_USER_PROMPT_IMAGE(base64, mime);
  const started = Date.now();
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
    messages: [
      { role: "system", content: SURVEY_SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
  });
  const durationMs = Date.now() - started;
  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as AiExtractionResult;
  return {
    result: parsed,
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
    durationMs,
  };
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
  totalDurationMs: number
): string {
  const passCount = results.filter((r) => r.passed).length;
  const totalTokensIn = results.reduce((s, r) => s + r.inputTokens, 0);
  const totalTokensOut = results.reduce((s, r) => s + r.outputTokens, 0);
  // gpt-4o: $2.50 / 1M input, $10.00 / 1M output (as of model release).
  // Keep this conservative — it's a floor for "is this worth it?".
  const estCost =
    (totalTokensIn / 1_000_000) * 2.5 + (totalTokensOut / 1_000_000) * 10.0;

  const lines: string[] = [];
  lines.push(`# Survey Extraction Eval — ${new Date().toISOString()}`);
  lines.push("");
  lines.push(`- Samples dir: \`${samplesDir}\``);
  lines.push(`- Model: gpt-4o (temp 0.1, json_schema strict)`);
  lines.push(`- Prompt: SURVEY_SYSTEM_PROMPT @ commit ${shortCommit()}`);
  lines.push(
    `- Result: **${passCount}/${results.length}** passed rubric (${((passCount / results.length) * 100).toFixed(0)}%)`
  );
  lines.push(
    `- Tokens: ${totalTokensIn.toLocaleString()} in / ${totalTokensOut.toLocaleString()} out ≈ **$${estCost.toFixed(3)}**`
  );
  lines.push(
    `- Wall time: ${(totalDurationMs / 1000).toFixed(1)}s total, ${(totalDurationMs / results.length / 1000).toFixed(1)}s avg/sample`
  );
  lines.push("");
  lines.push("## Results");
  lines.push("");

  for (const r of results) {
    lines.push(`### ${r.passed ? "✅" : "❌"} \`${r.sampleId}\``);
    lines.push("");
    lines.push(`*${r.rubric.notes}*`);
    lines.push("");

    const totalLf = r.actual.runs.reduce((s, run) => s + run.linearFeet, 0);
    const gateCount = r.actual.runs.reduce((s, run) => s + run.gates.length, 0);
    lines.push("**Output summary:**");
    lines.push("");
    lines.push(
      `- ${r.actual.runs.length} runs, ${totalLf} LF total, ${gateCount} gates`
    );
    lines.push(`- Confidence: ${r.actual.confidence.toFixed(2)}`);
    if (r.actual.runs.length > 0) {
      const types = [...new Set(r.actual.runs.map((rn) => rn.fenceType))].join(
        ", "
      );
      const heights = [...new Set(r.actual.runs.map((rn) => rn.heightFt))]
        .sort()
        .join("/");
      lines.push(`- Types: ${types} @ ${heights} ft`);
    }
    if (r.actual.flags.length > 0) {
      lines.push(`- Flags:`);
      for (const f of r.actual.flags) {
        lines.push(`  - ${f}`);
      }
    }
    if (r.actual.rawSummary) {
      lines.push(`- Raw summary: *${r.actual.rawSummary}*`);
    }
    lines.push("");

    if (r.failures.length > 0) {
      lines.push("**Failures:**");
      lines.push("");
      for (const f of r.failures) lines.push(`- ❌ ${f}`);
      lines.push("");
    }
    if (r.notes.length > 0) {
      lines.push("**Notes:** " + r.notes.join("; "));
      lines.push("");
    }

    if (r.actual.runs.length > 0) {
      lines.push("<details><summary>Full run list</summary>");
      lines.push("");
      lines.push("```json");
      lines.push(JSON.stringify(r.actual.runs, null, 2));
      lines.push("```");
      lines.push("");
      lines.push("</details>");
      lines.push("");
    }

    lines.push(
      `*(image: \`${path.basename(r.imagePath)}\`, ${(r.sizeBytes / 1024).toFixed(0)} KB; ${r.durationMs} ms; ${r.inputTokens}/${r.outputTokens} tok)*`
    );
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
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
  console.log("═".repeat(70));
  console.log("Survey Extraction Eval");
  console.log("═".repeat(70));
  console.log(`Samples dir: ${samplesDir}`);

  const imagePaths = discoverSamples(samplesDir);
  if (imagePaths.length === 0) {
    console.error("No images found. Run: pdftoppm -r 200 -png -singlefile <pdf> <stem>");
    process.exit(1);
  }
  console.log(`Found ${imagePaths.length} samples\n`);

  const client = getOpenAI();
  const results: SampleResult[] = [];
  const startTotal = Date.now();

  for (const imagePath of imagePaths) {
    const sampleId = path.basename(imagePath, path.extname(imagePath));
    const rubric = RUBRICS[sampleId];
    if (!rubric) {
      console.log(`[SKIP] ${sampleId} — no rubric (add to RUBRICS map)`);
      continue;
    }
    process.stdout.write(`[${sampleId}] ... `);
    try {
      const { result, inputTokens, outputTokens, durationMs } = await runSample(
        client,
        sampleId,
        imagePath
      );
      const { passed, failures, notes } = scoreResult(rubric, result);
      results.push({
        sampleId,
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
      console.log(`💥 ERROR: ${(err as Error).message}`);
    }
  }

  const totalDurationMs = Date.now() - startTotal;
  const passCount = results.filter((r) => r.passed).length;
  console.log("");
  console.log(
    `SUMMARY: ${passCount}/${results.length} passed in ${(totalDurationMs / 1000).toFixed(1)}s`
  );

  // Write report
  const reportsDir = path.join(process.cwd(), "eval-runs");
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = path.join(reportsDir, `survey-${ts}.md`);
  fs.writeFileSync(reportPath, formatMarkdownReport(results, samplesDir, totalDurationMs));
  console.log(`Report: ${reportPath}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
