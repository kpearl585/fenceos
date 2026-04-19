#!/usr/bin/env tsx
/**
 * AI Extraction Test Harness
 *
 * Wires test dataset to the REAL FenceEstimatePro extraction pipeline.
 * Validates extraction accuracy against expected outputs.
 * Generates detailed mismatch report.
 */

// Load environment variables from .env.local
import { config } from "dotenv";
import * as path from "path";
config({ path: path.resolve(process.cwd(), ".env.local") });

import * as fs from "fs";
import OpenAI from "openai";
import { SYSTEM_PROMPT, USER_PROMPT_IMAGE } from "../src/lib/fence-graph/ai-extract/prompt";
import { EXTRACTION_JSON_SCHEMA, validateExtraction } from "../src/lib/fence-graph/ai-extract/schema";
import type { AiExtractionResult } from "../src/lib/fence-graph/ai-extract/types";

// ────────────────────────────────────────────────────────────────────
// REAL EXTRACTION PATH — Mirrored from aiActions.ts
// ────────────────────────────────────────────────────────────────────

function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is required");
  }
  return new OpenAI({ apiKey });
}

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

// ────────────────────────────────────────────────────────────────────
// TEST DATASET
// ────────────────────────────────────────────────────────────────────

interface TestCase {
  id: string;
  priority: "high" | "medium" | "low";
  type: "text" | "image";
  input: string;
  // Image cases: path relative to repo root (e.g. "test-fixtures/photos/clear-yard.jpg").
  // When the file is missing, the runner skips with a "pending photo" note
  // so Kelvin can stage photos incrementally without breaking the suite.
  photoPath?: string;
  photoMime?: "image/jpeg" | "image/png" | "image/webp";
  expected: {
    runs?: Array<{
      linearFeet: number;
      fenceType: string;
      productLineId?: string;
      heightFt: number;
      gates?: unknown[];
      soilType?: string;
      slopePercent?: number;
      isWindExposed?: boolean;
      poolCode?: boolean;
    }>;
    gateCount?: number;
    minConfidence?: number;
    expectFlags?: boolean;
    allowFailure?: boolean;
  };
}

interface Dataset {
  version: string;
  description: string;
  testCases: TestCase[];
}

// ────────────────────────────────────────────────────────────────────
// COMPARISON & SCORING
// ────────────────────────────────────────────────────────────────────

interface TestResult {
  id: string;
  priority: string;
  passed: boolean;
  confidence: number;
  inputTokens: number;
  outputTokens: number;
  mismatches: string[];
  criticalFailures: string[];
  validationErrors: string[];
  blocked: boolean;
  actual: AiExtractionResult;
}

function compareResults(testCase: TestCase, actual: AiExtractionResult): {
  passed: boolean;
  mismatches: string[];
  criticalFailures: string[];
} {
  const mismatches: string[] = [];
  const criticalFailures: string[] = [];
  const expected = testCase.expected;

  // Confidence check
  if (expected.minConfidence && actual.confidence < expected.minConfidence) {
    mismatches.push(
      `Confidence too low: ${actual.confidence.toFixed(2)} < ${expected.minConfidence} (expected)`
    );
  }

  // If we allow failure, just check confidence
  if (expected.allowFailure) {
    return {
      passed: !criticalFailures.length,
      mismatches,
      criticalFailures,
    };
  }

  // Run count
  if (expected.runs && actual.runs.length !== expected.runs.length) {
    criticalFailures.push(
      `Run count mismatch: got ${actual.runs.length}, expected ${expected.runs.length}`
    );
  }

  // Compare each run
  if (expected.runs) {
    for (let i = 0; i < Math.min(actual.runs.length, expected.runs.length); i++) {
      const actualRun = actual.runs[i];
      const expectedRun = expected.runs[i];

      // Linear feet (allow 10% tolerance)
      const linearFeetDiff = Math.abs(actualRun.linearFeet - expectedRun.linearFeet);
      const tolerance = expectedRun.linearFeet * 0.10;
      if (linearFeetDiff > tolerance) {
        criticalFailures.push(
          `Run ${i + 1}: linearFeet ${actualRun.linearFeet} != ${expectedRun.linearFeet} (±10% tolerance)`
        );
      }

      // Fence type
      if (actualRun.fenceType !== expectedRun.fenceType) {
        criticalFailures.push(
          `Run ${i + 1}: fenceType "${actualRun.fenceType}" != "${expectedRun.fenceType}"`
        );
      }

      // Product line (if specified)
      if (expectedRun.productLineId && actualRun.productLineId !== expectedRun.productLineId) {
        mismatches.push(
          `Run ${i + 1}: productLineId "${actualRun.productLineId}" != "${expectedRun.productLineId}"`
        );
      }

      // Height
      if (actualRun.heightFt !== expectedRun.heightFt) {
        criticalFailures.push(
          `Run ${i + 1}: heightFt ${actualRun.heightFt} != ${expectedRun.heightFt}`
        );
      }

      // Soil type (if specified)
      if (expectedRun.soilType && actualRun.soilType !== expectedRun.soilType) {
        mismatches.push(
          `Run ${i + 1}: soilType "${actualRun.soilType}" != "${expectedRun.soilType}"`
        );
      }

      // Slope (allow ±3% tolerance)
      if (expectedRun.slopePercent !== undefined) {
        const slopeDiff = Math.abs(actualRun.slopePercent - expectedRun.slopePercent);
        if (slopeDiff > 3) {
          mismatches.push(
            `Run ${i + 1}: slopePercent ${actualRun.slopePercent}% != ${expectedRun.slopePercent}% (±3% tolerance)`
          );
        }
      }

      // Wind exposure
      if (expectedRun.isWindExposed !== undefined && actualRun.isWindExposed !== expectedRun.isWindExposed) {
        mismatches.push(
          `Run ${i + 1}: isWindExposed ${actualRun.isWindExposed} != ${expectedRun.isWindExposed}`
        );
      }

      // Pool code
      if (expectedRun.poolCode !== undefined && actualRun.poolCode !== expectedRun.poolCode) {
        mismatches.push(
          `Run ${i + 1}: poolCode ${actualRun.poolCode} != ${expectedRun.poolCode}`
        );
      }
    }
  }

  // Gate count (total across all runs)
  if (expected.gateCount !== undefined) {
    const actualGateCount = actual.runs.reduce((sum, run) => sum + run.gates.length, 0);
    if (actualGateCount !== expected.gateCount) {
      criticalFailures.push(
        `Total gate count: got ${actualGateCount}, expected ${expected.gateCount}`
      );
    }
  }

  const passed = criticalFailures.length === 0;
  return { passed, mismatches, criticalFailures };
}

// ────────────────────────────────────────────────────────────────────
// MAIN TEST RUNNER
// ────────────────────────────────────────────────────────────────────

async function runTests() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("AI Extraction Test Harness — REAL PIPELINE");
  console.log("═══════════════════════════════════════════════════════════\n");

  // Load dataset
  const datasetPath = path.join(__dirname, "../test-fixtures/ai-extraction-test-dataset.json");
  const dataset: Dataset = JSON.parse(fs.readFileSync(datasetPath, "utf-8"));
  console.log(`Loaded test dataset v${dataset.version}: ${dataset.testCases.length} test cases\n`);

  // Check OpenAI key
  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY not set. Cannot run tests.");
    process.exit(1);
  }

  const client = getOpenAI();
  const results: TestResult[] = [];

  // Filter by priority (or run all)
  const priorityFilter = process.argv[2] as "high" | "medium" | "low" | undefined;
  let testCases = dataset.testCases;
  if (priorityFilter) {
    testCases = testCases.filter(tc => tc.priority === priorityFilter);
    console.log(`Running only ${priorityFilter} priority tests (${testCases.length} cases)\n`);
  }

  // Image tests run alongside text ones. Each image case with a missing
  // photo file is skipped with a clear note so the suite stays green
  // while Kelvin stages real yard photos into test-fixtures/photos/.
  let skippedImageTests = 0;

  // Run each test
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (const testCase of testCases) {
    // Build the messages per test type — text vs image.
    let messages: OpenAI.Chat.ChatCompletionMessageParam[];

    if (testCase.type === "image") {
      const photoRel = testCase.photoPath;
      if (!photoRel) {
        console.log(`[${testCase.priority.toUpperCase()}] ${testCase.id}... ⏭️  SKIP (no photoPath)`);
        skippedImageTests++;
        continue;
      }
      const photoAbs = path.join(process.cwd(), photoRel);
      if (!fs.existsSync(photoAbs)) {
        console.log(
          `[${testCase.priority.toUpperCase()}] ${testCase.id}... ⏭️  SKIP (photo not staged: ${photoRel})`
        );
        skippedImageTests++;
        continue;
      }
      const buffer  = fs.readFileSync(photoAbs);
      const base64  = buffer.toString("base64");
      const mime    = testCase.photoMime ?? "image/jpeg";
      const context = testCase.input && testCase.input.trim().length > 0 ? testCase.input : undefined;
      messages = [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: USER_PROMPT_IMAGE(base64, mime, context) },
      ];
    } else {
      messages = [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: `Extract fence project data from the following contractor input:\n\n${testCase.input}` },
      ];
    }

    process.stdout.write(`[${testCase.priority.toUpperCase()}] ${testCase.id}... `);

    try {
      // Extract using REAL pipeline
      const { result, inputTokens, outputTokens } = await runExtraction(client, messages);

      totalInputTokens += inputTokens;
      totalOutputTokens += outputTokens;

      // Validate
      const validation = validateExtraction(result);

      // Compare
      const { passed, mismatches, criticalFailures } = compareResults(testCase, result);

      if (passed && !validation.blocked) {
        console.log("✅ PASS");
      } else {
        console.log("❌ FAIL");
      }

      results.push({
        id: testCase.id,
        priority: testCase.priority,
        passed: passed && !validation.blocked,
        confidence: result.confidence,
        inputTokens,
        outputTokens,
        mismatches,
        criticalFailures,
        validationErrors: validation.errors,
        blocked: validation.blocked,
        actual: result,
      });
    } catch (error) {
      console.log(`💥 ERROR: ${error instanceof Error ? error.message : String(error)}`);
      results.push({
        id: testCase.id,
        priority: testCase.priority,
        passed: false,
        confidence: 0,
        inputTokens: 0,
        outputTokens: 0,
        mismatches: [],
        criticalFailures: [`Exception: ${error instanceof Error ? error.message : String(error)}`],
        validationErrors: [],
        blocked: true,
        actual: { runs: [], confidence: 0, flags: [], rawSummary: "" },
      });
    }
  }

  // ────────────────────────────────────────────────────────────────
  // GENERATE REPORT
  // ────────────────────────────────────────────────────────────────

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("TEST SUMMARY");
  console.log("═══════════════════════════════════════════════════════════\n");

  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;
  const passRate = ((passed / results.length) * 100).toFixed(1);

  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed} | Pass Rate: ${passRate}%`);
  console.log(`Tokens: ${totalInputTokens} input, ${totalOutputTokens} output (${totalInputTokens + totalOutputTokens} total)`);
  if (skippedImageTests > 0) {
    console.log(`Skipped: ${skippedImageTests} image test(s) — stage photos in test-fixtures/photos/ to enable them.`);
  }

  // Group by priority
  const byPriority = {
    high: results.filter(r => r.priority === "high"),
    medium: results.filter(r => r.priority === "medium"),
    low: results.filter(r => r.priority === "low"),
  };

  for (const [priority, tests] of Object.entries(byPriority)) {
    if (tests.length === 0) continue;
    const priorityPassed = tests.filter(t => t.passed).length;
    const priorityPassRate = ((priorityPassed / tests.length) * 100).toFixed(1);
    console.log(`  ${priority.toUpperCase()}: ${priorityPassed}/${tests.length} passed (${priorityPassRate}%)`);
  }

  // Failed tests detail
  const failures = results.filter(r => !r.passed);
  if (failures.length > 0) {
    console.log("\n❌ FAILED TESTS:\n");
    for (const fail of failures) {
      console.log(`${fail.id} [${fail.priority}]`);
      if (fail.criticalFailures.length > 0) {
        fail.criticalFailures.forEach(f => console.log(`  ❌ ${f}`));
      }
      if (fail.mismatches.length > 0) {
        fail.mismatches.forEach(m => console.log(`  ⚠️  ${m}`));
      }
      if (fail.validationErrors.length > 0) {
        fail.validationErrors.forEach(e => console.log(`  🔍 ${e}`));
      }
      console.log(`  Confidence: ${fail.confidence.toFixed(2)}`);
      console.log("");
    }
  }

  // Common mismatch patterns
  const allMismatches = results.flatMap(r => r.mismatches);
  const allCriticalFailures = results.flatMap(r => r.criticalFailures);
  const mismatchPatterns = new Map<string, number>();

  [...allMismatches, ...allCriticalFailures].forEach(m => {
    const pattern = m.split(":")[0]; // Extract pattern before colon
    mismatchPatterns.set(pattern, (mismatchPatterns.get(pattern) || 0) + 1);
  });

  if (mismatchPatterns.size > 0) {
    console.log("\n📊 MISMATCH PATTERNS:\n");
    const sorted = Array.from(mismatchPatterns.entries()).sort((a, b) => b[1] - a[1]);
    sorted.forEach(([pattern, count]) => {
      console.log(`  ${count}x: ${pattern}`);
    });
  }

  // False-certainty failures (high confidence but failed)
  const falseCertainty = results.filter(r => !r.passed && r.confidence >= 0.80);
  if (falseCertainty.length > 0) {
    console.log("\n⚠️  FALSE-CERTAINTY FAILURES (confident but wrong):\n");
    falseCertainty.forEach(fc => {
      console.log(`  ${fc.id}: confidence ${fc.confidence.toFixed(2)} but ${fc.criticalFailures.length} critical failure(s)`);
    });
  }

  // Write markdown report
  const reportPath = path.join(__dirname, "../docs/ai-extraction-test-results.md");
  const reportContent = generateMarkdownReport(dataset, results, {
    totalInputTokens,
    totalOutputTokens,
    passRate,
    byPriority,
  });
  fs.writeFileSync(reportPath, reportContent, "utf-8");
  console.log(`\n📄 Full report: ${reportPath}`);

  process.exit(failed > 0 ? 1 : 0);
}

function generateMarkdownReport(
  dataset: Dataset,
  results: TestResult[],
  stats: {
    totalInputTokens: number;
    totalOutputTokens: number;
    passRate: string;
    byPriority: Record<string, TestResult[]>;
  }
): string {
  const now = new Date().toISOString();
  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;

  let md = `# AI Extraction Test Results\n\n`;
  md += `**Generated:** ${now}  \n`;
  md += `**Dataset Version:** ${dataset.version}  \n`;
  md += `**Extraction Path:** Real production pipeline (aiActions.ts → GPT-4o)  \n\n`;

  md += `## Summary\n\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Total Tests | ${results.length} |\n`;
  md += `| Passed | ${passed} ✅ |\n`;
  md += `| Failed | ${failed} ❌ |\n`;
  md += `| Pass Rate | ${stats.passRate}% |\n`;
  md += `| Input Tokens | ${stats.totalInputTokens.toLocaleString()} |\n`;
  md += `| Output Tokens | ${stats.totalOutputTokens.toLocaleString()} |\n`;
  md += `| Total Tokens | ${(stats.totalInputTokens + stats.totalOutputTokens).toLocaleString()} |\n\n`;

  md += `## By Priority\n\n`;
  for (const [priority, tests] of Object.entries(stats.byPriority)) {
    if (tests.length === 0) continue;
    const priorityPassed = tests.filter(t => t.passed).length;
    const priorityPassRate = ((priorityPassed / tests.length) * 100).toFixed(1);
    md += `- **${priority.toUpperCase()}**: ${priorityPassed}/${tests.length} passed (${priorityPassRate}%)\n`;
  }

  md += `\n## Detailed Results\n\n`;
  for (const result of results) {
    const status = result.passed ? "✅ PASS" : "❌ FAIL";
    md += `### ${result.id} — ${status}\n\n`;
    md += `- **Priority:** ${result.priority}\n`;
    md += `- **Confidence:** ${result.confidence.toFixed(2)}\n`;
    md += `- **Tokens:** ${result.inputTokens} in, ${result.outputTokens} out\n`;

    if (result.criticalFailures.length > 0) {
      md += `\n**Critical Failures:**\n`;
      result.criticalFailures.forEach(f => md += `- ❌ ${f}\n`);
    }

    if (result.mismatches.length > 0) {
      md += `\n**Mismatches:**\n`;
      result.mismatches.forEach(m => md += `- ⚠️  ${m}\n`);
    }

    if (result.validationErrors.length > 0) {
      md += `\n**Validation Errors:**\n`;
      result.validationErrors.forEach(e => md += `- 🔍 ${e}\n`);
    }

    md += `\n**Extracted Output:**\n\`\`\`json\n${JSON.stringify(result.actual, null, 2)}\n\`\`\`\n\n`;
  }

  md += `## Recommendations\n\n`;
  const failures = results.filter(r => !r.passed);
  if (failures.length === 0) {
    md += `All tests passed! 🎉 Extraction accuracy is excellent.\n\n`;
  } else {
    md += `1. **Review failed test cases** — Focus on high-priority failures first\n`;
    md += `2. **Check false-certainty cases** — Model is confident but wrong\n`;
    md += `3. **Analyze mismatch patterns** — Identify systematic extraction issues\n`;
    md += `4. **Update prompts or validation rules** based on patterns\n`;
    md += `5. **Add more training examples** for problematic scenarios\n\n`;
  }

  md += `## Extraction Path Details\n\n`;
  md += `- **Entry Point:** \`src/app/dashboard/advanced-estimate/aiActions.ts\`\n`;
  md += `- **Model:** GPT-4o (temperature 0.1)\n`;
  md += `- **Schema:** \`src/lib/fence-graph/ai-extract/schema.ts\`\n`;
  md += `- **Prompt:** \`src/lib/fence-graph/ai-extract/prompt.ts\`\n`;
  md += `- **Validation:** Zod schema + business rules\n`;
  md += `- **Required ENV:** \`OPENAI_API_KEY\`\n\n`;

  return md;
}

// Run tests
runTests().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
