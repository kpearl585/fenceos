export default function TestimonialsSection() {
  return (
    <section className="bg-surface py-20 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-xs font-bold text-accent uppercase tracking-widest mb-4">Early Access</p>
        <h2 className="text-3xl md:text-4xl font-bold text-text font-display mb-6">
          Join 47+ Fence Contractors<br />Already Protecting Their Margin
        </h2>
        <p className="text-muted text-lg max-w-2xl mx-auto mb-12">
          Real contractors using FenceEstimatePro every day to quote faster, bid smarter, and stop leaving money on the table.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            { stat: '5 min', label: 'Average time to build a complete estimate' },
            { stat: '$1,200+', label: 'Average saved per underbid job caught' },
            { stat: '14 days', label: 'Free trial - no credit card required' },
          ].map(item => (
            <div key={item.stat} className="bg-surface-2 border border-[rgba(255,255,255,0.07)] rounded-2xl p-6">
              <div className="text-3xl font-black text-text font-display mb-2">{item.stat}</div>
              <div className="text-muted text-sm">{item.label}</div>
            </div>
          ))}
        </div>
        <a
          href="/signup"
          className="inline-flex items-center gap-2 bg-accent hover:bg-accent-light text-white font-bold text-lg px-10 py-4 rounded-xl transition-colors"
        >
          Start Free Trial
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </a>
        <p className="mt-4 text-sm text-muted">14-day free trial • No credit card • Cancel anytime</p>
      </div>
    </section>
  );
}
