interface Step {
  number: string;
  title: string;
  detail: string;
}

const steps: Step[] = [
  {
    number: "1",
    title: "Enter your job details",
    detail: "Linear feet, gates, material costs, labor costs. Takes 30 seconds.",
  },
  {
    number: "2",
    title: "Set your target margin",
    detail:
      "Tell us what margin you need. We calculate the sale price to hit it.",
  },
  {
    number: "3",
    title: "Send the estimate",
    detail:
      "Download a clean PDF estimate. Your margin is protected before it leaves your hands.",
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-gray-50 px-6 py-20 md:py-28">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center">
          How it works
        </h2>
        <p className="mt-4 text-lg text-gray-600 text-center max-w-xl mx-auto">
          Three steps. No training. No bloat.
        </p>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div key={step.number} className="text-center">
              <div className="w-14 h-14 bg-fence-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto">
                {step.number}
              </div>
              <h3 className="mt-5 text-xl font-bold">{step.title}</h3>
              <p className="mt-2 text-gray-600 leading-relaxed">
                {step.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
