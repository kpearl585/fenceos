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
      a: "Yes — FenceEstimatePro is a Progressive Web App (PWA). Install it on your phone and use it on job sites, even offline. Works great on iOS and Android.",
    },
    {
      q: "How long does setup take?",
      a: "Most contractors are up and running in under 10 minutes. No training required. Add your first customer, build your first estimate, and you&apos;re off.",
    },
    {
      q: "What if I have multiple crews?",
      a: "Pro plan supports up to 5 users with foreman access. Business plan is unlimited — perfect for companies running multiple crews simultaneously.",
    },
  ];

  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-fence-950 mb-3">Frequently Asked Questions</h2>
          <p className="text-gray-500">Everything you need to know before getting started.</p>
        </div>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-gray-200 rounded-xl p-6">
              <h3 className="font-semibold text-fence-900 mb-2">{faq.q}</h3>
              <p className="text-gray-600 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: faq.a }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
