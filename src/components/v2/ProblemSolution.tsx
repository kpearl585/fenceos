export default function ProblemSolution() {
  return (
    <section className="bg-background py-20 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="mb-4 font-display text-3xl font-bold text-text md:text-4xl">
            Stop Losing Money on Every Estimate
          </h2>
          <p className="mx-auto max-w-3xl text-xl text-muted">
            Manual estimates cost you time and profit. One miscounted bag of concrete or wrong post count can wipe out your margin.
          </p>
        </div>

        {/* Before/After comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {/* Without */}
          <div className="rounded-2xl border-2 border-danger/30 bg-danger/10 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/15">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </div>
              <h3 className="font-display text-2xl font-bold text-danger">Manual Estimates</h3>
            </div>
            <ul className="space-y-4">
              {[
                "45-60 minutes per estimate",
                "Guessing material quantities",
                "Forgot gate posts = $800 loss",
                "Wrong concrete count = extra trip",
                "Margin mistakes = lost jobs",
                "Paper proposals look amateur"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-danger/90">
                  <svg className="w-5 h-5 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  <span className="text-sm font-medium">{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 border-t border-danger/20 pt-6">
              <p className="text-sm font-bold text-danger">Average annual loss: $14,000-$28,000</p>
            </div>
          </div>

          {/* With */}
          <div className="rounded-2xl border-2 border-accent/40 bg-accent/10 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/15">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h3 className="font-display text-2xl font-bold text-accent-light">FenceEstimatePro</h3>
            </div>
            <ul className="space-y-4">
              {[
                "5 minutes from job site to quote",
                "Every post & panel auto-counted",
                "Gate posts calculated automatically",
                "Exact concrete bags per hole size",
                "Margin locked before you quote",
                "Professional branded proposals"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-accent-light">
                  <svg className="w-5 h-5 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span className="text-sm font-medium">{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 border-t border-accent/20 pt-6">
              <p className="text-sm font-bold text-accent-light">ROI: $49/month vs $1,200+ saved per job</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <a
            href="#pricing"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-8 py-4 text-lg font-bold text-accent-foreground shadow-lg transition-all hover:bg-accent/90"
          >
            Stop Losing Money - Start Free Trial
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
