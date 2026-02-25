interface ProblemCard {
  icon: string;
  title: string;
  description: string;
}

const problems: ProblemCard[] = [
  {
    icon: "✏️",
    title: "Manual Math Errors",
    description:
      "Estimating on paper or spreadsheets means one wrong number can cost you thousands on a single job. No one catches it until the invoice.",
  },
  {
    icon: "📦",
    title: "Material Miscounts",
    description:
      "Forgetting posts, underounting panels, or missing hardware adds up fast. You eat the cost or make an awkward call to the customer.",
  },
  {
    icon: "📉",
    title: "Margin Leaks After Change Orders",
    description:
      "The customer adds a gate. You adjust the price but forget to recalculate margin. By the time you notice, the profit is gone.",
  },
];

export default function ProblemSection() {
  return (
    <section className="bg-gray-50 px-6 py-20 md:py-28">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center">
          Where fence contractors lose money
        </h2>
        <p className="mt-4 text-lg text-gray-600 text-center max-w-2xl mx-auto">
          These three problems drain profit from jobs every single week.
        </p>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          {problems.map((problem) => (
            <div
              key={problem.title}
              className="bg-white rounded-xl p-8 shadow-sm border border-gray-100"
            >
              <div className="text-4xl mb-4">{problem.icon}</div>
              <h3 className="text-xl font-bold mb-3">{problem.title}</h3>
              <p className="text-gray-600 leading-relaxed">
                {problem.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
