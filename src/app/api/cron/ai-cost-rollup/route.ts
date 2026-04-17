import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as Sentry from "@sentry/nextjs";

// Daily cron: aggregate yesterday's GPT-4o extraction usage per org,
// compute cost, surface to Sentry. Catches runaway AI spend before the
// monthly OpenAI invoice does — a single compromised account running
// extract-on-a-loop can burn thousands of dollars in hours.
//
// How this fits with existing controls:
//   - /api/cron/trial-emails: engagement
//   - /api/cron/stripe-reconcile: revenue integrity
//   - this cron:              cost observability (flip side)
//
// Strategy:
//   - info-level Sentry message for EVERY org that had usage (normal
//     baseline — queryable in Discover to see day-over-day trends)
//   - warning-level Sentry message when any org crosses ALERT_USD/day
//     (loud enough to notice, not loud enough to page)
//   - response payload includes per-org breakdown so the Vercel cron
//     dashboard shows the same data without needing Sentry

// GPT-4o pricing (OpenAI published rates). Update when OpenAI changes
// them — small API to call + rare enough that a code change is fine.
const GPT4O_INPUT_PER_TOKEN = 2.5 / 1_000_000;   // $2.50 per 1M tokens
const GPT4O_OUTPUT_PER_TOKEN = 10 / 1_000_000;   // $10.00 per 1M tokens

// Daily per-org threshold that flips from info → warning in Sentry.
// Starts generous. Tighten later once we have a baseline.
const ALERT_USD = 5.0;

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type LogRow = {
  org_id: string;
  input_tokens: number | null;
  output_tokens: number | null;
  model: string | null;
};

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = admin();

  // Rollup window: yesterday UTC (00:00 → 24:00).
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(end.getTime() - 86400000);

  const { data: rows, error: fetchErr } = await supabase
    .from("ai_extraction_log")
    .select("org_id, input_tokens, output_tokens, model")
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString());

  if (fetchErr) {
    Sentry.captureException(fetchErr, {
      tags: { cron: "ai-cost-rollup", step: "fetch" },
    });
    return NextResponse.json({ error: "Failed to fetch ai_extraction_log" }, { status: 500 });
  }

  // Aggregate per-org.
  type Bucket = {
    orgId: string;
    calls: number;
    inputTokens: number;
    outputTokens: number;
    usd: number;
  };
  const buckets = new Map<string, Bucket>();

  for (const r of (rows as LogRow[] | null) ?? []) {
    if (!r.org_id) continue;
    const b = buckets.get(r.org_id) ?? {
      orgId: r.org_id,
      calls: 0,
      inputTokens: 0,
      outputTokens: 0,
      usd: 0,
    };
    const input = r.input_tokens ?? 0;
    const output = r.output_tokens ?? 0;
    b.calls++;
    b.inputTokens += input;
    b.outputTokens += output;
    b.usd += input * GPT4O_INPUT_PER_TOKEN + output * GPT4O_OUTPUT_PER_TOKEN;
    buckets.set(r.org_id, b);
  }

  const perOrg = Array.from(buckets.values()).sort((a, b) => b.usd - a.usd);
  const totalUsd = perOrg.reduce((s, b) => s + b.usd, 0);
  const alertedOrgs = perOrg.filter((b) => b.usd >= ALERT_USD);

  // Emit Sentry messages — one per org with usage, plus a rollup.
  for (const b of perOrg) {
    Sentry.captureMessage(
      `AI cost rollup: org ${b.orgId} spent $${b.usd.toFixed(4)} on ${b.calls} call(s) yesterday (${b.inputTokens + b.outputTokens} tokens)`,
      {
        tags: {
          cron: "ai-cost-rollup",
          orgId: b.orgId,
          alert: b.usd >= ALERT_USD ? "true" : "false",
        },
        level: b.usd >= ALERT_USD ? "warning" : "info",
        extra: {
          date: start.toISOString().slice(0, 10),
          calls: b.calls,
          inputTokens: b.inputTokens,
          outputTokens: b.outputTokens,
          usd: b.usd,
        },
      }
    );
  }

  if (perOrg.length > 0) {
    Sentry.captureMessage(
      `AI cost daily total: $${totalUsd.toFixed(4)} across ${perOrg.length} org(s)${alertedOrgs.length > 0 ? ` — ${alertedOrgs.length} over $${ALERT_USD} alert threshold` : ""}`,
      {
        tags: { cron: "ai-cost-rollup", step: "summary" },
        level: alertedOrgs.length > 0 ? "warning" : "info",
        extra: {
          date: start.toISOString().slice(0, 10),
          orgCount: perOrg.length,
          totalUsd,
          alertedOrgs: alertedOrgs.map((o) => ({ orgId: o.orgId, usd: o.usd })),
        },
      }
    );
  }

  return NextResponse.json({
    ok: true,
    date: start.toISOString().slice(0, 10),
    orgCount: perOrg.length,
    totalUsd,
    alertThresholdUsd: ALERT_USD,
    alertedOrgs: alertedOrgs.map((b) => ({
      orgId: b.orgId,
      calls: b.calls,
      usd: Number(b.usd.toFixed(4)),
    })),
    perOrg: perOrg.slice(0, 50).map((b) => ({
      orgId: b.orgId,
      calls: b.calls,
      inputTokens: b.inputTokens,
      outputTokens: b.outputTokens,
      usd: Number(b.usd.toFixed(4)),
    })),
  });
}
