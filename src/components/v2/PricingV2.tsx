export default function PricingV2() {
  return (
    <section id="pricing" className="bg-surface py-20 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="mb-4 font-display text-3xl font-bold text-text md:text-4xl">
            Simple Pricing. No Surprises.
          </h2>
          <p className="text-xl text-muted">
            One price. All features. Cancel anytime.
          </p>
        </div>

        {/* Single plan - no confusing tiers */}
        <div className="rounded-2xl border-2 border-accent bg-surface p-8 shadow-xl md:p-12">
          <div className="text-center mb-8">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-accent-light">Professional Plan</p>
            <div className="flex items-baseline justify-center gap-2 mb-4">
              <span className="font-display text-5xl font-bold text-text md:text-6xl">$49</span>
              <span className="text-xl text-muted">/month</span>
            </div>
            <p className="text-muted">Everything you need to run your fence business</p>
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
                <span className="text-sm font-medium text-text">{feature}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <a
            href="#waitlist"
            className="mb-4 block w-full rounded-lg bg-accent py-4 text-center text-lg font-bold text-accent-foreground shadow-lg transition-all hover:bg-accent/90"
          >
            Start Your 14-Day Free Trial
          </a>
          <p className="text-center text-sm text-muted">
            No credit card required • Cancel anytime • Setup in 5 minutes
          </p>

          {/* ROI callout */}
          <div className="mt-8 border-t border-border pt-8">
            <div className="rounded-lg bg-accent/10 p-6 text-center">
              <p className="mb-1 text-sm font-semibold text-accent-light">ROI Calculator</p>
              <p className="font-display mb-2 text-3xl font-bold text-accent-light">24x ROI</p>
              <p className="text-sm text-text">
                $49/month vs one $1,200 saved job = pays for itself for 2 years
              </p>
            </div>
          </div>
        </div>

        {/* Money-back guarantee */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-3 rounded-lg border border-border bg-surface px-6 py-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <div className="text-left">
              <p className="text-sm font-bold text-text">14-Day Money-Back Guarantee</p>
              <p className="text-xs text-muted">Not happy? Get a full refund. No questions asked.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
