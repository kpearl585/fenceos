export default function WaitlistSection() {
  return (
    <section id="waitlist" className="bg-fence-950 py-20 px-6">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Ready to Stop Losing Margin?
        </h2>
        <p className="text-fence-300 text-lg mb-8">
          Start your 14-day free trial. No credit card required.
        </p>
        <a
          href="/signup"
          className="inline-flex items-center justify-center gap-2 bg-fence-500 hover:bg-fence-400 text-white font-bold text-lg px-10 py-4 rounded-xl transition-colors shadow-lg"
        >
          Start Free Trial
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </a>
        <p className="mt-4 text-sm text-fence-400">14-day free trial · No credit card · Cancel anytime</p>
      </div>
    </section>
  )
}
