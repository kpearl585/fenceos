/**
 * Estimator Instrumentation — Sentry breadcrumbs + structured context
 *
 * Adds rich observability to the Advanced Estimator's server actions
 * so Sentry errors have full context (fence type, LF, gate count, etc.)
 * and performance traces show which operations are slow.
 *
 * Usage in server actions:
 *   import { instrument } from "@/lib/observability/estimator-instrumentation";
 *   instrument.estimateSaved({ totalLF: 100, fenceType: "vinyl", totalCost: 3500 });
 */

import * as Sentry from "@sentry/nextjs";

// ── Breadcrumb helpers ───────────────────────���──────────────────

function breadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>,
  level: Sentry.SeverityLevel = "info",
) {
  Sentry.addBreadcrumb({
    category: `estimator.${category}`,
    message,
    data,
    level,
    timestamp: Date.now() / 1000,
  });
}

// ── Public API ─────────────────────────────────────────────────���

export const instrument = {
  /** Called after a successful saveAdvancedEstimate */
  estimateSaved(data: {
    totalLF: number;
    fenceType: string;
    totalCost: number;
    gateCount?: number;
    windMode?: boolean;
  }) {
    breadcrumb("save", `Estimate saved: ${data.totalLF} LF ${data.fenceType} $${data.totalCost}`, data);
    Sentry.setTag("estimator.fence_type", data.fenceType);
    Sentry.setTag("estimator.total_lf", String(data.totalLF));
  },

  /** Called after a PDF is generated (internal BOM or customer proposal) */
  pdfGenerated(data: {
    type: "internal_bom" | "customer_proposal";
    projectName: string;
    durationMs?: number;
  }) {
    breadcrumb("pdf", `PDF generated: ${data.type} for "${data.projectName}"`, data);
  },

  /** Called after an AI extraction completes */
  aiExtractionCompleted(data: {
    inputType: "text" | "image";
    confidence: number;
    runCount: number;
    blocked: boolean;
    inputTokens?: number;
    outputTokens?: number;
  }) {
    breadcrumb(
      "ai",
      `AI extraction: ${data.runCount} runs, ${Math.round(data.confidence * 100)}% confidence${data.blocked ? " (BLOCKED)" : ""}`,
      data,
      data.blocked ? "warning" : "info",
    );
    Sentry.setTag("ai.input_type", data.inputType);
    Sentry.setTag("ai.confidence_tier", data.confidence >= 0.85 ? "high" : data.confidence >= 0.65 ? "medium" : "low");
  },

  /** Called after a closeout is submitted */
  closeoutSubmitted(data: {
    estimateId: string;
    actualWastePct: number;
    hasLaborActuals: boolean;
  }) {
    breadcrumb("closeout", `Closeout: waste ${data.actualWastePct}%`, data);
  },

  /** Called after an estimate is converted to a sendable quote */
  estimateConverted(data: {
    estimateId: string;
    bidPrice: number;
    totalLF: number;
  }) {
    breadcrumb("convert", `Converted to estimate: $${data.bidPrice} for ${data.totalLF} LF`, data);
  },

  /** Called when a rate limit is hit */
  rateLimitHit(data: {
    action: string;
    orgId: string;
  }) {
    breadcrumb("rate_limit", `Rate limit hit: ${data.action}`, data, "warning");
    Sentry.setTag("rate_limit.action", data.action);
  },
};
