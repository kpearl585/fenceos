export default function FAQSection() {
  const faqs = [
    {
      q: "Is my data secure?",
      a: "Yes. All data is encrypted in transit and at rest. We use role-based access control so only the right people see the right data. Our infrastructure is SOC2-grade, hosted on Supabase and Vercel.",
    },
    {
      q: "Can I cancel anytime?",
      a: "Absolutely. No contracts, no lock-ins. Cancel in 2 clicks from your account settings. You keep access until the end of your billing period.",
    },
    {
      q: "Does it work on mobile?",
      a: "Yes &mdash; FenceEstimatePro is a Progressive Web App (PWA). Install it on your phone and use it on job sites, even offline. Works great on iOS and Android.",
    },
    {
      q: "How long does setup take?",
      a: "Most contractors are up and running in under 10 minutes. No training required. Add your first customer, build your first estimate, and you&apos;re off.",
    },
    {
      q: "What if I have multiple crews?",
      a: "Pro plan supports up to 5 users with foreman access. Business plan is unlimited &mdash; perfect for companies running multiple crews simultaneously.",
    },
  ];

  return (
    <section className="py-20 px-4 bg-[#080808]">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-[#F2F2F2] font-display mb-3">Frequently Asked Questions</h2>
          <p className="text-[#6B7280]">Everything you need to know before getting started.</p>
        </div>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-[rgba(255,255,255,0.07)] rounded-xl p-6 bg-[#0F0F0F]">
              <h3 className="font-semibold text-[#F2F2F2] mb-2">{faq.q}</h3>
              <p className="text-[#6B7280] text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: faq.a }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
