import { siteConfig } from "@/lib/site";

export default function PricingSection() {
  return (
    <section id="pricing" className="bg-white px-6 py-20 md:py-28">
      <div className="max-w-3xl mx-auto text-center">
        <p className="text-fence-500 font-semibold text-sm uppercase tracking-widest mb-4">
          Beta Pricing
        </p>
        <h2 className="text-3xl md:text-4xl font-bold">
          Simple pricing. No surprises.
        </h2>
        <p className="mt-4 text-lg text-gray-600 max-w-xl mx-auto">
          {siteConfig.name} is launching soon. Early users lock in the lowest
          price — forever.
        </p>

        <div className="mt-12 bg-fence-50 border-2 border-fence-200 rounded-2xl p-8 md:p-12 max-w-md mx-auto">
          <p className="text-sm font-semibold text-fence-600 uppercase tracking-wide">
            Pro Plan
          </p>
          <div className="mt-4 flex items-baseline justify-center gap-2">
            <span className="text-5xl font-bold text-fence-900">$19–29</span>
            <span className="text-gray-500 text-lg">/month</span>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Beta pricing. Locked in for early access users.
          </p>
          <ul className="mt-8 text-left space-y-3">
            {[
              "Unlimited estimates",
              "Automatic material calculations",
              "Margin protection on every quote",
              "PDF estimate downloads",
              "Change order tracking",
              "Mobile-first — works on any phone",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-fence-500 mt-0.5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-gray-700">{item}</span>
              </li>
            ))}
          </ul>

          <a
            href="#demo"
            className="mt-8 block w-full bg-fence-500 hover:bg-fence-600 text-white font-semibold text-lg py-4 rounded-lg transition-colors text-center"
          >
            Try the Demo First
          </a>
        </div>
      </div>
    </section>
  );
}
