export default function SolutionSection() {
  const features = [
    { icon: "🧮", title: "Auto-calculate materials", body: "Posts, panels, gates, concrete, hardware — counted from linear footage. Zero guessing." },
    { icon: "📊", title: "Margin locked on every job", body: "Set your target. Get a warning before any quote goes out below it. Never underbid again." },
    { icon: "📱", title: "Works on any phone", body: "Big inputs. Fast load. Works in the sun on a job site. No app store required." },
    { icon: "📄", title: "Professional PDF quotes", body: "One tap to generate a branded PDF. Looks like you've been in business 20 years." },
    { icon: "🔄", title: "Change orders handled", body: "Customer adds a gate? Materials and margin recalculate instantly. No more surprises." },
    { icon: "👷", title: "Foreman job board", body: "Assign jobs, track status, manage your crew — all in one place." },
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
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-bold text-white mb-2">{f.title}</h3>
              <p className="text-fence-300 text-sm leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
