export default function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Map your fence runs",
      body: "Define each segment between corners, gates, and endpoints. The engine models your fence the way it actually gets built \u2014 not just total linear footage.",
    },
    {
      number: "02",
      title: "Engine calculates everything",
      body: "Post types auto-derived. Concrete volume calculated per hole. Panel cuts optimized. Gate hardware, rebar, and soil depth handled automatically.",
    },
    {
      number: "03",
      title: "Send a professional proposal",
      body: "One tap. Customer gets a clean branded proposal \u2014 no costs exposed. You keep the internal BOM with full audit trail.",
    },
  ];

  return (
    <section id="how-it-works" className="bg-[#080808] px-6 py-20 md:py-24">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[#16A34A] font-semibold text-sm uppercase tracking-widest mb-3">Simple by design</p>
          <h2 className="text-3xl md:text-4xl font-bold text-[#F2F2F2] font-display">From job site to winning quote in 5 minutes</h2>
          <p className="mt-4 text-[#6B7280] max-w-xl mx-auto">No training. No spreadsheets. No guessing quantities. Built for contractors on the job site \u2014 not accountants in an office.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={step.number} className="relative">
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-full w-full h-px bg-[rgba(255,255,255,0.07)] -translate-x-4 z-0" style={{ width: "calc(100% - 2rem)" }} />
              )}
              <div className="relative z-10">
                <div className="w-14 h-14 bg-[rgba(22,163,74,0.15)] border-2 border-[rgba(22,163,74,0.3)] rounded-2xl flex items-center justify-center mb-5">
                  <span className="text-[#22C55E] font-bold text-lg font-display">{step.number}</span>
                </div>
                <h3 className="text-lg font-bold text-[#F2F2F2] mb-2">{step.title}</h3>
                <p className="text-[#6B7280] text-sm leading-relaxed">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
