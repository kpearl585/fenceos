import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help Center - FenceEstimatePro",
  description: "Get help with FenceEstimatePro. Learn how to create estimates, use AI extraction, export data, and more.",
  robots: { index: true, follow: true },
};

const HELP_ARTICLES = [
  {
    category: "Getting Started",
    icon: "🚀",
    articles: [
      {
        title: "Creating Your First Estimate",
        description: "Step-by-step guide to building a fence estimate",
        href: "/help/getting-started",
        time: "5 min read"
      },
      {
        title: "Understanding the Advanced Estimate Builder",
        description: "Learn how to use fence runs, gates, and configuration options",
        href: "/help/advanced-estimate",
        time: "8 min read"
      },
      {
        title: "Account Setup & Team Management",
        description: "Configure your organization, add team members, set permissions",
        href: "/help/account-setup",
        time: "4 min read"
      },
    ]
  },
  {
    category: "Core Features",
    icon: "⚡",
    articles: [
      {
        title: "AI Extraction from Customer Messages",
        description: "Automatically extract fence specs from emails and texts",
        href: "/help/ai-extraction",
        time: "6 min read"
      },
      {
        title: "Exporting Estimates (PDF & Excel)",
        description: "Generate professional proposals and internal BOMs",
        href: "/help/export",
        time: "5 min read"
      },
      {
        title: "Material Price Management",
        description: "Update prices, sync with suppliers, track costs",
        href: "/help/pricing",
        time: "7 min read"
      },
    ]
  },
  {
    category: "Pricing & Billing",
    icon: "💳",
    articles: [
      {
        title: "Pricing Plans & Features",
        description: "Compare Starter, Pro, and Business plans",
        href: "/help/plans",
        time: "3 min read"
      },
      {
        title: "Billing & Payment FAQ",
        description: "Common questions about subscriptions, invoices, and cancellation",
        href: "/help/billing",
        time: "4 min read"
      },
    ]
  },
  {
    category: "Data & Privacy",
    icon: "🔒",
    articles: [
      {
        title: "Data Export & Backup",
        description: "Download your data, export estimates, backup your account",
        href: "/help/data-export",
        time: "3 min read"
      },
      {
        title: "Account Deletion & Data Retention",
        description: "How to delete your account and what happens to your data",
        href: "/help/account-deletion",
        time: "4 min read"
      },
    ]
  },
  {
    category: "Troubleshooting",
    icon: "🔧",
    articles: [
      {
        title: "Common Issues & Solutions",
        description: "Fix login problems, PDF generation errors, and more",
        href: "/help/troubleshooting",
        time: "6 min read"
      },
      {
        title: "Browser Compatibility",
        description: "Recommended browsers and known issues",
        href: "/help/browsers",
        time: "2 min read"
      },
    ]
  },
];

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-fence-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-fence-900">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <Link href="/" className="flex items-center gap-2 mb-6 text-white/60 hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm">Back to Home</span>
          </Link>

          <h1 className="text-4xl font-bold text-white mb-3">Help Center</h1>
          <p className="text-lg text-white/70">
            Everything you need to know about FenceEstimatePro
          </p>

          {/* Search (placeholder for now) */}
          <div className="mt-8">
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="search"
                placeholder="Search help articles..."
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-fence-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Articles */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="space-y-12">
          {HELP_ARTICLES.map((section) => (
            <div key={section.category}>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">{section.icon}</span>
                <h2 className="text-2xl font-bold text-white">{section.category}</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {section.articles.map((article) => (
                  <Link
                    key={article.href}
                    href={article.href}
                    className="group p-6 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-fence-500/50 transition-all"
                  >
                    <h3 className="text-lg font-semibold text-white group-hover:text-fence-400 transition-colors mb-2">
                      {article.title}
                    </h3>
                    <p className="text-sm text-white/60 mb-3">
                      {article.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/40">{article.time}</span>
                      <svg className="w-4 h-4 text-fence-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Contact Support */}
        <div className="mt-16 p-8 bg-fence-500/10 border border-fence-500/20 rounded-xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Still need help?</h3>
              <p className="text-white/70">
                Our support team is here to help you get the most out of FenceEstimatePro
              </p>
            </div>
            <a
              href="mailto:support@fenceestimatepro.com"
              className="bg-fence-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-fence-700 transition-colors whitespace-nowrap"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
