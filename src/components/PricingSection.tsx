import Link from "next/link";

const tiers = [
  {
    name: "Starter",
    price: 49,
    annual: 490,
    desc: "Perfect for solo operators who need fast, accurate estimates.",
    features: [
      "Unlimited estimates",
      "Auto material calculations",
      "Margin protection",
      "PDF quote generation",
      "1 user",
      "Email support",
    ],
    cta: "Start Free Trial",
    href: "/signup",
    highlight: false,
  },
  {
    name: "Pro",
    price: 89,
    annual: 890,
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
    cta: "Start Free Trial",
    href: "/signup",
    highlight: true,
    badge: "Most Popular",
  },
  {
    name: "Business",
    price: 179,
    annual: 1790,
    desc: "For growing operations running multiple crews and high job volume.",
    features: [
      "Everything in Pro",
      "Unlimited users",
      "Advanced reporting & KPIs",
      "Dedicated onboarding",
      "Phone support",
    ],
    cta: "Start Free Trial",
    href: "/signup",
    highlight: false,
  },
];

export default function PricingSection() {
  return (
    <section id="pricing" className="bg-gray-50 px-6 py-20 md:py-24">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-fence-600 font-semibold text-sm uppercase tracking-widest mb-3">Simple pricing</p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">No contracts. No surprises.</h2>
          <p className="mt-4 text-gray-500">Start free for 14 days — full access to every feature. No credit card required.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl p-7 flex flex-col ${
                tier.highlight
                  ? "bg-fence-900 text-white border-2 border-fence-500 shadow-2xl scale-105"
                  : "bg-white border border-gray-200 shadow-sm"
              }`}
            >
              {tier.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-fence-500 text-white text-xs font-bold px-4 py-1 rounded-full">{tier.badge}</span>
                </div>
              )}

              <div className="mb-6">
                <p className={`font-semibold text-sm uppercase tracking-wide mb-1 ${tier.highlight ? "text-fence-400" : "text-fence-600"}`}>{tier.name}</p>
                <div className="flex items-baseline gap-1">
                  <span className={`text-4xl font-bold ${tier.highlight ? "text-white" : "text-gray-900"}`}>${tier.price}</span>
                  <span className={`text-sm ${tier.highlight ? "text-fence-300" : "text-gray-400"}`}>/mo</span>
                </div>
                <p className={`text-xs mt-1 ${tier.highlight ? "text-fence-400" : "text-gray-400"}`}>
                  ${tier.annual.toLocaleString()}/yr · save ${tier.price * 12 - tier.annual}
                </p>
                <p className={`text-sm mt-3 leading-relaxed ${tier.highlight ? "text-fence-200" : "text-gray-500"}`}>{tier.desc}</p>
              </div>

              <ul className="space-y-2.5 flex-1 mb-7">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <svg className={`w-4 h-4 mt-0.5 flex-shrink-0 ${tier.highlight ? "text-fence-400" : "text-fence-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className={tier.highlight ? "text-fence-100" : "text-gray-600"}>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={tier.href}
                className={`block text-center font-bold py-3.5 rounded-xl transition-colors ${
                  tier.highlight
                    ? "bg-fence-500 hover:bg-fence-400 text-white"
                    : "bg-fence-50 hover:bg-fence-100 text-fence-700 border border-fence-200"
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-gray-400 text-sm mt-8">All plans include a 14-day free trial · Cancel anytime · No setup fees</p>
      </div>
    </section>
  );
}
