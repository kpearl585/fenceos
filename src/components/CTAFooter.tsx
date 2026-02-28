import Link from "next/link";

export default function CTAFooter() {
  return (
    <>
      {/* Final CTA */}
      <section className="bg-fence-900 px-6 py-20 md:py-24 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold">Stop guessing. Start protecting your margin.</h2>
          <p className="mt-4 text-fence-200 text-lg leading-relaxed">
            Every job you quote without FenceEstimatePro is a job where your profit is at risk. Fix that today.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 bg-fence-500 hover:bg-fence-400 text-white font-bold text-lg px-10 py-4 rounded-xl transition-colors"
            >
              Start Free Trial →
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center border-2 border-fence-600 text-fence-200 hover:border-fence-400 hover:text-white font-semibold text-lg px-10 py-4 rounded-xl transition-colors"
            >
              Login to Dashboard
            </Link>
          </div>
          <p className="mt-4 text-fence-400 text-sm">30-day free trial · No credit card · Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-fence-950 px-6 py-10 border-t border-fence-800">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-fence-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h3v10H3V7zm6-3h3v13H9V4zm6 5h3v8h-3V9z" />
              </svg>
            </div>
            <span className="font-bold text-white text-sm">FenceEstimatePro</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-fence-400">
            <a href="#how-it-works" className="hover:text-fence-200 transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-fence-200 transition-colors">Pricing</a>
            <Link href="/login" className="hover:text-fence-200 transition-colors">Login</Link>
            <Link href="/signup" className="hover:text-fence-200 transition-colors">Sign Up</Link>
          </div>
          <p className="text-fence-500 text-xs">© 2026 FenceEstimatePro. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}
