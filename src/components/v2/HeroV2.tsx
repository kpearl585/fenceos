export default function HeroV2() {
  return (
    <section className="relative bg-gradient-to-b from-background to-surface pt-20 pb-16 md:pt-28 md:pb-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left - Copy */}
          <div>
            {/* Trust badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span className="text-xs font-semibold uppercase tracking-wide text-accent-light">Used by 47+ Contractors</span>
            </div>

            {/* Headline */}
            <h1 className="mb-6 font-display text-5xl font-bold leading-[1.05] tracking-tight text-text sm:text-6xl md:text-7xl">
              Fence Estimates<br />
              in <span className="text-accent-light">5 Minutes.</span><br />
              <span className="text-muted">Not 45.</span>
            </h1>

            {/* Subhead */}
            <p className="mb-8 max-w-xl text-xl leading-relaxed text-muted">
              Stop losing money on bad material counts. Get accurate estimates with auto-calculated posts, panels, and concrete. Lock your margin before you send the quote.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <a
                href="#pricing"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-8 py-4 text-lg font-bold text-accent-foreground shadow-lg transition-all hover:bg-accent/90 hover:shadow-xl"
              >
                Start Free Trial
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </a>
              <a
                href="#demo"
                className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-border bg-surface px-8 py-4 text-lg font-semibold text-text transition-all hover:border-accent hover:text-accent-light"
              >
                See It In Action
              </a>
            </div>

            <p className="mb-8 text-sm text-muted">
              No credit card required • 14-day free trial • Works on your phone
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 border-t border-border pt-6">
              <div>
                <p className="font-display text-3xl font-bold text-text">5 min</p>
                <p className="mt-1 text-sm text-muted">Avg time</p>
              </div>
              <div>
                <p className="font-display text-3xl font-bold text-text">$18K</p>
                <p className="mt-1 text-sm text-muted">Saved/mo</p>
              </div>
              <div>
                <p className="font-display text-3xl font-bold text-text">38%</p>
                <p className="mt-1 text-sm text-muted">Avg margin</p>
              </div>
            </div>
          </div>

          {/* Right - Real estimate screenshot */}
          <div className="relative">
            <div className="overflow-hidden rounded-xl border-2 border-border bg-surface shadow-2xl">
              {/* Browser bar */}
              <div className="flex items-center gap-3 border-b border-border bg-surface-2 px-4 py-3">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-300" />
                  <div className="w-3 h-3 rounded-full bg-gray-300" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 rounded border border-border bg-surface px-3 py-1.5 font-mono text-xs text-muted">
                  app.fenceestimatepro.com
                </div>
              </div>

              {/* Estimate UI */}
              <div className="bg-gradient-to-br from-surface to-surface-2 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-text">Johnson Residence</h3>
                  <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-bold text-accent-light">
                    Ready
                  </span>
                </div>

                {/* Materials */}
                <div className="mb-4 rounded-lg border border-border bg-surface p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Materials</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="font-display text-2xl font-bold text-text">24</p>
                      <p className="mt-1 text-xs text-muted">Posts</p>
                    </div>
                    <div className="text-center">
                      <p className="font-display text-2xl font-bold text-text">18</p>
                      <p className="mt-1 text-xs text-muted">Panels</p>
                    </div>
                    <div className="text-center">
                      <p className="font-display text-2xl font-bold text-text">48</p>
                      <p className="mt-1 text-xs text-muted">Bags</p>
                    </div>
                  </div>
                </div>

                {/* Margin */}
                <div className="mb-4 rounded-lg border border-accent/30 bg-accent/10 p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-accent-light">Margin</span>
                    <span className="font-display text-2xl font-bold text-accent-light">41%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-surface-3">
                    <div className="h-full rounded-full bg-accent-light" style={{ width: "41%" }} />
                  </div>
                  <p className="mt-2 text-xs text-accent-light">Above 35% target ✓</p>
                </div>

                {/* Total */}
                <div className="flex items-baseline justify-between border-t border-border pt-4">
                  <span className="text-sm font-medium text-muted">Total</span>
                  <div className="text-right">
                    <p className="font-display text-3xl font-bold text-text">$6,850</p>
                    <p className="mt-1 text-xs text-muted">185 LF Wood Privacy</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating badge */}
            <div className="absolute -bottom-4 -left-4 rounded-lg border-2 border-accent bg-surface px-4 py-3 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-text">Real Estimate</p>
                  <p className="text-xs text-muted">Active contractor</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
