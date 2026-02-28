export default function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Enter your job details",
      body: "Linear footage, fence type, gates, terrain. Takes 2 minutes on your phone, on-site.",
    },
    {
      number: "02",
      title: "Materials + margin auto-calculate",
      body: "Every post, panel, bag of concrete, and gate kit counted automatically. Your margin is locked before you touch the quote.",
    },
    {
      number: "03",
      title: "Send a professional quote",
      body: "One tap. PDF or link. Customer gets a branded estimate that looks like you run a real operation — because you do.",
    },
  ];

  return (
    <section id="how-it-works" className="bg-white px-6 py-20 md:py-24">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-fence-600 font-semibold text-sm uppercase tracking-widest mb-3">Simple by design</p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">From job site to quote in 5 minutes</h2>
          <p className="mt-4 text-gray-500 max-w-xl mx-auto">No training. No spreadsheets. No guessing. Built for contractors who are on a job site, not in an office.</p>
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
