export default function SolutionSection() {
  const features = [
    { icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="10" y2="10"/><line x1="14" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="10" y2="14"/><line x1="14" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="10" y2="18"/><line x1="14" y1="18" x2="16" y2="18"/></svg>', title: "Auto-calculate materials", body: "Posts, panels, gates, concrete, hardware — counted from linear footage. Zero guessing." },
    { icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>', title: "Margin locked on every job", body: "Set your target. Get a warning before any quote goes out below it. Never underbid again." },
    { icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18"/></svg>', title: "Works on any phone", body: "Big inputs. Fast load. Works in the sun on a job site. No app store required." },
    { icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="12" y2="17"/></svg>', title: "Professional PDF quotes", body: "One tap to generate a branded PDF. Looks like you've been in business 20 years." },
    { icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>', title: "Change orders handled", body: "Customer adds a gate? Materials and margin recalculate instantly. No more surprises." },
    { icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>', title: "Foreman job board", body: "Assign jobs, track status, manage your crew — all in one place." },
  ];

  return (
    <section className="bg-fence-950 px-6 py-20 md:py-24">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-fence-400 font-semibold text-sm uppercase tracking-widest mb-3">Everything you need</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            FenceEstimatePro protects your margin{" "}
            <span className="text-fence-400">before</span> the quote goes out
          </h2>
          <p className="mt-4 text-fence-300 max-w-xl mx-auto">One tool. Built specifically for fence contractors. No bloat, no learning curve.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div key={f.title} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/8 transition-colors">
              <div className="mb-4" dangerouslySetInnerHTML={{ __html: f.icon }} />
              <h3 className="font-bold text-white mb-2">{f.title}</h3>
              <p className="text-fence-300 text-sm leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
