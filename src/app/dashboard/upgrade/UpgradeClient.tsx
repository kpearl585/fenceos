"use client";
import { useState, useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import type { PaywallTrigger } from "@/lib/paywall";

type PlanKey = "starter" | "pro" | "business";

// Maps the paywall trigger that brought the user here to:
//   - a context-setting banner above the plans (headline + sub)
//   - which plan card should be highlighted (overrides the default "pro")
//
// Keep copy short — this sits above the plan cards, not inside them.
const TRIGGER_CONTEXT: Record<
  PaywallTrigger,
  { plan: PlanKey; headline: string; sub: string }
> = {
  estimate_cap_hit: {
    plan: "starter",
    headline: "You've hit your free-tier estimate limit",
    sub: "Upgrade to keep saving quotes — no cap on Starter and up.",
  },
  estimate_cap_warning: {
    plan: "starter",
    headline: "Running low on estimates this month",
    sub: "Upgrade to Starter for unlimited saves.",
  },
  seat_cap: {
    plan: "pro",
    headline: "Add your team",
    sub: "Pro includes 5 seats and foreman access. Business is unlimited.",
  },
  feature_alternative_bids: {
    plan: "pro",
    headline: "Send 3 bid options in one proposal",
    sub: "Contractors who send multiple options close ~30% more often.",
  },
  feature_qb_sync: {
    plan: "business",
    headline: "Sync with QuickBooks automatically",
    sub: "Stop double-entering. QuickBooks sync is on Business.",
  },
  feature_pricing_rules: {
    plan: "business",
    headline: "Automate your pricing rules",
    sub: "By job type, customer tier, or season. Available on Business.",
  },
  feature_pipeline: {
    plan: "pro",
    headline: "See your full pipeline",
    sub: "Revenue, margin, and at-risk jobs in one view. Pro and up.",
  },
  feature_branded_pdf: {
    plan: "pro",
    headline: "Put your logo on every quote",
    sub: "Remove the FenceOS branding. Available on Pro and Business.",
  },
  feature_jobs: {
    plan: "pro",
    headline: "Track jobs from scheduled to closeout",
    sub: "Jobs board, foreman access, change orders. Pro and up.",
  },
  feature_advanced_reporting: {
    plan: "business",
    headline: "Run the business, not just the jobs",
    sub: "Close rate, margin trends, at-risk jobs — full KPI reporting on Business.",
  },
  subscription_expired: {
    plan: "starter",
    headline: "Your trial has ended",
    sub: "All your data is still here. Pick a plan to pick up where you left off.",
  },
  subscription_lapsed: {
    plan: "starter",
    headline: "Update your subscription to restore access",
    sub: "Your data is safe. Reactivate any plan to continue.",
  },
};

const PLANS = [
  {
    key: "starter" as const,
    name: "Starter",
    monthlyPrice: 49,
    annualPrice: 470,
    annualSavings: 118,
    description: "Perfect for solo operators who need fast, accurate estimates.",
    features: ["Unlimited estimates", "Auto material calculations", "Margin protection", "PDF quote generation", "1 user", "Email support"],
  },
  {
    key: "pro" as const,
    name: "Pro",
    monthlyPrice: 89,
    annualPrice: 850,
    annualSavings: 218,
    description: "For contractors running a crew. Everything in Starter, plus job management.",
    features: ["Everything in Starter", "Jobs & foreman board", "Foreman mobile access", "Change order tracking", "Custom branding on PDFs", "5 users", "Priority support"],
  },
  {
    key: "business" as const,
    name: "Business",
    monthlyPrice: 149,
    annualPrice: 1430,
    annualSavings: 358,
    description: "For growing operations running multiple crews and high job volume.",
    features: ["Everything in Pro", "Unlimited users", "Advanced reporting", "Dedicated onboarding", "Phone support"],
  },
];

export default function UpgradeClient({ trigger }: { trigger?: PaywallTrigger | null }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");

  // Resolve context from the trigger — fall back to a generic pitch with
  // Pro highlighted if we don't recognize or didn't get a trigger.
  const context = trigger ? TRIGGER_CONTEXT[trigger] : null;
  const highlightedPlan: PlanKey = context?.plan ?? "pro";

  // Attribution event — log once on mount so we can measure which triggers
  // drive the most upgrade-page visits. Sentry captureMessage at info level
  // keeps it out of the error stream but queryable in the Discover view.
  useEffect(() => {
    if (trigger) {
      Sentry.captureMessage(`Upgrade page visit from trigger: ${trigger}`, {
        tags: { surface: "upgrade-page", trigger },
        level: "info",
      });
    }
  }, [trigger]);

  async function handleSelect(plan: string) {
    setLoading(plan);
    try {
      const res = await fetch("/api/stripe/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          billing_period: billingPeriod,
          // Pass trigger so the Stripe webhook can attribute the signup
          // to the paywall moment that drove it.
          trigger: trigger ?? null,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Something went wrong");
        setLoading(null);
      }
    } catch {
      alert("Failed to start checkout. Please try again.");
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4">
      <div className="max-w-4xl mx-auto">
        {context ? (
          <div className="text-center mb-8">
            <div className="inline-block bg-fence-50 border border-fence-200 text-fence-800 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4">
              Upgrade required
            </div>
            <h1 className="text-3xl font-bold text-fence-950 mb-3">{context.headline}</h1>
            <p className="text-gray-500 max-w-2xl mx-auto">{context.sub}</p>
          </div>
        ) : (
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-fence-950 mb-3">Choose Your Plan</h1>
            <p className="text-gray-500">Subscribe and unlock your full account. Cancel anytime.</p>
          </div>
        )}

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-10">
          <span className={`text-sm font-semibold ${billingPeriod === "monthly" ? "text-fence-900" : "text-gray-400"}`}>Monthly</span>
          <button
            onClick={() => setBillingPeriod(billingPeriod === "monthly" ? "annual" : "monthly")}
            className={`relative w-14 h-7 rounded-full transition-colors ${billingPeriod === "annual" ? "bg-fence-600" : "bg-gray-300"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${billingPeriod === "annual" ? "translate-x-7" : "translate-x-0"}`} />
          </button>
          <span className={`text-sm font-semibold ${billingPeriod === "annual" ? "text-fence-900" : "text-gray-400"}`}>
            Annual
            <span className="ml-2 bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">Save up to $358</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const price = billingPeriod === "annual" ? Math.round(plan.annualPrice / 12) : plan.monthlyPrice;
            const highlighted = plan.key === highlightedPlan;
            return (
              <div
                key={plan.key}
                className={`rounded-2xl p-8 border-2 flex flex-col transition-all ${
                  highlighted
                    ? "border-fence-600 bg-white shadow-xl scale-[1.02]"
                    : "border-gray-200 bg-white"
                }`}
              >
                {highlighted && (
                  <div className="text-xs font-bold text-fence-600 uppercase tracking-wider mb-3">
                    {context ? "Recommended for you" : "Most Popular"}
                  </div>
                )}
                <h2 className="text-xl font-bold text-fence-950 mb-1">{plan.name}</h2>
                <p className="text-gray-500 text-sm mb-4">{plan.description}</p>
                <div className="mb-2">
                  <span className="text-4xl font-black text-fence-950">${price}</span>
                  <span className="text-gray-400">/mo</span>
                  {billingPeriod === "annual" && (
                    <p className="text-xs text-gray-400 mt-0.5">billed ${plan.annualPrice}/yr</p>
                  )}
                </div>
                {billingPeriod === "annual" && (
                  <div className="mb-4">
                    <span className="inline-block bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">
                      Save ${plan.annualSavings}/yr
                    </span>
                  </div>
                )}
                <ul className="space-y-2 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <svg className="w-4 h-4 text-fence-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSelect(plan.key)}
                  disabled={!!loading}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                    highlighted
                      ? "bg-fence-600 text-white hover:bg-fence-700"
                      : "bg-fence-950 text-white hover:bg-fence-800"
                  } disabled:opacity-50`}
                >
                  {loading === plan.key ? "Loading..." : "Subscribe Now"}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-gray-400 text-xs mt-8">
          Cancel anytime. No contracts. Prices in USD.
        </p>
      </div>
    </div>
  );
}
