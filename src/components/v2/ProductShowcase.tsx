export default function ProductShowcase() {
  const features = [
    {
      title: "5-Minute Estimates",
      description: "Map your fence runs, pick materials, done. The engine calculates everything instantly.",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      )
    },
    {
      title: "Auto Material Counts",
      description: "Posts, panels, concrete, hardware. Every item calculated based on your fence geometry.",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 11l3 3L22 4"/>
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
        </svg>
      )
    },
    {
      title: "Margin Protection",
      description: "See your margin in real-time. Get alerts when you're below target before sending the quote.",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      )
    },
    {
      title: "Professional Proposals",
      description: "Branded PDF proposals with e-signature. Customer sees price, you keep the margin details.",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      )
    },
    {
      title: "Mobile-First",
      description: "Works on your phone at the job site. No laptop needed. Estimate while you walk the property.",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
          <line x1="12" y1="18" x2="12" y2="18"/>
        </svg>
      )
    },
    {
      title: "Job Tracking",
      description: "Convert accepted estimates to jobs. Track progress from quoted to complete in one place.",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
        </svg>
      )
    }
  ];

  return (
    <section id="demo" className="bg-surface py-20 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="mb-4 font-display text-3xl font-bold text-text md:text-4xl">
            Everything You Need. Nothing You Don't.
          </h2>
          <p className="mx-auto max-w-3xl text-xl text-muted">
            Built by fence contractors for fence contractors. Every feature solves a real problem.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {features.map((feature, i) => (
            <div key={i} className="rounded-xl border border-border bg-surface-2 p-6 transition-all hover:border-accent hover:shadow-lg">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/15 text-accent-light">
                {feature.icon}
              </div>
              <h3 className="mb-2 text-lg font-bold text-text">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-muted">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Video placeholder */}
        <div className="overflow-hidden rounded-xl border-2 border-border bg-surface-2 shadow-xl">
          <div className="relative flex aspect-video items-center justify-center bg-gradient-to-br from-surface-2 to-surface-3">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 cursor-pointer items-center justify-center rounded-full bg-accent transition-colors hover:bg-accent/90">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
              </div>
              <p className="text-lg font-semibold text-text">Watch: Real Contractor Builds an Estimate in 5 Minutes</p>
              <p className="mt-2 text-sm text-muted">See the full workflow from job site to signed proposal</p>
            </div>
            {/* Replace this div with actual video embed */}
          </div>
        </div>
      </div>
    </section>
  );
}
