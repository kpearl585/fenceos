export default function HeroV2() {
  return (
    <section className="relative bg-gradient-to-b from-white to-gray-50 pt-20 pb-16 md:pt-28 md:pb-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left - Copy */}
          <div>
            {/* Trust badge */}
            <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-3 py-1.5 mb-6">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Used by 47+ Contractors</span>
            </div>

            {/* Headline */}
            <h1 className="font-display text-5xl sm:text-6xl md:text-7xl font-bold leading-[1.05] tracking-tight text-gray-900 mb-6">
              Fence Estimates<br />
              in <span className="text-green-600">5 Minutes.</span><br />
              <span className="text-gray-500">Not 45.</span>
            </h1>

            {/* Subhead */}
            <p className="text-xl text-gray-600 leading-relaxed mb-8 max-w-xl">
              Stop losing money on bad material counts. Get accurate estimates with auto-calculated posts, panels, and concrete. Lock your margin before you send the quote.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <a
                href="#pricing"
                className="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold text-lg px-8 py-4 rounded-lg transition-all shadow-lg hover:shadow-xl"
              >
                Start Free Trial
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </a>
              <a
                href="#demo"
                className="inline-flex items-center justify-center gap-2 bg-white border-2 border-gray-300 hover:border-green-600 text-gray-700 hover:text-green-700 font-semibold text-lg px-8 py-4 rounded-lg transition-all"
              >
                See It In Action
              </a>
            </div>

            <p className="text-sm text-gray-500 mb-8">
              No credit card required • 14-day free trial • Works on your phone
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-gray-200">
              <div>
                <p className="text-3xl font-bold text-gray-900 font-display">5 min</p>
                <p className="text-sm text-gray-600 mt-1">Avg time</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900 font-display">$18K</p>
                <p className="text-sm text-gray-600 mt-1">Saved/mo</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900 font-display">38%</p>
                <p className="text-sm text-gray-600 mt-1">Avg margin</p>
              </div>
            </div>
          </div>

          {/* Right - Real estimate screenshot */}
          <div className="relative">
            <div className="bg-white border-2 border-gray-200 rounded-xl shadow-2xl overflow-hidden">
              {/* Browser bar */}
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center gap-3">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-300" />
                  <div className="w-3 h-3 rounded-full bg-gray-300" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 bg-white rounded px-3 py-1.5 text-xs text-gray-500 font-mono border border-gray-200">
                  app.fenceestimatepro.com
                </div>
              </div>

              {/* Estimate UI */}
              <div className="p-6 bg-gradient-to-br from-white to-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Johnson Residence</h3>
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">
                    Ready
                  </span>
                </div>

                {/* Materials */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Materials</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900 font-display">24</p>
                      <p className="text-xs text-gray-600 mt-1">Posts</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900 font-display">18</p>
                      <p className="text-xs text-gray-600 mt-1">Panels</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900 font-display">48</p>
                      <p className="text-xs text-gray-600 mt-1">Bags</p>
                    </div>
                  </div>
                </div>

                {/* Margin */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-green-900">Margin</span>
                    <span className="text-2xl font-bold text-green-600 font-display">41%</span>
                  </div>
                  <div className="h-3 bg-green-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: "41%" }} />
                  </div>
                  <p className="text-xs text-green-700 mt-2">Above 35% target ✓</p>
                </div>

                {/* Total */}
                <div className="flex items-baseline justify-between pt-4 border-t border-gray-200">
                  <span className="text-sm font-medium text-gray-600">Total</span>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-gray-900 font-display">$6,850</p>
                    <p className="text-xs text-gray-500 mt-1">185 LF Wood Privacy</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating badge */}
            <div className="absolute -bottom-4 -left-4 bg-white border-2 border-green-500 rounded-lg shadow-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900">Real Estimate</p>
                  <p className="text-xs text-gray-600">Active contractor</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
