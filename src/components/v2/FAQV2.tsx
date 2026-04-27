"use client";
import { useState } from "react";

export default function FAQV2() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: "How long does it take to create an estimate?",
      a: "Most contractors complete an estimate in 5 minutes or less. Walk the property, map your runs on your phone, pick materials, and the system calculates everything instantly. No spreadsheets, no manual math."
    },
    {
      q: "Does it work on my phone at the job site?",
      a: "Yes. FenceEstimatePro is built mobile-first. Works on iPhone and Android. You can create, send, and track estimates entirely from your phone. No laptop needed."
    },
    {
      q: "What if I need to cancel?",
      a: "Cancel anytime with 2 clicks from your account settings. You keep access until the end of your billing period. No contracts, no cancellation fees, no questions asked."
    },
    {
      q: "How accurate are the material calculations?",
      a: "The engine calculates post counts, panel counts, and concrete volume based on actual fence geometry - run lengths, post spacing, hole sizes. More accurate than spreadsheet multipliers. Many contractors report saving $200-$400 per job in reduced material waste."
    },
    {
      q: "Can I customize my pricing and margins?",
      a: "Yes. You control all material costs, labor rates, and margin targets. The system alerts you in real-time if you're below your target margin before you send the quote."
    },
    {
      q: "Do my customers see my costs and margin?",
      a: "No. Customers receive a clean, branded proposal showing only the final quote and line items. Your costs, markup, and margin details stay private in your dashboard."
    },
    {
      q: "Is there a setup fee or contract?",
      a: "No setup fees. No long-term contracts. Just $49/month, cancel anytime. Most contractors are up and running in under 10 minutes."
    },
    {
      q: "What kind of support do I get?",
      a: "Email and chat support included. Most questions answered within 2 hours during business hours. Plus video tutorials and a knowledge base."
    }
  ];

  return (
    <section className="bg-background py-20 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="mb-4 font-display text-3xl font-bold text-text md:text-4xl">
            Common Questions
          </h2>
          <p className="text-xl text-muted">
            Everything you need to know before starting your free trial
          </p>
        </div>

        {/* FAQ accordion */}
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="overflow-hidden rounded-lg border border-border bg-surface">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-surface-2"
              >
                <span className="pr-4 font-bold text-text">{faq.q}</span>
                <svg
                  className={`h-5 w-5 flex-shrink-0 text-muted transition-transform ${
                    openIndex === i ? 'rotate-180' : ''
                  }`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {openIndex === i && (
                <div className="px-6 pb-6">
                  <p className="leading-relaxed text-muted">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Still have questions CTA */}
        <div className="mt-12 rounded-lg border border-accent/20 bg-accent/10 p-8 text-center">
          <h3 className="mb-2 text-xl font-bold text-text">Still have questions?</h3>
          <p className="mb-4 text-muted">We're here to help. Email us and we'll respond within 2 hours.</p>
          <a
            href="mailto:support@fenceestimatepro.com"
            className="inline-flex items-center gap-2 font-semibold text-accent-light hover:text-accent"
          >
            support@fenceestimatepro.com
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
