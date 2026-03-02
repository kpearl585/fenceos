import Link from "next/link";

export default function Hero() {
  return (
    <section className="bg-gradient-to-br from-fence-950 via-fence-900 to-fence-800 text-white pt-32 pb-20 md:pt-40 md:pb-28 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left — Copy */}
          <div>
            <div className="inline-flex items-center gap-2 bg-fence-700/50 border border-fence-600/50 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              <span className="text-xs font-semibold text-fence-200 uppercase tracking-wide">Built for fence contractors</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
              Know Your Profit<br />
              <span className="text-fence-400">Before You Hand</span><br />
              Over the Quote.
            </h1>

            <p className="mt-6 text-lg md:text-xl text-fence-200 leading-relaxed max-w-xl">
              FenceEstimatePro calculates your materials, locks in your margin, and builds a professional quote — before you leave the driveway.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 bg-fence-500 hover:bg-fence-400 text-white font-bold text-lg px-8 py-4 rounded-xl transition-colors shadow-lg"
              >
                Start Free Trial
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <a
                href="#demo"
                className="inline-flex items-center justify-center gap-2 border-2 border-fence-500/50 text-fence-200 hover:border-fence-400 hover:text-white font-semibold text-lg px-8 py-4 rounded-xl transition-colors"
              >
                See Live Demo ↓
              </a>
            </div>

            <p className="mt-4 text-sm text-fence-400">No credit card required · Cancel anytime · 14-day free trial</p>

            <div className="mt-3">
              <a href="/calculator" className="inline-flex items-center gap-2 text-fence-300 hover:text-white text-sm underline underline-offset-2 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",marginRight:"4px"}}><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="10" y2="10"/><line x1="14" y1="10" x2="16" y2="10"/></svg>Try our free fence cost calculator →
              </a>
            </div>


            {/* Quick stats */}
            <div className="mt-10 flex flex-wrap gap-6">
              <div>
                <p className="text-2xl font-bold text-white">5 min</p>
                <p className="text-xs text-fence-400 mt-0.5">Average estimate time</p>
              </div>
              <div className="w-px bg-fence-700"></div>
              <div>
                <p className="text-2xl font-bold text-white">$1,200+</p>
                <p className="text-xs text-fence-400 mt-0.5">Avg saved per underbid job</p>
              </div>
              <div className="w-px bg-fence-700"></div>
              <div>
                <p className="text-2xl font-bold text-white">Florida</p>
                <p className="text-xs text-fence-400 mt-0.5">Veteran-built &amp; operated</p>
              </div>
              <div className="w-px bg-fence-700"></div>
              <div className="flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#c9a84c" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                <div>
                  <p className="text-xs font-bold text-amber-400 uppercase tracking-wide">Veteran-Owned</p>
                  <p className="text-xs text-fence-400 mt-0.5">&amp; Operated</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right — Product mockup */}
          <div className="relative hidden lg:block">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-1 shadow-2xl backdrop-blur-sm">
              <div className="bg-gray-900 rounded-xl overflow-hidden">
                {/* Fake browser chrome */}
                <div className="bg-gray-800 px-4 py-2.5 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/70"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/70"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/70"></div>
                  <div className="ml-3 flex-1 bg-gray-700 rounded px-3 py-1 text-xs text-gray-400">fenceestimatepro.com/dashboard</div>
                </div>
                {/* Mock dashboard */}
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-white font-semibold text-sm">New Estimate</p>
                    <span className="bg-green-500/20 text-green-400 text-xs font-bold px-2 py-0.5 rounded-full">38% margin protected</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: "200 LF Privacy Fence", value: "$4,200" },
                      { label: "2 Single Gates", value: "$800" },
                      { label: "Labor (Est.)", value: "$2,400" },
                    ].map((row) => (
                      <div key={row.label} className="flex justify-between bg-white/5 rounded-lg px-3 py-2">
                        <span className="text-gray-300 text-xs">{row.label}</span>
                        <span className="text-white text-xs font-semibold">{row.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-white/10 pt-3 flex justify-between items-center">
                    <span className="text-gray-300 text-sm font-medium">Quote Total</span>
                    <span className="text-white text-xl font-bold">$11,935</span>
                  </div>
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
                    <p className="text-green-400 text-xs font-semibold">Margin protected · Ready to send</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="bg-fence-600 text-white text-xs font-bold py-2 rounded-lg">Send to Customer</button>
                    <button className="bg-white/10 text-white text-xs font-bold py-2 rounded-lg">Download PDF</button>
                  </div>
                </div>
              </div>
            </div>
            {/* Glow effect */}
            <div className="absolute -inset-4 bg-fence-500/10 rounded-3xl blur-2xl -z-10"></div>
          </div>
        </div>
      </div>
    </section>
  );
}


