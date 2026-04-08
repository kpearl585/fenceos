export default function CustomerTestimonials() {
  const testimonials = [
    {
      quote: "Used to spend 45 minutes per estimate. Now I'm done in 5. The material calculator alone has saved me thousands in overbuy.",
      author: "Mike Rodriguez",
      company: "Rodriguez Fence & Deck",
      location: "Tampa, FL",
      result: "Saved $4,200 in first month"
    },
    {
      quote: "I caught an underbid before sending it out. Would've lost $1,800 on that job. Paid for itself in week one.",
      author: "Sarah Chen",
      company: "Precision Fence Solutions",
      location: "Charlotte, NC",
      result: "38% avg margin maintained"
    },
    {
      quote: "My customers love the professional proposals. Win rate went from 40% to 61% in two months.",
      author: "James Patterson",
      company: "Patterson Fencing LLC",
      location: "Austin, TX",
      result: "21% higher close rate"
    }
  ];

  return (
    <section className="bg-[#080808] py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-[#16A34A] font-semibold text-sm uppercase tracking-widest mb-3">Real Results</p>
          <h2 className="text-3xl md:text-4xl font-bold text-[#F2F2F2] font-display">
            What Contractors Are Saying
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-[#0F0F0F] border border-[rgba(255,255,255,0.07)] rounded-xl p-6">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="#22C55E">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                ))}
              </div>

              <p className="text-[#F2F2F2] text-sm leading-relaxed mb-4">"{t.quote}"</p>

              <div className="pt-4 border-t border-[rgba(255,255,255,0.07)]">
                <p className="text-[#F2F2F2] font-semibold text-sm">{t.author}</p>
                <p className="text-[#6B7280] text-xs">{t.company}</p>
                <p className="text-[#6B7280] text-xs">{t.location}</p>

                <div className="mt-3 inline-flex items-center gap-2 bg-[rgba(22,163,74,0.1)] border border-[rgba(22,163,74,0.2)] rounded-full px-3 py-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span className="text-[#22C55E] text-xs font-semibold">{t.result}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <a
            href="#waitlist"
            className="inline-flex items-center gap-2 bg-[#16A34A] hover:bg-[#22C55E] text-white font-bold px-8 py-4 rounded-xl transition-colors"
          >
            Join Them &rarr;
          </a>
        </div>
      </div>
    </section>
  );
}
