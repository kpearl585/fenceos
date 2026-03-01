"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const PLANS = [
  {
    key: "starter",
    name: "Starter",
    price: 49,
    description: "Perfect for solo operators",
    features: ["1 user", "20 estimates/month", "Customer portal", "PDF generation", "Email notifications"],
    highlighted: false,
  },
  {
    key: "pro",
    name: "Pro",
    price: 89,
    description: "For growing operations",
    features: ["5 users", "Unlimited estimates", "Foreman access", "Job tracking", "Materials management", "Everything in Starter"],
    highlighted: true,
  },
  {
    key: "business",
    name: "Business",
    price: 179,
    description: "For established companies",
    features: ["Unlimited users", "Priority support", "Custom PDF branding", "API access", "Everything in Pro"],
    highlighted: false,
  },
];

export default function UpgradeClient() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleSelect(plan: string) {
    setLoading(plan);
    try {
      const res = await fetch("/api/stripe/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
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
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-fence-950 mb-3">Choose Your Plan</h1>
          <p className="text-gray-500">Start your 14-day free trial. No credit card required until trial ends.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
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
              <div className="mb-6">
                <span className="text-4xl font-black text-fence-950">${plan.price}</span>
                <span className="text-gray-400">/mo</span>
              </div>
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
                {loading === plan.key ? "Loading..." : "Start Free Trial"}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-gray-400 text-xs mt-8">
          Cancel anytime. No contracts. Prices in USD.
        </p>
      </div>
    </div>
  );
}
