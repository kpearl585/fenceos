"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const PLANS = [
  {
    key: "starter",
    name: "Starter",
    monthlyPrice: 29,
    annualPrice: 290,
    annualSavings: 58,
    description: "Perfect for solo operators who need fast, accurate estimates.",
    features: ["Unlimited estimates", "Auto material calculations", "Margin protection", "PDF quote generation", "1 user", "Email support"],
    highlighted: false,
  },
  {
    key: "pro",
    name: "Pro",
    monthlyPrice: 79,
    annualPrice: 790,
    annualSavings: 158,
    description: "For contractors running a crew. Everything in Starter, plus job management.",
    features: ["Everything in Starter", "Jobs & foreman board", "Foreman mobile access", "Change order tracking", "Custom branding on PDFs", "3 users", "Priority support"],
    highlighted: true,
  },
  {
    key: "business",
    name: "Business",
    monthlyPrice: 149,
    annualPrice: 1490,
    annualSavings: 298,
    description: "For growing operations running multiple crews and high job volume.",
    features: ["Everything in Pro", "Unlimited users", "Advanced reporting", "Dedicated onboarding", "Phone support"],
    highlighted: false,
  },
];

export default function UpgradeClient() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");

  async function handleSelect(plan: string) {
    setLoading(plan);
    try {
      const res = await fetch("/api/stripe/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, billing_period: billingPeriod }),
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
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-fence-950 mb-3">Choose Your Plan</h1>
          <p className="text-gray-500">Subscribe and unlock your full account. Cancel anytime.</p>
        </div>

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
            return (
              <div
                key={plan.key}
                className={`rounded-2xl p-8 border-2 flex flex-col ${
                  plan.highlighted
                    ? "border-fence-600 bg-white shadow-xl"
                    : "border-gray-200 bg-white"
                }`}
              >
                {plan.highlighted && (
                  <div className="text-xs font-bold text-fence-600 uppercase tracking-wider mb-3">
                    Most Popular
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
                    plan.highlighted
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
