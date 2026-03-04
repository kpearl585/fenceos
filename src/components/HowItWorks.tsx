export default function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Map your fence runs",
      body: "Define each segment between corners, gates, and endpoints. The engine models your fence the way it actually gets built — not just total linear footage.",
    },
    {
      number: "02",
      title: "Engine calculates everything",
      body: "Post types auto-derived. Concrete volume calculated per hole. Panel cuts optimized. Gate hardware, rebar, and soil depth handled automatically.",
    },
    {
      number: "03",
      title: "Send a professional proposal",
      body: "One tap. Customer gets a clean branded proposal — no costs exposed. You keep the internal BOM with full audit trail.",
    },
  ];

  return (
    <section id="how-it-works" className="bg-white px-6 py-20 md:py-24">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-fence-600 font-semibold text-sm uppercase tracking-widest mb-3">Simple by design</p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">From job site to winning quote in 5 minutes</h2>
          <p className="mt-4 text-gray-500 max-w-xl mx-auto">No training. No spreadsheets. No guessing quantities. Built for contractors on the job site — not accountants in an office.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={step.number} className="relative">
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-full w-full h-px bg-fence-200 -translate-x-4 z-0" style={{width: "calc(100% - 2rem)"}}></div>
              )}
              <div className="relative z-10">
                <div className="w-14 h-14 bg-fence-50 border-2 border-fence-200 rounded-2xl flex items-center justify-center mb-5">
                  <span className="text-fence-700 font-bold text-lg">{step.number}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
