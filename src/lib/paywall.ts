/**
 * Paywall triggers & block builder.
 *
 * Server actions return a PaywallBlock when an operation is gated behind
 * an upgrade. The client uses isPaywallBlock() to detect it and renders
 * <PaywallModal /> with trigger-specific copy.
 *
 * Back-compat: PaywallBlock is a superset of the existing
 * { success: false, error, upgradeUrl } shape, so callers that only
 * check `error` continue to work unchanged.
 */

import { PLAN_UPGRADE_URL, type PlanKey } from "@/lib/planLimits";

export type PaywallTrigger =
  | "estimate_cap_warning"      // soft: 80%+ of monthly estimates used
  | "estimate_cap_hit"          // hard: monthly estimates exhausted
  | "seat_cap"                  // tried to invite a teammate over limit
  | "feature_alternative_bids"  // multi-bid proposals (Pro+)
  | "feature_qb_sync"           // QuickBooks sync (Crew only)
  | "feature_pricing_rules"     // pricing rules engine (Crew only)
  | "feature_pipeline"          // pipeline value dashboard (Pro+)
  | "feature_branded_pdf"       // custom PDF branding (Pro+)
  | "feature_jobs"              // jobs board / foreman (Pro+)
  | "subscription_expired"      // trial over, no paid plan
  | "subscription_lapsed";      // paid plan past_due / canceled

/** Internal plan key → marketing display name. */
export const PLAN_DISPLAY_NAME: Record<PlanKey, string> = {
  trial: "Trial",
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  business: "Crew",
};

export const PLAN_PRICE: Record<PlanKey, string> = {
  trial: "",
  free: "",
  starter: "$49/mo",
  pro: "$129/mo",
  business: "$299/mo",
};

export interface PaywallContext {
  /** Used count for cap-based triggers (estimates, seats). */
  used?: number;
  /** Limit for cap-based triggers. */
  limit?: number;
  /** Human-readable feature name, used in generic feature triggers. */
  feature?: string;
}

export interface PaywallBlock {
  success: false;
  /** Marker for isPaywallBlock() type guard. */
  paywall: true;
  trigger: PaywallTrigger;
  /** Plan the user is on when they hit the wall. */
  currentPlan: PlanKey;
  /** Plan we're pitching them to upgrade to. */
  suggestedPlan: "starter" | "pro" | "business";
  /** Pre-formatted error string (for non-modal contexts / logs). */
  error: string;
  upgradeUrl: string;
  context?: PaywallContext;
}

/**
 * Pick the next-best plan to pitch based on current plan and what's gated.
 * Feature gates override cap gates (e.g. QB sync always pitches Crew).
 */
function pickSuggestedPlan(
  trigger: PaywallTrigger,
  currentPlan: PlanKey
): "starter" | "pro" | "business" {
  // Crew-only features
  if (trigger === "feature_qb_sync" || trigger === "feature_pricing_rules") {
    return "business";
  }
  // Pro-or-higher features — if they're already on Pro, push Crew
  if (
    trigger === "feature_alternative_bids" ||
    trigger === "feature_pipeline" ||
    trigger === "feature_branded_pdf" ||
    trigger === "feature_jobs"
  ) {
    return currentPlan === "pro" ? "business" : "pro";
  }
  // Seat cap — same rule as Pro-only: starter→pro, pro→business
  if (trigger === "seat_cap") {
    return currentPlan === "pro" ? "business" : "pro";
  }
  // Estimate caps — suggest next tier up from current
  if (currentPlan === "free" || currentPlan === "trial") return "starter";
  if (currentPlan === "starter") return "pro";
  return "business";
}

/** Default error string used when the client doesn't render the modal. */
function defaultError(trigger: PaywallTrigger, ctx?: PaywallContext): string {
  switch (trigger) {
    case "estimate_cap_hit":
      return "You've used all estimates for this month. Upgrade to continue.";
    case "estimate_cap_warning":
      return `Only ${Math.max(0, (ctx?.limit ?? 0) - (ctx?.used ?? 0))} estimates left this month.`;
    case "seat_cap":
      return "Your plan's seat limit is reached. Upgrade to add more teammates.";
    case "feature_qb_sync":
      return "QuickBooks sync is available on Crew.";
    case "feature_pricing_rules":
      return "The pricing rules engine is available on Crew.";
    case "feature_alternative_bids":
      return "Alternative bids are available on Pro and Crew.";
    case "feature_pipeline":
      return "The pipeline dashboard is available on Pro and Crew.";
    case "feature_branded_pdf":
      return "Custom PDF branding is available on Pro and Crew.";
    case "feature_jobs":
      return "Jobs tracking is available on Pro and Crew.";
    case "subscription_expired":
      return "Your free trial has expired. Upgrade to continue.";
    case "subscription_lapsed":
      return "Your subscription is past due. Update payment to continue.";
  }
}

/** Build a paywall block to return from a server action. */
export function buildPaywallBlock(
  trigger: PaywallTrigger,
  currentPlan: PlanKey,
  context?: PaywallContext
): PaywallBlock {
  return {
    success: false,
    paywall: true,
    trigger,
    currentPlan,
    suggestedPlan: pickSuggestedPlan(trigger, currentPlan),
    error: defaultError(trigger, context),
    upgradeUrl: PLAN_UPGRADE_URL,
    context,
  };
}

/** Type guard — call from client code on a server action response. */
export function isPaywallBlock(value: unknown): value is PaywallBlock {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { paywall?: unknown }).paywall === true &&
    typeof (value as { trigger?: unknown }).trigger === "string"
  );
}
