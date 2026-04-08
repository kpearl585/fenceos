export default function ProblemSolution() {
  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 font-display">
            Stop Losing Money on Every Estimate
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Manual estimates cost you time and profit. One miscounted bag of concrete or wrong post count can wipe out your margin.
          </p>
        </div>

        {/* Before/After comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {/* Without */}
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-red-900 font-display">Manual Estimates</h3>
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
                <li key={i} className="flex items-start gap-3 text-red-900">
                  <svg className="w-5 h-5 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  <span className="text-sm font-medium">{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 pt-6 border-t border-red-200">
              <p className="text-sm font-bold text-red-900">Average annual loss: $14,000-$28,000</p>
            </div>
          </div>

          {/* With */}
          <div className="bg-green-50 border-2 border-green-500 rounded-xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-green-900 font-display">FenceEstimatePro</h3>
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
                <li key={i} className="flex items-start gap-3 text-green-900">
                  <svg className="w-5 h-5 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span className="text-sm font-medium">{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 pt-6 border-t border-green-200">
              <p className="text-sm font-bold text-green-900">ROI: $49/month vs $1,200+ saved per job</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <a
            href="#pricing"
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold text-lg px-8 py-4 rounded-lg transition-all shadow-lg"
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
