"use client";

import { useState } from "react";
import Link from "next/link";

const tiers = [
  {
    name: "Starter",
    price: 29,
    annual: 290,
    desc: "Perfect for solo operators who need fast, accurate estimates.",
    features: [
      "Unlimited estimates",
      "Auto material calculations",
      "Margin protection",
      "PDF quote generation",
      "1 user",
      "Email support",
    ],
    cta: "Request Access",
    href: "#waitlist",
    highlight: false,
  },
  {
    name: "Pro",
    price: 79,
    annual: 790,
    desc: "For contractors running a crew. Everything in Starter, plus job management.",
    features: [
      "Everything in Starter",
      "Jobs & foreman board",
      "Foreman mobile access",
      "Change order tracking",
      "Custom branding on PDFs",
      "3 users",
      "Priority support",
    ],
    cta: "Request Access",
    href: "#waitlist",
    highlight: true,
    badge: "Most Popular",
  },
  {
    name: "Business",
    price: 149,
    annual: 1490,
    desc: "For growing operations running multiple crews and high job volume.",
    features: [
      "Everything in Pro",
      "Unlimited users",
      "Advanced reporting & KPIs",
      "Dedicated onboarding",
      "Phone support",
    ],
    cta: "Request Access",
    href: "#waitlist",
    highlight: false,
  },
];

export default function PricingSection() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="bg-[#0F0F0F] px-6 py-20 md:py-24">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-[#16A34A] font-semibold text-sm uppercase tracking-widest mb-3">Simple pricing</p>
          <h2 className="text-3xl md:text-4xl font-bold text-[#F2F2F2] font-display">No contracts. No surprises.</h2>
          <p className="mt-4 text-[#6B7280]">Start free for 14 days - full access to every feature. No credit card required.</p>
        </div>

        {/* Annual toggle */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <span className={`text-sm font-medium ${!annual ? "text-[#F2F2F2]" : "text-[#6B7280]"}`}>Monthly</span>
          <button
            onClick={() => setAnnual(!annual)}
            className={`relative w-12 h-6 rounded-full transition-colors ${annual ? "bg-[#16A34A]" : "bg-[#1C1C1C]"}`}
          >
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${annual ? "translate-x-6" : "translate-x-0.5"}`} />
          </button>
          <span className={`text-sm font-medium ${annual ? "text-[#F2F2F2]" : "text-[#6B7280]"}`}>Annual</span>
          {annual && <span className="text-xs font-bold text-[#22C55E] bg-[rgba(22,163,74,0.15)] px-2 py-0.5 rounded-full">2 months free</span>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiers.map((tier) => {
            const displayPrice = annual ? Math.round(tier.annual / 12) : tier.price;
            const yearlyTotal = annual ? tier.annual : tier.price * 12;
            const savings = tier.price * 12 - tier.annual;

            return (
              <div
                key={tier.name}
                className={`relative rounded-2xl p-7 flex flex-col ${
                  tier.highlight
                    ? "bg-[#161616] border-2 border-[#16A34A] accent-glow"
                    : "bg-[#161616] border border-[rgba(255,255,255,0.07)]"
                }`}
              >
                {tier.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-[#16A34A] text-white text-xs font-bold px-4 py-1 rounded-full">{tier.badge}</span>
                  </div>
                )}

                <div className="mb-6">
                  <p className={`font-semibold text-sm uppercase tracking-wide mb-1 ${tier.highlight ? "text-[#22C55E]" : "text-[#16A34A]"}`}>{tier.name}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-[#F2F2F2] font-display">${displayPrice}</span>
                    <span className="text-sm text-[#6B7280]">/mo</span>
                  </div>
                  <p className="text-xs mt-1 text-[#6B7280]">
                    ${yearlyTotal.toLocaleString()}/yr{annual ? ` \u00B7 save $${savings}` : ""}
                  </p>
                  <p className="text-sm mt-3 leading-relaxed text-[#6B7280]">{tier.desc}</p>
                </div>

                <ul className="space-y-2.5 flex-1 mb-7">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#22C55E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-[#F2F2F2]/80">{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={tier.href}
                  className={`block text-center font-bold py-3.5 rounded-xl transition-colors ${
                    tier.highlight
                      ? "bg-[#16A34A] hover:bg-[#22C55E] text-white"
                      : "bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.08)] text-[#F2F2F2] border border-[rgba(255,255,255,0.07)]"
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            );
          })}
        </div>

        <p className="text-center text-[#6B7280] text-sm mt-8">All plans include a 14-day free trial • Cancel anytime • No setup fees</p>
      </div>
    </section>
  );
}
