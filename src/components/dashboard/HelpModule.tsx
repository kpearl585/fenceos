'use client'

import Link from "next/link";
import { useState } from "react";

const ARTICLES = [
  {
    category: "Getting Started",
    items: [
      {
        q: "How do I create my first estimate?",
        a: "Go to Estimator. Enter the job scope, customer details, and let the engine build the material and margin math for you before you create the quote.",
      },
      {
        q: "How do I add a customer?",
        a: "Go to Customers → New Customer. Customers link automatically to quotes and jobs once they are selected in the estimator.",
      },
      {
        q: "How do I invite a team member?",
        a: "Go to Settings → Team Members and invite them by email. Sales can work quotes and customers; foremen can manage field execution.",
      },
    ],
  },
  {
    category: "Quotes",
    items: [
      {
        q: "How do I send a quote to a customer?",
        a: "Open the quote, click Send Quote, then share the customer link or email it directly from the quote page.",
      },
      {
        q: "What happens when a customer accepts?",
        a: "The quote moves to accepted, deposit collection can begin, and you can convert it into a job once the required gate conditions are satisfied.",
      },
      {
        q: "Can I edit a quote after sending it?",
        a: "Yes. If the quote was already accepted, you should expect to re-send the updated version so the customer is accepting the final scope.",
      },
    ],
  },
  {
    category: "Jobs",
    items: [
      {
        q: "How does the jobs board work?",
        a: "Jobs move from scheduled to active to complete. Material verification and checklist requirements are enforced before risky transitions.",
      },
      {
        q: "How do I assign a foreman?",
        a: "Open the job detail page and assign a foreman from your team. Foremen only see the actions they are allowed to take.",
      },
      {
        q: "How do I handle change orders?",
        a: "Open the job, add the change order, and the system will recalculate the affected totals before invoicing.",
      },
    ],
  },
  {
    category: "Billing & Account",
    items: [
      {
        q: "How do I upgrade my plan?",
        a: "Use the Upgrade page or the upgrade banner inside the dashboard. Billing changes route through the customer portal.",
      },
      {
        q: "How do I cancel my subscription?",
        a: "Open Settings → Billing and use the billing portal. Access stays active until the current billing period ends.",
      },
      {
        q: "What if I still need help?",
        a: "Email support@fenceestimatepro.com and include the page you were on and what you expected to happen.",
      },
    ],
  },
];

export default function HelpModule() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Help"
        className="fixed bottom-8 right-8 z-50 h-12 w-12 rounded-full border border-accent/40 bg-accent text-white shadow-[0_8px_30px_rgba(22,163,74,0.3)] transition-transform duration-150 hover:scale-105"
      >
        ?
      </button>

      {open && (
        <button
          type="button"
          aria-label="Close help"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[51] bg-black/50"
        />
      )}

      <aside
        className={`fixed inset-y-0 right-0 z-[52] flex w-[420px] max-w-[95vw] flex-col border-l border-border bg-background shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="border-b border-border bg-surface-2 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Help Center</p>
              <h2 className="mt-1 font-display text-xl font-bold text-text">FenceEstimatePro</h2>
              <p className="mt-1 text-sm text-muted">Quick answers for estimating, quotes, jobs, and billing.</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-border bg-surface-3 px-3 py-2 text-sm font-semibold text-muted transition-colors hover:border-border-strong hover:text-text"
            >
              Close
            </button>
          </div>
        </div>

        <div className="border-b border-border bg-surface-2/60 px-6 py-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Quick Actions</p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "New Estimate", href: "/dashboard/advanced-estimate" },
              { label: "Saved Drafts", href: "/dashboard/advanced-estimate/saved" },
              { label: "Add Customer", href: "/dashboard/customers/new" },
              { label: "View Jobs", href: "/dashboard/jobs" },
              { label: "Upgrade Plan", href: "/dashboard/upgrade" },
            ].map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent-light transition-colors hover:border-accent/50 hover:bg-accent/15"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {ARTICLES.map((section) => (
            <section key={section.category} className="mb-8">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">{section.category}</p>
              <div className="divide-y divide-border rounded-xl border border-border bg-surface-2">
                {section.items.map((item) => {
                  const isOpen = expanded === item.q;
                  return (
                    <div key={item.q} className="px-4">
                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : item.q)}
                        className="flex w-full items-center justify-between gap-4 py-4 text-left"
                      >
                        <span className="text-sm font-medium text-text">{item.q}</span>
                        <span className="text-xs font-semibold text-muted">{isOpen ? "−" : "+"}</span>
                      </button>
                      {isOpen && (
                        <p className="pb-4 text-sm leading-6 text-muted">{item.a}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
            <p className="text-sm font-semibold text-text">Still need help?</p>
            <p className="mt-1 text-sm text-muted">
              We usually respond within one business day.
            </p>
            <a
              href="mailto:support@fenceestimatepro.com"
              className="mt-3 inline-block text-sm font-semibold text-accent-light hover:text-accent"
            >
              support@fenceestimatepro.com →
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}
