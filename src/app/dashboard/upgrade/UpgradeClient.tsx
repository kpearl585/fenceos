"use client";
import { useState } from "react";
import { BILLABLE_PLAN_ORDER, BILLING_PLANS } from "@/lib/billing/plans";
import type { PaywallTrigger } from "@/lib/paywall";

export default function UpgradeClient({
  trigger = null,
  currentPlan: _currentPlan = null,
}: {
  trigger?: PaywallTrigger | null;
  currentPlan?: string | null;
} = {}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const plans = BILLABLE_PLAN_ORDER.map((key) => BILLING_PLANS[key]);
  const maxAnnualSavings = Math.max(...plans.map((plan) => plan.annualSavings));

  async function handleSelect(plan: string) {
    setLoading(plan);
    try {
      const res = await fetch("/api/stripe/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, billing_period: billingPeriod, trigger }),
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
    <div className="min-h-screen bg-background text-text py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text mb-3">Choose Your Plan</h1>
          <p className="text-muted">Subscribe and unlock your full account. Cancel anytime.</p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-10">
          <span className={`text-sm font-semibold ${billingPeriod === "monthly" ? "text-text" : "text-muted"}`}>Monthly</span>
          <button
            onClick={() => setBillingPeriod(billingPeriod === "monthly" ? "annual" : "monthly")}
            className={`relative w-14 h-7 rounded-full transition-colors ${billingPeriod === "annual" ? "bg-accent" : "bg-surface-3"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${billingPeriod === "annual" ? "translate-x-7" : "translate-x-0"}`} />
          </button>
          <span className={`text-sm font-semibold ${billingPeriod === "annual" ? "text-text" : "text-muted"}`}>
            Annual
            <span className="ml-2 bg-accent/15 text-accent-light text-xs font-bold px-2 py-0.5 rounded-full">Save up to ${maxAnnualSavings}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const price = billingPeriod === "annual" ? Math.round(plan.annualPrice / 12) : plan.monthlyPrice;
            return (
              <div
                key={plan.key}
                className={`rounded-2xl p-8 border-2 flex flex-col ${
                  plan.highlighted
                    ? "border-accent bg-surface shadow-xl"
                    : "border-border bg-surface"
                }`}
              >
                {plan.highlighted && (
                  <div className="text-xs font-bold text-accent-light uppercase tracking-wider mb-3">
                    Most Popular
                  </div>
                )}
                <h2 className="text-xl font-bold text-text mb-1">{plan.name}</h2>
                <p className="text-muted text-sm mb-4">{plan.description}</p>
                <div className="mb-2">
                  <span className="text-4xl font-black text-text">${price}</span>
                  <span className="text-muted">/mo</span>
                  {billingPeriod === "annual" && (
                    <p className="text-xs text-muted mt-0.5">billed ${plan.annualPrice}/yr</p>
                  )}
                </div>
                {billingPeriod === "annual" && (
                  <div className="mb-4">
                    <span className="inline-block bg-accent/15 text-accent-light text-xs font-bold px-2 py-1 rounded-full">
                      Save ${plan.annualSavings}/yr
                    </span>
                  </div>
                )}
                <ul className="space-y-2 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-text">
                      <svg className="w-4 h-4 text-accent-light mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    plan.highlighted
                      ? "bg-accent text-white hover:bg-accent-light"
                      : "bg-surface-3 text-text hover:bg-surface-2"
                  } disabled:opacity-50`}
                >
                  {loading === plan.key ? "Loading..." : "Subscribe Now"}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-muted text-xs mt-8">
          Cancel anytime. No contracts. Prices in USD.
        </p>
      </div>
    </div>
  );
}
