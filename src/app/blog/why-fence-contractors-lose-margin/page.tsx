import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Why Fence Contractors Lose 15% Margin on Every Job (And How to Stop It) | FenceEstimatePro",
  description: "The 5 margin killers that drain fence contractor profits — and the systems top contractors use to protect every dollar.",
  openGraph: {
    title: "Why Fence Contractors Lose 15% Margin on Every Job (And How to Stop It)",
    description: "The 5 margin killers that drain fence contractor profits — and the systems top contractors use to protect every dollar.",
  },
};

export default function ArticlePage() {
  return (
    <main>
      <section className="bg-background text-text relative overflow-hidden border-b border-border px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <Link href="/blog" className="inline-flex items-center gap-2 text-muted hover:text-text text-sm mb-8 transition-colors duration-150">
            ← Back to Blog
          </Link>
          <span className="inline-block bg-accent/10 text-accent-light border border-accent/20 text-xs font-bold px-3 py-1 rounded-full mb-4">Business</span>
          <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold leading-tight tracking-tight text-text">
            Why Fence Contractors Lose 15% Margin on Every Job (And How to Stop It)
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted">
            <span>February 20, 2026</span>
            <span>·</span>
            <span>7 min read</span>
            <span>·</span>
            <span>By Pearl Ventures</span>
          </div>
        </div>
      </section>

      <article className="bg-white px-6 py-16">
        <div className="max-w-[680px] mx-auto" style={{ lineHeight: "1.8", fontFamily: "Inter, sans-serif" }}>

          <div className="bg-orange-50 border-l-4 border-orange-400 rounded-r-xl p-5 mb-10">
            <p className="text-orange-900 font-semibold text-lg m-0">
              You quoted $8,000. Materials came in at $3,100. You thought you made a solid profit. But after labor, overhead, and the three things you forgot to invoice — you actually netted $3,200. That's a 40% job that performed at 15%.
            </p>
          </div>

          <p className="text-gray-700 text-lg">This isn't a hypothetical. It's the math behind most fence contracting businesses that stay busy but never build wealth. The jobs look profitable from the outside — customers are happy, invoices got paid, the crew stayed busy. But the bank account tells a different story.</p>
          <p className="text-gray-700">The margin leaks aren't random. They follow predictable patterns. Here are the five that drain most fence contractors, and what to do about each one.</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Killer #1: Estimating from Memory Instead of Actual Costs</h2>
          <p className="text-gray-700">The most common margin killer is also the most invisible one. When you build an estimate from what you remember rather than what things actually cost, you're working from data that's months or years old.</p>
          <p className="text-gray-700">Material prices change. Labor costs change. Your overhead changes as you add trucks, equipment, and employees. But the mental model you use to estimate? That often hasn't been updated in two years.</p>
          <p className="text-gray-700">The fix isn't more experience — it's current data. Contractors who consistently hit their margins maintain a cost database they actually update. They know what a bag of concrete costs this month, not last year.</p>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 my-6">
            <p className="text-gray-700 text-sm font-semibold mb-2">Real impact example:</p>
            <p className="text-gray-600 text-sm m-0">If treated 4×4 posts are $1.20/LF in your mental model but $1.65/LF at your supplier today, on a 300 LF job with 38 posts, that's $171 in untracked cost. Multiply that across 80 jobs a year and you're looking at $13,680 in margin that just evaporated.</p>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Killer #2: Not Accounting for Overhead</h2>
          <p className="text-gray-700">Most fence contractors know their material and labor costs well enough. What they almost never account for properly is overhead — the fixed costs of running the business that exist whether you have jobs this week or not.</p>
          <p className="text-gray-700">Your overhead includes:</p>
          <ul className="text-gray-700 space-y-1.5 pl-6 list-disc">
            <li>Truck payments and insurance</li>
            <li>Trailer and equipment maintenance</li>
            <li>General liability insurance</li>
            <li>Tools and supplies</li>
            <li>Storage and yard costs</li>
            <li>Your own time doing estimates, invoicing, and admin</li>
            <li>Software, phone, fuel (non-job-specific)</li>
          </ul>
          <p className="text-gray-700">For most small fence operations, overhead runs $4,000–10,000/month. If you're doing 8 jobs a month, that's $500–1,250 per job that needs to be in your price before you get to margin.</p>
          <p className="text-gray-700">If overhead isn't in your estimate, you're personally subsidizing every job you do. The company looks profitable. Your bank account says otherwise.</p>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 my-6">
            <p className="text-blue-900 text-sm font-semibold mb-1">How to calculate your overhead allocation:</p>
            <p className="text-blue-800 text-sm m-0">Add up all monthly fixed costs. Divide by your target billable hours or jobs per month. That's your overhead allocation per job or per hour — and it belongs in every estimate.</p>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Killer #3: Change Orders Without Written Agreements</h2>
          <p className="text-gray-700">You quoted 180 linear feet. The customer decided to add another 40 feet on-site. You did the extra work because the crew was already there and the customer seemed happy. You didn't write it up because it felt awkward.</p>
          <p className="text-gray-700">Six weeks later, when you go to collect the full bill, the customer remembers agreeing to the original price. Not the extra 40 feet. Not the second gate they added. Not the demo of the old fence they asked you to handle.</p>
          <p className="text-gray-700">Verbal agreements in construction resolve in the customer's favor roughly 80% of the time — not because customers are dishonest, but because memories are selective and situations feel different once the excitement of the new fence fades.</p>
          <p className="text-gray-700">Every change order — no matter how small — needs to be written, priced, and signed before the work happens. This isn't bureaucracy. It's protecting the margin you already earned on the base job.</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Killer #4: Material Price Changes Between Quote and Job</h2>
          <p className="text-gray-700">You quoted in January. The job starts in March. Lumber prices moved. Your supplier raised prices on vinyl panels. You're locked into the quoted price but paying higher material costs. The margin on this job just compressed by 4–8%.</p>
          <p className="text-gray-700">This killer is sneaky because it doesn't feel like an error — prices moving isn't your fault. But the failure to protect against it is a systems problem.</p>
          <p className="text-gray-700">The protection strategies:</p>
          <ol className="text-gray-700 space-y-2 pl-6 list-decimal">
            <li><strong>Quote validity windows:</strong> Include "This quote is valid for 30 days" in your contracts. After that, prices are subject to change.</li>
            <li><strong>Material escalation clauses:</strong> For large projects with long lead times, include a clause allowing price adjustment if material costs increase more than 5%.</li>
            <li><strong>Purchase key materials immediately upon contract signing:</strong> If you can warehouse it, buy it when the contract is signed, not when the job starts.</li>
          </ol>

          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Killer #5: Labor Overruns With No Tracking System</h2>
          <p className="text-gray-700">You estimated 2 days for the install. It took 3. You didn't track why — the crew just needed more time. You invoice the customer the original amount because renegotiating after the fact is uncomfortable, and anyway, the job is done.</p>
          <p className="text-gray-700">That extra day cost you $400–600 in labor. It's just gone. And because you didn't track why the overrun happened, it'll probably happen again on similar jobs.</p>
          <p className="text-gray-700">Labor overruns are the most expensive type of margin leak because they compound. One bad estimate methodology applied to 50 jobs a year creates massive losses. And unlike material costs, labor overruns don't show up in your financial statements in a way that flags the problem clearly.</p>
          <p className="text-gray-700">Tracking labor actuals against estimates — even in a simple spreadsheet — creates accountability and the data you need to improve. Which jobs are running over? Which crew? What type of fence? What terrain? Patterns emerge fast when you have data.</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">The Fix: Systems Over Experience</h2>
          <p className="text-gray-700">Here's the uncomfortable truth: experience alone doesn't fix these problems. There are 20-year veterans of the fence industry who still lose margin on every job because they never built the systems to prevent it.</p>
          <p className="text-gray-700">Experience helps you recognize job complexity, manage customers, and run a crew efficiently. But it doesn't automatically give you accurate material cost data, overhead allocation, or labor tracking. Those require systems.</p>
          <p className="text-gray-700">The contractors who protect their margin consistently have:</p>
          <ul className="text-gray-700 space-y-2 pl-6 list-disc">
            <li>A current material cost database they maintain</li>
            <li>A known, calculated overhead rate per job</li>
            <li>Written change order procedures they actually use</li>
            <li>Quote validity language in every contract</li>
            <li>A way to track estimated vs. actual labor on every job</li>
          </ul>
          <p className="text-gray-700">None of this requires a business degree or expensive software. It requires consistency. The contractors who implement even two or three of these systems see measurable margin improvement within 90 days.</p>
          <p className="text-gray-700">The question isn't whether these systems are worth it. The question is: how many more jobs are you willing to lose margin on before you build them?</p>
        </div>
      </article>

      <section className="bg-background text-text relative border-t border-border px-6 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Know your exact margin before every quote goes out.</h2>
          <p className="text-muted text-lg mb-8">
            FenceEstimatePro shows your exact margin before every quote goes out — so you stop losing money on jobs that look profitable but aren't.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent-light text-background font-bold accent-glow text-lg px-8 py-4 rounded-xl transition-colors shadow-lg"
          >
            Start Free Trial →
          </Link>
        </div>
      </section>
    </main>
  );
}
