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
