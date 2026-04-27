export default function TestimonialsV2() {
  const testimonials = [
    {
      quote: "Caught an underbid before sending it out. Would've lost $1,800 on that job. Paid for itself in week one.",
      name: "Mike Rodriguez",
      company: "Rodriguez Fence & Deck",
      location: "Tampa, FL",
      result: "Saved $1,800 first week",
      avatar: "MR"
    },
    {
      quote: "Used to spend 45 minutes per estimate. Now I'm done in 5. The material calculator alone has saved me thousands.",
      name: "Sarah Chen",
      company: "Precision Fence Solutions",
      location: "Charlotte, NC",
      result: "5min vs 45min estimates",
      avatar: "SC"
    },
    {
      quote: "My customers love the professional proposals. Win rate went from 40% to 61% in two months.",
      name: "James Patterson",
      company: "Patterson Fencing LLC",
      location: "Austin, TX",
      result: "21% higher close rate",
      avatar: "JP"
    }
  ];

  return (
    <section className="bg-background py-20 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="mb-4 font-display text-3xl font-bold text-text md:text-4xl">
            Real Contractors. Real Results.
          </h2>
          <p className="text-xl text-muted">
            Join 47+ fence contractors already protecting their margins
          </p>
        </div>

        {/* Testimonials grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {testimonials.map((t, i) => (
            <div key={i} className="rounded-xl border-2 border-border bg-surface p-6 transition-all hover:border-accent hover:shadow-lg">
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} width="18" height="18" viewBox="0 0 24 24" fill="#16A34A">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                ))}
              </div>

              {/* Quote */}
              <p className="mb-6 leading-relaxed text-text">"{t.quote}"</p>

              {/* Person */}
              <div className="flex items-center gap-3 border-t border-border pt-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 font-bold text-accent-light">
                  {t.avatar}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-text">{t.name}</p>
                  <p className="text-xs text-muted">{t.company}</p>
                  <p className="text-xs text-muted">{t.location}</p>
                </div>
              </div>

              {/* Result badge */}
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span className="text-xs font-semibold text-accent-light">{t.result}</span>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="rounded-xl border-2 border-accent/40 bg-accent/10 p-8 text-center">
          <h3 className="mb-2 font-display text-2xl font-bold text-text">Ready to Stop Losing Money?</h3>
          <p className="mb-6 text-muted">Join these contractors and start protecting your margins today</p>
          <a
            href="#pricing"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-8 py-4 text-lg font-bold text-accent-foreground shadow-lg transition-all hover:bg-accent/90"
          >
            Start Your Free Trial
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
