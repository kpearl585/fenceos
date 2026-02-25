import { siteConfig } from "@/lib/site";

interface Feature {
  label: string;
  detail: string;
}

const features: Feature[] = [
  {
    label: "Auto-calculate materials",
    detail: "Panels, posts, gates, concrete, hardware — counted automatically from your linear footage.",
  },
  {
    label: "Margin protection built in",
    detail:
      "Set your target margin. Get a clear warning before any quote goes out below it.",
  },
  {
    label: "Works on your phone",
    detail:
      "Big buttons, simple inputs. Use it on-site in the sun. No training, no learning curve.",
  },
  {
    label: "Change orders recalculate instantly",
    detail:
      "Customer adds a gate? Scope changes? Cost and margin update automatically.",
  },
];

export default function SolutionSection() {
  return (
    <section className="bg-white px-6 py-20 md:py-28">
      <div className="max-w-5xl mx-auto">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold">
            {siteConfig.name} protects your margin{" "}
            <span className="text-fence-500">before</span> the quote goes out
          </h2>
          <p className="mt-4 text-lg text-gray-600 leading-relaxed">
            One tool. Built specifically for fence contractors. No bloat, no
            learning curve — just accurate estimates and protected profit.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {features.map((feature) => (
            <div
              key={feature.label}
              className="flex items-start gap-4 p-5 rounded-lg border border-gray-100 bg-fence-50"
            >
              <div className="mt-1 flex-shrink-0 w-6 h-6 bg-fence-500 rounded-full flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-lg">{feature.label}</h3>
                <p className="text-gray-600 mt-1">{feature.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
