export default function Hero() {
  return (
    <section className="relative bg-background text-text pt-32 pb-20 md:pt-40 md:pb-28 px-6 overflow-hidden">
      {/* Grid pattern background */}
      <div className="absolute inset-0 grid-pattern" />
      {/* Green glow top-right */}
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-accent/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left -- Copy */}
          <div>
            <div className="inline-flex items-center gap-2 bg-[rgba(22,163,74,0.15)] border border-accent/20 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 rounded-full bg-accent-light animate-pulse" />
              <span className="text-xs font-semibold text-accent-light uppercase tracking-wide">The only run-based fence estimation engine</span>
            </div>

            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold leading-[1.05] tracking-tight">
              Stop Guessing<br />
              Quantities.<br />
              <span className="gradient-text">Start Winning Jobs.</span>
            </h1>

            <p className="mt-6 text-lg md:text-xl text-muted leading-relaxed max-w-xl">
              FenceEstimatePro&apos;s FenceGraph engine models your fence run by run &mdash; auto-deriving post types, calculating exact concrete volume, and locking your margin before you ever touch the quote.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <a
                href="#waitlist"
                className="inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-light text-white font-bold text-lg px-8 py-4 rounded-xl transition-colors accent-glow"
              >
                Request Early Access &rarr;
              </a>
              <a
                href="#demo"
                className="inline-flex items-center justify-center gap-2 border border-[rgba(255,255,255,0.12)] text-muted hover:border-accent/40 hover:text-text font-semibold text-lg px-8 py-4 rounded-xl transition-colors"
              >
                See Live Demo &darr;
              </a>
            </div>

            <p className="mt-4 text-sm text-muted">No credit card &middot; 14-day free trial &middot; Cancel anytime</p>

            {/* Quick stats */}
            <div className="mt-10 flex flex-wrap gap-6">
              <div>
                <p className="text-2xl font-bold text-text font-display">5 min</p>
                <p className="text-xs text-muted mt-0.5">Average estimate time</p>
              </div>
              <div className="w-px bg-[rgba(255,255,255,0.07)]" />
              <div>
                <p className="text-2xl font-bold text-text font-display">47+</p>
                <p className="text-xs text-muted mt-0.5">Active contractors</p>
              </div>
              <div className="w-px bg-[rgba(255,255,255,0.07)]" />
              <div>
                <p className="text-2xl font-bold text-text font-display">38%</p>
                <p className="text-xs text-muted mt-0.5">Average margin locked</p>
              </div>
              <div className="w-px bg-[rgba(255,255,255,0.07)]" />
              <div className="flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#c9a84c"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                <div>
                  <p className="text-sm font-bold text-text font-display">Veteran</p>
                  <p className="text-xs text-muted mt-0.5">Owned &amp; operated</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right -- Product mockup */}
          <div className="relative hidden lg:block">
            <div className="bg-[#161616] border border-[rgba(255,255,255,0.07)] rounded-2xl p-1 shadow-2xl">
              <div className="bg-[#0F0F0F] rounded-xl overflow-hidden">
                {/* Browser chrome */}
                <div className="bg-[#1C1C1C] px-4 py-2.5 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#EF4444]/70" />
                  <div className="w-3 h-3 rounded-full bg-[#F59E0B]/70" />
                  <div className="w-3 h-3 rounded-full bg-[#16A34A]/70" />
                  <div className="ml-3 flex-1 bg-[rgba(255,255,255,0.05)] rounded px-3 py-1 text-xs text-[#6B7280] font-mono">fenceestimatepro.com/dashboard</div>
                </div>
                {/* Mock FenceGraph interface */}
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[#F2F2F2] font-semibold text-sm font-display">New Estimate &mdash; 127 Oak Street</p>
                    <span className="bg-[rgba(22,163,74,0.2)] text-[#22C55E] text-xs font-bold px-2.5 py-0.5 rounded-full animate-pulse">CALCULATING</span>
                  </div>

                  {/* Run table */}
                  <div className="border border-[rgba(255,255,255,0.07)] rounded-lg overflow-hidden">
                    <div className="bg-[#1C1C1C] px-3 py-1.5 grid grid-cols-4 gap-2 text-xs text-[#6B7280] font-medium">
                      <span>Run</span><span>Type</span><span>Length</span><span>Spacing</span>
                    </div>
                    {[
                      { run: "Run 1", type: "Wood Privacy", length: "85 ft", spacing: "8 ft" },
                      { run: "Run 2", type: "Wood Privacy", length: "62 ft", spacing: "8 ft" },
                      { run: "Run 3", type: "Chain Link", length: "40 ft", spacing: "10 ft" },
                    ].map((r) => (
                      <div key={r.run} className="px-3 py-2 grid grid-cols-4 gap-2 text-xs border-t border-[rgba(255,255,255,0.04)]">
                        <span className="text-[#F2F2F2] font-medium">{r.run}</span>
                        <span className="text-[#6B7280]">{r.type}</span>
                        <span className="text-[#6B7280]">{r.length}</span>
                        <span className="text-[#6B7280]">{r.spacing}</span>
                      </div>
                    ))}
                  </div>

                  {/* Auto-calculated */}
                  <div className="bg-[rgba(22,163,74,0.15)] border border-[rgba(22,163,74,0.2)] rounded-lg p-3">
                    <p className="text-xs text-[#22C55E] font-semibold mb-2">Auto-Calculated</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center">
                        <p className="text-xl font-bold text-[#F2F2F2] font-display">42</p>
                        <p className="text-xs text-[#6B7280]">Posts</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-[#F2F2F2] font-display">8</p>
                        <p className="text-xs text-[#6B7280]">Bags Concrete</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-[#F2F2F2] font-display">28</p>
                        <p className="text-xs text-[#6B7280]">Panels</p>
                      </div>
                    </div>
                  </div>

                  {/* Margin bar */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#6B7280]">Margin</span>
                      <span className="text-[#22C55E] font-bold">38%</span>
                    </div>
                    <div className="h-2 bg-[#1C1C1C] rounded-full overflow-hidden">
                      <div className="h-full bg-[#16A34A] rounded-full" style={{ width: "38%" }} />
                    </div>
                  </div>

                  {/* Total */}
                  <div className="border-t border-[rgba(255,255,255,0.07)] pt-3 flex justify-between items-center">
                    <span className="text-[#6B7280] text-sm font-medium">Quote Total</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[#F2F2F2] text-2xl font-bold font-display">$11,935</span>
                      <span className="bg-[rgba(22,163,74,0.2)] text-[#22C55E] text-xs font-bold px-2 py-0.5 rounded-full">Ready to Send</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Glow effect */}
            <div className="absolute -inset-8 bg-[rgba(22,163,74,0.08)] rounded-3xl blur-3xl -z-10" />
          </div>
        </div>
      </div>
    </section>
  );
}
