export default function PricingV2() {
  return (
    <section id="pricing" className="py-20 px-6 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 font-display">
            Simple Pricing. No Surprises.
          </h2>
          <p className="text-xl text-gray-600">
            One price. All features. Cancel anytime.
          </p>
        </div>

        {/* Single plan - no confusing tiers */}
        <div className="bg-white border-2 border-green-500 rounded-2xl p-8 md:p-12 shadow-xl">
          <div className="text-center mb-8">
            <p className="text-sm font-semibold text-green-600 uppercase tracking-wide mb-2">Professional Plan</p>
            <div className="flex items-baseline justify-center gap-2 mb-4">
              <span className="text-5xl md:text-6xl font-bold text-gray-900 font-display">$49</span>
              <span className="text-xl text-gray-600">/month</span>
            </div>
            <p className="text-gray-600">Everything you need to run your fence business</p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {[
              "Unlimited estimates & quotes",
              "Auto material calculations",
              "Margin protection & alerts",
              "Professional branded proposals",
              "E-signature & online acceptance",
              "Job tracking & management",
              "Mobile app (iOS & Android)",
              "Customer database",
              "Email & chat support",
              "Free updates forever"
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span className="text-gray-700 text-sm font-medium">{feature}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <a
            href="#waitlist"
            className="block w-full bg-green-600 hover:bg-green-700 text-white text-center font-bold text-lg py-4 rounded-lg transition-all shadow-lg mb-4"
          >
            Start Your 14-Day Free Trial
          </a>
          <p className="text-center text-sm text-gray-500">
            No credit card required • Cancel anytime • Setup in 5 minutes
          </p>

          {/* ROI callout */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="bg-green-50 rounded-lg p-6 text-center">
              <p className="text-sm font-semibold text-green-900 mb-1">ROI Calculator</p>
              <p className="text-3xl font-bold text-green-600 font-display mb-2">24x ROI</p>
              <p className="text-sm text-gray-700">
                $49/month vs one $1,200 saved job = pays for itself for 2 years
              </p>
            </div>
          </div>
        </div>

        {/* Money-back guarantee */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-3 bg-white border border-gray-300 rounded-lg px-6 py-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <div className="text-left">
              <p className="font-bold text-gray-900 text-sm">14-Day Money-Back Guarantee</p>
              <p className="text-gray-600 text-xs">Not happy? Get a full refund. No questions asked.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
