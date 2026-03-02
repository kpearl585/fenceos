export default function TestimonialsSection() {
  return (
    <section className="bg-fence-950 py-20 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-xs font-bold text-fence-400 uppercase tracking-widest mb-4">Early Access</p>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
          Be Among the First Fence Contractors<br />Running a Data-Driven Operation.
        </h2>
        <p className="text-fence-300 text-lg max-w-2xl mx-auto mb-12">
          FenceEstimatePro is live and taking its first users. Built specifically for fence contractors — no fluff, no bloat, no generic features you&apos;ll never touch.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            { stat: '5 min', label: 'Average time to build a complete estimate' },
            { stat: '$1,200+', label: 'Average saved per underbid job caught' },
            { stat: '14 days', label: 'Free trial — no credit card required' },
          ].map(item => (
            <div key={item.stat} className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="text-3xl font-black text-white mb-2">{item.stat}</div>
              <div className="text-fence-400 text-sm">{item.label}</div>
            </div>
          ))}
        </div>
        <a
          href="/signup"
          className="inline-flex items-center gap-2 bg-fence-500 hover:bg-fence-400 text-white font-bold text-lg px-10 py-4 rounded-xl transition-colors"
        >
          Start Free Trial
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </a>
        <p className="mt-4 text-sm text-fence-400">14-day free trial · No credit card · Cancel anytime</p>
      </div>
    </section>
  );
}
