export default function SolutionSection() {
  const features = [
    { icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 4 7 6"/><polyline points="17 6 19 4 21 6"/><line x1="5" y1="4" x2="19" y2="4"/><line x1="5" y1="20" x2="19" y2="20"/><polyline points="3 18 5 20 7 18"/><polyline points="17 18 19 20 21 18"/></svg>', title: "Run-based engine", body: "Models discrete segments. Post types auto-derived: end, corner, line, gate hinge, latch. Not a per-foot formula." },
    { icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>', title: "Self-calibrating accuracy", body: "EWMA calibration learns from every closed job. After 20 jobs, estimates are tighter than any human estimator." },
    { icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>', title: "Margin locked on every job", body: "Set your target. Get a warning before any quote goes out below it. Never underbid again." },
    { icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="12" y2="17"/></svg>', title: "Two-view PDF", body: "Customer proposal shows bid price only. Internal BOM shows full costs, audit trail, and confidence scores. Zero cost exposure." },
    { icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>', title: "Change orders handled", body: "Customer adds a gate? Materials and margin recalculate instantly. No surprises at closeout." },
    { icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>', title: "Code-compliant by default", body: "Florida sandy soil depths enforced. Wind load mode auto-applies rebar and inserts. Pool gate compliance built in." },
  ];

  return (
    <section className="bg-[#0F0F0F] px-6 py-20 md:py-24">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[#16A34A] font-semibold text-sm uppercase tracking-widest mb-3">Everything you need</p>
          <h2 className="text-3xl md:text-4xl font-bold text-[#F2F2F2] font-display">
            The math other tools skip &mdash;{" "}
            <span className="text-[#22C55E]">built in</span> from the start
          </h2>
          <p className="mt-4 text-[#6B7280] max-w-xl mx-auto">Built specifically for fence contractors. Run-based geometry, real material math, margin protection &mdash; no spreadsheets required.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div key={f.title} className="bg-[#161616] border border-[rgba(255,255,255,0.07)] rounded-2xl p-6 hover:border-[rgba(22,163,74,0.2)] transition-colors">
              <div className="mb-4" dangerouslySetInnerHTML={{ __html: f.icon }} />
              <h3 className="font-bold text-[#F2F2F2] mb-2">{f.title}</h3>
              <p className="text-[#6B7280] text-sm leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
