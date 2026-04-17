import { createAdminClient } from "@/lib/supabase/server";

/**
 * Resolve an org's margin target + warn band from org_settings.
 *
 * Single source of truth for "what margin does this org aim for" used
 * by dashboard KPIs, the owner P&L page, the estimates list row colors,
 * the jobs kanban, and convertActions' stored `margin_status`. Without
 * this shared helper each surface had a different hardcoded threshold
 * (0.30 / 0.35 / 0.28 / 0.20) and edits were made in only some of them.
 *
 * Conventions:
 *   target = the org's target_margin_pct (DB default 0.35; user-editable
 *            in Settings). Decimal — 0.35 = 35%.
 *   warn   = target - 0.05. Yellow band for dashboards; anything below
 *            that is red. Five-pp buffer matches industry practice and
 *            what /dashboard/page.tsx uses since 21574d2.
 *
 * Falls back to 0.35 / 0.30 if the org_settings row is missing (new
 * org whose onboarding upsert hasn't completed yet, or row was wiped).
 */
export interface MarginTargets {
  target: number;
  warn: number;
}

export async function getOrgMarginTargets(orgId: string): Promise<MarginTargets> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("org_settings")
    .select("target_margin_pct")
    .eq("org_id", orgId)
    .maybeSingle();

  const target = Number(data?.target_margin_pct) || 0.35;
  const warn = Math.max(0, target - 0.05);
  return { target, warn };
}

/**
 * Compute the stored `margin_status` bucket for an estimate/job given
 * the org's target. Used by convertActions when creating an estimate
 * row and anywhere else we need to persist a bucketed status tied to
 * org policy.
 *
 *   good    >= target       (you hit or exceeded the target)
 *   warning >= target - 5pp (within the yellow band)
 *   low     <  target - 5pp (trouble — red)
 */
export function marginStatus(
  grossMarginPct: number,
  { target, warn }: MarginTargets
): "good" | "warning" | "low" {
  if (grossMarginPct >= target) return "good";
  if (grossMarginPct >= warn) return "warning";
  return "low";
}
