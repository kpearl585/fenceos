import Image from 'next/image';

export default function HeroRedesign() {
  return (
    <section className="relative bg-white pt-20 pb-16 md:pt-28 md:pb-24 px-6 overflow-hidden">
      {/* Subtle wood texture background */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23000000" fill-opacity="1"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
      }} />

      <div className="relative max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left - Copy */}
          <div>
            {/* Trust badge */}
            <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-3 py-1.5 mb-6">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Trusted by 47+ Fence Contractors</span>
            </div>

            {/* Headline - Direct, benefit-focused */}
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight text-gray-900 mb-6">
              Fence Estimates<br />
              <span className="text-green-600">in 5 Minutes.</span><br />
              <span className="text-gray-600">Not 45.</span>
            </h1>

            {/* Subheadline - Clear value prop */}
            <p className="text-lg md:text-xl text-gray-600 leading-relaxed mb-8 max-w-xl">
              Stop losing money on bad material counts. FenceEstimatePro calculates every post, panel, and bag of concrete automatically. Lock your margin before you send the quote.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <a
                href="#waitlist"
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
                Watch Demo
              </a>
            </div>

            {/* Trust line */}
            <p className="text-sm text-gray-500 mb-8">
              No credit card • 14-day free trial • Works on your phone
            </p>

            {/* Social proof stats - Simple, clean */}
            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-gray-200">
              <div>
                <p className="text-3xl font-bold text-gray-900 font-display">5 min</p>
                <p className="text-sm text-gray-600 mt-1">Avg estimate time</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900 font-display">$18K+</p>
                <p className="text-sm text-gray-600 mt-1">Saved monthly</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900 font-display">38%</p>
                <p className="text-sm text-gray-600 mt-1">Avg margin</p>
              </div>
            </div>
          </div>

          {/* Right - Screenshot (REAL, not mockup) */}
          <div className="relative">
            {/* Real estimate screenshot placeholder - Replace with actual screenshot */}
            <div className="bg-white border-2 border-gray-200 rounded-xl shadow-2xl overflow-hidden">
              {/* Browser chrome - minimal */}
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center gap-3">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-300" />
                  <div className="w-3 h-3 rounded-full bg-gray-300" />
                  <div className="w-3 h-3 rounded-full bg-gray-300" />
                </div>
                <div className="flex-1 bg-white rounded px-3 py-1.5 text-xs text-gray-500 font-mono border border-gray-200">
                  fenceestimatepro.com
                </div>
              </div>

              {/* Estimate view */}
              <div className="p-6 bg-gradient-to-br from-white to-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Johnson Residence</h3>
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">
                    Ready to Send
                  </span>
                </div>

                {/* Quick material summary */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Auto-Calculated Materials</p>
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
                      <p className="text-xs text-gray-600 mt-1">Bags Concrete</p>
                    </div>
                  </div>
                </div>

                {/* Margin indicator */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-green-900">Your Margin</span>
                    <span className="text-2xl font-bold text-green-600 font-display">41%</span>
                  </div>
                  <div className="h-3 bg-green-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: "41%" }} />
                  </div>
                  <p className="text-xs text-green-700 mt-2">Above your 35% target ✓</p>
                </div>

                {/* Total */}
                <div className="flex items-baseline justify-between pt-4 border-t border-gray-200">
                  <span className="text-sm font-medium text-gray-600">Quote Total</span>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-gray-900 font-display">$6,850</p>
                    <p className="text-xs text-gray-500 mt-1">185 LF • Wood Privacy</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating badge - "Real estimate, real contractor" */}
            <div className="absolute -bottom-4 -left-4 bg-white border-2 border-green-500 rounded-lg shadow-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900">Real Estimate</p>
                  <p className="text-xs text-gray-600">From active user</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom trust bar */}
        <div className="mt-16 pt-8 border-t border-gray-200">
          <p className="text-center text-sm text-gray-500 mb-4">Trusted by fence contractors across the US</p>
          <div className="flex flex-wrap items-center justify-center gap-8">
            <div className="flex items-center gap-2 text-gray-600">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span className="text-sm font-medium">Bank-Level Security</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span className="text-sm font-medium">Veteran-Owned</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
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
