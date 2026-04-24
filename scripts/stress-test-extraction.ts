#!/usr/bin/env tsx
/**
 * AI Extraction Stress Test
 *
 * Runs messy, real-world contractor inputs through extraction pipeline.
 * Analyzes robustness, confidence calibration, and failure patterns.
 */

// Load environment variables from .env.local
import { config } from "dotenv";
import * as path from "path";
config({ path: path.resolve(process.cwd(), ".env.local") });

import * as fs from "fs";
import OpenAI from "openai";
import { SYSTEM_PROMPT } from "../src/lib/fence-graph/ai-extract/prompt";
import { EXTRACTION_JSON_SCHEMA, validateExtraction } from "../src/lib/fence-graph/ai-extract/schema";
import type { AiExtractionResult } from "../src/lib/fence-graph/ai-extract/types";

// ────────────────────────────────────────────────────────────────────
// Real Extraction Pipeline
// ────────────────────────────────────────────────────────────────────

function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("\n❌ OPENAI_API_KEY not set. Cannot run tests.\n");
    process.exit(1);
  }
  return new OpenAI({ apiKey });
}

async function runExtraction(
  client: OpenAI,
  userInput: string
): Promise<{ result: AiExtractionResult; inputTokens: number; outputTokens: number }> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userInput }
  ];

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
// Analysis Types
// ────────────────────────────────────────────────────────────────────

interface StressTestInput {
  id: string;
  description: string;
}

interface StressTestResult {
  id: string;
  input: string;
  extracted: AiExtractionResult;
  confidence: number;
  flags: string[];
  inputTokens: number;
  outputTokens: number;
  issues: string[];
}

// ────────────────────────────────────────────────────────────────────
// Issue Detection
// ────────────────────────────────────────────────────────────────────

function detectIssues(input: string, result: AiExtractionResult): string[] {
  const issues: string[] = [];

  // Check for vague measurements + high confidence
  if ((input.includes("about") || input.includes("maybe") || input.includes("roughly") || input.includes("give or take"))
      && result.confidence > 0.9) {
    issues.push("HIGH_CONFIDENCE_ON_VAGUE_INPUT");
  }

  // Check for missing soil info
  if (!input.toLowerCase().includes("soil") && !input.toLowerCase().includes("sand") && !input.toLowerCase().includes("clay") && !input.toLowerCase().includes("rock")) {
    const allSoilsDefault = result.runs.every(r => r.soilType === "sandy" || r.soilType === "standard");
    if (allSoilsDefault && result.confidence > 0.85) {
      issues.push("ASSUMED_SOIL_TYPE_HIGH_CONFIDENCE");
    }
  }

  // Check for unclear gate sizes
  if ((input.includes("couple gates") || input.includes("not sure what size") || input.includes("figure that out later"))
      && result.runs.some(r => r.gates.length > 0) && result.confidence > 0.85) {
    issues.push("ASSUMED_GATE_SIZES");
  }

  // Check for unclear slope + specific number
  if ((input.includes("slopes a bit") || input.includes("not totally level") || input.includes("uneven"))
      && result.runs.some(r => r.slopePercent > 0 && r.slopePercent !== 5 && r.slopePercent !== 10)
      && result.confidence > 0.85) {
    issues.push("ASSUMED_SPECIFIC_SLOPE_FROM_VAGUE");
  }

  // Check for missing measurements
  if ((input.includes("idk") || input.includes("not sure") || input.includes("whatever"))
      && result.confidence > 0.9) {
    issues.push("HIGH_CONFIDENCE_DESPITE_UNCERTAINTY");
  }

  // Check for multi-product requirements
  if ((input.includes("or") && (input.includes("6 or 8") || input.includes("wood or vinyl")))
      && result.confidence > 0.8) {
    issues.push("DECIDED_AMBIGUOUS_CHOICE");
  }

  // Check for mixed heights
  if (input.toLowerCase().includes("different") || input.toLowerCase().includes("lower") || input.toLowerCase().includes("higher")) {
    const heights = result.runs.map(r => r.heightFt);
    const allSame = heights.every(h => h === heights[0]);
    if (allSame && heights.length > 1) {
      issues.push("MISSED_MIXED_HEIGHTS");
    }
  }

  return issues;
}

// ────────────────────────────────────────────────────────────────────
// Main Test Runner
// ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("AI Extraction Stress Test — REAL-WORLD INPUTS");
  console.log("═══════════════════════════════════════════════════════════\n");

  // Load inputs
  const inputsPath = path.resolve(process.cwd(), "test-fixtures/stress-test-inputs.json");
  const inputsData = JSON.parse(fs.readFileSync(inputsPath, "utf-8"));
  const inputs: StressTestInput[] = inputsData.inputs;

  console.log(`Loaded ${inputs.length} stress test inputs\n`);

  const client = getOpenAI();
  const results: StressTestResult[] = [];

  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  // Run each input
  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    const num = i + 1;

    process.stdout.write(`[${num}/${inputs.length}] ${input.id}... `);

    try {
      const { result, inputTokens, outputTokens } = await runExtraction(client, input.description);

      const issues = detectIssues(input.description, result);

      results.push({
        id: input.id,
        input: input.description,
        extracted: result,
        confidence: result.confidence,
        flags: result.flags || [],
        inputTokens,
        outputTokens,
        issues,
      });

      totalInputTokens += inputTokens;
      totalOutputTokens += outputTokens;

      const statusIcon = issues.length > 0 ? "⚠️ " : "✓";
      console.log(`${statusIcon} conf=${result.confidence.toFixed(2)} issues=${issues.length}`);

    } catch (error: any) {
      console.log(`❌ ERROR: ${error.message}`);
      results.push({
        id: input.id,
        input: input.description,
        extracted: { runs: [], confidence: 0, flags: ["EXTRACTION_FAILED"], rawSummary: "" },
        confidence: 0,
        flags: ["EXTRACTION_FAILED"],
        inputTokens: 0,
        outputTokens: 0,
        issues: ["EXTRACTION_FAILED"],
      });
    }
  }

  // ────────────────────────────────────────────────────────────────────
  // Analysis
  // ────────────────────────────────────────────────────────────────────

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("STRESS TEST SUMMARY");
  console.log("═══════════════════════════════════════════════════════════\n");

  const highConf = results.filter(r => r.confidence > 0.9).length;
  const medConf = results.filter(r => r.confidence >= 0.7 && r.confidence <= 0.9).length;
  const lowConf = results.filter(r => r.confidence < 0.7).length;

  console.log(`Total Inputs: ${results.length}`);
  console.log(`High Confidence (>0.9): ${highConf}`);
  console.log(`Medium (0.7–0.9): ${medConf}`);
  console.log(`Low (<0.7): ${lowConf}`);
  console.log(`Total Tokens: ${totalInputTokens + totalOutputTokens} (${totalInputTokens} in, ${totalOutputTokens} out)\n`);

  // Critical issues
  const criticalIssues = results.filter(r => r.issues.length > 0);
  console.log("CRITICAL ISSUES:");
  if (criticalIssues.length === 0) {
    console.log("  ✅ None detected\n");
  } else {
    console.log(`  ⚠️  ${criticalIssues.length} inputs with issues\n`);
    criticalIssues.forEach(r => {
      console.log(`  • ${r.id}: ${r.issues.join(", ")}`);
    });
    console.log();
  }

  // Issue patterns
  const allIssues = results.flatMap(r => r.issues);
  const issueCounts = new Map<string, number>();
  allIssues.forEach(issue => {
    issueCounts.set(issue, (issueCounts.get(issue) || 0) + 1);
  });
  const topIssues = Array.from(issueCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  console.log("TOP FAILURE PATTERNS:");
  if (topIssues.length === 0) {
    console.log("  ✅ No patterns detected\n");
  } else {
    topIssues.forEach(([issue, count]) => {
      console.log(`  ${count}x: ${issue}`);
    });
    console.log();
  }

  // Ambiguity handling
  console.log("AMBIGUITY HANDLING:");
  const vagueInputs = results.filter(r =>
    r.input.includes("about") || r.input.includes("maybe") || r.input.includes("roughly") ||
    r.input.includes("not sure") || r.input.includes("idk")
  );
  const vagueHighConf = vagueInputs.filter(r => r.confidence > 0.9).length;
  console.log(`  Vague inputs: ${vagueInputs.length}`);
  console.log(`  Vague with high confidence (>0.9): ${vagueHighConf}`);
  if (vagueHighConf > 0) {
    console.log(`  ⚠️  System should lower confidence on ambiguous inputs`);
  } else {
    console.log(`  ✅ Confidence appropriately lowered`);
  }
  console.log();

  // Worst 5
  const worst = results
    .filter(r => r.issues.length > 0)
    .sort((a, b) => b.issues.length - a.issues.length)
    .slice(0, 5);

  console.log("WORST 5 INPUTS:");
  if (worst.length === 0) {
    console.log("  ✅ No problematic inputs\n");
  } else {
    worst.forEach((r, idx) => {
      console.log(`\n${idx + 1}. ${r.id} — ${r.issues.length} issues`);
      console.log(`   Input: "${r.input.substring(0, 100)}..."`);
      console.log(`   Confidence: ${r.confidence.toFixed(2)}`);
      console.log(`   Issues: ${r.issues.join(", ")}`);
      console.log(`   Runs: ${r.extracted.runs.length}`);
      console.log(`   Flags: ${r.flags.length > 0 ? r.flags.join(", ") : "none"}`);
    });
    console.log();
  }

  // ────────────────────────────────────────────────────────────────────
  // Generate Report
  // ────────────────────────────────────────────────────────────────────

  const reportPath = path.resolve(process.cwd(), "docs/stress-test-results.md");
  const report = generateReport(results, totalInputTokens, totalOutputTokens, worst);
  fs.writeFileSync(reportPath, report, "utf-8");

  console.log(`\n📄 Full report: ${reportPath}`);
}

function generateReport(
  results: StressTestResult[],
  totalInputTokens: number,
  totalOutputTokens: number,
  worst: StressTestResult[]
): string {
  const highConf = results.filter(r => r.confidence > 0.9).length;
  const medConf = results.filter(r => r.confidence >= 0.7 && r.confidence <= 0.9).length;
  const lowConf = results.filter(r => r.confidence < 0.7).length;

  const allIssues = results.flatMap(r => r.issues);
  const issueCounts = new Map<string, number>();
  allIssues.forEach(issue => {
    issueCounts.set(issue, (issueCounts.get(issue) || 0) + 1);
  });
  const topIssues = Array.from(issueCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  let md = `# AI Extraction Stress Test Results\n\n`;
  md += `**Generated:** ${new Date().toISOString()}\n`;
  md += `**Dataset:** Real-world messy contractor inputs\n`;
  md += `**Total Inputs:** ${results.length}\n\n`;

  md += `## Summary\n\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Total Inputs | ${results.length} |\n`;
  md += `| High Confidence (>0.9) | ${highConf} |\n`;
  md += `| Medium (0.7–0.9) | ${medConf} |\n`;
  md += `| Low (<0.7) | ${lowConf} |\n`;
  md += `| Inputs with Issues | ${results.filter(r => r.issues.length > 0).length} |\n`;
  md += `| Total Tokens | ${totalInputTokens + totalOutputTokens} |\n`;
  md += `| Input Tokens | ${totalInputTokens.toLocaleString()} |\n`;
  md += `| Output Tokens | ${totalOutputTokens.toLocaleString()} |\n\n`;

  md += `## Top Issue Patterns\n\n`;
  if (topIssues.length === 0) {
    md += `✅ No issues detected\n\n`;
  } else {
    topIssues.forEach(([issue, count]) => {
      md += `- **${count}x**: ${issue}\n`;
    });
    md += `\n`;
  }

  md += `## Worst ${worst.length} Inputs\n\n`;
  worst.forEach((r, idx) => {
    md += `### ${idx + 1}. ${r.id}\n\n`;
    md += `**Input:**\n\`\`\`\n${r.input}\n\`\`\`\n\n`;
    md += `**Confidence:** ${r.confidence.toFixed(2)}\n\n`;
    md += `**Issues:**\n`;
    r.issues.forEach(issue => md += `- ${issue}\n`);
    md += `\n**Flags:**\n`;
    if (r.flags.length === 0) {
      md += `- None\n`;
    } else {
      r.flags.forEach(flag => md += `- ${flag}\n`);
    }
    md += `\n**Extracted Output:**\n\`\`\`json\n${JSON.stringify(r.extracted, null, 2)}\n\`\`\`\n\n`;
  });

  md += `## All Results\n\n`;
  results.forEach(r => {
    const statusIcon = r.issues.length > 0 ? "⚠️" : "✅";
    md += `### ${statusIcon} ${r.id}\n\n`;
    md += `**Input:** "${r.input}"\n\n`;
    md += `**Confidence:** ${r.confidence.toFixed(2)} | **Issues:** ${r.issues.length} | **Flags:** ${r.flags.length}\n\n`;
    if (r.issues.length > 0) {
      md += `**Issues:** ${r.issues.join(", ")}\n\n`;
    }
    md += `<details>\n<summary>Extracted Output</summary>\n\n\`\`\`json\n${JSON.stringify(r.extracted, null, 2)}\n\`\`\`\n</details>\n\n`;
  });

  return md;
}

main().catch(console.error);
