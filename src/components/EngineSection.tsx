export default function EngineSection() {
  return (
    <section className="bg-[#080808] px-6 py-20 md:py-28 border-t border-[rgba(255,255,255,0.07)]">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-[#16A34A] font-semibold text-sm uppercase tracking-widest mb-3">Under the hood</p>
          <h2 className="text-3xl md:text-4xl font-bold text-[#F2F2F2] font-display leading-tight">
            Built on real fence geometry &mdash;<br className="hidden md:block" /> not a spreadsheet formula
          </h2>
          <p className="mt-4 text-[#6B7280] max-w-2xl mx-auto text-lg">
            Every other tool multiplies linear footage by an average. FenceGraph models your fence the way a master estimator thinks &mdash; run by run, post by post.
          </p>
        </div>

        {/* Old way vs FenceGraph */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-16">
          {/* Old way */}
          <div className="bg-[rgba(239,68,68,0.05)] border border-[rgba(239,68,68,0.2)] rounded-2xl p-7">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-6 h-6 rounded-full bg-[rgba(239,68,68,0.2)] flex items-center justify-center flex-shrink-0">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </div>
              <span className="text-[#EF4444] font-bold text-sm uppercase tracking-wide">Other tools</span>
            </div>
            <p className="text-[rgba(239,68,68,0.6)] font-mono text-sm mb-5 bg-[rgba(239,68,68,0.05)] rounded-lg px-4 py-3 leading-relaxed">
              total_LF x materials_per_foot = rough guess
            </p>
            <ul className="space-y-3">
              {[
                "Same post count whether you have 1 corner or 10",
                "Concrete in bags per post \u2014 ignores hole size and depth",
                "Panel waste not calculated \u2014 you eat the overrun",
                "No gate post reinforcement factored in",
                "Gets less accurate the more complex the job",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-[rgba(239,68,68,0.6)]">
                  <svg className="mt-0.5 flex-shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* FenceGraph */}
          <div className="bg-[rgba(22,163,74,0.15)] border border-[rgba(22,163,74,0.2)] rounded-2xl p-7">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-6 h-6 rounded-full bg-[rgba(22,163,74,0.2)] flex items-center justify-center flex-shrink-0">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <span className="text-[#22C55E] font-bold text-sm uppercase tracking-wide">FenceGraph Engine</span>
            </div>
            <p className="text-[rgba(34,197,94,0.7)] font-mono text-sm mb-5 bg-[rgba(22,163,74,0.05)] rounded-lg px-4 py-3 leading-relaxed">
              map runs &rarr; derive post types &rarr; volumetric concrete &rarr; optimize panel cuts &rarr; calibrate from closed jobs
            </p>
            <ul className="space-y-3">
              {[
                "Post types auto-derived: end, corner, line, gate hinge, gate latch",
                "Concrete volume = \u03C0 \u00D7 r\u00B2 \u00D7 depth per hole \u2014 exact, not estimated",
                "Panel optimizer minimizes scrap and cut operations per segment",
                "Gate posts: deeper holes, aluminum inserts, rebar auto-applied",
                "Calibrates with every closed job \u2014 gets tighter over time",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-[#6B7280]">
                  <svg className="mt-0.5 flex-shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Engine capability tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-16">
          {[
            {
              label: "Run-Based Geometry",
              desc: "Models discrete segments, not total LF",
              icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 4 7 6"/><polyline points="17 6 19 4 21 6"/><line x1="5" y1="4" x2="19" y2="4"/><line x1="5" y1="20" x2="19" y2="20"/><polyline points="3 18 5 20 7 18"/><polyline points="17 18 19 20 21 18"/></svg>',
            },
            {
              label: "Self-Calibrating",
              desc: "EWMA learns from your closed jobs",
              icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
            },
            {
              label: "Code-Compliant",
              desc: "FL soil depths, wind load, pool gate rules",
              icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
            },
            {
              label: "Supplier-Synced",
              desc: "HD Pro & Lowe's Pro CSV price import",
              icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
            },
          ].map((tile) => (
            <div key={tile.label} className="bg-[#161616] border border-[rgba(255,255,255,0.07)] rounded-xl p-5 text-center">
              <div className="flex justify-center mb-3" dangerouslySetInnerHTML={{ __html: tile.icon }} />
              <p className="text-[#F2F2F2] font-bold text-sm mb-1">{tile.label}</p>
              <p className="text-[#6B7280] text-xs leading-relaxed">{tile.desc}</p>
            </div>
          ))}
        </div>

        {/* Bottom CTA strip */}
        <div className="text-center">
          <p className="text-[#6B7280] text-sm mb-1">The math is better. The quotes are tighter. The margins hold.</p>
          <a
            href="#waitlist"
            className="inline-flex items-center gap-2 bg-[#16A34A] hover:bg-[#22C55E] text-white font-bold px-8 py-4 rounded-xl transition-colors accent-glow mt-4"
          >
            Get Early Access
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
