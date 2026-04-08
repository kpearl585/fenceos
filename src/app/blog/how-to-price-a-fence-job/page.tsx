import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How to Price a Fence Job in 2026 (Without Leaving Money on the Table) | FenceEstimatePro",
  description: "Most fence contractors underprice their jobs by 15-20% without realizing it. Here's the exact formula for calculating fence job pricing that protects your margin.",
  openGraph: {
    title: "How to Price a Fence Job in 2026 (Without Leaving Money on the Table)",
    description: "Most fence contractors underprice their jobs by 15-20% without realizing it. Here's the exact formula for calculating fence job pricing that protects your margin.",
  },
};

export default function ArticlePage() {
  return (
    <main>
      {/* Dark article header */}
      <section className="bg-gradient-to-br from-fence-950 via-fence-900 to-fence-800 text-white px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <Link href="/blog" className="inline-flex items-center gap-2 text-fence-300 hover:text-white text-sm mb-8 transition-colors">
            ← Back to Blog
          </Link>
          <span className="inline-block bg-blue-500/20 text-blue-300 text-xs font-bold px-3 py-1 rounded-full mb-4">Estimating</span>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight tracking-tight">
            How to Price a Fence Job in 2026 (Without Leaving Money on the Table)
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-fence-300">
            <span>February 28, 2026</span>
            <span>·</span>
            <span>8 min read</span>
            <span>·</span>
            <span>By Pearl Ventures</span>
          </div>
        </div>
      </section>

      {/* Article Body — white background for readability */}
      <article className="bg-white px-6 py-16">
        <div className="max-w-[680px] mx-auto prose-custom" style={{ lineHeight: "1.8", fontFamily: "Inter, sans-serif" }}>

          {/* Callout */}
          <div className="bg-blue-50 border-l-4 border-blue-400 rounded-r-xl p-5 mb-10">
            <p className="text-blue-900 font-semibold text-lg m-0">
              The average fence contractor underprices jobs by 15–20%. On a $21,000 job, that's $4,200 walking out the door.
            </p>
          </div>

          <p className="text-gray-700 text-lg">Here's the frustrating truth: most of that lost money isn't due to bad luck or slow crews. It's because contractors are guessing their prices instead of calculating them. And in an industry with razor-thin margins and unpredictable material costs, guessing is a losing game.</p>

          <p className="text-gray-700">This article walks you through the exact pricing framework that separates profitable fence contractors from the ones who stay busy but never get ahead.</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Section 1: Why Most Contractors Underprice</h2>
          <p className="text-gray-700">Ask a fence contractor how they price a job and most will say something like: "I walk the property, count the footage, and go with what feels right based on what I've done before."</p>
          <p className="text-gray-700">That process — estimating by gut — works okay when material costs are stable, your crew never has a bad day, and you never forget to account for the gate hardware. None of those things are consistently true.</p>
          <p className="text-gray-700">The problem isn't that contractors are bad at math. It's that they're working from memory instead of a system. Memory forgets overhead. Memory doesn't update when lumber prices jump 18% in Q1. Memory doesn't account for the two hours your crew spent digging around a buried sprinkler line.</p>
          <p className="text-gray-700">Calculating — using actual current costs, real labor rates, and tracked overhead — is how you stop leaving money on the table.</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Section 2: The True Cost Formula</h2>
          <p className="text-gray-700">Profitable fence pricing follows a simple structure:</p>

          <div className="bg-green-50 border border-green-200 rounded-xl p-6 my-6">
            <p className="font-mono text-green-900 font-bold text-base m-0">
              Job Price = Materials + Labor + Overhead + Profit Margin
            </p>
          </div>

          <p className="text-gray-700">Each of those components has sub-parts that contractors regularly miss or underestimate. Let's break each one down.</p>

          <ul className="text-gray-700 space-y-2 pl-6 list-disc">
            <li><strong>Materials:</strong> Every post, picket, rail, bag of concrete, gate, hinge, latch, and screw. Include a 10% waste factor.</li>
            <li><strong>Labor:</strong> Crew wages, payroll taxes, workers' comp, and any subcontractor costs.</li>
            <li><strong>Overhead:</strong> Your truck payment, fuel, insurance, tools, storage, and a pro-rated share of your time doing estimates and admin.</li>
            <li><strong>Profit margin:</strong> This is not overhead. This is the reward for running a business and taking on risk. Minimum 25–30% gross margin.</li>
          </ul>

          <p className="text-gray-700">Most contractors bake in materials and labor correctly (though often imprecisely). Overhead is where jobs start bleeding, and margin is where the confusion about gross vs. net destroys profitability.</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Section 3: Material Cost Breakdown by Fence Type</h2>
          <p className="text-gray-700">Material costs vary significantly by fence type. Here's a realistic range for materials only (not installed) per linear foot as of 2026:</p>

          <div className="overflow-x-auto my-6">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left p-3 font-bold text-gray-900 border border-gray-200">Fence Type</th>
                  <th className="text-left p-3 font-bold text-gray-900 border border-gray-200">Materials/LF</th>
                  <th className="text-left p-3 font-bold text-gray-900 border border-gray-200">Key Variables</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Wood Privacy (6ft)", "$18–28", "Lumber species, post depth, hardware grade"],
                  ["Chain Link", "$8–15", "Gauge, galvanized vs vinyl-coated"],
                  ["Vinyl", "$22–35", "Profile thickness, manufacturer"],
                  ["Aluminum Ornamental", "$20–40", "Style, powder coat color, gauge"],
                ].map(([type, range, vars]) => (
                  <tr key={type} className="border-b border-gray-100">
                    <td className="p-3 border border-gray-200 font-medium text-gray-800">{type}</td>
                    <td className="p-3 border border-gray-200 text-green-700 font-bold">{range}</td>
                    <td className="p-3 border border-gray-200 text-gray-600">{vars}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-gray-700">These are materials only. By the time you add installation labor and overhead, installed costs are typically 1.6–2.2× the material cost depending on complexity and your local labor market.</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Section 4: Labor Rate Calculation</h2>
          <p className="text-gray-700">Labor is the hardest line item to price accurately — and the one contractors get wrong most often. "What feels right" is not a labor rate calculation strategy.</p>
          <p className="text-gray-700">Your actual labor cost per hour isn't just the hourly wage you pay your crew. It includes:</p>
          <ul className="text-gray-700 space-y-2 pl-6 list-disc">
            <li>Base wage</li>
            <li>Payroll taxes (employer-side FICA: ~7.65%)</li>
            <li>Workers' compensation insurance (fence installation typically runs 8–15% of wages)</li>
            <li>Any benefits, PTO, or uniforms</li>
          </ul>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 my-6">
            <p className="font-semibold text-blue-900 mb-2">Example: Crew of 2 on a full-day install</p>
            <p className="text-blue-800 text-sm m-0">
              Base: $22/hr × 2 = $44/hr total<br/>
              Payroll taxes (7.65%): $3.37<br/>
              Workers' comp (12%): $5.28<br/>
              <strong>True labor cost: ~$52.65/hr for the crew</strong><br/>
              8-hour day = $421.20 in actual labor cost
            </p>
          </div>

          <p className="text-gray-700">Now estimate production rate: a 2-person crew on a standard wood privacy fence typically installs 80–120 linear feet per day on flat terrain with no obstacles. So labor cost per linear foot = $421.20 / 100 LF = <strong>~$4.21/LF in labor cost alone</strong>.</p>
          <p className="text-gray-700">If you guessed $3/LF because that felt right, you just lost $121 on a 100 LF fence before you even counted overhead.</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Section 5: The Margin Mistake — Gross vs. Net</h2>
          <p className="text-gray-700">This is where most contractors blow up their profitability without realizing it.</p>
          <p className="text-gray-700">When you say "I want 30% margin," you almost certainly mean gross margin — 30% of the sale price. But if you calculate it as a markup on top of costs, you're not getting 30%. You're getting less.</p>

          <div className="bg-red-50 border border-red-200 rounded-xl p-6 my-6">
            <p className="font-semibold text-red-900 mb-2">The Markup vs. Margin Trap</p>
            <p className="text-red-800 text-sm m-0">
              Cost: $7,000<br/>
              30% markup: $7,000 × 1.30 = $9,100 → Margin = $2,100 / $9,100 = <strong>23.1% gross margin</strong><br/><br/>
              To get 30% gross margin you need: $7,000 / (1 - 0.30) = <strong>$10,000 price</strong>
            </p>
          </div>

          <p className="text-gray-700">That difference — $900 on a single job — compounds to tens of thousands per year if you're running volume. Use the margin divisor formula: <strong>Price = Cost ÷ (1 - Desired Margin)</strong>.</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Section 6: How to Build a Pricing System That Works Every Time</h2>
          <p className="text-gray-700">The contractors who consistently hit their margin targets aren't smarter than everyone else. They have a system that removes gut feel from the equation.</p>
          <p className="text-gray-700">A working pricing system has four components:</p>
          <ol className="text-gray-700 space-y-3 pl-6 list-decimal">
            <li><strong>A current material cost database</strong> — updated at least quarterly with your actual supplier pricing, not Home Depot retail.</li>
            <li><strong>A tracked labor rate</strong> — not a guess, but a number you've actually calculated from your payroll including all burden costs.</li>
            <li><strong>An overhead allocation method</strong> — figure out your monthly overhead, divide by your billable hours, and add that number to every job.</li>
            <li><strong>A margin enforcer</strong> — a step in your estimate workflow that shows you your gross margin before the quote goes out. If it's under your floor, the price goes up.</li>
          </ol>
          <p className="text-gray-700">When these four things are in place, pricing becomes mechanical. You plug in the job specs, the system tells you the price, and you send a quote you can actually stand behind.</p>
          <p className="text-gray-700">Without a system, every job is a gamble. You win some, you lose some, and you never quite know why.</p>
        </div>
      </article>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-fence-950 to-fence-800 text-white px-6 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Stop estimating by gut.</h2>
          <p className="text-fence-200 text-lg mb-8">
            FenceEstimatePro calculates your exact margin before you send the quote. Know your profit before you hand over the bid.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-fence-500 hover:bg-fence-400 text-white font-bold text-lg px-8 py-4 rounded-xl transition-colors shadow-lg"
          >
            Start Free Trial →
          </Link>
        </div>
      </section>
    </main>
  );
}
