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
    <section className="py-20 px-6 bg-white">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 font-display">
            Common Questions
          </h2>
          <p className="text-xl text-gray-600">
            Everything you need to know before starting your free trial
          </p>
        </div>

        {/* FAQ accordion */}
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-100 transition-colors"
              >
                <span className="font-bold text-gray-900 pr-4">{faq.q}</span>
                <svg
                  className={`w-5 h-5 text-gray-600 flex-shrink-0 transition-transform ${
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
                  <p className="text-gray-700 leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Still have questions CTA */}
        <div className="mt-12 text-center bg-green-50 border border-green-200 rounded-lg p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Still have questions?</h3>
          <p className="text-gray-600 mb-4">We're here to help. Email us and we'll respond within 2 hours.</p>
          <a
            href="mailto:support@fenceestimatepro.com"
            className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-semibold"
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
