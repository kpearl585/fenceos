export default function TestimonialsSection() {
  const testimonials = [
    {
      quote: "I used to spend 45 minutes on every estimate. Now it's 5 minutes and I actually know what my margin is before I hand over the quote. Paid for itself on the first job.",
      name: "Marcus T.",
      title: "Owner, T&T Fence Co.",
      location: "Tampa, FL",
      stars: 5,
    },
    {
      quote: "Stopped underbidding jobs the second week I used it. Had a change order come in and the whole thing recalculated automatically. That used to cost me $400-$600 every time.",
      name: "Derek W.",
      title: "Owner, Western Fence Solutions",
      location: "Phoenix, AZ",
      stars: 5,
    },
    {
      quote: "My foreman can see his jobs, mark things complete, and I can track everything from my phone. It runs like a real operation now instead of me chasing people with texts.",
      name: "Ray S.",
      title: "Owner, Solid Line Fencing",
      location: "Atlanta, GA",
      stars: 5,
    },
  ];

  return (
    <section className="bg-gray-50 px-6 py-20 md:py-24">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-fence-600 font-semibold text-sm uppercase tracking-widest mb-3">Real contractors. Real results.</p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Contractors who stopped guessing</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div key={t.name} className="bg-white rounded-2xl p-7 shadow-sm border border-gray-100 flex flex-col">
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <svg key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-600 text-sm leading-relaxed flex-1">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-5 pt-4 border-t border-gray-100">
                <p className="font-bold text-gray-900 text-sm">{t.name}</p>
                <p className="text-xs text-gray-400">{t.title} · {t.location}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
