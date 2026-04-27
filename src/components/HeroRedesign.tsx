export default function HeroRedesign() {
  return (
    <section className="relative overflow-hidden bg-background px-6 pb-16 pt-20 md:pb-24 md:pt-28">
      {/* Subtle wood texture background */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23000000" fill-opacity="1"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
      }} />

      <div className="relative max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left - Copy */}
          <div>
            {/* Trust badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span className="text-xs font-semibold uppercase tracking-wide text-accent-light">Trusted by 47+ Fence Contractors</span>
            </div>

            {/* Headline - Direct, benefit-focused */}
            <h1 className="mb-6 font-display text-4xl font-bold leading-[1.1] tracking-tight text-text sm:text-5xl md:text-6xl lg:text-7xl">
              Fence Estimates<br />
              <span className="text-accent-light">in 5 Minutes.</span><br />
              <span className="text-muted">Not 45.</span>
            </h1>

            {/* Subheadline - Clear value prop */}
            <p className="mb-8 max-w-xl text-lg leading-relaxed text-muted md:text-xl">
              Stop losing money on bad material counts. FenceEstimatePro calculates every post, panel, and bag of concrete automatically. Lock your margin before you send the quote.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <a
                href="#waitlist"
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
                Watch Demo
              </a>
            </div>

            {/* Trust line */}
            <p className="mb-8 text-sm text-muted">
              No credit card • 14-day free trial • Works on your phone
            </p>

            {/* Social proof stats - Simple, clean */}
            <div className="grid grid-cols-3 gap-6 border-t border-border pt-6">
              <div>
                <p className="font-display text-3xl font-bold text-text">5 min</p>
                <p className="mt-1 text-sm text-muted">Avg estimate time</p>
              </div>
              <div>
                <p className="font-display text-3xl font-bold text-text">$18K+</p>
                <p className="mt-1 text-sm text-muted">Saved monthly</p>
              </div>
              <div>
                <p className="font-display text-3xl font-bold text-text">38%</p>
                <p className="mt-1 text-sm text-muted">Avg margin</p>
              </div>
            </div>
          </div>

          {/* Right - Screenshot (REAL, not mockup) */}
          <div className="relative">
            {/* Real estimate screenshot placeholder - Replace with actual screenshot */}
            <div className="overflow-hidden rounded-xl border-2 border-border bg-surface shadow-2xl">
              {/* Browser chrome - minimal */}
              <div className="flex items-center gap-3 border-b border-border bg-surface-2 px-4 py-3">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-300" />
                  <div className="w-3 h-3 rounded-full bg-gray-300" />
                  <div className="w-3 h-3 rounded-full bg-gray-300" />
                </div>
                <div className="flex-1 rounded border border-border bg-surface px-3 py-1.5 font-mono text-xs text-muted">
                  fenceestimatepro.com
                </div>
              </div>

              {/* Estimate view */}
              <div className="bg-gradient-to-br from-surface to-surface-2 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-text">Johnson Residence</h3>
                  <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-bold text-accent-light">
                    Ready to Send
                  </span>
                </div>

                {/* Quick material summary */}
                <div className="mb-4 rounded-lg border border-border bg-surface p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Auto-Calculated Materials</p>
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
                      <p className="mt-1 text-xs text-muted">Bags Concrete</p>
                    </div>
                  </div>
                </div>

                {/* Margin indicator */}
                <div className="mb-4 rounded-lg border border-accent/30 bg-accent/10 p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-accent-light">Your Margin</span>
                    <span className="font-display text-2xl font-bold text-accent-light">41%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-surface-3">
                    <div className="h-full rounded-full bg-accent-light transition-all" style={{ width: "41%" }} />
                  </div>
                  <p className="mt-2 text-xs text-accent-light">Above your 35% target ✓</p>
                </div>

                {/* Total */}
                <div className="flex items-baseline justify-between border-t border-border pt-4">
                  <span className="text-sm font-medium text-muted">Quote Total</span>
                  <div className="text-right">
                    <p className="font-display text-3xl font-bold text-text">$6,850</p>
                    <p className="mt-1 text-xs text-muted">185 LF • Wood Privacy</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating badge - "Real estimate, real contractor" */}
            <div className="absolute -bottom-4 -left-4 rounded-lg border-2 border-accent bg-surface px-4 py-3 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-text">Real Estimate</p>
                  <p className="text-xs text-muted">From active user</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom trust bar */}
        <div className="mt-16 border-t border-border pt-8">
          <p className="mb-4 text-center text-sm text-muted">Trusted by fence contractors across the US</p>
          <div className="flex flex-wrap items-center justify-center gap-8">
            <div className="flex items-center gap-2 text-muted">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span className="text-sm font-medium">Bank-Level Security</span>
            </div>
            <div className="flex items-center gap-2 text-muted">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span className="text-sm font-medium">Veteran-Owned</span>
            </div>
            <div className="flex items-center gap-2 text-muted">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span className="text-sm font-medium">5-Minute Setup</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
