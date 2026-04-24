import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How to Price a Fence Job: A Contractor's Complete Guide | FenceEstimatePro",
  description: "Learning how to price a fence job correctly is the difference between staying busy and building a profitable business. This guide covers the full pricing process from material costs to margin.",
  openGraph: {
    title: "How to Price a Fence Job: A Contractor's Complete Guide",
    description: "Learning how to price a fence job correctly is the difference between staying busy and building a profitable business. This guide covers the full pricing process from material costs to margin.",
  },
};

export default function ArticlePage() {
  return (
    <main>
      {/* Dark article header */}
      <section className="bg-background text-text relative overflow-hidden border-b border-border px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <Link href="/blog" className="inline-flex items-center gap-2 text-muted hover:text-text text-sm mb-8 transition-colors duration-150">
            Back to Blog
          </Link>
          <span className="inline-block bg-accent/10 text-accent-light border border-accent/20 text-xs font-bold px-3 py-1 rounded-full mb-4">Estimating</span>
          <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold leading-tight tracking-tight text-text">
            How to Price a Fence Job: A Contractor's Complete Guide
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted">
            <span>March 1, 2026</span>
            <span>·</span>
            <span>8 min read</span>
            <span>·</span>
            <span>By Pearl Ventures</span>
          </div>
        </div>
      </section>

      {/* Article Body */}
      <article className="bg-white px-6 py-16">
        <div className="max-w-[680px] mx-auto prose-custom" style={{ lineHeight: "1.8", fontFamily: "Inter, sans-serif" }}>

          <p className="text-gray-700 text-lg">
            Knowing how to price a fence job is not a skill you pick up once and forget. Material costs shift, labor markets change, and the complexity of individual jobs varies enough that a formula that worked last year may be leaving money on the table today. This guide walks through the complete pricing process — from the first site visit to the final number on the quote.
          </p>

          <p className="text-gray-700">
            The goal is not just to cover your costs. The goal is to price every job so that when the work is done, you have built the margin you planned for — not whatever was left after surprises ate into it.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Step 1: Scope the Job Completely Before You Price Anything</h2>
          <p className="text-gray-700">
            The biggest pricing mistakes happen before any numbers are calculated. They happen at the site visit, when a contractor mentally commits to a price based on the easy parts of the job and mentally skips the complications.
          </p>
          <p className="text-gray-700">Walk the full perimeter. Note every place the terrain changes. Count gate openings and measure their widths. Identify soil type if you are in a region where frost depth or rocky soil affects post installation time. Look for existing fence that needs to be removed and hauled. Check for overhead obstructions that will slow your crew down.</p>
          <p className="text-gray-700">Every one of those items has a cost. If it is not in your estimate, it comes out of your margin.</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Step 2: Build Your Material List From Actual Quantities</h2>
          <p className="text-gray-700">
            To price a fence job accurately, you need real material quantities — not an approximation. That means calculating:
          </p>
          <ul className="text-gray-700 space-y-2 pl-6 list-disc">
            <li>Total linear footage of fence</li>
            <li>Post count based on your standard spacing (typically 6–8 feet for wood, 10 feet for chain link)</li>
            <li>Number of gate frames and gate hardware sets</li>
            <li>Bags of concrete per post hole</li>
            <li>Rails, pickets, or panels with a 5–10% waste factor built in</li>
            <li>Cap boards, trim, or post caps if applicable</li>
            <li>All fasteners and hardware at your actual cost, not a round number</li>
          </ul>
          <p className="text-gray-700">
            Once you have quantities, price each item against your current supplier costs — not last quarter's costs, not what you remember paying. Material prices move, and estimating from memory is how a job that looked profitable on paper comes in at break-even when the invoice arrives.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Step 3: Calculate Your True Labor Cost</h2>
          <p className="text-gray-700">
            Labor is not just wages. When you are figuring out how to price a fence job that actually covers your real expenses, your labor line item needs to include everything it actually costs you to put that crew on-site:
          </p>
          <ul className="text-gray-700 space-y-2 pl-6 list-disc">
            <li>Hourly wages for each crew member</li>
            <li>Employer payroll taxes</li>
            <li>Workers' compensation insurance</li>
            <li>Any drive time you are covering</li>
            <li>Estimated hours based on your production rate for that fence type and terrain</li>
          </ul>
          <p className="text-gray-700">
            Production rates matter here. A two-person crew on a flat, clear yard can install a different amount of fence per day than the same crew working on a sloped lot with rocky soil and existing landscaping to work around. Use the production rate that fits the actual job, not your best-case scenario.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Step 4: Add Overhead</h2>
          <p className="text-gray-700">
            Overhead is every business cost that is not directly tied to a specific job: truck payments, fuel, insurance on vehicles and tools, shop rent or storage, phone, software, the time you spend doing estimates, and your own salary when you are not billing directly.
          </p>
          <p className="text-gray-700">
            Most contractors skip overhead allocation entirely or lump it into a vague percentage that they picked years ago and never revisited. The correct method is to total your actual monthly overhead, divide by the number of billable hours your business produces in a month, and add that dollar amount per crew-hour to every job.
          </p>
          <p className="text-gray-700">
            If you do not allocate overhead, you are pricing jobs as if your truck, tools, and insurance are free. They are not, and eventually the business math catches up.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Step 5: Set Your Margin Before You Price, Not After</h2>
          <p className="text-gray-700">
            Margin is not what is left after everything goes right. It is a number you decide before you calculate the final price and then work backward to enforce.
          </p>
          <p className="text-gray-700">
            Decide your minimum gross margin for your operation. Most fence contractors should target 30–40% gross margin to maintain healthy net profitability after overhead. Then use the correct formula:
          </p>

          <div className="bg-green-50 border border-green-200 rounded-xl p-6 my-6">
            <p className="font-mono text-green-900 font-bold text-base m-0">
              Price = Total Cost / (1 - Desired Gross Margin)
            </p>
            <p className="text-green-800 text-sm mt-3 mb-0">
              Example: If total job cost is $4,200 and you want 35% gross margin:<br />
              Price = $4,200 / (1 - 0.35) = $4,200 / 0.65 = $6,461
            </p>
          </div>

          <p className="text-gray-700">
            Note that adding 35% markup to your cost does not give you 35% gross margin. It gives you about 26%. The divisor formula above is the correct approach for setting a price that delivers the margin you actually want.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Step 6: Account for Job-Specific Risk</h2>
          <p className="text-gray-700">
            Standard pricing covers standard jobs. When you are pricing a fence job with unusual conditions — difficult soil, removal and disposal of old fence, elevation changes, close proximity to structures — those conditions need to be reflected in the price, not absorbed into your margin.
          </p>
          <p className="text-gray-700">
            Build a risk adjustment line into your estimate for jobs where the standard production rate does not apply. If you estimate this job will take 20% longer than a clean install of the same footage, add 20% to your labor line. Do not discount the risk and hope the crew finds a way to make up time.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Step 7: Review the Final Number Before It Goes Out</h2>
          <p className="text-gray-700">
            Before any quote leaves your office, check three things: the total price, the gross margin percentage, and whether the scope on the document matches what you actually walked at the site visit.
          </p>
          <p className="text-gray-700">
            Scope creep starts in the estimate, not in the field. If your quote is ambiguous about what is included, the customer will naturally assume everything they want is included. Clear scope language protects you if the job grows.
          </p>
          <p className="text-gray-700">
            Knowing how to price a fence job well means the quote you send is one you can execute profitably. If a job at your required margin is not competitive in your market, that is information — not a reason to cut your price below where the business math works.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Build a System, Not a Habit</h2>
          <p className="text-gray-700">
            Following the same steps on every estimate is how you build pricing consistency. Consistency is how you build predictable profit. Ad-hoc pricing — even from an experienced contractor — introduces variability that shows up as margin swings you cannot explain or fix.
          </p>
          <p className="text-gray-700">
            The contractors who price fence jobs well and do it consistently have a process they trust. They are not guessing — they are calculating. That difference compounds over time into a business that grows instead of one that stays busy but never quite gets ahead.
          </p>
        </div>
      </article>

      {/* CTA Section */}
      <section className="bg-background text-text relative border-t border-border px-6 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Price every job the right way, every time.</h2>
          <p className="text-muted text-lg mb-8">
            FenceEstimatePro automates the math — materials, labor, overhead, and margin — so you can quote fast and know your profit before you send the bid.
          </p>
          <Link
            href="https://fenceestimatepro.com/signup"
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent-light text-background font-bold accent-glow text-lg px-8 py-4 rounded-xl transition-colors shadow-lg"
          >
            Start Free at FenceEstimatePro.com
          </Link>
        </div>
      </section>
    </main>
  );
}
