import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fence Business Insights — Blog",
  description:
    "Practical guides for fence contractors: estimating tips, material breakdowns, pricing strategies, and business systems to run a more profitable operation.",
  alternates: { canonical: "/blog" },
  keywords: [
    "fence contractor blog",
    "fence estimating tips",
    "fence business guide",
    "fence contractor advice",
  ],
  openGraph: {
    title: "Fence Business Insights | FenceEstimatePro Blog",
    description:
      "Practical guides for fence contractors who want to run a more profitable operation.",
    url: "https://fenceestimatepro.com/blog",
  },
  twitter: {
    title: "Fence Business Insights | FenceEstimatePro Blog",
    description:
      "Practical guides for fence contractors: estimating, materials, pricing, and business systems.",
  },
};

const articles = [
  {
    slug: "how-to-estimate-a-fence-job",
    title: "How to Estimate a Fence Job: The Complete Contractor Guide",
    description: "Step-by-step material takeoff process for fence contractors — post spacing math, concrete calculation, common mistakes, and how software eliminates guesswork.",
    date: "March 4, 2026",
    readTime: "8 min read",
    category: "Estimating",
    categoryColor: "bg-blue-500/20 text-blue-300",
  },
  {
    slug: "fence-contractor-software",
    title: "Best Fence Contractor Software in 2026: What Actually Works",
    description: "Honest breakdown of fence contractor software options — spreadsheets, generic tools, and purpose-built platforms. What to look for and what to avoid.",
    date: "March 4, 2026",
    readTime: "7 min read",
    category: "Software",
    categoryColor: "bg-purple-500/20 text-purple-300",
  },
  {
    slug: "fence-estimate-calculator",
    title: "Free Fence Estimate Calculator: How the Math Actually Works",
    description: "The real math behind fence estimation — post counts, panel optimization, concrete volume formulas, and why per-foot calculators get it wrong.",
    date: "March 4, 2026",
    readTime: "6 min read",
    category: "Estimating",
    categoryColor: "bg-green-500/20 text-green-300",
  },
  {
    slug: "fence-estimating-software-for-contractors",
    title: "The Best Fence Estimating Software for Contractors in 2026",
    description: "What to look for in fence estimating software, what to ignore in the demo, and how the right tool changes what you know about every job before you commit to a price.",
    date: "March 1, 2026",
    readTime: "7 min read",
    category: "Software",
    categoryColor: "bg-purple-500/20 text-purple-300",
  },
  {
    slug: "fence-job-pricing-guide",
    title: "How to Price a Fence Job: A Contractor's Complete Guide",
    description: "A step-by-step pricing process — from scoping the job to enforcing your margin — so every quote you send is one you can execute profitably.",
    date: "March 1, 2026",
    readTime: "8 min read",
    category: "Estimating",
    categoryColor: "bg-blue-500/20 text-blue-300",
  },
  {
    slug: "fence-contractor-business-tips",
    title: "7 Systems Every Fence Contractor Needs to Run a Profitable Business",
    description: "The best fence contractor business tips are operational systems, not marketing tactics. Here are the 7 that separate contractors who build something from those who just stay busy.",
    date: "March 1, 2026",
    readTime: "9 min read",
    category: "Business",
    categoryColor: "bg-orange-500/20 text-orange-300",
  },
  {
    slug: "fence-job-tracking-software",
    title: "How to Track Fence Jobs Without Losing Money or Your Mind",
    description: "Fence job tracking software solves the most expensive problems in fence contracting — dropped follow-ups, untracked labor overruns, and invoices that never got sent.",
    date: "March 1, 2026",
    readTime: "7 min read",
    category: "Operations",
    categoryColor: "bg-teal-500/20 text-teal-300",
  },
  {
    slug: "fence-estimate-template",
    title: "Why a Free Fence Estimate Template Is Costing You Money",
    description: "A free fence estimate template feels like a solution. Here is what it is actually missing and why those gaps show up as margin loss on jobs you thought were priced correctly.",
    date: "March 1, 2026",
    readTime: "7 min read",
    category: "Estimating",
    categoryColor: "bg-yellow-500/20 text-yellow-300",
  },
  {
    slug: "how-to-price-a-fence-job",
    title: "How to Price a Fence Job in 2026 (Without Leaving Money on the Table)",
    description: "Most fence contractors underprice their jobs by 15-20% without realizing it. Here's the exact formula for calculating fence job pricing that protects your margin.",
    date: "February 28, 2026",
    readTime: "8 min read",
    category: "Estimating",
    categoryColor: "bg-blue-500/20 text-blue-300",
  },
  {
    slug: "fence-material-cost-breakdown",
    title: "Wood vs Chain Link vs Vinyl vs Aluminum: True Material Costs for Fence Contractors (2026)",
    description: "A no-BS breakdown of real material costs per linear foot for every major fence type — plus what contractors actually charge vs. what they should.",
    date: "February 25, 2026",
    readTime: "6 min read",
    category: "Materials",
    categoryColor: "bg-green-500/20 text-green-300",
  },
  {
    slug: "why-fence-contractors-lose-margin",
    title: "Why Fence Contractors Lose 15% Margin on Every Job (And How to Stop It)",
    description: "The 5 margin killers that drain fence contractor profits — and the systems top contractors use to protect every dollar.",
    date: "February 20, 2026",
    readTime: "7 min read",
    category: "Business",
    categoryColor: "bg-orange-500/20 text-orange-300",
  },
];

export default function BlogPage() {
  return (
    <main className="bg-gradient-to-br from-fence-950 via-fence-900 to-fence-800 min-h-screen text-white">
      {/* Header */}
      <section className="px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-fence-700/50 border border-fence-600/50 rounded-full px-4 py-1.5 mb-6">
          <span className="text-xs font-semibold text-fence-200 uppercase tracking-wide">Blog</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Fence Business Insights</h1>
        <p className="mt-4 text-lg text-fence-200 max-w-xl mx-auto">
          Practical guides for contractors who want to run a more profitable operation.
        </p>
      </section>

      {/* Articles Grid */}
      <section className="max-w-5xl mx-auto px-6 pb-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map((article) => (
          <Link
            key={article.slug}
            href={`/blog/${article.slug}`}
            className="group bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-fence-500/50 transition-all flex flex-col"
          >
            <span className={`text-xs font-bold px-3 py-1 rounded-full self-start mb-4 ${article.categoryColor}`}>
              {article.category}
            </span>
            <h2 className="text-lg font-bold leading-snug group-hover:text-fence-300 transition-colors flex-1">
              {article.title}
            </h2>
            <p className="mt-3 text-sm text-fence-300 line-clamp-3">{article.description}</p>
            <div className="mt-4 flex items-center gap-3 text-xs text-fence-400">
              <span>{article.date}</span>
              <span>·</span>
              <span>{article.readTime}</span>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
