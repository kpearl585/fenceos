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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-surface">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <Link href="/" className="flex items-center gap-2 mb-6 text-muted hover:text-text transition-colors duration-150">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm">Back to Home</span>
          </Link>

          <h1 className="font-display text-4xl font-bold text-text mb-3">Help Center</h1>
          <p className="text-lg text-muted">
            Everything you need to know about FenceEstimatePro
          </p>

          {/* Search (placeholder for now) */}
          <div className="mt-8">
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="search"
                placeholder="Search help articles..."
                className="w-full pl-12 pr-4 py-3 border border-border bg-surface-3 text-text rounded-lg placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-150"
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
                <h2 className="font-display text-2xl font-bold text-text">{section.category}</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {section.articles.map((article) => (
                  <Link
                    key={article.href}
                    href={article.href}
                    className="group p-6 bg-surface-2 border border-border rounded-xl hover:bg-surface-3 hover:border-accent/40 transition-all duration-150"
                  >
                    <h3 className="text-lg font-semibold text-text group-hover:text-accent-light transition-colors duration-150 mb-2">
                      {article.title}
                    </h3>
                    <p className="text-sm text-muted mb-3">
                      {article.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted/70">{article.time}</span>
                      <svg className="w-4 h-4 text-accent opacity-0 group-hover:opacity-100 transition-opacity duration-150" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <div className="mt-16 p-8 bg-accent/10 border border-accent/30 rounded-xl accent-glow">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="font-display text-xl font-bold text-text mb-2">Still need help?</h3>
              <p className="text-muted">
                Our support team is here to help you get the most out of FenceEstimatePro
              </p>
            </div>
            <a
              href="mailto:support@fenceestimatepro.com"
              className="bg-accent hover:bg-accent-light text-background px-6 py-3 rounded-lg font-semibold transition-colors duration-150 whitespace-nowrap"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
