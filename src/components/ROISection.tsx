export default function ROISection() {
  return (
    <section className="bg-surface px-6 py-20 md:py-24">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-accent font-semibold text-sm uppercase tracking-widest mb-3">Do the math</p>
          <h2 className="text-3xl md:text-4xl font-bold text-text font-display">$49/month vs. one underbid job</h2>
          <p className="mt-4 text-muted max-w-xl mx-auto">This isn't a software expense. It's an insurance policy on every job you quote.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="bg-danger/5 border border-danger/20 rounded-2xl p-7">
            <h3 className="font-bold text-danger mb-4 flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Without FenceEstimatePro
            </h3>
            <ul className="space-y-3 text-sm text-danger/70">
              <li className="flex items-start gap-2"><span className="mt-0.5">&bull;</span>Manual estimate: 45-60 min per job</li>
              <li className="flex items-start gap-2"><span className="mt-0.5">&bull;</span>Average underbid loss: $1,200 per job</li>
              <li className="flex items-start gap-2"><span className="mt-0.5">&bull;</span>Material miscounts: $200-$400 extra cost</li>
              <li className="flex items-start gap-2"><span className="mt-0.5">&bull;</span>Change orders: lose $400-$600 per incident</li>
              <li className="flex items-start gap-2 font-bold text-danger"><span className="mt-0.5">&bull;</span>Annual loss: $14,000-$28,000+</li>
            </ul>
          </div>
          <div className="bg-accent-glow border border-accent/20 rounded-2xl p-7">
            <h3 className="font-bold text-accent-light mb-4 flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> With FenceEstimatePro
            </h3>
            <ul className="space-y-3 text-sm text-muted">
              <li className="flex items-start gap-2"><span className="mt-0.5">&bull;</span>Estimate in 5 minutes, on your phone</li>
              <li className="flex items-start gap-2"><span className="mt-0.5">&bull;</span>Margin locked before every quote</li>
              <li className="flex items-start gap-2"><span className="mt-0.5">&bull;</span>Materials auto-calculated - zero guessing</li>
              <li className="flex items-start gap-2"><span className="mt-0.5">&bull;</span>Change orders recalculate automatically</li>
              <li className="flex items-start gap-2 font-bold text-accent-light"><span className="mt-0.5">&bull;</span>Cost: $49/month = $588/year</li>
            </ul>
          </div>
        </div>

        <div className="bg-surface-2 border border-[rgba(255,255,255,0.07)] rounded-2xl p-8 text-center">
          <p className="text-accent text-sm font-semibold uppercase tracking-wide mb-2">Return on investment</p>
          <p className="text-5xl font-bold text-text font-display mb-2">41x ROI</p>
          <p className="text-muted">If it saves you from just one underbid job per month, you're up $1,200. That's $14,052 back in your pocket every year for $348.</p>
          <a href="#waitlist" className="mt-6 inline-flex items-center gap-2 bg-accent hover:bg-accent-light text-white font-bold px-8 py-3.5 rounded-xl transition-colors">
            Request Early Access &rarr;
          </a>
          <p className="mt-3 text-muted text-xs">14-day free trial • No credit card required</p>
        </div>
      </div>
    </section>
  );
}
