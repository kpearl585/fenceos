/**
 * Subscription & Plan Enforcement
 *
 * Centralized check for whether an org's subscription is active.
 * Call this from any server action or page that should be gated.
 *
 * Logic:
 *   - plan = "trial" + trial_ends_at > now → active (trial)
 *   - plan = "trial" + trial_ends_at <= now → expired → "free" tier
 *   - plan = "starter"/"pro"/"business" + plan_status = "active" → active
 *   - plan = "starter"/"pro"/"business" + plan_status != "active" → lapsed → "free" tier
 *   - plan = null/undefined → "free" tier
 */

import { createAdminClient } from "@/lib/supabase/server";
import { getPlanLimits, type PlanKey, type PlanLimits, PLAN_UPGRADE_URL } from "@/lib/planLimits";
import { buildPaywallBlock, type PaywallBlock } from "@/lib/paywall";

export interface SubscriptionStatus {
  /** The effective plan after trial expiry / lapsed subscription. */
  effectivePlan: PlanKey;
  /** The plan limits for the effective plan. */
  limits: PlanLimits;
  /** Whether the subscription is in good standing (trial active OR paid active). */
  isActive: boolean;
  /** If not active, a human-readable reason. */
  reason?: string;
  /** Days remaining in trial (null if not on trial). */
  trialDaysRemaining?: number | null;
}

/**
 * Check an org's subscription status.
 * Returns the effective plan, limits, and whether access should be granted.
 *
 * Usage in server actions:
 *   const sub = await checkSubscription(orgId);
 *   if (!sub.isActive) return { success: false, error: sub.reason };
 *   if (sub.limits.maxEstimatesPerMonth != null) { ... check count ... }
 */
export async function checkSubscription(orgId: string): Promise<SubscriptionStatus> {
  try {
    const admin = createAdminClient();
    const { data: org } = await admin
      .from("organizations")
      .select("plan, plan_status, trial_ends_at")
      .eq("id", orgId)
      .single();

    if (!org) {
      return {
        effectivePlan: "free",
        limits: getPlanLimits("free"),
        isActive: false,
        reason: "Organization not found. Please contact support.",
      };
    }

    const plan = org.plan as PlanKey | null;
    const planStatus = org.plan_status as string | null;
    const trialEndsAt = org.trial_ends_at ? new Date(org.trial_ends_at) : null;
    const now = new Date();

    // Trial check
    if (plan === "trial" || (!plan && trialEndsAt)) {
      if (trialEndsAt && trialEndsAt > now) {
        const daysRemaining = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return {
          effectivePlan: "trial",
          limits: getPlanLimits("trial"),
          isActive: true,
          trialDaysRemaining: daysRemaining,
        };
      }
      // Trial expired
      return {
        effectivePlan: "free",
        limits: getPlanLimits("free"),
        isActive: false,
        reason: "Your free trial has expired. Upgrade to continue creating estimates.",
        trialDaysRemaining: 0,
      };
    }

    // Paid plan check
    if (plan && ["starter", "pro", "business"].includes(plan)) {
      if (planStatus === "active") {
        return {
          effectivePlan: plan,
          limits: getPlanLimits(plan),
          isActive: true,
        };
      }
      // Lapsed / canceled / past_due
      return {
        effectivePlan: "free",
        limits: getPlanLimits("free"),
        isActive: false,
        reason: `Your ${plan} subscription is ${planStatus || "inactive"}. Please update your payment to continue.`,
      };
    }

    // No plan at all → free tier
    return {
      effectivePlan: "free",
      limits: getPlanLimits("free"),
      isActive: false,
      reason: "No active subscription. Choose a plan to get started.",
    };
  } catch {
    // Fail open for subscription checks — don't block a paying customer
    // because of a transient DB error. Log and allow.
    console.error("Subscription check failed, allowing access");
    return {
      effectivePlan: "trial",
      limits: getPlanLimits("trial"),
      isActive: true,
    };
  }
}

/**
 * Quick gate for server actions: returns an error object if the org
 * doesn't have an active subscription, or null if access is allowed.
 *
 * Usage:
 *   const blocked = await requireActiveSubscription(orgId);
 *   if (blocked) return blocked;
 */
export async function requireActiveSubscription(
  orgId: string
): Promise<{ success: false; error: string; upgradeUrl: string } | null> {
  const sub = await checkSubscription(orgId);
  if (sub.isActive) return null;
  return {
    success: false,
    error: sub.reason ?? "Subscription required.",
    upgradeUrl: PLAN_UPGRADE_URL,
  };
}

/**
 * Unified billing gate for all revenue-generating server actions.
 *
 * Returns either:
 *   - null → access allowed, proceed
 *   - PaywallBlock → caller should `return` it to the client so the modal fires
 *
 * Enforces two layers:
 *   1. Subscription active (trial valid OR paid plan in good standing)
 *   2. Monthly estimate-cap not exceeded (if the plan has a cap)
 *
 * The cap check counts fence_graphs rows created this calendar month for
 * the org. Applies to any action that consumes quota — save, PDF, AI,
 * quote-convert — so a capped user can't bypass the save gate by using
 * PDF/AI export on a non-saved estimate.
 */
export async function enforceBillingGate(
  orgId: string
): Promise<PaywallBlock | null> {
  const sub = await checkSubscription(orgId);

  if (!sub.isActive) {
    return buildPaywallBlock(
      sub.trialDaysRemaining != null ? "subscription_expired" : "subscription_lapsed",
      sub.effectivePlan,
    );
  }

  if (sub.limits.maxEstimatesPerMonth != null) {
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const admin = createAdminClient();
    const { count } = await admin
      .from("fence_graphs")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .gte("created_at", monthStart.toISOString());
    const used = count ?? 0;
    if (used >= sub.limits.maxEstimatesPerMonth) {
      return buildPaywallBlock("estimate_cap_hit", sub.effectivePlan, {
        used,
        limit: sub.limits.maxEstimatesPerMonth,
      });
    }
  }

  return null;
}
